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

      const node = document.getElementById("analysis-dashboard-area")
      if (!node) {
        window.print()
        return
      }

      const dataUrl = await toPng(node, {
        quality: 0.95,
        backgroundColor: "#09090b",
        cacheBust: true,
      })

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
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 sm:p-5 text-foreground shadow-xs">
      {/* 🖨️ [인쇄/스냅샷 요약 바] */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex size-6 sm:size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs shrink-0">
            AI
          </span>
          <div className="min-w-0 truncate">
            <h2 className="text-xs sm:text-sm font-black text-foreground truncate">
              {quote.name} ({quote.code}) AI 정밀 진단
            </h2>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              일시: <b className="font-mono text-foreground">{currentDateStr}</b> · 주기: {timeframe}
            </p>
          </div>
        </div>

        {/* 핵심 요약 뱃지 3종 (모바일에서 한 줄 줄바꿈 없이 스크롤 or 그리드) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 whitespace-nowrap text-[11px] font-mono">
          <div className="rounded-lg bg-background px-2 py-1 border border-border shrink-0 flex items-center gap-1">
            <span className="text-muted-foreground text-[10px] font-sans">현재가:</span>
            <span className="font-bold text-foreground">{formatKRW(quote.price)}원</span>
            <span className={cn("font-bold text-[10px]", trendClass(change))}>
              ({sign}{changeRate.toFixed(2)}%)
            </span>
          </div>

          <div className="rounded-lg bg-background px-2 py-1 border border-border shrink-0 flex items-center gap-1">
            <span className="text-muted-foreground text-[10px] font-sans">목표가:</span>
            <span className="font-bold text-primary">
              {prediction ? `${formatKRW(prediction.targetPrice)}원` : "-"}
            </span>
            {prediction && (
              <span className="text-[10px] text-primary font-bold">
                ({prediction.expectedReturn >= 0 ? "+" : ""}{prediction.expectedReturn}%)
              </span>
            )}
          </div>

          <div className="rounded-lg bg-background px-2 py-1 border border-border shrink-0 flex items-center gap-1">
            <span className="text-muted-foreground text-[10px] font-sans">예상:</span>
            <span className="font-bold text-foreground">
              {prediction ? `${prediction.directionLabel} (${prediction.probability}%)` : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* 💻 Quote Header 메인 바 */}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <button
              type="button"
              onClick={() => onToggleFavorite(quote.code)}
              className={cn(
                "rounded-lg p-1.5 transition-colors hover:bg-muted print:hidden shrink-0 cursor-pointer",
                isFavorite ? "text-amber-500" : "text-muted-foreground hover:text-foreground",
              )}
              title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            >
              <Star className={cn("size-5 sm:size-6", isFavorite && "fill-amber-500")} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10px] font-bold",
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
              <h1 className="mt-0.5 text-xl sm:text-2xl font-black tracking-tight text-foreground truncate">
                {quote.name}
              </h1>
            </div>
          </div>

          {/* 모바일에서 우측에 바로 배치되는 현재가 */}
          <div className="flex flex-col items-end sm:hidden shrink-0">
            <div className={cn("text-2xl font-black tabular-nums tracking-tight font-mono whitespace-nowrap", trendClass(change))}>
              {formatKRW(quote.price)}
              <span className="ml-0.5 text-xs font-medium text-muted-foreground">원</span>
            </div>
            <div className={cn("flex items-center gap-0.5 text-xs font-bold tabular-nums font-mono whitespace-nowrap", trendClass(change))}>
              {up && <ArrowUp className="size-3.5 stroke-[3]" />}
              {down && <ArrowDown className="size-3.5 stroke-[3]" />}
              <span>{sign}{formatKRW(change)}원 ({sign}{changeRate.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

        {/* 데스크톱 전용 현재가 & 캡처 버튼 */}
        <div className="hidden sm:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <div className={cn("text-3xl font-extrabold tabular-nums tracking-tight font-mono whitespace-nowrap", trendClass(change))}>
              {formatKRW(quote.price)}
              <span className="ml-1 text-base font-medium text-muted-foreground">원</span>
            </div>
            <div className={cn("flex items-center gap-1 text-sm font-bold tabular-nums font-mono whitespace-nowrap", trendClass(change))}>
              {up && <ArrowUp className="size-4 stroke-[3]" />}
              {down && <ArrowDown className="size-4 stroke-[3]" />}
              <span>{sign}{formatKRW(change)}원 ({sign}{changeRate.toFixed(2)}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleCaptureImage}
              disabled={isCapturing}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95 whitespace-nowrap",
                isDone
                  ? "bg-emerald-500 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {isCapturing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>캡처 중...</span>
                </>
              ) : isDone ? (
                <>
                  <Check className="size-4" />
                  <span>저장 완료!</span>
                </>
              ) : (
                <>
                  <Camera className="size-4" />
                  <span>보고서 저장</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
