import sqlite3
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def remove_stale_sqlite_if_integer_user_ids() -> None:
    """Удаляет локальный SQLite-файл, если в нём старая схема users.id INTEGER (до UUID)."""
    if not settings.database_url.startswith("sqlite"):
        return
    path = Path(settings.database_url.removeprefix("sqlite:///"))
    if not path.is_file():
        return
    stale = False
    conn = sqlite3.connect(path)
    try:
        cur = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        )
        if not cur.fetchone():
            return
        for _cid, name, col_type, *_rest in conn.execute("PRAGMA table_info(users)"):
            if name == "id" and col_type.upper() in ("INTEGER", "INT"):
                stale = True
                break
    finally:
        conn.close()
    if stale:
        path.unlink(missing_ok=True)


connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    raw = settings.database_url.removeprefix("sqlite:///")
    Path(raw).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
