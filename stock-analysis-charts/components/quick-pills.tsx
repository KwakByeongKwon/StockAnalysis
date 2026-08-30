"use client"

import { cn } from "@/lib/utils"

export const POPULAR_STOCKS = [
  { code: "005930", name: "삼성전자", market: "KOSPI" },
  { code: "000660", name: "SK하이닉스", market: "KOSPI" },
  { code: "035420", name: "NAVER", market: "KOSPI" },
  { code: "005380", name: "현대차", market: "KOSPI" },
  { code: "068270", name: "셀트리온", market: "KOSPI" },
  { code: "247540", name: "에코프로비엠", market: "KOSDAQ" },
  { code: "086520", name: "에코프로", market: "KOSDAQ" },
  { code: "035720", name: "카카오", market: "KOSPI" },
]

type Props = {
  selectedCode: string
  onSelect: (code: string) => void
}

export function QuickPills({ selectedCode, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
      <span className="shrink-0 font-bold text-muted-foreground flex items-center gap-1">
        ⚡ 인기종목:
      </span>
      <div className="flex items-center gap-1.5">
        {POPULAR_STOCKS.map((stock) => {
          const isSelected = stock.code === selectedCode
          return (
            <button
              key={stock.code}
              type="button"
              onClick={() => onSelect(stock.code)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {stock.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
