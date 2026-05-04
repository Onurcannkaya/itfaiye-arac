"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/Button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full" disabled />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-10 h-10 rounded-full bg-surface hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all duration-300"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title="Temayı Değiştir"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Temayı Değiştir</span>
    </Button>
  )
}
