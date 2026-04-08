"""Личные сообщения между друзьями."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_user_id
from app.models import Message
from app.routers.friends import _are_friends

router = APIRouter()


class MessageCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    to_user_id: UUID = Field(..., alias="toUserId")
    body: str = Field(..., min_length=1, max_length=4000)


def _serialize_message(m: Message) -> dict:
    return {
        "id": m.id,
        "fromUserId": str(m.from_user_id),
        "toUserId": str(m.to_user_id),
        "body": m.body,
        "createdAt": m.created_at.isoformat() if m.created_at else "",
    }


@router.get("/messages")
def list_messages(
    friend_id: UUID = Query(..., alias="friendId"),
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    if not _are_friends(db, user_id, friend_id):
        raise HTTPException(403, detail="Можно читать переписку только с друзьями")
    rows = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.from_user_id == user_id, Message.to_user_id == friend_id),
                and_(Message.from_user_id == friend_id, Message.to_user_id == user_id),
            )
        )
        .order_by(Message.created_at.asc())
        .limit(500)
        .all()
    )
    return [_serialize_message(m) for m in rows]


@router.post("/messages")
def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_user_id),
):
    if data.to_user_id == user_id:
        raise HTTPException(400, detail="Нельзя написать себе")
    if not _are_friends(db, user_id, data.to_user_id):
        raise HTTPException(403, detail="Можно писать только друзьям")
    text = data.body.strip()
    if not text:
        raise HTTPException(400, detail="Пустое сообщение")
    m = Message(from_user_id=user_id, to_user_id=data.to_user_id, body=text)
    db.add(m)
    db.commit()
    db.refresh(m)
    return _serialize_message(m)
