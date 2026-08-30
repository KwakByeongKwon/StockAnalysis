"use client"

import { useState } from "react"
import { Clock, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

type SyncInfo = { ok: boolean; live: boolean; totalBars: number; syncedAt: string; message: string }

type Props = {
  selectedCode: string
  lastSyncedAt?: string | null
  onSynced: () => void | Promise<void>
}

function formatSyncTime(isoStr?: string | null): string | null {
  if (!isoStr) return null
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
}

export function SyncButton({ selectedCode, lastSyncedAt, onSynced }: Props) {
  const [loading, setLoading] = useState(false)
  const [syncedTime, setSyncedTime] = useState<string | null>(null)

  async function sync() {
    setLoading(true)
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: selectedCode }),
      })
      const data = (await res.json()) as SyncInfo
      if (data.syncedAt) {
        setSyncedTime(data.syncedAt)
      }
      await onSynced()
    } finally {
      setLoading(false)
    }
  }

  const activeTimeStr = formatSyncTime(syncedTime || lastSyncedAt)

  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 whitespace-nowrap">
      {/* 데스크톱 전용 동기화 일시 뱃지 */}
      <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs border border-border/70 shadow-2xs">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
        <Clock className="size-3 text-muted-foreground" />
        <span className="font-mono text-[11px] font-semibold text-foreground">
          {activeTimeStr ? activeTimeStr : "미동기화"}
        </span>
      </div>

      {/* 데이터 최신화 버튼 (모바일에서는 심플 아이콘, 데스크톱에서는 텍스트 포함) */}
      <button
        type="button"
        onClick={sync}
        disabled={loading}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 sm:px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60 cursor-pointer"
        title="이전 동기화 시점부터 오늘까지의 최신 데이터 증분 최신화"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
        <span className="hidden sm:inline">{loading ? "최신화 중..." : "데이터 최신화"}</span>
      </button>
    </div>
  )
}
