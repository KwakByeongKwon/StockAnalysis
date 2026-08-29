"""Parquet 캐시 매니저 단위 테스트."""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from src.models.stock import TimeFrame
from src.storage.cache_manager import ParquetCacheManager


@pytest.fixture
def temp_cache_manager(tmp_path):
    return ParquetCacheManager(cache_dir=tmp_path)


def test_parquet_cache_save_and_load(temp_cache_manager):
    """Parquet 저장 및 불러오기 일치성 검증."""
    tz = ZoneInfo("Asia/Seoul")
    dates = [datetime(2026, 1, 1, tzinfo=tz) + timedelta(days=i) for i in range(10)]
    
    df = pd.DataFrame(
        {
            "open": [100.0 + i for i in range(10)],
            "high": [110.0 + i for i in range(10)],
            "low": [95.0 + i for i in range(10)],
            "close": [105.0 + i for i in range(10)],
            "volume": [1000 * (i + 1) for i in range(10)],
        },
        index=pd.DatetimeIndex(dates, name="timestamp"),
    )

    symbol = "005930"
    success = temp_cache_manager.save_ohlcv(symbol, df, TimeFrame.DAY)
    assert success is True
    assert temp_cache_manager.has_cache(symbol, TimeFrame.DAY)

    # 로드 및 비교
    loaded_df = temp_cache_manager.load_ohlcv(symbol, TimeFrame.DAY)
    assert loaded_df is not None
    assert len(loaded_df) == 10
    assert (loaded_df["close"] == df["close"]).all()


def test_parquet_incremental_update(temp_cache_manager):
    """기존 캐시와 신규 데이터의 증분 병합(Incremental Update) 검증."""
    tz = ZoneInfo("Asia/Seoul")
    dates_part1 = [datetime(2026, 1, 1, tzinfo=tz) + timedelta(days=i) for i in range(5)]
    df_part1 = pd.DataFrame(
        {
            "open": [100.0] * 5,
            "high": [110.0] * 5,
            "low": [90.0] * 5,
            "close": [105.0] * 5,
            "volume": [1000] * 5,
        },
        index=pd.DatetimeIndex(dates_part1, name="timestamp"),
    )

    symbol = "000660"
    temp_cache_manager.save_ohlcv(symbol, df_part1, TimeFrame.DAY)

    # 3일치 겹치고 3일치 새로운 데이터
    dates_part2 = [datetime(2026, 1, 3, tzinfo=tz) + timedelta(days=i) for i in range(6)]
    df_part2 = pd.DataFrame(
        {
            "open": [200.0] * 6,
            "high": [210.0] * 6,
            "low": [190.0] * 6,
            "close": [205.0] * 6,
            "volume": [2000] * 6,
        },
        index=pd.DatetimeIndex(dates_part2, name="timestamp"),
    )

    temp_cache_manager.save_ohlcv(symbol, df_part2, TimeFrame.DAY, merge_existing=True)

    loaded_df = temp_cache_manager.load_ohlcv(symbol, TimeFrame.DAY)
    assert loaded_df is not None
    # 1월 1일 ~ 1월 8일까지 총 8일이어야 함 (중복 제거)
    assert len(loaded_df) == 8
    # 1월 3일 이후는 최신 데이터(part2: 205.0)로 덮어씌워졌는지 확인
    assert loaded_df.loc[datetime(2026, 1, 4, tzinfo=tz), "close"] == 205.0
