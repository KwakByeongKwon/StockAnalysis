"""네이버 증권 및 HTS 스타일의 주식 시세 요약 및 주요 재무 지표 컴포넌트."""

import streamlit as st
from src.models.stock import StockSummary


def render_stock_header(summary: StockSummary) -> None:
    """종목 상단 헤더 및 실시간 가격/등락률 뱃지를 렌더링합니다."""
    is_up = summary.change > 0
    is_down = summary.change < 0
    price_color = "#E53935" if is_up else ("#1E88E5" if is_down else "#333333")
    sign_symbol = "▲" if is_up else ("▼" if is_down else "-")
    sign_math = "+" if is_up else ""

    col_title, col_price = st.columns([3, 2])

    with col_title:
        market_badge_color = "#2563EB" if summary.market.value == "KOSPI" else "#059669"
        st.markdown(
            f"""
            <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 5px;">
                <h1 style="margin: 0; font-size: 2.1rem; font-weight: 800; color: #111827; letter-spacing: -0.5px;">
                    {summary.name}
                </h1>
                <span style="font-size: 1.2rem; color: #6B7280; font-weight: 600;">
                    {summary.symbol}
                </span>
                <span style="background: {market_badge_color}15; color: {market_badge_color}; border: 1px solid {market_badge_color}40; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">
                    {summary.market.value}
                </span>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with col_price:
        st.markdown(
            f"""
            <div style="text-align: right;">
                <span style="font-size: 2.2rem; font-weight: 800; color: {price_color};">
                    {summary.current_price:,.0f} <span style="font-size: 1.2rem; font-weight: 600; color: #374151;">원</span>
                </span>
                <div style="font-size: 1.05rem; font-weight: 700; color: {price_color}; margin-top: 2px;">
                    전일대비 {sign_symbol} {abs(summary.change):,.0f} ({sign_math}{summary.change_rate:.2f}%)
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def render_metrics_grid(summary: StockSummary) -> None:
    """네이버 증권 스타일의 주요 시세 및 밸류에이션 팩터 메트릭 그리드를 렌더링합니다."""
    # 1행: 당일 주요 시세
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric(
            label="시가",
            value=f"{summary.open_price:,.0f}원",
        )
    with c2:
        st.metric(
            label="고가",
            value=f"{summary.high_price:,.0f}원",
        )
    with c3:
        st.metric(
            label="저가",
            value=f"{summary.low_price:,.0f}원",
        )
    with c4:
        st.metric(
            label="거래량",
            value=f"{summary.volume:,.0f}주",
        )

    # 2행: 밸류에이션 및 52주 가격
    c5, c6, c7, c8 = st.columns(4)
    with c5:
        mcap_str = f"{summary.market_cap / 100_000_000:,.0f}억원" if summary.market_cap else "-"
        st.metric(label="시가총액", value=mcap_str)
    with c6:
        per_str = f"{summary.per:.2f}배" if summary.per else "-"
        pbr_str = f"{summary.pbr:.2f}배" if summary.pbr else "-"
        st.metric(label="PER / PBR", value=f"{per_str} / {pbr_str}")
    with c7:
        high52 = f"{summary.high_52w:,.0f}원" if summary.high_52w else "-"
        low52 = f"{summary.low_52w:,.0f}원" if summary.low_52w else "-"
        st.metric(label="52주 최고 / 최저", value=f"{high52} / {low52}")
    with c8:
        div_str = f"{summary.dividend_yield:.2f}%" if summary.dividend_yield else "-"
        foreign_str = f"{summary.foreign_rate:.2f}%" if summary.foreign_rate else "-"
        st.metric(label="배당수익률 / 외국인소진율", value=f"{div_str} / {foreign_str}")
