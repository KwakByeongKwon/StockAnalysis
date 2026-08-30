"""3대 AI(Gemini, ChatGPT, Claude) 종합 분석 결과 렌더링 컴포넌트."""

import streamlit as st
from src.ai.base import AIAnalysisResult, ConsensusReport, InvestmentOpinion


def render_consensus_dashboard(report: ConsensusReport) -> None:
    """3대 AI 종합 합의(Consensus) 대시보드를 렌더링합니다."""
    # 종합 의견 색상
    opinion_color_map = {
        InvestmentOpinion.STRONG_BUY: "#E53935",
        InvestmentOpinion.BUY: "#F97316",
        InvestmentOpinion.HOLD: "#64748B",
        InvestmentOpinion.REDUCE: "#3B82F6",
        InvestmentOpinion.STRONG_SELL: "#1D4ED8",
    }
    color = opinion_color_map.get(report.overall_opinion, "#64748B")

    # 상단 요약 카드
    st.markdown(
        f"""
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 22px; margin-bottom: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-size: 0.9rem; font-weight: 700; color: #64748B;">🤖 3대 AI 앙상블 종합 진단 결과</span>
                    <h2 style="margin: 4px 0 0 0; font-size: 1.8rem; font-weight: 800; color: #0F172A;">
                        {report.stock_name} ({report.symbol})
                    </h2>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.85rem; color: #64748B; font-weight: 600;">종합 투자 의견</span>
                    <div style="font-size: 1.8rem; font-weight: 900; color: {color};">
                        {report.overall_opinion.value} <span style="font-size: 1.2rem; color: #0F172A;">({report.average_score:.1f}점)</span>
                    </div>
                </div>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #F1F5F9; color: #334155; font-size: 0.95rem; font-weight: 500;">
                💡 {report.consensus_summary}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # 3대 AI 개별 분석 결과 3컬럼 카드 뷰
    col_gemini, col_openai, col_claude = st.columns(3)

    if report.gemini_result:
        with col_gemini:
            _render_single_ai_card(
                report.gemini_result,
                badge_title="📈 기술적 차트 지표",
                icon="🔷 Google Gemini",
                border_color="#2563EB",
            )

    if report.openai_result:
        with col_openai:
            _render_single_ai_card(
                report.openai_result,
                badge_title="🚀 모멘텀 & 시장 수급",
                icon="🟢 OpenAI ChatGPT",
                border_color="#10B981",
            )

    if report.claude_result:
        with col_claude:
            _render_single_ai_card(
                report.claude_result,
                badge_title="🛡️ 밸류에이션 & 안전마진",
                icon="🟠 Anthropic Claude",
                border_color="#F59E0B",
            )


def _render_single_ai_card(result: AIAnalysisResult, badge_title: str, icon: str, border_color: str) -> None:
    """개별 AI 리포트 카드 UI."""
    with st.container():
        st.markdown(
            f"""
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid {border_color}; border-radius: 8px; padding: 14px; height: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                    <span style="font-size: 0.95rem; font-weight: 800; color: #0F172A;">{icon}</span>
                    <span style="font-size: 0.8rem; background: #F1F5F9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 600;">{result.opinion.value} ({result.score}점)</span>
                </div>
                <div style="font-size: 0.82rem; color: #64748B; margin-bottom: 8px; font-weight: 600;">
                    {badge_title}
                </div>
                <p style="font-size: 0.9rem; color: #1E293B; font-weight: 600; line-height: 1.4; margin-bottom: 10px;">
                    "{result.summary}"
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        with st.expander("🔍 상세 분석 소견 및 근거", expanded=False):
            if result.key_points:
                st.markdown("**✅ 긍정/상승 근거:**")
                for kp in result.key_points:
                    st.markdown(f"- {kp}")

            if result.risk_factors:
                st.markdown("**⚠️ 리스크 및 주의 요인:**")
                for rf in result.risk_factors:
                    st.markdown(f"- {rf}")

            st.markdown("---")
            st.markdown(result.detailed_report)
