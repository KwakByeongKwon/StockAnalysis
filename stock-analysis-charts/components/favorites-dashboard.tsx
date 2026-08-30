"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Bookmark,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import type { AIPredictionReport, Quote, StockMeta } from "@/lib/types"
import { formatKRW, formatVolume } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  favorites: string[]
  onSelectStock: (code: string) => void
  onToggleFavorite: (code: string) => void
}

// 각 즐겨찾기 종목의 시세 및 AI 예측 미니 카드 컴포넌트 (카드 전체 클릭 지원)
function FavoriteCard({
  code,
  onSelect,
  onRemove,
}: {
  code: string
  onSelect: (code: string) => void
  onRemove: (code: string) => void
}) {
  const { data: quoteData } = useSWR<{ quote: Quote }>(`/api/stocks/${code}/quote`, fetcher)
  const { data: aiData } = useSWR<{ prediction: AIPredictionReport }>(
    `/api/stocks/${code}/ai`,
    fetcher,
  )

  const quote = quoteData?.quote
  const prediction = aiData?.prediction

  if (!quote) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs animate-pulse min-h-[180px] flex items-center justify-center text-xs text-muted-foreground">
        종목 데이터 로드 중 ({code})...
      </div>
    )
  }

  const isUp = quote.change >= 0
  const isAiUp = prediction?.direction === "UP"

  return (
    <div
      onClick={() => onSelect(code)}
      className="group relative rounded-xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-primary/80 hover:shadow-lg hover:scale-[1.01] flex flex-col justify-between cursor-pointer"
      title={`${quote.name} 클릭 시 정밀 차트 & Gemini AI 분석 화면으로 이동합니다`}
    >
      {/* 상단: 종목명, 시장, 즐겨찾기 해제 버튼 */}
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors">
              {quote.name}
            </h3>
            <span
              className={cn(
                "rounded px-1.5 py-0.2 text-[10px] font-bold font-mono",
                quote.market === "KOSPI"
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {quote.market}
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{quote.code}</span>
        </div>

        {/* 즐겨찾기 별표 버튼 (클릭 시 카드 전체 클릭 이벤트 전파 차단) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(code)
          }}
          className="text-amber-500 hover:text-muted-foreground p-1.5 rounded-md hover:bg-muted/80 transition-colors z-10 cursor-pointer"
          title="즐겨찾기에서 제거"
        >
          <Star className="size-4 fill-amber-500" />
        </button>
      </div>

      {/* 중단: 현재가 및 등락률 */}
      <div className="my-3 flex items-baseline justify-between">
        <div>
          <div className="text-2xl font-black font-mono text-foreground">
            {formatKRW(quote.price)}원
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-bold font-mono mt-0.5",
              isUp ? "text-[var(--up)]" : "text-[var(--down)]",
            )}
          >
            {isUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            <span>
              {isUp ? "+" : ""}
              {formatKRW(quote.change)}원 ({isUp ? "+" : ""}
              {quote.changeRate.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="text-right text-[11px] text-muted-foreground font-mono">
          <div>거래량 {formatVolume(quote.volume)}</div>
          <div>PER {quote.per ? `${quote.per}배` : "-"}</div>
        </div>
      </div>

      {/* 하단: AI 주가 등락 예측 요약 */}
      <div className="mt-2 rounded-lg bg-muted/40 p-2.5 border border-border/70 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-bold text-foreground">
            <Sparkles className="size-3 text-primary" /> Gemini AI 예측:
          </span>
          {prediction ? (
            <span
              className={cn(
                "font-bold text-[11px] px-1.5 py-0.2 rounded font-mono",
                isAiUp ? "bg-[var(--up)]/10 text-[var(--up)]" : "bg-[var(--down)]/10 text-[var(--down)]",
              )}
            >
              {prediction.directionLabel} ({prediction.probability}%)
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground animate-pulse">분석 중...</span>
          )}
        </div>

        {prediction && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>목표가: {formatKRW(prediction.targetPrice)}원</span>
            <span className={isAiUp ? "text-[var(--up)] font-bold" : "text-[var(--down)] font-bold"}>
              ({prediction.expectedReturn >= 0 ? "+" : ""}{prediction.expectedReturn}%)
            </span>
          </div>
        )}
      </div>

      {/* 차트 & 퀀트 분석 바로가기 버튼 */}
      <div className="mt-3.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 group-hover:bg-primary px-3 py-2 text-xs font-bold text-primary group-hover:text-primary-foreground transition-all shadow-2xs">
        <BarChart2 className="size-3.5" />
        <span>정밀 차트 & AI 리포트 보기</span>
      </div>
    </div>
  )
}

export function FavoritesDashboard({ favorites, onSelectStock, onToggleFavorite }: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<StockMeta[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // 즐겨찾기 추가 검색 실행
  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/stocks?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddStock = (code: string) => {
    if (!favorites.includes(code)) {
      onToggleFavorite(code)
    }
    setSearchQuery("")
    setSearchResults([])
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* 🌟 메인 헤더 & 즐겨찾기 종목 추가 검색 바 */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <Star className="size-5 sm:size-6 fill-amber-500" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black text-foreground">
                나의 즐겨찾기 포트폴리오
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                등록된 관심종목의 <b>실시간 시세와 Google Gemini AI 주가 등락 예측</b>을 한눈에 모아봅니다.
              </p>
            </div>
          </div>
        </div>

        {/* 🔍 새로운 종목 즐겨찾기 추가 검색창 */}
        <div className="relative w-full md:w-80">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs focus-within:ring-2 focus-within:ring-primary shadow-2xs">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="종목명/코드 검색 후 바로 ⭐ 추가"
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* 검색 드롭다운 결과 */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-border bg-popover p-1.5 shadow-xl max-h-60 overflow-y-auto">
              {searchResults.map((s) => {
                const isFav = favorites.includes(s.code)
                return (
                  <div
                    key={s.code}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/70 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{s.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{s.code}</span>
                      <span className="rounded bg-muted px-1 text-[10px] font-mono">{s.market}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddStock(s.code)}
                      disabled={isFav}
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold transition-all",
                        isFav
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer",
                      )}
                    >
                      <Star className={cn("size-3", isFav && "fill-amber-500 text-amber-500")} />
                      <span>{isFav ? "등록됨" : "⭐ 추가"}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 📊 즐겨찾기 종목 카드 그리드 (카드 어디든 클릭 시 이동) */}
      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center flex flex-col items-center justify-center gap-3">
          <Star className="size-10 text-muted-foreground/40" />
          <h3 className="text-base font-bold text-foreground">아직 등록된 즐겨찾기 종목이 없습니다.</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            상단 검색창이나 시장 랭킹 화면에서 관심 있는 종목의 ⭐ 아이콘을 눌러 나만의 즐겨찾기 포트폴리오를 만들어보세요!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favorites.map((code) => (
            <FavoriteCard
              key={code}
              code={code}
              onSelect={onSelectStock}
              onRemove={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
