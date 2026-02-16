from typing import List

import structlog
from openai import AsyncAzureOpenAI

from app.core.config import settings

logger = structlog.get_logger()


class EmbeddingService:
    def __init__(self):
        api_key = settings.AZURE_EMBEDDING_API_KEY or settings.AZURE_OPENAI_API_KEY
        api_version = (
            settings.AZURE_EMBEDDING_API_VERSION or settings.AZURE_OPENAI_API_VERSION
        )
        endpoint = settings.AZURE_EMBEDDING_ENDPOINT or settings.AZURE_OPENAI_ENDPOINT
        deployment_name = settings.AZURE_EMBEDDING_DEPLOYMENT_NAME
        if not api_key:
            raise ValueError("Azure embedding API key is not configured")
        if not api_version:
            raise ValueError("Azure embedding API version is not configured")
        if not endpoint:
            raise ValueError("Azure embedding endpoint is not configured")
        if not deployment_name:
            raise ValueError("Azure embedding deployment name is not configured")
        self.client = AsyncAzureOpenAI(
            api_key=api_key, api_version=api_version, azure_endpoint=endpoint
        )
        self.deployment_name = deployment_name

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Get embeddings for a list of texts using Azure OpenAI.
        """
        try:
            # Azure limits batch size (usually 2048 texts, but keeping it safe at 100 or less)
            # Batches handled by caller or simple chunk here
            batch_size = 100
            all_embeddings = []

            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]
                # Filter out empty strings which cause errors
                valid_batch = [t if t.strip() else " " for t in batch]

                response = await self.client.embeddings.create(
                    input=valid_batch, model=self.deployment_name
                )

                # Extract embeddings in order
                batch_embeddings = [data.embedding for data in response.data]
                all_embeddings.extend(batch_embeddings)

            return all_embeddings

        except Exception as e:
            logger.error("embedding_generation_failed", error=str(e))
            raise e
