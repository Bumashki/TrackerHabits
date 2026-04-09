import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_user_id
from app.models import User, Habit, HabitCompletion, Friendship, ActivityFeedItem
from app.datetime_utils import isoformat_utc_z
from app.habit_logic import weekday_key

router = APIRouter()

CHEER_COOLDOWN = timedelta(hours=1)

_SEARCH_NICK = re.compile(r"^[a-z0-9_]{2,32}$")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_utc_aware(dt: datetime) -> datetime:
    """PostgreSQL: aware; SQLite: часто naive UTC — приводим к сравнимому виду."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _time_label_moscow_now() -> str:
    """Время для ленты — по Москве (как у пользователей РФ)."""
    try:
        return datetime.now(ZoneInfo("Europe/Moscow")).strftime("%H:%M")
    except Exception:
        return (datetime.now(timezone.utc) + timedelta(hours=3)).strftime("%H:%M")


def _cheer_available_at_iso(me: User | None) -> str | None:
    """ISO UTC — когда снова можно похвалить; None — сейчас можно."""
    if not me or not me.last_cheer_at:
        return None
    last = _to_utc_aware(me.last_cheer_at)
    until = last + CHEER_COOLDOWN
    if _utc_now() >= until:
        return None
    u = until.astimezone(timezone.utc).replace(microsecond=0)
    return u.strftime("%Y-%m-%dT%H:%M:%SZ")


class InviteBody(BaseModel):
    email: str


def _streak_from_done_set(done_days: set[date], today: date) -> int:
    st = 0
    d = today
    while d in done_days:
        st += 1
        d -= timedelta(days=1)
    return st


def _batch_today_completion(db: Session, friend_uuids: list[UUID], today: date) -> dict[UUID, tuple[int, int]]:
    """Сегодняшние done/total по списку пользователей — без N+1."""
    if not friend_uuids:
        return {}
    habits = db.query(Habit).filter(Habit.user_id.in_(friend_uuids)).all()
    by_uid: dict[UUID, list[Habit]] = defaultdict(list)
    for h in habits:
        by_uid[h.user_id].append(h)

    all_active_hids: list[int] = []
    active_by_uid: dict[UUID, list[Habit]] = {}
    for uid in friend_uuids:
        active = [
            h
            for h in by_uid.get(uid, [])
            if not h.is_paused and (not h.schedule or weekday_key(today) in (h.schedule or []))
        ]
        active_by_uid[uid] = active
        all_active_hids.extend(h.id for h in active)

    if not all_active_hids:
        return {uid: (0, 1) for uid in friend_uuids}

    done_hids = {
        row[0]
        for row in db.query(HabitCompletion.habit_id)
        .filter(
            HabitCompletion.habit_id.in_(all_active_hids),
            HabitCompletion.day == today,
            HabitCompletion.completed.is_(True),
        )
        .all()
    }

    out: dict[UUID, tuple[int, int]] = {}
    for uid in friend_uuids:
        active = active_by_uid[uid]
        total = len(active)
        if total == 0:
            out[uid] = (0, 1)
            continue
        done = sum(1 for h in active if h.id in done_hids)
        out[uid] = (done, max(1, total))
    return out


def _batch_max_streaks(db: Session, friend_uuids: list[UUID], today: date) -> dict[UUID, int]:
    """Макс. streak по привычкам для каждого пользователя — пакетная загрузка completion."""
    if not friend_uuids:
        return {}
    habits = db.query(Habit).filter(Habit.user_id.in_(friend_uuids)).all()
    by_uid: dict[UUID, list[Habit]] = defaultdict(list)
    for h in habits:
        by_uid[h.user_id].append(h)
    habit_ids = [h.id for h in habits]
    if not habit_ids:
        return {uid: 0 for uid in friend_uuids}

    start = today - timedelta(days=400)
    rows = (
        db.query(HabitCompletion.habit_id, HabitCompletion.day)
        .filter(
            HabitCompletion.habit_id.in_(habit_ids),
            HabitCompletion.day >= start,
            HabitCompletion.day <= today,
            HabitCompletion.completed.is_(True),
        )
        .all()
    )
    done_by_habit: dict[int, set[date]] = defaultdict(set)
    for hid, d in rows:
        done_by_habit[hid].add(d)

    out: dict[UUID, int] = {}
    for uid in friend_uuids:
        best = 0
        for h in by_uid.get(uid, []):
            best = max(best, _streak_from_done_set(done_by_habit.get(h.id, set()), today))
        out[uid] = best
    return out


def _serialize_friend(f: User, done: int, total: int, streak: int) -> dict:
    return {
        "id": str(f.id),
        "name": f.name,
        "nickname": f.nickname,
        "initials": f.initials or f.name[:2],
        "color": f.color or "#2d6a4f",
        "avatarUrl": f.avatar_url or None,
        "isOnline": f.is_online,
        "lastSeen": f.last_seen_label,
        "streak": streak,
        "completedToday": done,
        "totalToday": total,
        "xpThisWeek": f.xp_this_week,
    }


def _are_friends(db: Session, a: UUID, b: UUID) -> bool:
    return bool(
        db.query(Friendship)
        .filter(
            Friendship.user_id == a,
            Friendship.friend_id == b,
            Friendship.status == "accepted",
        )
        .first()
        or db.query(Friendship)
        .filter(
            Friendship.user_id == b,
            Friendship.friend_id == a,
            Friendship.status == "accepted",
        )
        .first()
    )


def _related_user_ids(db: Session, user_id: UUID) -> set[UUID]:
    """Все пользователи, с которыми уже есть заявка или дружба (в любую сторону)."""
    out: set[UUID] = set()
    for row in (
        db.query(Friendship)
        .filter(or_(Friendship.user_id == user_id, Friendship.friend_id == user_id))
        .all()
    ):
        if row.user_id == user_id:
            out.add(row.friend_id)
        else:
            out.add(row.user_id)
    return out


def _complete_friendship(db: Session, requester: UUID, receiver: UUID) -> None:
    """Заявка requester → receiver (pending) становится accepted; добавляется обратная связь."""
    fwd = (
        db.query(Friendship)
        .filter(Friendship.user_id == requester, Friendship.friend_id == receiver)
        .first()
    )
    if not fwd or fwd.status != "pending":
        raise HTTPException(404, detail="Заявка не найдена")
    fwd.status = "accepted"
    rev = (
        db.query(Friendship)
        .filter(Friendship.user_id == receiver, Friendship.friend_id == requester)
        .first()
    )
    if rev:
        rev.status = "accepted"
    else:
        db.add(Friendship(user_id=receiver, friend_id=requester, status="accepted"))


def _incoming_payload(db: Session, user_id: UUID) -> list[dict]:
    rows = (
        db.query(Friendship)
        .filter(Friendship.friend_id == user_id, Friendship.status == "pending")
        .order_by(Friendship.created_at.desc())
        .all()
    )
    uids = [r.user_id for r in rows]
    users = {u.id: u for u in db.query(User).filter(User.id.in_(uids)).all()} if uids else {}
    out = []
    for r in rows:
        u = users.get(r.user_id)
        if not u:
            continue
        out.append(
            {
                "id": str(u.id),
                "name": u.name,
                "nickname": u.nickname,
                "initials": u.initials or (u.name[:2] if u.name else ""),
                "color": u.color or "#2d6a4f",
                "avatarUrl": u.avatar_url or None,
                "requestedAt": isoformat_utc_z(r.created_at),
            }
        )
    return out


def _outgoing_payload(db: Session, user_id: UUID) -> list[dict]:
    rows = (
        db.query(Friendship)
        .filter(Friendship.user_id == user_id, Friendship.status == "pending")
        .order_by(Friendship.created_at.desc())
        .all()
    )
    uids = [r.friend_id for r in rows]
    users = {u.id: u for u in db.query(User).filter(User.id.in_(uids)).all()} if uids else {}
    out = []
    for r in rows:
        u = users.get(r.friend_id)
        if not u:
            continue
        out.append(
            {
                "id": str(u.id),
                "name": u.name,
                "nickname": u.nickname,
                "initials": u.initials or (u.name[:2] if u.name else ""),
                "color": u.color or "#2d6a4f",
                "avatarUrl": u.avatar_url or None,
                "requestedAt": isoformat_utc_z(r.created_at),
            }
        )
    return out


def _feed_payload(db: Session, user_id: UUID) -> list[dict]:
    friend_ids = [
        r.friend_id
        for r in db.query(Friendship)
        .filter(Friendship.user_id == user_id, Friendship.status == "accepted")
        .all()
    ]
    allowed = list(friend_ids) + [user_id]
    rows = (
        db.query(ActivityFeedItem)
        .filter(ActivityFeedItem.user_id.in_(allowed))
        .order_by(ActivityFeedItem.id.desc())
        .limit(30)
        .all()
    )
    uids = list({r.user_id for r in rows})
    users = {u.id: u for u in db.query(User).filter(User.id.in_(uids)).all()} if uids else {}
    out = []
    for r in rows:
        u = users.get(r.user_id)
        out.append(
            {
                "id": r.id,
                "userId": str(r.user_id),
                "initials": u.initials if u else "",
                "color": u.color if u else None,
                "avatarUrl": u.avatar_url if u else None,
                "text": r.text,
                "time": r.time_label,
                "streak": r.streak,
            }
        )
    return out


@router.get("/friends/overview")
def get_friends_overview(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    """Один запрос: друзья + лента + входящие/исходящие заявки (меньше RTT и N+1)."""
    today = date.today()
    links = (
        db.query(Friendship)
        .filter(Friendship.user_id == user_id, Friendship.status == "accepted")
        .all()
    )
    friend_ids = [link.friend_id for link in links]
    users_by_id: dict[UUID, User] = {}
    if friend_ids:
        users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_(friend_ids)).all()}
    today_stats = _batch_today_completion(db, friend_ids, today) if friend_ids else {}
    streaks = _batch_max_streaks(db, friend_ids, today) if friend_ids else {}
    friends_out = []
    for fid in friend_ids:
        f = users_by_id.get(fid)
        if not f:
            continue
        done, total = today_stats.get(fid, (0, 1))
        streak = streaks.get(fid, 0)
        friends_out.append(_serialize_friend(f, done, total, streak))
    me = db.query(User).filter(User.id == user_id).first()
    return {
        "friends": friends_out,
        "incoming": _incoming_payload(db, user_id),
        "outgoing": _outgoing_payload(db, user_id),
        "feed": _feed_payload(db, user_id),
        "cheerAvailableAt": _cheer_available_at_iso(me),
        "lastCheeredFriendId": str(me.last_cheer_friend_id)
        if me and me.last_cheer_friend_id
        else None,
    }


@router.get("/friends")
def get_friends(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    today = date.today()
    links = (
        db.query(Friendship)
        .filter(Friendship.user_id == user_id, Friendship.status == "accepted")
        .all()
    )
    friend_ids = [link.friend_id for link in links]
    if not friend_ids:
        return []
    users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_(friend_ids)).all()}
    today_stats = _batch_today_completion(db, friend_ids, today)
    streaks = _batch_max_streaks(db, friend_ids, today)
    out = []
    for fid in friend_ids:
        f = users_by_id.get(fid)
        if not f:
            continue
        done, total = today_stats.get(fid, (0, 1))
        streak = streaks.get(fid, 0)
        out.append(_serialize_friend(f, done, total, streak))
    return out


@router.get("/friends/incoming")
def get_incoming(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    """Входящие заявки: кто-то хочет в друзья к вам (pending)."""
    return _incoming_payload(db, user_id)


@router.get("/friends/outgoing")
def get_outgoing(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    """Исходящие заявки (ожидают ответа)."""
    return _outgoing_payload(db, user_id)


@router.get("/friends/feed")
def get_feed(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    return _feed_payload(db, user_id)


@router.post("/friends/{friend_id}/cheer")
def cheer(
    friend_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    if friend_id == user_id:
        raise HTTPException(400, detail="Нельзя похвалить себя")
    if not _are_friends(db, user_id, friend_id):
        raise HTTPException(403, detail="Можно похвалить только друга")
    friend = db.query(User).filter(User.id == friend_id).first()
    me = db.query(User).filter(User.id == user_id).first()
    if not friend or not me:
        raise HTTPException(404, detail="Пользователь не найден")
    now = _utc_now()
    if me.last_cheer_at:
        last = _to_utc_aware(me.last_cheer_at)
        if now < last + CHEER_COOLDOWN:
            retry_sec = int((last + CHEER_COOLDOWN - now).total_seconds())
            raise HTTPException(
                status_code=429,
                detail="Похвалить можно раз в час",
                headers={"Retry-After": str(max(1, retry_sec))},
            )
    me.last_cheer_at = now
    me.last_cheer_friend_id = friend_id
    db.add(
        ActivityFeedItem(
            user_id=user_id,
            text=f"{me.name} похвалил(а) {friend.name}",
            time_label=_time_label_moscow_now(),
            streak=None,
        )
    )
    db.commit()
    return {"ok": True}


@router.get("/friends/search")
def search_friends(
    q: str = Query("", max_length=64),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    needle = (q or "").strip().lower()
    if not _SEARCH_NICK.match(needle):
        return []
    exclude = _related_user_ids(db, user_id)
    pattern = f"%{needle}%"
    rows = (
        db.query(User)
        .filter(
            User.id != user_id,
            User.nickname.isnot(None),
            func.lower(User.nickname).like(pattern),
        )
        .limit(30)
        .all()
    )
    out = []
    for u in rows:
        if u.id in exclude:
            continue
        out.append(
            {
                "id": str(u.id),
                "name": u.name,
                "nickname": u.nickname,
                "initials": u.initials or (u.name[:2] if u.name else ""),
                "color": u.color or "#2d6a4f",
                "avatarUrl": u.avatar_url or None,
            }
        )
    return out


def _send_friend_request(db: Session, user_id: UUID, target_id: UUID) -> dict:
    if target_id == user_id:
        raise HTTPException(400, detail="Нельзя добавить себя")
    target = db.query(User).filter(User.id == target_id).first()
    if not target:
        raise HTTPException(404, detail="Пользователь не найден")

    if _are_friends(db, user_id, target_id):
        return {"ok": True, "status": "friends", "already": True}

    they_to_me = (
        db.query(Friendship)
        .filter(
            Friendship.user_id == target_id,
            Friendship.friend_id == user_id,
            Friendship.status == "pending",
        )
        .first()
    )
    if they_to_me:
        _complete_friendship(db, target_id, user_id)
        db.commit()
        return {"ok": True, "status": "accepted", "mutual": True}

    me_to_them = (
        db.query(Friendship)
        .filter(Friendship.user_id == user_id, Friendship.friend_id == target_id)
        .first()
    )
    if me_to_them:
        if me_to_them.status == "pending":
            return {"ok": True, "status": "pending_sent", "already": True}
        if me_to_them.status == "accepted":
            return {"ok": True, "status": "friends", "already": True}

    db.add(Friendship(user_id=user_id, friend_id=target_id, status="pending"))
    db.commit()
    return {"ok": True, "status": "pending_sent"}


@router.post("/friends/{friend_id}/request")
def request_friend(
    friend_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    return _send_friend_request(db, user_id, friend_id)


@router.post("/friends/{requester_id}/accept")
def accept_request(
    requester_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    _complete_friendship(db, requester_id, user_id)
    db.commit()
    return {"ok": True}


@router.post("/friends/{requester_id}/decline")
def decline_request(
    requester_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    row = (
        db.query(Friendship)
        .filter(
            Friendship.user_id == requester_id,
            Friendship.friend_id == user_id,
            Friendship.status == "pending",
        )
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


@router.delete("/friends/{friend_id}/request")
def cancel_outgoing_request(
    friend_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    row = (
        db.query(Friendship)
        .filter(
            Friendship.user_id == user_id,
            Friendship.friend_id == friend_id,
            Friendship.status == "pending",
        )
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


@router.delete("/friends/{friend_id}")
def remove_friend(
    friend_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    """Убрать из друзей: удаляет обе направленные связи (accepted)."""
    if friend_id == user_id:
        raise HTTPException(400, detail="Нельзя удалить себя")
    if not _are_friends(db, user_id, friend_id):
        raise HTTPException(404, detail="Пользователь не в списке друзей")
    rows = (
        db.query(Friendship)
        .filter(
            or_(
                and_(Friendship.user_id == user_id, Friendship.friend_id == friend_id),
                and_(Friendship.user_id == friend_id, Friendship.friend_id == user_id),
            )
        )
        .all()
    )
    for row in rows:
        db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/friends/invite")
def invite(body: InviteBody, db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, detail="Укажите корректный email")
    u = db.query(User).filter(User.email == email).first()
    if not u:
        return {
            "ok": True,
            "userFound": False,
            "message": "Пользователь с таким email не найден. Пусть зарегистрируется — потом можно найти по нику.",
        }
    if u.id == user_id:
        raise HTTPException(400, detail="Это ваш email")
    result = _send_friend_request(db, user_id, u.id)
    return {"ok": True, "userFound": True, **result}
