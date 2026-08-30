"use client"

import { useEffect, useState } from "react"
import { Download, Smartphone, X, CheckCircle2, ShieldCheck } from "lucide-react"

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // 1. 이미 앱으로 실행 중인지 확인
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // 2. 브라우저의 PWA 다운로드/설치 이벤트 감지
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // iOS Safari 또는 직접 설치 안내
      alert("📱 [스마트폰 앱 다운로드 안내]\n\n• 아이폰: 사파리 하단 [공유 버튼 ⎋] ➔ [홈 화면에 추가] 클릭\n• 갤럭시: 크롬 메뉴 [⋮] ➔ [앱 설치] 또는 [홈 화면에 추가] 클릭\n\n바탕화면에 단독 어플로 설치됩니다!")
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setIsInstalled(true)
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  if (isInstalled || isDismissed) return null

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-sm animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between gap-2.5 rounded-xl border border-primary/40 bg-card/95 backdrop-blur-xl px-3 py-2 shadow-xl">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0">
            <Smartphone className="size-4" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1">
              <h4 className="text-[11px] font-bold text-foreground truncate">앱 설치</h4>
              <span className="rounded bg-primary/10 px-1 text-[8px] font-bold text-primary font-mono">1인 전용</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">바탕화면에 앱으로 설치</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1 rounded-lg bg-primary hover:bg-primary/90 px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="size-3" />
            <span>설치</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="flex size-6 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
