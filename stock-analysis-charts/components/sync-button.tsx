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

  // 동기화 버튼 클릭 시점 또는 DB에서 넘어온 이전 동기화 일시
  const activeTimeStr = formatSyncTime(syncedTime || lastSyncedAt)

  return (
    <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
      {/* 🟢 한 줄 인라인 이전 동기화 일시 뱃지 (YYYY-MM-DD HH:mm:ss) */}
      <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-xs border border-border/70 shadow-2xs">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
        <Clock className="size-3 text-muted-foreground" />
        <span className="font-mono text-[11px] font-semibold text-foreground">
          {activeTimeStr ? activeTimeStr : "미동기화"}
        </span>
      </div>

      {/* 데이터 최신화 버튼 */}
      <button
        type="button"
        onClick={sync}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60 whitespace-nowrap"
        title="이전 동기화 시점부터 오늘까지의 최신 데이터만 증분 최신화"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
        <span>{loading ? "최신화 중..." : "데이터 최신화"}</span>
      </button>
    </div>
  )
}
