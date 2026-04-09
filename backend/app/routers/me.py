from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_user_id
from app.models import User, Habit, HabitCompletion
from app.nickname_utils import is_valid_nickname_normalized, normalize_nickname
from app.habit_logic import habit_streak, weekday_key

router = APIRouter()


class NotificationsPatch(BaseModel):
    dailyReminder: bool | None = None
    friendActivity: bool | None = None
    streakAlert: bool | None = None


def _validate_avatar_url(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        raise HTTPException(400, detail="Пустой аватар")
    if len(s) > 350_000:
        raise HTTPException(400, detail="Аватар слишком большой")
    if not (
        s.startswith("data:image/jpeg;base64,")
        or s.startswith("data:image/png;base64,")
        or s.startswith("data:image/webp;base64,")
    ):
        raise HTTPException(400, detail="Разрешены только изображения JPEG, PNG или WebP (data URL)")
    return s


class MePatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    nickname: str | None = None
    email: str | None = None
    timezone: str | None = None
    language: str | None = None
    avatar_url: str | None = Field(None, alias="avatarUrl")


def _aggregate_streaks(db: Session, user_id: UUID, today: date) -> tuple[int, int]:
    habits = db.query(Habit).filter(Habit.user_id == user_id).all()
    best = 0
    current_max = 0
    for h in habits:
        s = habit_streak(db, h.id, user_id, today)
        best = max(best, s)
        if not h.is_paused and (not h.schedule or weekday_key(today) in h.schedule):
            current_max = max(current_max, s)
    return current_max, best


def _success_rate(db: Session, user_id: UUID, today: date) -> int:
    habits = [h for h in db.query(Habit).filter(Habit.user_id == user_id).all() if not h.is_paused]
    if not habits:
        return 0
    month_start = date(today.year, today.month, 1)
    if today.month == 12:
        month_end = date(today.year + 1, 1, 1)
    else:
        month_end = date(today.year, today.month + 1, 1)
    last_day = min(today, month_end - timedelta(days=1))
    total_slots = 0
    done_slots = 0
    d = month_start
    while d <= last_day:
        for h in habits:
            if not h.schedule or weekday_key(d) in h.schedule:
                total_slots += 1
                if (
                    db.query(HabitCompletion)
                    .filter(
                        HabitCompletion.habit_id == h.id,
                        HabitCompletion.user_id == user_id,
                        HabitCompletion.day == d,
                        HabitCompletion.completed.is_(True),
                    )
                    .first()
                ):
                    done_slots += 1
        d += timedelta(days=1)
    return min(100, int(round(100 * done_slots / max(1, total_slots))))


def build_me_response(db: Session, user_id: UUID) -> dict:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        return {}
    today = date.today()
    cur, best = _aggregate_streaks(db, user_id, today)
    notif = u.notifications or {}
    return {
        "id": str(u.id),
        "name": u.name,
        "nickname": u.nickname,
        "initials": u.initials or (u.name[:2] if u.name else ""),
        "color": u.color or "#2d6a4f",
        "avatarUrl": u.avatar_url or None,
        "email": u.email,
        "timezone": u.timezone,
        "language": u.language,
        "joinedAt": u.joined_at.isoformat(),
        "currentStreak": cur,
        "bestStreak": best,
        "xpPoints": u.xp_points,
        "xpThisWeek": u.xp_this_week,
        "successRate": _success_rate(db, user_id, today),
        "notifications": {
            "dailyReminder": notif.get("dailyReminder", True),
            "friendActivity": notif.get("friendActivity", True),
            "streakAlert": notif.get("streakAlert", False),
        },
    }


@router.get("/me")
def get_me(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    return build_me_response(db, user_id)


@router.patch("/me")
def patch_me(
    data: MePatch,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        return {}
    if data.name is not None:
        u.name = data.name
    if data.nickname is not None:
        raw = data.nickname.strip()
        if raw == "":
            u.nickname = None
        else:
            nick = normalize_nickname(raw)
            if not is_valid_nickname_normalized(nick):
                raise HTTPException(
                    400,
                    detail="Nickname: 3–32 символа, латиница, цифры и подчёркивание",
                )
            other = (
                db.query(User)
                .filter(User.nickname == nick, User.id != user_id)
                .first()
            )
            if other:
                raise HTTPException(400, detail="Nickname already taken")
            u.nickname = nick
    if data.email is not None:
        u.email = data.email
    if data.timezone is not None:
        u.timezone = data.timezone
    if data.language is not None:
        u.language = data.language
    if "avatar_url" in data.model_fields_set:
        if data.avatar_url:
            u.avatar_url = _validate_avatar_url(data.avatar_url)
        else:
            u.avatar_url = None
    db.commit()
    return build_me_response(db, user_id)


@router.patch("/me/notifications")
def patch_notifications(
    data: NotificationsPatch,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        return {}
    n = dict(u.notifications or {})
    if data.dailyReminder is not None:
        n["dailyReminder"] = data.dailyReminder
    if data.friendActivity is not None:
        n["friendActivity"] = data.friendActivity
    if data.streakAlert is not None:
        n["streakAlert"] = data.streakAlert
    u.notifications = n
    db.commit()
    return n
