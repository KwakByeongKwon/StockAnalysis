"""StockAnalysis 데이터 모델 모듈.

국내 주식 시장 종목 정보, 시세 요약, OHLCV 시계열 데이터 스키마를 정의합니다.
Pydantic v2 기반으로 런타임 데이터 유효성을 엄격히 검증합니다.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class MarketType(str, Enum):
    """주식 시장 구분."""

    KOSPI = "KOSPI"
    KOSDAQ = "KOSDAQ"
    KONEX = "KONEX"
    UNKNOWN = "UNKNOWN"


class TimeFrame(str, Enum):
    """시계열 봉 기준 주기 구분."""

    MINUTE_1 = "1m"
    MINUTE_3 = "3m"
    MINUTE_5 = "5m"
    MINUTE_10 = "10m"
    MINUTE_30 = "30m"
    MINUTE_60 = "60m"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class StockItem(BaseModel):
    """기본 종목 정보."""

    symbol: str = Field(..., description="6자리 종목코드 (예: 005930)")
    name: str = Field(..., description="종목명 (예: 삼성전자)")
    market: MarketType = Field(default=MarketType.UNKNOWN, description="소속 시장")

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        """종목코드가 6자리 문자열인지 검증 및 포맷팅."""
        clean_v = v.strip().zfill(6)
        return clean_v


class StockSummary(BaseModel):
    """종목 현재 시세 및 주요 재무 팩터 요약."""

    symbol: str = Field(..., description="종목코드")
    name: str = Field(..., description="종목명")
    market: MarketType = Field(default=MarketType.UNKNOWN, description="소속 시장")
    
    # 시세 정보
    current_price: float = Field(..., description="현재가")
    change: float = Field(default=0.0, description="전일대비 변동금액")
    change_rate: float = Field(default=0.0, description="전일대비 등락률(%)")
    open_price: float = Field(..., description="시가")
    high_price: float = Field(..., description="고가")
    low_price: float = Field(..., description="저가")
    volume: int = Field(..., description="당일 거래량")
    trading_value: Optional[float] = Field(default=None, description="거래대금(원)")
    
    # 52주 가격
    high_52w: Optional[float] = Field(default=None, description="52주 최고가")
    low_52w: Optional[float] = Field(default=None, description="52주 최저가")
    
    # 밸류에이션 및 재무 지표
    market_cap: Optional[float] = Field(default=None, description="시가총액(원)")
    market_cap_rank: Optional[int] = Field(default=None, description="시가총액 순위")
    per: Optional[float] = Field(default=None, description="주가수익비율(PER)")
    eps: Optional[float] = Field(default=None, description="주당순이익(EPS)")
    pbr: Optional[float] = Field(default=None, description="주가순자산비율(PBR)")
    bps: Optional[float] = Field(default=None, description="주당순자산(BPS)")
    dividend_yield: Optional[float] = Field(default=None, description="배당수익률(%)")
    foreign_rate: Optional[float] = Field(default=None, description="외국인 소진율(%)")
    
    updated_at: datetime = Field(default_factory=datetime.now, description="데이터 조회 시각")


class OHLCVBar(BaseModel):
    """단일 시계열 OHLCV 캔들 바 모델."""

    timestamp: datetime = Field(..., description="시계열 기준 일시 (KST)")
    open: float = Field(..., description="시가")
    high: float = Field(..., description="고가")
    low: float = Field(..., description="저가")
    close: float = Field(..., description="종가")
    volume: int = Field(..., description="거래량")
    adjusted_close: Optional[float] = Field(default=None, description="수정종가")
