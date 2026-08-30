"use client"

import { useEffect, useRef } from "react"
import {
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts"
import type { IndicatorData, IndicatorToggles } from "@/lib/types"

type Props = {
  indicators?: IndicatorData | null
  toggles: IndicatorToggles
}

export function SubIndicatorChart({ indicators, toggles }: Props) {
  const rsiRef = useRef<HTMLDivElement>(null)
  const macdRef = useRef<HTMLDivElement>(null)
  const rsiChartRef = useRef<IChartApi | null>(null)
  const macdChartRef = useRef<IChartApi | null>(null)

  // RSI 차트
  useEffect(() => {
    if (!toggles.rsi || !rsiRef.current || !indicators) return

    const container = rsiRef.current
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#71717a",
        fontFamily: "var(--font-geist-sans), sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#e4e4e7", style: 1 },
        horzLines: { color: "#e4e4e7", style: 1 },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#e4e4e7" },
      timeScale: { borderColor: "#e4e4e7", timeVisible: true },
      autoSize: true,
    })

    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#ec4899", // 핑크
      lineWidth: 1.5,
      title: "RSI(14)",
    })

    rsiSeries.setData(
      indicators.rsi.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.value,
      })),
    )

    // 70 과매수, 30 과매도 기준선
    rsiSeries.createPriceLine({
      price: 70,
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "과매수(70)",
    })
    rsiSeries.createPriceLine({
      price: 30,
      color: "#3b82f6",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "과매도(30)",
    })

    rsiChartRef.current = chart
    return () => {
      chart.remove()
      rsiChartRef.current = null
    }
  }, [toggles.rsi, indicators])

  // MACD 차트
  useEffect(() => {
    if (!toggles.macd || !macdRef.current || !indicators) return

    const container = macdRef.current
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#71717a",
        fontFamily: "var(--font-geist-sans), sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#e4e4e7", style: 1 },
        horzLines: { color: "#e4e4e7", style: 1 },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#e4e4e7" },
      timeScale: { borderColor: "#e4e4e7", timeVisible: true },
      autoSize: true,
    })

    const histSeries = chart.addSeries(HistogramSeries, {
      title: "MACD Hist",
    })
    const macdSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1.5,
      title: "MACD",
    })
    const signalSeries = chart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 1.5,
      title: "Signal",
    })

    histSeries.setData(
      indicators.macd.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.histogram,
        color: p.histogram >= 0 ? "rgba(239, 68, 68, 0.6)" : "rgba(59, 130, 246, 0.6)",
      })),
    )

    macdSeries.setData(
      indicators.macd.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.macd,
      })),
    )

    signalSeries.setData(
      indicators.macd.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.signal,
      })),
    )

    macdChartRef.current = chart
    return () => {
      chart.remove()
      macdChartRef.current = null
    }
  }, [toggles.macd, indicators])

  if (!toggles.rsi && !toggles.macd) return null

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      {toggles.rsi && (
        <div className="relative h-32 w-full rounded-md border border-border/70 bg-card p-1">
          <div className="absolute left-2 top-1 z-10 text-[10px] font-bold text-muted-foreground">
            RSI (14)
          </div>
          <div ref={rsiRef} className="h-full w-full" />
        </div>
      )}
      {toggles.macd && (
        <div className="relative h-32 w-full rounded-md border border-border/70 bg-card p-1">
          <div className="absolute left-2 top-1 z-10 text-[10px] font-bold text-muted-foreground">
            MACD (12, 26, 9)
          </div>
          <div ref={macdRef} className="h-full w-full" />
        </div>
      )}
    </div>
  )
}
