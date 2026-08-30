import type {
  HoldingPosition,
  MockAccountState,
  OrderType,
  TradeHistoryItem,
} from "./types"

export const DEFAULT_SEED_MONEY = 100_000_000 // 1억 원
export const TRADING_FEE_RATE = 0.002 // 0.2% 거래세 및 증권사 수수료

const STORAGE_KEY = "stock_mock_trading_account_v1"

/**
 * 기본 빈 가상 계좌 생성
 */
export function createInitialAccount(seed = DEFAULT_SEED_MONEY): MockAccountState {
  return {
    seedMoney: seed,
    cashBalance: seed,
    holdings: {},
    history: [],
    lastResetAt: new Date().toISOString(),
  }
}

/**
 * 로컬 스토리지에서 가상 계좌 상태 로드
 */
export function loadMockAccount(): MockAccountState {
  if (typeof window === "undefined") {
    return createInitialAccount()
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = createInitialAccount()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw) as MockAccountState
  } catch (err) {
    console.error("Failed to load mock account:", err)
    return createInitialAccount()
  }
}

/**
 * 가상 계좌 상태를 로컬 스토리지에 저장
 */
export function saveMockAccount(state: MockAccountState): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.error("Failed to save mock account:", err)
  }
}

/**
 * 가상 계좌 1억 원으로 리셋/초기화
 */
export function resetMockAccount(seed = DEFAULT_SEED_MONEY): MockAccountState {
  const fresh = createInitialAccount(seed)
  saveMockAccount(fresh)
  return fresh
}

/**
 * 보유 종목들의 최신 실시간 현재가를 반영하여 평가금액 및 손익을 재계산합니다.
 */
export function recalculateHoldings(
  holdings: Record<string, HoldingPosition>,
  currentPrices: Record<string, number>,
): {
  updatedHoldings: Record<string, HoldingPosition>
  totalStockValue: number
  totalUnrealizedPnL: number
  totalInvestedAmount: number
} {
  let totalStockValue = 0
  let totalUnrealizedPnL = 0
  let totalInvestedAmount = 0
  const updated: Record<string, HoldingPosition> = {}

  for (const [code, pos] of Object.entries(holdings)) {
    const livePrice = currentPrices[code] ?? pos.currentPrice
    const evaluatedAmount = livePrice * pos.quantity
    const totalBuyAmount = pos.avgBuyPrice * pos.quantity
    const unrealizedPnL = evaluatedAmount - totalBuyAmount
    const returnRate =
      totalBuyAmount > 0
        ? Number(((unrealizedPnL / totalBuyAmount) * 100).toFixed(2))
        : 0

    updated[code] = {
      ...pos,
      currentPrice: livePrice,
      evaluatedAmount,
      unrealizedPnL,
      returnRate,
      updatedAt: new Date().toISOString(),
    }

    totalStockValue += evaluatedAmount
    totalUnrealizedPnL += unrealizedPnL
    totalInvestedAmount += totalBuyAmount
  }

  return {
    updatedHoldings: updated,
    totalStockValue,
    totalUnrealizedPnL,
    totalInvestedAmount,
  }
}

/**
 * [주문 체결 엔진] 가상 매수(BUY) / 매도(SELL) 주문을 실행하고 계좌를 갱신합니다.
 */
