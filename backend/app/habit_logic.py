"""Расчёт streak, completion rate и флагов для привычек."""
from datetime import date, timedelta
from typing import TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def weekday_key(d: date) -> str:
    return DAY_KEYS[d.weekday()]


def is_scheduled_today(schedule: list, today: date) -> bool:
    if not schedule:
        return True
    return weekday_key(today) in schedule


def habit_streak(db: "Session", habit_id: int, user_id: UUID, today: date) -> int:
    from app.models import HabitCompletion

    streak = 0
    d = today
    while True:
        row = (
            db.query(HabitCompletion)
            .filter(
                HabitCompletion.habit_id == habit_id,
                HabitCompletion.user_id == user_id,
                HabitCompletion.day == d,
                HabitCompletion.completed.is_(True),
            )
            .first()
        )
        if not row:
            break
        streak += 1
        d -= timedelta(days=1)
    return streak


def completion_rate_last_days(db: "Session", habit_id: int, user_id: UUID, days: int, today: date) -> int:
    from app.models import HabitCompletion

    start = today - timedelta(days=days - 1)
    count = (
        db.query(HabitCompletion)
        .filter(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.user_id == user_id,
            HabitCompletion.day >= start,
            HabitCompletion.day <= today,
            HabitCompletion.completed.is_(True),
        )
        .count()
    )
    return min(100, int(round(100 * count / max(1, days))))


def completed_today(db: "Session", habit_id: int, user_id: UUID, today: date) -> bool:
    from app.models import HabitCompletion

    return (
        db.query(HabitCompletion)
        .filter(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.user_id == user_id,
            HabitCompletion.day == today,
            HabitCompletion.completed.is_(True),
        )
        .first()
        is not None
    )
