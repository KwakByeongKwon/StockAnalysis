"use client"

import { useEffect, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Flame,
  LineChart,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react"
import type { MarketFilter, RankingCategory, RankingItem, RankingResponse } from "@/lib/types"
import { formatEok, formatKRW, formatVolume } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  onSelectStock: (code: string) => void
}

const CATEGORIES: { id: RankingCategory; label: string; icon: any; color: string; desc: string }[] = [
  { id: "volume", label: "거래량 상위", icon: Flame, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", desc: "당일 시장에서 가장 많은 수량이 체결된 종목 순위" },
  { id: "rise", label: "상승률 상위", icon: TrendingUp, color: "text-red-500 bg-red-500/10 border-red-500/20", desc: "당일 상한가 및 주가 급등률 순위" },
  { id: "marketCap", label: "시가총액 상위", icon: Trophy, color: "text-purple-500 bg-purple-500/10 border-purple-500/20", desc: "기업 가치 및 시가총액 규모 순위" },
]

export function MarketScreener({ onSelectStock }: Props) {
  const [category, setCategory] = useState<RankingCategory>("volume")
  const [market, setMarket] = useState<MarketFilter>("ALL")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const [data, setData] = useState<RankingResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // 검색 시 1페이지로 리셋
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // 필터 변경 시 1페이지로 리셋
  const handleCategoryChange = (cat: RankingCategory) => {
    setCategory(cat)
    setPage(1)
  }

  const handleMarketChange = (m: MarketFilter) => {
    setMarket(m)
    setPage(1)
  }

  async function loadRankings() {
    setLoading(true)
    try {
      const q = encodeURIComponent(debouncedSearch)
      const res = await fetch(
        `/api/rankings?category=${category}&market=${market}&page=${page}&pageSize=${pageSize}&search=${q}`,
      )
      const json = (await res.json()) as RankingResponse
      if (json.ok) {
        setData(json)
      }
    } catch (err) {
      console.error("Error loading rankings:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRankings()
  }, [category, market, page, pageSize, debouncedSearch])

  const items = data?.items || []
  const totalCount = data?.totalCount || 0
  const totalPages = data?.totalPages || 1
  const currentPage = data?.page || 1

  const activeCategoryInfo = CATEGORIES.find((c) => c.id === category)
  const top1 = currentPage === 1 && !debouncedSearch ? items[0] : null

  // 페이지 번호 생성 로직 (현재 페이지 기준 앞뒤 2개씩)
  const getPageNumbers = () => {
    const delta = 2
    const start = Math.max(1, currentPage - delta)
    const end = Math.min(totalPages, currentPage + delta)
    const pages: number[] = []
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. 상단 타이틀 & 랭킹 카테고리 탭 */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary font-black text-primary-foreground shadow-xs">
              <Trophy className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                국내 전종목 실시간 시장 랭킹 & 종목 탐색기
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  전체 2,500+개 상장사
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {activeCategoryInfo?.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data?.updatedAt && (
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                {new Date(data.updatedAt).toLocaleTimeString("ko-KR")} 갱신
              </span>
            )}
            <button
              type="button"
              onClick={loadRankings}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* 3대 카테고리 탭 스위처 (모바일 3분할 꽉 찬 배치) */}
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const active = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  "flex items-center justify-center gap-1 sm:gap-2 rounded-xl border p-2 sm:p-3 text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  active
                    ? `${cat.color} ring-2 ring-primary/20 shadow-xs scale-[1.02]`
                    : "border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 sm:size-4 shrink-0" />
                <span className="truncate">{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* 시장 필터 (전체 / KOSPI / KOSDAQ), 검색창, 페이지 크기 선택 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5">
            {(["ALL", "KOSPI", "KOSDAQ"] as MarketFilter[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleMarketChange(m)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  market === m
                    ? "bg-foreground text-background shadow-2xs"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "ALL" ? "전체 시장" : m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* 페이지당 표시 개수 */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={50}>50개씩 보기</option>
              <option value={100}>100개씩 보기</option>
              <option value={200}>200개씩 보기</option>
            </select>

            {/* 검색창 */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="전종목 이름 또는 코드 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 1위 하이라이트 배너 (1페이지일 때만) */}
      {top1 && !loading && (
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 font-black text-xl border border-amber-500/30 shadow-inner">
                🥇
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                    1위 하이라이트
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{top1.code}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">({top1.market})</span>
                </div>
                <h3 className="text-xl font-black text-foreground">{top1.name}</h3>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right font-mono">
                <div className="text-xl font-black text-foreground">{formatKRW(top1.price)}원</div>
                <div
                  className={cn(
                    "text-xs font-bold flex items-center justify-end gap-0.5",
                    top1.change >= 0 ? "text-[var(--up)]" : "text-[var(--down)]",
                  )}
                >
                  {top1.change >= 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                  {top1.change >= 0 ? "+" : ""}
                  {formatKRW(top1.change)}원 ({top1.change >= 0 ? "+" : ""}
                  {top1.changeRate.toFixed(2)}%)
                </div>
                <div className="text-[11px] text-muted-foreground">
                  거래량 {formatVolume(top1.volume)}주 · 시총 {formatEok(top1.marketCap)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectStock(top1.code)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-95"
              >
                <LineChart className="size-3.5" />
                <span>차트 정밀 분석</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 랭킹 데이터 테이블 */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {/* 통계 헤더 바 */}
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>
            총 <b className="text-foreground">{totalCount.toLocaleString()}</b>개 종목 중{" "}
            <b className="text-foreground">
              {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} ~{" "}
              {Math.min(currentPage * pageSize, totalCount)}
            </b>
            번째 표시 중
          </span>
          <span>
            페이지 <b className="text-foreground">{currentPage}</b> / {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-[11px] font-bold text-muted-foreground uppercase border-b border-border/80">
              <tr>
                <th className="py-3 px-3 text-center w-14">순위</th>
                <th className="py-3 px-4">종목명 / 코드</th>
                <th className="py-3 px-4 text-right">현재가</th>
                <th className="py-3 px-4 text-right">전일 대비</th>
                <th className="py-3 px-4 text-right">등락률</th>
                <th className="py-3 px-4 text-right">거래량</th>
                <th className="py-3 px-4 text-right">시가총액</th>
                <th className="py-3 px-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="size-5 animate-spin text-primary" />
                      <span className="text-xs font-semibold">전종목 실시간 랭킹 데이터를 집계하는 중...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    검색 조건에 일치하는 종목이 없습니다.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isUp = item.change >= 0
                  const isGold = item.rank === 1
                  const isSilver = item.rank === 2
                  const isBronze = item.rank === 3

                  return (
                    <tr
                      key={item.code}
                      onClick={() => onSelectStock(item.code)}
                      className="cursor-pointer transition-colors hover:bg-muted/50 group"
                    >
                      {/* 순위 */}
                      <td className="py-3 px-3 text-center font-bold">
                        {isGold ? (
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 text-xs font-black">
                            1
                          </span>
                        ) : isSilver ? (
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-300/40 text-slate-700 dark:text-slate-200 text-xs font-black">
                            2
                          </span>
                        ) : isBronze ? (
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-400 text-xs font-black">
                            3
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">{item.rank}</span>
                        )}
                      </td>

                      {/* 종목명 & 시장 */}
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.2 text-[9px] font-bold",
                              item.market === "KOSPI"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            {item.market}
                          </span>
                          <div>
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {item.code}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 현재가 */}
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatKRW(item.price)}원
                      </td>

                      {/* 전일대비 */}
                      <td
                        className={cn(
                          "py-3 px-4 text-right font-semibold",
                          isUp ? "text-[var(--up)]" : "text-[var(--down)]",
                        )}
                      >
                        {isUp ? "+" : ""}
                        {formatKRW(item.change)}
                      </td>

                      {/* 등락률 */}
                      <td className="py-3 px-4 text-right font-bold">
                        <span
                          className={cn(
                            "inline-block rounded px-2 py-0.5 text-xs font-bold",
                            isUp
                              ? "bg-red-500/10 text-[var(--up)]"
                              : "bg-blue-500/10 text-[var(--down)]",
                          )}
                        >
                          {isUp ? "+" : ""}
                          {item.changeRate.toFixed(2)}%
                        </span>
                      </td>

                      {/* 거래량 */}
                      <td className="py-3 px-4 text-right font-medium text-foreground">
                        {formatVolume(item.volume)}주
                      </td>

                      {/* 시가총액 */}
                      <td className="py-3 px-4 text-right text-muted-foreground font-medium">
                        {item.marketCap ? formatEok(item.marketCap) : "-"}
                      </td>

                      {/* 원클릭 분석 버튼 */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectStock(item.code)
                          }}
                          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        >
                          <LineChart className="size-3" />
                          <span>분석</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. 고급 페이지네이션 컨트롤러 */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
            <div className="text-xs text-muted-foreground">
              표시 중: <b>{items.length}</b>개 종목 (총 {totalCount.toLocaleString()}개)
            </div>

            <div className="flex items-center gap-1">
              {/* 첫 페이지 */}
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={currentPage === 1 || loading}
                className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                title="첫 페이지"
              >
                <ChevronsLeft className="size-4" />
              </button>

              {/* 이전 페이지 */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                title="이전 페이지"
              >
                <ChevronLeft className="size-4" />
              </button>

              {/* 페이지 번호 목록 */}
              {getPageNumbers().map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  disabled={loading}
                  className={cn(
                    "min-w-8 rounded-md px-2.5 py-1 text-xs font-bold transition-colors",
                    currentPage === pNum
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {pNum}
                </button>
              ))}

              {/* 다음 페이지 */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                title="다음 페이지"
              >
                <ChevronRight className="size-4" />
              </button>

              {/* 마지막 페이지 */}
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages || loading}
                className="rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                title="마지막 페이지"
              >
                <ChevronsRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
