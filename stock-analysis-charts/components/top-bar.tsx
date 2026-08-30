"use client"

import { StockSearch } from "@/components/stock-search"
import { SyncButton } from "@/components/sync-button"

type Props = {
  selectedCode: string
  lastSyncedAt?: string | null
  onSelect: (code: string) => void
  onSynced: () => void | Promise<void>
}

export function TopBar({ selectedCode, lastSyncedAt, onSelect, onSynced }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2.5 px-3 py-2 sm:px-6">
        {/* 좌측 로고 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-primary font-black text-sm sm:text-base text-primary-foreground shadow-xs">
            S
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm sm:text-lg font-black tracking-tight text-foreground">
              StockAnalysis
            </span>
            <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] sm:text-[10px] font-extrabold text-primary border border-primary/20">
              PRO
            </span>
          </div>
        </div>

        {/* 우측 검색창 & 데이터 최신화 버튼 */}
        <div className="flex flex-1 items-center justify-end gap-2 max-w-xl">
          <div className="flex-1 max-w-md">
            <StockSearch selectedCode={selectedCode} onSelect={onSelect} />
          </div>
          <div className="shrink-0">
            <SyncButton
              selectedCode={selectedCode}
              lastSyncedAt={lastSyncedAt}
              onSynced={onSynced}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
