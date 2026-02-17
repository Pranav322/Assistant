import asyncio
import hashlib
import io
import uuid
from typing import Optional

import pdfplumber
from markdownify import markdownify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.chunking import DocumentChunker
from app.models import Chunk, Embedding, Source
from app.schemas.chunk import ProcessedChunk
from app.services.embedding import EmbeddingService
from app.services.ingestion_validation import validate_file_content


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
        """
        Process a file: extract text, chunk, embed, and save.
        """
        metadata = metadata or {}
        validation = validate_file_content(
            file_content,
            filename,
            file_type=file_type,
            content_type=metadata.get("content_type"),
        )

        # 1. Compute Content Hash
        content_hash = hashlib.sha256(file_content).hexdigest()

        # 2. Check for existing source (if source_id not provided)
        if not source_id:
            existing_source = await self.get_source_by_hash(project_id, content_hash)
            if existing_source:
                return existing_source

            # 3. Create Source record
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
            await self.db.flush()  # get ID
        else:
            # Load existing source
            result = await self.db.execute(
                select(Source).where(
                    Source.id == source_id, Source.project_id == project_id
                )
            )
            source = result.scalar_one()
            source.status = "processing"
            source.metadata_ = {
                **(source.metadata_ or {}),
                "content_type": validation.mime_type,
                "size_bytes": validation.size_bytes,
                "page_count": validation.page_count,
            }
            await self.db.flush()

        try:
            # 4. Extract Text
            # ... (rest of the logic remains same, but we'll use 'source' object)
            text_content = ""
            page_chunks: list[ProcessedChunk] = []
            if file_type == "pdf":
                loop = asyncio.get_running_loop()
                pages = await loop.run_in_executor(
                    None, self._extract_pdf_pages_sync, file_content
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
                                "confidence": 1.0,
                            },
                        )
                    )
            else:
                content_type = metadata.get("content_type") or ""
                if content_type.startswith("text/html") or file_type == "url":
                    loop = asyncio.get_running_loop()
                    html_content = file_content.decode("utf-8", errors="ignore")
                    text_content = await loop.run_in_executor(
                        None,
                        lambda h: markdownify(h, heading_style="ATX"),
                        html_content,
                    )
                else:
                    text_content = file_content.decode("utf-8", errors="ignore")

            if not page_chunks and not text_content.strip():
                raise ValueError("Extracted text is empty")

            # 5. Chunking
            if not page_chunks:
                page_chunks = self.chunker.chunk_document(
                    text_content,
                    metadata={
                        "source_id": str(source.id),
                        "confidence": 1.0,
                    },
                )

            chunks: list[ProcessedChunk] = page_chunks
            for idx, chunk in enumerate(chunks):
                chunk.metadata["chunk_index"] = idx
                chunk.metadata["total_chunks"] = len(chunks)
                chunk.metadata["chunking_strategy"] = self.chunker.strategy
                chunk.metadata["embedding_model"] = (
                    self.embedder.deployment_name or "text-embedding-3-small"
                )
                chunk.metadata["embedding_version"] = "v1.0"

            # 6. Embedding (Batch)
            texts_to_embed = [c.text for c in chunks]
            embeddings_list = await self.embedder.get_embeddings(texts_to_embed)

            # Issue #6: Verify embedding count matches chunk count
            if len(embeddings_list) != len(chunks):
                raise ValueError(
                    f"Embedding mismatch: {len(chunks)} chunks but {len(embeddings_list)} embeddings returned"
                )

            # 7. Save Chunks and Embeddings (Bulk Insert)
            chunk_records = []
            for idx, chunk_data in enumerate(chunks):
                chunk_record = Chunk(
                    project_id=project_id,
                    source_id=source.id,
                    text=chunk_data.text,
                    metadata_=chunk_data.metadata,
                )
                chunk_records.append(chunk_record)

            if chunk_records:
                self.db.add_all(chunk_records)
                await self.db.flush()  # Generate IDs

                embedding_records = []
                for i, chunk_record in enumerate(chunk_records):
                    if i < len(embeddings_list):
                        emb_record = Embedding(
                            chunk_id=chunk_record.id,
                            project_id=project_id,
                            embedding=embeddings_list[i],
                            model_name=self.embedder.deployment_name or "azure-openai",
                        )
                        embedding_records.append(emb_record)

                if embedding_records:
                    self.db.add_all(embedding_records)

            # 8. Update Source Status
            source.status = "completed"
            await self.db.commit()

            return source

        except Exception as e:
            await self.db.rollback()
            # Update status to failed
            result = await self.db.execute(
                select(Source).where(
                    Source.id == source.id, Source.project_id == project_id
                )
            )
            fail_source = result.scalar_one()
            fail_source.status = "failed"
            # We could log the error in metadata
            meta = dict(fail_source.metadata_ or {})
            meta["error"] = str(e)
            fail_source.metadata_ = meta
            await self.db.commit()
            raise e

    async def get_source_by_hash(
        self, project_id: uuid.UUID, content_hash: str
    ) -> Optional[Source]:
        result = await self.db.execute(
            select(Source).where(
                Source.project_id == project_id, Source.content_hash == content_hash
            )
        )
        return result.scalar_one_or_none()

    def _extract_pdf_pages_sync(self, file_content: bytes) -> list[tuple[int, str]]:
        pages: list[tuple[int, str]] = []
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for index, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ""
                pages.append((index, page_text))
        return pages

    def _is_text_file(self, filename: str) -> bool:
        return filename.endswith((".txt", ".md", ".json", ".csv", ".xml"))
