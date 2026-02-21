from typing import Optional

import aioboto3
from botocore.client import Config

from app.core.config import settings


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
        if not all([self.endpoint, self.access_key, self.secret_key]):
            return None

        async with self.session.client(
            "s3",
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            config=Config(signature_version="s3v4"),
        ) as s3:
            await s3.put_object(
                Bucket=self.bucket,
                Key=destination_path,
                Body=file_content,
                ContentType=content_type or "application/octet-stream",
                Metadata=metadata or {},
                **({"ServerSideEncryption": self.sse} if self.sse else {}),
            )
            return destination_path

    async def get_file(self, path: str) -> Optional[bytes]:
        if not all([self.endpoint, self.access_key, self.secret_key]):
            return None
        async with self.session.client(
            "s3",
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            config=Config(signature_version="s3v4"),
        ) as s3:
            response = await s3.get_object(Bucket=self.bucket, Key=path)
            async with response["Body"] as stream:
                return await stream.read()
