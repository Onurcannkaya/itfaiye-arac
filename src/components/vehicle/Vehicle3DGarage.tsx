"use client"

import React, { useRef, useState, useEffect, Suspense } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { 
  OrbitControls, 
  useGLTF, 
  Environment, 
  ContactShadows,
  Html,
  Center
} from "@react-three/drei"
import * as THREE from "three"
import { cn } from "@/lib/utils"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { 
  RotateCcw, 
  Maximize2, 
  Eye, 
  EyeOff, 
  Box, 
  Loader2,
  MousePointer2,
  Move3D
} from "lucide-react"

// ——— Types ———
export interface Vehicle3DGarageProps {
  compartmentKeys: string[]
  activeCompartment: string | null
  onSelect: (key: string) => void
  vehicleType?: string
  className?: string
  suKapasite?: number
  kopukKapasite?: number
}

// ——— Compartment Hotspot positions (world-space after model is centered & scaled) ———
// Model raw: X=0.254 (width), Y=0.721 (length), Z=0.348 (height)
// Root matrix swaps Y↔Z, then Center normalizes. Rendered approx: X=width, Y=height, Z=length
// Truck faces +Z (front=cabin), -Z (rear=arka)
const COMPARTMENT_HOTSPOTS: Record<string, { position: [number, number, number]; label: string }> = {
  kabin_ici:       { position: [0.0,  0.32, 0.42], label: "Kabin İçi" },
  arac_ustu:       { position: [0.0,  0.52, 0.0],  label: "Araç Üstü" },
  sol_on_kapak:    { position: [0.22, 0.15, 0.22],  label: "Sol Ön Kapak" },
  sag_on_kapak:    { position: [-0.22, 0.15, 0.22], label: "Sağ Ön Kapak" },
  sol_orta_kapak:  { position: [0.22, 0.15, -0.02], label: "Sol Orta Kapak" },
  sag_orta_kapak:  { position: [-0.22, 0.15, -0.02],label: "Sağ Orta Kapak" },
  sol_arka_kapak:  { position: [0.22, 0.15, -0.25], label: "Sol Arka Kapak" },
  sag_arka_kapak:  { position: [-0.22, 0.15, -0.25],label: "Sağ Arka Kapak" },
  arka_kapak:      { position: [0.0,  0.22, -0.48], label: "Arka Kapak" },
  arka_bolme:      { position: [0.0,  0.10, -0.40], label: "Arka Bölme" },
  arac_ici:        { position: [0.0,  0.02, 0.05],  label: "Araç İçi" },
}

// ——— Helper: match hotspot keys ———
const matchHotspotToKey = (hotspot: string, keys: string[]): string | null => {
  if (keys.includes(hotspot)) return hotspot
  const normHotspot = hotspot.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const k of keys) {
    const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normK === normHotspot) return k
  }
  const cleanHotspot = hotspot.replace('_kapak', '').replace('_ici', '').replace('_bolme', '')
  const normCleanHotspot = cleanHotspot.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const k of keys) {
    const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normK.includes(normCleanHotspot) || normCleanHotspot.includes(normK)) return k
  }
  return null
}

// ——— Fire Truck Model sub-component ———
function FireTruckModel({ url, onLoaded }: { url: string; onLoaded?: (box: THREE.Box3) => void }) {
  const { scene } = useGLTF(url)
  const modelRef = useRef<THREE.Group>(null!)

  useEffect(() => {
    if (scene) {
      // Enhance materials for better rendering
      scene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material) {
            child.material.envMapIntensity = 1.5
            child.material.needsUpdate = true
          }
        }
      })

      // Report bounding box after Center processes the model
      if (onLoaded) {
        setTimeout(() => {
          const box = new THREE.Box3().setFromObject(scene)
          onLoaded(box)
        }, 100)
      }
    }
  }, [scene, onLoaded])

  return (
    <group ref={modelRef}>
      <primitive object={scene} />
    </group>
  )
}

