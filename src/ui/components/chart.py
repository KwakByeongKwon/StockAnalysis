"""v0.dev 스타일의 인터랙티브 멀티 보조지표(RSI / MACD / Volume / MA / Bollinger) 주식 차트 컴포넌트."""

from typing import List, Optional
from datetime import timedelta
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
    show_rsi: bool = False,
    show_macd: bool = False,
) -> go.Figure:
    """선택된 보조지표(거래량, RSI, MACD 등)에 맞추어 동적으로 서브플롯을 구성하는 고성능 차트 Figure를 반환합니다."""
    if df.empty:
        fig = go.Figure()
        fig.add_annotation(
            text="동기화된 시계열 데이터가 없습니다. 상단 '데이터 동기화' 버튼을 눌러주세요.",
            xref="paper",
            yref="paper",
            x=0.5,
            y=0.5,
            showarrow=False,
            font=dict(size=14, color="#71717A"),
        )
        return fig

    if ma_periods is None:
        ma_periods = [5, 20, 60, 120]

    is_minute = timeframe in [
        TimeFrame.MINUTE_1,
        TimeFrame.MINUTE_3,
        TimeFrame.MINUTE_5,
        TimeFrame.MINUTE_10,
        TimeFrame.MINUTE_30,
        TimeFrame.MINUTE_60,
    ]

    # v0.dev 스타일 컬러 팔레트
    UP_COLOR = "#D6303B"    # 상승 (레드)
    DOWN_COLOR = "#2F5FD0"  # 하락 (블루)
    
    MA_COLORS = {
        5: "#10B981",    # 5선: 에메랄드
        20: "#EF4444",   # 20선: 레드
        60: "#F59E0B",   # 60선: 앰버
        120: "#8B5CF6",  # 120선: 퍼플
        200: "#3B82F6",  # 200선: 블루
    }

    # 서브플롯 행 구성
    rows = 1
    row_heights = [0.70]
    volume_row = None
    rsi_row = None
    macd_row = None

    if show_volume:
        rows += 1
        volume_row = rows
        row_heights.append(0.15)

    if show_rsi and "RSI" in df.columns:
        rows += 1
        rsi_row = rows
        row_heights.append(0.15)

    if show_macd and "MACD" in df.columns:
        rows += 1
        macd_row = rows
        row_heights.append(0.15)

    # 행 높이 정규화
    total_h = sum(row_heights)
    normalized_heights = [h / total_h for h in row_heights]

    fig = make_subplots(
        rows=rows,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.025,
        row_heights=normalized_heights,
    )

    # 1. 메인 캔들스틱 차트 (Row 1)
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

    # 볼린저 밴드
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
                fillcolor="rgba(47, 95, 208, 0.05)",
                name="볼린저 하단",
                hoverinfo="skip",
                showlegend=False,
            ),
            row=1,
            col=1,
        )

    # 이동평균선
    if show_ma:
        for ma in ma_periods:
            col_name = f"MA_{ma}"
            if col_name in df.columns:
                fig.add_trace(
                    go.Scatter(
                        x=df.index,
                        y=df[col_name],
                        mode="lines",
                        line=dict(color=MA_COLORS.get(ma, "#71717A"), width=1.5),
                        name=f"{ma}선",
                        hoverinfo="skip",
                        showlegend=False,
                    ),
                    row=1,
                    col=1,
                )

    # 최고가 / 최저가 어노테이션
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
            arrowcolor="#2563EB",
            ax=0,
            ay=-22,
            font=dict(size=11, color="#2563EB"),
            bgcolor="rgba(255, 255, 255, 0.95)",
            bordercolor="rgba(37, 99, 235, 0.3)",
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
            arrowcolor="#DC2626",
            ax=0,
            ay=22,
            font=dict(size=11, color="#DC2626"),
            bgcolor="rgba(255, 255, 255, 0.95)",
            bordercolor="rgba(220, 38, 38, 0.3)",
            borderwidth=1,
            borderpad=3,
            row=1,
            col=1,
        )
    except Exception:
        pass

    # 2. 거래량 서브플롯
    if volume_row and "volume" in df.columns:
        price_diff = df["close"].diff().fillna(0)
        vol_colors = [
            "rgba(214, 48, 59, 0.65)" if diff >= 0 else "rgba(47, 95, 208, 0.65)"
            for diff in price_diff
        ]

        fig.add_trace(
            go.Bar(
                x=df.index,
                y=df["volume"],
                marker_color=vol_colors,
                name="거래량",
                showlegend=False,
                hoverinfo="none",
            ),
            row=volume_row,
            col=1,
        )

    # 3. RSI 서브플롯
    if rsi_row and "RSI" in df.columns:
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["RSI"],
                mode="lines",
                line=dict(color="#8B5CF6", width=1.5),
                name="RSI (14)",
                hoverinfo="none",
                showlegend=False,
            ),
            row=rsi_row,
            col=1,
        )
        # 70 과매수, 30 과매도 기준선
        fig.add_hline(y=70, line_dash="dot", line_color="#EF4444", line_width=1, row=rsi_row, col=1)
        fig.add_hline(y=30, line_dash="dot", line_color="#3B82F6", line_width=1, row=rsi_row, col=1)

    # 4. MACD 서브플롯
    if macd_row and "MACD" in df.columns:
        hist_colors = [
            "rgba(214, 48, 59, 0.7)" if v >= 0 else "rgba(47, 95, 208, 0.7)"
            for v in df["MACD_hist"]
        ]
        fig.add_trace(
            go.Bar(
                x=df.index,
                y=df["MACD_hist"],
                marker_color=hist_colors,
                name="MACD 오실레이터",
                showlegend=False,
                hoverinfo="none",
            ),
            row=macd_row,
            col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["MACD"],
                mode="lines",
                line=dict(color="#0284C7", width=1.5),
                name="MACD",
                showlegend=False,
                hoverinfo="none",
            ),
            row=macd_row,
            col=1,
        )
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df["MACD_signal"],
                mode="lines",
                line=dict(color="#F97316", width=1.5),
                name="Signal",
                showlegend=False,
                hoverinfo="none",
            ),
            row=macd_row,
            col=1,
        )

    # 5. 정밀 호버 툴팁
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
        rsi_val = f"{row.get('RSI', np.nan):.1f}" if not pd.isna(row.get('RSI')) else "-"

        tooltip_html = (
            f"<b>일자</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {dt_str}<br>"
            f"<b>종가</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style='color:{UP_COLOR if row['close']>=row['open'] else DOWN_COLOR}; font-weight:bold;'>{c_price}원</span><br>"
            f"<b>시가</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {o_price}원<br>"
            f"<b>고가</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {h_price}원<br>"
            f"<b>저가</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {l_price}원<br>"
            f"<b>거래량</b> &nbsp;&nbsp;&nbsp; {vol}주<br>"
            f"<span style='color:{MA_COLORS[5]}'>■</span> <b>5선</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {ma5}<br>"
            f"<span style='color:{MA_COLORS[20]}'>■</span> <b>20선</b> &nbsp;&nbsp;&nbsp;&nbsp; {ma20}<br>"
            f"<span style='color:{MA_COLORS[60]}'>■</span> <b>60선</b> &nbsp;&nbsp;&nbsp;&nbsp; {ma60}<br>"
            f"<span style='color:{MA_COLORS[120]}'>■</span> <b>120선</b> &nbsp;&nbsp; {ma120}<br>"
            f"<b>RSI</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {rsi_val}"
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

    # 6. 상단 이평선 범례
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
        font=dict(size=12, color="#09090B"),
    )

    # 7. 레이아웃 설정
    tick_format = "%H:%M" if is_minute else "%y.%m.%d"
    total_chart_height = 620 + (100 if show_rsi else 0) + (100 if show_macd else 0)

    if not is_minute and len(df) > 200:
        initial_start = df.index[-250] if len(df) >= 250 else df.index[0]
        initial_end = df.index[-1] + timedelta(days=5)
        xaxis_range = [initial_start, initial_end]
    else:
        xaxis_range = None

    fig.update_layout(
        template="plotly_white",
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
        margin=dict(l=10, r=65, t=20, b=15),
        height=total_chart_height,
        dragmode="pan",  # 마우스 드래그 Pan
        hovermode="x",
        hoverlabel=dict(
            bgcolor="rgba(255, 255, 255, 0.98)",
            bordercolor="#E4E4E7",
            font=dict(size=12, color="#09090B"),
            align="left",
        ),
        xaxis=dict(
            showspikes=True,
            spikemode="across",
            spikesnap="cursor",
            spikethickness=1,
            spikedash="solid",
            spikecolor="#A1A1AA",
            rangeslider_visible=False,
            range=xaxis_range,
        ),
        yaxis=dict(
            side="right",
            showspikes=True,
            spikemode="across",
            spikesnap="cursor",
            spikethickness=1,
            spikedash="solid",
            spikecolor="#A1A1AA",
        ),
    )

    fig.update_xaxes(
        gridcolor="#F4F4F5",
        gridwidth=1,
        showline=True,
        linecolor="#E4E4E7",
        tickformat=tick_format,
        tickfont=dict(size=11, color="#71717A"),
    )

    fig.update_yaxes(
        gridcolor="#F4F4F5",
        gridwidth=1,
        showline=True,
        linecolor="#E4E4E7",
        tickformat=",",
        side="right",
        tickfont=dict(size=11, color="#71717A"),
    )

    return fig
