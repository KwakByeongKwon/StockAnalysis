"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart2,
  CheckCircle2,
  FileText,
  HelpCircle,
  History,
  Newspaper,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react"
import type { AIPredictionReport } from "@/lib/types"
import { formatKRW } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  prediction?: AIPredictionReport | null
  currentPrice: number
}

export function AIConsensusPanel({ prediction, currentPrice }: Props) {
  const [showHistory, setShowHistory] = useState(false)

  if (!prediction) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground animate-pulse">
          <Sparkles className="size-4 text-primary" />
          <span>AI 심층 리포트 및 주가 등락 예측 생성 중...</span>
        </div>
      </div>
    )
  }

  const isUp = prediction.direction === "UP"
  const isDown = prediction.direction === "DOWN"

  return (
    <section aria-labelledby="ai-consensus-title" className="flex flex-col gap-4">
      {/* 🏆 메인 AI 주가 등락 예측 & 과거 적중률 헤더 카드 */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="ai-consensus-title" className="text-base font-black text-foreground">
                  Google Gemini AI 주가 등락 예측 & 3대 심층 리포트
                </h2>
                <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                  {prediction.timeHorizon}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Gemini AI 분석 활성화됨
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                동기화 시점 기준 차트 · 기업 재무 보고서 · 실시간 뉴스를 결합한 종합 AI 판정
              </p>
            </div>
          </div>

          {/* 🎯 과거 예측 적중률 뱃지 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-muted/80 px-3 py-1.5 border border-border text-xs">
              <Award className="size-4 text-amber-500" />
              <div>
                <span className="text-muted-foreground text-[11px] mr-1.5">과거 예측 적중률:</span>
                <span className="font-bold font-mono text-foreground">
                  {prediction.historicalAccuracy}%
                </span>
                <span className="text-muted-foreground text-[10px] ml-1">
                  ({prediction.totalEvaluated}회 중 {prediction.hitCount}회 적중)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="size-3.5" />
              <span>{showHistory ? "적중 이력 닫기" : "적중 이력 보기"}</span>
            </button>
          </div>
        </div>

        {/* 📊 상승 / 하락 확률 게이지 & 목표가 대시보드 */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* 1. 예상 방향 및 확률 */}
          <div
            className={cn(
              "flex flex-col justify-between rounded-lg p-4 border",
              isUp
                ? "bg-[var(--up)]/5 border-[var(--up)]/30 text-[var(--up)]"
                : isDown
                  ? "bg-[var(--down)]/5 border-[var(--down)]/30 text-[var(--down)]"
                  : "bg-muted/40 border-border text-foreground",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">AI 예상 방향</span>
              {isUp ? (
                <ArrowUpRight className="size-5 text-[var(--up)]" />
              ) : isDown ? (
                <ArrowDownRight className="size-5 text-[var(--down)]" />
              ) : (
                <TrendingUp className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="my-2">
              <div className="text-2xl font-black">{prediction.directionLabel}</div>
              <div className="mt-1 text-xs opacity-90">
                AI 상승/하락 신뢰도: <b className="font-mono text-sm">{prediction.probability}%</b>
              </div>
            </div>
            {/* 프로그레스 바 */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full transition-all duration-500", isUp ? "bg-[var(--up)]" : "bg-[var(--down)]")}
                style={{ width: `${prediction.probability}%` }}
              />
            </div>
          </div>

          {/* 2. 기대 등락폭 & 목표가 */}
          <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/20 p-4">
            <span className="text-xs font-bold text-muted-foreground">예상 목표 주가</span>
            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-foreground">
                  {formatKRW(prediction.targetPrice)}원
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-bold",
                    prediction.expectedReturn >= 0 ? "text-[var(--up)]" : "text-[var(--down)]",
                  )}
                >
                  ({prediction.expectedReturn >= 0 ? "+" : ""}
                  {prediction.expectedReturn}%)
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                현재가 {formatKRW(currentPrice)}원 대비 단기 기대 수익률
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground">
              ⏱️ 산출 기준: 동기화 최신 캔들 + 실시간 팩터
            </div>
          </div>

          {/* 3. 3대 분석 가중 스코어 요약 */}
          <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/20 p-4">
            <span className="text-xs font-bold text-muted-foreground">3대 팩터 종합 스코어</span>
            <div className="my-1 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <BarChart2 className="size-3.5 text-primary" /> 차트 기술적 지표 (40%)
                </span>
                <span className="font-mono font-bold text-foreground">{prediction.chartScore}점</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="size-3.5 text-emerald-500" /> 기업 재무 보고서 (30%)
                </span>
                <span className="font-mono font-bold text-foreground">
                  {prediction.fundamentalScore}점
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Newspaper className="size-3.5 text-amber-500" /> 실시간 뉴스 감성 (30%)
                </span>
                <span className="font-mono font-bold text-foreground">{prediction.newsScore}점</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              💡 {prediction.name} 종합 팩터 점수 우세
            </div>
          </div>
        </div>

        {/* 종합 AI 진단 브리핑 문장 */}
        <div className="mt-4 rounded-lg bg-muted/40 p-3.5 border border-border/70 text-xs leading-relaxed text-foreground">
          {prediction.overallVerdict}
        </div>
      </div>

      {/* 📜 과거 10회차 예측 적중 이력 테이블 (토글) */}
      {showHistory && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                과거 예측 적중 이력 로그 (Backtesting Verification)
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              최근 10회 검증 결과 · <b>적중률 {prediction.historicalAccuracy}%</b>
            </span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 px-3">예측 일자</th>
                  <th className="py-2 px-3">당시 주가</th>
                  <th className="py-2 px-3">AI 예측</th>
                  <th className="py-2 px-3">5일 후 실제가</th>
                  <th className="py-2 px-3">실제 수익률</th>
                  <th className="py-2 px-3 text-right">적중 여부</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {prediction.historyLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 text-foreground font-semibold">{log.date}</td>
                    <td className="py-2 px-3 text-muted-foreground">{formatKRW(log.priceAtDate)}원</td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-bold",
                          log.predictedDirection === "UP"
                            ? "bg-[var(--up)]/10 text-[var(--up)]"
                            : "bg-[var(--down)]/10 text-[var(--down)]",
                        )}
                      >
                        {log.predictedDirection === "UP" ? "상승 (UP)" : "하락 (DOWN)"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-foreground">{formatKRW(log.priceAfter)}원</td>
                    <td
                      className={cn(
                        "py-2 px-3 font-bold",
                        log.returnPct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]",
                      )}
                    >
                      {log.returnPct >= 0 ? "+" : ""}
                      {log.returnPct}%
                    </td>
                    <td className="py-2 px-3 text-right">
                      {log.isHit ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-500">
                          <CheckCircle2 className="size-3" /> 적중
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-500">
                          <XCircle className="size-3" /> 빗나감
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📑 3대 심층 분석 상세 카드 그리드 (차트 / 재무 / 뉴스) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1. 차트 기술적 분석 카드 */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart2 className="size-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">차트 기술적 지표 분석</h3>
              </div>
              <span className="font-mono text-xs font-bold text-primary">
                {prediction.chartScore}점
              </span>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
              {prediction.chartVerdict}
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {prediction.chartSignals?.map((sig, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <span>{sig}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
            기준: MA5/20/60 골든크로스 · 거래량 추세
          </div>
        </div>

        {/* 2. 기업 재무 보고서 분석 카드 */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-emerald-500" />
                <h3 className="text-xs font-bold text-foreground">기업 재무 보고서 분석</h3>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-500">
                {prediction.fundamentalScore}점
              </span>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
              {prediction.fundamentalVerdict}
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {prediction.fundamentalSignals?.map((sig, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <span>{sig}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
            기준: PER/PBR 저평가 지수 · 시가총액 안전성
          </div>
        </div>

        {/* 3. 실시간 뉴스 & 감성 분석 카드 */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Newspaper className="size-4 text-amber-500" />
                <h3 className="text-xs font-bold text-foreground">실시간 뉴스 & 공시 분석</h3>
              </div>
              <span className="font-mono text-xs font-bold text-amber-500">
                {prediction.newsScore}점
              </span>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
              {prediction.newsVerdict}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {prediction.newsItems?.slice(0, 3).map((item, i) => (
                <div
                  key={i}
                  className="rounded bg-muted/40 p-2 border border-border/60 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="text-muted-foreground truncate">{item.officeName}</span>
                    <span
                      className={cn(
                        "rounded px-1 font-bold",
                        item.sentiment === "POSITIVE"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : item.sentiment === "NEGATIVE"
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.sentiment === "POSITIVE"
                        ? "호재"
                        : item.sentiment === "NEGATIVE"
                          ? "악재"
                          : "중립"}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-foreground line-clamp-1">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
            출처: 네이버 금융 실시간 주요 언론 기사
          </div>
        </div>
      </div>
    </section>
  )
}
