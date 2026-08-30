"use client"

import { useEffect, useRef, useState } from "react"
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts"
import type { Candle, IndicatorData, IndicatorToggles, Timeframe } from "@/lib/types"
import { formatKRW, formatVolume, isMinuteTimeframe } from "@/lib/types"
import { cn } from "@/lib/utils"

// Lightweight-Charts 전용 안전한 표준 색상 상수 (lab/oklch 파싱 에러 방지)
const UP_COLOR = "#d6303b"
const DOWN_COLOR = "#2f5fd0"
const TEXT_COLOR = "#71717a"
const GRID_COLOR = "#e4e4e7"
const VOL_UP_COLOR = "rgba(214, 48, 59, 0.45)"
const VOL_DOWN_COLOR = "rgba(47, 95, 208, 0.45)"

type Props = {
  candles: Candle[]
  indicators?: IndicatorData | null
  toggles: IndicatorToggles
  timeframe: Timeframe
}

type HoverData = {
  timeStr: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  change: number
  changeRate: number
  ma5?: number
  ma20?: number
  ma60?: number
  ma120?: number
  x: number
  y: number
}

function formatTime(unixSec: number, isMin: boolean): string {
  const d = new Date(unixSec * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  if (isMin) {
    const hh = String(d.getHours()).padStart(2, "0")
    const mm = String(d.getMinutes()).padStart(2, "0")
    return `${y}.${m}.${day} ${hh}:${mm}`
  }
  return `${y}.${m}.${day}`
}

export function CandleChart({ candles, indicators, toggles, timeframe }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null)

  // 보조지표 시리즈 refs
  const ma5Ref = useRef<ISeriesApi<"Line"> | null>(null)
  const ma20Ref = useRef<ISeriesApi<"Line"> | null>(null)
  const ma60Ref = useRef<ISeriesApi<"Line"> | null>(null)
  const ma120Ref = useRef<ISeriesApi<"Line"> | null>(null)

  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null)
  const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null)
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null)

  // 캔들 길이 및 클램핑 상태 ref
  const candlesLenRef = useRef(candles.length)
  candlesLenRef.current = candles.length
  const isClampingRef = useRef(false)

  // 실시간 마우스 커서 호버 정보 상태
  const [hoverInfo, setHoverInfo] = useState<HoverData | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 460 })

  // 차트 1회 생성
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setContainerSize({
      width: container.clientWidth || 800,
      height: container.clientHeight || 460,
    })

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: TEXT_COLOR,
        fontFamily: "var(--font-geist-sans), -apple-system, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: GRID_COLOR, style: 1 },
        horzLines: { color: GRID_COLOR, style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { labelBackgroundColor: "#1e293b" },
        horzLine: { labelBackgroundColor: "#1e293b" },
      },
      rightPriceScale: {
        borderColor: GRID_COLOR,
        scaleMargins: { top: 0.12, bottom: 0.2 },
      },
      timeScale: {
        borderColor: GRID_COLOR,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3,
        fixRightEdge: true,
        fixLeftEdge: true,
        shiftVisibleRangeOnNewBar: true,
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: false,
        pinch: true,
        axisPressedMouseMove: true,
      },
      autoSize: true,
    })

    // 공통 천 단위 콤마(,) 가격 포맷터
    const KRW_PRICE_FORMAT = {
      type: "custom" as const,
      minMove: 1,
      formatter: (price: number) => Math.round(price).toLocaleString("ko-KR"),
    }

    // 1. 캔들 시리즈 (Y축 눈금 및 크로스헤어에 콤마 적용)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
      priceFormat: KRW_PRICE_FORMAT,
    })

    // 2. 거래량 시리즈
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    })
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    // 3. 이동평균선(MA 5, 20, 60, 120)
    const ma5 = chart.addSeries(LineSeries, {
      color: "#10b981", // 초록 (5일선)
      lineWidth: 1.5,
      title: "MA5",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: KRW_PRICE_FORMAT,
    })
    const ma20 = chart.addSeries(LineSeries, {
      color: "#f59e0b", // 주황/황금 (20일선 생명선)
      lineWidth: 2,
      title: "MA20",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: KRW_PRICE_FORMAT,
    })
    const ma60 = chart.addSeries(LineSeries, {
      color: "#8b5cf6", // 보라 (60일선 수급선)
      lineWidth: 1.5,
      title: "MA60",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: KRW_PRICE_FORMAT,
    })
    const ma120 = chart.addSeries(LineSeries, {
      color: "#64748b", // 그레이 (120일선 경기선)
      lineWidth: 1.5,
      title: "MA120",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: KRW_PRICE_FORMAT,
    })

    // 4. 볼린저 밴드(Upper, Middle, Lower)
    const bbUpper = chart.addSeries(LineSeries, {
      color: "rgba(59, 130, 246, 0.6)",
      lineWidth: 1,
      lineStyle: 2,
      title: "BB Upper",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: KRW_PRICE_FORMAT,
    })
    const bbMiddle = chart.addSeries(LineSeries, {
      color: "rgba(59, 130, 246, 0.9)",
      lineWidth: 1,
      title: "BB Mid",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: KRW_PRICE_FORMAT,
    })
    const bbLower = chart.addSeries(LineSeries, {
      color: "rgba(59, 130, 246, 0.6)",
      lineWidth: 1,
      lineStyle: 2,
      title: "BB Lower",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: KRW_PRICE_FORMAT,
    })

    // 마우스 커서 호버 시 해당 일자 상세 데이터 및 커서 좌표(x, y) 실시간 추적
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setHoverInfo(null)
        return
      }

      const cData = param.seriesData.get(candleSeries) as
        | { open: number; high: number; low: number; close: number }
        | undefined
      const vData = param.seriesData.get(volumeSeries) as { value: number } | undefined
      const m5Data = param.seriesData.get(ma5) as { value: number } | undefined
      const m20Data = param.seriesData.get(ma20) as { value: number } | undefined
      const m60Data = param.seriesData.get(ma60) as { value: number } | undefined
      const m120Data = param.seriesData.get(ma120) as { value: number } | undefined

      if (cData) {
        const change = cData.close - cData.open
        const changeRate = cData.open ? (change / cData.open) * 100 : 0
        setHoverInfo({
          timeStr: formatTime(Number(param.time), isMinuteTimeframe(timeframe)),
          open: cData.open,
          high: cData.high,
          low: cData.low,
          close: cData.close,
          volume: vData?.value ?? 0,
          change,
          changeRate,
          ma5: m5Data?.value,
          ma20: m20Data?.value,
          ma60: m60Data?.value,
          ma120: m120Data?.value,
          x: param.point.x,
          y: param.point.y,
        })
      }
    })

    // 차트 스크롤 범위 바운더리 제한
    const ts = chart.timeScale()
    ts.subscribeVisibleLogicalRangeChange((range) => {
      if (!range || isClampingRef.current) return
      const total = candlesLenRef.current
      if (total === 0) return

      const width = range.to - range.from
      let newFrom = range.from
      let newTo = range.to
      let needsClamp = false

      if (range.to > total + 3) {
        newTo = total + 3
        newFrom = Math.max(0, newTo - width)
        needsClamp = true
      }
      if (newFrom < -2) {
        newFrom = -2
        newTo = newFrom + width
        needsClamp = true
      }

      if (needsClamp) {
        isClampingRef.current = true
        ts.setVisibleLogicalRange({ from: newFrom, to: newTo })
        setTimeout(() => {
          isClampingRef.current = false
        }, 30)
      }
    })

    // Ctrl + 휠 = 커서 기준 확대/축소
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const currentRange = ts.getVisibleLogicalRange()
      if (!currentRange) return
      const total = candlesLenRef.current
      const width = currentRange.to - currentRange.from
      const rect = container.getBoundingClientRect()
      const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
      const pivot = currentRange.from + width * ratio
      const factor = e.deltaY > 0 ? 1.2 : 0.8
      const newWidth = Math.max(Math.min(width * factor, total + 10), 10)

      let nextFrom = pivot - newWidth * ratio
      let nextTo = pivot + newWidth * (1 - ratio)

      if (nextTo > total + 3) {
        nextTo = total + 3
        nextFrom = Math.max(0, nextTo - newWidth)
      }
      if (nextFrom < -2) {
        nextFrom = -2
        nextTo = nextFrom + newWidth
      }

      ts.setVisibleLogicalRange({
        from: nextFrom,
        to: nextTo,
      })
    }
    container.addEventListener("wheel", onWheel, { passive: false })

    chartRef.current = chart
    candleRef.current = candleSeries
    volumeRef.current = volumeSeries
    ma5Ref.current = ma5
    ma20Ref.current = ma20
    ma60Ref.current = ma60
    ma120Ref.current = ma120
    bbUpperRef.current = bbUpper
    bbMiddleRef.current = bbMiddle
    bbLowerRef.current = bbLower

    return () => {
      container.removeEventListener("wheel", onWheel)
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volumeRef.current = null
      ma5Ref.current = null
      ma20Ref.current = null
      ma60Ref.current = null
      ma120Ref.current = null
      bbUpperRef.current = null
      bbMiddleRef.current = null
      bbLowerRef.current = null
    }
  }, [timeframe])

  // 데이터 및 토글 갱신
  useEffect(() => {
    const container = containerRef.current
    const chart = chartRef.current
    const candleSeries = candleRef.current
    const volumeSeries = volumeRef.current
    if (!container || !chart || !candleSeries || !volumeSeries) return

    // 1. 캔들 데이터 세팅
    candleSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )

    // 2. 거래량 데이터 및 노출 여부
    if (toggles.vol) {
      volumeSeries.applyOptions({ visible: true })
      volumeSeries.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? VOL_UP_COLOR : VOL_DOWN_COLOR,
        })),
      )
    } else {
      volumeSeries.applyOptions({ visible: false })
    }

    // 3. 이평선 세팅
    const showMa = toggles.ma && Boolean(indicators)
    ma5Ref.current?.applyOptions({ visible: showMa })
    ma20Ref.current?.applyOptions({ visible: showMa })
    ma60Ref.current?.applyOptions({ visible: showMa })
    ma120Ref.current?.applyOptions({ visible: showMa })

    if (showMa && indicators) {
      ma5Ref.current?.setData(
        indicators.ma5.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })),
      )
      ma20Ref.current?.setData(
        indicators.ma20.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })),
      )
      ma60Ref.current?.setData(
        indicators.ma60.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })),
      )
      ma120Ref.current?.setData(
        indicators.ma120.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })),
      )
    }

    // 4. 볼린저 밴드 세팅
    const showBb = toggles.bb && Boolean(indicators)
    bbUpperRef.current?.applyOptions({ visible: showBb })
    bbMiddleRef.current?.applyOptions({ visible: showBb })
    bbLowerRef.current?.applyOptions({ visible: showBb })

    if (showBb && indicators) {
      bbUpperRef.current?.setData(
        indicators.bollinger.map((p) => ({ time: p.time as UTCTimestamp, value: p.upper })),
      )
      bbMiddleRef.current?.setData(
        indicators.bollinger.map((p) => ({ time: p.time as UTCTimestamp, value: p.middle })),
      )
      bbLowerRef.current?.setData(
        indicators.bollinger.map((p) => ({ time: p.time as UTCTimestamp, value: p.lower })),
      )
    }

    // 초기 표시 범위 설정 (최근 봉 위주)
    const visible = isMinuteTimeframe(timeframe) ? 120 : 160
    const total = candles.length
    if (total > visible) {
      chart.timeScale().setVisibleLogicalRange({
        from: total - visible,
        to: total + 3,
      })
    } else {
      chart.timeScale().fitContent()
    }
  }, [candles, indicators, toggles, timeframe])

  // 가장 최신 봉 기본값
  const latestCandle = candles[candles.length - 1]
  const displayData: HoverData | null =
    hoverInfo ??
    (latestCandle
      ? {
          timeStr: formatTime(latestCandle.time, isMinuteTimeframe(timeframe)),
          open: latestCandle.open,
          high: latestCandle.high,
          low: latestCandle.low,
          close: latestCandle.close,
          volume: latestCandle.volume,
          change: latestCandle.close - latestCandle.open,
          changeRate: latestCandle.open
            ? ((latestCandle.close - latestCandle.open) / latestCandle.open) * 100
            : 0,
          x: 0,
          y: 0,
        }
      : null)

  const isUp = displayData ? displayData.close >= displayData.open : true

  // 마우스 커서 바로 옆 플로팅 툴팁 좌표 계산
  const isRightSide = hoverInfo ? hoverInfo.x > containerSize.width * 0.68 : false
  const tooltipLeft = hoverInfo ? (isRightSide ? hoverInfo.x - 185 : hoverInfo.x + 18) : 0
  const tooltipTop = hoverInfo
    ? Math.max(10, Math.min(hoverInfo.y - 25, containerSize.height - 210))
    : 0

  return (
    <div className="relative flex flex-col h-full w-full">
      {/* 📌 상단 실시간 커서 호버 데이터 인포 바 */}
      {displayData && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-t-lg bg-muted/40 px-3 py-1.5 text-xs font-mono border-b border-border/60">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-foreground">📅 {displayData.timeStr}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-sans">종가</span>
              <span
                className={cn(
                  "font-bold text-sm tabular-nums",
                  isUp ? "text-[var(--up)]" : "text-[var(--down)]",
                )}
              >
                {formatKRW(displayData.close)}원
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  isUp ? "text-[var(--up)]" : "text-[var(--down)]",
                )}
              >
                ({isUp ? "+" : ""}
                {displayData.changeRate.toFixed(2)}%)
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-muted-foreground text-[11px]">
              <span>시 {formatKRW(displayData.open)}</span>
              <span>고 {formatKRW(displayData.high)}</span>
              <span>저 {formatKRW(displayData.low)}</span>
              <span>거래량 {formatVolume(displayData.volume)}</span>
            </div>
          </div>

          {/* 실시간 MA 값 노출 */}
          {toggles.ma && (
            <div className="flex items-center gap-2 text-[11px]">
              {displayData.ma5 && (
                <span className="text-[#10b981] font-semibold">
                  5선 {formatKRW(displayData.ma5)}
                </span>
              )}
              {displayData.ma20 && (
                <span className="text-[#f59e0b] font-semibold">
                  20선 {formatKRW(displayData.ma20)}
                </span>
              )}
              {displayData.ma60 && (
                <span className="text-[#8b5cf6] font-semibold hidden md:inline">
                  60선 {formatKRW(displayData.ma60)}
                </span>
              )}
              {displayData.ma120 && (
                <span className="text-[#64748b] font-semibold hidden md:inline">
                  120선 {formatKRW(displayData.ma120)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 차트 렌더링 컨테이너 */}
      <div className="relative flex-1 min-h-[460px] w-full">
        <div ref={containerRef} className="h-full w-full min-h-[460px]" />

        {/* 📌 [요청 구현] 마우스 커서 바로 옆에 실시간으로 따라다니는 HTS 스타일 플로팅 툴팁 카드 */}
        {hoverInfo && (
          <div
            className="pointer-events-none absolute z-30 flex flex-col gap-1 rounded-lg border border-border/80 bg-background/95 p-2.5 shadow-xl backdrop-blur-md font-mono text-xs w-[175px] transition-transform duration-75"
            style={{
              left: `${tooltipLeft}px`,
              top: `${tooltipTop}px`,
            }}
          >
            {/* 날짜 */}
            <div className="flex items-center justify-between border-b border-border/60 pb-1 text-[11px]">
              <span className="text-muted-foreground font-sans font-medium">날짜</span>
              <span className="font-bold text-foreground">{hoverInfo.timeStr}</span>
            </div>

            {/* 종가 */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground font-sans font-medium">종가</span>
              <span
                className={cn(
                  "font-bold text-sm tabular-nums",
                  hoverInfo.close >= hoverInfo.open ? "text-[var(--up)]" : "text-[var(--down)]",
                )}
              >
                {formatKRW(hoverInfo.close)}
              </span>
            </div>

            {/* 거래량 */}
            <div className="flex items-center justify-between py-0.5 text-[11px]">
              <span className="text-muted-foreground font-sans font-medium">거래량</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatVolume(hoverInfo.volume)}
              </span>
            </div>

            {/* 이동평균선(MA5, MA20, MA60, MA120) */}
            {toggles.ma && (
              <div className="mt-1 flex flex-col gap-1 border-t border-border/50 pt-1 text-[11px]">
                {hoverInfo.ma5 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-sans">5일선</span>
                    <span className="text-[#10b981] font-bold tabular-nums">
                      {formatKRW(hoverInfo.ma5)}
                    </span>
                  </div>
                )}
                {hoverInfo.ma20 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-sans">20일선</span>
                    <span className="text-[#f59e0b] font-bold tabular-nums">
                      {formatKRW(hoverInfo.ma20)}
                    </span>
                  </div>
                )}
                {hoverInfo.ma60 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-sans">60일선</span>
                    <span className="text-[#8b5cf6] font-bold tabular-nums">
                      {formatKRW(hoverInfo.ma60)}
                    </span>
                  </div>
                )}
                {hoverInfo.ma120 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-sans">120일선</span>
                    <span className="text-[#64748b] font-bold tabular-nums">
                      {formatKRW(hoverInfo.ma120)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 📌 상단 고정 이평선 범례 */}
        <div className="pointer-events-none absolute left-2 top-2 sm:left-3 sm:top-3 flex items-center gap-1.5 sm:gap-2 rounded-lg bg-background/90 px-2 py-1 text-[10px] sm:text-[11px] font-mono shadow-xs backdrop-blur-md border border-border/70 max-w-[90%] overflow-x-auto whitespace-nowrap">
          {toggles.ma && (
            <>
              <span className="flex items-center gap-1 text-[#10b981] font-bold" title="5일 이동평균선">
                <span className="inline-block size-1.5 sm:size-2 rounded-full bg-[#10b981]" />
                MA5<span className="hidden sm:inline font-sans font-normal text-[10px] text-muted-foreground">(5일선)</span>
              </span>
              <span className="flex items-center gap-1 text-[#f59e0b] font-bold" title="20일 이동평균선">
                <span className="inline-block size-1.5 sm:size-2 rounded-full bg-[#f59e0b]" />
                MA20<span className="hidden sm:inline font-sans font-normal text-[10px] text-muted-foreground">(20일선)</span>
              </span>
              <span className="hidden xs:flex items-center gap-1 text-[#8b5cf6] font-bold" title="60일 이동평균선">
                <span className="inline-block size-1.5 sm:size-2 rounded-full bg-[#8b5cf6]" />
                MA60<span className="hidden sm:inline font-sans font-normal text-[10px] text-muted-foreground">(60일선)</span>
              </span>
              <span className="hidden md:flex items-center gap-1 text-[#64748b] font-bold" title="120일 이동평균선">
                <span className="inline-block size-1.5 sm:size-2 rounded-full bg-[#64748b]" />
                MA120
              </span>
            </>
          )}
          {toggles.bb && (
            <span className="flex items-center gap-1 text-blue-500 font-bold">
              <span className="inline-block size-1.5 sm:size-2 rounded-full bg-blue-500" />
              BB<span className="hidden sm:inline font-sans font-normal text-[10px] text-muted-foreground">(20,2)</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
