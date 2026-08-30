import { NextResponse } from "next/server"
import { getRealCandles } from "@/lib/real-stock-service"
import { TIMEFRAMES, type Timeframe } from "@/lib/types"

const VALID = new Set(TIMEFRAMES.map((t) => t.value))

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const { searchParams } = new URL(req.url)
  const tf = (searchParams.get("tf") ?? "1D") as Timeframe
  if (!VALID.has(tf)) {
    return NextResponse.json({ error: "invalid timeframe" }, { status: 400 })
  }
  const candles = await getRealCandles(code, tf)
  return NextResponse.json({ code, timeframe: tf, candles })
}
