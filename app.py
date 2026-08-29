"""StockAnalysis - 국내 주식 차트 분석 시스템 (네이버 증권 스타일).

봉 주기([1분, 3분, 5분, 10분, 30분, 1시간], 1일, 1주, 한달) 기준 선택 및
전체 시계열 데이터 드래그(Pan) / 스크롤 줌(Scroll Zoom)을 지원합니다.
"""

import sys
from pathlib import Path

# 모듈 경로 추가
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import streamlit as st
import pandas as pd
from src.data.repository import StockRepository
from src.models.stock import StockItem, TimeFrame
from src.ui.components.chart import create_stock_chart
from src.ui.components.metrics import render_stock_header, render_metrics_grid

# 1. 페이지 기본 설정
st.set_page_config(
    page_title="네이버 증권 스타일 주식 차트 분석 - StockAnalysis",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# 네이버 증권 / HTS 스타일 화이트 테마 CSS
st.markdown(
    """
    <style>
    /* 전체 배경 */
    .stApp {
        background-color: #F8FAFC;
        font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
    }
    .block-container {
        padding-top: 1.2rem;
        padding-bottom: 2rem;
        padding-left: 2rem;
        padding-right: 2rem;
        max-width: 1600px;
    }
    /* 카드 컴포넌트 */
    div[data-testid="stMetric"] {
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 10px 14px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    div[data-testid="stMetricLabel"] {
        font-size: 0.82rem;
        font-weight: 600;
        color: #64748B;
    }
    div[data-testid="stMetricValue"] {
        font-size: 1.25rem;
        font-weight: 800;
        color: #0F172A;
    }
    /* 탭 헤더 */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        border-bottom: 2px solid #E2E8F0;
    }
    .stTabs [data-baseweb="tab"] {
        height: 40px;
        padding: 0 16px;
        font-size: 0.95rem;
        font-weight: 700;
        color: #64748B;
    }
    .stTabs [aria-selected="true"] {
        color: #2563EB !important;
        border-bottom: 2px solid #2563EB !important;
    }
    /* 사이드바 */
    section[data-testid="stSidebar"] {
        background-color: #FFFFFF;
        border-right: 1px solid #E2E8F0;
    }
    /* 버튼 스타일 */
    div.stButton > button {
        border-radius: 6px;
        font-weight: 600;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_resource
def get_repository() -> StockRepository:
    """StockRepository 싱글톤 인스턴스 반환."""
    return StockRepository()


repo = get_repository()

# 2. 사이드바 (종목 검색 및 보조지표 설정)
with st.sidebar:
    st.markdown("### 📈 **국내 주식 차트 분석**")
    st.caption("네이버 증권 기반 실시간 시세 & 전체 시계열 분석")
    st.markdown("---")

    # 종목 검색 (전체 상장종목 검색)
    st.markdown("#### 🔍 **종목 검색 (전체)**")
    search_query = st.text_input(
        "종목명 또는 종목코드",
        value="",
        placeholder="예: 삼성전자, 005930, SK하이닉스",
        label_visibility="collapsed",
    )

    search_results = repo.search_stocks(search_query)
    options = {f"{item.name} ({item.symbol}) - {item.market.value}": item for item in search_results}

    if options:
        selected_label = st.selectbox(
            "종목 선택",
            options=list(options.keys()),
            index=0,
        )
        selected_stock: StockItem = options[selected_label]
    else:
        st.warning("일치하는 종목이 없어 삼성전자를 기본 표시합니다.")
        selected_stock = StockItem(symbol="005930", name="삼성전자")

    st.markdown("---")
    
    # 보조 지표 설정
    st.markdown("#### 📊 **보조지표 설정**")
    show_ma = st.checkbox("이동평균선 (5선 / 20선 / 60선 / 120선)", value=True)
    show_bollinger = st.checkbox("볼린저 밴드 (20일, 2σ)", value=False)
    show_volume = st.checkbox("거래량 보조차트", value=True)

    st.markdown("---")
    
    # 데이터 새로고침
    st.markdown("#### 💾 **데이터 동기화**")
    force_refresh = st.button("🔄 최신 데이터 새로고침", use_container_width=True)
    if force_refresh:
        st.toast(f"[{selected_stock.name}] 최신 데이터를 다시 수집합니다.")

# 3. 상단 봉 주기 선택 바 (네이버 증권 스타일: 1분/3분/5분/10분/30분/1시간, 일봉, 주봉, 월봉)
# 4개의 상단 컬럼 배치
c_type, c_min, c_blank = st.columns([1.5, 1.5, 4])

with c_type:
    main_tf_type = st.radio(
        "봉 주기 대분류",
        options=["분봉", "일", "주", "월"],
        index=1,  # 기본값: 일봉
        horizontal=True,
        label_visibility="collapsed",
    )

if main_tf_type == "분봉":
    with c_min:
        min_option = st.selectbox(
            "분봉 세부주기",
            options=["1분", "3분", "5분", "10분", "30분", "1시간"],
            index=0,
            label_visibility="collapsed",
        )
    tf_map = {
        "1분": TimeFrame.MINUTE_1,
        "3분": TimeFrame.MINUTE_3,
        "5분": TimeFrame.MINUTE_5,
        "10분": TimeFrame.MINUTE_10,
        "30분": TimeFrame.MINUTE_30,
        "1시간": TimeFrame.MINUTE_60,
    }
    selected_timeframe = tf_map[min_option]
elif main_tf_type == "일":
    selected_timeframe = TimeFrame.DAY
elif main_tf_type == "주":
    selected_timeframe = TimeFrame.WEEK
else:
    selected_timeframe = TimeFrame.MONTH

# 4. 데이터 로딩 (레포지토리 연동)
try:
    with st.spinner(f"{selected_stock.name}({selected_stock.symbol}) 시세 데이터를 불러오는 중..."):
        summary = repo.get_stock_summary(selected_stock.symbol)
        ohlcv_df = repo.get_ohlcv(
            symbol=selected_stock.symbol,
            timeframe=selected_timeframe,
            count=3000,  # 전체 데이터 조회
            force_refresh=force_refresh,
            add_indicators=True,
        )
        cache_info = repo.get_cache_status(selected_stock.symbol, selected_timeframe)

except Exception as e:
    st.error(f"데이터를 조회하는 중 오류가 발생했습니다: {e}")
    st.stop()

# 5. 메인 화면 렌더링
# 5-1. 종목 상단 헤더 & 메트릭 카드
render_stock_header(summary)
render_metrics_grid(summary)

st.markdown("<div style='margin-top: 10px;'></div>", unsafe_allow_html=True)

# 5-2. 탭 메뉴
tab_chart, tab_data, tab_cache = st.tabs(["📈 차트 분석", "📋 시계열 시세표", "💾 데이터 캐시 현황"])

with tab_chart:
    fig = create_stock_chart(
        df=ohlcv_df,
        symbol=selected_stock.symbol,
        stock_name=selected_stock.name,
        timeframe=selected_timeframe,
        show_ma=show_ma,
        show_bollinger=show_bollinger,
        show_volume=show_volume,
    )
    
    plotly_config = {
        "scrollZoom": True,          # 마우스 휠 스크롤로 자유로운 확대/축소
        "displayModeBar": True,      # Plotly 툴바 표시
        "displaylogo": False,        # 로고 숨김
        "modeBarButtonsToRemove": ["lasso2d", "select2d"],
        "toImageButtonOptions": {
            "format": "png",
            "filename": f"{selected_stock.name}_{selected_stock.symbol}_{selected_timeframe.value}_차트",
            "scale": 2,
        },
    }
    
    st.plotly_chart(fig, config=plotly_config, use_container_width=True)
    st.caption("💡 **차트 조작 안내**: 차트를 마우스로 꾹 누르고 드래그하면 좌우로 이동(Pan)하며, 마우스 휠 스크롤로 전체 시계열 구간을 자유롭게 확대/축소(Zoom)할 수 있습니다.")

with tab_data:
    st.markdown(f"#### **{selected_stock.name} 시계열 시세 원본 데이터 ({len(ohlcv_df):,}건)**")
    
    display_df = ohlcv_df.sort_index(ascending=False).copy()
    korean_column_map = {
        "open": "시가",
        "high": "고가",
        "low": "저가",
        "close": "종가",
        "volume": "거래량",
        "MA_5": "5선",
        "MA_20": "20선",
        "MA_60": "60선",
        "MA_120": "120선",
        "MA_200": "200선",
        "BB_upper": "볼린저상단",
        "BB_lower": "볼린저하단",
        "BB_middle": "볼린저중심",
        "V_MA_5": "거래량5선",
        "V_MA_20": "거래량20선",
    }
    renamed_df = display_df.rename(columns=korean_column_map)
    renamed_df.index.name = "일자/시간"
    
    col_d1, col_d2, _ = st.columns([1.2, 1.2, 3])
    with col_d1:
        csv_data = renamed_df.to_csv().encode("utf-8-sig")
        st.download_button(
            label="📥 CSV 파일 저장",
            data=csv_data,
            file_name=f"{selected_stock.name}_{selected_stock.symbol}_{selected_timeframe.value}.csv",
            mime="text/csv",
            use_container_width=True,
        )
    with col_d2:
        parquet_bytes = display_df.to_parquet(engine="pyarrow")
        st.download_button(
            label="📥 Parquet 파일 저장",
            data=parquet_bytes,
            file_name=f"{selected_stock.name}_{selected_stock.symbol}_{selected_timeframe.value}.parquet",
            mime="application/octet-stream",
            use_container_width=True,
        )

    format_dict = {
        "시가": "{:,.0f}원",
        "고가": "{:,.0f}원",
        "저가": "{:,.0f}원",
        "종가": "{:,.0f}원",
        "거래량": "{:,.0f}주",
        "5선": "{:,.0f}원",
        "20선": "{:,.0f}원",
        "60선": "{:,.0f}원",
        "120선": "{:,.0f}원",
        "볼린저상단": "{:,.0f}원",
        "볼린저하단": "{:,.0f}원",
        "볼린저중심": "{:,.0f}원",
        "거래량5선": "{:,.0f}주",
        "거래량20선": "{:,.0f}주",
    }
    valid_format = {k: v for k, v in format_dict.items() if k in renamed_df.columns}

    st.dataframe(
        renamed_df.style.format(valid_format),
        use_container_width=True,
        height=420,
    )

with tab_cache:
    st.markdown("#### **로컬 Parquet 캐시 보관 현황**")
    if cache_info:
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("캐시 파일 용량", f"{cache_info['file_size_kb']} KB")
        c2.metric("총 데이터 수", f"{cache_info['row_count']:,} 개")
        c3.metric("데이터 시작일", cache_info['start_date'] or "-")
        c4.metric("데이터 종료일", cache_info['end_date'] or "-")

        st.info(
            f"📁 **캐시 파일 경로**: `data/cache/{selected_stock.symbol}_{selected_timeframe.value}.parquet`\n\n"
            f"🕒 **마지막 동기화 일시**: {cache_info['last_modified']}"
        )
    else:
        st.warning("현재 종목에 대한 로컬 캐시 파일이 존재하지 않습니다.")
