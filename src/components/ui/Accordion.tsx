import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AccordionProps {
  children: React.ReactNode
  className?: string
  defaultValue?: string[]
}

export function Accordion({ children, className, defaultValue = [] }: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<string[]>(defaultValue)

  const handleToggle = (value: string) => {
    setOpenItems(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          const val = (child.props as any).value
          return React.cloneElement(child as React.ReactElement<any>, {
            isOpen: openItems.includes(val),
            onToggle: () => handleToggle(val)
          })
        }
        return child
      })}
    </div>
  )
}

interface AccordionItemProps {
  value: string
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
  isOpen?: boolean
  onToggle?: () => void
}

export function AccordionItem({ trigger, children, className, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div className={cn(
      "border border-[var(--fd-border)] bg-[var(--fd-surface)] rounded-[var(--fd-r)] overflow-hidden shadow-[var(--fd-shadow-sm)] transition-all duration-200", 
      isOpen ? "shadow-[var(--fd-shadow)] border-[var(--fd-border-strong)]" : "",
      className
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 font-bold text-sm text-[var(--fd-text)] hover:bg-[var(--fd-surface2)]/50 transition-colors text-left cursor-pointer"
      >
        <div className="flex-1">{trigger}</div>
        <div className={cn(
          "w-7 h-7 rounded-lg bg-[var(--fd-surface2)] hover:bg-[var(--fd-surface3)] flex items-center justify-center transition-all border border-[var(--fd-border)]/40 ml-4 shrink-0",
          isOpen ? "bg-[var(--fd-accent)]/10 border-[var(--fd-accent)]/30 text-[var(--fd-accent)]" : "text-[var(--fd-text3)]"
        )}>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200 ease-out",
              isOpen ? "transform rotate-180" : ""
            )}
          />
        </div>
      </button>
      <div
        className={cn(
          "transition-all duration-350 ease-in-out overflow-hidden",
          isOpen ? "max-h-[3000px] border-t border-[var(--fd-border)]" : "max-h-0"
        )}
      >
        <div className="p-4 sm:p-5 bg-[var(--fd-surface2)]/10">{children}</div>
      </div>
    </div>
  )
}
