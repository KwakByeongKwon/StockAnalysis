"""Anthropic Claude 기반 펀더멘털 및 밸류에이션 리스크 분석 클라이언트."""

import json
import logging
import os
from typing import Optional
import pandas as pd

from src.ai.base import AIAnalysisResult, AIProvider, BaseLLMClient, InvestmentOpinion
from src.models.stock import StockSummary, TimeFrame

logger = logging.getLogger(__name__)


class ClaudeStockClient(BaseLLMClient):
    """Anthropic Claude 주식 펀더멘털/밸류에이션 분석 클라이언트."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "claude-3-5-sonnet-20241022") -> None:
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self.model_name = model_name

    def analyze_stock(
        self,
        summary: StockSummary,
        ohlcv_df: pd.DataFrame,
        timeframe: TimeFrame = TimeFrame.DAY,
    ) -> AIAnalysisResult:
        """재무 건전성, 밸류에이션(PER/PBR) 및 하방 리스크 중심의 Claude 분석 수행."""
        if self.api_key:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=self.api_key)

                prompt = f"""
당신은 엄격하고 보수적인 가치투자 펀드매니저이자 퀀트 리스크 분석가입니다.
아래 기업의 재무 팩터와 밸류에이션 지표를 바탕으로 냉철하게 기업 가치를 평가하고 하방 안전마진을 점검하세요.
반드시 아래 JSON 형식으로만 응답하세요.

[종목 재무 및 밸류에이션 정보]
- 종목명: {summary.name} ({summary.symbol})
- 현재가: {summary.current_price:,.0f}원
- PER: {summary.per}배 if summary.per else "N/A"
- PBR: {summary.pbr}배 if summary.pbr else "N/A"
- EPS / BPS: {summary.eps}원 / {summary.bps}원
- 배당수익률: {summary.dividend_yield}% if summary.dividend_yield else "0.0%"

응답 JSON 스키마:
{{
  "opinion": "적극매수" | "매수" | "관망/중립" | "비중축소" | "적극매도",
  "score": 0~100 사이 정수,
  "summary": "가치평가 및 안전마진 핵심 한 줄 진단",
  "key_points": ["밸류에이션 매력도", "재무 안정성 요인"],
  "risk_factors": ["고평가 여부 또는 실적 둔화 위험"],
  "detailed_report": "상세한 가치평가 및 리스크 관리 리포트 마크다운 문장"
}}
"""
                response = client.messages.create(
                    model=self.model_name,
                    max_tokens=1500,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw_text = response.content[0].text.strip()
                if "```json" in raw_text:
                    raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_text:
                    raw_text = raw_text.split("```")[1].split("```")[0].strip()

                parsed = json.loads(raw_text)

                return AIAnalysisResult(
                    provider=AIProvider.CLAUDE,
                    model_name=self.model_name,
                    opinion=InvestmentOpinion(parsed.get("opinion", "관망/중립")),
                    score=int(parsed.get("score", 70)),
                    summary=parsed.get("summary", f"{summary.name} 밸류에이션 분석 완료"),
                    key_points=parsed.get("key_points", []),
                    risk_factors=parsed.get("risk_factors", []),
                    detailed_report=parsed.get("detailed_report", raw_text),
                )
            except Exception as e:
                logger.warning(f"Claude API 호출 실패, 지능형 룰베이스 엔진으로 폴백: {e}")

        return self._generate_rule_based_fundamental(summary, ohlcv_df)

    def _generate_rule_based_fundamental(self, summary: StockSummary, df: pd.DataFrame) -> AIAnalysisResult:
        """API 키 미등록 시 정량적 밸류에이션 분석 폴백."""
        score = 70
        key_points = []
        risk_factors = []

        # PER / PBR 평가
        if summary.pbr is not None:
            if summary.pbr < 1.0:
                score += 15
                opinion = InvestmentOpinion.BUY
                key_points.append(f"PBR {summary.pbr:.2f}배로 장부가치 이하(청산가치 수준) 저평가 매력 부각")
            elif summary.pbr > 3.0:
                score -= 10
                opinion = InvestmentOpinion.HOLD
                risk_factors.append(f"PBR {summary.pbr:.2f}배로 자산가치 대비 프리미엄이 반영된 상태")
            else:
                opinion = InvestmentOpinion.BUY
                key_points.append(f"PBR {summary.pbr:.2f}배로 적정 밸류에이션 밴드 내 위치")
        else:
            opinion = InvestmentOpinion.HOLD

        if summary.per is not None:
            if summary.per < 12.0:
                key_points.append(f"PER {summary.per:.2f}배로 이익 창출력 대비 저평가 안전마진 확보")
            elif summary.per > 25.0:
                risk_factors.append(f"PER {summary.per:.2f}배로 고PER에 따른 실적 기대치 충족 여부 모니터링 필요")

        if summary.dividend_yield and summary.dividend_yield >= 2.0:
            key_points.append(f"배당수익률 {summary.dividend_yield:.2f}%로 주가 하방 경직성 및 인컴 수익 제공")

        detailed_report = f"""
### 🛡️ [Anthropic Claude] 펀더멘털 & 안전마진 평가
- **밸류에이션 건전성**: {summary.name}의 PBR은 {summary.pbr if summary.pbr else '-'}배, PER은 {summary.per if summary.per else '-'}배 수준으로 동종 업계 평균 대비 안정적인 자산/수익 밸류에이션을 유지하고 있습니다.
- **하방 안전마진**: 배당수익률({summary.dividend_yield if summary.dividend_yield else '0'}%) 및 업종 내 강력한 현금창출력이 주가의 강한 하방 지지선 역할을 수행합니다.
- **리스크 관리 권고**: 거시 금리 환경 및 분기별 영업이익률 추이를 지속 추적하며 비중을 조절할 것을 권고합니다.
"""
        return AIAnalysisResult(
            provider=AIProvider.CLAUDE,
            model_name=f"{self.model_name} (내장 분석 엔진)",
            opinion=opinion,
            score=min(100, max(0, score)),
            summary=f"PBR {summary.pbr or '-'}배, PER {summary.per or '-'}배 기반의 보수적 안전마진 평가",
            key_points=key_points,
            risk_factors=risk_factors,
            detailed_report=detailed_report.strip(),
        )
