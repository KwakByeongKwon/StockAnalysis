"use client"

import { ArrowDown, ArrowUp, Download, Star } from "lucide-react"
import type { Quote, Timeframe } from "@/lib/types"
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
  isFavorite: boolean
  onToggleFavorite: (code: string) => void
}

export function QuoteHeader({ quote, timeframe, isFavorite, onToggleFavorite }: Props) {
  const change = quote.change ?? 0
  const changeRate = quote.changeRate ?? 0
  const up = change > 0
  const down = change < 0
  const sign = up ? "+" : ""

  const handleDownloadCsv = () => {
    window.open(`/api/stocks/${quote.code}/export?tf=${timeframe}`, "_blank")
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleFavorite(quote.code)}
          className={cn(
            "mt-1 rounded p-1 transition-colors hover:bg-muted",
            isFavorite ? "text-amber-500" : "text-muted-foreground hover:text-foreground",
          )}
          title={isFavorite ? "관심종목 해제" : "관심종목 추가"}
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
          <div className={cn("text-3xl font-extrabold tabular-nums tracking-tight", trendClass(change))}>
            {formatKRW(quote.price)}
            <span className="ml-1 text-base font-medium text-muted-foreground">원</span>
          </div>
          <div className={cn("flex items-center gap-1 text-sm font-bold tabular-nums", trendClass(change))}>
            {up && <ArrowUp className="size-4 stroke-[3]" aria-hidden />}
            {down && <ArrowDown className="size-4 stroke-[3]" aria-hidden />}
            <span>
              {sign}
              {formatKRW(change)}
            </span>
            <span>
              ({sign}
              {changeRate.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted active:scale-95"
            title="현재 주기 캔들 CSV 다운로드"
          >
            <Download className="size-3.5" />
            <span>CSV 저장</span>
          </button>
        </div>
      </div>
    </div>
  )
}
