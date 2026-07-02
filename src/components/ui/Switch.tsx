import React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface SwitchProps extends Omit<React.HTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  loading?: boolean
  activeColor?: string
}

export function Switch({
  checked,
  onChange,
  disabled,
  loading,
  activeColor = "bg-[var(--fd-accent)]",
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || loading}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner disabled:cursor-not-allowed disabled:opacity-40",
        checked ? activeColor : "bg-[var(--fd-border-strong)]",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none flex items-center justify-center h-3.5 w-3.5 transform rounded-full bg-white shadow-[var(--fd-shadow-sm)] ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-4.5" : "translate-x-0.5"
        )}
      >
        {loading && <Loader2 className="w-2.5 h-2.5 text-[var(--fd-accent)] animate-spin" />}
      </span>
    </button>
  )
}
