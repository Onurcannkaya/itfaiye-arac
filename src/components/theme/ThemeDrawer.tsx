"use client"

import { useThemeStore } from '@/lib/themeStore'
import { useTheme } from 'next-themes'
import { X, Sun, Moon, Check, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ThemeDrawerProps {
  onClose: () => void
}

export function ThemeDrawer({ onClose }: ThemeDrawerProps) {
  const { settings, setSettings, resetSettings } = useThemeStore()
  const { setTheme, theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark')

  const accentColors = [
    { name: 'İtfaiye Kırmızısı', value: '#dc2626' },
    { name: 'Alev Turuncusu', value: '#ea580c' },
    { name: 'Koyu Kırmızı', value: '#b91c1c' },
    { name: 'Operasyon Mavisi', value: '#2563eb' },
    { name: 'Siber Deniz (Teal)', value: '#0891b2' },
  ]

  const fontOptions = [
    { label: 'IBM Plex Sans', value: "'IBM Plex Sans'" },
    { label: 'Source Sans 3', value: "'Source Sans 3'" },
    { label: 'Sistem Yazı Tipi', value: "system-ui, -apple-system, sans-serif" },
    { label: 'IBM Plex Mono', value: "'IBM Plex Mono'" },
  ]

  return (
    <div className="absolute right-0 top-[120%] mt-2 w-80 z-50 bg-[var(--fd-surface)] border border-[var(--fd-border)] shadow-[var(--fd-shadow-lg)] rounded-[var(--fd-r)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
      
      {/* Header */}
      <div className="shrink-0 p-3.5 flex items-center justify-between border-b border-[var(--fd-border)] bg-[var(--fd-surface2)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-bold text-[var(--fd-text)]">Görünümü Özelleştir</span>
          <span className="text-[10px] text-[var(--fd-text3)]">Arayüz canlı güncellenir</span>
        </div>
        <button 
          onClick={onClose}
          className="w-6.5 h-6.5 rounded-[var(--fd-r-sm)] bg-[var(--fd-surface3)] hover:bg-[var(--fd-border)] text-[var(--fd-text2)] hover:text-[var(--fd-text)] flex items-center justify-center transition-colors border-none cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable Sliders & Options */}
      <div className="max-h-[350px] overflow-y-auto p-4 flex flex-col gap-4.5 scrollbar-thin scrollbar-thumb-[var(--fd-border-strong)]">
        
        {/* Appearance Mode */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9.5px] font-bold tracking-[0.06em] text-[var(--fd-text3)] uppercase">Görünüm Modu</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setTheme('light')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-8.5 border rounded-[var(--fd-r-sm)] font-semibold text-[11.5px] cursor-pointer transition-all",
                !isDark ? "border-[var(--fd-accent)] bg-[var(--fd-accent-soft)] text-[var(--fd-accent)]" : "border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text2)] hover:bg-[var(--fd-surface3)]"
              )}
            >
              <Sun size={13} /> <span>Açık</span>
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-8.5 border rounded-[var(--fd-r-sm)] font-semibold text-[11.5px] cursor-pointer transition-all",
                isDark ? "border-[var(--fd-accent)] bg-[var(--fd-accent-soft)] text-[var(--fd-accent)]" : "border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text2)] hover:bg-[var(--fd-surface3)]"
              )}
            >
              <Moon size={13} /> <span>Koyu</span>
            </button>
          </div>
        </div>

        {/* Accent Color Swatches */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9.5px] font-bold tracking-[0.06em] text-[var(--fd-text3)] uppercase">Vurgu Rengi</span>
          <div className="flex gap-2.5">
            {accentColors.map((color) => {
              const isActive = settings.accent === color.value
              return (
                <button
                  key={color.value}
                  title={color.name}
                  onClick={() => setSettings({ accent: color.value })}
                  className="w-7.5 h-7.5 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center border-none"
                  style={{ 
                    backgroundColor: color.value,
                    boxShadow: isActive ? '0 0 0 1.5px var(--fd-surface), 0 0 0 3px var(--fd-accent)' : 'none'
                  }}
                >
                  {isActive && <Check size={12} color="#fff" strokeWidth={3} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sliders Area */}
        <div className="flex flex-col gap-3.5 border-t border-[var(--fd-border)] pt-3.5">
          <span className="text-[9.5px] font-bold tracking-[0.06em] text-[var(--fd-text3)] uppercase">Ölçü & Biçim</span>
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--fd-text2)] font-medium">Köşe Ovalliği</span>
              <span className="text-[var(--fd-text)] font-bold font-mono">{settings.radius}px</span>
            </div>
            <input 
              type="range" min="0" max="20" step="1" 
              value={settings.radius} 
              onChange={(e) => setSettings({ radius: Number(e.target.value) })}
              className="w-full h-1 bg-[var(--fd-border)] rounded-full appearance-none cursor-pointer accent-[var(--fd-accent)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--fd-text2)] font-medium">Gölge Gücü</span>
              <span className="text-[var(--fd-text)] font-bold font-mono">{Math.round(settings.shadow * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1.2" step="0.1" 
              value={settings.shadow} 
              onChange={(e) => setSettings({ shadow: Number(e.target.value) })}
              className="w-full h-1 bg-[var(--fd-border)] rounded-full appearance-none cursor-pointer accent-[var(--fd-accent)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--fd-text2)] font-medium">İç Boşluklar</span>
              <span className="text-[var(--fd-text)] font-bold font-mono">{Math.round(settings.spacing * 100)}%</span>
            </div>
            <input 
              type="range" min="0.7" max="1.3" step="0.05" 
              value={settings.spacing} 
              onChange={(e) => setSettings({ spacing: Number(e.target.value) })}
              className="w-full h-1 bg-[var(--fd-border)] rounded-full appearance-none cursor-pointer accent-[var(--fd-accent)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--fd-text2)] font-medium">Yazı Ölçeği (Genel)</span>
              <span className="text-[var(--fd-text)] font-bold font-mono">{settings.fontScale}px</span>
            </div>
            <input 
              type="range" min="12" max="17" step="0.5" 
              value={settings.fontScale} 
              onChange={(e) => setSettings({ fontScale: Number(e.target.value) })}
              className="w-full h-1 bg-[var(--fd-border)] rounded-full appearance-none cursor-pointer accent-[var(--fd-accent)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--fd-text2)] font-medium">Küçük Yazı Büyütme (Scale)</span>
              <span className="text-[var(--fd-text)] font-bold font-mono">%{Math.round((settings.smallTextScale || 1.0) * 100)}</span>
            </div>
            <input 
              type="range" min="1.0" max="1.5" step="0.05" 
              value={settings.smallTextScale || 1.0} 
              onChange={(e) => setSettings({ smallTextScale: Number(e.target.value) })}
              className="w-full h-1 bg-[var(--fd-border)] rounded-full appearance-none cursor-pointer accent-[var(--fd-accent)]"
            />
          </div>
        </div>

        {/* Fonts List */}
        <div className="flex flex-col gap-1.5 border-t border-[var(--fd-border)] pt-3.5">
          <span className="text-[9.5px] font-bold tracking-[0.06em] text-[var(--fd-text3)] uppercase">Yazı Tipi</span>
          <div className="flex flex-col gap-1">
            {fontOptions.map(font => {
              const isActive = settings.font === font.value
              return (
                <button
                  key={font.value}
                  onClick={() => setSettings({ font: font.value })}
                  className={cn(
                    "flex items-center justify-between w-full h-8 px-2.5 border rounded-[var(--fd-r-sm)] font-medium text-[11px] cursor-pointer transition-all",
                    isActive 
                      ? "border-[var(--fd-accent)] bg-[var(--fd-accent-soft)] text-[var(--fd-text)]" 
                      : "border-[var(--fd-border)] bg-[var(--fd-surface2)] text-[var(--fd-text2)] hover:text-[var(--fd-text)]"
                  )}
                >
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                  {isActive && <Check size={12} className="text-[var(--fd-accent)]" />}
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Footer (Actions) */}
      <div className="shrink-0 p-3 border-t border-[var(--fd-border)] bg-[var(--fd-surface2)] flex gap-2">
        <button
          onClick={() => {
            resetSettings()
            setTheme('light')
          }}
          className="flex-1 flex items-center justify-center gap-1 h-8.5 border border-[var(--fd-border)] bg-[var(--fd-surface)] text-[var(--fd-text2)] rounded-[var(--fd-r-sm)] font-semibold text-[11px] cursor-pointer hover:bg-[var(--fd-surface3)] hover:text-[var(--fd-text)] transition-all"
        >
          <RotateCcw size={12} /> <span>Sıfırla</span>
        </button>
        <button
          onClick={onClose}
          className="flex-1 h-8.5 bg-[var(--fd-accent)] text-white rounded-[var(--fd-r-sm)] font-semibold text-[11px] cursor-pointer hover:opacity-90 transition-all border-none"
        >
          Tamam
        </button>
      </div>
    </div>
  )
}
