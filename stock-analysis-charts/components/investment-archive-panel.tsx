"use client"

import { useState } from "react"
import {
  AlertCircle,
  Archive,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  LineChart,
  PieChart,
  Sparkles,
  Trophy,
  Trash2,
  X,
  TrendingUp,
} from "lucide-react"
import { deleteArchivedRound, clearAllArchivedRounds } from "@/lib/mock-trading-service"
import type { ArchivedTradeRound } from "@/lib/types"
import { formatKRW } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  rounds: ArchivedTradeRound[]
  onRefresh: () => void
  onClose?: () => void
}

export function InvestmentArchivePanel({ rounds, onRefresh, onClose }: Props) {
  const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[0]?.id || "")
  const [expandedTradesRoundId, setExpandedTradesRoundId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) || rounds[0]

  const handleDeleteRound = (id: string) => {
    deleteArchivedRound(id)
    onRefresh()
  }

  const handleClearAll = () => {
    clearAllArchivedRounds()
    setShowClearConfirm(false)
    onRefresh()
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-md flex flex-col gap-5 animate-in fade-in duration-200">
      {/* 1. 상단 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <Archive className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-foreground">
                역대 모의투자 성적표 & 수익률 그래프 보관소
              </h2>
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400 font-mono">
                총 {rounds.length}개 시즌 보관됨
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              계좌 리셋 시 직전까지의 실전 투자 성과가 자동 보관되며, 시작일부터의 <b>수익률 상승 곡선 그래프</b>를 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {rounds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500 hover:text-white px-2.5 py-1.5 text-xs font-semibold text-rose-500 transition-colors cursor-pointer"
              title="모든 역대 성적표를 영구 삭제합니다."
            >
              <Trash2 className="size-3.5" />
              <span>전체 비우기</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {rounds.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-2.5">
          <History className="size-10 text-muted-foreground/30" />
          <p className="text-xs font-bold text-muted-foreground">
            아직 보관된 과거 모의투자 성적표가 없습니다.
          </p>
          <p className="text-[11px] text-muted-foreground/80 max-w-sm">
            모의투자에서 주식 매매를 진행한 후 <b>[계좌 초기화 (1억 원)]</b>를 누르시면 직전까지의 최종 성과가 이곳에 자동으로 기록됩니다!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 2. 📈 선택된 라운드의 일자별 수익률 상승 곡선 그래프 (SVG Equity Curve) */}
          {selectedRound && (
            <div className="rounded-2xl border-2 border-primary/20 bg-muted/20 p-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <LineChart className="size-4 text-primary" />
                  <span className="text-sm font-black text-foreground">
                    📈 [{selectedRound.title}] 시작일부터의 누적 수익률 상승 그래프
                  </span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold font-mono",
                      selectedRound.finalProfit >= 0
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                    )}
                  >
                    최종: {selectedRound.finalProfit >= 0 ? "+" : ""}
                    {selectedRound.finalReturnRate}% ({selectedRound.finalProfit >= 0 ? "+" : ""}
                    {formatKRW(selectedRound.finalProfit)}원)
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  기간: {selectedRound.startDate.slice(0, 10)} ~ {selectedRound.endDate.slice(0, 10)} ({selectedRound.durationDays}일간)
                </span>
              </div>

              {/* SVG 라인 차트 */}
              <div className="relative h-48 w-full mt-2">
                <EquityCurveSvg curve={selectedRound.equityCurve} />
              </div>
            </div>
          )}

          {/* 3. 🗂️ 역대 시즌 성적표 카드 목록 */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="size-3.5 text-amber-500" /> 보관된 과거 시즌 성적표 목록 ({rounds.length}건)
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {rounds.map((round) => {
                const isProfit = round.finalProfit >= 0
                const isSelected = round.id === selectedRound?.id
                const isExpanded = expandedTradesRoundId === round.id

                return (
                  <div
                    key={round.id}
                    className={cn(
                      "rounded-xl border transition-all p-4 flex flex-col gap-3",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/80 bg-background/80 hover:border-border",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* 좌측: 타이틀 & 기간 */}
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-10 items-center justify-center rounded-xl font-bold font-mono text-xs",
                            isProfit
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                          )}
                        >
                          {isProfit ? <ArrowUpRight className="size-5" /> : <ArrowDownRight className="size-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-foreground">{round.title}</h4>
                            <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                              {round.durationDays}일간 진행
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            📅 {round.startDate.slice(0, 10)} ~ {round.endDate.slice(0, 10)}
                          </span>
                        </div>
                      </div>

                      {/* 중앙: 수익률 및 자산 */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground font-semibold">최종 평가자산</span>
                          <div className="text-sm font-black font-mono text-foreground">
                            {formatKRW(round.finalAssets)}원
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground font-semibold">누적 수익률</span>
                          <div
                            className={cn(
                              "text-sm font-black font-mono",
                              isProfit ? "text-[var(--up)]" : "text-[var(--down)]",
                            )}
                          >
                            {isProfit ? "+" : ""}
                            {round.finalReturnRate}% ({isProfit ? "+" : ""}
                            {formatKRW(round.finalProfit)}원)
                          </div>
                        </div>

                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-muted-foreground font-semibold">매매 실적</span>
                          <div className="text-xs font-bold font-mono text-foreground">
                            {round.totalTrades}건 (승률 {round.winRate}%)
                          </div>
                        </div>
                      </div>

                      {/* 우측 액션 버튼: 그래프 보기, 매매일지 펼침, 삭제 */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRoundId(round.id)}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground",
                          )}
                        >
                          📈 그래프 보기
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedTradesRoundId(isExpanded ? null : round.id)}
                          className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <span>매매 일지 ({round.trades.length})</span>
                          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>

                        {/* 🗑️ 개별 삭제 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRound(round.id)}
                          className="flex size-7 items-center justify-center rounded-lg border border-border hover:border-rose-500/50 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                          title="이 시즌 기록 삭제"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 펼쳐진 상세 매매 일지 테이블 */}
                    {isExpanded && (
                      <div className="mt-2 rounded-lg border border-border bg-card p-3 animate-in fade-in duration-150">
                        <h5 className="text-xs font-bold text-foreground mb-2">📜 해당 시즌 매매 체결 일지</h5>
                        {round.trades.length === 0 ? (
                          <div className="text-xs text-muted-foreground py-2 text-center">체결 기록 없음</div>
                        ) : (
                          <div className="max-h-40 overflow-y-auto">
                            <table className="w-full text-left text-xs font-mono">
                              <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                  <th className="pb-1.5 px-2">체결 일시</th>
                                  <th className="pb-1.5 px-2">종목명</th>
                                  <th className="pb-1.5 px-2">구분</th>
                                  <th className="pb-1.5 px-2">단가</th>
                                  <th className="pb-1.5 px-2">수량</th>
                                  <th className="pb-1.5 px-2 text-right">실현 손익</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {round.trades.map((t) => (
                                  <tr key={t.id} className="hover:bg-muted/30">
                                    <td className="py-1.5 px-2 text-muted-foreground">{t.date}</td>
                                    <td className="py-1.5 px-2 font-bold text-foreground">{t.name}</td>
                                    <td className="py-1.5 px-2">
                                      <span
                                        className={cn(
                                          "rounded px-1 text-[10px] font-bold",
                                          t.type === "BUY" ? "bg-[var(--up)]/10 text-[var(--up)]" : "bg-[var(--down)]/10 text-[var(--down)]",
                                        )}
                                      >
                                        {t.type === "BUY" ? "매수" : "매도"}
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-2">{formatKRW(t.price)}원</td>
                                    <td className="py-1.5 px-2">{t.quantity}주</td>
                                    <td className="py-1.5 px-2 text-right font-bold">
                                      {t.realizedPnL !== undefined ? (
                                        <span className={t.realizedPnL >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}>
                                          {t.realizedPnL >= 0 ? "+" : ""}{formatKRW(t.realizedPnL)}원
                                        </span>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 전체 삭제 확인 모달 */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-foreground">
              <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <AlertCircle className="size-5" />
              </div>
              <h3 className="text-base font-bold">모든 역대 성적표를 비울까요?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              보관된 총 <b>{rounds.length}개 시즌의 모든 투자 성적표와 수익률 그래프</b>가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-lg bg-rose-500 hover:bg-rose-600 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                영구 삭제 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 일자별 누적 수익률(%) 곡선 SVG 차트 렌더러
 */
function EquityCurveSvg({ curve }: { curve: { date: string; assets: number; returnRate: number }[] }) {
  if (!curve || curve.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">그래프 데이터 없음</div>
  }

  const padding = { top: 20, right: 30, bottom: 25, left: 50 }
  const width = 800
  const height = 180

  const rates = curve.map((c) => c.returnRate)
  const minRate = Math.min(0, ...rates)
  const maxRate = Math.max(0, ...rates)
  const rateRange = Math.max(2, maxRate - minRate)

  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const getX = (index: number) => padding.left + (index / Math.max(1, curve.length - 1)) * innerWidth
  const getY = (rate: number) => padding.top + innerHeight - ((rate - minRate) / rateRange) * innerHeight

  const zeroY = getY(0)

  // SVG 패스 생성
  const points = curve.map((c, i) => `${getX(i)},${getY(c.returnRate)}`).join(" ")
  const areaPath = `M ${getX(0)},${zeroY} L ${curve.map((c, i) => `${getX(i)},${getY(c.returnRate)}`).join(" L ")} L ${getX(curve.length - 1)},${zeroY} Z`

  const finalPoint = curve[curve.length - 1]
  const isFinalProfit = (finalPoint?.returnRate || 0) >= 0

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* 0% 기준선 */}
      <line
        x1={padding.left}
        y1={zeroY}
        x2={width - padding.right}
        y2={zeroY}
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeDasharray="4 4"
      />
      <text
        x={padding.left - 8}
        y={zeroY + 4}
        textAnchor="end"
        className="text-[10px] font-mono fill-muted-foreground"
      >
        0.0%
      </text>

      {/* 최고/최저 수익률 눈금 라벨 */}
      <text
        x={padding.left - 8}
        y={padding.top + 5}
        textAnchor="end"
        className="text-[10px] font-mono fill-[var(--up)]"
      >
        +{maxRate.toFixed(1)}%
      </text>
      <text
        x={padding.left - 8}
        y={height - padding.bottom}
        textAnchor="end"
        className="text-[10px] font-mono fill-[var(--down)]"
      >
        {minRate.toFixed(1)}%
      </text>

      {/* 채우기 영역 */}
      <path d={areaPath} fill={isFinalProfit ? "url(#profitGradient)" : "url(#lossGradient)"} />

      {/* 메인 수익률 곡선 라인 */}
      <polyline
        points={points}
        fill="none"
        stroke={isFinalProfit ? "#10b981" : "#f43f5e"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 데이터 포인트 점 및 툴팁 텍스트 */}
      {curve.map((c, i) => (
        <g key={i} className="group">
          <circle
            cx={getX(i)}
            cy={getY(c.returnRate)}
            r={i === 0 || i === curve.length - 1 ? "4.5" : "3"}
            fill={c.returnRate >= 0 ? "#10b981" : "#f43f5e"}
            className="transition-all hover:r-6"
          />
          {/* X축 날짜 라벨 (시작과 끝) */}
          {(i === 0 || i === curve.length - 1) && (
            <text
              x={getX(i)}
              y={height - 5}
              textAnchor={i === 0 ? "start" : "end"}
              className="text-[10px] font-mono fill-muted-foreground font-bold"
            >
              {c.date}
            </text>
          )}
        </g>
      ))}

      {/* 최종 수익률 강조 라벨 */}
      {finalPoint && (
        <g transform={`translate(${getX(curve.length - 1) - 5}, ${getY(finalPoint.returnRate) - 10})`}>
          <text
            textAnchor="end"
            className={cn(
              "text-xs font-black font-mono",
              isFinalProfit ? "fill-emerald-500" : "fill-rose-500",
            )}
          >
            {isFinalProfit ? "+" : ""}
            {finalPoint.returnRate}%
          </text>
        </g>
      )}
    </svg>
  )
}
