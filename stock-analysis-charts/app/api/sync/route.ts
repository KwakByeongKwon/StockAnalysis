import { NextResponse } from "next/server"
import { syncStockData } from "@/lib/real-stock-service"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const symbol = body?.code || "005930" // 기본 삼성전자 또는 전달받은 종목

    const result = await syncStockData(symbol)
    return NextResponse.json({
      ok: true,
      live: true,
      stockCount: 1,
      totalBars: result.totalBars,
      syncedAt: result.lastSyncedAt,
      message: result.message,
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Sync failed" },
      { status: 500 },
    )
  }
}
