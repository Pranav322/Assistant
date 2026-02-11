from pydantic import BaseModel, HttpUrl


class UrlIngestRequest(BaseModel):
    url: HttpUrl
