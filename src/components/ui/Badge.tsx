import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "danger" | "warning" | "info" | "muted" | "outline"
  children: React.ReactNode
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-[10px] py-[4px] rounded-full text-[calc(var(--fd-fs)*0.74)] font-bold tracking-[0.01em] whitespace-nowrap w-fit border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--fd-accent)]",
        {
          "bg-[var(--fd-accent-soft2)] text-[var(--fd-text)] border-[var(--fd-accent-soft)]": variant === "default",
          "bg-[rgba(22,163,74,0.11)] dark:bg-[rgba(22,163,74,0.2)] text-[#15803d] dark:text-[#4ade80] border-transparent": variant === "success",
          "bg-[rgba(220,38,38,0.11)] dark:bg-[rgba(220,38,38,0.2)] text-[#b91c1c] dark:text-[#f87171] border-transparent": variant === "danger",
          "bg-[rgba(245,158,11,0.11)] dark:bg-[rgba(245,158,11,0.2)] text-[#b45309] dark:text-[#fbbf24] border-transparent": variant === "warning",
          "bg-[rgba(37,99,235,0.11)] dark:bg-[rgba(37,99,235,0.2)] text-[#1d4ed8] dark:text-[#60a5fa] border-transparent": variant === "info",
          "bg-[rgba(100,116,139,0.11)] dark:bg-[rgba(100,116,139,0.2)] text-[#475569] dark:text-[#94a3b8] border-transparent": variant === "muted",
          "border-[var(--fd-border-strong)] text-[var(--fd-text)] bg-transparent": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
