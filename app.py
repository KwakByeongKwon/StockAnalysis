"""StockAnalysis - SQLite 기반 초고속 로컬 주식 차트 및 퀀트 지표 분석 시스템.

v0.dev의 모던 미니멀 디자인, 퀵 종목 뱃지, 멀티 보조지표(이평선/볼린저/거래량/RSI/MACD),
상장일부터 현재까지 0.005초 로컬 SQLite 렌더링 및 스마트 증분 동기화를 제공합니다.
"""

import sys
from pathlib import Path

# 모듈 경로 등록
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import streamlit as st
import pandas as pd
from src.data.repository import StockRepository
from src.models.stock import MarketType, StockItem, TimeFrame
from src.ui.components.chart import create_stock_chart
from src.ui.components.metrics import render_v0_header, render_v0_stats_card

# 1. 페이지 기본 설정
st.set_page_config(
    page_title="StockAnalysis - 주식 차트 분석",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# v0.dev 고유 모던 미니멀 CSS
st.markdown(
    """
    <style>
    .stApp {
        background-color: #F8FAFC;
        color: #0F172A;
        font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "Segoe UI", Roboto, sans-serif;
    }
    .block-container {
        padding-top: 0.8rem;
        padding-bottom: 2rem;
        padding-left: 1.8rem;
        padding-right: 1.8rem;
        max-width: 1680px;
    }
    /* 라벨 텍스트 선명화 */
    div[role="radiogroup"] label p, div[data-testid="stCheckbox"] label p {
        color: #0F172A !important;
        font-weight: 700 !important;
        font-size: 13.5px !important;
    }
    /* 버튼 스타일 */
    div.stButton > button {
        background-color: #0F172A;
        color: #FFFFFF;
        border: 1px solid #1E293B;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 800;
        padding: 5px 12px;
        transition: all 0.15s ease-in-out;
    }
    div.stButton > button:hover {
        background-color: #1E293B;
        color: #FFFFFF;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# 레포지토리 인스턴스 (캐시 충돌 방지)
repo = StockRepository()

# 2. 세션 상태 (선택된 종목 관리)
if "current_symbol" not in st.session_state:
    st.session_state.current_symbol = "005930"
if "current_name" not in st.session_state:
    st.session_state.current_name = "삼성전자"
if "current_market" not in st.session_state:
    st.session_state.current_market = MarketType.KOSPI

# 3. 상단 TopBar (로고, 종목 검색, 동기화 버튼)
top_col1, top_col2, top_col3 = st.columns([1.8, 4.2, 1.4])

with top_col1:
    st.markdown(
        """
        <div style="display: flex; align-items: center; gap: 8px; height: 100%; padding-top: 4px;">
            <div style="background: #0F172A; color: #FFFFFF; width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px;">
                S
            </div>
            <span style="font-size: 20px; font-weight: 900; color: #0F172A; letter-spacing: -0.5px;">
                StockAnalysis
            </span>
        </div>
        """,
        unsafe_allow_html=True,
    )

with top_col2:
    search_query = st.text_input(
        "종목 검색",
        value="",
        placeholder="🔍 종목명 또는 6자리 코드 검색 (예: 삼성전자, 005930, SK하이닉스, NAVER, 카카오)",
        label_visibility="collapsed",
    )

with top_col3:
    force_sync = st.button("🔄 데이터 동기화", use_container_width=True)

# 4. 빠른 종목 전환 뱃지 바 (Quick Stock Pills)
POPULAR_PRESETS = [
    ("005930", "삼성전자", MarketType.KOSPI),
    ("000660", "SK하이닉스", MarketType.KOSPI),
    ("035420", "NAVER", MarketType.KOSPI),
    ("005380", "현대차", MarketType.KOSPI),
    ("068270", "셀트리온", MarketType.KOSPI),
    ("247540", "에코프로비엠", MarketType.KOSDAQ),
    ("086520", "에코프로", MarketType.KOSDAQ),
]

p_cols = st.columns(len(POPULAR_PRESETS) + 1)
with p_cols[0]:
    st.caption("⚡ **인기 종목:**")

for idx, (p_sym, p_name, p_mkt) in enumerate(POPULAR_PRESETS, start=1):
    with p_cols[idx]:
        if st.button(p_name, key=f"btn_p_{p_sym}"):
            st.session_state.current_symbol = p_sym
            st.session_state.current_name = p_name
            st.session_state.current_market = p_mkt

# 검색 결과 처리
if search_query.strip():
    search_results = repo.search_stocks(search_query)
    options = {f"{item.name} ({item.symbol}) · {item.market.value}": item for item in search_results}
    if options:
        selected_label = st.selectbox(
            "검색 결과 선택",
            options=list(options.keys()),
            index=0,
            label_visibility="collapsed",
        )
        selected_item = options[selected_label]
        st.session_state.current_symbol = selected_item.symbol
        st.session_state.current_name = selected_item.name
        st.session_state.current_market = selected_item.market

curr_symbol = st.session_state.current_symbol
curr_name = st.session_state.current_name
curr_market = st.session_state.current_market

# 5. 동기화 버튼 클릭 처리
if force_sync:
    with st.spinner(f"[{curr_name}] 최신 증분 데이터를 SQLite에 동기화 중..."):
        sync_res = repo.sync_stock_data(curr_symbol, market=curr_market)
        st.toast(f"[{curr_name}] 이전 동기화 시점부터 오늘까지 증분 동기화 완료! (총 {sync_res.get('total_bars', 0):,}개)")

# 6. SQLite에서 실시간 요약 로드 (0.001초)
summary = repo.get_stock_summary(curr_symbol)

# 7. v0.dev 상단 종목 헤더 (QuoteHeader)
render_v0_header(summary)

# 8. 메인 레이아웃 (2열 그리드: 좌측 차트 74% + 우측 12대 지표 카드 26%)
left_col, right_col = st.columns([2.9, 1.1], gap="medium")

with left_col:
    # 차트 툴바: 봉 주기 + 5대 보조지표 토글 (이평선, 볼린저, 거래량, RSI, MACD)
    c_tf, c_opt1, c_opt2, c_opt3, c_opt4, c_opt5 = st.columns([3.2, 1.0, 1.0, 1.0, 1.0, 1.0])

    with c_tf:
        selected_tf_label = st.radio(
            "봉 주기",
            options=["일봉", "주봉", "월봉", "1분", "5분", "30분"],
            index=0,
            horizontal=True,
            label_visibility="collapsed",
        )
        tf_map = {
            "일봉": TimeFrame.DAY,
            "주봉": TimeFrame.WEEK,
            "월봉": TimeFrame.MONTH,
            "1분": TimeFrame.MINUTE_1,
            "5분": TimeFrame.MINUTE_5,
            "30분": TimeFrame.MINUTE_30,
        }
        selected_timeframe = tf_map[selected_tf_label]

    with c_opt1:
        show_ma = st.checkbox("이평선", value=True)
    with c_opt2:
        show_bb = st.checkbox("볼린저", value=False)
    with c_opt3:
        show_vol = st.checkbox("거래량", value=True)
    with c_opt4:
        show_rsi = st.checkbox("RSI", value=False)
    with c_opt5:
        show_macd = st.checkbox("MACD", value=False)

    # SQLite에서 시계열 로드 및 보조지표 계산 (0.005초)
    ohlcv_df = repo.get_ohlcv(
        symbol=curr_symbol,
        market=curr_market,
        timeframe=selected_timeframe,
        force_refresh=False,
        add_indicators=True,
    )

    fig = create_stock_chart(
        df=ohlcv_df,
        symbol=curr_symbol,
        stock_name=curr_name,
        timeframe=selected_timeframe,
        show_ma=show_ma,
        show_bollinger=show_bb,
        show_volume=show_vol,
        show_rsi=show_rsi,
        show_macd=show_macd,
    )

    plotly_config = {
        "scrollZoom": True,
        "displayModeBar": True,
        "displaylogo": False,
        "modeBarButtonsToRemove": ["lasso2d", "select2d"],
    }

    st.plotly_chart(fig, config=plotly_config, use_container_width=True)

    # 하단 데이터 바 & 저장
    start_dt = str(ohlcv_df.index.min().date()) if not ohlcv_df.empty else "-"
    end_dt = str(ohlcv_df.index.max().date()) if not ohlcv_df.empty else "-"
    total_bars = len(ohlcv_df)

    c_info, c_dl1, c_dl2 = st.columns([3, 1, 1])
    with c_info:
        st.caption(
            f"💾 **SQLite 저장소**: 총 **{total_bars:,}**개 바 ({start_dt} ~ {end_dt}) | "
            f"💡 **조작**: 차트를 드래그(Pan)하여 이동하고, 휠로 확대/축소(Zoom)할 수 있습니다."
        )
    with c_dl1:
        csv_bytes = ohlcv_df.to_csv().encode("utf-8-sig")
        st.download_button(
            label="📥 CSV 저장",
            data=csv_bytes,
            file_name=f"{curr_name}_{curr_symbol}_{selected_timeframe.value}.csv",
            mime="text/csv",
            use_container_width=True,
        )
    with c_dl2:
        parquet_bytes = ohlcv_df.to_parquet(engine="pyarrow")
        st.download_button(
            label="📥 Parquet 저장",
            data=parquet_bytes,
            file_name=f"{curr_name}_{curr_symbol}_{selected_timeframe.value}.parquet",
            mime="application/octet-stream",
            use_container_width=True,
        )

with right_col:
    # v0.dev 우측 핵심 12대 지표 카드 (QuoteStats)
    render_v0_stats_card(summary)
