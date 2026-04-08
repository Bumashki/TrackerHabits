from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_user_id
from app.models import User, Habit, HabitCompletion
from app.habit_logic import habit_streak, weekday_key

router = APIRouter()


class NotificationsPatch(BaseModel):
    dailyReminder: bool | None = None
    friendActivity: bool | None = None
    streakAlert: bool | None = None


class MePatch(BaseModel):
    name: str | None = None
    nickname: str | None = None
    email: str | None = None
    timezone: str | None = None
    language: str | None = None


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
        "initials": u.initials or (u.name[:2] if u.name else ""),
        "email": u.email,
        "timezone": u.timezone,
        "language": u.language,
        "joinedAt": u.joined_at.isoformat(),
        "currentStreak": cur,
        "bestStreak": best,
        "xpPoints": u.xp_points,
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
        u.nickname = data.nickname
    if data.email is not None:
        u.email = data.email
    if data.timezone is not None:
        u.timezone = data.timezone
    if data.language is not None:
        u.language = data.language
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
