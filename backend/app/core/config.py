"""
Configuration management for app_ef backend.
Uses pydantic-settings for environment-based configuration.
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App Configuration
    app_name: str = "app_ef"
    debug: bool = False
    environment: str = "local"  # local, development, staging, production

    # API Configuration
    api_v1_prefix: str = "/api/v1"
    allowed_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Storage Configuration
    storage_backend: str = "filesystem"  # filesystem, s3, gcs
    local_storage_path: str = "../data"
    s3_bucket: Optional[str] = None
    s3_region: Optional[str] = "us-east-1"
    gcs_bucket: Optional[str] = None

    # Database Configuration
    database_url: str = "sqlite:///./app_ef.db"
    database_pool_size: int = 5

    # Authentication Configuration
    enable_auth: bool = False
    jwt_secret_key: str = "development-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Task Queue Configuration
    redis_url: Optional[str] = None
    task_queue_enabled: bool = False

    # Monitoring & Logging
    enable_metrics: bool = False
    log_level: str = "INFO"

    # Application Limits
    max_upload_size_mb: int = 100
    max_sources_per_project: int = 10000
    max_concurrent_pipelines: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()
