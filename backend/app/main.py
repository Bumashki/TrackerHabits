from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import friends, habits, me, stats

import app.models  # noqa: F401 — регистрация таблиц в Base.metadata


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
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

app.include_router(me.router, prefix="/api", tags=["me"])
app.include_router(habits.router, prefix="/api", tags=["habits"])
app.include_router(friends.router, prefix="/api", tags=["friends"])
app.include_router(stats.router, prefix="/api", tags=["stats"])


@app.get("/")
def root():
    return {
        "service": "Habit Tracker API",
        "docs": "/docs",
        "health": "/health",
        "hint": "Откройте фронтенд в dev: http://localhost:5173 (Vite), API префикс: /api",
    }


@app.get("/health")
def health():
    return {"ok": True}
