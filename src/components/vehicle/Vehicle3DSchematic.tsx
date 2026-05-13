"use client"
import { cn } from "@/lib/utils"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { useState } from "react"

interface Vehicle3DSchematicProps {
  compartmentKeys: string[]
  activeCompartment: string | null
  onSelect: (key: string) => void
  vehicleType?: string
}

// Hotspot positions on SVG (isometric top-down 3/4 view positions)
const HOTSPOT_POSITIONS: Record<string, { cx: number; cy: number; label: string; side: "left" | "right" | "top" | "center" }> = {
  kabin_ici:      { cx: 135, cy: 180, label: "Kabin İçi",       side: "center" },
  arac_ici:       { cx: 135, cy: 180, label: "Araç İçi",        side: "center" },
  sol_on_kapak:   { cx: 260, cy: 100, label: "Sol Ön",          side: "left" },
  sol_orta_kapak: { cx: 370, cy: 85,  label: "Sol Orta",        side: "left" },
  sol_arka_kapak: { cx: 480, cy: 70,  label: "Sol Arka",        side: "left" },
  sag_on_kapak:   { cx: 260, cy: 265, label: "Sağ Ön",          side: "right" },
  sag_orta_kapak: { cx: 370, cy: 280, label: "Sağ Orta",        side: "right" },
  sag_arka_kapak: { cx: 480, cy: 295, label: "Sağ Arka",        side: "right" },
  arac_ustu:      { cx: 550, cy: 170, label: "Araç Üstü",       side: "top" },
}

