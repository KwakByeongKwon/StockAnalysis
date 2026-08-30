"use client"

import { BarChart3, PieChart, Star, Trophy } from "lucide-react"
import type { NavViewMode } from "./app-sidebar"
import { cn } from "@/lib/utils"

type Props = {
  viewMode: NavViewMode
  setViewMode: (mode: NavViewMode) => void
  favoritesCount: number
}

export function MobileBottomNav({ viewMode, setViewMode, favoritesCount }: Props) {
  const tabs: { mode: NavViewMode; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { mode: "favorites", label: "관심종목", icon: Star, badge: favoritesCount },
    { mode: "dashboard", label: "차트·AI", icon: BarChart3 },
    { mode: "screener", label: "랭킹발굴", icon: Trophy },
    { mode: "trading", label: "모의투자", icon: PieChart },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/80 bg-card/95 backdrop-blur-xl px-2 py-2 shadow-2xl safe-area-bottom pointer-events-auto"
      aria-label="모바일 하단 네비게이션"
    >
      <div className="grid grid-cols-4 items-center justify-around gap-1">
        {tabs.map(({ mode, label, icon: Icon, badge }) => {
          const isActive = viewMode === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-all active:scale-90 cursor-pointer",
                isActive ? "text-primary font-black" : "text-muted-foreground hover:text-foreground font-medium",
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "size-5 transition-transform group-hover:scale-110",
                    isActive && "scale-110 text-primary",
                  )}
                />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-black font-mono">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{label}</span>
              {isActive && (
                <span className="absolute -bottom-1 size-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
