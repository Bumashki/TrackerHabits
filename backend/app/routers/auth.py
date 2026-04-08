from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.nickname_utils import is_valid_nickname_normalized, normalize_nickname
from app.security import create_access_token, hash_password, verify_password

router = APIRouter()


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    nickname: str = Field(min_length=3, max_length=32, description="Уникальный ник: латиница, цифры, _")


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str
    initials: str | None
    nickname: str | None = None


def _user_payload(u: User) -> dict:
    return {
        "user_id": str(u.id),
        "email": u.email,
        "name": u.name,
        "initials": u.initials or (u.name[:2] if u.name else ""),
        "nickname": u.nickname,
    }


@router.post("/auth/register", response_model=TokenOut)
def register(data: RegisterBody, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email.lower().strip()).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    nick = normalize_nickname(data.nickname)
    if not is_valid_nickname_normalized(nick):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Nickname: 3–32 символа, латиница, цифры и подчёркивание",
        )
    if db.query(User).filter(User.nickname == nick).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Nickname already taken")
    initials = (data.name.strip()[:2] if data.name else "") or data.email[:2].upper()
    u = User(
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        name=data.name.strip(),
        nickname=nick,
        initials=initials,
        joined_at=date.today(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    token = create_access_token(u.id)
    return TokenOut(access_token=token, **_user_payload(u))


@router.post("/auth/login", response_model=TokenOut)
def login(data: LoginBody, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    u = db.query(User).filter(User.email == email).first()
    if not u or not verify_password(data.password, u.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Wrong email or password")
    token = create_access_token(u.id)
    return TokenOut(access_token=token, **_user_payload(u))
