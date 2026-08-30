"use client"

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Star,
  Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type NavViewMode = "favorites" | "dashboard" | "screener"

type Props = {
  viewMode: NavViewMode
  setViewMode: (mode: NavViewMode) => void
  favoritesCount: number
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export function AppSidebar({
  viewMode,
  setViewMode,
  favoritesCount,
  isCollapsed,
  setIsCollapsed,
}: Props) {
  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border/80 bg-card transition-all duration-200 z-20 shrink-0 select-none",
        isCollapsed ? "w-16" : "w-60",
      )}
    >
      {/* 1. 사이드바 상단 헤더 (로고 및 단일 접기/펼치기 토글 버튼) */}
      <div className="flex h-14 items-center justify-between border-b border-border/80 px-3">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2 overflow-hidden animate-in fade-in duration-150">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs shadow-xs">
                SA
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-tight text-foreground">
                  StockAnalysis
                </span>
                <span className="text-[9px] font-bold text-primary font-mono -mt-1">
                  PRO TERMINAL
                </span>
              </div>
            </div>

            {/* 펼침 상태에서의 접기 버튼 */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="flex size-7 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="사이드바 접기"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </>
        ) : (
          /* 접힘 상태에서의 단일 펼치기 버튼 (중앙 정렬) */
          <div className="flex w-full items-center justify-center">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-background text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer shadow-2xs group"
              title="사이드바 펼치기"
            >
              <PanelLeftOpen className="size-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* 2. 메인 내비게이션 메뉴 리스트 */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6 no-scrollbar">
        {/* 그룹 1: 핵심 분석 대시보드 */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              핵심 대시보드
            </div>
          )}

          {/* ⭐ 1. 나의 즐겨찾기 포트폴리오 */}
          <button
            type="button"
            onClick={() => setViewMode("favorites")}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer",
              viewMode === "favorites"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              isCollapsed && "justify-center px-0 py-3",
            )}
            title="나의 즐겨찾기 포트폴리오"
          >
            <Star
              className={cn(
                "size-4 shrink-0 transition-transform group-hover:scale-110",
                viewMode === "favorites"
                  ? "fill-primary-foreground text-primary-foreground"
                  : "text-amber-500 fill-amber-500",
              )}
            />
            {!isCollapsed && (
              <div className="flex flex-1 items-center justify-between overflow-hidden">
                <span className="truncate">나의 즐겨찾기</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.2 text-[10px] font-extrabold font-mono",
                    viewMode === "favorites"
                      ? "bg-background/20 text-primary-foreground"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {favoritesCount}
                </span>
              </div>
            )}
          </button>

          {/* 📊 2. 정밀 차트 & AI 분석 */}
          <button
            type="button"
            onClick={() => setViewMode("dashboard")}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer",
              viewMode === "dashboard"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              isCollapsed && "justify-center px-0 py-3",
            )}
            title="정밀 차트 & AI 분석"
          >
            <BarChart3 className="size-4 shrink-0 transition-transform group-hover:scale-110" />
            {!isCollapsed && (
              <div className="flex flex-1 items-center justify-between overflow-hidden">
                <span className="truncate">차트 & AI 분석</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10px] font-extrabold",
                    viewMode === "dashboard"
                      ? "bg-background/20 text-primary-foreground"
                      : "bg-emerald-500/10 text-emerald-500",
                  )}
                >
                  Gemini
                </span>
              </div>
            )}
          </button>

          {/* 🏆 3. 시장 랭킹 & 종목 발굴기 */}
          <button
            type="button"
            onClick={() => setViewMode("screener")}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer",
              viewMode === "screener"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              isCollapsed && "justify-center px-0 py-3",
            )}
            title="전종목 시장 랭킹 & 종목 발굴기"
          >
            <Trophy
              className={cn(
                "size-4 shrink-0 transition-transform group-hover:scale-110",
                viewMode !== "screener" && "text-purple-500",
              )}
            />
            {!isCollapsed && (
              <div className="flex flex-1 items-center justify-between overflow-hidden">
                <span className="truncate">시장 랭킹 & 발굴기</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10px] font-extrabold font-mono",
                    viewMode === "screener"
                      ? "bg-background/20 text-primary-foreground"
                      : "bg-purple-500/10 text-purple-500",
                  )}
                >
                  2,700+
                </span>
              </div>
            )}
          </button>
        </div>

        {/* 그룹 2: 향후 순차 추가 확장 기능 슬롯 */}
        <div className="space-y-1 border-t border-border/60 pt-4">
          {!isCollapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              스마트 퀀트 랩 (확장 슬롯)
            </div>
          )}

          {/* 🧪 퀀트 백테스팅 랩 */}
          <div
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground/60 select-none",
              isCollapsed && "justify-center px-0 py-3",
            )}
            title="퀀트 백테스팅 엔진 (순차 추가 예정)"
          >
            <FlaskConical className="size-4 shrink-0 text-muted-foreground/50" />
            {!isCollapsed && (
              <div className="flex flex-1 items-center justify-between">
                <span>퀀트 백테스트</span>
                <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground">
                  준비중
                </span>
              </div>
            )}
          </div>

          {/* 💼 AI 포트폴리오 최적화 */}
          <div
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground/60 select-none",
              isCollapsed && "justify-center px-0 py-3",
            )}
            title="AI 포트폴리오 최적화 (순차 추가 예정)"
          >
            <PieChart className="size-4 shrink-0 text-muted-foreground/50" />
            {!isCollapsed && (
              <div className="flex flex-1 items-center justify-between">
                <span>포트폴리오 랩</span>
                <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground">
                  준비중
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 사이드바 하단 시스템 상태 */}
      <div className="border-t border-border/80 p-3">
        {!isCollapsed ? (
          <div className="rounded-lg bg-muted/40 p-2 border border-border/60 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SQLite 로컬 엔진</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">0.001s</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span
              className="size-2 rounded-full bg-emerald-500 animate-pulse"
              title="SQLite 로컬 엔진 정상 작동 중"
            />
          </div>
        )}
      </div>
    </aside>
  )
}
