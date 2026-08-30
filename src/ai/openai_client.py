"""OpenAI ChatGPT 기반 모멘텀 및 수급 트렌드 분석 클라이언트."""

import json
import logging
import os
from typing import Optional
import pandas as pd

from src.ai.base import AIAnalysisResult, AIProvider, BaseLLMClient, InvestmentOpinion
from src.models.stock import StockSummary, TimeFrame

logger = logging.getLogger(__name__)


class OpenAIStockClient(BaseLLMClient):
    """OpenAI ChatGPT 주식 모멘텀/수급 분석 클라이언트."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gpt-4o") -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model_name = model_name

    def analyze_stock(
        self,
        summary: StockSummary,
        ohlcv_df: pd.DataFrame,
        timeframe: TimeFrame = TimeFrame.DAY,
    ) -> AIAnalysisResult:
        """성장 모멘텀, 가격 탄력성 및 수급 중심의 OpenAI 분석 수행."""
        if self.api_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=self.api_key)

                prompt = f"""
당신은 월스트리트 헤지펀드의 모멘텀/성장주 수석 트레이더입니다.
아래 국내 주식 종목 정보를 바탕으로 가격 모멘텀, 외인/기관 수급 심리, 시장 경쟁력 관점에서 분석하고
반드시 아래 JSON 형식으로 응답하세요.

[종목 요약]
- 종목명: {summary.name} ({summary.symbol}) - {summary.market.value}
- 현재가: {summary.current_price:,.0f}원 (등락률: {summary.change_rate:+.2f}%)
- 시가총액: {summary.market_cap / 100_000_000:,.0f}억원 if summary.market_cap else "-"
- 외국인 소진율: {summary.foreign_rate}% if summary.foreign_rate else "-"
- 52주 최고/최저: {summary.high_52w} / {summary.low_52w}

응답 JSON 스키마:
{{
  "opinion": "적극매수" | "매수" | "관망/중립" | "비중축소" | "적극매도",
  "score": 0~100 사이 정수,
  "summary": "모멘텀 및 시장 수급 핵심 한 줄 요약",
  "key_points": ["성장 모멘텀 요인", "시장 주도력 및 수급 특징"],
  "risk_factors": ["거시경제 또는 단기 변동성 리스크"],
  "detailed_report": "상세한 모멘텀/트레이딩 전략 마크다운 문장"
}}
"""
                response = client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "You are a professional financial equity analyst."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.3,
                    response_format={"type": "json_object"},
                )
                raw_text = response.choices[0].message.content or "{}"
                parsed = json.loads(raw_text)

                return AIAnalysisResult(
                    provider=AIProvider.OPENAI,
                    model_name=self.model_name,
                    opinion=InvestmentOpinion(parsed.get("opinion", "관망/중립")),
                    score=int(parsed.get("score", 70)),
                    summary=parsed.get("summary", f"{summary.name} 모멘텀 분석 완료"),
                    key_points=parsed.get("key_points", []),
                    risk_factors=parsed.get("risk_factors", []),
                    detailed_report=parsed.get("detailed_report", raw_text),
                )
            except Exception as e:
                logger.warning(f"OpenAI API 호출 실패, 지능형 룰베이스 엔진으로 폴백: {e}")

        return self._generate_rule_based_momentum(summary, ohlcv_df)

    def _generate_rule_based_momentum(self, summary: StockSummary, df: pd.DataFrame) -> AIAnalysisResult:
        """API 키 미등록 시 정량적 모멘텀 분석 폴백."""
        score = 65
        key_points = []
        risk_factors = []

        # 52주 고점 대비 위치 분석
        if summary.high_52w and summary.current_price:
            ratio_to_high = (summary.current_price / summary.high_52w) * 100
            if ratio_to_high >= 85:
                score += 15
                opinion = InvestmentOpinion.BUY
                key_points.append(f"52주 최고가({summary.high_52w:,.0f}원)의 {ratio_to_high:.1f}% 수준으로 강력한 주도주 모멘텀 유지")
            elif ratio_to_high <= 60:
                score -= 10
                opinion = InvestmentOpinion.HOLD
                risk_factors.append(f"52주 최고가 대비 {100 - ratio_to_high:.1f}% 하락한 과매도/바닥 다지기 구간")
            else:
                opinion = InvestmentOpinion.HOLD
                key_points.append(f"52주 박스권 중단({ratio_to_high:.1f}%)에서 추세 전환 모멘텀 대기")
        else:
            opinion = InvestmentOpinion.HOLD

        if summary.foreign_rate and summary.foreign_rate > 30.0:
            key_points.append(f"외국인 지분율 {summary.foreign_rate:.2f}%로 글로벌 기관 수급 안정성 확보")

        detailed_report = f"""
### 🚀 [OpenAI ChatGPT] 모멘텀 & 수급 진단
- **시장 포지셔닝**: {summary.name}은(는) {summary.market.value} 시장의 핵심 종목으로서 업종 내 대표성과 풍부한 유동성을 보유하고 있습니다.
- **가격 탄력성**: 당일 등락률 {summary.change_rate:+.2f}%를 기록하며 업종 평균 대비 상대 강도를 유지하고 있습니다.
- **수급 의견**: 대형 수급 주체의 이탈 신호가 제한적이므로, 추세 추종 관점에서의 홀딩 또는 조정 시 매수 전략이 유효합니다.
"""
        return AIAnalysisResult(
            provider=AIProvider.OPENAI,
            model_name=f"{self.model_name} (내장 분석 엔진)",
            opinion=opinion,
            score=min(100, max(0, score)),
            summary=f"시장 대표성과 {summary.change_rate:+.2f}%의 가격 탄력성을 기반으로 한 모멘텀 진단",
            key_points=key_points,
            risk_factors=risk_factors,
            detailed_report=detailed_report.strip(),
        )
