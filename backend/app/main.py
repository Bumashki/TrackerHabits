from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import settings
from app.database import (
    Base,
    engine,
    ensure_missing_columns,
    ensure_postgres_avatar_url_text_if_varchar,
    remove_stale_sqlite_if_integer_user_ids,
)
from app.routers import auth, friends, habits, me, messages, stats

import app.models  # noqa: F401 — регистрация таблиц в Base.metadata


@asynccontextmanager
async def lifespan(_: FastAPI):
    remove_stale_sqlite_if_integer_user_ids()
    Base.metadata.create_all(bind=engine)
    ensure_missing_columns(engine)
    ensure_postgres_avatar_url_text_if_varchar(engine)
    from app.seed import seed_if_empty

    seed_if_empty()
    yield


app = FastAPI(title="Habit Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(me.router, prefix="/api", tags=["me"])
app.include_router(habits.router, prefix="/api", tags=["habits"])
app.include_router(friends.router, prefix="/api", tags=["friends"])
app.include_router(messages.router, prefix="/api", tags=["messages"])
app.include_router(stats.router, prefix="/api", tags=["stats"])


@app.get("/health")
def health():
    return {"ok": True}


# GROUP_SITE/ = backend/app/main.py → три уровня вверх
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_FRONTEND_DIST = _REPO_ROOT / "frontend" / "dist"


def _register_spa_static() -> None:
    """Если есть frontend/dist — сайт и /api с одного хоста (удобно по IP)."""
    index = _FRONTEND_DIST / "index.html"
    if not _FRONTEND_DIST.is_dir() or not index.is_file():
        return

    dist_resolved = _FRONTEND_DIST.resolve()

    @app.get("/")
    async def spa_root():
        return FileResponse(index)

    @app.get("/{full_path:path}")
    async def spa_or_asset(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (_FRONTEND_DIST / full_path).resolve()
        try:
            candidate.relative_to(dist_resolved)
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found") from None
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(index)


_register_spa_static()


if not (_FRONTEND_DIST.is_dir() and (_FRONTEND_DIST / "index.html").is_file()):

    @app.get("/")
    def root():
        return {
            "service": "Habit Tracker API",
            "docs": "/docs",
            "health": "/health",
            "hint": "Соберите фронт: cd frontend && npm run build — тогда корень отдаст SPA. API: /api",
        }
