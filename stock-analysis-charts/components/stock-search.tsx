"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { Search } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import type { StockMeta } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  selectedCode: string
  onSelect: (code: string) => void
}

export function StockSearch({ selectedCode, onSelect }: Props) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const { data } = useSWR<{ results: StockMeta[] }>(
    `/api/stocks?q=${encodeURIComponent(query)}`,
    fetcher,
    { keepPreviousData: true },
  )
  const results = data?.results ?? []

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function choose(code: string) {
    onSelect(code)
    setOpen(false)
    setQuery("")
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, results.length - 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === "Enter" && results[active]) {
              choose(results[active].code)
            } else if (e.key === "Escape") {
              setOpen(false)
            }
          }}
          placeholder="종목명 또는 코드 검색"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="종목 검색"
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {results.map((s, i) => (
            <li key={s.code}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s.code)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "text-popover-foreground",
                  s.code === selectedCode && "font-semibold",
                )}
              >
                <span className="truncate">{s.name}</span>
                <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px]",
                      s.market === "KOSPI"
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {s.market}
                  </span>
                  {s.code}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
