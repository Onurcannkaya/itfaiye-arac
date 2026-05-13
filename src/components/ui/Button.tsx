import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger' | 'ghost' | 'secondary' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-primary text-primary-foreground shadow hover:bg-primary/90": variant === 'default',
            "bg-danger text-primary-foreground shadow hover:bg-danger/90": variant === 'danger',
            "bg-muted text-foreground shadow-sm hover:bg-muted/80": variant === 'secondary',
            "border border-border bg-surface hover:bg-muted text-foreground": variant === 'outline',
            "hover:bg-muted hover:text-foreground text-muted-foreground": variant === 'ghost',
            "h-12 px-5 py-2": size === 'default',
            "h-10 rounded-lg px-4 text-sm": size === 'sm',
            "h-14 rounded-lg px-8 text-base": size === 'lg',
            "h-12 w-12": size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
