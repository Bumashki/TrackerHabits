import logging
import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.schema import CreateColumn

from app.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


def _is_postgres_url(url: str) -> bool:
    """Учитывает postgresql://, postgres://, postgresql+psycopg2:// и т.д."""
    try:
        return make_url(url).drivername.startswith("postgres")
    except Exception:
        return url.startswith("postgresql") or url.startswith("postgres")


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


def ensure_postgres_avatar_url_text_if_varchar(engine) -> None:
    """Старые схемы с VARCHAR для avatar_url не вмещают data URL — расширяем до TEXT."""
    if not _is_postgres_url(settings.database_url):
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'users'
                      AND column_name = 'avatar_url'
                      AND data_type = 'character varying'
                  ) THEN
                    ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
                  END IF;
                END $$;
                """
            )
        )


def ensure_missing_columns(engine) -> None:
    """Сравнивает модели SQLAlchemy с таблицами в БД и добавляет только недостающие колонки.

    create_all создаёт новые таблицы целиком, но не добавляет колонки в уже существующие —
    без этого запросы к ORM падают после смены моделей. База не пересоздаётся.

    NOT NULL без server_default на непустой таблице в SQLite может не примениться — смотрите лог.
    """
    import app.models  # noqa: F401 — регистрация таблиц в Base.metadata

    insp = inspect(engine)
    dialect = engine.dialect
    dialect_name = dialect.name
    preparer = dialect.identifier_preparer

    for table in Base.metadata.sorted_tables:
        schema = table.schema
        try:
            if not insp.has_table(table.name, schema=schema):
                continue
        except Exception as e:
            logger.warning("ensure_missing_columns: has_table %s: %s", table.name, e)
            continue

        existing = {c["name"] for c in insp.get_columns(table.name, schema=schema)}
        if table.schema:
            qtbl = f"{preparer.quote_schema(table.schema)}.{preparer.quote(table.name)}"
        else:
            qtbl = preparer.quote(table.name)

        for column in table.columns:
            if column.name in existing:
                continue
            if column.primary_key:
                continue
            try:
                col_sql = str(CreateColumn(column).compile(dialect=dialect)).strip()
                if dialect_name == "postgresql":
                    stmt = f"ALTER TABLE {qtbl} ADD COLUMN IF NOT EXISTS {col_sql}"
                else:
                    stmt = f"ALTER TABLE {qtbl} ADD COLUMN {col_sql}"
                with engine.begin() as conn:
                    conn.execute(text(stmt))
                logger.info("Schema: added column %s.%s", table.name, column.name)
            except Exception as e:
                logger.warning(
                    "Schema: could not add column %s.%s (%s). "
                    "For NOT NULL columns on non-empty tables set server_default in the model.",
                    table.name,
                    column.name,
                    e,
                )


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
