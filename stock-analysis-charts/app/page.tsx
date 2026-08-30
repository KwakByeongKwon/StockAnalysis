"use client"

import { useEffect, useState } from "react"
import useSWR, { mutate } from "swr"
import { AIConsensusPanel } from "@/components/ai-consensus-panel"
import { AppSidebar, type NavViewMode } from "@/components/app-sidebar"
import { CandleChart } from "@/components/candle-chart"
import { FavoritesDashboard } from "@/components/favorites-dashboard"
import { MarketScreener } from "@/components/market-screener"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MockTradingDashboard } from "@/components/mock-trading-dashboard"
import { OrderBook } from "@/components/order-book"
import { QuickPills } from "@/components/quick-pills"
import { QuoteHeader } from "@/components/quote-header"
import { QuoteStats } from "@/components/quote-stats"
import { SubIndicatorChart } from "@/components/sub-indicator-chart"
import { TopBar } from "@/components/top-bar"
import { Watchlist } from "@/components/watchlist"
import { fetcher } from "@/lib/fetcher"
import {
  TIMEFRAMES,
  type AIPredictionReport,
  type Candle,
  type IndicatorData,
  type IndicatorToggles,
  type OrderBookData,
  type Quote,
  type Timeframe,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const DEFAULT_FAVORITES = ["005930", "000660", "035420", "005380", "035720", "247540"]

export default function Page() {
  // 좌측 사이드바 뷰 모드 및 접기/펼치기 상태
  const [viewMode, setViewMode] = useState<NavViewMode>("favorites")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const [selectedCode, setSelectedCode] = useState("005930")
  const [timeframe, setTimeframe] = useState<Timeframe>("1D")
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES)
  const [toggles, setToggles] = useState<IndicatorToggles>({
    ma: true,
    bb: false,
    vol: true,
    rsi: false,
    macd: false,
  })

  // 로컬 스토리지 관심종목 및 사이드바 접힘 상태 로드
  useEffect(() => {
    try {
      const savedWatchlist = localStorage.getItem("stock_watchlist")
      if (savedWatchlist) {
        setFavorites(JSON.parse(savedWatchlist))
      }
      const savedSidebar = localStorage.getItem("stock_sidebar_collapsed")
      if (savedSidebar !== null) {
        setIsSidebarCollapsed(savedSidebar === "true")
      }
    } catch {
      // ignore
    }
  }, [])

  // 사이드바 접힘 토글 헬퍼
  const handleToggleSidebar = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed)
    try {
      localStorage.setItem("stock_sidebar_collapsed", String(collapsed))
    } catch {
      // ignore
    }
  }

  // 관심종목 저장 헬퍼
  const toggleFavorite = (code: string) => {
    setFavorites((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      try {
        localStorage.setItem("stock_watchlist", JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // 1. 시세 요약 데이터 (100% 온디맨드 로컬 모드)
  const { data: quoteData } = useSWR<{ quote: Quote }>(
    `/api/stocks/${selectedCode}/quote`,
    fetcher,
  )
  const quote = quoteData?.quote

  // 2. 캔들 시계열 데이터
  const { data: candleData, isLoading: candleLoading } = useSWR<{
    code: string
    timeframe: Timeframe
    candles: Candle[]
  }>(`/api/stocks/${selectedCode}/candles?tf=${timeframe}`, fetcher)
  const candles = candleData?.candles ?? []

  // 3. 5대 보조지표
  const { data: indicatorData } = useSWR<{
    code: string
    timeframe: Timeframe
    indicators: IndicatorData
  }>(`/api/stocks/${selectedCode}/indicators?tf=${timeframe}`, fetcher)
  const indicators = indicatorData?.indicators

  // 4. AI 종합 주가 등락 예측 & 차트·재무·뉴스 리포트 데이터
  const { data: aiData } = useSWR<{ prediction: AIPredictionReport }>(
    `/api/stocks/${selectedCode}/ai`,
    fetcher,
  )
  const prediction = aiData?.prediction

  // 5. 호가창 데이터
  const { data: orderData } = useSWR<{ orderbook: OrderBookData }>(
    `/api/stocks/${selectedCode}/orderbook`,
    fetcher,
  )
  const orderbook = orderData?.orderbook

  // 동기화 완료 후 SWR 캐시 즉시 리로드
  const handleSynced = async () => {
    await Promise.all([
      mutate(`/api/stocks/${selectedCode}/quote`),
      mutate(`/api/stocks/${selectedCode}/candles?tf=${timeframe}`),
      mutate(`/api/stocks/${selectedCode}/indicators?tf=${timeframe}`),
      mutate(`/api/stocks/${selectedCode}/ai`),
      mutate(`/api/stocks/${selectedCode}/orderbook`),
    ])
  }

  const handleSelectStock = (code: string) => {
    setSelectedCode(code)
    setViewMode("dashboard")
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* 🧭 1. 좌측 접이식(Collapsible) 사이드바 내비게이션 Drawer */}
      <AppSidebar
        viewMode={viewMode}
        setViewMode={setViewMode}
        favoritesCount={favorites.length}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={handleToggleSidebar}
      />

      {/* 💻 2. 우측 메인 작업 영역 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* 상단 글로벌 헤더 (검색창 + 동기화 버튼) */}
        <TopBar
          selectedCode={selectedCode}
          lastSyncedAt={quote?.lastSyncedAt}
          onSelect={(code) => {
            setSelectedCode(code)
            setViewMode("dashboard")
          }}
          onSynced={handleSynced}
        />

        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 md:px-6">
          {/* 상단 인기 종목 퀵 필터 바 */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 print:hidden">
            <QuickPills
              selectedCode={selectedCode}
              onSelect={(code) => {
                setSelectedCode(code)
                setViewMode("dashboard")
              }}
            />
          </div>

          {/* 3. 사이드바 메뉴별 조건부 렌더링 */}
          {viewMode === "favorites" ? (
            /* ⭐ 1. 메인 화면: 나의 즐겨찾기 포트폴리오 대시보드 */
            <FavoritesDashboard
              favorites={favorites}
              onSelectStock={handleSelectStock}
              onToggleFavorite={toggleFavorite}
            />
          ) : viewMode === "screener" ? (
            /* 🏆 2. 전체 시장 랭킹 & 종목 발굴기 화면 */
            <MarketScreener onSelectStock={handleSelectStock} />
          ) : viewMode === "trading" ? (
            /* 💼 3. 실전 모의투자 랩 (1억 원 시뮬레이터) 화면 */
            <MockTradingDashboard
              initialCode={selectedCode}
              onSelectStockForAnalysis={handleSelectStock}
            />
          ) : (
            /* 📊 4. 정밀 차트 & 퀀트 분석 대시보드 화면 (전체 캡처 대상 영역) */
            <div id="analysis-dashboard-area" className="flex flex-col gap-4">
              {/* 현재가 / 등락률 / 보고서 형태로 저장 헤더 */}
              {quote && (
                <QuoteHeader
                  quote={quote}
                  timeframe={timeframe}
                  prediction={prediction}
                  isFavorite={favorites.includes(selectedCode)}
                  onToggleFavorite={toggleFavorite}
                />
              )}

              {/* 메인 2단 그리드: 차트 영역 (좌) + 사이드바 (우) */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
                {/* 좌측: 메인 캔들 차트 + 보조지표 + AI 분석 패널 */}
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                    {/* 주기(Timeframe) 탭 & 보조지표 토글 바 */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                      {/* 주기 선택 탭 */}
                      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/60 p-1 text-xs font-mono">
                        {TIMEFRAMES.map((tf) => (
                          <button
                            key={tf.value}
                            type="button"
                            onClick={() => setTimeframe(tf.value)}
                            className={cn(
                              "rounded-md px-2.5 py-1 font-semibold transition-all",
                              timeframe === tf.value
                                ? "bg-background text-foreground shadow-2xs"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {tf.label}
                          </button>
                        ))}
                      </div>

                      {/* 5대 보조지표 토글 */}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-foreground">
                          <input
                            type="checkbox"
                            checked={toggles.ma}
                            onChange={(e) =>
                              setToggles((prev) => ({ ...prev, ma: e.target.checked }))
                            }
                            className="rounded border-border text-primary focus:ring-1 focus:ring-primary size-3.5"
                          />
                          이평선
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-foreground">
                          <input
                            type="checkbox"
                            checked={toggles.bb}
                            onChange={(e) =>
                              setToggles((prev) => ({ ...prev, bb: e.target.checked }))
                            }
                            className="rounded border-border text-primary focus:ring-1 focus:ring-primary size-3.5"
                          />
                          볼린저
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-foreground">
                          <input
                            type="checkbox"
                            checked={toggles.vol}
                            onChange={(e) =>
                              setToggles((prev) => ({ ...prev, vol: e.target.checked }))
                            }
                            className="rounded border-border text-primary focus:ring-1 focus:ring-primary size-3.5"
                          />
                          거래량
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-foreground">
                          <input
                            type="checkbox"
                            checked={toggles.rsi}
                            onChange={(e) =>
                              setToggles((prev) => ({ ...prev, rsi: e.target.checked }))
                            }
                            className="rounded border-border text-primary focus:ring-1 focus:ring-primary size-3.5"
                          />
                          RSI
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-foreground">
                          <input
                            type="checkbox"
                            checked={toggles.macd}
                            onChange={(e) =>
                              setToggles((prev) => ({ ...prev, macd: e.target.checked }))
                            }
                            className="rounded border-border text-primary focus:ring-1 focus:ring-primary size-3.5"
                          />
                          MACD
                        </label>
                      </div>
                    </div>

                    {/* 캔들 차트 영역 */}
                    <div className="relative mt-3 min-h-[480px] w-full">
                      {candleLoading && candles.length === 0 ? (
                        <div className="flex h-full min-h-[480px] items-center justify-center text-sm text-muted-foreground">
                          차트 데이터를 불러오는 중...
                        </div>
                      ) : (
                        <CandleChart
                          candles={candles}
                          indicators={indicators}
                          toggles={toggles}
                          timeframe={timeframe}
                        />
                      )}
                    </div>

                    {/* RSI / MACD 서브 차트 패널 */}
                    <SubIndicatorChart indicators={indicators} toggles={toggles} />

                    {/* 하단 안내 가이드 */}
                    <div className="mt-3 flex flex-wrap items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      <span>
                        💡 <b>조작 안내</b>: 차트 클릭 후 드래그로 <b>좌우 이동(Pan)</b>,{" "}
                        <kbd className="rounded border bg-muted px-1 font-mono">Ctrl + 휠</kbd>로{" "}
                        <b>마우스 커서 중심 확대/축소(Zoom)</b>
                      </span>
                      <span>총 {candles.length.toLocaleString()}개 봉 데이터</span>
                    </div>
                  </div>

                  {/* 🤖 Google Gemini AI 종합 주가 등락 예측 & 차트·재무·뉴스 리포트 패널 */}
                  <AIConsensusPanel
                    prediction={prediction}
                    currentPrice={quote?.price ?? 0}
                  />
                </div>

                {/* 우측 사이드바: 호가창 + 12대 지표 + 관심종목 */}
                <aside className="flex flex-col gap-4">
                  <OrderBook orderbook={orderbook} />
                  {quote && <QuoteStats quote={quote} />}
                  <Watchlist
                    favorites={favorites}
                    selectedCode={selectedCode}
                    onSelect={(code) => {
                      setSelectedCode(code)
                      setViewMode("dashboard")
                    }}
                    onRemove={toggleFavorite}
                  />
                </aside>
              </div>
            </div>
          )}

          {/* 푸터 */}
          <footer className="mt-8 border-t border-border/60 py-6 text-center text-xs text-muted-foreground pb-12 md:pb-6">
            <p>
              StockAnalysis PRO · 대한민국 실시간 증권 데이터 및 SQLite 고속 퀀트 시계열 저장소
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              본 화면에 제공되는 데이터는 투자 참고용 정보이며, 최종 투자 책임은 투자자 본인에게 있습니다.
            </p>
          </footer>
        </main>

        {/* 📱 스마트폰 전용 하단 고정 네비게이션 탭 바 */}
        <MobileBottomNav
          viewMode={viewMode}
          setViewMode={setViewMode}
          favoritesCount={favorites.length}
        />
      </div>
    </div>
  )
}
