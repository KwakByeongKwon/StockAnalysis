"""StockAnalysis 시스템 환경설정 모듈."""

from pathlib import Path
from zoneinfo import ZoneInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """애플리케이션 전역 설정."""

    app_name: str = "StockAnalysis"
    debug: bool = False
    
    # 기본 경로
    base_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = base_dir / "data"
    cache_dir: Path = base_dir / "data" / "cache"
    
    # 타임존 설정 (KST)
    timezone_str: str = "Asia/Seoul"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def timezone(self) -> ZoneInfo:
        """KST ZoneInfo 인스턴스 반환."""
        return ZoneInfo(self.timezone_str)


settings = Settings()

# 필요한 디렉토리 생성
settings.cache_dir.mkdir(parents=True, exist_ok=True)
