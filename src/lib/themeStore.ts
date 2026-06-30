import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeSettings {
  mode: ThemeMode
  accent: string
  radius: number
  shadow: number
  spacing: number
  fontScale: number
  smallTextScale: number
  font: string
}

interface ThemeStore {
  settings: ThemeSettings
  sidebarCollapsed: boolean
  setSettings: (settings: Partial<ThemeSettings>) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  resetSettings: () => void
}

export const defaultThemeSettings: ThemeSettings = {
  mode: 'light',
  accent: '#dc2626', // İtfaiye Kırmızısı
  radius: 10,
  shadow: 0.6,
  spacing: 1,
  fontScale: 14,
  smallTextScale: 1.0,
  font: "'IBM Plex Sans'",
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      settings: defaultThemeSettings,
      sidebarCollapsed: false,
      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      resetSettings: () => set({ settings: defaultThemeSettings, sidebarCollapsed: false }),
    }),
    {
      name: 'itfaiye-theme-settings',
    }
  )
)
