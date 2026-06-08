from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    # Database — .env dosyasından okunur, default YOK (zorunlu)
    DATABASE_URL: str

    # Docker / PostgreSQL
    POSTGRES_USER: str = "hes_admin"
    POSTGRES_PASSWORD: str          # zorunlu, .env'den gelir
    POSTGRES_DB: str = "hes_management"

    # JWT — .env dosyasından okunur, default YOK (zorunlu)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "HES Auth Service"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()