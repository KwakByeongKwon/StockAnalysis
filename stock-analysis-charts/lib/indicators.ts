import type { BollingerPoint, Candle, IndicatorData, LinePoint, MacdPoint } from "./types"

/**
 * 단순 이동평균(SMA) 계산
 */
export function calculateSMA(candles: Candle[], period: number): LinePoint[] {
  const points: LinePoint[] = []
  if (candles.length < period) return points

  let sum = 0
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close
    if (i >= period) {
      sum -= candles[i - period].close
    }
    if (i >= period - 1) {
      points.push({
        time: candles[i].time,
        value: Number((sum / period).toFixed(2)),
      })
    }
  }
  return points
}

/**
 * 볼린저 밴드(Bollinger Bands, 20, 2) 계산
 */
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  multiplier = 2,
): BollingerPoint[] {
  const points: BollingerPoint[] = []
  if (candles.length < period) return points

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1)
    const mean = slice.reduce((acc, c) => acc + c.close, 0) / period
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period
    const stdDev = Math.sqrt(variance)

    points.push({
      time: candles[i].time,
      upper: Number((mean + multiplier * stdDev).toFixed(2)),
      middle: Number(mean.toFixed(2)),
      lower: Number((mean - multiplier * stdDev).toFixed(2)),
    })
  }
  return points
}

/**
 * RSI(Relative Strength Index, 14) 계산
 */
export function calculateRSI(candles: Candle[], period = 14): LinePoint[] {
  const points: LinePoint[] = []
  if (candles.length <= period) return points

  const changes: number[] = []
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close)
  }

  let avgGain = 0
  let avgLoss = 0

  for (let i = 0; i < period; i++) {
    const change = changes[i]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }

  avgGain /= period
  avgLoss /= period

  const calcRsi = (gain: number, loss: number) => {
    if (loss === 0) return 100
    const rs = gain / loss
    return Number((100 - 100 / (1 + rs)).toFixed(2))
  }

  points.push({
    time: candles[period].time,
    value: calcRsi(avgGain, avgLoss),
  })

  for (let i = period; i < changes.length; i++) {
    const change = changes[i]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    points.push({
      time: candles[i + 1].time,
      value: calcRsi(avgGain, avgLoss),
    })
  }

  return points
}

/**
 * 지수 이동평균(EMA) 계산 헬퍼
 */
function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = []
  const k = 2 / (period + 1)
  let prevEma = values[0]
  ema.push(prevEma)

  for (let i = 1; i < values.length; i++) {
    const curEma = values[i] * k + prevEma * (1 - k)
    ema.push(curEma)
    prevEma = curEma
  }
  return ema
}

/**
 * MACD(12, 26, 9) 계산
 */
export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdPoint[] {
  const points: MacdPoint[] = []
  if (candles.length < slowPeriod + signalPeriod) return points

  const closes = candles.map((c) => c.close)
  const fastEma = calculateEMA(closes, fastPeriod)
  const slowEma = calculateEMA(closes, slowPeriod)

  const macdLine: number[] = []
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(fastEma[i] - slowEma[i])
  }

  const signalLine = calculateEMA(macdLine, signalPeriod)

  for (let i = slowPeriod - 1; i < candles.length; i++) {
    const macdVal = macdLine[i]
    const signalVal = signalLine[i]
    const hist = macdVal - signalVal
    points.push({
      time: candles[i].time,
      macd: Number(macdVal.toFixed(2)),
      signal: Number(signalVal.toFixed(2)),
      histogram: Number(hist.toFixed(2)),
    })
  }

  return points
}

/**
 * 모든 보조지표 일괄 계산
 */
export function calculateAllIndicators(candles: Candle[]): IndicatorData {
  return {
    ma5: calculateSMA(candles, 5),
    ma20: calculateSMA(candles, 20),
    ma60: calculateSMA(candles, 60),
    ma120: calculateSMA(candles, 120),
    bollinger: calculateBollingerBands(candles, 20, 2),
    rsi: calculateRSI(candles, 14),
    macd: calculateMACD(candles, 12, 26, 9),
  }
}
