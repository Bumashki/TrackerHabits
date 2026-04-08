from uuid import UUID

from fastapi import Header

from app.config import settings


def get_user_id(x_user_id: UUID | None = Header(None, alias="X-User-Id")) -> UUID:
    if x_user_id is not None:
        return x_user_id
    return settings.default_user_id
