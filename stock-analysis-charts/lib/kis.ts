import "server-only"
import type { Candle, Quote, StockMeta, Timeframe } from "./types"
import { TIMEFRAMES, isMinuteTimeframe } from "./types"
import { getStock } from "./stock-master"

/**
 * 한국투자증권(KIS) Open API 클라이언트.
 * KIS_APP_KEY / KIS_APP_SECRET 가 설정되면 실제 시세를 조회하고,
 * 없거나 호출 실패 시 상장일 기준 결정론적 데이터로 폴백한다.
 */

const APP_KEY = process.env.KIS_APP_KEY
const APP_SECRET = process.env.KIS_APP_SECRET
const IS_PROD = (process.env.KIS_ENV ?? "prod") !== "vps"
const BASE = IS_PROD
  ? "https://openapi.koreainvestment.com:9443"
  : "https://openapivts.koreainvestment.com:29443"

export function kisConfigured(): boolean {
  return Boolean(APP_KEY && APP_SECRET)
}

// ---- 접근 토큰 캐시 (인메모리) ----
let tokenCache: { token: string; expiresAt: number } | null = null

async function getToken(): Promise<string | null> {
  if (!kisConfigured()) return null
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token
  }
  try {
    const res = await fetch(`${BASE}/oauth2/tokenP`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: APP_KEY,
        appsecret: APP_SECRET,
      }),
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as { access_token: string; expires_in: number }
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
    return tokenCache.token
  } catch {
    return null
  }
}