export function Vehicle3DSchematic({ compartmentKeys, activeCompartment, onSelect, vehicleType }: Vehicle3DSchematicProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  return (
    <div className="w-full relative">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      </div>

      <svg
        viewBox="0 0 700 370"
        className="w-full h-auto select-none relative z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Neon Glow Filters */}
          <filter id="neon-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="neon-glow-active" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="vehicle-shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
            <feOffset dx="4" dy="6" />
            <feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>
            <feMerge>
              <feMergeNode /><feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Animated gradient for active hotspot */}
          <radialGradient id="active-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.6)">
              <animate attributeName="stopColor" values="rgba(34,211,238,0.6);rgba(168,85,247,0.6);rgba(34,211,238,0.6)" dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>

          {/* Pulse animation */}
          <radialGradient id="pulse-ring" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0)" />
            <stop offset="70%" stopColor="rgba(34,211,238,0.15)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
        </defs>

        {/* === VEHICLE BODY (Isometric Fire Truck) === */}
        <g filter="url(#vehicle-shadow)" transform="translate(20, 30)">

          {/* Main body - elongated rectangle with perspective */}
          <path
            d="M 100 140 L 180 90 L 560 55 L 580 65 L 580 280 L 560 290 L 180 260 L 100 210 Z"
            className="fill-muted/15 stroke-border/40"
            strokeWidth="1.5"
          />

          {/* Kabin (truck cab) */}
          <path
            d="M 80 155 L 100 140 L 180 90 L 195 95 L 195 255 L 180 260 L 100 210 L 80 195 Z"
            className="fill-muted/25 stroke-border/50"
            strokeWidth="1.5"
          />

          {/* Windshield */}
          <path
            d="M 90 160 L 110 148 L 170 110 L 175 112 L 175 125 L 110 162 L 90 173 Z"
            className="fill-cyan-500/8 stroke-cyan-500/20"
            strokeWidth="0.8"
          />

          {/* Top deck / water tank area */}
          <path
            d="M 195 95 L 560 55 L 560 65 L 195 105 Z"
            className="fill-muted/10 stroke-border/30"
            strokeWidth="1"
          />

          {/* Side panels - left */}
          <path
            d="M 180 90 L 560 55 L 560 170 L 180 175 Z"
            className="fill-surface/20 stroke-border/25"
            strokeWidth="0.8"
            strokeDasharray="4 3"
          />

          {/* Side panels - right */}
          <path
            d="M 180 260 L 560 290 L 560 180 L 180 175 Z"
            className="fill-surface/15 stroke-border/25"
            strokeWidth="0.8"
            strokeDasharray="4 3"
          />

          {/* Compartment divider lines (left side) */}
          <line x1="300" y1="77" x2="300" y2="175" className="stroke-border/15" strokeWidth="0.5" strokeDasharray="3 4" />
          <line x1="420" y1="66" x2="420" y2="175" className="stroke-border/15" strokeWidth="0.5" strokeDasharray="3 4" />

          {/* Compartment divider lines (right side) */}
          <line x1="300" y1="175" x2="300" y2="270" className="stroke-border/15" strokeWidth="0.5" strokeDasharray="3 4" />
          <line x1="420" y1="175" x2="420" y2="285" className="stroke-border/15" strokeWidth="0.5" strokeDasharray="3 4" />

          {/* Wheels */}
          <ellipse cx="160" cy="96" rx="20" ry="10" className="fill-muted/30 stroke-border/40" strokeWidth="1.2" />
          <ellipse cx="160" cy="256" rx="20" ry="10" className="fill-muted/30 stroke-border/40" strokeWidth="1.2" />
          <ellipse cx="490" cy="58" rx="20" ry="10" className="fill-muted/30 stroke-border/40" strokeWidth="1.2" />
          <ellipse cx="490" cy="292" rx="20" ry="10" className="fill-muted/30 stroke-border/40" strokeWidth="1.2" />

          {/* Warning lights (top) */}
          <rect x="118" y="87" width="50" height="5" rx="2" className="fill-danger/30 stroke-danger/40" strokeWidth="0.5">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
          </rect>

          {/* Rear */}
          <path
            d="M 560 55 L 580 65 L 580 280 L 560 290 Z"
            className="fill-muted/20 stroke-border/30"
            strokeWidth="1"
          />

          {/* Ladder/hose reel on top */}
          <line x1="220" y1="85" x2="540" y2="57" className="stroke-border/20" strokeWidth="2" strokeLinecap="round" />
          <line x1="220" y1="89" x2="540" y2="61" className="stroke-border/15" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* === NEON HOTSPOTS === */}
        {compartmentKeys.map((key) => {
          const pos = HOTSPOT_POSITIONS[key]
          if (!pos) return null
          const isActive = activeCompartment === key
          const isHovered = hoveredKey === key

          return (
            <g
              key={key}
              onClick={() => onSelect(key)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
              className="cursor-pointer"
              style={{ transition: "all 0.3s ease" }}
            >
              {/* Outer pulse ring (always animating) */}
              <circle cx={pos.cx} cy={pos.cy} r={isActive ? 28 : 18}>
                <animate attributeName="r" values={isActive ? "22;30;22" : "14;20;14"} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r="18"
                fill="none"
                className={isActive ? "stroke-cyan-400" : "stroke-cyan-500/40"}
                strokeWidth={isActive ? "2" : "1"}
                opacity={isActive ? 1 : 0.5}
              >
                <animate attributeName="r" values={isActive ? "18;26;18" : "14;19;14"} dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values={isActive ? "0.8;0.2;0.8" : "0.4;0.1;0.4"} dur="2.5s" repeatCount="indefinite" />
              </circle>

              {/* Active glow background */}
              {isActive && (
                <circle cx={pos.cx} cy={pos.cy} r="30" fill="url(#active-glow)" filter="url(#neon-glow-active)">
                  <animate attributeName="r" values="28;35;28" dur="3s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Main hotspot dot */}
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={isActive ? 10 : isHovered ? 9 : 7}
                className={cn(
                  "transition-all duration-300",
                  isActive ? "fill-cyan-400" : isHovered ? "fill-cyan-400/80" : "fill-cyan-500/50"
                )}
                filter={isActive || isHovered ? "url(#neon-cyan)" : undefined}
              />

              {/* Inner bright center */}
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={isActive ? 4 : 3}
                className="fill-white/90"
              />

              {/* Label */}
              <text
                x={pos.cx}
                y={pos.cy + (isActive ? 22 : 18)}
                textAnchor="middle"
                className={cn(
                  "text-[10px] font-bold pointer-events-none select-none tracking-wide uppercase",
                  isActive ? "fill-cyan-400" : isHovered ? "fill-cyan-300/80" : "fill-muted-foreground/60"
                )}
                filter={isActive ? "url(#neon-cyan)" : undefined}
              >
                {pos.label}
              </text>

              {/* Status indicator */}
              {isActive && (
                <text
                  x={pos.cx}
                  y={pos.cy + 34}
                  textAnchor="middle"
                  className="text-[8px] fill-cyan-400/60 font-mono pointer-events-none select-none"
                >
                  ● SEÇİLİ
                </text>
              )}
            </g>
          )
        })}

        {/* Direction labels */}
        <text x="80" y="355" className="text-[9px] fill-muted-foreground/40 font-bold uppercase tracking-[0.3em]">
          Ön
        </text>
        <text x="590" y="355" className="text-[9px] fill-muted-foreground/40 font-bold uppercase tracking-[0.3em]">
          Arka
        </text>

        {/* Direction arrows */}
        <path d="M 75 348 L 55 348" className="stroke-muted-foreground/30" strokeWidth="1.5" markerEnd="url(#arrowhead3d)" />
        <path d="M 620 348 L 640 348" className="stroke-muted-foreground/30" strokeWidth="1.5" markerEnd="url(#arrowhead3d)" />
        <defs>
          <marker id="arrowhead3d" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" className="fill-muted-foreground/30" />
          </marker>
        </defs>
      </svg>

      {/* Vehicle type label */}
      {vehicleType && (
        <div className="text-center mt-3">
          <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-[0.25em]">
            {vehicleType} — İnteraktif Şematik
          </p>
        </div>
      )}
    </div>
  )
}
