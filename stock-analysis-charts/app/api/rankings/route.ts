import { NextResponse } from "next/server"
import { getMarketRankings } from "@/lib/rankings-service"
import type { MarketFilter, RankingCategory } from "@/lib/types"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = (searchParams.get("category") || "volume") as RankingCategory
  const market = (searchParams.get("market") || "ALL") as MarketFilter
  const page = Number(searchParams.get("page") || "1")
  const pageSize = Number(searchParams.get("pageSize") || "50")
  const search = searchParams.get("search") || ""

  try {
    const result = await getMarketRankings({
      category,
      market,
      page,
      pageSize,
      search,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to fetch rankings" },
      { status: 500 },
    )
  }
}
