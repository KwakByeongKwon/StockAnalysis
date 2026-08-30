"use client"

import { useEffect, useState } from "react"
import { Delete, KeyRound, Lock, ShieldCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"

const PIN_STORAGE_KEY = "stock_private_pin_v1"

type Props = {
  children: React.ReactNode
}

export function PinLockGate({ children }: Props) {
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [showPinModal, setShowPinModal] = useState<boolean>(false)
  const [savedPin, setSavedPin] = useState<string>("")
  const [inputPin, setInputPin] = useState<string>("")
  const [isSettingMode, setIsSettingMode] = useState<boolean>(false)
  const [confirmPin, setConfirmPin] = useState<string>("")
  const [step, setStep] = useState<"enter" | "set_first" | "set_confirm">("enter")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY)
    if (storedPin) {
      setSavedPin(storedPin)
    }
  }, [])

  // 번호 입력
  const handlePressNum = (num: string) => {
    if (inputPin.length >= 4) return
    const nextPin = inputPin + num
    setInputPin(nextPin)
    setErrorMessage("")

    if (nextPin.length === 4) {
      handleCompletePin(nextPin)
    }
  }

  // 지우기
  const handleDelete = () => {
    setInputPin((prev) => prev.slice(0, -1))
    setErrorMessage("")
  }

  // 4자리 완료 시
  const handleCompletePin = (pin: string) => {
    if (step === "enter") {
      if (pin === savedPin) {
        setIsLocked(false)
        setShowPinModal(false)
        setInputPin("")
      } else {
        setErrorMessage("비밀번호가 일치하지 않습니다.")
        setTimeout(() => setInputPin(""), 400)
      }
    } else if (step === "set_first") {
      setConfirmPin(pin)
      setInputPin("")
      setStep("set_confirm")
    } else if (step === "set_confirm") {
      if (pin === confirmPin) {
        localStorage.setItem(PIN_STORAGE_KEY, pin)
        setSavedPin(pin)
        setIsSettingMode(false)
        setShowPinModal(false)
        setInputPin("")
      } else {
        setErrorMessage("비밀번호가 일치하지 않습니다. 다시 설정해주세요.")
        setInputPin("")
        setConfirmPin("")
        setStep("set_first")
      }
    }
  }

  // 잠금 모달 열기
  const handleOpenLock = () => {
    if (!savedPin) {
      setIsSettingMode(true)
      setStep("set_first")
    } else {
      setIsSettingMode(false)
      setStep("enter")
    }
    setInputPin("")
    setErrorMessage("")
    setShowPinModal(true)
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* 1. 메인 콘텐츠 (항상 안전하게 렌더링) */}
      {!isLocked && children}

      {/* 2. 잠금 모달 또는 전체 잠금 화면 */}
      {(isLocked || showPinModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xs rounded-3xl border border-border/80 bg-card p-6 shadow-2xl flex flex-col items-center gap-6 relative">
            {!isLocked && (
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            )}

            {/* 상단 아이콘 */}
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-md">
              <Lock className="size-7" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-foreground">
                {step === "set_first" && "나만의 PIN 4자리 등록"}
                {step === "set_confirm" && "PIN 비밀번호 재입력"}
                {step === "enter" && "1인 보안 잠금 해제"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {step === "set_first" && "사용할 4자리 숫자를 입력하세요."}
                {step === "set_confirm" && "확인을 위해 한 번 더 입력하세요."}
                {step === "enter" && "등록한 4자리 비밀번호를 입력하세요."}
              </p>
            </div>

            {/* 4자리 점 표시 */}
            <div className="flex items-center gap-3 py-1">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={cn(
                    "size-3.5 rounded-full transition-all duration-150",
                    inputPin.length > idx
                      ? "bg-primary scale-125 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                      : "bg-muted border border-border/80",
                  )}
                />
              ))}
            </div>

            {errorMessage && (
              <p className="text-xs font-bold text-rose-500 animate-shake text-center h-4">
                {errorMessage}
              </p>
            )}

            {/* 키패드 */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[220px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handlePressNum(String(n))}
                  className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 border border-border/70 text-xl font-bold font-mono text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
                >
                  {n}
                </button>
              ))}
              <div className="flex size-14 items-center justify-center" />
              <button
                type="button"
                onClick={() => handlePressNum("0")}
                className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 border border-border/70 text-xl font-bold font-mono text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 border border-border/70 text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
              >
                <Delete className="size-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
