import { NextResponse } from "next/server"
import { generateAIPredictionReport } from "@/lib/ai-prediction-service"
import { getRealCandles, getRealQuote } from "@/lib/real-stock-service"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params

  try {
    const quote = await getRealQuote(code)
    if (!quote) {
      return NextResponse.json({ error: "종목 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    const candles = await getRealCandles(code, "1D")
    const predictionReport = await generateAIPredictionReport(code, quote, candles)

    return NextResponse.json({ prediction: predictionReport })
  } catch (err: any) {
    console.error("AI Prediction Error:", err)
    return NextResponse.json(
      { error: "AI 예측 리포트 생성 중 오류가 발생했습니다." },
      { status: 500 },
    )
  }
}