async function kisFetch(path: string, trId: string, params: Record<string, string>) {
  const token = await getToken()
  if (!token) return null
  const url = new URL(`${BASE}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: APP_KEY!,
      appsecret: APP_SECRET!,
      tr_id: trId,
      custtype: "P",
    },
    cache: "no-store",
  })
  if (!res.ok) return null
  return res.json()
}

// =====================================================================
// 실제 KIS 시세 조회 (키가 있을 때)
// =====================================================================

async function fetchDailyFromKis(
  code: string,
  divCode: "D" | "W" | "M",
): Promise<Candle[] | null> {
  // 기간별 시세 (일/주/월) — 한 번에 최대 100건. 상장 전 구간까지는 반복 조회 필요.
  const today = kstYmd(Date.now())
  const start = "19900101"
  const data = await kisFetch(
    "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
    IS_PROD ? "FHKST03010100" : "FHKST03010100",
    {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: code,
      FID_INPUT_DATE_1: start,
      FID_INPUT_DATE_2: today,
      FID_PERIOD_DIV_CODE: divCode,
      FID_ORG_ADJ_PRC: "0",
    },
  )
  const rows = data?.output2 as Array<Record<string, string>> | undefined
  if (!rows || rows.length === 0) return null
  const candles: Candle[] = rows
    .filter((r) => r.stck_bsop_date)
    .map((r) => ({
      time: ymdToKstUnix(r.stck_bsop_date),
      open: Number(r.stck_oprc),
      high: Number(r.stck_hgpr),
      low: Number(r.stck_lwpr),
      close: Number(r.stck_clpr),
      volume: Number(r.acml_vol),
    }))
    .sort((a, b) => a.time - b.time)
  return candles
}

async function fetchMinuteFromKis(code: string): Promise<Candle[] | null> {
  const data = await kisFetch(
    "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
    "FHKST03010200",
    {
      FID_ETC_CLS_CODE: "",
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: code,
      FID_INPUT_HOUR_1: "153000",
      FID_PW_DATA_INCU_YN: "Y",
    },
  )
  const rows = data?.output2 as Array<Record<string, string>> | undefined
  if (!rows || rows.length === 0) return null
  return rows
    .map((r) => ({
      time: ymdhmsToKstUnix(r.stck_bsop_date, r.stck_cntg_hour),
      open: Number(r.stck_oprc),
      high: Number(r.stck_hgpr),
      low: Number(r.stck_lwpr),
      close: Number(r.stck_prpr),
      volume: Number(r.cntg_vol),
    }))
    .sort((a, b) => a.time - b.time)
}

// =====================================================================
// 폴백 데이터 생성 (상장일 ~ 현재, 결정론적)
// =====================================================================

const KST = 9 * 3600

function seedFrom(code: string): number {
  let h = 2166136261
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 시간축을 KST 기준으로 다루기 위해 +9h 시프트된 유닉스초 사용
function nowKst(): number {
  return Math.floor(Date.now() / 1000) + KST
}

function isWeekday(tShifted: number): boolean {
  const dow = new Date(tShifted * 1000).getUTCDay()
  return dow !== 0 && dow !== 6
}

function secondsOfDay(tShifted: number): number {
  return ((tShifted % 86400) + 86400) % 86400
}

const SESSION_START = 9 * 3600 // 09:00
const SESSION_END = 15 * 3600 + 30 * 60 // 15:30

function buildTimeline(tf: Timeframe, listedShifted: number, cap: number): number[] {
  const now = nowKst()
  const times: number[] = []

  if (isMinuteTimeframe(tf)) {
    const step = TIMEFRAMES.find((t) => t.value === tf)!.seconds
    let t = now - (now % step)
    let guard = 0
    while (times.length < cap && guard < cap * 40 && t > listedShifted) {
      const sod = secondsOfDay(t)
      if (isWeekday(t) && sod >= SESSION_START && sod <= SESSION_END) {
        times.push(t)
      }
      t -= step
      guard++
    }
    return times.reverse()
  }

  if (tf === "1D") {
    let t = now - secondsOfDay(now) + SESSION_END
    while (times.length < cap && t > listedShifted) {
      if (isWeekday(t)) times.push(t)
      t -= 86400
    }
    return times.reverse()
  }

  if (tf === "1W") {
    // 매주 금요일 종가 기준
    let t = now - secondsOfDay(now) + SESSION_END
    while (times.length < cap && t > listedShifted) {
      const dow = new Date(t * 1000).getUTCDay()
      if (dow === 5) times.push(t)
      t -= 86400
    }
    return times.reverse()
  }

  // 1M — 매월 1일
  const d = new Date(now * 1000)
  let year = d.getUTCFullYear()
  let month = d.getUTCMonth()
  while (times.length < cap) {
    const ts = Math.floor(Date.UTC(year, month, 1) / 1000) + SESSION_END
    if (ts <= listedShifted) break
    times.push(ts)
    month--
    if (month < 0) {
      month = 11
      year--
    }
  }
  return times.reverse()
}

function capFor(tf: Timeframe): number {
  if (isMinuteTimeframe(tf)) return 4000
  if (tf === "1D") return 8000
  if (tf === "1W") return 2600
  return 1200
}

function volPctFor(tf: Timeframe): number {
  switch (tf) {
    case "1m":
      return 0.0016
    case "3m":
      return 0.0026
    case "5m":
      return 0.0034
    case "10m":
      return 0.0048
    case "30m":
      return 0.008
    case "60m":
      return 0.011
    case "1D":
      return 0.019
    case "1W":
      return 0.04
    case "1M":
      return 0.075
  }
}

function roundTick(price: number): number {
  if (price >= 500_000) return Math.round(price / 1000) * 1000
  if (price >= 100_000) return Math.round(price / 500) * 500
  if (price >= 50_000) return Math.round(price / 100) * 100
  if (price >= 10_000) return Math.round(price / 50) * 50
  if (price >= 5_000) return Math.round(price / 10) * 10
  if (price >= 1_000) return Math.round(price / 5) * 5
  return Math.max(Math.round(price), 1)
}

function generateCandles(meta: StockMeta, tf: Timeframe): Candle[] {
  const listedShifted = ymdToKstUnix(meta.listedAt.replaceAll("-", ""))
  const times = buildTimeline(tf, listedShifted, capFor(tf))
  if (times.length === 0) return []

  const rnd = mulberry32(seedFrom(meta.code) ^ (tf.charCodeAt(0) << 8))
  const basePrice = 3_000 + (seedFrom(meta.code) % 120_000)
  const volPct = volPctFor(tf)
  // 완만한 상승 드리프트 (장기 우상향 경향)
  const driftPct = isMinuteTimeframe(tf) ? 0.00002 : 0.0006

  const candles: Candle[] = []
  let prevClose = basePrice
  for (let i = 0; i < times.length; i++) {
    const open = i === 0 ? basePrice : prevClose
    const shock = (rnd() * 2 - 1) * volPct
    const close = Math.max(open * (1 + shock + driftPct), basePrice * 0.15)
    const hi = Math.max(open, close) * (1 + rnd() * volPct * 0.6)
    const lo = Math.min(open, close) * (1 - rnd() * volPct * 0.6)
    const volume = Math.round(
      (isMinuteTimeframe(tf) ? 40_000 : 4_000_000) * (0.4 + rnd() * 1.6),
    )
    candles.push({
      time: times[i],
      open: roundTick(open),
      high: roundTick(hi),
      low: roundTick(lo),
      close: roundTick(close),
      volume,
    })
    prevClose = close
  }
  return candles
}

// =====================================================================
// 공개 API
// =====================================================================

export async function getCandles(code: string, tf: Timeframe): Promise<Candle[]> {
  const meta = getStock(code)
  if (kisConfigured()) {
    try {
      if (isMinuteTimeframe(tf)) {
        const m = await fetchMinuteFromKis(code)
        if (m && m.length) return m
      } else {
        const div = tf === "1W" ? "W" : tf === "1M" ? "M" : "D"
        const d = await fetchDailyFromKis(code, div)
        if (d && d.length) return d
      }
    } catch {
      // fall through to fallback
    }
  }
  if (!meta) return []
  return generateCandles(meta, tf)
}

export async function getQuote(code: string): Promise<Quote | null> {
  const meta = getStock(code)
  if (!meta) return null
  const daily = await getCandles(code, "1D")
  if (daily.length === 0) return null
  const last = daily[daily.length - 1]
  const prev = daily[daily.length - 2] ?? last
  const yearBars = daily.slice(-252)
  const high52 = Math.max(...yearBars.map((c) => c.high))
  const low52 = Math.min(...yearBars.map((c) => c.low))
  const change = last.close - prev.close
  const rnd = mulberry32(seedFrom(code))
  const shares = 50_000_000 + Math.floor(rnd() * 6_000_000_000)
  const eps = Math.max(Math.round(last.close / (5 + rnd() * 25)), 1)
  const bps = Math.max(Math.round(last.close / (0.8 + rnd() * 2)), 1)
  return {
    code,
    name: meta.name,
    market: meta.market,
    price: last.close,
    prevClose: prev.close,
    change,
    changeRate: prev.close ? (change / prev.close) * 100 : 0,
    open: last.open,
    high: last.high,
    low: last.low,
    high52,
    low52,
    volume: last.volume,
    marketCap: Math.round((last.close * shares) / 100_000_000),
    per: Math.round((last.close / eps) * 100) / 100,
    pbr: Math.round((last.close / bps) * 100) / 100,
    eps,
    bps,
  }
}

// ---- 날짜 유틸 (KST 시프트 유닉스초) ----
function kstYmd(ms: number): string {
  const d = new Date(ms + KST * 1000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

function ymdToKstUnix(ymd: string): number {
  const y = Number(ymd.slice(0, 4))
  const m = Number(ymd.slice(4, 6)) - 1
  const d = Number(ymd.slice(6, 8))
  return Math.floor(Date.UTC(y, m, d) / 1000) + SESSION_END
}

function ymdhmsToKstUnix(ymd: string, hms: string): number {
  const y = Number(ymd.slice(0, 4))
  const m = Number(ymd.slice(4, 6)) - 1
  const d = Number(ymd.slice(6, 8))
  const hh = Number(hms.slice(0, 2))
  const mm = Number(hms.slice(2, 4))
  const ss = Number(hms.slice(4, 6)) || 0
  return Math.floor(Date.UTC(y, m, d) / 1000) + hh * 3600 + mm * 60 + ss
}
