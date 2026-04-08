"""Демо-данные при первом запуске (если таблица users пуста)."""
from datetime import date, datetime, timedelta

from app.database import SessionLocal
from app.habit_logic import weekday_key
from app.models import ActivityFeedItem, Friendship, Habit, HabitCompletion, User


def seed_if_empty() -> None:
    db = SessionLocal()
    try:
        if db.query(User).first() is not None:
            return

        u1 = User(
            email="anna.m@email.com",
            password_hash="",
            name="Анна Михайлова",
            nickname="anna",
            initials="АМ",
            color="#2d6a4f",
            timezone="UTC+3",
            language="ru",
            joined_at=date(2026, 1, 15),
            xp_points=1240,
            xp_this_week=42,
            is_online=True,
            last_seen_label=None,
            notifications={
                "dailyReminder": True,
                "friendActivity": True,
                "streakAlert": False,
            },
        )
        u2 = User(
            email="katya@email.com",
            password_hash="",
            name="Катя С.",
            nickname="katya",
            initials="КС",
            color="#2d6a4f",
            timezone="UTC+3",
            language="ru",
            joined_at=date(2026, 1, 10),
            xp_points=800,
            xp_this_week=35,
            is_online=True,
            last_seen_label=None,
            notifications={},
        )
        u3 = User(
            email="misha@email.com",
            password_hash="",
            name="Миша В.",
            nickname="misha",
            initials="МВ",
            color="#1d6fa3",
            timezone="UTC+3",
            language="ru",
            joined_at=date(2026, 2, 1),
            xp_points=900,
            xp_this_week=42,
            is_online=True,
            last_seen_label=None,
            notifications={},
        )
        u4 = User(
            email="olya@email.com",
            password_hash="",
            name="Оля А.",
            nickname="olya",
            initials="ОА",
            color="#b45309",
            timezone="UTC+3",
            language="ru",
            joined_at=date(2026, 2, 20),
            xp_points=500,
            xp_this_week=22,
            is_online=False,
            last_seen_label="2 ч назад",
            notifications={},
        )
        db.add_all([u1, u2, u3, u4])
        db.flush()

        habits_spec = [
            ("Утренняя медитация", "fa-spa", "#2d6a4f", "Здоровье", ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], "06:00", "10 мин"),
            ("Пробежка", "fa-person-running", "#1d6fa3", "Спорт", ["mon", "wed", "fri", "sat"], "07:30", "30 мин"),
            ("Чтение книги", "fa-book-open", "#7a3ea0", "Саморазвитие", ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], "21:00", "20 стр"),
            ("Выпить 2 л воды", "fa-droplet", "#b45309", "Здоровье", ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], "", "2000 мл"),
            ("Игра на гитаре", "fa-guitar", "#c0392b", "Творчество", ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], "19:00", "15 мин"),
            ("Дневник", "fa-note-sticky", "#6b6b66", "Саморазвитие", ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], "22:00", "5 мин"),
        ]
        habits: list[Habit] = []
        for name, icon, color, cat, sched, rem, goal in habits_spec:
            h = Habit(
                user_id=u1.id,
                name=name,
                icon=icon,
                color=color,
                category=cat,
                schedule=sched,
                reminder_time=rem or None,
                goal=goal,
                is_paused=name == "Дневник",
                created_at=datetime.utcnow(),
            )
            db.add(h)
            habits.append(h)
        db.flush()

        for uid in (u2.id, u3.id, u4.id):
            db.add(
                Habit(
                    user_id=uid,
                    name="Зарядка",
                    icon="fa-dumbbell",
                    color="#2d6a4f",
                    category="Спорт",
                    schedule=["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
                    reminder_time="08:00",
                    goal="15 мин",
                    is_paused=False,
                    created_at=datetime.utcnow(),
                )
            )
        db.flush()

        pairs = [(u1.id, u2.id), (u2.id, u1.id), (u1.id, u3.id), (u3.id, u1.id), (u1.id, u4.id), (u4.id, u1.id)]
        for a, b in pairs:
            db.add(Friendship(user_id=a, friend_id=b, status="accepted"))

        feed = [
            (u3.id, "Миша В. выполнил все 6 привычек", "5 мин назад", 31),
            (u2.id, "Катя С. установила рекорд серии — 18 дней", "1 час назад", 18),
            (u4.id, "Оля А. добавила привычку «Йога»", "2 часа назад", None),
            (u1.id, "Вы выполнили 4 привычки", "Сегодня", 23),
        ]
        for uid, text, tl, streak in feed:
            db.add(ActivityFeedItem(user_id=uid, text=text, time_label=tl, streak=streak))

        today = date.today()
        for offset in range(45):
            d = today - timedelta(days=offset)
            for h in habits:
                if h.is_paused:
                    continue
                if h.schedule and weekday_key(d) not in h.schedule:
                    continue
                if offset % 7 == 0 and h.name == "Игра на гитаре":
                    continue
                db.add(
                    HabitCompletion(
                        habit_id=h.id,
                        user_id=u1.id,
                        day=d,
                        completed=True,
                    )
                )

        db.commit()
    finally:
        db.close()
