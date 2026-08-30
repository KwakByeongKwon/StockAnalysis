"""v0.dev 디자인 기반의 주식 시세 헤더(QuoteHeader) 및 12대 주요 지표(QuoteStats) 컴포넌트.

마크다운 코드블록 파싱 버그를 원천 차단하기 위해 들여쓰기 없는 순수 HTML로 렌더링합니다.
"""

import streamlit as st
from src.models.stock import StockSummary


def render_v0_header(summary: StockSummary) -> None:
    """v0.dev 스타일의 상단 종목 헤더(QuoteHeader)를 렌더링합니다."""
    up = summary.change > 0
    down = summary.change < 0
    price_color = "#D6303B" if up else ("#2F5FD0" if down else "#18181B")
    sign = "+" if up else ""
    arrow = "▲" if up else ("▼" if down else "")

    market_badge_bg = "#F4F4F5" if summary.market.value == "KOSPI" else "#E0F2FE"
    market_badge_color = "#18181B" if summary.market.value == "KOSPI" else "#0369A1"

    html_code = (
        '<div style="background:#FFFFFF; border:1px solid #E4E4E7; border-radius:8px; padding:18px 22px; margin-bottom:15px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">'
        '<div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:12px;">'
        '<div>'
        '<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">'
        f'<span style="background:{market_badge_bg}; color:{market_badge_color}; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:800;">{summary.market.value}</span>'
        f'<span style="font-family:monospace; font-size:14px; color:#71717A; font-weight:700;">{summary.symbol}</span>'
        '</div>'
        f'<h1 style="margin:0; font-size:2rem; font-weight:900; color:#09090B; letter-spacing:-0.5px;">{summary.name}</h1>'
        '</div>'
        '<div style="text-align:right; display:flex; align-items:baseline; gap:12px;">'
        f'<div style="font-size:2.4rem; font-weight:900; color:{price_color}; font-variant-numeric:tabular-nums;">{summary.current_price:,.0f} <span style="font-size:1.2rem; font-weight:600; color:#71717A;">원</span></div>'
        f'<div style="font-size:1.15rem; font-weight:800; color:{price_color}; font-variant-numeric:tabular-nums;">{arrow} {sign}{summary.change:,.0f} ({sign}{summary.change_rate:.2f}%)</div>'
        '</div>'
        '</div>'
        '</div>'
    )
    st.markdown(html_code, unsafe_allow_html=True)


def render_v0_stats_card(summary: StockSummary) -> None:
    """v0.dev 스타일의 우측 12대 핵심 팩터 지표(QuoteStats) 카드를 렌더링합니다."""
    def fmt_num(val, unit="원", fmt="{:,.0f}"):
        if val is None or val == 0:
            return "-"
        return f"{fmt.format(val)} {unit}".strip()

    mcap_str = f"{summary.market_cap / 100_000_000:,.0f} 억원" if summary.market_cap else "-"
    per_str = f"{summary.per:.2f} 배" if summary.per else "-"
    pbr_str = f"{summary.pbr:.2f} 배" if summary.pbr else "-"
    div_str = f"{summary.dividend_yield:.2f} %" if summary.dividend_yield else "-"
    foreign_str = f"{summary.foreign_rate:.2f} %" if summary.foreign_rate else "-"
    eps_str = fmt_num(summary.eps)
    bps_str = fmt_num(summary.bps)
    high52_str = fmt_num(summary.high_52w)
    low52_str = fmt_num(summary.low_52w)

    items = [
        ("시가", fmt_num(summary.open_price)),
        ("고가", fmt_num(summary.high_price)),
        ("저가", fmt_num(summary.low_price)),
        ("거래량", f"{summary.volume:,.0f} 주"),
        ("시가총액", mcap_str),
        ("52주 최고", high52_str),
        ("52주 최저", low52_str),
        ("PER", per_str),
        ("PBR", pbr_str),
        ("배당수익률", div_str),
        ("외국인소진율", foreign_str),
        ("EPS / BPS", f"{eps_str} / {bps_str}"),
    ]

    rows_html = ""
    for label, val in items:
        rows_html += (
            '<div style="display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid #F4F4F5;">'
            f'<span style="font-size:13px; color:#71717A; font-weight:700;">{label}</span>'
            f'<span style="font-family:monospace; font-size:13.5px; font-weight:800; color:#09090B; font-variant-numeric:tabular-nums;">{val}</span>'
            '</div>'
        )

    card_html = (
        '<div style="background:#FFFFFF; border:1px solid #E4E4E7; border-radius:8px; padding:18px 20px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">'
        '<div style="margin:0 0 12px 0; font-size:15px; font-weight:900; color:#09090B; border-bottom:2px solid #18181B; padding-bottom:8px;">'
        '📊 핵심 투자 지표'
        '</div>'
        f'<div style="display:flex; flex-direction:column;">{rows_html}</div>'
        '</div>'
    )
    st.markdown(card_html, unsafe_allow_html=True)


# 하위 호환성 alias
render_stock_header = render_v0_header
render_metrics_grid = render_v0_stats_card
render_mirae_header = render_v0_header
render_mirae_metrics_bar = render_v0_stats_card
