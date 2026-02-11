import aioboto3
from app.core.config import settings
from typing import BinaryIO, Optional
import structlog

logger = structlog.get_logger()


class StorageService:
    def __init__(self):
        self.session = aioboto3.Session()
        self.bucket = settings.S3_BUCKET
        self.endpoint = settings.S3_ENDPOINT
        self.access_key = settings.S3_ACCESS_KEY_ID
        self.secret_key = settings.S3_SECRET_ACCESS_KEY
        self.region = settings.S3_REGION
        self.sse = settings.S3_SSE

    async def upload_file(
        self,
        file_content: bytes,
        destination_path: str,
        content_type: str | None = None,
        metadata: dict | None = None,
    ) -> Optional[str]:
        """
        Uploads a file to S3/R2 and returns the path/key.
        """
        if not all([self.endpoint, self.access_key, self.secret_key]):
            logger.warning(
                "storage_not_configured",
                message="S3/R2 credentials missing, skipping upload.",
            )
            return None

        try:
            async with self.session.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
            ) as s3:
                await s3.put_object(
                    Bucket=self.bucket,
                    Key=destination_path,
                    Body=file_content,
                    ContentType=content_type or "application/octet-stream",
                    Metadata=metadata or {},
                    **({"ServerSideEncryption": self.sse} if self.sse else {}),
                )
                logger.info("file_uploaded", path=destination_path)
                return destination_path
        except Exception as e:
            logger.error("file_upload_failed", error=str(e), path=destination_path)
            return None

    async def get_file(self, path: str) -> Optional[bytes]:
        """
        Retrieves a file from S3/R2.
        """
        if not all([self.endpoint, self.access_key, self.secret_key]):
            return None

        try:
            async with self.session.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
            ) as s3:
                response = await s3.get_object(Bucket=self.bucket, Key=path)
                async with response["Body"] as stream:
                    return await stream.read()
        except Exception as e:
            logger.error("file_download_failed", error=str(e), path=path)
            return None
