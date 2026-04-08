from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.security import decode_access_token

security = HTTPBearer(auto_error=False)


def get_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    x_user_id: UUID | None = Header(None, alias="X-User-Id"),
) -> UUID:
    if credentials and credentials.scheme.lower() == "bearer":
        return decode_access_token(credentials.credentials)
    if x_user_id is not None:
        return x_user_id
    if settings.allow_anonymous_default_user:
        return settings.default_user_id
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )
