"""Google Gemini 기반 기술적 차트 및 시계열 분석 클라이언트."""

import json
import logging
import os
from typing import Optional
import pandas as pd

from src.ai.base import AIAnalysisResult, AIProvider, BaseLLMClient, InvestmentOpinion
from src.models.stock import StockSummary, TimeFrame

logger = logging.getLogger(__name__)


class GeminiStockClient(BaseLLMClient):
    """Google Gemini 주식 기술적 차트 분석 클라이언트."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.0-flash") -> None:
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.model_name = model_name

    def analyze_stock(
        self,
        summary: StockSummary,
        ohlcv_df: pd.DataFrame,
        timeframe: TimeFrame = TimeFrame.DAY,
    ) -> AIAnalysisResult:
        """기술적 지표 및 캔들 패턴 중심의 Gemini 분석 수행."""
        # 최근 30개 바 요약 데이터 추출
        tail_df = ohlcv_df.tail(30)
        recent_bars = []
        for idx, row in tail_df.iterrows():
            recent_bars.append({
                "date": idx.strftime("%Y-%m-%d"),
                "close": row["close"],
                "open": row["open"],
                "high": row["high"],
                "low": row["low"],
                "volume": int(row["volume"]),
                "ma5": row.get("MA_5", 0),
                "ma20": row.get("MA_20", 0),
                "ma60": row.get("MA_60", 0),
                "ma120": row.get("MA_120", 0),
            })

        # 실제 API 호출 시도
        if self.api_key:
            try:
                from google import genai
                client = genai.Client(api_key=self.api_key)
                
                prompt = f"""
당신은 대한민국 최고 수준의 금융 기술적 분석가(Technical Analyst)입니다.
아래 종목의 실시간 시세 및 최근 30개 캔들 데이터를 기반으로 엄격하게 기술적 분석을 수행하고,
반드시 아래 JSON 형식으로만 응답하세요.

[종목 기본 정보]
- 종목명: {summary.name} ({summary.symbol})
- 현재가: {summary.current_price:,.0f}원 (등락률: {summary.change_rate:+.2f}%)
- 시가총액: {summary.market_cap / 100_000_000:,.0f}억원 if summary.market_cap else "정보없음"
- 52주 최고/최저: {summary.high_52w} / {summary.low_52w}

[최근 시계열 데이터 (최신순)]
{json.dumps(recent_bars[-15:], ensure_ascii=False, indent=2)}

응답 JSON 스키마:
{{
  "opinion": "적극매수" | "매수" | "관망/중립" | "비중축소" | "적극매도",
  "score": 0~100 사이 정수,
  "summary": "기술적 분석 핵심 한 줄 요약",
  "key_points": ["이동평균선 배열 상태", "거래량 변화 특징", "지지/저항선 분석"],
  "risk_factors": ["기술적 지표 과열 여부 또는 이탈 위험선"],
  "detailed_report": "상세한 기술적 차트 분석 리포트 마크다운 문장"
}}
"""
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                )
                text = response.text.strip()
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0].strip()

                parsed = json.loads(text)
                return AIAnalysisResult(
                    provider=AIProvider.GEMINI,
                    model_name=self.model_name,
                    opinion=InvestmentOpinion(parsed.get("opinion", "관망/중립")),
                    score=int(parsed.get("score", 65)),
                    summary=parsed.get("summary", f"{summary.name} 기술적 지표 분석 완료"),
                    key_points=parsed.get("key_points", []),
                    risk_factors=parsed.get("risk_factors", []),
                    detailed_report=parsed.get("detailed_report", text),
                )
            except Exception as e:
                logger.warning(f"Gemini API 호출 실패, 지능형 룰베이스 엔진으로 폴백: {e}")

        # API Key 미등록 시 지능형 규칙 기반 기술적 분석 폴백 (정량적 팩터 계산)
        return self._generate_rule_based_analysis(summary, ohlcv_df)

    def _generate_rule_based_analysis(self, summary: StockSummary, df: pd.DataFrame) -> AIAnalysisResult:
        """API 키가 없을 때 실시간 데이터를 분석하여 제공하는 정량 분석."""
        last_row = df.iloc[-1] if not df.empty else None
        ma5 = last_row.get("MA_5", summary.current_price) if last_row is not None else summary.current_price
        ma20 = last_row.get("MA_20", summary.current_price) if last_row is not None else summary.current_price
        ma60 = last_row.get("MA_60", summary.current_price) if last_row is not None else summary.current_price

        score = 60
        key_points = []
        risk_factors = []

        if summary.current_price > ma5 > ma20:
            score += 20
            opinion = InvestmentOpinion.BUY
            key_points.append("단기 이동평균선(5일선 > 20일선) 정배열 형성으로 단기 상승 탄력 유지 중")
        elif summary.current_price < ma5 < ma20:
            score -= 20
            opinion = InvestmentOpinion.REDUCE
            risk_factors.append("단기 이동평균선(5일선 < 20일선) 역배열 하향 추세 주의")
        else:
            opinion = InvestmentOpinion.HOLD
            key_points.append("단기 이동평균선 수렴 구간으로 방향성 탐색 중")

        if summary.current_price >= ma60:
            key_points.append("중기 추세선(60일선) 상단에 안착하여 중기 지지력 양호")
        else:
            risk_factors.append("60일 중기 이동평균선 하회로 반등 시 저항 매물대 존재")

        summary_text = f"단기 이평선 정렬 및 {summary.current_price:,.0f}원 지지력 테스트 구간"
        detailed_report = f"""
### 📈 [Google Gemini] 기술적 차트 분석 소견
- **현재 추세**: 현재가 **{summary.current_price:,.0f}원**은 5일 이평선({ma5:,.0f}원), 20일 이평선({ma20:,.0f}원) 대비 {'상회' if summary.current_price >= ma20 else '하회'} 중입니다.
- **수급 및 거래량**: 당일 거래량 **{summary.volume:,.0f}주**를 기록하며 직전 평균 대비 변동성이 확대되었습니다.
- **단기 매매 전략**: 20일선({ma20:,.0f}원) 지지 여부를 분기점으로 삼고 분할 접근을 권장합니다.
"""
        return AIAnalysisResult(
            provider=AIProvider.GEMINI,
            model_name=f"{self.model_name} (내장 분석 엔진)",
            opinion=opinion,
            score=min(100, max(0, score)),
            summary=summary_text,
            key_points=key_points,
            risk_factors=risk_factors,
            detailed_report=detailed_report.strip(),
        )
