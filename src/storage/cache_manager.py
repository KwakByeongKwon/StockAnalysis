"""Apache Parquet 기반 주식 시계열 로컬 캐시 매니저.

고성능 압축 I/O 및 증분 업데이트(Incremental Update)를 지원하며,
KST 타임존 및 DatetimeIndex 정합성을 보장합니다.
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
import pandas as pd

from src.config import settings
from src.models.stock import TimeFrame

logger = logging.getLogger(__name__)


class ParquetCacheManager:
    """Parquet 포맷 기반의 시계열 캐시 관리자."""

    def __init__(self, cache_dir: Optional[Path] = None) -> None:
        """캐시 매니저를 초기화합니다.
        
        Args:
            cache_dir: 캐시 파일이 저장될 디렉토리 경로 (기본값: settings.cache_dir)
        """
        self.cache_dir = cache_dir or settings.cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_path(self, symbol: str, timeframe: TimeFrame = TimeFrame.DAY) -> Path:
        """종목코드 및 주기에 대응하는 캐시 파일 경로를 생성합니다.
        
        Args:
            symbol: 6자리 종목코드
            timeframe: 시계열 주기
            
        Returns:
            캐시 파일 Path 객체
        """
        clean_symbol = symbol.strip().zfill(6)
        return self.cache_dir / f"{clean_symbol}_{timeframe.value}.parquet"

    def has_cache(self, symbol: str, timeframe: TimeFrame = TimeFrame.DAY) -> bool:
        """해당 종목의 캐시 파일이 존재하는지 확인합니다."""
        return self._get_cache_path(symbol, timeframe).exists()

    def load_ohlcv(
        self,
        symbol: str,
        timeframe: TimeFrame = TimeFrame.DAY,
        start_date: Optional[str | datetime] = None,
        end_date: Optional[str | datetime] = None,
    ) -> Optional[pd.DataFrame]:
        """로컬 Parquet 캐시에서 OHLCV 데이터를 불러옵니다.

        Args:
            symbol: 종목코드
            timeframe: 시계열 주기
            start_date: 조회 시작일
            end_date: 조회 종료일

        Returns:
            DatetimeIndex를 가진 OHLCV DataFrame 또는 캐시가 없을 경우 None
        """
        cache_path = self._get_cache_path(symbol, timeframe)
        if not cache_path.exists():
            return None

        try:
            df = pd.read_parquet(cache_path, engine="pyarrow")
            if df.empty:
                return None

            # DatetimeIndex 정합성 보장
            if not isinstance(df.index, pd.DatetimeIndex):
                if "timestamp" in df.columns:
                    df["timestamp"] = pd.to_datetime(df["timestamp"])
                    df.set_index("timestamp", inplace=True)
                elif "date" in df.columns:
                    df["date"] = pd.to_datetime(df["date"])
                    df.set_index("date", inplace=True)

            df.sort_index(inplace=True)

            # 날짜 슬라이싱
            if start_date:
                start_ts = pd.to_datetime(start_date)
                if df.index.tz is not None and start_ts.tz is None:
                    start_ts = start_ts.tz_localize(df.index.tz)
                df = df[df.index >= start_ts]

            if end_date:
                end_ts = pd.to_datetime(end_date)
                if df.index.tz is not None and end_ts.tz is None:
                    end_ts = end_ts.tz_localize(df.index.tz)
                df = df[df.index <= end_ts]

            return df
        except Exception as e:
            logger.error(f"캐시 로드 실패 [{symbol}]: {e}", exc_info=True)
            return None

    def save_ohlcv(
        self,
        symbol: str,
        df: pd.DataFrame,
        timeframe: TimeFrame = TimeFrame.DAY,
        merge_existing: bool = True,
    ) -> bool:
        """OHLCV DataFrame을 Parquet 파일로 저장하거나 기존 캐시와 병합합니다.

        Args:
            symbol: 종목코드
            df: 저장할 OHLCV 데이터프레임
            timeframe: 시계열 주기
            merge_existing: 기존 캐시가 있을 경우 병합할지 여부

        Returns:
            저장 성공 여부
        """
        if df is None or df.empty:
            return False

        cache_path = self._get_cache_path(symbol, timeframe)

        try:
            save_df = df.copy()

            # 인덱스 검증 및 표준화
            if not isinstance(save_df.index, pd.DatetimeIndex):
                if "timestamp" in save_df.columns:
                    save_df["timestamp"] = pd.to_datetime(save_df["timestamp"])
                    save_df.set_index("timestamp", inplace=True)
                elif "date" in save_df.columns:
                    save_df["date"] = pd.to_datetime(save_df["date"])
                    save_df.set_index("date", inplace=True)

            save_df.index.name = "timestamp"

            # 기존 캐시와 병합
            if merge_existing and cache_path.exists():
                existing_df = self.load_ohlcv(symbol, timeframe)
                if existing_df is not None and not existing_df.empty:
                    # 중복 인덱스 처리: 최신 데이터 우선 병합
                    combined = pd.concat([existing_df, save_df])
                    combined = combined[~combined.index.duplicated(keep="last")]
                    save_df = combined.sort_index()

            # Parquet 압축 저장 (Snappy)
            save_df.to_parquet(
                cache_path,
                engine="pyarrow",
                compression="snappy",
                index=True,
            )
            return True
        except Exception as e:
            logger.error(f"캐시 저장 실패 [{symbol}]: {e}", exc_info=True)
            return False

    def get_cache_info(self, symbol: str, timeframe: TimeFrame = TimeFrame.DAY) -> Optional[dict]:
        """캐시 메타데이터(크기, 최근 수정시각, 데이터 기간)를 반환합니다."""
        cache_path = self._get_cache_path(symbol, timeframe)
        if not cache_path.exists():
            return None

        stat = cache_path.stat()
        df = self.load_ohlcv(symbol, timeframe)
        
        start_date = str(df.index.min().date()) if df is not None and not df.empty else None
        end_date = str(df.index.max().date()) if df is not None and not df.empty else None
        row_count = len(df) if df is not None else 0

        return {
            "file_size_bytes": stat.st_size,
            "file_size_kb": round(stat.st_size / 1024, 2),
            "last_modified": datetime.fromtimestamp(stat.st_mtime),
            "start_date": start_date,
            "end_date": end_date,
            "row_count": row_count,
        }

    def clear_cache(self, symbol: Optional[str] = None) -> int:
        """지정된 종목 또는 전체 캐시를 삭제합니다."""
        deleted_count = 0
        if symbol:
            clean_symbol = symbol.strip().zfill(6)
            for file in self.cache_dir.glob(f"{clean_symbol}_*.parquet"):
                file.unlink(missing_ok=True)
                deleted_count += 1
        else:
            for file in self.cache_dir.glob("*.parquet"):
                file.unlink(missing_ok=True)
                deleted_count += 1
        return deleted_count
