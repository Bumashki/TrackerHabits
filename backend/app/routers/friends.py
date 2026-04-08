import re
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_user_id
from app.models import User, Habit, Friendship, ActivityFeedItem
from app.habit_logic import habit_streak, weekday_key

router = APIRouter()

_SEARCH_NICK = re.compile(r"^[a-z0-9_]{2,32}$")


class InviteBody(BaseModel):
    email: str


def _friend_today_stats(db: Session, uid: UUID, today: date) -> tuple[int, int]:
    habits = [
        h
        for h in db.query(Habit).filter(Habit.user_id == uid).all()
        if not h.is_paused and (not h.schedule or weekday_key(today) in h.schedule)
    ]
    total = len(habits)
    done = 0
    for h in habits:
        from app.models import HabitCompletion

        if (
            db.query(HabitCompletion)
            .filter(
                HabitCompletion.habit_id == h.id,
                HabitCompletion.user_id == uid,
                HabitCompletion.day == today,
                HabitCompletion.completed.is_(True),
            )
            .first()
        ):
            done += 1
    return done, max(1, total)


def _max_streak_friend(db: Session, uid: UUID, today: date) -> int:
    habits = db.query(Habit).filter(Habit.user_id == uid).all()
    best = 0
    for h in habits:
        best = max(best, habit_streak(db, h.id, uid, today))
    return best


@router.get("/friends")
def get_friends(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    today = date.today()
    links = (
        db.query(Friendship)
        .filter(Friendship.user_id == user_id, Friendship.status == "accepted")
        .all()
    )
    out = []
    for link in links:
        f = db.query(User).filter(User.id == link.friend_id).first()
        if not f:
            continue
        done, total = _friend_today_stats(db, f.id, today)
        out.append(
            {
                "id": str(f.id),
                "name": f.name,
                "nickname": f.nickname,
                "initials": f.initials or f.name[:2],
                "color": f.color or "#2d6a4f",
                "isOnline": f.is_online,
                "lastSeen": f.last_seen_label,
                "streak": _max_streak_friend(db, f.id, today),
                "completedToday": done,
                "totalToday": total,
                "xpThisWeek": f.xp_this_week,
            }
        )
    return out


@router.get("/friends/feed")
def get_feed(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    rows = (
        db.query(ActivityFeedItem)
        .order_by(ActivityFeedItem.id.desc())
        .limit(20)
        .all()
    )
    out = []
    for r in rows:
        u = db.query(User).filter(User.id == r.user_id).first()
        out.append(
            {
                "id": r.id,
                "userId": str(r.user_id),
                "initials": u.initials if u else "",
                "color": u.color if u else None,
                "text": r.text,
                "time": r.time_label,
                "streak": r.streak,
            }
        )
    return out


@router.post("/friends/{friend_id}/cheer")
def cheer(friend_id: UUID, user_id: UUID = Depends(get_user_id)):
    return {"ok": True}


@router.get("/friends/search")
def search_friends(
    q: str = Query("", max_length=64),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    """Поиск пользователей по никнейму (подстрока; только a-z, 0-9, _)."""
    needle = (q or "").strip().lower()
    if not _SEARCH_NICK.match(needle):
        return []
    friend_ids = {
        r.friend_id
        for r in db.query(Friendship).filter(Friendship.user_id == user_id).all()
    }
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
        if u.id in friend_ids:
            continue
        out.append(
            {
                "id": str(u.id),
                "name": u.name,
                "nickname": u.nickname,
                "initials": u.initials or (u.name[:2] if u.name else ""),
                "color": u.color or "#2d6a4f",
            }
        )
    return out


@router.post("/friends/{friend_id}/request")
def request_friend(
    friend_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    if friend_id == user_id:
        raise HTTPException(400, detail="Нельзя добавить себя")
    target = db.query(User).filter(User.id == friend_id).first()
    if not target:
        raise HTTPException(404, detail="Пользователь не найден")
    existing = (
        db.query(Friendship)
        .filter(Friendship.user_id == user_id, Friendship.friend_id == friend_id)
        .first()
    )
    if existing:
        return {"ok": True, "already": True}
    db.add(Friendship(user_id=user_id, friend_id=friend_id, status="accepted"))
    db.commit()
    return {"ok": True}


@router.post("/friends/invite")
def invite(body: InviteBody, user_id: UUID = Depends(get_user_id)):
    return {"ok": True, "email": str(body.email)}
