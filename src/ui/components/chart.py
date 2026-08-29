"""네이버페이 증권 및 HTS 스타일의 한국형 인터랙티브 주식 차트 컴포넌트.

한국 주식 시장 색상 규칙(상승: 빨간색, 하락: 파란색)을 따르며,
네이버 증권 특유의 화이트 테마, 이동평균선(5일 초록, 20일 빨강, 60일 주황, 120일 보라),
최고가/최저가 자동 뱃지, 마우스 드래그(Pan) 및 휠 스크롤 줌을 지원합니다.
"""

from typing import List, Optional
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from src.models.stock import TimeFrame


def create_stock_chart(
    df: pd.DataFrame,
    symbol: str,
    stock_name: str,
    timeframe: TimeFrame = TimeFrame.DAY,
    show_ma: bool = True,
    ma_periods: Optional[List[int]] = None,
    show_bollinger: bool = False,
    show_volume: bool = True,
) -> go.Figure:
    """네이버 증권 스타일의 인터랙티브 주식 차트 Figure 객체를 생성합니다.

    Args:
        df: DatetimeIndex를 가진 OHLCV 데이터프레임
        symbol: 종목코드
        stock_name: 종목명
        timeframe: 선택된 봉 주기
        show_ma: 이동평균선 표시 여부
        ma_periods: 표시할 이동평균 기간 목록 (기본: [5, 20, 60, 120])
        show_bollinger: 볼린저 밴드 표시 여부
        show_volume: 하단 거래량 서브플롯 표시 여부

    Returns:
        Plotly Figure 객체
    """
    if df.empty:
        fig = go.Figure()
        fig.add_annotation(
            text="표시할 시계열 데이터가 없습니다.",
            xref="paper",
            yref="paper",
            x=0.5,
            y=0.5,
            showarrow=False,
            font=dict(size=15, color="#888888"),
        )
        return fig

    if ma_periods is None:
        ma_periods = [5, 20, 60, 120]

    # 분봉 여부 판단
    is_minute = timeframe in [
        TimeFrame.MINUTE_1,
        TimeFrame.MINUTE_3,
        TimeFrame.MINUTE_5,
        TimeFrame.MINUTE_10,
        TimeFrame.MINUTE_30,
        TimeFrame.MINUTE_60,
    ]

    # 한국 증시 / 네이버 증권 컬러 팔레트
    UP_COLOR = "#E53935"    # 상승 빨강
    DOWN_COLOR = "#1E88E5"  # 하락 파랑
    
    # 이동평균선 네이버 증권 컬러
    MA_COLORS = {
        5: "#26A69A",    # 5일: 녹색/청록
        20: "#E53935",   # 20일: 빨간색
        60: "#FB8C00",   # 60일: 주황색
        120: "#8E24AA",  # 120일: 보라색
        200: "#3949AB",  # 200일: 남색
    }

    # 서브플롯 생성 (Row 1: 캔들스틱, Row 2: 거래량)
    if show_volume:
        fig = make_subplots(
            rows=2,
            cols=1,
            shared_xaxes=True,
            vertical_spacing=0.03,
            row_heights=[0.75, 0.25],
        )
    else:
        fig = make_subplots(rows=1, cols=1)

    # 1. 캔들스틱 차트
    candlestick = go.Candlestick(
        x=df.index,
        open=df["open"],
        high=df["high"],
        low=df["low"],
        close=df["close"],
        name="주가",
        increasing_line_color=UP_COLOR,
        increasing_fillcolor=UP_COLOR,
        decreasing_line_color=DOWN_COLOR,
        decreasing_fillcolor=DOWN_COLOR,
        increasing_line_width=1,
        decreasing_line_width=1,
        showlegend=False,
        hoverinfo="none",
    )
    fig.add_trace(candlestick, row=1, col=1)

    # 2. 볼린저 밴드 오버레이
    if show_bollinger and "BB_upper" in df.columns and "BB_lower" in df.columns:
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["BB_upper"],
                mode="lines",
                line=dict(color="rgba(160, 160, 160, 0.4)", width=1),
                name="볼린저 상단",
                hoverinfo="skip",
                showlegend=False,
            ),
            row=1,
            col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["BB_lower"],
                mode="lines",
                line=dict(color="rgba(160, 160, 160, 0.4)", width=1),
                fill="tonexty",
                fillcolor="rgba(33, 150, 243, 0.05)",
                name="볼린저 하단",
                hoverinfo="skip",
                showlegend=False,
            ),
            row=1,
            col=1,
        )

    # 3. 이동평균선 오버레이
    if show_ma:
        for ma in ma_periods:
            col_name = f"MA_{ma}"
            if col_name in df.columns:
                fig.add_trace(
                    go.Scatter(
                        x=df.index,
                        y=df[col_name],
                        mode="lines",
                        line=dict(color=MA_COLORS.get(ma, "#888888"), width=1.5),
                        name=f"{ma}선",
                        hoverinfo="skip",
                        showlegend=False,
                    ),
                    row=1,
                    col=1,
                )

    # 4. 최고가 / 최저가 자동 어노테이션 (네이버 증권 스타일)
    try:
        max_idx = df["high"].idxmax()
        max_val = df.loc[max_idx, "high"]
        min_idx = df["low"].idxmin()
        min_val = df.loc[min_idx, "low"]
        last_close = df["close"].iloc[-1]

        max_diff_rate = ((last_close - max_val) / max_val) * 100
        min_diff_rate = ((last_close - min_val) / min_val) * 100

        fig.add_annotation(
            x=max_idx,
            y=max_val,
            text=f"▼ 최고 <b>{max_val:,.0f}</b> ({max_diff_rate:+.2f}%)",
            showarrow=True,
            arrowhead=2,
            arrowsize=1,
            arrowwidth=1,
            arrowcolor="#1565C0",
            ax=0,
            ay=-25,
            font=dict(size=11, color="#1565C0", family="Malgun Gothic, Apple SD Gothic Neo, sans-serif"),
            bgcolor="rgba(255, 255, 255, 0.9)",
            bordercolor="rgba(21, 101, 192, 0.3)",
            borderwidth=1,
            borderpad=3,
            row=1,
            col=1,
        )

        fig.add_annotation(
            x=min_idx,
            y=min_val,
            text=f"▲ 최저 <b>{min_val:,.0f}</b> ({min_diff_rate:+.2f}%)",
            showarrow=True,
            arrowhead=2,
            arrowsize=1,
            arrowwidth=1,
            arrowcolor="#C62828",
            ax=0,
            ay=25,
            font=dict(size=11, color="#C62828", family="Malgun Gothic, Apple SD Gothic Neo, sans-serif"),
            bgcolor="rgba(255, 255, 255, 0.9)",
            bordercolor="rgba(198, 40, 40, 0.3)",
            borderwidth=1,
            borderpad=3,
            row=1,
            col=1,
        )
    except Exception:
        pass

    # 5. 거래량 바 차트
    if show_volume and "volume" in df.columns:
        price_diff = df["close"].diff().fillna(0)
        vol_colors = [UP_COLOR if diff >= 0 else DOWN_COLOR for diff in price_diff]

        fig.add_trace(
            go.Bar(
                x=df.index,
                y=df["volume"],
                marker_color=vol_colors,
                name="거래량",
                opacity=0.75,
                showlegend=False,
                hoverinfo="none",
            ),
            row=2,
            col=1,
        )

    # 6. 통합 한글 툴팁(Hover) 투명 트레이스
    hover_text = []
    for idx, row in df.iterrows():
        dt_str = idx.strftime("%Y.%m.%d %H:%M") if is_minute else idx.strftime("%Y.%m.%d")
        c_price = f"{row['close']:,.0f}"
        o_price = f"{row['open']:,.0f}"
        h_price = f"{row['high']:,.0f}"
        l_price = f"{row['low']:,.0f}"
        vol = f"{int(row['volume']):,}"
        ma5 = f"{row.get('MA_5', np.nan):,.0f}" if not pd.isna(row.get('MA_5')) else "-"
        ma20 = f"{row.get('MA_20', np.nan):,.0f}" if not pd.isna(row.get('MA_20')) else "-"
        ma60 = f"{row.get('MA_60', np.nan):,.0f}" if not pd.isna(row.get('MA_60')) else "-"
        ma120 = f"{row.get('MA_120', np.nan):,.0f}" if not pd.isna(row.get('MA_120')) else "-"

        tooltip_html = (
            f"<b>날짜/시간</b> &nbsp; {dt_str}<br>"
            f"<b>종가</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style='color:{UP_COLOR if row['close']>=row['open'] else DOWN_COLOR}; font-weight:bold;'>{c_price}원</span><br>"
            f"<b>시가</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {o_price}원<br>"
            f"<b>고가</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {h_price}원<br>"
            f"<b>저가</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {l_price}원<br>"
            f"<b>거래량</b> &nbsp;&nbsp;&nbsp; {vol}주<br>"
            f"<span style='color:{MA_COLORS[5]}'>■</span> <b>5선</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {ma5}<br>"
            f"<span style='color:{MA_COLORS[20]}'>■</span> <b>20선</b> &nbsp;&nbsp;&nbsp;&nbsp; {ma20}<br>"
            f"<span style='color:{MA_COLORS[60]}'>■</span> <b>60선</b> &nbsp;&nbsp;&nbsp;&nbsp; {ma60}<br>"
            f"<span style='color:{MA_COLORS[120]}'>■</span> <b>120선</b> &nbsp;&nbsp; {ma120}"
        )
        hover_text.append(tooltip_html)

    fig.add_trace(
        go.Scatter(
            x=df.index,
            y=df["close"],
            mode="markers",
            marker=dict(size=0, opacity=0),
            hoverinfo="text",
            hovertext=hover_text,
            showlegend=False,
            name="상세",
        ),
        row=1,
        col=1,
    )

    # 7. 네이버 증권 스타일 상단 이동평균 색상 범례
    fig.add_annotation(
        xref="paper",
        yref="paper",
        x=0.005,
        y=0.99,
        text=(
            "<b>이동평균</b> "
            f"<span style='color:{MA_COLORS[5]}; font-weight:700;'>5</span> "
            f"<span style='color:{MA_COLORS[20]}; font-weight:700;'>20</span> "
            f"<span style='color:{MA_COLORS[60]}; font-weight:700;'>60</span> "
            f"<span style='color:{MA_COLORS[120]}; font-weight:700;'>120</span>"
        ),
        showarrow=False,
        align="left",
        font=dict(size=13, color="#333333", family="Malgun Gothic, Apple SD Gothic Neo, sans-serif"),
    )

    # 8. 거래량 영역 상단 라벨
    if show_volume:
        latest_vol = int(df["volume"].iloc[-1]) if not df.empty else 0
        fig.add_annotation(
            xref="paper",
            yref="paper",
            x=0.005,
            y=0.25,
            text=f"<b>거래량</b> &nbsp;{latest_vol:,}",
            showarrow=False,
            align="left",
            font=dict(size=12, color="#444444", family="Malgun Gothic, Apple SD Gothic Neo, sans-serif"),
        )

    # 9. 레이아웃 스타일링 (화이트 테마 + 드래그 Pan + 마우스 휠 스크롤 줌)
    tick_format = "%H:%M" if is_minute else "%y.%m.%d"

    fig.update_layout(
        template="plotly_white",
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
        margin=dict(l=10, r=65, t=30, b=25),
        height=620,
        dragmode="pan",  # 마우스로 꾹 누르고 드래그 시 즉시 좌우 이동(Pan)
        hovermode="x",
        hoverlabel=dict(
            bgcolor="rgba(255, 255, 255, 0.96)",
            bordercolor="#D1D5DB",
            font=dict(size=12, color="#1F2937", family="Malgun Gothic, Apple SD Gothic Neo, sans-serif"),
            align="left",
        ),
        xaxis=dict(
            showspikes=True,
            spikemode="across",
            spikesnap="cursor",
            spikethickness=1,
            spikedash="solid",
            spikecolor="#94A3B8",
            rangeslider_visible=False,  # 아래 여백을 차지하는 레인지슬라이더 제거
        ),
        yaxis=dict(
            side="right",
            showspikes=True,
            spikemode="across",
            spikesnap="cursor",
            spikethickness=1,
            spikedash="solid",
            spikecolor="#94A3B8",
        ),
    )

    # X축 그리드 및 포맷
    fig.update_xaxes(
        gridcolor="#F1F5F9",
        gridwidth=1,
        showline=True,
        linecolor="#E2E8F0",
        tickformat=tick_format,
        tickfont=dict(size=11, color="#64748B"),
    )

    # Y축 그리드 및 포맷 (우측 배치)
    fig.update_yaxes(
        gridcolor="#F1F5F9",
        gridwidth=1,
        showline=True,
        linecolor="#E2E8F0",
        tickformat=",",
        side="right",
        tickfont=dict(size=11, color="#64748B"),
    )

    return fig
