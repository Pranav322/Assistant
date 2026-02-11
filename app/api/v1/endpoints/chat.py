from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.api import deps
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import ChatService


router = APIRouter()


@router.post("/projects/{project_id}/chat", response_model=ChatResponse)
async def chat(
    project_id: uuid.UUID,
    payload: ChatRequest,
    db: AsyncSession = Depends(deps.get_db),
    auth: deps.AuthContext = Depends(deps.api_key_required("chat")),
):
    service = ChatService(db)
    conversation_id = (
        uuid.UUID(payload.conversation_id) if payload.conversation_id else None
    )
    try:
        result = await service.generate_response(
            project_id, payload.query, conversation_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ChatResponse(**result)