// ——— Hotspot marker sub-component ———
function HotspotMarker({ 
  position, 
  label, 
  isActive, 
  isAvailable,
  onClick,
  showLabels 
}: { 
  position: [number, number, number]
  label: string
  isActive: boolean
  isAvailable: boolean
  onClick: () => void
  showLabels: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing animation
      const t = state.clock.elapsedTime
      const pulse = isActive ? 1.0 + Math.sin(t * 3) * 0.3 : (hovered ? 1.15 : 1.0)
      meshRef.current.scale.setScalar(pulse)
    }
  })

  const color = isActive 
    ? "#16a34a"  // green 
    : isAvailable 
      ? "#06b6d4" // cyan 
      : "#64748b" // gray

  return (
    <group position={position}>
      {/* Outer ring glow */}
      <mesh 
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[0.028, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={isActive ? 2.5 : hovered ? 1.8 : 0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Label */}
      {(showLabels || isActive || hovered) && (
        <Html
          position={[0, 0.055, 0]}
          center
          distanceFactor={0.5}
          style={{ pointerEvents: 'none' }}
        >
          <div className={cn(
            "whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold font-mono shadow-lg border backdrop-blur-sm transition-all",
            isActive
              ? "bg-[rgba(22,163,74,0.9)] text-white border-green-400/50"
              : "bg-[rgba(0,0,0,0.75)] text-cyan-300 border-cyan-500/30"
          )}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}

// ——— Garage Floor ———
function GarageFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[4, 4]} />
      <meshStandardMaterial 
        color="#1a1a2e"
        roughness={0.3}
        metalness={0.6}
      />
    </mesh>
  )
}

// ——— Garage Grid Lines ———
function GarageGrid() {
  return (
    <gridHelper 
      args={[4, 40, '#1e3a5f', '#0d1b2a']} 
      position={[0, -0.009, 0]}
    />
  )
}

// ——— Main 3D Scene ———
function Scene({ 
  compartmentKeys, 
  activeCompartment, 
  onSelect,
  showLabels,
  autoRotate
}: {
  compartmentKeys: string[]
  activeCompartment: string | null
  onSelect: (key: string) => void
  showLabels: boolean
  autoRotate: boolean
}) {
  const controlsRef = useRef<any>(null)

  const hotspots = Object.entries(COMPARTMENT_HOTSPOTS).map(([key, data]) => {
    const matchedKey = matchHotspotToKey(key, compartmentKeys)
    return {
      key,
      ...data,
      matchedKey,
      isAvailable: matchedKey !== null,
      isActive: matchedKey !== null && matchedKey === activeCompartment
    }
  }).filter(h => h.isAvailable)

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[5, 8, 5]} 
        intensity={1.2} 
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <directionalLight position={[-3, 4, -3]} intensity={0.4} />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#06b6d4" />

      {/* Environment */}
      <Environment preset="city" />

      {/* Garage */}
      <GarageFloor />
      <GarageGrid />

      {/* Contact shadows for grounding */}
      <ContactShadows
        position={[0, -0.009, 0]}
        opacity={0.6}
        scale={3}
        blur={2}
        far={1}
      />

      {/* Fire truck model — Center handles auto-centering + scale */}
      <Center scale={1.2}>
        <FireTruckModel url="/3dmodels/scene.gltf" />
      </Center>

      {/* Compartment hotspots */}
      {hotspots.map((hotspot) => (
        <HotspotMarker
          key={hotspot.key}
          position={hotspot.position}
          label={
            (hotspot.matchedKey && COMPARTMENT_NAMES[hotspot.matchedKey]) 
              ? COMPARTMENT_NAMES[hotspot.matchedKey] 
              : hotspot.label
          }
          isActive={hotspot.isActive}
          isAvailable={hotspot.isAvailable}
          onClick={() => hotspot.matchedKey && onSelect(hotspot.matchedKey)}
          showLabels={showLabels}
        />
      ))}

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        enableDamping
        dampingFactor={0.05}
        minDistance={0.8}
        maxDistance={4.0}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.1}
        enablePan={true}
        panSpeed={0.5}
        target={[0, 0.15, 0]}
      />
    </>
  )
}

