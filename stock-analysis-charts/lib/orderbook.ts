import type { OrderBookData, OrderLevel, Quote } from "./types"

function getTickSize(price: number): number {
  if (price >= 500_000) return 1000
  if (price >= 100_000) return 500
  if (price >= 50_000) return 100
  if (price >= 10_000) return 50
  if (price >= 5_000) return 10
  if (price >= 1_000) return 5
  return 1
}

export function generateOrderBook(quote: Quote): OrderBookData {
  const price = quote.price
  const prevClose = quote.prevClose || price
  const tick = getTickSize(price)

  const asks: OrderLevel[] = []
  const bids: OrderLevel[] = []

  let totalAskVolume = 0
  let totalBidVolume = 0

  // 1. 매도 5호가 (Ask 5 -> Ask 1: 높은 가격 -> 낮은 가격)
  for (let i = 5; i >= 1; i--) {
    const askPrice = price + tick * i
    const changeRate = Number((((askPrice - prevClose) / prevClose) * 100).toFixed(2))
    const volume = Math.round((quote.volume * 0.005 + Math.abs(Math.sin(askPrice)) * 5000) * (6 - i))
    totalAskVolume += volume
    asks.push({ price: askPrice, volume, changeRate })
  }

  // 2. 매수 5호가 (Bid 1 -> Bid 5: 높은 가격 -> 낮은 가격)
  for (let i = 1; i <= 5; i++) {
    const bidPrice = Math.max(price - tick * i, tick)
    const changeRate = Number((((bidPrice - prevClose) / prevClose) * 100).toFixed(2))
    const volume = Math.round((quote.volume * 0.005 + Math.abs(Math.cos(bidPrice)) * 5000) * (6 - i))
    totalBidVolume += volume
    bids.push({ price: bidPrice, volume, changeRate })
  }

  const strength = Number(
    ((totalBidVolume / (totalAskVolume || 1)) * 100 + (quote.changeRate > 0 ? 15 : -15)).toFixed(1),
  )

  return {
    code: quote.code,
    currentPrice: price,
    totalAskVolume,
    totalBidVolume,
    strength: Math.max(30, Math.min(250, strength)),
    asks,
    bids,
  }
}
