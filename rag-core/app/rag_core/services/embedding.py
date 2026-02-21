from typing import List

from openai import AsyncAzureOpenAI

from app.core.config import settings


class EmbeddingService:
    def __init__(self):
        api_key = settings.AZURE_EMBEDDING_API_KEY or settings.AZURE_OPENAI_API_KEY
        api_version = (
            settings.AZURE_EMBEDDING_API_VERSION or settings.AZURE_OPENAI_API_VERSION
        )
        endpoint = settings.AZURE_EMBEDDING_ENDPOINT or settings.AZURE_OPENAI_ENDPOINT
        deployment_name = settings.AZURE_EMBEDDING_DEPLOYMENT_NAME
        if not api_key or not api_version or not endpoint or not deployment_name:
            raise ValueError("Azure embedding settings are not fully configured")

        self.client = AsyncAzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=endpoint,
        )
        self.deployment_name = deployment_name

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        all_embeddings = []
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = [t if t.strip() else " " for t in texts[i : i + batch_size]]
            response = await self.client.embeddings.create(
                input=batch,
                model=self.deployment_name,
            )
            all_embeddings.extend([data.embedding for data in response.data])
        return all_embeddings
