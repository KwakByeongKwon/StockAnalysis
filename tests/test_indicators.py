"""퀀트 보조지표(RSI, MACD, Bollinger Bands, MA) 단위 테스트."""

import numpy as np
import pandas as pd
import pytest

from src.analysis.indicators import (
    compute_moving_averages,
    compute_bollinger_bands,
    compute_rsi,
    compute_macd,
    compute_all_indicators,
)


@pytest.fixture
def sample_ohlcv():
    """100개의 인위적인 가격 시계열 데이터 생성."""
    np.random.seed(42)
    dates = pd.date_range("2025-01-01", periods=100, freq="B")
    close = 10000 + np.cumsum(np.random.randn(100) * 100)
    high = close + np.random.rand(100) * 50
    low = close - np.random.rand(100) * 50
    open_p = close + np.random.randn(100) * 20
    vol = np.random.randint(10000, 50000, size=100)

    df = pd.DataFrame({
        "open": open_p,
        "high": high,
        "low": low,
        "close": close,
        "volume": vol,
    }, index=dates)
    return df


def test_moving_averages(sample_ohlcv):
    df = compute_moving_averages(sample_ohlcv, [5, 20])
    assert "MA_5" in df.columns
    assert "MA_20" in df.columns
    assert "V_MA_5" in df.columns
    assert pd.notna(df["MA_5"].iloc[5])


def test_bollinger_bands(sample_ohlcv):
    df = compute_bollinger_bands(sample_ohlcv, period=20, num_std=2.0)
    assert "BB_upper" in df.columns
    assert "BB_lower" in df.columns
    assert "BB_middle" in df.columns
    # 상단 > 중심 > 하단 검증
    valid_mask = pd.notna(df["BB_upper"])
    assert (df.loc[valid_mask, "BB_upper"] >= df.loc[valid_mask, "BB_middle"]).all()
    assert (df.loc[valid_mask, "BB_middle"] >= df.loc[valid_mask, "BB_lower"]).all()


def test_rsi(sample_ohlcv):
    rsi = compute_rsi(sample_ohlcv, period=14)
    assert isinstance(rsi, pd.Series)
    assert (rsi >= 0).all() and (rsi <= 100).all()


def test_macd(sample_ohlcv):
    macd_df = compute_macd(sample_ohlcv)
    assert "MACD" in macd_df.columns
    assert "MACD_signal" in macd_df.columns
    assert "MACD_hist" in macd_df.columns


def test_compute_all_indicators(sample_ohlcv):
    df = compute_all_indicators(sample_ohlcv)
    expected_cols = ["MA_5", "MA_20", "BB_upper", "BB_lower", "RSI", "MACD", "MACD_signal", "MACD_hist"]
    for col in expected_cols:
        assert col in df.columns
