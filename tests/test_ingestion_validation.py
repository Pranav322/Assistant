import pytest
from app.services.ingestion_validation import validate_file_content
from app.services.url_fetcher import validate_url
from app.core.config import settings


def test_validate_file_size_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_MB", 0)
    with pytest.raises(ValueError):
        validate_file_content(
            b"hello",
            filename="test.txt",
            file_type="text",
            content_type="text/plain",
        )


def test_validate_pdf_header() -> None:
    with pytest.raises(ValueError):
        validate_file_content(
            b"not-a-pdf",
            filename="test.pdf",
            file_type="pdf",
            content_type="application/pdf",
        )


@pytest.mark.asyncio
async def test_validate_url_blocks_localhost() -> None:
    with pytest.raises(ValueError):
        await validate_url("http://127.0.0.1")
