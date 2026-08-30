"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  CircleDollarSign,
  History,
  Info,
  Layers,
  PieChart,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react"
import { InvestmentArchivePanel } from "@/components/investment-archive-panel"
import { fetcher } from "@/lib/fetcher"
import {
  DEFAULT_SEED_MONEY,
  TRADING_FEE_RATE,
  archiveCurrentRound,
  executeMockOrder,
  loadArchivedRounds,
  loadMockAccount,
  recalculateHoldings,
  resetMockAccount,
} from "@/lib/mock-trading-service"
import type { ArchivedTradeRound, HoldingPosition, MockAccountState, OrderType, Quote, StockMeta } from "@/lib/types"
import { formatKRW, formatVolume } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  initialCode?: string
  onSelectStockForAnalysis: (code: string) => void
}

export function MockTradingDashboard({ initialCode = "005930", onSelectStockForAnalysis }: Props) {
  const [account, setAccount] = useState<MockAccountState>(() => loadMockAccount())
  const [selectedStockCode, setSelectedStockCode] = useState<string>(initialCode)
  const [orderType, setOrderType] = useState<OrderType>("BUY")
  const [orderQuantity, setOrderQuantity] = useState<number>(10)
  const [orderMessage, setOrderMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [archivedRounds, setArchivedRounds] = useState<ArchivedTradeRound[]>([])

  // 종목 검색창 상태
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<StockMeta[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // 아카이브 목록 로드
  useEffect(() => {
    setArchivedRounds(loadArchivedRounds())
  }, [])

  // 현재 선택된 종목의 실시간 시세
  const { data: quoteData } = useSWR<{ quote: Quote }>(
    `/api/stocks/${selectedStockCode}/quote`,
    fetcher,
  )
  const quote = quoteData?.quote

  // 계좌 상태 로드
  useEffect(() => {
    setAccount(loadMockAccount())
  }, [])

  // 보유 종목들의 최신 가격 수집 및 평가손익 실시간 갱신
  const holdingsList = Object.values(account.holdings)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

  useEffect(() => {
    if (quote && quote.code === selectedStockCode) {
      setLivePrices((prev) => ({ ...prev, [quote.code]: quote.price }))
    }
  }, [quote, selectedStockCode])

  const { updatedHoldings, totalStockValue, totalUnrealizedPnL } = recalculateHoldings(
    account.holdings,
    livePrices,
  )

  const currentPrice = quote?.price || updatedHoldings[selectedStockCode]?.currentPrice || 257000
  const totalAssets = account.cashBalance + totalStockValue
  const totalReturn = totalAssets - account.seedMoney
  const totalReturnRate = Number(((totalReturn / account.seedMoney) * 100).toFixed(2))
  const isProfit = totalReturn >= 0

  // 종목 검색 핸들러
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

  const handleSelectSearchedStock = (s: StockMeta) => {
    setSelectedStockCode(s.code)
    setSearchQuery("")
    setSearchResults([])
  }

  // 비중 퀵 버튼 (10%, 25%, 50%, 100%)
  const handleQuickPercent = (pct: number) => {
    if (orderType === "BUY") {
      const maxBudget = account.cashBalance * (pct / 100)
      const maxQty = Math.floor(maxBudget / (currentPrice * (1 + TRADING_FEE_RATE)))
      setOrderQuantity(Math.max(1, maxQty))
    } else {
      const currentHoldingQty = account.holdings[selectedStockCode]?.quantity || 0
      const qty = Math.floor(currentHoldingQty * (pct / 100))
      setOrderQuantity(Math.max(1, qty))
    }
  }

  // 주문 실행 핸들러
  const handleExecuteOrder = () => {
    if (!quote && !updatedHoldings[selectedStockCode]) return
    const stockName = quote?.name || updatedHoldings[selectedStockCode]?.name || selectedStockCode
    const market = (quote?.market || updatedHoldings[selectedStockCode]?.market || "KOSPI") as "KOSPI" | "KOSDAQ"

    const result = executeMockOrder({
      account,
      code: selectedStockCode,
      name: stockName,
      market,
      type: orderType,
      price: currentPrice,
      quantity: orderQuantity,
    })

    if (result.success) {
      setAccount(result.updatedAccount)
      setOrderMessage({ type: "success", text: result.message })
    } else {
      setOrderMessage({ type: "error", text: result.message })
    }

    setTimeout(() => {
      setOrderMessage(null)
    }, 5000)
  }

  // 계좌 1억 원 리셋 (직전 기록 자동 아카이빙)
  const handleConfirmReset = () => {
    // 1. 직전 기록 성적표로 자동 아카이빙
    const savedRound = archiveCurrentRound(account, totalAssets)
    if (savedRound) {
      setArchivedRounds(loadArchivedRounds())
    }

    // 2. 계좌 1억 원 리셋
    const fresh = resetMockAccount()
    setAccount(fresh)
    setShowResetConfirm(false)
    setOrderMessage({
      type: "success",
      text: savedRound
        ? `직전 투자 기록이 [성적표 보관소]에 자동 저장되었으며, 계좌가 1억 원으로 초기화되었습니다.`
        : "가상 계좌가 1억 원으로 초기화되었습니다.",
    })
    setTimeout(() => setOrderMessage(null), 4000)
  }

  const estGrossAmount = currentPrice * orderQuantity
  const estFee = Math.round(estGrossAmount * TRADING_FEE_RATE)
  const estTotalCost = orderType === "BUY" ? estGrossAmount + estFee : estGrossAmount - estFee

  return (
    <div className="flex flex-col gap-6">
      {/* 1. 상단 모의투자 자산 현황 대시보드 헤더 */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Wallet className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-foreground">
                  실전 모의투자 랩 (Paper Trading)
                </h1>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                  가상 시뮬레이터 활성화됨
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                실제 네이버 금융 실시간 시세를 기반으로 <b>1억 원 가상 자산 모의 매매</b>를 시뮬레이션합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 📜 역대 성적표 & 수익률 그래프 보관소 토글 버튼 */}
            <button
              type="button"
              onClick={() => setShowArchive(!showArchive)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                showArchive
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
              )}
            >
              <span>📜 역대 성적표 & 수익률 그래프</span>
              <span className="rounded-full bg-purple-950/60 px-1.5 py-0.2 text-[10px] font-mono">
                {archivedRounds.length}
              </span>
            </button>

            {/* 초기화 버튼 */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="모의투자 계좌를 1억 원으로 다시 초기화하며 직전 기록은 성적표로 보관됩니다."
            >
              <RotateCcw className="size-3.5" />
              <span>계좌 초기화 (1억 원)</span>
            </button>
          </div>
        </div>

        {/* 4대 계좌 요약 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. 총 평가자산 */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-muted-foreground">총 평가자산</span>
            <div className="my-1.5">
              <div className="text-2xl font-black font-mono text-foreground">
                {formatKRW(totalAssets)}원
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-bold font-mono mt-0.5",
                  isProfit ? "text-[var(--up)]" : "text-[var(--down)]",
                )}
              >
                {isProfit ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                <span>
                  {isProfit ? "+" : ""}
                  {formatKRW(totalReturn)}원 ({isProfit ? "+" : ""}
                  {totalReturnRate}%)
                </span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">시드머니: {formatKRW(account.seedMoney)}원</span>
          </div>

          {/* 2. 보유 현금 예수금 */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-muted-foreground">보유 예수금 (주문 가능)</span>
            <div className="my-1.5">
              <div className="text-2xl font-black font-mono text-foreground">
                {formatKRW(account.cashBalance)}원
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                자산 비중 {totalAssets > 0 ? ((account.cashBalance / totalAssets) * 100).toFixed(1) : 100}%
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">즉시 가상 매수 가능 현금</span>
          </div>

          {/* 3. 총 주식 평가금액 */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-muted-foreground">보유 주식 평가금액</span>
            <div className="my-1.5">
              <div className="text-2xl font-black font-mono text-foreground">
                {formatKRW(totalStockValue)}원
              </div>
              <div
                className={cn(
                  "text-xs font-bold font-mono mt-0.5",
                  totalUnrealizedPnL >= 0 ? "text-[var(--up)]" : "text-[var(--down)]",
                )}
              >
                평가손익: {totalUnrealizedPnL >= 0 ? "+" : ""}
                {formatKRW(totalUnrealizedPnL)}원
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">
              총 {holdingsList.length}개 종목 보유 중
            </span>
          </div>

          {/* 4. 체결 매매 통계 */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-muted-foreground">누적 매매 체결</span>
            <div className="my-1.5">
              <div className="text-2xl font-black font-mono text-foreground">
                {account.history.length}건
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                수수료율: <b className="font-mono text-foreground">0.20%</b> (거래세 반영)
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground truncate">
              최근 개설: {account.lastResetAt.slice(0, 10)}
            </span>
          </div>
        </div>
      </div>

      {/* 📜 역대 모의투자 성적표 & 누적 수익률 상승 그래프 보관소 패널 */}
      {showArchive && (
        <InvestmentArchivePanel
          rounds={archivedRounds}
          onRefresh={() => setArchivedRounds(loadArchivedRounds())}
          onClose={() => setShowArchive(false)}
        />
      )}

      {/* 주문 결과 알림 메시지 */}
      {orderMessage && (
        <div
          className={cn(
            "rounded-xl p-4 border flex items-center gap-2.5 text-xs font-bold animate-in fade-in duration-150",
            orderMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              : "bg-rose-500/10 border-rose-500/30 text-rose-500",
          )}
        >
          {orderMessage.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 shrink-0" />
          )}
          <span>{orderMessage.text}</span>
        </div>
      )}

      {/* 2. 메인 2단 그리드: 가상 주문 티켓 (좌) + 보유 포트폴리오 (우) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        {/* 🛒 좌측: 실시간 가상 매수/매도 주문 티켓 */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h2 className="text-sm font-black text-foreground flex items-center gap-1.5">
                <Send className="size-4 text-primary" /> 실시간 가상 주문 티켓
              </h2>
              <span className="text-[11px] text-muted-foreground font-mono">시장가 즉시 체결</span>
            </div>

            {/* 종목 검색 및 선택 */}
            <div className="mt-3 relative">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs focus-within:ring-2 focus-within:ring-primary shadow-2xs">
                <Search className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="주문할 종목 검색 (예: 삼성전자, 두산)"
                  className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* 검색 드롭다운 */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-border bg-popover p-1 shadow-xl max-h-56 overflow-y-auto">
                  {searchResults.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => handleSelectSearchedStock(s)}
                      className="flex w-full items-center justify-between p-2 rounded-lg hover:bg-accent/80 text-xs transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-foreground">{s.name}</span>
                      <span className="font-mono text-muted-foreground">{s.code} ({s.market})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 현재 선택된 종목 시세 카드 */}
            <div className="mt-3 rounded-xl bg-muted/40 p-3.5 border border-border/70 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base text-foreground">
                    {quote?.name || selectedStockCode}
                  </span>
                  <span className="rounded bg-muted px-1.5 text-[10px] font-mono">
                    {quote?.code || selectedStockCode}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-xl font-black text-foreground">
                    {formatKRW(currentPrice)}원
                  </span>
                  {quote && (
                    <span
                      className={cn(
                        "font-mono text-xs font-bold",
                        quote.change >= 0 ? "text-[var(--up)]" : "text-[var(--down)]",
                      )}
                    >
                      {quote.change >= 0 ? "+" : ""}
                      {formatKRW(quote.change)}원 ({quote.change >= 0 ? "+" : ""}
                      {quote.changeRate.toFixed(2)}%)
                    </span>
                  )}
                </div>
              </div>

              {/* 해당 종목 차트 분석 바로가기 */}
              <button
                type="button"
                onClick={() => onSelectStockForAnalysis(selectedStockCode)}
                className="inline-flex items-center gap-1 rounded-lg bg-background p-2 border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="정밀 차트 및 AI 분석 화면으로 이동"
              >
                <BarChart2 className="size-4 text-primary" />
              </button>
            </div>

            {/* 매수 / 매도 탭 전환 */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1 border border-border/70 text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrderType("BUY")}
                className={cn(
                  "py-2 rounded-lg transition-all cursor-pointer",
                  orderType === "BUY"
                    ? "bg-[var(--up)] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                🔴 가상 매수 (BUY)
              </button>
              <button
                type="button"
                onClick={() => setOrderType("SELL")}
                className={cn(
                  "py-2 rounded-lg transition-all cursor-pointer",
                  orderType === "SELL"
                    ? "bg-[var(--down)] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                🔵 가상 매도 (SELL)
              </button>
            </div>

            {/* 주문 수량 및 퀵 비중 버튼 */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground font-medium">
                <span>주문 수량 (주)</span>
                {orderType === "BUY" ? (
                  <span>
                    최대 매수 가능:{" "}
                    <b className="font-mono text-foreground">
                      {Math.floor(account.cashBalance / (currentPrice * (1 + TRADING_FEE_RATE))).toLocaleString()}주
                    </b>
                  </span>
                ) : (
                  <span>
                    보유 수량:{" "}
                    <b className="font-mono text-foreground">
                      {(account.holdings[selectedStockCode]?.quantity || 0).toLocaleString()}주
                    </b>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-black font-mono text-foreground focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* 10%, 25%, 50%, 100% 퀵 비중 버튼 */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[10, 25, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className="rounded-md border border-border bg-background py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    {pct === 100 ? "최대 100%" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* 예상 정산 내역 프리뷰 */}
            <div className="mt-4 rounded-xl bg-muted/30 p-3.5 border border-border/70 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span className="font-sans">주문 단가</span>
                <span className="text-foreground">{formatKRW(currentPrice)}원</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="font-sans">체결 금액 ({orderQuantity}주)</span>
                <span className="text-foreground">{formatKRW(estGrossAmount)}원</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="font-sans">수수료 및 제세금 (0.2%)</span>
                <span className="text-foreground">{formatKRW(estFee)}원</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold text-sm">
                <span className="font-sans text-foreground">
                  {orderType === "BUY" ? "총 필요 예수금" : "예상 정산 수령액"}
                </span>
                <span className={orderType === "BUY" ? "text-[var(--up)]" : "text-[var(--down)]"}>
                  {formatKRW(estTotalCost)}원
                </span>
              </div>
            </div>
          </div>

          {/* 🚀 주문 실행 버튼 */}
          <button
            type="button"
            onClick={handleExecuteOrder}
            className={cn(
              "mt-4 w-full rounded-xl py-3 text-sm font-black text-white shadow-md transition-all cursor-pointer active:scale-95",
              orderType === "BUY"
                ? "bg-[var(--up)] hover:brightness-110"
                : "bg-[var(--down)] hover:brightness-110",
            )}
          >
            {orderType === "BUY"
              ? `🔴 ${formatKRW(estTotalCost)}원 가상 매수하기`
              : `🔵 ${orderQuantity}주 가상 매도하기`}
          </button>
        </div>

        {/* 📊 우측: 나의 보유 종목 포트폴리오 테이블 */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="size-4 text-emerald-500" />
                <h2 className="text-sm font-black text-foreground">
                  현재 보유 종목 포트폴리오
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                총 <b>{holdingsList.length}</b>개 종목
              </span>
            </div>

            {holdingsList.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
                <Layers className="size-8 text-muted-foreground/40" />
                <p className="text-xs font-bold text-muted-foreground">
                  현재 보유 중인 주식이 없습니다.
                </p>
                <p className="text-[11px] text-muted-foreground/80 max-w-xs">
                  좌측 가상 주문 티켓에서 관심 있는 주식을 검색하여 첫 모의 매수를 진행해보세요!
                </p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground bg-muted/20">
                      <th className="py-2.5 px-3">종목명</th>
                      <th className="py-2.5 px-3">보유 수량</th>
                      <th className="py-2.5 px-3">평균 매입가</th>
                      <th className="py-2.5 px-3">현재가</th>
                      <th className="py-2.5 px-3">평가금액</th>
                      <th className="py-2.5 px-3">평가손익 (수익률)</th>
                      <th className="py-2.5 px-3 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {Object.values(updatedHoldings).map((pos) => {
                      const isPosProfit = pos.unrealizedPnL >= 0
                      return (
                        <tr key={pos.code} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => onSelectStockForAnalysis(pos.code)}
                                className="font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                              >
                                {pos.name}
                              </span>
                              <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground font-mono">
                                {pos.code}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold text-foreground">
                            {pos.quantity.toLocaleString()}주
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {formatKRW(pos.avgBuyPrice)}원
                          </td>
                          <td className="py-3 px-3 font-bold text-foreground">
                            {formatKRW(pos.currentPrice)}원
                          </td>
                          <td className="py-3 px-3 text-foreground font-semibold">
                            {formatKRW(pos.evaluatedAmount)}원
                          </td>
                          <td
                            className={cn(
                              "py-3 px-3 font-bold",
                              isPosProfit ? "text-[var(--up)]" : "text-[var(--down)]",
                            )}
                          >
                            <div>
                              {isPosProfit ? "+" : ""}
                              {formatKRW(pos.unrealizedPnL)}원
                            </div>
                            <div className="text-[11px] opacity-90">
                              ({isPosProfit ? "+" : ""}
                              {pos.returnRate}%)
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 전량 매도 버튼 */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStockCode(pos.code)
                                  setOrderType("SELL")
                                  setOrderQuantity(pos.quantity)
                                }}
                                className="rounded bg-blue-500/10 hover:bg-blue-500 hover:text-white px-2 py-1 text-[11px] font-bold text-blue-500 transition-colors cursor-pointer"
                                title="이 종목을 매도 주문창으로 전달"
                              >
                                매도
                              </button>
                              {/* 차트 보기 */}
                              <button
                                type="button"
                                onClick={() => onSelectStockForAnalysis(pos.code)}
                                className="rounded bg-muted hover:bg-accent p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="정밀 차트 및 AI 리포트 보기"
                              >
                                <BarChart2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 하단 체결 내역 매매 일지 (Trade Journal Table) */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-purple-500" />
            <h2 className="text-sm font-black text-foreground">
              체결 내역 및 매매 일지 (Trade Journal)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            누적 체결: <b>{account.history.length}</b>건
          </span>
        </div>

        {account.history.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            아직 체결된 가상 거래 내역이 없습니다.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-muted/20">
                  <th className="py-2.5 px-3">체결 일시</th>
                  <th className="py-2.5 px-3">종목명</th>
                  <th className="py-2.5 px-3">구분</th>
                  <th className="py-2.5 px-3">체결 단가</th>
                  <th className="py-2.5 px-3">수량</th>
                  <th className="py-2.5 px-3">총 정산금액</th>
                  <th className="py-2.5 px-3">수수료(0.2%)</th>
                  <th className="py-2.5 px-3 text-right">실현 손익</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {account.history.map((h) => {
                  const isBuy = h.type === "BUY"
                  return (
                    <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-muted-foreground">{h.date}</td>
                      <td className="py-2.5 px-3 font-bold text-foreground">
                        {h.name} ({h.code})
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.2 text-[10px] font-bold",
                            isBuy
                              ? "bg-[var(--up)]/10 text-[var(--up)]"
                              : "bg-[var(--down)]/10 text-[var(--down)]",
                          )}
                        >
                          {isBuy ? "매수" : "매도"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-foreground">{formatKRW(h.price)}원</td>
                      <td className="py-2.5 px-3 font-semibold">{h.quantity.toLocaleString()}주</td>
                      <td className="py-2.5 px-3 font-bold text-foreground">
                        {formatKRW(h.totalAmount)}원
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{formatKRW(h.fee)}원</td>
                      <td className="py-2.5 px-3 text-right">
                        {h.realizedPnL !== undefined ? (
                          <span
                            className={cn(
                              "font-bold",
                              h.realizedPnL >= 0 ? "text-[var(--up)]" : "text-[var(--down)]",
                            )}
                          >
                            {h.realizedPnL >= 0 ? "+" : ""}
                            {formatKRW(h.realizedPnL)}원 ({h.realizedReturnRate}%)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔄 계좌 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-foreground">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="size-5" />
              </div>
              <h3 className="text-base font-bold">모의투자 계좌를 초기화할까요?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              초기화 시 현재 보유 중인 모든 가상 주식과 매매 일지가 삭제되고, <b>초기 예수금 100,000,000원(1억 원)</b>으로 재설정됩니다.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="rounded-lg bg-rose-500 hover:bg-rose-600 px-3.5 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                1억 원으로 초기화 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
