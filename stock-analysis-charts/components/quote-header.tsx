"use client"

import { useState } from "react"
import { toPng } from "html-to-image"
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  Download,
  FileImage,
  FileText,
  Loader2,
  Printer,
  Star,
} from "lucide-react"
import type { AIPredictionReport, Quote, Timeframe } from "@/lib/types"
import { formatKRW } from "@/lib/types"
import { cn } from "@/lib/utils"

function trendClass(v?: number | null) {
  if (!v) return "text-muted-foreground"
  if (v > 0) return "text-[var(--up)]"
  if (v < 0) return "text-[var(--down)]"
  return "text-muted-foreground"
}

type Props = {
  quote: Quote
  timeframe: Timeframe
  prediction?: AIPredictionReport | null
  isFavorite: boolean
  onToggleFavorite: (code: string) => void
}

export function QuoteHeader({ quote, timeframe, prediction, isFavorite, onToggleFavorite }: Props) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [snapshotDate, setSnapshotDate] = useState<string>("")

  const change = quote.change ?? 0
  const changeRate = quote.changeRate ?? 0
  const up = change > 0
  const down = change < 0
  const sign = up ? "+" : ""

  // 📸 현재 분석 화면을 고화질 PNG 이미지 캡처본으로 즉시 저장
  const handleCaptureImage = async () => {
    try {
      setIsCapturing(true)
      const now = new Date()
      const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
      const fileDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`
      setSnapshotDate(formatted)

      // 캡처 대상 엘리먼트 (분석 대시보드 전체)
      const node = document.getElementById("analysis-dashboard-area")
      if (!node) {
        window.print()
        return
      }

      // 고화질 PNG 렌더링
      const dataUrl = await toPng(node, {
        quality: 0.95,
        backgroundColor: "#09090b", // 다크 테마 배경 유지
        cacheBust: true,
      })

      // 파일 자동 다운로드 트리거
      const link = document.createElement("a")
      link.download = `${quote.name}_AI분석보고서_${fileDate}.png`
      link.href = dataUrl
      link.click()

      setIsDone(true)
      setTimeout(() => setIsDone(false), 2500)
    } catch (err) {
      console.error("Capture failed, falling back to print:", err)
      window.print()
    } finally {
      setIsCapturing(false)
    }
  }

  const currentDateStr = snapshotDate || new Date().toISOString().replace("T", " ").slice(0, 19)

  return (
    <>
      {/* 🖨️ [인쇄/캡처 전용 헤더] 저장 당시 날짜, 당시 주가, 예상 목표 주가 요약 바 */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-foreground shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs">
              AI
            </span>
            <div>
              <h2 className="text-sm font-black text-foreground">
                {quote.name} ({quote.code}) AI 정밀 진단 스냅샷
              </h2>
              <p className="text-[11px] text-muted-foreground">
                저장 기준 일시: <b className="font-mono text-foreground">{currentDateStr}</b> · 주기: {timeframe}
              </p>
            </div>
          </div>

          {/* 핵심 요약 뱃지 3종 */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="rounded-md bg-background px-2.5 py-1 border border-border">
              <span className="text-muted-foreground text-[10px] mr-1 font-sans">당시 주가:</span>
              <span className="font-bold text-foreground">{formatKRW(quote.price)}원</span>
              <span className={cn("ml-1 font-bold text-[11px]", trendClass(change))}>
                ({sign}{changeRate.toFixed(2)}%)
              </span>
            </div>

            <div className="rounded-md bg-background px-2.5 py-1 border border-border">
              <span className="text-muted-foreground text-[10px] mr-1 font-sans">예상 목표가:</span>
              <span className="font-bold text-primary">
                {prediction ? `${formatKRW(prediction.targetPrice)}원` : "-"}
              </span>
              <span className="ml-1 text-[11px] text-primary font-bold">
                ({prediction ? `${prediction.expectedReturn >= 0 ? "+" : ""}${prediction.expectedReturn}%` : ""})
              </span>
            </div>

            <div className="rounded-md bg-background px-2.5 py-1 border border-border">
              <span className="text-muted-foreground text-[10px] mr-1 font-sans">AI 예상:</span>
              <span className="font-bold text-foreground">
                {prediction ? `${prediction.directionLabel} (${prediction.probability}%)` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* 💻 [일반 웹 헤더] Quote Header 메인 바 */}
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => onToggleFavorite(quote.code)}
              className={cn(
                "mt-1 rounded p-1 transition-colors hover:bg-muted print:hidden cursor-pointer",
                isFavorite ? "text-amber-500" : "text-muted-foreground hover:text-foreground",
              )}
              title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            >
              <Star className={cn("size-5", isFavorite && "fill-amber-500")} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-bold",
                    quote.market === "KOSPI"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {quote.market || "KOSPI"}
                </span>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {quote.code}
                </span>
              </div>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight text-foreground">
                {quote.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between sm:justify-end gap-4 sm:gap-6">
            <div className="flex flex-col items-start sm:items-end">
              <div className={cn("text-3xl font-extrabold tabular-nums tracking-tight font-mono", trendClass(change))}>
                {formatKRW(quote.price)}
                <span className="ml-1 text-base font-medium text-muted-foreground">원</span>
              </div>
              <div className={cn("flex items-center gap-1 text-sm font-bold tabular-nums font-mono", trendClass(change))}>
                {up && <ArrowUp className="size-4 stroke-[3]" aria-hidden />}
                {down && <ArrowDown className="size-4 stroke-[3]" aria-hidden />}
                <span>
                  {sign}
                  {formatKRW(change)}원
                </span>
                <span>
                  ({sign}
                  {changeRate.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* 📸 보고서 형태로 저장 (고화질 캡처 PNG 다운로드) 버튼 */}
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleCaptureImage}
                disabled={isCapturing}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95",
                  isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                title="현재 날짜, 주가, 예상 목표가가 담긴 고화질 분석 캡처본(PNG)을 다운로드합니다."
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>보고서 캡처 중...</span>
                  </>
                ) : isDone ? (
                  <>
                    <Check className="size-4" />
                    <span>캡처본 저장 완료!</span>
                  </>
                ) : (
                  <>
                    <Camera className="size-4" />
                    <span>보고서 형태로 저장</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
