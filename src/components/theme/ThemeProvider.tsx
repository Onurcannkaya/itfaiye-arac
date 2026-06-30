"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { useThemeStore } from "@/lib/themeStore"

function CustomThemeInjector() {
  const { settings } = useThemeStore()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (mounted) {
      const root = document.documentElement

      const hexA = (hex: string, a: number) => {
        const h = hex.replace('#', '')
        const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h
        const n = parseInt(f, 16)
        if (isNaN(n)) return 'transparent'
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
      }

      // Use next-themes's resolved mode (dark/light) to determine contrast bounds
      const isDark = resolvedTheme === 'dark' || document.documentElement.classList.contains('dark')
      const acc = settings.accent

      root.style.setProperty('--fd-accent', acc)
      root.style.setProperty('--fd-accent-soft', hexA(acc, isDark ? 0.22 : 0.12))
      root.style.setProperty('--fd-accent-soft2', hexA(acc, isDark ? 0.34 : 0.2))

      root.style.setProperty('--fd-r', `${settings.radius}px`)
      root.style.setProperty('--fd-r-sm', `${(settings.radius * 0.55).toFixed(1)}px`)
      root.style.setProperty('--fd-r-lg', `${(settings.radius * 1.5).toFixed(1)}px`)

      root.style.setProperty('--fd-sp', `${(8 * settings.spacing).toFixed(2)}px`)

      root.style.setProperty('--fd-fs', `${settings.fontScale}px`)
      root.style.setProperty('--fd-small-text-scale', `${settings.smallTextScale || 1.0}`)
      root.style.setProperty('--fd-font', settings.font)

      const sh = settings.shadow
      const shc = isDark ? '0,0,0' : '15,23,42'
      root.style.setProperty('--fd-shadow-sm', `0 1px 2px rgba(${shc},${(0.06 * sh + 0.015).toFixed(3)})`)
      root.style.setProperty('--fd-shadow', `0 1px 2px rgba(${shc},${(0.05 * sh + 0.01).toFixed(3)}), 0 6px 18px rgba(${shc},${(0.10 * sh).toFixed(3)})`)
      root.style.setProperty('--fd-shadow-lg', `0 16px 44px rgba(${shc},${(0.18 * sh + 0.02).toFixed(3)})`)
    }
  }, [settings, resolvedTheme, mounted])

  return null
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <CustomThemeInjector />
      {children}
    </NextThemesProvider>
  )
}
