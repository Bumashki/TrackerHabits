from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_user_id
from app.models import User, Habit, Friendship, ActivityFeedItem
from app.habit_logic import habit_streak, weekday_key

router = APIRouter()


class InviteBody(BaseModel):
    email: str


def _friend_today_stats(db: Session, uid: int, today: date) -> tuple[int, int]:
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


def _max_streak_friend(db: Session, uid: int, today: date) -> int:
    habits = db.query(Habit).filter(Habit.user_id == uid).all()
    best = 0
    for h in habits:
        best = max(best, habit_streak(db, h.id, uid, today))
    return best


@router.get("/friends")
def get_friends(db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
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
                "id": f.id,
                "name": f.name,
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
def get_feed(db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
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
                "userId": r.user_id,
                "initials": u.initials if u else "",
                "color": u.color if u else None,
                "text": r.text,
                "time": r.time_label,
                "streak": r.streak,
            }
        )
    return out


@router.post("/friends/{friend_id}/cheer")
def cheer(friend_id: int, user_id: int = Depends(get_user_id)):
    return {"ok": True}


@router.post("/friends/invite")
def invite(body: InviteBody, user_id: int = Depends(get_user_id)):
    return {"ok": True, "email": str(body.email)}
