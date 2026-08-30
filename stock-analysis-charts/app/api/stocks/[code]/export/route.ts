import { NextResponse } from "next/server"
import { getRealCandles } from "@/lib/real-stock-service"
import { getStock } from "@/lib/stock-master"
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

  const stock = getStock(code)
  const candles = await getRealCandles(code, tf)

  const header = "Time,Date,Open,High,Low,Close,Volume\n"
  const rows = candles
    .map((c) => {
      const d = new Date(c.time * 1000).toISOString()
      return `${c.time},${d},${c.open},${c.high},${c.low},${c.close},${c.volume}`
    })
    .join("\n")

  const csv = "\uFEFF" + header + rows
  const filename = `${stock?.name ?? code}_${code}_${tf}.csv`

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
}
