from unittest.mock import AsyncMock, patch

import pytest

from app.services.storage import StorageService


@pytest.mark.asyncio
async def test_storage_service_methods():
    # Mock settings
    with patch("app.services.storage.settings") as mock_settings:
        mock_settings.S3_BUCKET = "test-bucket"
        mock_settings.S3_ENDPOINT = "http://localhost:9000"
        mock_settings.S3_ACCESS_KEY_ID = "minioadmin"
        mock_settings.S3_SECRET_ACCESS_KEY = "minioadmin"
        mock_settings.S3_REGION = "us-east-1"
        mock_settings.S3_SSE = None

        service = StorageService()

        # Mock aioboto3 session and client
        with patch.object(service.session, "client") as mock_client_ctx:
            mock_s3 = AsyncMock()
            mock_client_ctx.return_value.__aenter__.return_value = mock_s3

            # Test Upload
            file_content = b"test content"
            path = await service.upload_file(file_content, "test.txt")
            assert path == "test.txt"
            mock_s3.put_object.assert_called_once()

            # Test Get
            mock_s3.get_object.return_value = {"Body": AsyncMock()}
            mock_s3.get_object.return_value[
                "Body"
            ].__aenter__.return_value.read.return_value = file_content

            content = await service.get_file("test.txt")
            assert content == file_content
            mock_s3.get_object.assert_called_once()

            # Test Delete
            result = await service.delete_file("test.txt")
            assert result is True
            mock_s3.delete_object.assert_called_once_with(
                Bucket="test-bucket", Key="test.txt"
            )
