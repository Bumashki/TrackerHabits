"""Статистика для страницы Stats: summary, календарь, heatmap, неделя/месяцы."""
from calendar import monthrange
from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_user_id
from app.habit_logic import weekday_key
from app.models import Habit, HabitCompletion, User
from app.routers.me import _aggregate_streaks

router = APIRouter()


def _active_habits_today(db: Session, user_id: UUID, today: date) -> list[Habit]:
    habits = [
        h
        for h in db.query(Habit).filter(Habit.user_id == user_id).all()
        if not h.is_paused and (not h.schedule or weekday_key(today) in h.schedule)
    ]
    return habits


def _day_completion_ratio(db: Session, user_id: UUID, d: date) -> tuple[int, int]:
    """Сколько выполнено из запланированных привычек в день d."""
    habits = _active_habits_today(db, user_id, d)
    if not habits:
        return 0, 0
    done = 0
    for h in habits:
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
            done += 1
    return done, len(habits)


def _heatmap_level(done: int, total: int) -> str:
    if total == 0:
        return ""
    r = done / total
    if r <= 0:
        return "l1"
    if r < 0.25:
        return "l1"
    if r < 0.5:
        return "l2"
    if r < 0.75:
        return "l3"
    return "l4"


@router.get("/stats/summary")
def stats_summary(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    today = date.today()
    cur, best = _aggregate_streaks(db, user_id, today)
    user = db.query(User).filter(User.id == user_id).first()
    xp = user.xp_points if user else 0

    month_start = date(today.year, today.month, 1)
    if today.month == 12:
        month_end = date(today.year + 1, 1, 1)
    else:
        month_end = date(today.year, today.month + 1, 1)
    last_m = min(today, month_end - timedelta(days=1))

    total_slots = 0
    total_done = 0
    perfect_days = 0
    d = month_start
    while d <= last_m:
        done, tot = _day_completion_ratio(db, user_id, d)
        if tot > 0:
            total_slots += tot
            total_done += done
            if done == tot:
                perfect_days += 1
        d += timedelta(days=1)

    monthly_rate = (
        min(100, int(round(100 * total_done / max(1, total_slots)))) if total_slots else 0
    )
    days_with_work = 0
    sum_done = 0
    d = month_start
    while d <= last_m:
        done, tot = _day_completion_ratio(db, user_id, d)
        if tot > 0:
            days_with_work += 1
            sum_done += done
        d += timedelta(days=1)
    avg_per_day = round(sum_done / max(1, days_with_work), 1)

    done_today, tot_today = _day_completion_ratio(db, user_id, today)

    return {
        "currentStreak": cur,
        "completedToday": done_today,
        "totalToday": tot_today,
        "monthlyRate": monthly_rate,
        "xpPoints": xp,
        "bestStreak": best,
        "avgPerDay": avg_per_day,
        "perfectDays": perfect_days,
    }


@router.get("/stats/calendar")
def stats_calendar(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    _, last_day = monthrange(year, month)
    out: dict[str, str] = {}
    for day in range(1, last_day + 1):
        d = date(year, month, day)
        done, tot = _day_completion_ratio(db, user_id, d)
        key = d.isoformat()
        if tot == 0:
            out[key] = ""
        elif done == tot:
            out[key] = "done"
        elif done > 0:
            out[key] = "partial"
        else:
            out[key] = ""
    return out


@router.get("/stats/weekly")
def stats_weekly(db: Session = Depends(get_db), user_id: UUID = Depends(get_user_id)):
    """Доля выполненных слотов по дням недели (пн–вс) за последние 28 дней."""
    today = date.today()
    start = today - timedelta(days=27)
    buckets = [0, 0, 0, 0, 0, 0, 0]
    counts = [0, 0, 0, 0, 0, 0, 0]
    d = start
    while d <= today:
        wk = d.weekday()
        done, tot = _day_completion_ratio(db, user_id, d)
        if tot > 0:
            buckets[wk] += done
            counts[wk] += tot
        d += timedelta(days=1)
    return [min(100, int(round(100 * buckets[i] / max(1, counts[i])))) for i in range(7)]


@router.get("/stats/monthly")
def stats_monthly(
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    out: list[int] = []
    for m in range(1, 13):
        _, last_day = monthrange(year, m)
        month_start = date(year, m, 1)
        month_end = date(year, m, last_day)
        today = date.today()
        if year > today.year or (year == today.year and m > today.month):
            out.append(0)
            continue
        last_d = min(month_end, today) if year == today.year and m == today.month else month_end
        total_slots = 0
        total_done = 0
        d = month_start
        while d <= last_d:
            done, tot = _day_completion_ratio(db, user_id, d)
            if tot > 0:
                total_slots += tot
                total_done += done
            d += timedelta(days=1)
        out.append(min(100, int(round(100 * total_done / max(1, total_slots)))) if total_slots else 0)
    return out


@router.get("/stats/heatmap")
def stats_heatmap(
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    """91 клетка: первые 91 день года (как на макете)."""
    start = date(year, 1, 1)
    cells: list[str] = []
    for i in range(91):
        d = start + timedelta(days=i)
        if d > date.today():
            cells.append("")
            continue
        done, tot = _day_completion_ratio(db, user_id, d)
        cells.append(_heatmap_level(done, tot) if tot else "")
    return cells
