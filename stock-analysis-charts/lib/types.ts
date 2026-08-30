export type Timeframe =
  | "1m"
  | "3m"
  | "5m"
  | "10m"
  | "30m"
  | "60m"
  | "1D"
  | "1W"
  | "1M"

export const TIMEFRAMES: { value: Timeframe; label: string; seconds: number }[] = [
  { value: "1m", label: "1분", seconds: 60 },
  { value: "3m", label: "3분", seconds: 180 },
  { value: "5m", label: "5분", seconds: 300 },
  { value: "10m", label: "10분", seconds: 600 },
  { value: "30m", label: "30분", seconds: 1800 },
  { value: "60m", label: "60분", seconds: 3600 },
  { value: "1D", label: "일", seconds: 86400 },
  { value: "1W", label: "주", seconds: 604800 },
  { value: "1M", label: "월", seconds: 2592000 },
]

export function isMinuteTimeframe(tf: Timeframe): boolean {
  return tf.endsWith("m")
}

// lightweight-charts UTCTimestamp (seconds)
export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type StockMeta = {
  code: string
  name: string
  market: "KOSPI" | "KOSDAQ"
  listedAt: string // YYYY-MM-DD
}

export type Quote = {
  code: string
  name: string
  market: string
  price: number
  prevClose: number
  change: number
  changeRate: number
  open?: number | null
  high?: number | null
  low?: number | null
  high52?: number | null
  low52?: number | null
  volume?: number | null
  marketCap?: number | null // 억 원
  per?: number | null
  pbr?: number | null
  eps?: number | null
  bps?: number | null
  lastSyncedAt?: string | null // 이전 동기화 시점
}

export type LinePoint = {
  time: number
  value: number
}

export type BollingerPoint = {
  time: number
  upper: number
  middle: number
  lower: number
}

export type MacdPoint = {
  time: number
  macd: number
  signal: number
  histogram: number
}

export type IndicatorData = {
  ma5: LinePoint[]
  ma20: LinePoint[]
  ma60: LinePoint[]
  ma120: LinePoint[]
  bollinger: BollingerPoint[]
  rsi: LinePoint[]
  macd: MacdPoint[]
}

export type IndicatorToggles = {
  ma: boolean
  bb: boolean
  vol: boolean
  rsi: boolean
  macd: boolean
}

// 🤖 AI 주가 예측 & 차트·재무·뉴스 종합 리포트 타입
export type PredictionDirection = "UP" | "DOWN" | "NEUTRAL"

export type NewsItem = {
  title: string
  officeName: string
  datetime: string
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL"
  sentimentScore: number // -100 ~ 100
  url: string // 기사 원문 링크
}

export type PredictionLog = {
  date: string
  predictedDirection: "UP" | "DOWN"
  actualDirection: "UP" | "DOWN"
  isHit: boolean
  returnPct: number
  priceAtDate: number
  priceAfter: number
}

export type AIPredictionReport = {
  code: string
  name: string
  currentPrice: number
  direction: PredictionDirection
  directionLabel: string
  probability: number // 상승 또는 하락 확률 (50% ~ 99%)
  expectedReturn: number // 예상 수익률/등락폭 (%)
  targetPrice: number
  timeHorizon: string // "단기 (향후 5~10 영업일)"

  // Gemini AI 연동 정보
  isGeminiActive: boolean
  aiProviderLabel: string

  // 원본 보고서 및 DART 공시 링크
  companyReportUrl: string // 네이버 금융 기업분석/재무제표
  dartUrl: string // 금융감독원 DART 공시 보고서
  researchReportUrl: string // 증권사 애널리스트 리서치 리포트

  // 1. 차트 기술적 분석
  chartScore: number // 0 ~ 100
  chartVerdict: string
  chartSignals: string[]

  // 2. 기업 재무 보고서 분석
  fundamentalScore: number // 0 ~ 100
  fundamentalVerdict: string
  fundamentalSignals: string[]

  // 3. 실시간 뉴스 감성 분석
  newsScore: number // 0 ~ 100
  newsVerdict: string
  newsItems: NewsItem[]

  // 4. 과거 예측 적중률 백테스트
  historicalAccuracy: number // 예: 80 (80%)
  hitCount: number
  totalEvaluated: number
  historyLogs: PredictionLog[]

  // 종합 평가
  overallVerdict: string
  keyRisks: string[]
  updatedAt: string
}

