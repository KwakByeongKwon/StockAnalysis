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
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between md:px-6">
        {/* 좌측 로고 */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-black text-base text-primary-foreground shadow-sm">
            S
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-black tracking-tight text-foreground">
              StockAnalysis
            </span>
            <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-extrabold text-primary border border-primary/20">
              PRO
            </span>
          </div>
        </div>

        {/* 우측 검색창 & 데이터 최신화 버튼 */}
        <div className="flex flex-1 items-center justify-end gap-3 sm:max-w-2xl">
          <StockSearch selectedCode={selectedCode} onSelect={onSelect} />
          <SyncButton
            selectedCode={selectedCode}
            lastSyncedAt={lastSyncedAt}
            onSynced={onSynced}
          />
        </div>
      </div>
    </header>
  )
}
