import hashlib
import uuid
from typing import BinaryIO, Optional
from datetime import datetime
import pdfplumber
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Source, Chunk, Embedding, Project
from app.core.chunking import DocumentChunker
from app.services.embedding import EmbeddingService
from app.schemas.chunk import ProcessedChunk
import io

class IngestionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.chunker = DocumentChunker()
        self.embedder = EmbeddingService()

    async def process_file(self, 
                          file_content: bytes, 
                          filename: str, 
                          project_id: uuid.UUID, 
                          file_type: str = "pdf",
                          metadata: dict = None,
                          source_id: Optional[uuid.UUID] = None) -> Source:
        """
        Process a file: extract text, chunk, embed, and save.
        """
        if metadata is None:
            metadata = {}

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
                metadata_={**metadata, "filename": filename},
                status="processing"
            )
            self.db.add(source)
            await self.db.flush() # get ID
        else:
            # Load existing source
            result = await self.db.execute(select(Source).where(Source.id == source_id))
            source = result.scalar_one()
            source.status = "processing"
            await self.db.flush()

        try:
            # 4. Extract Text
            # ... (rest of the logic remains same, but we'll use 'source' object)
            text_content = ""
            if file_type == "pdf":
                text_content = self._extract_text_from_pdf(file_content)
            elif file_type in ["text", "markdown", "md", "txt"]:
                text_content = file_content.decode("utf-8")
            else:
                text_content = file_content.decode("utf-8", errors="ignore")

            if not text_content.strip():
                raise ValueError("Extracted text is empty")

            # 5. Chunking
            chunks: list[ProcessedChunk] = self.chunker.chunk_document(
                text_content, 
                metadata={"source_id": str(source.id)}
            )

            # 6. Embedding (Batch)
            texts_to_embed = [c.text for c in chunks]
            embeddings_list = await self.embedder.get_embeddings(texts_to_embed)

            # 7. Save Chunks and Embeddings
            for i, chunk_data in enumerate(chunks):
                chunk_record = Chunk(
                    project_id=project_id,
                    source_id=source.id,
                    text=chunk_data.text,
                    metadata_=chunk_data.metadata
                )
                self.db.add(chunk_record)
                await self.db.flush()

                if i < len(embeddings_list):
                    emb_record = Embedding(
                        chunk_id=chunk_record.id,
                        project_id=project_id,
                        embedding=embeddings_list[i],
                        model_name=self.embedder.deployment_name or "azure-openai"
                    )
                    self.db.add(emb_record)

            # 8. Update Source Status
            source.status = "completed"
            await self.db.commit()
            
            return source

        except Exception as e:
            await self.db.rollback()
            # Update status to failed
            result = await self.db.execute(select(Source).where(Source.id == source.id))
            fail_source = result.scalar_one()
            fail_source.status = "failed"
            # We could log the error in metadata
            meta = dict(fail_source.metadata_ or {})
            meta["error"] = str(e)
            fail_source.metadata_ = meta
            await self.db.commit()
            raise e

    async def get_source_by_hash(self, project_id: uuid.UUID, content_hash: str) -> Optional[Source]:
        result = await self.db.execute(
            select(Source).where(
                Source.project_id == project_id,
                Source.content_hash == content_hash
            )
        )
        return result.scalar_one_or_none()

    def _extract_text_from_pdf(self, file_content: bytes) -> str:
        text = ""
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text

    def _is_text_file(self, filename: str) -> bool:
        return filename.endswith(('.txt', '.md', '.json', '.csv', '.xml'))
