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
    """avatar_url должен быть TEXT (длинные data URL). Любой не-text (varchar и т.д.) приводим к TEXT."""
    if not _is_postgres_url(settings.database_url):
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.columns c
                    WHERE c.table_schema = 'public'
                      AND c.table_name = 'users'
                      AND c.column_name = 'avatar_url'
                      AND c.data_type IS DISTINCT FROM 'text'
                  ) THEN
                    ALTER TABLE public.users
                      ALTER COLUMN avatar_url TYPE TEXT
                      USING avatar_url::text;
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


def _db_bootstrap_log_target() -> str:
    """Куда реально подключаемся (без пароля) — чтобы отловить неверный DATABASE_URL на сервере."""
    try:
        u = make_url(settings.database_url)
        host = u.host or ""
        port = f":{u.port}" if u.port else ""
        db = u.database or ""
        user = u.username or ""
        return f"{u.drivername} {user}@{host}{port}/{db}"
    except Exception:
        return "(не удалось разобрать DATABASE_URL)"


def ensure_tables_from_models(engine) -> None:
    """Создаёт таблицы по моделям (пошагово), если их ещё нет.

    Раньше использовался только create_all — на части окружений PostgreSQL это не отрабатывало
    как ожидалось; явный table.create + search_path=public даёт предсказуемое поведение.
    """
    import app.models  # noqa: F401 — регистрация таблиц в Base.metadata

    names = sorted(Base.metadata.tables.keys())
    if not names:
        raise RuntimeError(
            "В Base.metadata нет таблиц — классы ORM не привязаны к app.database.Base. "
            "Проверьте, что приложение импортирует app.models при старте."
        )

    logger.info("DB bootstrap: %s | таблицы в метаданных (%d): %s", _db_bootstrap_log_target(), len(names), names)

    if _is_postgres_url(settings.database_url):
        try:
            with engine.begin() as conn:
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
        except Exception as e:
            logger.warning("CREATE SCHEMA IF NOT EXISTS public: %s", e)

    for table in Base.metadata.sorted_tables:
        try:
            table.create(bind=engine, checkfirst=True)
            logger.info("DB: таблица OK: %s", table.name)
        except Exception:
            logger.exception("DB: ошибка CREATE для таблицы %s", table.name)
            raise

    if not _is_postgres_url(settings.database_url):
        return

    insp = inspect(engine)
    if insp.has_table("users", schema="public"):
        return

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT schemaname, tablename FROM pg_tables "
                "WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1, 2"
            )
        ).fetchall()
    logger.error("PostgreSQL: public.users нет после CREATE. pg_tables=%s", rows)
    raise RuntimeError(
        "Не удалось создать таблицы в PostgreSQL (нет public.users). "
        "Проверьте права: GRANT CREATE ON SCHEMA public TO текущий_пользователь; "
        "и что DATABASE_URL указывает на нужную базу (см. лог DB bootstrap выше)."
    )


connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    raw = settings.database_url.removeprefix("sqlite:///")
    Path(raw).parent.mkdir(parents=True, exist_ok=True)
elif _is_postgres_url(settings.database_url):
    # Явный search_path — таблицы должны попадать в public, иначе has_table(..., "public") не видит их.
    connect_args = {"options": "-c search_path=public"}

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
