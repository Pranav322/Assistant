import re
from typing import List, Optional

import tiktoken
from markdownify import markdownify

from app.rag_core.schemas_chunk import ProcessedChunk


class DocumentChunker:
    def __init__(self, chunk_size=384, overlap=58, strategy="semantic_first"):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.strategy = strategy
        self.tokenizer = tiktoken.get_encoding("cl100k_base")

    def chunk_document(
        self, text: str, metadata: dict | None = None
    ) -> List[ProcessedChunk]:
        metadata = metadata or {}
        if self.strategy == "semantic_first":
            if self._looks_like_html(text):
                try:
                    text = markdownify(text, heading_style="ATX")
                except Exception:
                    pass
            chunks = self._semantic_split(text)
        else:
            chunks = self._token_based_split(text)

        final_chunks = self._apply_token_limits(chunks)
        processed = []
        for i, chunk_text in enumerate(final_chunks):
            chunk_meta = metadata.copy()
            chunk_meta.update(
                {
                    "chunk_index": i,
                    "total_chunks": len(final_chunks),
                    "token_count": len(self.tokenizer.encode(chunk_text)),
                    "char_count": len(chunk_text),
                    "section_title": self._extract_section_title(chunk_text),
                    "chunking_strategy": self.strategy,
                }
            )
            processed.append(ProcessedChunk(text=chunk_text, metadata=chunk_meta))
        return processed

    def _looks_like_html(self, text: str) -> bool:
        return bool(re.search(r"<html|<body|<div|<p>", text, re.IGNORECASE))

    def _semantic_split(self, text: str) -> List[str]:
        chunks = []
        current_chunk = ""
        current_tokens = 0
        for line in text.split("\n"):
            line_tokens = len(self.tokenizer.encode(line))
            is_header = line.lstrip().startswith("#") and line.count("#") <= 3
            if is_header or (
                current_tokens + line_tokens > self.chunk_size and current_chunk
            ):
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = line
                current_tokens = line_tokens
            else:
                current_chunk += "\n" + line
                current_tokens += line_tokens

        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        return chunks

    def _token_based_split(self, text: str) -> List[str]:
        tokens = self.tokenizer.encode(text)
        chunks = []
        step = max(1, self.chunk_size - self.overlap)
        for i in range(0, len(tokens), step):
            chunks.append(self.tokenizer.decode(tokens[i : i + self.chunk_size]))
        return chunks

    def _apply_token_limits(self, initial_chunks: List[str]) -> List[str]:
        out = []
        for chunk in initial_chunks:
            if len(self.tokenizer.encode(chunk)) > self.chunk_size:
                out.extend(self._token_based_split(chunk))
            else:
                out.append(chunk)
        return out

    def _extract_section_title(self, text: str) -> Optional[str]:
        for line in text.split("\n")[:3]:
            if line.lstrip().startswith("#"):
                return line.lstrip("#").strip()
        return None
