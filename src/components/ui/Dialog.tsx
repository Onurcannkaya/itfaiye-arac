import * as React from "react"
import { cn } from "@/lib/utils"

export function Dialog({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center" onClick={() => onOpenChange(false)}>
      {children}
    </div>
  )
}

export function DialogContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div 
      className={cn("z-50 w-full max-w-lg bg-surface border border-border shadow-lg rounded-xl overflow-hidden animate-in fade-in zoom-in-95", className)} 
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex flex-col space-y-1.5", className)}>{children}</div>
}

export function DialogFooter({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex items-center justify-end space-x-2", className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: React.ReactNode, className?: string }) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2>
}

export function DialogDescription({ children, className }: { children: React.ReactNode, className?: string }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
}
