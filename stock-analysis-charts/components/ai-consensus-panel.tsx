"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  History,
  Info,
  Lightbulb,
  Newspaper,
  Printer,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react"
import type { AIPredictionReport } from "@/lib/types"
import { formatKRW } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  prediction?: AIPredictionReport | null
  currentPrice: number
}

type TabType = "reason" | "target" | "chart" | "fundamental" | "news" | "history"

export function AIConsensusPanel({ prediction, currentPrice }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("reason")

  if (!prediction) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground animate-pulse">
          <Sparkles className="size-4 text-primary" />
          <span>Google Gemini AI 심층 리포트 및 주가 등락 예측 생성 중...</span>
        </div>
      </div>
    )
  }

  const isUp = prediction.direction === "UP"
  const isDown = prediction.direction === "DOWN"

  const handlePrint = () => {
    window.print()
  }

  return (
    <section aria-labelledby="ai-consensus-title" className="flex flex-col gap-4">
      {/* 🏆 메인 AI 주가 등락 예측 헤더 카드 */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all print:border-none print:shadow-none">
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
                카드를 클릭하면 AI가 해당 방향/목표가/점수를 산출한 <b>상세 추론 이유와 근거</b>를 확인할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 🎯 과거 예측 적중률 뱃지 & 액션 버튼 */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 border text-xs transition-all cursor-pointer",
                activeTab === "history"
                  ? "bg-amber-500/15 border-amber-500/40 text-foreground font-bold shadow-2xs"
                  : "bg-muted/80 border-border text-foreground hover:bg-accent/80",
              )}
              title="클릭하면 과거 10회차 예측 적중 이력 로그 탭으로 이동합니다"
            >
              <Award className="size-4 text-amber-500" />
              <div>
                <span className="text-muted-foreground text-[11px] mr-1.5">과거 예측 적중률:</span>
                <span className="font-bold font-mono">{prediction.historicalAccuracy}%</span>
                <span className="text-muted-foreground text-[10px] ml-1">
                  ({prediction.totalEvaluated}회 중 {prediction.hitCount}회 적중)
                </span>
              </div>
            </button>

            {/* 🖨️ AI 리포트 인쇄 / PDF 저장 버튼 */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
              title="현재 AI 예측 및 3대 분석 리포트를 PDF 또는 프린터로 출력합니다."
            >
              <Printer className="size-3.5" />
              <span>리포트 인쇄/PDF</span>
            </button>
          </div>
        </div>

        {/* 📊 클릭 가능한 3대 인터랙티브 요약 카드 (클릭 시 해당 이유 탭으로 이동) */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* 1. [AI 예상 방향 카드] -> 클릭 시 "AI 종합 판단 이유" 탭 활성화 */}
          <button
            type="button"
            onClick={() => setActiveTab("reason")}
            className={cn(
              "flex flex-col justify-between rounded-xl p-4 border text-left transition-all cursor-pointer group hover:scale-[1.01] hover:shadow-md relative overflow-hidden",
              activeTab === "reason"
                ? "ring-2 ring-primary border-primary shadow-sm"
                : "border-border hover:border-primary/50",
              isUp
                ? "bg-[var(--up)]/5 text-[var(--up)]"
                : isDown
                  ? "bg-[var(--down)]/5 text-[var(--down)]"
                  : "bg-muted/40 text-foreground",
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-primary" /> AI 예상 방향
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-background/80 px-1.5 py-0.5 rounded border border-border text-foreground group-hover:text-primary">
                이유 보기 👆
              </span>
            </div>

            <div className="my-2.5">
              <div className="text-2xl font-black tracking-tight">{prediction.directionLabel}</div>
              <div className="mt-1 text-xs opacity-90">
                AI 상승/하락 신뢰도: <b className="font-mono text-sm">{prediction.probability}%</b>
              </div>
            </div>

            {/* 프로그레스 바 */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80">
              <div
                className={cn("h-full transition-all duration-500", isUp ? "bg-[var(--up)]" : "bg-[var(--down)]")}
                style={{ width: `${prediction.probability}%` }}
              />
            </div>
          </button>

          {/* 2. [예상 목표 주가 카드] -> 클릭 시 "목표가 산출 근거" 탭 활성화 */}
          <button
            type="button"
            onClick={() => setActiveTab("target")}
            className={cn(
              "flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer group hover:scale-[1.01] hover:shadow-md",
              activeTab === "target"
                ? "ring-2 ring-primary border-primary bg-accent/40 shadow-sm"
                : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Target className="size-3 text-primary" /> 예상 목표 주가
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-background/80 px-1.5 py-0.5 rounded border border-border text-foreground group-hover:text-primary">
                산출 근거 👆
              </span>
            </div>

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
                현재가 {formatKRW(currentPrice)}원 대비 단기 기대 등락률
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground">
              ⏱️ {prediction.timeHorizon} 기준 산출
            </div>
          </button>

          {/* 3. [3대 팩터 종합 스코어 카드] -> 클릭 시 "차트/재무/뉴스 세부 근거" 탭 활성화 */}
          <button
            type="button"
            onClick={() => setActiveTab("chart")}
            className={cn(
              "flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer group hover:scale-[1.01] hover:shadow-md",
              activeTab === "chart" || activeTab === "fundamental" || activeTab === "news"
                ? "ring-2 ring-primary border-primary bg-accent/40 shadow-sm"
                : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Zap className="size-3 text-amber-500" /> 3대 팩터 가중 스코어
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-background/80 px-1.5 py-0.5 rounded border border-border text-foreground group-hover:text-primary">
                세부 분석 👆
              </span>
            </div>

            <div className="my-1 flex flex-col gap-1.5">
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
              💡 클릭 시 각 팩터별 세부 분석 근거 확인
            </div>
          </button>
        </div>

        {/* 🧭 AI 판단 이유 & 세부 근거 탭 네비게이터 */}
        <div className="mt-5 border-t border-border/80 pt-4">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/60 p-1 border border-border text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("reason")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition-all",
                activeTab === "reason"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Lightbulb className="size-3.5 text-amber-500" />
              <span>🧠 AI 종합 판단 이유</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("target")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition-all",
                activeTab === "target"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Target className="size-3.5 text-primary" />
              <span>🎯 목표가 산출 근거</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("chart")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition-all",
                activeTab === "chart"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BarChart2 className="size-3.5 text-blue-500" />
              <span>📈 차트 기술적 근거 ({prediction.chartScore}점)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("fundamental")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition-all",
                activeTab === "fundamental"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="size-3.5 text-emerald-500" />
              <span>📑 재무 펀더멘털 근거 ({prediction.fundamentalScore}점)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("news")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition-all",
                activeTab === "news"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Newspaper className="size-3.5 text-amber-500" />
              <span>📰 뉴스 & 감성 근거 ({prediction.newsScore}점)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold transition-all",
                activeTab === "history"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <History className="size-3.5 text-purple-500" />
              <span>📜 과거 적중 이력 ({prediction.historicalAccuracy}%)</span>
            </button>
          </div>
        </div>

        {/* 📑 탭별 상세 내용 화면 */}
        <div className="mt-4 animate-in fade-in duration-200">
          {/* 탭 1: [ 🧠 AI 종합 판단 이유 ] */}
          {activeTab === "reason" && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Lightbulb className="size-4 text-amber-500" />
                <span>왜 AI는 {prediction.name}이 {prediction.directionLabel}할 것으로 판단했는가?</span>
              </div>

              {/* 핵심 진단 브리핑 */}
              <div className="rounded-lg bg-background/90 p-4 border border-border/70 text-xs leading-relaxed text-foreground shadow-2xs">
                {prediction.overallVerdict}
              </div>

              {/* 3대 핵심 판단 이유 박스 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-background p-3 border border-border/70">
                  <div className="font-bold text-primary flex items-center gap-1 mb-1.5">
                    <BarChart2 className="size-3.5" /> 1. 차트 추세 (기여도 40%)
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{prediction.chartVerdict}</p>
                </div>

                <div className="rounded-lg bg-background p-3 border border-border/70">
                  <div className="font-bold text-emerald-500 flex items-center gap-1 mb-1.5">
                    <FileText className="size-3.5" /> 2. 기업 재무 밸류 (기여도 30%)
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{prediction.fundamentalVerdict}</p>
                </div>

                <div className="rounded-lg bg-background p-3 border border-border/70">
                  <div className="font-bold text-amber-500 flex items-center gap-1 mb-1.5">
                    <Newspaper className="size-3.5" /> 3. 실시간 뉴스 감성 (기여도 30%)
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{prediction.newsVerdict}</p>
                </div>
              </div>

              {/* ⚠️ 리스크 체크포인트 */}
              <div className="rounded-lg bg-amber-500/5 p-3 border border-amber-500/20 text-xs">
                <div className="font-bold text-amber-600 flex items-center gap-1 mb-1">
                  <ShieldAlert className="size-3.5" /> AI가 제시하는 리스크 관리 조언:
                </div>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {prediction.keyRisks?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 탭 2: [ 🎯 목표가 산출 근거 ] */}
          {activeTab === "target" && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Target className="size-4 text-primary" />
                <span>목표 주가 {formatKRW(prediction.targetPrice)}원 (+{prediction.expectedReturn}%) 산출 공식 및 근거</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                <div className="rounded-lg bg-background p-3.5 border border-border/70 flex flex-col gap-2">
                  <span className="font-bold text-foreground">📐 목표가 산출 공식</span>
                  <div className="font-mono bg-muted p-2 rounded text-[11px] leading-relaxed">
                    목표가 = 현재가({formatKRW(currentPrice)}원) × [1 + (AI 신뢰도({prediction.probability}%) - 50) × 0.18%]
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    AI의 상승 신뢰도({prediction.probability}%)와 과거 5~10 영업일 평균 변동성을 결합하여 통계적으로 도출된 1차 단기 목표 가격입니다.
                  </p>
                </div>

                <div className="rounded-lg bg-background p-3.5 border border-border/70 flex flex-col gap-2">
                  <span className="font-bold text-foreground">📊 주요 저항선 및 밸류에이션 상단</span>
                  <div className="space-y-1 text-muted-foreground text-[11px]">
                    <div>• <b>직전 52주 최고가</b>: {prediction.name} 과거 고점 대비 상방 여력 보유</div>
                    <div>• <b>볼린저 밴드 상단</b>: 단기 1차 저항 가격대 형성</div>
                    <div>• <b>기관/외인 목표가 컨센서스</b>: 업계 평균 대비 적정 밸류에이션 구간</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 탭 3: [ 📈 차트 기술적 근거 ] */}
          {activeTab === "chart" && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <BarChart2 className="size-4 text-primary" />
                  <span>차트 기술적 지표 상세 시그널 (총점: {prediction.chartScore}점)</span>
                </div>
                <span className="font-mono font-bold text-primary">{prediction.chartVerdict}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                {prediction.chartSignals?.map((sig, i) => (
                  <div key={i} className="rounded-lg bg-background p-3 border border-border/70 flex items-center gap-2 font-medium text-foreground">
                    <span>{sig}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 탭 4: [ 📑 재무 펀더멘털 근거 ] */}
          {activeTab === "fundamental" && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <FileText className="size-4 text-emerald-500" />
                  <span>기업 재무 보고서 및 공시 밸류에이션 근거 (총점: {prediction.fundamentalScore}점)</span>
                </div>
                <span className="font-mono font-bold text-emerald-500">{prediction.fundamentalVerdict}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                {prediction.fundamentalSignals?.map((sig, i) => (
                  <div key={i} className="rounded-lg bg-background p-3 border border-border/70 font-medium text-foreground">
                    {sig}
                  </div>
                ))}
              </div>

              {/* 🔗 원본 보고서 바로가기 링크 바 */}
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-background p-3 border border-border/70">
                <span className="font-bold text-foreground">원본 보고서 바로가기:</span>
                <a
                  href={prediction.companyReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-muted hover:bg-accent px-2.5 py-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <FileSpreadsheet className="size-3 text-emerald-500" />
                  <span>재무제표 원본 (네이버)</span>
                  <ExternalLink className="size-3 opacity-60" />
                </a>
                <a
                  href={prediction.dartUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-muted hover:bg-accent px-2.5 py-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <FileText className="size-3 text-blue-500" />
                  <span>DART 전자공시 보고서</span>
                  <ExternalLink className="size-3 opacity-60" />
                </a>
                <a
                  href={prediction.researchReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-muted hover:bg-accent px-2.5 py-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <Download className="size-3 text-amber-500" />
                  <span>증권사 리서치 리포트</span>
                  <ExternalLink className="size-3 opacity-60" />
                </a>
              </div>
            </div>
          )}

          {/* 탭 5: [ 📰 실시간 뉴스 감성 근거 ] */}
          {activeTab === "news" && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col gap-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Newspaper className="size-4 text-amber-500" />
                  <span>주요 경제 전문지 중심 뉴스 & 감성 분석 (총점: {prediction.newsScore}점)</span>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20">
                    매일경제 · 한국경제 등 경제지 우선
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px]">💡 기사를 클릭하면 뉴스 원문으로 새 탭 이동합니다</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                {prediction.newsItems?.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-lg bg-background p-3 border border-border/70 hover:border-primary/60 transition-all flex flex-col gap-1.5 hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground font-medium">{item.officeName} · {item.datetime}</span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-bold",
                          item.sentiment === "POSITIVE"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : item.sentiment === "NEGATIVE"
                              ? "bg-rose-500/10 text-rose-500"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.sentiment === "POSITIVE" ? "호재 (+)" : item.sentiment === "NEGATIVE" ? "악재 (-)" : "중립 (0)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-foreground group-hover:text-primary group-hover:underline">
                      <span className="line-clamp-1">{item.title}</span>
                      <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 탭 6: [ 📜 과거 적중 이력 ] */}
          {activeTab === "history" && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <History className="size-4 text-purple-500" />
                  <span>과거 10회차 예측 적중 이력 로그 (Backtesting Verification)</span>
                </div>
                <span className="font-bold text-foreground">
                  누적 적중률: <b className="font-mono text-primary text-sm">{prediction.historicalAccuracy}%</b> ({prediction.totalEvaluated}회 중 {prediction.hitCount}회 적중)
                </span>
              </div>

              <div className="mt-1 overflow-x-auto rounded-lg bg-background border border-border/70">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground bg-muted/30">
                      <th className="py-2.5 px-3">예측 일자</th>
                      <th className="py-2.5 px-3">당시 주가</th>
                      <th className="py-2.5 px-3">AI 예측</th>
                      <th className="py-2.5 px-3">5일 후 실제가</th>
                      <th className="py-2.5 px-3">실제 수익률</th>
                      <th className="py-2.5 px-3 text-right">적중 여부</th>
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
        </div>
      </div>
    </section>
  )
}
