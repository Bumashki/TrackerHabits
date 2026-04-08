from fastapi import Header, HTTPException

from app.config import settings


def get_user_id(x_user_id: int | None = Header(None, alias="X-User-Id")) -> int:
    if x_user_id is not None:
        return x_user_id
    return settings.default_user_id
