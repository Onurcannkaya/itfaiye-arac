"use client"

import { useState, useEffect } from "react"
import { getTimeUntilNextShift } from "@/lib/shiftUtils"
import { Clock } from "lucide-react"

interface ShiftCountdownProps {
  customTimes?: any
}

export function ShiftCountdown({ customTimes }: ShiftCountdownProps = {}) {
  const [timeLeft, setTimeLeft] = useState<{
    merkez: { hours: number; minutes: number; seconds: number };
    esentepe: { hours: number; minutes: number; seconds: number };
    organize: { hours: number; minutes: number; seconds: number };
  } | null>(null)

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date()
      setTimeLeft({
        merkez: getTimeUntilNextShift("Merkez", now, customTimes),
        esentepe: getTimeUntilNextShift("Esentepe", now, customTimes),
        organize: getTimeUntilNextShift("Organize", now, customTimes)
      })
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [customTimes])

  if (!timeLeft) return null

  const formatTime = (t: { hours: number; minutes: number; seconds: number }) => {
    return `${t.hours.toString().padStart(2, '0')}:${t.minutes.toString().padStart(2, '0')}:${t.seconds.toString().padStart(2, '0')}`
  }

  const getLabelTime = (station: string) => {
    if (customTimes && customTimes[station]) {
      const { hours, minutes } = customTimes[station]
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    if (station === 'Merkez') return '08:00'
    if (station === 'Esentepe') return '08:45'
    if (station === 'Organize') return '09:15'
    return '08:00'
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-2">
      <div className="flex items-center gap-1.5 text-xs font-mono font-medium bg-[var(--fd-surface2)]/50 border border-[var(--fd-border)] px-2.5 py-1 rounded-md">
        <Clock className="w-3.5 h-3.5 text-[var(--fd-accent)]" />
        <span className="text-[var(--fd-text3)]">Mrkz ({getLabelTime('Merkez')}):</span>
        <span className="text-[var(--fd-text2)]">{formatTime(timeLeft.merkez)}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-mono font-medium bg-[var(--fd-surface2)]/50 border border-[var(--fd-border)] px-2.5 py-1 rounded-md">
        <Clock className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-[var(--fd-text3)]">Esntp ({getLabelTime('Esentepe')}):</span>
        <span className="text-[var(--fd-text2)]">{formatTime(timeLeft.esentepe)}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-mono font-medium bg-[var(--fd-surface2)]/50 border border-[var(--fd-border)] px-2.5 py-1 rounded-md">
        <Clock className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[var(--fd-text3)]">OSB ({getLabelTime('Organize')}):</span>
        <span className="text-[var(--fd-text2)]">{formatTime(timeLeft.organize)}</span>
      </div>
    </div>
  )
}