// ——— Loading Fallback ———
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[rgba(0,0,0,0.7)] border border-cyan-500/30 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <div className="text-center">
          <p className="text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider">3D Model Yükleniyor</p>
          <p className="text-[10px] text-slate-400 mt-1">İtfaiye aracı sahneye yükleniyor...</p>
        </div>
      </div>
    </Html>
  )
}

// ——— Main Export ———
export function Vehicle3DGarage({
  compartmentKeys,
  activeCompartment,
  onSelect,
  vehicleType,
  className,
  suKapasite,
  kopukKapasite
}: Vehicle3DGarageProps) {
  const [showLabels, setShowLabels] = useState(true)
  const [autoRotate, setAutoRotate] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* 3D Canvas */}
      <div className={cn(
        "relative w-full rounded-xl overflow-hidden border border-[var(--fd-border)] bg-gradient-to-b from-[#0a0e1a] via-[#0d1225] to-[#0a0e1a]",
        isFullscreen ? "h-screen" : "h-[420px] sm:h-[500px] lg:h-[550px]"
      )}>
        {/* Tactical HUD overlay top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-widest">
              3D GARAJ — {vehicleType || "İtfaiye Aracı"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className="p-1.5 rounded-md bg-black/40 border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all"
              title={showLabels ? "Etiketleri Gizle" : "Etiketleri Göster"}
            >
              {showLabels 
                ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> 
                : <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              }
            </button>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={cn(
                "p-1.5 rounded-md border transition-all",
                autoRotate 
                  ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" 
                  : "bg-black/40 border-white/10 text-slate-500 hover:border-white/20"
              )}
              title={autoRotate ? "Rotasyonu Durdur" : "Otomatik Döndür"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-md bg-black/40 border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all"
              title="Tam Ekran"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Corner HUD decorations */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-xl pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/30 rounded-tr-xl pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/30 rounded-bl-xl pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30 rounded-br-xl pointer-events-none z-10" />

        {/* Three.js Canvas */}
        <Canvas
          shadows
          camera={{ position: [1.4, 0.9, 1.4], fov: 40, near: 0.01, far: 100 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          dpr={[1, 1.5]}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.1
          }}
        >
          <color attach="background" args={["#0a0e1a"]} />
          <fog attach="fog" args={["#0a0e1a", 2.5, 5]} />
          <Suspense fallback={<LoadingFallback />}>
            <Scene 
              compartmentKeys={compartmentKeys}
              activeCompartment={activeCompartment}
              onSelect={onSelect}
              showLabels={showLabels}
              autoRotate={autoRotate}
            />
          </Suspense>
        </Canvas>

        {/* Bottom HUD info bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <MousePointer2 className="w-3 h-3" /> Fare: Döndür
            </span>
            <span className="flex items-center gap-1">
              <Move3D className="w-3 h-3" /> Scroll: Yakınlaştır
            </span>
          </div>

          <div className="flex items-center gap-3">
            {suKapasite && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-blue-400">💧</span>
                <span className="text-blue-300">{suKapasite}L</span>
              </div>
            )}
            {kopukKapasite && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-amber-400">🧯</span>
                <span className="text-amber-300">{kopukKapasite}L</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
              <Box className="w-3 h-3" />
              <span>{compartmentKeys.length} Bölme</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active compartment indicator */}
      {activeCompartment && (
        <div className="mt-2 px-3 py-2 bg-[var(--fd-accent-soft2)] border border-[var(--fd-accent-soft)] rounded-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-[var(--fd-accent)]">
            Aktif Bölme: {COMPARTMENT_NAMES[activeCompartment] || activeCompartment}
          </span>
        </div>
      )}
    </div>
  )
}

// Preload model
useGLTF.preload("/3dmodels/scene.gltf")
