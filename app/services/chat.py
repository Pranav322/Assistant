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
from app.services.embedding import EmbeddingService
from app.services.retrieval import (
    VectorSearch,
    KeywordSearch,
    ReciprocalRankFusion,
    ContextAssembler,
    generate_citations,
)


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedder = EmbeddingService()
        self.vector_search = VectorSearch(db)
        self.keyword_search = KeywordSearch(db)
        self.rrf = ReciprocalRankFusion()
        self.context_assembler = ContextAssembler()
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

        embedding = await self._embed_query(query)
        vector_results = await self.vector_search.search(embedding, project_id)
        keyword_terms = self._extract_key_terms(query)
        keyword_results = await self.keyword_search.search(keyword_terms, project_id)
        fused_results = self.rrf.fuse(vector_results, keyword_results)

        assembled = self.context_assembler.assemble(query, fused_results, max_chunks=10)
        citations = generate_citations(assembled.selected_chunks)

        response_text, usage = await self._chat_completion(assembled.full_text)
        await self._store_message(
            conversation.id,
            "assistant",
            response_text,
            metadata={"citations": citations},
            token_count=self._completion_tokens(response_text, usage),
        )

        await self._update_usage(conversation, project_id, query, response_text, usage)

        return {
            "response": response_text,
            "citations": citations,
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

    async def _embed_query(self, query: str) -> list[float]:
        embeddings = await self.embedder.get_embeddings([query])
        return embeddings[0]

    def _extract_key_terms(self, query: str) -> list[str]:
        stop_words = {
            "what",
            "how",
            "why",
            "the",
            "a",
            "an",
            "is",
            "are",
            "can",
            "do",
        }
        words = [word.strip().lower() for word in query.split()]
        filtered = [word for word in words if word not in stop_words and len(word) > 2]
        return filtered[:10]

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
