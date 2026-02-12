from dataclasses import dataclass
from typing import Optional
import io
import mimetypes
import pdfplumber
from app.core.config import settings


@dataclass
class FileValidationResult:
    file_type: str
    mime_type: str
    size_bytes: int
    page_count: Optional[int]


def derive_file_type(filename: str, content_type: str | None) -> str:
    extension = filename.split(".")[-1].lower() if "." in filename else ""
    if extension in {"md", "markdown"}:
        return "markdown"
    if extension == "pdf" or (content_type and "pdf" in content_type):
        return "pdf"
    return "text"


def detect_mime_type(filename: str, content_type: str | None) -> str:
    if content_type:
        return content_type
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def validate_file_content(
    content: bytes,
    filename: str,
    file_type: str,
    content_type: str | None,
) -> FileValidationResult:
    size_bytes = len(content)
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if size_bytes > max_bytes:
        raise ValueError("File exceeds maximum size")

    mime_type = detect_mime_type(filename, content_type)

    if file_type == "pdf":
        page_count = _validate_pdf_content(content)
    elif file_type in {"text", "markdown", "url"}:
        if not _is_probably_text(content):
            raise ValueError("Unsupported file content")
        page_count = None
    else:
        raise ValueError("Unsupported file type")

    return FileValidationResult(
        file_type=file_type,
        mime_type=mime_type,
        size_bytes=size_bytes,
        page_count=page_count,
    )


def _validate_pdf_content(content: bytes) -> int:
    if not content.startswith(b"%PDF-"):
        raise ValueError("Not a valid PDF")

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        page_count = len(pdf.pages)
        if page_count > settings.MAX_PDF_PAGES:
            raise ValueError("PDF exceeds maximum page count")
        if b"/JavaScript" in content:
            raise ValueError("PDF contains JavaScript")

    return page_count


def _is_probably_text(content: bytes) -> bool:
    if b"\x00" in content:
        return False

    sample = content[:4096]
    if not sample:
        return False

    printable = 0
    for byte in sample:
        if 32 <= byte <= 126 or byte in (9, 10, 13):
            printable += 1

    ratio = printable / len(sample)
    return ratio >= 0.9
