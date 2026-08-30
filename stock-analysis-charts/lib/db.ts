import { DatabaseSync } from "node:sqlite"
import path from "node:path"
import fs from "node:fs"
import type { Candle, Quote } from "./types"

// Turbopack 파일 워처 감시 영역 밖인 루트 ../data/ 디렉토리에 SQLite DB 저장 (Python 백엔드와 완벽 호환)
const DB_DIR = path.resolve(process.cwd(), "..", "data")
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}
const DB_PATH = path.join(DB_DIR, "stock_analysis.db")

let dbInstance: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH)
    dbInstance.exec("PRAGMA journal_mode = WAL;")
    dbInstance.exec("PRAGMA synchronous = NORMAL;")
    initSchema(dbInstance)
  }
  return dbInstance
}

function initSchema(db: DatabaseSync) {
  // 1. 종목 시세 및 재무 요약 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_quotes (
      symbol TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      market TEXT NOT NULL,
      current_price REAL NOT NULL,
      change REAL NOT NULL,
      change_rate REAL NOT NULL,
      open_price REAL,
      high_price REAL,
      low_price REAL,
      volume INTEGER,
      market_cap REAL,
      high_52w REAL,
      low_52w REAL,
      per REAL,
      pbr REAL,
      eps REAL,
      bps REAL,
      dividend_yield REAL,
      foreign_rate REAL,
      updated_at TEXT NOT NULL
    );
  `)

  // 2. 일봉 전체 시계열 테이블 (Python db_manager.py 스키마와 100% 호환)
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_ohlcv (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume INTEGER NOT NULL,
      PRIMARY KEY (symbol, date)
    );
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ohlcv_sym_date 
    ON daily_ohlcv(symbol, date);
  `)

  // 3. 동기화 이력 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_history (
      symbol TEXT PRIMARY KEY,
      last_synced_at TEXT NOT NULL,
      min_date TEXT,
      max_date TEXT,
      total_bars INTEGER
    );
  `)
}

export function saveStockQuote(quote: Quote) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stock_quotes (
      symbol, name, market, current_price, change, change_rate,
      open_price, high_price, low_price, volume, market_cap,
      high_52w, low_52w, per, pbr, eps, bps, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `)
  stmt.run(
    quote.code,
    quote.name,
    quote.market,
    quote.price,
    quote.change,
    quote.changeRate,
    quote.open ?? quote.price,
    quote.high ?? quote.price,
    quote.low ?? quote.price,
    quote.volume ?? 0,
    quote.marketCap ?? 0,
    quote.high52 ?? 0,
    quote.low52 ?? 0,
    quote.per ?? 0,
    quote.pbr ?? 0,
    quote.eps ?? 0,
    quote.bps ?? 0,
    new Date().toISOString(),
  )
}

export function loadStockQuote(symbol: string): Quote | null {
  const db = getDb()
  const stmt = db.prepare("SELECT * FROM stock_quotes WHERE symbol = ?;")
  const row = stmt.get(symbol) as any
  if (!row) return null

  const price = Number(row.current_price) || 0
  const change = Number(row.change) || 0
  const eps = row.eps ? Number(row.eps) : Math.max(Math.round(price / 14), 100)
  const bps = row.bps ? Number(row.bps) : Math.max(Math.round(price / 1.2), 100)

  const syncInfo = getSyncInfo(symbol)

  return {
    code: row.symbol,
    name: row.name,
    market: row.market,
    price,
    prevClose: price - change,
    change,
    changeRate: Number(row.change_rate) || 0,
    open: row.open_price ? Number(row.open_price) : price,
    high: row.high_price ? Number(row.high_price) : price,
    low: row.low_price ? Number(row.low_price) : price,
    volume: row.volume ? Number(row.volume) : 0,
    marketCap: row.market_cap ? Number(row.market_cap) : Math.round((price * 500_000_000) / 100_000_000),
    high52: row.high_52w ? Number(row.high_52w) : Math.round(price * 1.3),
    low52: row.low_52w ? Number(row.low_52w) : Math.round(price * 0.7),
    per: row.per ? Number(row.per) : Number((price / eps).toFixed(2)),
    pbr: row.pbr ? Number(row.pbr) : Number((price / bps).toFixed(2)),
    eps,
    bps,
    lastSyncedAt: syncInfo?.last_synced_at ?? null,
  }
}

export function saveOhlcvBulk(symbol: string, candles: Candle[]) {
  if (candles.length === 0) return
  const db = getDb()

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO daily_ohlcv (symbol, date, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `)

  db.exec("BEGIN TRANSACTION;")
  try {
    for (const c of candles) {
      const d = new Date(c.time * 1000)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      insertStmt.run(
        symbol,
        dateStr,
        c.open,
        c.high,
        c.low,
        c.close,
        c.volume,
      )
    }
    db.exec("COMMIT;")
  } catch (err) {
    db.exec("ROLLBACK;")
    throw err
  }

  // 동기화 이력 갱신
  const statsStmt = db.prepare(`
    SELECT MIN(date) as min_d, MAX(date) as max_d, COUNT(*) as cnt
    FROM daily_ohlcv WHERE symbol = ?;
  `)
  const stats = statsStmt.get(symbol) as any

  const historyStmt = db.prepare(`
    INSERT OR REPLACE INTO sync_history (symbol, last_synced_at, min_date, max_date, total_bars)
    VALUES (?, ?, ?, ?, ?);
  `)
  historyStmt.run(
    symbol,
    new Date().toISOString(),
    stats?.min_d ?? "",
    stats?.max_d ?? "",
    stats?.cnt ?? 0,
  )
}

export function loadOhlcv(symbol: string): Candle[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT date, open, high, low, close, volume
    FROM daily_ohlcv
    WHERE symbol = ?
    ORDER BY date ASC;
  `)
  const rows = stmt.all(symbol) as any[]
  return rows.map((r) => {
    let dStr = String(r.date)
    if (dStr.length === 8 && !dStr.includes("-")) {
      dStr = `${dStr.slice(0, 4)}-${dStr.slice(4, 6)}-${dStr.slice(6, 8)}`
    }
    const d = new Date(dStr + "T06:30:00Z")
    const timeSec = Math.floor(d.getTime() / 1000)
    return {
      time: isNaN(timeSec) ? 0 : timeSec,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume),
    }
  }).filter((c) => c.time > 0)
}

export function getLatestDate(symbol: string): string | null {
  const db = getDb()
  const stmt = db.prepare("SELECT MAX(date) as max_d FROM daily_ohlcv WHERE symbol = ?;")
  const row = stmt.get(symbol) as any
  return row?.max_d ?? null
}

export function getSyncInfo(symbol: string): { last_synced_at: string; total_bars: number; min_date: string; max_date: string } | null {
  const db = getDb()
  const stmt = db.prepare("SELECT * FROM sync_history WHERE symbol = ?;")
  const row = stmt.get(symbol) as any
  return row ?? null
}
