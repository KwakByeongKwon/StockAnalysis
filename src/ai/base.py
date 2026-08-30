"""AI 모델 연동 공통 인터페이스 및 데이터 스키마 모듈.

Google Gemini, OpenAI ChatGPT, Anthropic Claude 3개 AI의
분석 결과 스키마 및 공통 추상 클래스를 정의합니다.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional
import pandas as pd
from pydantic import BaseModel, Field

from src.models.stock import StockSummary, TimeFrame


class AIProvider(str, Enum):
    """지원 AI 프로바이더."""

    GEMINI = "Google Gemini"
    OPENAI = "OpenAI ChatGPT"
    CLAUDE = "Anthropic Claude"


class InvestmentOpinion(str, Enum):
    """AI 투자 의견 등급."""

    STRONG_BUY = "적극매수"
    BUY = "매수"
    HOLD = "관망/중립"
    REDUCE = "비중축소"
    STRONG_SELL = "적극매도"


class AIAnalysisResult(BaseModel):
    """단일 AI 분석 결과 스키마."""

    provider: AIProvider = Field(..., description="분석을 수행한 AI")
    model_name: str = Field(..., description="사용된 모델명 (예: gemini-2.0-flash, gpt-4o, claude-3-5-sonnet)")
    opinion: InvestmentOpinion = Field(..., description="투자 의견")
    score: int = Field(..., ge=0, le=100, description="투자 매력도 점수 (0~100점)")
    summary: str = Field(..., description="핵심 1줄 진단")
    key_points: List[str] = Field(default_factory=list, description="주요 긍정/상승 근거")
    risk_factors: List[str] = Field(default_factory=list, description="리스크 및 주의 요인")
    detailed_report: str = Field(..., description="상세 분석 리포트 본문")
    created_at: datetime = Field(default_factory=datetime.now, description="분석 시각")


class ConsensusReport(BaseModel):
    """3대 AI 앙상블 종합 분석 합의(Consensus) 리포트."""

    symbol: str
    stock_name: str
    overall_opinion: InvestmentOpinion
    average_score: float
    consensus_summary: str
    gemini_result: Optional[AIAnalysisResult] = None
    openai_result: Optional[AIAnalysisResult] = None
    claude_result: Optional[AIAnalysisResult] = None
    action_plan: List[str] = Field(default_factory=list, description="투자자 대응 가이드라인")
    created_at: datetime = Field(default_factory=datetime.now)


class BaseLLMClient(ABC):
    """AI 클라이언트 추상 베이스 클래스."""

    @abstractmethod
    def analyze_stock(
        self,
        summary: StockSummary,
        ohlcv_df: pd.DataFrame,
        timeframe: TimeFrame = TimeFrame.DAY,
    ) -> AIAnalysisResult:
        """종목 시세 및 시계열 데이터를 분석하여 리포트를 생성합니다."""
        pass
