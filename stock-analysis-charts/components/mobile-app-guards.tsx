"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, LogOut, RefreshCw, Wifi, WifiOff, X } from "lucide-react"

export function MobileAppGuards() {
  const [isOffline, setIsOffline] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // 1. 온라인/오프라인 네트워크 상태 감지
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // 최초 마운트 시 초기 상태 확인
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true)
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // 2. 안드로이드/모바일 뒤로가기(취소) 버튼 앱 이탈 가드
  useEffect(() => {
    // 히스토리 스택에 가드용 가상 상태 푸시
    window.history.pushState({ appGuard: true }, "")

    const handlePopState = (e: PopStateEvent) => {
      // 뒤로가기를 누르면 이탈하지 않고 종료 확인 팝업을 띄움
      setShowExitConfirm(true)
      // 다시 가드 상태를 밀어넣어 다음 뒤로가기도 방어
      window.history.pushState({ appGuard: true }, "")
    }

    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  // 실제 앱 종료(뒤로가기 허용)
  const handleConfirmExit = () => {
    setShowExitConfirm(false)
    window.history.go(-2)
  }

  return (
    <>
      {/* 📶 1. 오프라인 네트워크 단절 세련된 알림 팝업 배너 */}
      {isOffline && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-rose-500/40 bg-card/95 backdrop-blur-xl p-3.5 shadow-2xl">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
                <WifiOff className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">네트워크 연결 끊김</h4>
                <p className="text-[10px] text-muted-foreground">
                  PC와 같은 Wi-Fi에 연결되어 있는지 확인해 주세요.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 rounded-lg bg-rose-500 hover:bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <RefreshCw className="size-3" />
              <span>재연결</span>
            </button>
          </div>
        </div>
      )}

      {/* 🚪 2. 뒤로가기(취소) 버튼 눌렀을 때 앱 종료 확인 모달 */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-xs rounded-3xl border border-border/80 bg-card p-6 shadow-2xl flex flex-col items-center gap-5 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="size-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground">앱을 종료하시겠습니까?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                진행 중인 주식 분석 및 모의투자 포트폴리오는 안전하게 자동 저장되어 있습니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex items-center justify-center rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-xs font-bold text-primary-foreground transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                계속 사용
              </button>

              <button
                type="button"
                onClick={handleConfirmExit}
                className="flex items-center justify-center gap-1 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-4 py-2.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>종료</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
