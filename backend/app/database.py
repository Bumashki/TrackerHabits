import logging
import sqlite3
import sys
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy import Date, DateTime, create_engine, inspect, text
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


def _sqlite_table_column_names(engine, table_name: str) -> set[str]:
    """Надёжнее, чем inspector.get_columns для локального SQLite."""
    with engine.connect() as conn:
        rows = conn.execute(text(f'PRAGMA table_info("{table_name}")')).fetchall()
    return {row[1] for row in rows}


def _column_fragment_for_alter(column: sa.Column, dialect) -> str:
    """Фрагмент для ADD COLUMN: без FK/UNIQUE/index — иначе SQLite/часть PG ломается."""
    plain = sa.Column(
        column.name,
        column.type,
        nullable=column.nullable,
        server_default=column.server_default,
    )
    return str(CreateColumn(plain).compile(dialect=dialect)).strip()


def _pg_effective_schema(table: sa.Table) -> str:
    """У моделей чаще всего schema=None — в PostgreSQL это означает public."""
    if table.schema is not None:
        return table.schema
    return "public"


def _postgres_table_column_names(engine, table_name: str, schema: str) -> set[str]:
    """Список колонок из information_schema (надёжно при любом search_path на сервере)."""
    q = text(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = :schema AND table_name = :tname
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(q, {"schema": schema, "tname": table_name}).fetchall()
    return {r[0] for r in rows}


def _column_fragment_fallback_postgresql(column: sa.Column, preparer, dialect) -> str:
    """Минимальный ADD COLUMN для PostgreSQL (когда CreateColumn не подходит)."""
    typ = column.type.compile(dialect=dialect)
    if typ.upper() == "JSON":
        typ = "JSONB"
    parts = [preparer.quote(column.name), typ]
    if column.server_default is not None:
        sd = column.server_default.compile(dialect=dialect)
        if sd:
            parts.extend(["DEFAULT", str(sd)])
    if column.nullable is False and column.server_default is None:
        if isinstance(column.type, DateTime):
            parts.extend(["DEFAULT", "now()"])
        elif isinstance(column.type, Date):
            parts.extend(["DEFAULT", "CURRENT_DATE"])
        elif isinstance(column.type, sa.Boolean):
            parts.extend(["DEFAULT", "false"])
        elif isinstance(column.type, sa.Integer):
            parts.extend(["DEFAULT", "0"])
        else:
            parts.extend(["DEFAULT", "''"])
        parts.append("NOT NULL")
    return " ".join(parts)


def _column_fragment_fallback_sqlite(column: sa.Column, preparer) -> str:
    """Минимальный ADD COLUMN для SQLite, если CreateColumn всё ещё не подходит."""
    sqlite_dialect = sa.dialects.sqlite.dialect()
    typ = column.type.compile(dialect=sqlite_dialect)
    if typ.upper() == "JSON":
        typ = "TEXT"
    parts = [preparer.quote(column.name), typ]
    if column.server_default is not None:
        sd = column.server_default.compile(dialect=sqlite_dialect)
        if sd:
            parts.extend(["DEFAULT", str(sd)])
    if column.nullable is False and column.server_default is None:
        if isinstance(column.type, DateTime):
            parts.extend(["DEFAULT", "(datetime('now'))"])
        elif isinstance(column.type, Date):
            parts.extend(["DEFAULT", "(date('now'))"])
        elif isinstance(column.type, sa.Boolean):
            parts.extend(["DEFAULT", "0"])
        elif isinstance(column.type, sa.Integer):
            parts.extend(["DEFAULT", "0"])
        else:
            parts.extend(["DEFAULT", "''"])
        parts.append("NOT NULL")
    return " ".join(parts)


def _try_add_column(engine, dialect_name: str, qtbl: str, table_name: str, column: sa.Column, dialect) -> None:
    preparer = dialect.identifier_preparer
    errors: list[str] = []

    attempts: list[str] = []
    try:
        attempts.append(str(CreateColumn(column).compile(dialect=dialect)).strip())
    except Exception as e:
        errors.append(f"CreateColumn(full): {e}")

    try:
        attempts.append(_column_fragment_for_alter(column, dialect))
    except Exception as e:
        errors.append(f"CreateColumn(plain): {e}")

    if dialect_name == "sqlite":
        try:
            attempts.append(_column_fragment_fallback_sqlite(column, preparer))
        except Exception as e:
            errors.append(f"fallback_sqlite: {e}")
    elif dialect_name == "postgresql":
        try:
            attempts.append(_column_fragment_fallback_postgresql(column, preparer, dialect))
        except Exception as e:
            errors.append(f"fallback_postgresql: {e}")

    seen: set[str] = set()
    unique_attempts: list[str] = []
    for a in attempts:
        if a and a not in seen:
            seen.add(a)
            unique_attempts.append(a)

    last_err: Exception | None = None
    for frag in unique_attempts:
        if dialect_name == "postgresql":
            stmt = f"ALTER TABLE {qtbl} ADD COLUMN IF NOT EXISTS {frag}"
        else:
            stmt = f"ALTER TABLE {qtbl} ADD COLUMN {frag}"
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
            logger.info("Schema: added column %s.%s", table_name, column.name)
            return
        except Exception as e:
            last_err = e
            logger.debug("Schema ADD COLUMN try failed: %s | %s", stmt, e)

    msg = (
        f"Schema: could not add column {table_name}.{column.name}: {last_err!r}; "
        f"tried {len(unique_attempts)} variants; build notes: {'; '.join(errors) or '—'}"
    )
    logger.error(msg)
    print(msg, file=sys.stderr)


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

    Для ADD COLUMN используется «облегчённое» описание колонки (без FK/UNIQUE в одной
    команде) — полный CreateColumn часто даёт синтаксис, непригодный для ALTER TABLE.

    PostgreSQL: при schema=None в модели используется **public**; колонки читаются из
    information_schema; ALTER — всегда **schema.table**.

    NOT NULL без server_default на непустой таблице в SQLite может не примениться.
    """
    import app.models  # noqa: F401 — регистрация таблиц в Base.metadata

    insp = inspect(engine)
    dialect = engine.dialect
    dialect_name = dialect.name
    preparer = dialect.identifier_preparer

    for table in Base.metadata.sorted_tables:
        if dialect_name == "postgresql":
            schema = _pg_effective_schema(table)
        else:
            schema = table.schema

        try:
            if not insp.has_table(table.name, schema=schema):
                continue
        except Exception as e:
            logger.warning("ensure_missing_columns: has_table %s: %s", table.name, e)
            continue

        if dialect_name == "sqlite":
            try:
                existing = _sqlite_table_column_names(engine, table.name)
            except Exception as e:
                logger.warning("ensure_missing_columns: PRAGMA table_info %s: %s", table.name, e)
                existing = {c["name"] for c in insp.get_columns(table.name, schema=schema)}
        elif dialect_name == "postgresql":
            try:
                existing = _postgres_table_column_names(engine, table.name, schema)
            except Exception as e:
                logger.warning(
                    "ensure_missing_columns: information_schema %s.%s: %s",
                    schema,
                    table.name,
                    e,
                )
                existing = {c["name"] for c in insp.get_columns(table.name, schema=schema)}
        else:
            existing = {c["name"] for c in insp.get_columns(table.name, schema=schema)}

        if dialect_name == "postgresql":
            qtbl = f"{preparer.quote_schema(schema)}.{preparer.quote(table.name)}"
        elif table.schema:
            qtbl = f"{preparer.quote_schema(table.schema)}.{preparer.quote(table.name)}"
        else:
            qtbl = preparer.quote(table.name)

        for column in table.columns:
            if column.name in existing:
                continue
            if column.primary_key:
                continue
            _try_add_column(engine, dialect_name, qtbl, table.name, column, dialect)


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
