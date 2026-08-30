"use client"

import type { OrderBookData } from "@/lib/types"
import { formatKRW } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  orderbook?: OrderBookData | null
}

export function OrderBook({ orderbook }: Props) {
  if (!orderbook) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        호가 데이터를 불러오는 중...
      </div>
    )
  }

  const maxVolume = Math.max(
    ...orderbook.asks.map((a) => a.volume),
    ...orderbook.bids.map((b) => b.volume),
    1,
  )

  const askTotal = orderbook.totalAskVolume
  const bidTotal = orderbook.totalBidVolume
  const total = askTotal + bidTotal || 1
  const bidRatio = Math.round((bidTotal / total) * 100)

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          실시간 10단계 호가
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">체결강도</span>
          <span
            className={cn(
              "font-mono text-xs font-bold",
              orderbook.strength >= 100 ? "text-[var(--up)]" : "text-[var(--down)]",
            )}
          >
            {orderbook.strength.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 호가 리스트 */}
      <div className="my-2 flex flex-col font-mono text-xs">
        {/* 매도 5호가 (Ask 5 ~ Ask 1) */}
        {orderbook.asks.map((ask) => {
          const barWidth = `${Math.min(100, Math.round((ask.volume / maxVolume) * 100))}%`
          return (
            <div
              key={ask.price}
              className="relative flex items-center justify-between py-1 px-2 hover:bg-muted/40 transition-colors"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-blue-500/10 dark:bg-blue-500/20 pointer-events-none"
                style={{ width: barWidth }}
              />
              <div className="z-10 flex items-center gap-1">
                <span className="font-bold text-[var(--down)]">{formatKRW(ask.price)}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({ask.changeRate > 0 ? "+" : ""}{ask.changeRate.toFixed(2)}%)
                </span>
              </div>
              <span className="z-10 text-[11px] text-muted-foreground">
                {ask.volume.toLocaleString()}
              </span>
            </div>
          )
        })}

        {/* 현재가 분계선 */}
        <div className="my-1 flex items-center justify-between border-y border-dashed border-border bg-muted/30 py-1.5 px-2">
          <span className="text-[11px] font-bold text-foreground">현재가</span>
          <span className="font-bold text-foreground text-sm">
            {formatKRW(orderbook.currentPrice)}원
          </span>
        </div>

        {/* 매수 5호가 (Bid 1 ~ Bid 5) */}
        {orderbook.bids.map((bid) => {
          const barWidth = `${Math.min(100, Math.round((bid.volume / maxVolume) * 100))}%`
          return (
            <div
              key={bid.price}
              className="relative flex items-center justify-between py-1 px-2 hover:bg-muted/40 transition-colors"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-red-500/10 dark:bg-red-500/20 pointer-events-none"
                style={{ width: barWidth }}
              />
              <div className="z-10 flex items-center gap-1">
                <span className="font-bold text-[var(--up)]">{formatKRW(bid.price)}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({bid.changeRate > 0 ? "+" : ""}{bid.changeRate.toFixed(2)}%)
                </span>
              </div>
              <span className="z-10 text-[11px] text-muted-foreground">
                {bid.volume.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>

      {/* 하단 총 잔량 & 비율 바 */}
      <div className="border-t border-border pt-2 text-[11px]">
        <div className="flex justify-between font-mono text-muted-foreground mb-1">
          <span>매도총잔량 {askTotal.toLocaleString()}</span>
          <span>매수총잔량 {bidTotal.toLocaleString()}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-500/30 flex">
          <div className="bg-blue-500 transition-all" style={{ width: `${100 - bidRatio}%` }} />
          <div className="bg-red-500 transition-all" style={{ width: `${bidRatio}%` }} />
        </div>
      </div>
    </div>
  )
}
