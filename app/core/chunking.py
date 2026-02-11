import tiktoken
import re
from typing import List, Optional
from markdownify import markdownify
from app.schemas.chunk import ProcessedChunk


class DocumentChunker:
    def __init__(self, chunk_size=384, overlap=58, strategy="semantic_first"):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.strategy = strategy

        # Load tokenizer (shared with LLM)
        self.tokenizer = tiktoken.get_encoding("cl100k_base")

        # Simple header detection for semantic splitting
        self.headers_to_split_on = [
            ("#", "heading_1"),
            ("##", "heading_2"),
            ("###", "heading_3"),
        ]

    def chunk_document(
        self, text: str, metadata: dict | None = None
    ) -> List[ProcessedChunk]:
        """
        Split document into chunks with metadata tracking
        """
        if metadata is None:
            metadata = {}

        chunks = []

        if self.strategy == "semantic_first":
            # Try semantic splitting first (convert to markdown if needed)
            if self._looks_like_html(text):
                try:
                    text = markdownify(text, heading_style="ATX")
                except Exception:
                    pass  # Fallback to raw text

            semantic_chunks = self._semantic_split(text)
            chunks.extend(semantic_chunks)
        else:
            # Fallback to token-based splitting
            chunks = self._token_based_split(text)

        # Apply token window constraints to ensure no chunk exceeds limit
        final_chunks = self._apply_token_limits(chunks)

        # Add metadata to each chunk
        processed_chunks = []
        for i, chunk_text in enumerate(final_chunks):
            chunk_meta = metadata.copy()
            chunk_meta.update(
                {
                    "chunk_index": i,
                    "total_chunks": len(final_chunks),
                    "token_count": len(self.tokenizer.encode(chunk_text)),
                    "char_count": len(chunk_text),
                    "section_title": self._extract_section_title(chunk_text),
                    "is_boilerplate": self._is_boilerplate(chunk_text),
                    "chunking_strategy": self.strategy,
                    "parent_chunk_id": chunk_meta.get("parent_chunk_id"),
                    "language": chunk_meta.get("language", "unknown"),
                    "has_code": self._has_code(chunk_text),
                    "has_tables": self._has_tables(chunk_text),
                    "confidence": chunk_meta.get("confidence", 1.0),
                }
            )
            processed_chunks.append(
                ProcessedChunk(text=chunk_text, metadata=chunk_meta)
            )

        return processed_chunks

    def _looks_like_html(self, text: str) -> bool:
        return bool(re.search(r"<html|<body|<div|<p>", text, re.IGNORECASE))

    def _semantic_split(self, text: str) -> List[str]:
        """
        Split by semantic boundaries (headers, paragraphs)
        """
        chunks = []
        current_chunk = ""
        current_tokens = 0

        lines = text.split("\n")

        for line in lines:
            line_tokens = len(self.tokenizer.encode(line))

            # Check if line is a header (semantic boundary)
            is_header = line.lstrip().startswith("#") and line.count("#") <= 3

            if is_header or (
                current_tokens + line_tokens > self.chunk_size and current_chunk
            ):
                # Save current chunk if not empty and significantly full or hitting a header
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())

                    # Start new chunk with overlap if not header-based strict split
                    # For simplicity, if we hit a size limit, we overlap.
                    # If we hit a header, we might want a clean break? Spec says overlap.
                    if self.overlap > 0 and len(current_chunk) > 100:  # heuristic
                        # Keep last N tokens for overlap
                        overlap_text = self._get_overlap_text(current_chunk)
                        current_chunk = overlap_text + "\n" + line
                        current_tokens = (
                            len(self.tokenizer.encode(overlap_text)) + line_tokens
                        )
                    else:
                        current_chunk = line
                        current_tokens = line_tokens
                else:
                    current_chunk = line
                    current_tokens = line_tokens
            else:
                current_chunk += "\n" + line
                current_tokens += line_tokens

        # Add final chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    def _token_based_split(self, text: str) -> List[str]:
        """
        Fallback: Split by token count logic
        """
        tokens = self.tokenizer.encode(text)
        chunks = []

        step = self.chunk_size - self.overlap
        if step <= 0:
            step = self.chunk_size  # Avoid infinite loop

        for i in range(0, len(tokens), step):
            chunk_tokens = tokens[i : i + self.chunk_size]
            chunk_text = self.tokenizer.decode(chunk_tokens)
            chunks.append(chunk_text)

        return chunks

    def _apply_token_limits(self, initial_chunks: List[str]) -> List[str]:
        """
        Re-split any chunks that are still too large
        """
        final_chunks = []
        for chunk in initial_chunks:
            tokens = self.tokenizer.encode(chunk)
            if len(tokens) > self.chunk_size:
                final_chunks.extend(self._token_based_split(chunk))
            else:
                final_chunks.append(chunk)
        return final_chunks

    def _get_overlap_text(self, text: str, target_tokens: int | None = None) -> str:
        target_tokens = target_tokens if target_tokens is not None else self.overlap

        tokens = self.tokenizer.encode(text)
        if len(tokens) <= target_tokens:
            return text

        overlap_tokens = tokens[-target_tokens:]
        overlap_text = self.tokenizer.decode(overlap_tokens)

        # Try to align to sentence boundary
        sentences = overlap_text.split(". ")
        if len(sentences) > 1:
            overlap_text = ". ".join(sentences[1:]) + "."

        return overlap_text

    def _extract_section_title(self, text: str) -> Optional[str]:
        lines = text.split("\n")
        for line in lines[:3]:  # Check first 3 lines
            if line.lstrip().startswith("#"):
                return line.lstrip("#").strip()
        return None

    def _is_boilerplate(self, text: str) -> bool:
        # Simple heuristic
        # If chunk is very short and contains common footer words
        if len(text) < 50:
            if any(
                x in text.lower() for x in ["copyright", "all rights reserved", "page"]
            ):
                return True
        return False

    def _has_code(self, text: str) -> bool:
        if "```" in text:
            return True
        for line in text.split("\n"):
            stripped = line.lstrip()
            if stripped.startswith("def ") or stripped.startswith("class "):
                return True
            if stripped.startswith("{") and stripped.endswith("}"):
                return True
        return False

    def _has_tables(self, text: str) -> bool:
        if "<table" in text.lower():
            return True
        lines = text.split("\n")
        for i in range(len(lines) - 1):
            if "|" in lines[i] and "|" in lines[i + 1] and "---" in lines[i + 1]:
                return True
        return False
