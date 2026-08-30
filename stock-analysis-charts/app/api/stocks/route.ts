import { NextResponse } from "next/server"
import { getMarketRankings } from "@/lib/rankings-service"
import { STOCK_MASTER, registerDynamicStock } from "@/lib/stock-master"
import type { StockMeta } from "@/lib/types"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim().toLowerCase()

  try {
    // 1. 2,700+개 전종목 풀에서 실시간 검색
    const rankingRes = await getMarketRankings({
      search: q,
      pageSize: 40,
      category: "volume",
      market: "ALL",
    })

    const dynamicResults: StockMeta[] = rankingRes.items.map((it) => {
      registerDynamicStock(it.code, it.name, it.market)
      return {
        code: it.code,
        name: it.name,
        market: it.market,
        listedAt: "2000-01-01",
      }
    })

    // 2. 기본 마스터와 결합 및 중복 제거
    const combinedMap = new Map<string, StockMeta>()
    for (const s of dynamicResults) {
      combinedMap.set(s.code, s)
    }
    for (const s of STOCK_MASTER) {
      if (!q || s.name.toLowerCase().includes(q) || s.code.includes(q)) {
        if (!combinedMap.has(s.code)) {
          combinedMap.set(s.code, s)
        }
      }
    }

    const results = Array.from(combinedMap.values()).slice(0, 25)
    return NextResponse.json({ results })
  } catch (err: any) {
    // 폴백
    const fallback = STOCK_MASTER.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.code.includes(q),
    ).slice(0, 20)
    return NextResponse.json({ results: fallback })
  }
}
