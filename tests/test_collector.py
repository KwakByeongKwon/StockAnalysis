"""데이터 수집기 단위 및 통합 테스트."""

import pytest
import pandas as pd
from src.data.collector import NaverFinanceCollector
from src.models.stock import MarketType, TimeFrame


@pytest.fixture
def collector():
    return NaverFinanceCollector()


def test_naver_get_stock_summary(collector):
    """삼성전자(005930) 실시간 시세 요약 수집 검증."""
    summary = collector.get_stock_summary("005930")
    assert summary.symbol == "005930"
    assert summary.name == "삼성전자"
    assert summary.market == MarketType.KOSPI
    assert summary.current_price > 0
    assert summary.open_price > 0
    assert summary.high_price >= summary.low_price
    assert summary.volume >= 0


def test_naver_get_ohlcv_integrity(collector):
    """OHLCV 시계열 데이터 무결성 및 타임존 검증."""
    df = collector.get_ohlcv("005930", timeframe=TimeFrame.DAY, count=100)
    
    assert isinstance(df, pd.DataFrame)
    assert not df.empty
    assert len(df) == 100
    
    # DatetimeIndex 및 타임존 검증
    assert isinstance(df.index, pd.DatetimeIndex)
    assert str(df.index.tz) == "Asia/Seoul"
    
    # 필수 컬럼 존재 여부
    for col in ["open", "high", "low", "close", "volume"]:
        assert col in df.columns
        
    # 가격 무결성: High >= Low, High >= Open, High >= Close
    assert (df["high"] >= df["low"]).all()
    assert (df["high"] >= df["open"]).all()
    assert (df["high"] >= df["close"]).all()
    assert (df["low"] <= df["open"]).all()
    assert (df["low"] <= df["close"]).all()


def test_naver_get_minute_ohlcv(collector):
    """분봉(1분, 5분) 수집 및 리샘플링 검증."""
    df_1m = collector.get_ohlcv("005930", timeframe=TimeFrame.MINUTE_1)
    assert isinstance(df_1m, pd.DataFrame)
    if not df_1m.empty:
        assert isinstance(df_1m.index, pd.DatetimeIndex)
        assert (df_1m["high"] >= df_1m["low"]).all()

    df_5m = collector.get_ohlcv("005930", timeframe=TimeFrame.MINUTE_5)
    assert isinstance(df_5m, pd.DataFrame)
    if not df_5m.empty:
        assert isinstance(df_5m.index, pd.DatetimeIndex)
        assert (df_5m["high"] >= df_5m["low"]).all()


def test_search_stocks(collector):
    """종목 검색 기능 검증."""
    results = collector.search_stocks("삼성")
    assert len(results) > 0
    assert any(item.symbol == "005930" for item in results)
