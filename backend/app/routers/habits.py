from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_user_id
from app.models import Habit, HabitCompletion
from app.habit_logic import (
    completed_today,
    completion_rate_last_days,
    habit_streak,
    is_scheduled_today,
)

router = APIRouter()


class HabitCreate(BaseModel):
    name: str
    icon: str = "fa-spa"
    color: str = "#2d6a4f"
    category: str = "Здоровье"
    schedule: list[str] = Field(default_factory=list)
    reminderTime: str | None = ""
    goal: str | None = ""
    description: str | None = None


class HabitUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    category: str | None = None
    schedule: list[str] | None = None
    reminderTime: str | None = None
    goal: str | None = None
    description: str | None = None
    is_paused: bool | None = None


class CompleteBody(BaseModel):
    date: str | None = None


def serialize_habit(db: Session, h: Habit, today: date) -> dict:
    st = habit_streak(db, h.id, h.user_id, today)
    rate = completion_rate_last_days(db, h.id, h.user_id, 30, today)
    done = completed_today(db, h.id, h.user_id, today)
    sched_today = is_scheduled_today(h.schedule or [], today)
    return {
        "id": h.id,
        "name": h.name,
        "icon": h.icon,
        "color": h.color,
        "category": h.category,
        "schedule": h.schedule or [],
        "reminderTime": h.reminder_time or "",
        "goal": h.goal or "",
        "description": h.description,
        "streak": st,
        "completedToday": done and sched_today,
        "completionRate": rate,
        "isActive": not h.is_paused,
        "isScheduledToday": sched_today,
    }


@router.get("/habits")
def list_habits(db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
    today = date.today()
    rows = db.query(Habit).filter(Habit.user_id == user_id).order_by(Habit.id).all()
    return [serialize_habit(db, h, today) for h in rows]


@router.post("/habits")
def create_habit(
    data: HabitCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_user_id),
):
    h = Habit(
        user_id=user_id,
        name=data.name,
        icon=data.icon,
        color=data.color,
        category=data.category,
        schedule=data.schedule,
        reminder_time=data.reminderTime or None,
        goal=data.goal or None,
        description=data.description,
        is_paused=False,
        created_at=datetime.utcnow(),
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return serialize_habit(db, h, date.today())


@router.patch("/habits/{habit_id}")
def update_habit(
    habit_id: int,
    data: HabitUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_user_id),
):
    h = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Not found")
    if data.name is not None:
        h.name = data.name
    if data.icon is not None:
        h.icon = data.icon
    if data.color is not None:
        h.color = data.color
    if data.category is not None:
        h.category = data.category
    if data.schedule is not None:
        h.schedule = data.schedule
    if data.reminderTime is not None:
        h.reminder_time = data.reminderTime or None
    if data.goal is not None:
        h.goal = data.goal
    if data.description is not None:
        h.description = data.description
    if data.is_paused is not None:
        h.is_paused = data.is_paused
    db.commit()
    return serialize_habit(db, h, date.today())


@router.delete("/habits/{habit_id}", status_code=204)
def delete_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_user_id),
):
    h = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(h)
    db.commit()
    return None


@router.post("/habits/{habit_id}/complete")
def complete_habit(
    habit_id: int,
    body: CompleteBody | None = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_user_id),
):
    h = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Not found")
    raw = (body.date if body and body.date else None) or date.today().isoformat()
    d = date.fromisoformat(raw[:10])
    row = (
        db.query(HabitCompletion)
        .filter(HabitCompletion.habit_id == habit_id, HabitCompletion.day == d)
        .first()
    )
    if row:
        row.completed = True
    else:
        db.add(
            HabitCompletion(habit_id=habit_id, user_id=user_id, day=d, completed=True)
        )
    db.commit()
    return {"ok": True}


@router.delete("/habits/{habit_id}/complete")
def uncomplete_habit(
    habit_id: int,
    date_q: str | None = Query(None, alias="date"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_user_id),
):
    h = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Not found")
    raw = date_q or date.today().isoformat()
    d = date.fromisoformat(raw[:10])
    row = (
        db.query(HabitCompletion)
        .filter(HabitCompletion.habit_id == habit_id, HabitCompletion.day == d)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}
