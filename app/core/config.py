from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RAG Chatbot Platform"
    ENVIRONMENT: str = "development"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # Security
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Azure OpenAI
    AZURE_OPENAI_API_KEY: str | None = None
    AZURE_OPENAI_ENDPOINT: str | None = None
    AZURE_OPENAI_API_VERSION: str = "2023-05-15"
    AZURE_DEPLOYMENT_NAME: str | None = None  # Model deployment name (e.g., 'gpt-4')
    AZURE_EMBEDDING_DEPLOYMENT_NAME: str | None = None  # Embedding deployment name
    AZURE_EMBEDDING_API_KEY: str | None = None
    AZURE_EMBEDDING_ENDPOINT: str | None = None
    AZURE_EMBEDDING_API_VERSION: str | None = None

    # Object Storage (S3-compatible)
    S3_ENDPOINT: str | None = None
    S3_REGION: str = "auto"
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_BUCKET: str = "chatbot-files"
    S3_PUBLIC_URL: str | None = None

    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
    RATE_LIMIT_TOKENS_PER_MINUTE: int = 100000


settings = Settings()
