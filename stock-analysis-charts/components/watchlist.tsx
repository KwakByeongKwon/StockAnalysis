"use client"

import { Star, Trash2 } from "lucide-react"
import { STOCK_MASTER } from "@/lib/stock-master"
import { cn } from "@/lib/utils"

type Props = {
  favorites: string[]
  selectedCode: string
  onSelect: (code: string) => void
  onRemove: (code: string) => void
}

export function Watchlist({ favorites, selectedCode, onSelect, onRemove }: Props) {
  const favoriteStocks = favorites
    .map((code) => STOCK_MASTER.find((s) => s.code === code))
    .filter((s): s is (typeof STOCK_MASTER)[number] => Boolean(s))

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Star className="size-4 fill-amber-500 text-amber-500" />
          관심종목 ({favoriteStocks.length})
        </h2>
        <span className="text-[11px] text-muted-foreground">클릭 시 즉시 전환</span>
      </div>

      {favoriteStocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
          <p>등록된 관심종목이 없습니다.</p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">
            상단 별표(★)를 눌러 관심종목에 추가해보세요.
          </p>
        </div>
      ) : (
        <ul className="my-2 divide-y divide-border/60 max-h-56 overflow-y-auto pr-1">
          {favoriteStocks.map((stock) => {
            const isSelected = stock.code === selectedCode
            return (
              <li
                key={stock.code}
                className={cn(
                  "flex items-center justify-between py-2 px-2 rounded-md transition-colors cursor-pointer group",
                  isSelected ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted/60",
                )}
                onClick={() => onSelect(stock.code)}
              >
                <div className="flex flex-col">
                  <span className="text-xs text-foreground font-medium group-hover:text-primary">
                    {stock.name}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <span className="rounded bg-muted px-1 py-0.2">{stock.market}</span>
                    <span>{stock.code}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(stock.code)
                  }}
                  className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-muted transition-all"
                  title="관심종목 삭제"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
