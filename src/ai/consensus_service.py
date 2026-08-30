"""3대 AI(Gemini, ChatGPT, Claude) 오케스트레이터 및 합의(Consensus) 서비스 모듈."""

import logging
from typing import Optional
import pandas as pd

from src.ai.base import (
    AIAnalysisResult,
    AIProvider,
    ConsensusReport,
    InvestmentOpinion,
)
from src.ai.claude_client import ClaudeStockClient
from src.ai.gemini_client import GeminiStockClient
from src.ai.openai_client import OpenAIStockClient
from src.models.stock import StockSummary, TimeFrame

logger = logging.getLogger(__name__)


class MultiAIConsensusService:
    """3대 AI 앙상블 종합 분석 서비스."""

    def __init__(
        self,
        gemini_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        claude_api_key: Optional[str] = None,
    ) -> None:
        self.gemini_client = GeminiStockClient(api_key=gemini_api_key)
        self.openai_client = OpenAIStockClient(api_key=openai_api_key)
        self.claude_client = ClaudeStockClient(api_key=claude_api_key)

    def analyze_single(
        self,
        provider: AIProvider,
        summary: StockSummary,
        ohlcv_df: pd.DataFrame,
        timeframe: TimeFrame = TimeFrame.DAY,
    ) -> AIAnalysisResult:
        """선택한 단일 AI로 분석을 수행합니다."""
        if provider == AIProvider.GEMINI:
            return self.gemini_client.analyze_stock(summary, ohlcv_df, timeframe)
        elif provider == AIProvider.OPENAI:
            return self.openai_client.analyze_stock(summary, ohlcv_df, timeframe)
        else:
            return self.claude_client.analyze_stock(summary, ohlcv_df, timeframe)

    def run_consensus_analysis(
        self,
        summary: StockSummary,
        ohlcv_df: pd.DataFrame,
        timeframe: TimeFrame = TimeFrame.DAY,
    ) -> ConsensusReport:
        """Gemini, ChatGPT, Claude 3개 AI의 동시 분석을 종합하여 합의 리포트를 생성합니다."""
        # 1. 각 AI별 전문 영역 분석 실행
        gemini_res = self.gemini_client.analyze_stock(summary, ohlcv_df, timeframe)
        openai_res = self.openai_client.analyze_stock(summary, ohlcv_df, timeframe)
        claude_res = self.claude_client.analyze_stock(summary, ohlcv_df, timeframe)

        # 2. 종합 점수 및 의견 도출
        scores = [gemini_res.score, openai_res.score, claude_res.score]
        avg_score = round(sum(scores) / len(scores), 1)

        if avg_score >= 80:
            overall_opinion = InvestmentOpinion.STRONG_BUY
        elif avg_score >= 68:
            overall_opinion = InvestmentOpinion.BUY
        elif avg_score >= 50:
            overall_opinion = InvestmentOpinion.HOLD
        elif avg_score >= 35:
            overall_opinion = InvestmentOpinion.REDUCE
        else:
            overall_opinion = InvestmentOpinion.STRONG_SELL

        # 3. 종합 요약 및 실행 가이드라인
        consensus_summary = (
            f"3대 AI 종합 평점 {avg_score}점 ({overall_opinion.value}) 도출. "
            f"Gemini(기술적 지표: {gemini_res.score}점), "
            f"ChatGPT(모멘텀/수급: {openai_res.score}점), "
            f"Claude(펀더멘털/안전마진: {claude_res.score}점)"
        )

        action_plan = [
            f"분할 매매 기준선: 20일 이동평균선 지지 여부 모니터링",
            f"밸류에이션 체크: PBR {summary.pbr if summary.pbr else '-'}배 수준의 하방 경직성 활용",
            f"목표 수익률 달성 시 점진적 익절 및 리스크 관리",
        ]

        return ConsensusReport(
            symbol=summary.symbol,
            stock_name=summary.name,
            overall_opinion=overall_opinion,
            average_score=avg_score,
            consensus_summary=consensus_summary,
            gemini_result=gemini_res,
            openai_result=openai_res,
            claude_result=claude_res,
            action_plan=action_plan,
        )
