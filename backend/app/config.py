from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # n8n Cloud Webhooks (production URLs)
    N8N_BASE_URL: str = "https://surya-pratap-singh1.app.n8n.cloud"
    N8N_WEBHOOK_SYNC: str = "/webhook/drive-sync-tarush"
    N8N_WEBHOOK_MATCH: str = "/webhook/match-candidates"

    # MongoDB
    MONGODB_URI: str = "mongodb+srv://getdeveloper_user:surya123@cluster0.7e2cqzx.mongodb.net/?appName=Cluster0"

    # App
    FRONTEND_URL: str = "*"
    PORT: int = 8000

    @property
    def n8n_sync_url(self) -> str:
        return f"{self.N8N_BASE_URL}{self.N8N_WEBHOOK_SYNC}"

    @property
    def n8n_match_url(self) -> str:
        return f"{self.N8N_BASE_URL}{self.N8N_WEBHOOK_MATCH}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()