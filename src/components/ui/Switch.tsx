import React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface SwitchProps extends Omit<React.HTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  loading?: boolean
}

export function Switch({
  checked,
  onChange,
  disabled,
  loading,
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
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--fd-accent)] focus:ring-offset-2 focus:ring-offset-[var(--fd-surface)] disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-[var(--fd-accent)]" : "bg-[var(--fd-border)] hover:bg-[var(--fd-surface3)]",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none flex items-center justify-center h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      >
        {loading && <Loader2 className="w-2.5 h-2.5 text-[var(--fd-accent)] animate-spin" />}
      </span>
    </button>
  )
}
