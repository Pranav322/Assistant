from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RAG Core"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str
    REDIS_URL: str

    AZURE_OPENAI_API_KEY: str | None = None
    AZURE_OPENAI_ENDPOINT: str | None = None
    AZURE_OPENAI_API_VERSION: str = "2023-05-15"
    AZURE_EMBEDDING_DEPLOYMENT_NAME: str | None = None
    AZURE_EMBEDDING_API_KEY: str | None = None
    AZURE_EMBEDDING_ENDPOINT: str | None = None
    AZURE_EMBEDDING_API_VERSION: str | None = None

    S3_ENDPOINT: str | None = None
    S3_REGION: str = "auto"
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_BUCKET: str = "rag-core-files"
    S3_SSE: str | None = "AES256"

    MAX_FILE_SIZE_MB: int = 50
    MAX_PDF_PAGES: int = 1000
    URL_FETCH_TIMEOUT_SECONDS: int = 30
    URL_FETCH_MAX_REDIRECTS: int = 5


settings = Settings()
