"use client"

import type { Quote } from "@/lib/types"
import { formatEok, formatKRW, formatRatio, formatVolume } from "@/lib/types"

export function QuoteStats({ quote }: { quote: Quote }) {
  const sections = [
    {
      title: "가격 및 변동",
      items: [
        { label: "시가", value: quote.open ? `${formatKRW(quote.open)} 원` : "-" },
        { label: "고가", value: quote.high ? `${formatKRW(quote.high)} 원` : "-" },
        { label: "저가", value: quote.low ? `${formatKRW(quote.low)} 원` : "-" },
        { label: "전일 종가", value: quote.prevClose ? `${formatKRW(quote.prevClose)} 원` : "-" },
      ],
    },
    {
      title: "규모 및 유동성",
      items: [
        { label: "거래량", value: quote.volume ? `${formatVolume(quote.volume)} 주` : "-" },
        { label: "시가총액", value: quote.marketCap ? `${formatEok(quote.marketCap)} 원` : "-" },
        { label: "52주 최고", value: quote.high52 ? `${formatKRW(quote.high52)} 원` : "-" },
        { label: "52주 최저", value: quote.low52 ? `${formatKRW(quote.low52)} 원` : "-" },
      ],
    },
    {
      title: "밸류에이션 / 수익성",
      items: [
        { label: "PER", value: formatRatio(quote.per, "배") },
        { label: "PBR", value: formatRatio(quote.pbr, "배") },
        { label: "EPS", value: quote.eps ? `${formatKRW(quote.eps)} 원` : "-" },
        { label: "BPS", value: quote.bps ? `${formatKRW(quote.bps)} 원` : "-" },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-bold text-foreground">12대 핵심 재무 & 퀀트 팩터</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1.5">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {sec.title}
            </div>
            <dl className="space-y-1.5 font-mono text-xs">
              {sec.items.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between border-b border-border/40 pb-1"
                >
                  <dt className="text-muted-foreground font-sans">{r.label}</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
