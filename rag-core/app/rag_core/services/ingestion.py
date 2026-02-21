import asyncio
import hashlib
import io
import uuid
from typing import Optional

import pdfplumber
from markdownify import markdownify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Chunk, Embedding, Source
from app.rag_core.chunking import DocumentChunker
from app.rag_core.schemas_chunk import ProcessedChunk
from app.rag_core.services.embedding import EmbeddingService
from app.rag_core.services.ingestion_validation import validate_file_content


class IngestionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.chunker = DocumentChunker()
        self.embedder = EmbeddingService()

    async def process_file(
        self,
        file_content: bytes,
        filename: str,
        project_id: uuid.UUID,
        file_type: str = "pdf",
        metadata: dict | None = None,
        source_id: Optional[uuid.UUID] = None,
    ) -> Source:
        metadata = metadata or {}
        validation = validate_file_content(
            file_content,
            filename,
            file_type=file_type,
            content_type=metadata.get("content_type"),
        )

        content_hash = hashlib.sha256(file_content).hexdigest()
        if not source_id:
            existing = await self.get_source_by_hash(project_id, content_hash)
            if existing:
                return existing
            source = Source(
                project_id=project_id,
                type=file_type,
                content_hash=content_hash,
                metadata_={
                    **metadata,
                    "filename": filename,
                    "content_type": validation.mime_type,
                    "size_bytes": validation.size_bytes,
                    "page_count": validation.page_count,
                },
                status="processing",
            )
            self.db.add(source)
            await self.db.flush()
        else:
            result = await self.db.execute(
                select(Source).where(
                    Source.id == source_id,
                    Source.project_id == project_id,
                )
            )
            source = result.scalar_one()
            source.status = "processing"
            await self.db.flush()

        try:
            text_content = ""
            page_chunks: list[ProcessedChunk] = []
            if file_type == "pdf":
                pages = await asyncio.get_running_loop().run_in_executor(
                    None,
                    self._extract_pdf_pages_sync,
                    file_content,
                )
                for page_number, page_text in pages:
                    if not page_text.strip():
                        continue
                    page_chunks.extend(
                        self.chunker.chunk_document(
                            page_text,
                            metadata={
                                "source_id": str(source.id),
                                "page_number": page_number,
                            },
                        )
                    )
            else:
                content_type = metadata.get("content_type") or ""
                if content_type.startswith("text/html") or file_type == "url":
                    html_content = file_content.decode("utf-8", errors="ignore")
                    text_content = await asyncio.get_running_loop().run_in_executor(
                        None,
                        lambda h: markdownify(h, heading_style="ATX"),
                        html_content,
                    )
                else:
                    text_content = file_content.decode("utf-8", errors="ignore")

            if not page_chunks and not text_content.strip():
                raise ValueError("Extracted text is empty")

            chunks = page_chunks or self.chunker.chunk_document(
                text_content,
                metadata={"source_id": str(source.id)},
            )

            texts = [c.text for c in chunks]
            embeddings_list = await self.embedder.get_embeddings(texts)
            if len(embeddings_list) != len(chunks):
                raise ValueError("Embedding mismatch")

            chunk_records = []
            for idx, chunk_data in enumerate(chunks):
                chunk_record = Chunk(
                    project_id=project_id,
                    source_id=source.id,
                    text=chunk_data.text,
                    metadata_={**chunk_data.metadata, "chunk_index": idx},
                )
                chunk_records.append(chunk_record)

            self.db.add_all(chunk_records)
            await self.db.flush()

            embedding_records = []
            for i, chunk_record in enumerate(chunk_records):
                embedding_records.append(
                    Embedding(
                        chunk_id=chunk_record.id,
                        project_id=project_id,
                        embedding=embeddings_list[i],
                        model_name=self.embedder.deployment_name,
                    )
                )
            self.db.add_all(embedding_records)

            source.status = "completed"
            source.progress = {"stage": "completed", "percent": 100}
            await self.db.commit()
            return source
        except Exception as e:
            await self.db.rollback()
            result = await self.db.execute(
                select(Source).where(
                    Source.id == source.id,
                    Source.project_id == project_id,
                )
            )
            fail_source = result.scalar_one()
            fail_source.status = "failed"
            fail_source.metadata_ = {**(fail_source.metadata_ or {}), "error": str(e)}
            await self.db.commit()
            raise e

    async def get_source_by_hash(
        self,
        project_id: uuid.UUID,
        content_hash: str,
    ) -> Optional[Source]:
        result = await self.db.execute(
            select(Source).where(
                Source.project_id == project_id,
                Source.content_hash == content_hash,
            )
        )
        return result.scalar_one_or_none()

    def _extract_pdf_pages_sync(self, file_content: bytes) -> list[tuple[int, str]]:
        pages = []
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for index, page in enumerate(pdf.pages, start=1):
                pages.append((index, page.extract_text() or ""))
        return pages