export function executeMockOrder({
  account,
  code,
  name,
  market = "KOSPI",
  type,
  price,
  quantity,
}: {
  account: MockAccountState
  code: string
  name: string
  market?: "KOSPI" | "KOSDAQ"
  type: OrderType
  price: number
  quantity: number
}): {
  success: boolean
  message: string
  updatedAccount: MockAccountState
} {
  if (quantity <= 0 || price <= 0) {
    return { success: false, message: "주문 수량과 가격은 0보다 커야 합니다.", updatedAccount: account }
  }

  const newAccount: MockAccountState = JSON.parse(JSON.stringify(account))
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`

  // 1. 가상 매수 (BUY) 주문 처리
  if (type === "BUY") {
    const grossAmount = price * quantity
    const fee = Math.round(grossAmount * TRADING_FEE_RATE)
    const totalCost = grossAmount + fee

    if (newAccount.cashBalance < totalCost) {
      const maxPossible = Math.floor(newAccount.cashBalance / (price * (1 + TRADING_FEE_RATE)))
      return {
        success: false,
        message: `예수금이 부족합니다! (필요: ${totalCost.toLocaleString()}원 / 보유: ${Math.round(newAccount.cashBalance).toLocaleString()}원, 최대 ${maxPossible.toLocaleString()}주 매수 가능)`,
        updatedAccount: account,
      }
    }

    // 예수금 차감
    newAccount.cashBalance -= totalCost

    // 기존 보유 포지션 이동가중평균(WAVG) 단가 산출
    const existing = newAccount.holdings[code]
    if (existing) {
      const oldQty = existing.quantity
      const oldTotal = existing.avgBuyPrice * oldQty
      const newQty = oldQty + quantity
      const newTotal = oldTotal + grossAmount
      const newAvgPrice = Math.round(newTotal / newQty)

      newAccount.holdings[code] = {
        code,
        name,
        market,
        quantity: newQty,
        avgBuyPrice: newAvgPrice,
        totalBuyAmount: newTotal,
        currentPrice: price,
        evaluatedAmount: price * newQty,
        unrealizedPnL: price * newQty - newTotal,
        returnRate: Number((((price * newQty - newTotal) / newTotal) * 100).toFixed(2)),
        updatedAt: dateStr,
      }
    } else {
      newAccount.holdings[code] = {
        code,
        name,
        market,
        quantity,
        avgBuyPrice: price,
        totalBuyAmount: grossAmount,
        currentPrice: price,
        evaluatedAmount: grossAmount,
        unrealizedPnL: 0,
        returnRate: 0,
        updatedAt: dateStr,
      }
    }

    // 매매 일지 기록
    const historyItem: TradeHistoryItem = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: dateStr,
      code,
      name,
      type: "BUY",
      price,
      quantity,
      totalAmount: totalCost,
      fee,
    }
    newAccount.history.unshift(historyItem)

    saveMockAccount(newAccount)
    return {
      success: true,
      message: `[매수 체결 완료] ${name} ${quantity.toLocaleString()}주를 ${price.toLocaleString()}원에 매수했습니다. (총 ${totalCost.toLocaleString()}원)`,
      updatedAccount: newAccount,
    }
  }

  // 2. 가상 매도 (SELL) 주문 처리
  if (type === "SELL") {
    const existing = newAccount.holdings[code]
    if (!existing || existing.quantity < quantity) {
      const currentQty = existing?.quantity ?? 0
      return {
        success: false,
        message: `매도 가능 수량이 부족합니다! (요청: ${quantity.toLocaleString()}주 / 보유: ${currentQty.toLocaleString()}주)`,
        updatedAccount: account,
      }
    }

    const grossAmount = price * quantity
    const fee = Math.round(grossAmount * TRADING_FEE_RATE)
    const netProceeds = grossAmount - fee

    // 실현 손익 및 실현 수익률 계산
    const costBasis = existing.avgBuyPrice * quantity
    const realizedPnL = netProceeds - costBasis
    const realizedReturnRate = Number((((price - existing.avgBuyPrice) / existing.avgBuyPrice) * 100).toFixed(2))

    // 예수금 입금
    newAccount.cashBalance += netProceeds

    // 보유 수량 차감 (전량 매도 시 삭제, 일부 매도 시 수량만 차감하고 평단가 유지)
    if (existing.quantity === quantity) {
      delete newAccount.holdings[code]
    } else {
      const remainQty = existing.quantity - quantity
      const remainBuyAmount = existing.avgBuyPrice * remainQty
      newAccount.holdings[code] = {
        ...existing,
        quantity: remainQty,
        totalBuyAmount: remainBuyAmount,
        evaluatedAmount: price * remainQty,
        unrealizedPnL: price * remainQty - remainBuyAmount,
        returnRate: Number((((price - existing.avgBuyPrice) / existing.avgBuyPrice) * 100).toFixed(2)),
        updatedAt: dateStr,
      }
    }

    // 매매 일지 기록
    const historyItem: TradeHistoryItem = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: dateStr,
      code,
      name,
      type: "SELL",
      price,
      quantity,
      totalAmount: netProceeds,
      fee,
      realizedPnL,
      realizedReturnRate,
    }
    newAccount.history.unshift(historyItem)

    saveMockAccount(newAccount)
    return {
      success: true,
      message: `[매도 체결 완료] ${name} ${quantity.toLocaleString()}주를 ${price.toLocaleString()}원에 매도했습니다. (정산금: ${netProceeds.toLocaleString()}원 / 실현손익: ${realizedPnL >= 0 ? "+" : ""}${realizedPnL.toLocaleString()}원 [${realizedReturnRate >= 0 ? "+" : ""}${realizedReturnRate}%])`,
      updatedAccount: newAccount,
    }
  }

  return { success: false, message: "지원하지 않는 주문 유형입니다.", updatedAccount: account }
}

// ==============================================================================
// 📜 역대 모의투자 라운드 성적표 & 수익률 곡선 아카이브 (Archive Storage)
// ==============================================================================

const ARCHIVE_STORAGE_KEY = "stock_mock_trading_archive_v1"

/**
 * 매매 체결 이력으로부터 시작일부터의 누적 자산 & 수익률 곡선 포인트들을 생성합니다.
 */
export function buildEquityCurveFromTrades(
  seedMoney: number,
  trades: TradeHistoryItem[],
  startDate: string,
  endDate: string,
  finalAssets: number,
): { date: string; assets: number; returnRate: number }[] {
  const curve: { date: string; assets: number; returnRate: number }[] = []

  // 1. 시작점 (0일차)
  curve.push({
    date: startDate.slice(0, 10),
    assets: seedMoney,
    returnRate: 0,
  })

  // 2. 시간순(과거->최신) 매매 정렬 후 누적 손익 반영
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  let runningCash = seedMoney
  let cumulativeRealizedPnL = 0

  for (const t of sorted) {
    if (t.realizedPnL !== undefined) {
      cumulativeRealizedPnL += t.realizedPnL
    }
    const currentAssets = seedMoney + cumulativeRealizedPnL
    const returnRate = Number((((currentAssets - seedMoney) / seedMoney) * 100).toFixed(2))

    curve.push({
      date: t.date.slice(0, 10),
      assets: currentAssets,
      returnRate,
    })
  }

  // 3. 최종 종료점
  const finalReturnRate = Number((((finalAssets - seedMoney) / seedMoney) * 100).toFixed(2))
  curve.push({
    date: endDate.slice(0, 10),
    assets: finalAssets,
    returnRate: finalReturnRate,
  })

  return curve
}

/**
 * 로컬 스토리지에서 보관된 역대 모의투자 라운드 목록 로드
 */
export function loadArchivedRounds(): import("./types").ArchivedTradeRound[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * 현재 모의투자 계좌 상태를 '시즌 성적표'로 변환하여 아카이브에 영구 저장
 */
export function archiveCurrentRound(
  account: MockAccountState,
  finalAssets: number,
): import("./types").ArchivedTradeRound | null {
  if (typeof window === "undefined") return null
  if (account.history.length === 0 && account.cashBalance === account.seedMoney) {
    // 거래가 전혀 없었던 빈 계좌는 아카이빙하지 않음
    return null
  }

  const now = new Date()
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  const startDate = account.lastResetAt || endDate

  const startD = new Date(startDate)
  const endD = new Date(endDate)
  const durationDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)))

  const finalProfit = finalAssets - account.seedMoney
  const finalReturnRate = Number(((finalProfit / account.seedMoney) * 100).toFixed(2))

  const buyTrades = account.history.filter((h) => h.type === "BUY")
  const sellTrades = account.history.filter((h) => h.type === "SELL")
  const winTrades = sellTrades.filter((h) => (h.realizedPnL ?? 0) > 0)
  const lossTrades = sellTrades.filter((h) => (h.realizedPnL ?? 0) < 0)
  const winRate = sellTrades.length > 0 ? Number(((winTrades.length / sellTrades.length) * 100).toFixed(1)) : 0

  const equityCurve = buildEquityCurveFromTrades(account.seedMoney, account.history, startDate, endDate, finalAssets)

  const existingList = loadArchivedRounds()
  const roundNum = existingList.length + 1

  const newRound: import("./types").ArchivedTradeRound = {
    id: `round_${Date.now()}`,
    title: `모의투자 시즌 ${roundNum}차 성적표`,
    startDate,
    endDate,
    durationDays,
    seedMoney: account.seedMoney,
    finalAssets,
    finalProfit,
    finalReturnRate,
    totalTrades: account.history.length,
    buyCount: buyTrades.length,
    sellCount: sellTrades.length,
    winCount: winTrades.length,
    lossCount: lossTrades.length,
    winRate,
    trades: [...account.history],
    equityCurve,
  }

  const updatedList = [newRound, ...existingList]
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(updatedList))
  } catch (err) {
    console.error("Failed to save archive:", err)
  }

  return newRound
}

/**
 * 특정 아카이브 라운드 개별 삭제
 */
export function deleteArchivedRound(id: string): import("./types").ArchivedTradeRound[] {
  if (typeof window === "undefined") return []
  const list = loadArchivedRounds().filter((r) => r.id !== id)
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(list))
  } catch {}
  return list
}

/**
 * 모든 아카이브 라운드 전체 비우기
 */
export function clearAllArchivedRounds(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(ARCHIVE_STORAGE_KEY)
  } catch {}
}

