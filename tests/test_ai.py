"""3대 AI 앙상블 분석 서비스 단위 테스트."""

import pytest
import pandas as pd
from datetime import datetime
from src.ai.base import AIProvider, InvestmentOpinion
from src.ai.consensus_service import MultiAIConsensusService
from src.models.stock import MarketType, StockSummary, TimeFrame


@pytest.fixture
def mock_summary():
    return StockSummary(
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
        per=14.5,
        pbr=1.2,
        dividend_yield=2.5,
        foreign_rate=53.2,
    )


@pytest.fixture
def mock_ohlcv_df():
    dates = pd.date_range("2026-01-01", periods=30, freq="D")
    df = pd.DataFrame(
        {
            "open": [70000 + i * 200 for i in range(30)],
            "high": [71000 + i * 200 for i in range(30)],
            "low": [69500 + i * 200 for i in range(30)],
            "close": [70500 + i * 200 for i in range(30)],
            "volume": [10000000 for _ in range(30)],
        },
        index=dates,
    )
    df["MA_5"] = df["close"].rolling(5).mean()
    df["MA_20"] = df["close"].rolling(20).mean()
    df["MA_60"] = df["close"].rolling(20).mean()
    df["MA_120"] = df["close"].rolling(20).mean()
    return df


def test_multi_ai_consensus_rule_based(mock_summary, mock_ohlcv_df):
    """3대 AI 합의 리포트 생성 검증 (API 키 미등록 시 룰베이스 폴백 검증)."""
    service = MultiAIConsensusService()
    report = service.run_consensus_analysis(mock_summary, mock_ohlcv_df, TimeFrame.DAY)

    assert report.symbol == "005930"
    assert report.stock_name == "삼성전자"
    assert isinstance(report.overall_opinion, InvestmentOpinion)
    assert 0 <= report.average_score <= 100
    assert report.gemini_result is not None
    assert report.gemini_result.provider == AIProvider.GEMINI
    assert report.openai_result is not None
    assert report.openai_result.provider == AIProvider.OPENAI
    assert report.claude_result is not None
    assert report.claude_result.provider == AIProvider.CLAUDE
    assert len(report.action_plan) > 0
