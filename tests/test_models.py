"""데이터 모델 단위 테스트."""

import pytest
from datetime import datetime
from src.models.stock import StockItem, StockSummary, MarketType, OHLCVBar


def test_stock_item_validation():
    """StockItem 종목코드 6자리 정규화 검증."""
    item = StockItem(symbol="5930", name="삼성전자", market=MarketType.KOSPI)
    assert item.symbol == "005930"
    assert item.name == "삼성전자"
    assert item.market == MarketType.KOSPI


def test_stock_summary_creation():
    """StockSummary 데이터 생성 및 유효성 검증."""
    summary = StockSummary(
        symbol="005930",
        name="삼성전자",
        market=MarketType.KOSPI,
        current_price=75000.0,
        change=1500.0,
        change_rate=2.04,
        open_price=74000.0,
        high_price=75500.0,
        low_price=73800.0,
        volume=15000000,
        per=15.2,
        pbr=1.3,
    )
    assert summary.current_price == 75000.0
    assert summary.change_rate == 2.04
    assert summary.per == 15.2
