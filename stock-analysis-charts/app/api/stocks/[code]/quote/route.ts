import { NextResponse } from "next/server"
import { getRealQuote } from "@/lib/real-stock-service"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const quote = await getRealQuote(code)
  if (!quote) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  return NextResponse.json({ quote })
}
