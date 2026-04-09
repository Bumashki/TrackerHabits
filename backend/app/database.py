import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


def _is_postgres_url(url: str) -> bool:
    """Учитывает postgresql://, postgres://, postgresql+psycopg2:// и т.д."""
    try:
        return make_url(url).drivername.startswith("postgres")
    except Exception:
        return url.startswith("postgresql") or url.startswith("postgres")


class Base(DeclarativeBase):
    pass


def ensure_sqlite_users_cheer_columns() -> None:
    """Добавляет last_cheer_at и last_cheer_friend_id в существующую SQLite users."""
    if not settings.database_url.startswith("sqlite"):
        return
    path = Path(settings.database_url.removeprefix("sqlite:///"))
    if not path.is_file():
        return
    conn = sqlite3.connect(path)
    try:
        cur = conn.execute("PRAGMA table_info(users)")
        cols = [row[1] for row in cur.fetchall()]
        if not cols:
            return
        if "last_cheer_at" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN last_cheer_at DATETIME")
        if "last_cheer_friend_id" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN last_cheer_friend_id CHAR(36)")
        conn.commit()
    finally:
        conn.close()


def ensure_postgres_users_cheer_columns(engine) -> None:
    """Добавляет колонки похвалы в существующую таблицу users (PostgreSQL).

    create_all не меняет уже созданные таблицы — без этого запросы к User падают.
    """
    if not _is_postgres_url(settings.database_url):
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_cheer_at TIMESTAMP WITH TIME ZONE"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_cheer_friend_id UUID "
                "REFERENCES users(id) ON DELETE SET NULL"
            )
        )


def ensure_sqlite_users_avatar_column() -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    path = Path(settings.database_url.removeprefix("sqlite:///"))
    if not path.is_file():
        return
    conn = sqlite3.connect(path)
    try:
        cur = conn.execute("PRAGMA table_info(users)")
        cols = [row[1] for row in cur.fetchall()]
        if not cols:
            return
        if "avatar_url" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
        conn.commit()
    finally:
        conn.close()


def ensure_postgres_users_avatar_column(engine) -> None:
    if not _is_postgres_url(settings.database_url):
        return
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT")
        )


def ensure_users_cheer_columns(engine) -> None:
    """SQLite и PostgreSQL: недостающие колонки для похвалы."""
    ensure_sqlite_users_cheer_columns()
    ensure_postgres_users_cheer_columns(engine)


def ensure_users_avatar_columns(engine) -> None:
    """SQLite и PostgreSQL: аватар (data URL или пусто)."""
    ensure_sqlite_users_avatar_column()
    ensure_postgres_users_avatar_column(engine)


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
