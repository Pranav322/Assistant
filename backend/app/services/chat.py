from __future__ import annotations

import uuid
from typing import Any

import tiktoken
from fastapi import HTTPException
from openai import AsyncAzureOpenAI
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Conversation, Message, Project
from app.services.retrieval import RetrievalPipeline
from app.services.user_usage import increment_user_usage


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
        project: Project | None = None,
    ) -> dict[str, Any]:
        if project is None:
            project = await self._get_active_project(project_id)
        elif (
            project.id != project_id
            or not project.is_active
            or project.deleted_at is not None
        ):
            raise HTTPException(status_code=404, detail="Project not found or inactive")

        conversation = await self._get_or_create_conversation(
            project_id, conversation_id
        )
        query_tokens = len(self.tokenizer.encode(query))
        await self._store_message(
            conversation.id,
            "user",
            query,
            token_count=query_tokens,
        )

        history = await self._get_conversation_history(
            conversation.id, limit=20
        )  # Increase fetch limit for budgeting
        retrieval_config = self.retrieval.build_config(project)
        retrieval = await self.retrieval.retrieve(
            project_id,
            query,
            conversation_history=history,
            query_id=conversation.id,
            retrieval_config=retrieval_config,
        )

        response_text, usage = await self._chat_completion(
            project, retrieval.context.full_text, history
        )
        assistant_tokens = self._completion_tokens(response_text, usage)
        await self._store_message(
            conversation.id,
            "assistant",
            response_text,
            metadata={"citations": retrieval.citations},
            token_count=assistant_tokens,
        )

        await self._update_usage(
            conversation,
            project_id,
            prompt_tokens=query_tokens,
            completion_tokens=assistant_tokens,
            usage=usage,
        )

        return {
            "response": response_text,
            "citations": retrieval.citations,
            "conversation_id": str(conversation.id),
        }

    async def _get_active_project(self, project_id: uuid.UUID) -> Project:
        result = await self.db.execute(
            select(Project).where(
                and_(
                    Project.id == project_id,
                    Project.is_active == True,
                    Project.deleted_at.is_(None),
                )
            )
        )
        project = result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or inactive")
        return project

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
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = list(reversed(result.scalars().all()))
        history: list[dict[str, Any]] = []
        for message in messages:
            if message.content:
                history.append(
                    {
                        "role": message.role,
                        "content": message.content,
                        "token_count": message.token_count,
                    }
                )
        return history

    async def _chat_completion(
        self,
        project: Project,
        prompt: str,
        history: list[dict[str, Any]] | None = None,
    ) -> tuple[str, dict[str, Any] | None]:
        system_prompt = (
            project.settings.get("system_prompt") if project.settings else None
        ) or (
            "You are a helpful assistant. Answer questions using the provided documents. "
            "Each document is headed by its name in brackets, e.g. [Return_Policy.pdf]. "
            "When your answer draws from a document, cite it inline using that exact bracketed "
            "name (e.g. [Return_Policy.pdf], [FAQ]) — never a generic label like [Document 1]. "
            "If the documents don't contain enough information to answer, say so clearly."
        )

        messages = [{"role": "system", "content": system_prompt}]

        # Issue #1: Inject history with token budget
        if history:
            budget = settings.CHAT_HISTORY_TOKEN_BUDGET
            selected_history = []
            used_tokens = 0
            # History is returned newest-first from _get_conversation_history?
            # No, _get_conversation_history reverses it to chronological (oldest first).
            # Wait, line 117: messages = list(reversed(result.scalars().all())) -> Oldest First
            # So history is [Oldest, ..., Newest]

            # We want to keep recent messages, so iterate backwards
            for msg in reversed(history):
                content = msg.get("content") or ""
                token_count = msg.get("token_count")
                if not isinstance(token_count, int):
                    token_count = len(self.tokenizer.encode(content))
                if used_tokens + token_count > budget:
                    break
                selected_history.append({"role": msg.get("role"), "content": content})
                used_tokens += token_count

            # Restore chronological order
            messages.extend(reversed(selected_history))

        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=settings.AZURE_DEPLOYMENT_NAME,
            messages=messages,
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
        prompt_tokens: int,
        completion_tokens: int,
        usage: dict[str, Any] | None,
    ) -> None:
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
        # Issue #5: Race condition fix.
        # DB trigger handles message_count and last_message_at updates.
        # Removing manual increment.
        # conversation.last_message_at = datetime.now(timezone.utc)
        # conversation.message_count += 2

        # Issue #5 & Review Point 3: Race condition fix with locking
        result = await self.db.execute(
            select(Project).where(Project.id == project_id).with_for_update()
        )
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

        if project.owner_id:
            await increment_user_usage(
                self.db,
                project.owner_id,
                tokens=total_tokens,
                requests=1,
            )

        await self.db.commit()
        await self.db.refresh(conversation)  # Refresh to get trigger-updated counts
