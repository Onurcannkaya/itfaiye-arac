"use client"
import { cn } from "@/lib/utils"
import { COMPARTMENT_NAMES } from "@/lib/constants"

interface VehicleSchematicProps {
  compartmentKeys: string[]
  activeCompartment: string | null
  onSelect: (key: string) => void
  vehicleType?: string
}

const COMPARTMENT_POSITIONS: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  kabin_ici:      { x: 10,  y: 65,  w: 145, h: 110, label: "Kabin İçi" },
  arac_ici:       { x: 10,  y: 65,  w: 145, h: 110, label: "Araç İçi" },
  sol_on_kapak:   { x: 160, y: 10,  w: 95,  h: 75,  label: "Sol Ön" },
  sol_orta_kapak: { x: 265, y: 10,  w: 95,  h: 75,  label: "Sol Orta" },
  sol_arka_kapak: { x: 370, y: 10,  w: 95,  h: 75,  label: "Sol Arka" },
  sag_on_kapak:   { x: 160, y: 155, w: 95,  h: 75,  label: "Sağ Ön" },
  sag_orta_kapak: { x: 265, y: 155, w: 95,  h: 75,  label: "Sağ Orta" },
  sag_arka_kapak: { x: 370, y: 155, w: 95,  h: 75,  label: "Sağ Arka" },
  arac_ustu:      { x: 475, y: 65,  w: 120, h: 110, label: "Araç Üstü" },
}

export function VehicleSchematic({ compartmentKeys, activeCompartment, onSelect, vehicleType }: VehicleSchematicProps) {
  return (
    <div className="w-full">
      <svg
        viewBox="0 0 620 240"
        className="w-full h-auto select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Araç gövdesi (arka plan) */}
        <rect x="5" y="5" width="610" height="230" rx="20" ry="20"
          className="fill-muted/30 stroke-border" strokeWidth="2" />

        {/* Kabin ön kısım */}
        <path d="M 25 75 Q 10 120 25 165 L 150 165 L 150 75 Z" 
          className="fill-muted/20 stroke-border/50" strokeWidth="1" strokeDasharray="4 2" />
        
        {/* Araç merkezi gövde çizgisi */}
        <line x1="155" y1="120" x2="480" y2="120" className="stroke-border/30" strokeWidth="1" strokeDasharray="6 3" />

        {/* Tekerlekler */}
        <ellipse cx="130" cy="50"  rx="22" ry="12" className="fill-muted/40 stroke-border/60" strokeWidth="1.5" />
        <ellipse cx="130" cy="190" rx="22" ry="12" className="fill-muted/40 stroke-border/60" strokeWidth="1.5" />
        <ellipse cx="430" cy="50"  rx="22" ry="12" className="fill-muted/40 stroke-border/60" strokeWidth="1.5" />
        <ellipse cx="430" cy="190" rx="22" ry="12" className="fill-muted/40 stroke-border/60" strokeWidth="1.5" />

        {/* Tıklanabilir bölme alanları */}
        {compartmentKeys.map(key => {
          const pos = COMPARTMENT_POSITIONS[key]
          if (!pos) return null
          const isActive = activeCompartment === key
          return (
            <g key={key} onClick={() => onSelect(key)} className="cursor-pointer group">
              <rect
                x={pos.x} y={pos.y} width={pos.w} height={pos.h}
                rx="8" ry="8"
                className={cn(
                  "transition-all duration-200",
                  isActive
                    ? "fill-primary/20 stroke-primary"
                    : "fill-surface/60 stroke-border hover:fill-primary/10 hover:stroke-primary/60"
                )}
                strokeWidth={isActive ? "2.5" : "1.5"}
              />
              {/* Pulse efekti aktif bölmede */}
              {isActive && (
                <rect
                  x={pos.x} y={pos.y} width={pos.w} height={pos.h}
                  rx="8" ry="8"
                  className="fill-primary/10 stroke-primary animate-pulse"
                  strokeWidth="1"
                />
              )}
              {/* Bölme etiketi */}
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + pos.h / 2 - 4}
                textAnchor="middle"
                className={cn(
                  "text-[11px] font-semibold pointer-events-none select-none",
                  isActive ? "fill-primary" : "fill-foreground/80"
                )}
              >
                {pos.label}
              </text>
              {/* İkon alt yazı */}
              <text
                x={pos.x + pos.w / 2}
                y={pos.y + pos.h / 2 + 12}
                textAnchor="middle"
                className="text-[9px] fill-muted-foreground pointer-events-none select-none"
              >
                {isActive ? "● Seçili" : "Tıkla"}
              </text>
            </g>
          )
        })}

        {/* "ÖN" ve "ARKA" yön göstergesi */}
        <text x="75" y="225" textAnchor="middle" className="text-[10px] fill-muted-foreground font-bold uppercase tracking-widest">
          Ön
        </text>
        <text x="545" y="225" textAnchor="middle" className="text-[10px] fill-muted-foreground font-bold uppercase tracking-widest">
          Arka
        </text>

        {/* Ok işaretleri */}
        <path d="M 50 218 L 30 218" className="stroke-muted-foreground" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        <path d="M 568 218 L 588 218" className="stroke-muted-foreground" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" className="fill-muted-foreground" />
          </marker>
        </defs>
      </svg>
      {vehicleType && (
        <p className="text-center text-xs text-muted-foreground mt-2">{vehicleType} — Şematik Üst Görünüm</p>
      )}
    </div>
  )
}
