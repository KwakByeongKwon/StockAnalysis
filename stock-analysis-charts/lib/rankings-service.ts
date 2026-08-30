import type { MarketFilter, RankingCategory, RankingItem, RankingResponse } from "./types"

type StockPoolEntry = {
  code: string
  name: string
  market: "KOSPI" | "KOSDAQ"
  price: number
  change: number
  changeRate: number
  volume: number
  marketCap: number // 억 원
}

let cachedPool: StockPoolEntry[] = []
let lastFetchedTime = 0
const POOL_TTL = 30_000 // 30초 캐시
let isFetching = false

/**
 * 네이버 모바일 API에서 1개 시장의 대량 종목 시세를 병렬 수집합니다.
 */
async function fetchMarketStocks(market: "KOSPI" | "KOSDAQ", pageCount = 10): Promise<StockPoolEntry[]> {
  const pageArray = Array.from({ length: pageCount }, (_, i) => i + 1)
  const promises = pageArray.map(async (page) => {
    const url = `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${page}&pageSize=100`
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        cache: "no-store",
      })
      if (!res.ok) return []
      const data = await res.json()
      const stocks = data?.stocks || []

      return stocks.map((s: any): StockPoolEntry => {
        const parseNum = (v: any) => (v ? Number(String(v).replaceAll(",", "")) : 0)
        const price = parseNum(s.closePrice)
        const change = parseNum(s.compareToPreviousClosePrice)
        const changeRate = Number(s.fluctuationsRatio) || 0
        const volume = parseNum(s.accumulatedTradingVolume)
        const marketCap = Math.round(parseNum(s.marketValue) / 100_000_000)

        return {
          code: s.itemCode,
          name: s.stockName,
          market,
          price,
          change,
          changeRate,
          volume,
          marketCap,
        }
      })
    } catch {
      return []
    }
  })

  const results = await Promise.all(promises)
  return results.flat()
}

/**
 * 전종목 시세 풀(KOSPI 1000개 + KOSDAQ 1000개 = 총 2,000+개 종목)을 갱신합니다.
 */
async function getOrRefreshStockPool(): Promise<StockPoolEntry[]> {
  const now = Date.now()
  if (cachedPool.length > 0 && now - lastFetchedTime < POOL_TTL) {
    return cachedPool
  }

  if (isFetching && cachedPool.length > 0) {
    return cachedPool
  }

  isFetching = true
  try {
    const [kospi, kosdaq] = await Promise.all([
      fetchMarketStocks("KOSPI", 12), // 1,200개 종목
      fetchMarketStocks("KOSDAQ", 15), // 1,500개 종목
    ])

    const merged = [...kospi, ...kosdaq].filter((s) => s.price > 0 && s.name)
    if (merged.length > 0) {
      cachedPool = merged
      lastFetchedTime = now
    }
  } catch (err) {
    console.error("Error refreshing stock pool:", err)
  } finally {
    isFetching = false
  }

  return cachedPool
}

/**
 * [전종목 지원] 시장 랭킹 및 스크리너 쿼리 서비스
 */
export async function getMarketRankings(params: {
  category?: RankingCategory
  market?: MarketFilter
  page?: number
  pageSize?: number
  search?: string
}): Promise<RankingResponse> {
  const {
    category = "volume",
    market = "ALL",
    page = 1,
    pageSize = 50,
    search = "",
  } = params

  const pool = await getOrRefreshStockPool()

  // 1. 시장 필터링
  let filtered = pool
  if (market === "KOSPI") {
    filtered = filtered.filter((s) => s.market === "KOSPI")
  } else if (market === "KOSDAQ") {
    filtered = filtered.filter((s) => s.market === "KOSDAQ")
  }

  // 2. 검색어 필터링
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    filtered = filtered.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.includes(q),
    )
  }

  // 3. 4대 카테고리 정렬
  if (category === "volume") {
    // 거래량 상위 (내림차순)
    filtered.sort((a, b) => b.volume - a.volume)
  } else if (category === "rise") {
    // 상승률 상위 (내림차순)
    filtered.sort((a, b) => b.changeRate - a.changeRate)
  } else if (category === "fall") {
    // 하락률 상위 (오름차순)
    filtered.sort((a, b) => a.changeRate - b.changeRate)
  } else if (category === "marketCap") {
    // 시가총액 상위 (내림차순)
    filtered.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
  }

  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  // 4. 절대 순위 부여 후 페이징 슬라이스
  const rankedAll: RankingItem[] = filtered.map((item, idx) => ({
    rank: idx + 1,
    code: item.code,
    name: item.name,
    market: item.market,
    price: item.price,
    change: item.change,
    changeRate: item.changeRate,
    volume: item.volume,
    marketCap: item.marketCap,
  }))

  const startIdx = (safePage - 1) * pageSize
  const pageItems = rankedAll.slice(startIdx, startIdx + pageSize)

  return {
    ok: true,
    category,
    market,
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
    items: pageItems,
    updatedAt: new Date(lastFetchedTime || Date.now()).toISOString(),
  }
}