// 호가창 타입
export type OrderLevel = {
  price: number
  volume: number
  changeRate: number
}

export type OrderBookData = {
  code: string
  currentPrice: number
  totalAskVolume: number
  totalBidVolume: number
  strength: number
  asks: OrderLevel[]
  bids: OrderLevel[]
}

// 🏆 시장 랭킹 및 스크리너 타입 (하락률 제외 3대 알짜 탭)
export type RankingCategory = "volume" | "rise" | "marketCap"
export type MarketFilter = "ALL" | "KOSPI" | "KOSDAQ"

export type RankingItem = {
  rank: number
  code: string
  name: string
  market: "KOSPI" | "KOSDAQ"
  price: number
  change: number
  changeRate: number
  volume: number
  marketCap?: number // 억 원
}

export type RankingResponse = {
  ok: boolean
  category: RankingCategory
  market: MarketFilter
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  items: RankingItem[]
  updatedAt: string
}

// Null-safe 포맷팅 함수들
export function formatKRW(n?: number | null): string {
  if (n === null || n === undefined || isNaN(n)) return "-"
  return Math.round(n).toLocaleString("ko-KR")
}

export function formatEok(n?: number | null): string {
  if (n === null || n === undefined || isNaN(n) || n === 0) return "-"
  if (n >= 10000) return `${(n / 10000).toFixed(1)}조`
  return `${formatKRW(Math.round(n))}억`
}

export function formatVolume(n?: number | null): string {
  if (n === null || n === undefined || isNaN(n)) return "-"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`
  return formatKRW(n)
}

export function formatRatio(n?: number | null, unit = "배"): string {
  if (n === null || n === undefined || isNaN(n) || n === 0) return "-"
  return `${n.toFixed(2)} ${unit}`
}

// ==============================================================================
// 💼 실전 모의투자 (Mock Trading) 타입 정의
// ==============================================================================

export type OrderType = "BUY" | "SELL"

export type HoldingPosition = {
  code: string
  name: string
  market: "KOSPI" | "KOSDAQ"
  quantity: number // 보유 수량
  avgBuyPrice: number // 평균 매입단가
  totalBuyAmount: number // 총 매입금액 (avgBuyPrice * quantity)
  currentPrice: number // 실시간 현재가
  evaluatedAmount: number // 평가금액 (currentPrice * quantity)
  unrealizedPnL: number // 평가손익 (evaluatedAmount - totalBuyAmount)
  returnRate: number // 수익률 (%)
  updatedAt: string
}

export type TradeHistoryItem = {
  id: string
  date: string
  code: string
  name: string
  type: OrderType
  price: number
  quantity: number
  totalAmount: number
  fee: number // 거래 수수료 및 제세금 (0.2%)
  realizedPnL?: number // 매도 시 실현 손익
  realizedReturnRate?: number // 매도 시 실현 수익률 (%)
}

export type MockAccountState = {
  seedMoney: number // 초기 시드머니 (기본 100,000,000원)
  cashBalance: number // 보유 현금 예수금
  holdings: Record<string, HoldingPosition> // 종목코드별 보유 포지션
  history: TradeHistoryItem[] // 체결 내역 매매 일지
  lastResetAt: string // 계좌 개설/초기화 일시
}

// 📜 모의투자 라운드 성적표 & 수익률 곡선 아카이브
export type EquityPoint = {
  date: string
  assets: number
  returnRate: number
}

export type ArchivedTradeRound = {
  id: string
  title: string
  startDate: string
  endDate: string
  durationDays: number
  seedMoney: number
  finalAssets: number
  finalProfit: number
  finalReturnRate: number
  totalTrades: number
  buyCount: number
  sellCount: number
  winCount: number
  lossCount: number
  winRate: number // %
  trades: TradeHistoryItem[]
  equityCurve: EquityPoint[]
}


