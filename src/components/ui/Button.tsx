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
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground shadow hover:bg-primary/90": variant === 'default',
            "bg-danger text-primary-foreground shadow hover:bg-danger/90": variant === 'danger',
            "bg-muted text-foreground shadow-sm hover:bg-muted/80": variant === 'secondary',
            "border border-border bg-surface hover:bg-muted text-foreground": variant === 'outline',
            "hover:bg-muted hover:text-foreground text-muted-foreground": variant === 'ghost',
            "h-11 px-4 py-2": size === 'default', // touch friendly 44px min-height
            "h-9 rounded-md px-3": size === 'sm',
            "h-14 rounded-md px-8 text-base": size === 'lg', // very touch friendly for tablets
            "h-11 w-11": size === 'icon',
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
