from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import uuid
import tiktoken
from openai import AsyncAzureOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models import Conversation, Message, Project
from app.services.retrieval import RetrievalPipeline


class ChatService:
    def __init__(self, db: AsyncSession, redis_client: Any | None = None):
        self.db = db
        self.retrieval = RetrievalPipeline(db, redis_client=redis_client)
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        self.client = AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        )

    async def generate_response(
        self,
        project_id: uuid.UUID,
        query: str,
        conversation_id: uuid.UUID | None,
    ) -> dict[str, Any]:
        conversation = await self._get_or_create_conversation(
            project_id, conversation_id
        )
        await self._store_message(
            conversation.id,
            "user",
            query,
            token_count=len(self.tokenizer.encode(query)),
        )

        history = await self._get_conversation_history(conversation.id, limit=5)
        retrieval = await self.retrieval.retrieve(
            project_id,
            query,
            conversation_history=history,
            query_id=conversation.id,
        )

        response_text, usage = await self._chat_completion(retrieval.context.full_text)
        await self._store_message(
            conversation.id,
            "assistant",
            response_text,
            metadata={"citations": retrieval.citations},
            token_count=self._completion_tokens(response_text, usage),
        )

        await self._update_usage(conversation, project_id, query, response_text, usage)

        return {
            "response": response_text,
            "citations": retrieval.citations,
            "conversation_id": str(conversation.id),
        }

    async def _get_or_create_conversation(
        self, project_id: uuid.UUID, conversation_id: uuid.UUID | None
    ) -> Conversation:
        if conversation_id:
            result = await self.db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.project_id == project_id,
                )
            )
            conversation = result.scalar_one_or_none()
            if conversation:
                return conversation
            raise ValueError("Conversation not found")

        conversation = Conversation(project_id=project_id)
        self.db.add(conversation)
        await self.db.flush()
        return conversation

    async def _store_message(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        metadata: dict | None = None,
        token_count: int | None = None,
    ) -> None:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            metadata_=metadata or {},
            token_count=token_count,
        )
        self.db.add(message)
        await self.db.flush()

    async def _get_conversation_history(
        self, conversation_id: uuid.UUID, limit: int
    ) -> list[dict[str, str]]:
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = list(reversed(result.scalars().all()))
        history: list[dict[str, str]] = []
        for message in messages:
            if message.content:
                history.append({"role": message.role, "content": message.content})
        return history

    async def _chat_completion(self, prompt: str) -> tuple[str, dict[str, Any] | None]:
        system_prompt = (
            "You are a helpful assistant. Use the provided documents to answer."
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]
        response = await self.client.chat.completions.create(
            model=settings.AZURE_DEPLOYMENT_NAME,
            messages=messages,
            temperature=0.2,
        )
        content = response.choices[0].message.content or ""
        usage = getattr(response, "usage", None)
        if usage:
            return content, {
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
            }
        return content, None

    def _completion_tokens(
        self, response_text: str, usage: dict[str, Any] | None
    ) -> int:
        if usage and isinstance(usage.get("completion_tokens"), int):
            return int(usage["completion_tokens"])
        return len(self.tokenizer.encode(response_text))

    async def _update_usage(
        self,
        conversation: Conversation,
        project_id: uuid.UUID,
        query: str,
        response_text: str,
        usage: dict[str, Any] | None,
    ) -> None:
        prompt_tokens = len(self.tokenizer.encode(query))
        completion_tokens = len(self.tokenizer.encode(response_text))
        total_tokens = prompt_tokens + completion_tokens

        if usage:
            prompt_tokens = int(usage.get("prompt_tokens", prompt_tokens))
            completion_tokens = int(usage.get("completion_tokens", completion_tokens))
            total_tokens = int(usage.get("total_tokens", total_tokens))

        conversation.token_usage = {
            **(conversation.token_usage or {}),
            "prompt_tokens": (conversation.token_usage or {}).get("prompt_tokens", 0)
            + prompt_tokens,
            "completion_tokens": (conversation.token_usage or {}).get(
                "completion_tokens", 0
            )
            + completion_tokens,
            "total_tokens": (conversation.token_usage or {}).get("total_tokens", 0)
            + total_tokens,
        }
        conversation.last_message_at = datetime.now(timezone.utc)
        conversation.message_count += 2

        result = await self.db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one()
        usage_data = project.usage or {}
        usage_data["requests"] = int(usage_data.get("requests", 0)) + 1
        usage_data["tokens_total"] = (
            int(usage_data.get("tokens_total", 0)) + total_tokens
        )
        usage_data["tokens_today"] = (
            int(usage_data.get("tokens_today", 0)) + total_tokens
        )
        project.usage = usage_data

        await self.db.commit()
