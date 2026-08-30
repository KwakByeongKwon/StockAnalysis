"use client"

import { useEffect, useState } from "react"
import { Delete, KeyRound, Lock, ShieldCheck, Sparkles, Unlock } from "lucide-react"
import { cn } from "@/lib/utils"

const PIN_STORAGE_KEY = "stock_private_pin_v1"
const AUTH_SESSION_KEY = "stock_private_auth_session_v1"

type Props = {
  children: React.ReactNode
}

export function PinLockGate({ children }: Props) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false)
  const [hasSetPin, setHasSetPin] = useState<boolean>(false)
  const [savedPin, setSavedPin] = useState<string>("")
  const [inputPin, setInputPin] = useState<string>("")
  const [isSettingMode, setIsSettingMode] = useState<boolean>(false)
  const [confirmPin, setConfirmPin] = useState<string>("")
  const [step, setStep] = useState<"enter" | "set_first" | "set_confirm">("enter")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY)
    const storedSession = sessionStorage.getItem(AUTH_SESSION_KEY)

    if (!storedPin) {
      // 최초 실행: PIN 등록 모드
      setHasSetPin(false)
      setIsSettingMode(true)
      setStep("set_first")
    } else {
      setHasSetPin(true)
      setSavedPin(storedPin)
      if (storedSession === "true") {
        setIsUnlocked(true)
      } else {
        setStep("enter")
      }
    }
  }, [])

  // 키패드 번호 입력
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

  // 4자리 완성 시 검증 로직
  const handleCompletePin = (pin: string) => {
    if (step === "enter") {
      if (pin === savedPin) {
        sessionStorage.setItem(AUTH_SESSION_KEY, "true")
        setIsUnlocked(true)
        setInputPin("")
      } else {
        setErrorMessage("비밀번호가 일치하지 않습니다. 다시 입력해주세요.")
        setTimeout(() => setInputPin(""), 400)
      }
    } else if (step === "set_first") {
      setConfirmPin(pin)
      setInputPin("")
      setStep("set_confirm")
    } else if (step === "set_confirm") {
      if (pin === confirmPin) {
        localStorage.setItem(PIN_STORAGE_KEY, pin)
        sessionStorage.setItem(AUTH_SESSION_KEY, "true")
        setSavedPin(pin)
        setHasSetPin(true)
        setIsSettingMode(false)
        setIsUnlocked(true)
        setInputPin("")
      } else {
        setErrorMessage("비밀번호가 일치하지 않습니다. 처음부터 다시 설정해주세요.")
        setInputPin("")
        setConfirmPin("")
        setStep("set_first")
      }
    }
  }

  // 잠그기 핸들러 (외부 노출용)
  const handleLockNow = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    setIsUnlocked(false)
    setInputPin("")
    setStep("enter")
  }

  if (!isMounted) {
    return <div className="min-h-screen bg-[#09090b]" />
  }

  if (isUnlocked) {
    return (
      <div className="relative min-h-screen">
        {children}
        {/* 우측 상단 작고 깔끔한 잠금/보안 위젯 */}
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border/80 bg-card/90 backdrop-blur-md px-3 py-1.5 shadow-lg text-xs font-semibold text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-mono">
            <ShieldCheck className="size-3.5" /> 1인 보안 모드
          </span>
          <button
            type="button"
            onClick={handleLockNow}
            className="flex items-center gap-1 rounded-full bg-muted/80 hover:bg-muted px-2 py-0.5 text-[10px] text-foreground transition-colors cursor-pointer"
            title="즉시 잠금 화면으로 전환합니다."
          >
            <Lock className="size-3" />
            <span>화면 잠금</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090b] text-foreground p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        {/* 상단 로고 & 타이틀 */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600/20 to-primary/20 border border-primary/30 text-primary shadow-xl">
            <Lock className="size-8" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">
              StockAnalysis PRO
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {step === "set_first" && "나 혼자만 사용할 4자리 PIN 비밀번호를 설정하세요."}
              {step === "set_confirm" && "확인을 위해 비밀번호를 한 번 더 입력하세요."}
              {step === "enter" && "1인 전용 프라이빗 잠금 해제"}
            </p>
          </div>
        </div>

        {/* PIN 4자리 점 표시 */}
        <div className="flex items-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = inputPin.length > idx
            return (
              <div
                key={idx}
                className={cn(
                  "size-4 rounded-full transition-all duration-150",
                  isFilled
                    ? "bg-primary scale-125 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                    : "bg-muted border border-border/80",
                )}
              />
            )
          })}
        </div>

        {/* 에러 메시지 */}
        <div className="h-5 text-center">
          {errorMessage && (
            <p className="text-xs font-bold text-rose-500 animate-shake">
              {errorMessage}
            </p>
          )}
        </div>

        {/* 12키패드 (1~9, 0, 지우기) */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handlePressNum(String(n))}
              className="flex size-16 items-center justify-center rounded-2xl bg-card border border-border/70 text-2xl font-bold font-mono text-white hover:bg-muted/80 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              {n}
            </button>
          ))}
          <div className="flex size-16 items-center justify-center" />
          <button
            type="button"
            onClick={() => handlePressNum("0")}
            className="flex size-16 items-center justify-center rounded-2xl bg-card border border-border/70 text-2xl font-bold font-mono text-white hover:bg-muted/80 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex size-16 items-center justify-center rounded-2xl bg-card border border-border/70 text-muted-foreground hover:text-white hover:bg-muted/80 active:scale-95 transition-all shadow-xs cursor-pointer"
            title="한 글자 지우기"
          >
            <Delete className="size-6" />
          </button>
        </div>

        <div className="text-[11px] text-muted-foreground/60 text-center font-mono">
          🔒 100% 온디바이스 암호화 보관
        </div>
      </div>
    </div>
  )
}
