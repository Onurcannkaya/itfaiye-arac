"use client"

import React, { useRef, useState, useEffect, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { 
  OrbitControls, 
  useGLTF, 
  Environment, 
  ContactShadows,
  Html
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
  isModalOpen?: boolean
  plaka?: string
  modelUrl?: string
  vehicleModel?: string
}

// ——— Compartment Hotspot positions (world-space after model is centered & scaled to exactly 6m length) ———
// Truck faces +Z (front/cabin), -Z (rear)
// Total length: 6.0m (Z: -3.0 to +3.0)
// Total width: 2.1m (X: -1.05 to +1.05)
// Total height: 2.9m (Y: 0.0 to +2.9)
const COMPARTMENT_HOTSPOTS: Record<string, { position: [number, number, number]; label: string }> = {
  kabin_ici:       { position: [0.0,   1.0,  2.0],  label: "Kabin İçi" },
  arac_ustu:       { position: [0.0,   2.3,  -0.5], label: "Araç Üstü" },
  sol_on_kapak:    { position: [1.08,  1.1,  0.8],  label: "Sol Ön Kapak" },
  sag_on_kapak:    { position: [-1.08, 1.1,  0.8],  label: "Sağ Ön Kapak" },
  sol_orta_kapak:  { position: [1.08,  1.1,  -0.4], label: "Sol Orta Kapak" },
  sag_orta_kapak:  { position: [-1.08, 1.1,  -0.4], label: "Sağ Orta Kapak" },
  sol_arka_kapak:  { position: [1.08,  1.1,  -2.0], label: "Sol Arka Kapak" },
  sag_arka_kapak:  { position: [-1.08, 1.1,  -2.0], label: "Sağ Arka Kapak" },
  arka_kapak:      { position: [0.0,   1.2,  -3.0], label: "Arka Kapak" },
  arka_bolme:      { position: [0.0,   0.8,  -2.8], label: "Arka Bölme" },
  arac_ici:        { position: [0.0,   0.9,  3.1],  label: "Araç İçi" },
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
    // Prevent cross-matching between completely different compartment types
    const hk = hotspot.toLowerCase();
    const kk = k.toLowerCase();
    if ((hk.includes("ici") && kk.includes("ustu")) || (hk.includes("ustu") && kk.includes("ici"))) continue;
    if ((hk.includes("bolme") && kk.includes("kapak")) || (hk.includes("kapak") && kk.includes("bolme"))) continue;

    const normK = k.toLowerCase().replace('_kapak', '').replace('_ici', '').replace('_bolme', '').replace(/[^a-z0-9]/g, '')
    if (normK.includes(normCleanHotspot) || normCleanHotspot.includes(normK)) return k
  }
  return null
}

// ——— Vehicle Model Configs ———
const VEHICLE_MODEL_CONFIGS: Record<string, {
  targetLength: number
  envMapIntensity: number
  yOffset?: number
}> = {
  default: { targetLength: 6.0, envMapIntensity: 1.5 },
  fiat_doblo: { targetLength: 4.5, envMapIntensity: 2.0, yOffset: 0.01 },
  hyundai_accent: { targetLength: 4.3, envMapIntensity: 1.5, yOffset: 0.05 },
  sprinter: { targetLength: 5.8, envMapIntensity: 1.5, yOffset: 0.01 },
}

function normalizeVehicleModel(str?: string): string {
  if (!str) return ''
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function getModelConfig(vehicleModel?: string) {
  const norm = normalizeVehicleModel(vehicleModel)
  if (norm) {
    if (norm.includes('doblo')) return VEHICLE_MODEL_CONFIGS.fiat_doblo
    if (norm.includes('hyundai') || norm.includes('accent')) return VEHICLE_MODEL_CONFIGS.hyundai_accent
    if (norm.includes('sprinter')) return VEHICLE_MODEL_CONFIGS.sprinter
  }
  return VEHICLE_MODEL_CONFIGS.default
}

function isDobloModel(vehicleModel?: string): boolean {
  return normalizeVehicleModel(vehicleModel).includes('doblo')
}

function isHyundaiModel(vehicleModel?: string): boolean {
  const norm = normalizeVehicleModel(vehicleModel)
  return norm.includes('hyundai') || norm.includes('accent')
}

function isSprinterModel(vehicleModel?: string): boolean {
  return normalizeVehicleModel(vehicleModel).includes('sprinter')
}

// ——— Doblo Hotspots (smaller utility vehicle, scaled to ~4.5 unit length) ———
const DOBLO_HOTSPOTS: Record<string, { position: [number, number, number]; label: string }> = {
  arac_ici:       { position: [0.0,   0.9,  0.4],  label: "Araç İçi" },
  kabin_ici:      { position: [0.0,   0.85, 1.3],  label: "Kabin İçi" },
  bagaj_ici:      { position: [0.0,   0.6,  -1.5], label: "Bagaj İçi" },
  arka_kapak:     { position: [0.0,   0.7,  -2.0], label: "Arka Kapak" },
  sag_kapi:       { position: [-0.9,  0.8,  0.4],  label: "Sağ Kapı" },
  sol_kapi:       { position: [0.9,   0.8,  0.4],  label: "Sol Kapı" }
}

// ——— Hyundai Hotspots (sedan vehicle, scaled to ~4.3 unit length) ———
const HYUNDAI_HOTSPOTS: Record<string, { position: [number, number, number]; label: string }> = {
  arac_ici:       { position: [0.0,   0.8,  0.0],  label: "Araç İçi" },
  kabin_ici:      { position: [0.0,   0.8,  0.8],  label: "Kabin İçi" },
  bagaj_ici:      { position: [0.0,   0.6,  -1.6], label: "Bagaj İçi" },
  arka_kapak:     { position: [0.0,   0.7,  -2.1], label: "Arka Kapak" },
  sag_kapi:       { position: [-0.85, 0.7,  0.0],  label: "Sağ Kapı" },
  sol_kapi:       { position: [0.85,  0.7,  0.0],  label: "Sol Kapı" }
}


// ——— Vehicle Model sub-component ———
function FireTruckModel({ url, vehicleModel }: { url: string; vehicleModel?: string }) {
  const { scene } = useGLTF(url)
  const config = getModelConfig(vehicleModel)
  const doblo = isDobloModel(vehicleModel)
  const isHyundai = isHyundaiModel(vehicleModel)
  const isSprinter = isSprinterModel(vehicleModel)

  useEffect(() => {
    if (scene) {
      if (doblo || isHyundai || isSprinter) {
        // --- Doblo/Hyundai/Sprinter-specific logic ---
        // The GLTF root node has a matrix with -90° X rotation (Collada/OBJ → Three.js Y-up).
        // We must NOT reset rotation or the model breaks.
        scene.position.set(0, 0, 0)
        scene.scale.setScalar(1)
        // Do NOT touch scene.rotation — the GLTF root matrix handles coordinate conversion.

        // For Hyundai, hide the huge background plane and original Russian plates before calculating bounds
        if (isHyundai) {
          scene.traverse((child: any) => {
             if (child.isMesh && child.material) {
               const matName = child.material.name || ''
               // Hide huge ground plane
               if (matName === 'Plastik' && child.geometry) {
                 child.geometry.computeBoundingBox()
                 if (child.geometry.boundingBox && (child.geometry.boundingBox.max.x - child.geometry.boundingBox.min.x > 100)) {
                   child.visible = false
                 }
               }
               // Hide original Russian plates
               if (matName.includes('Gos_nomer')) {
                 child.visible = false
               }
             }
          })
        }

        // Compute bounds with the GLTF's internal transforms intact
        const box = new THREE.Box3().setFromObject(scene)
        const size = box.getSize(new THREE.Vector3())

        // Scale the longest axis to target length
        const longestAxis = Math.max(size.x, size.y, size.z)
        const scaleFactor = config.targetLength / longestAxis
        
        scene.scale.multiplyScalar(scaleFactor)

        // Recompute bounds after scaling
        const scaledBox = new THREE.Box3().setFromObject(scene)
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3())

        // Center in X and Z, place bottom (wheels) at Y=0
        scene.position.set(
          scene.position.x - scaledCenter.x,
          scene.position.y - scaledBox.min.y + (config.yOffset || 0),
          scene.position.z - scaledCenter.z
        )
      } else {
        // --- Default (Fire Truck) logic — completely unchanged ---
        scene.position.set(0, 0, 0)
        scene.scale.setScalar(1)
        scene.rotation.set(0, 0, 0)

        const box = new THREE.Box3().setFromObject(scene)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        const targetLength = config.targetLength
        const scaleFactor = targetLength / size.z

        scene.scale.setScalar(scaleFactor)

        scene.position.set(
          -center.x * scaleFactor,
          -box.min.y * scaleFactor,
          -center.z * scaleFactor
        )
      }

      // Enhance materials for realistic rendering (both models)
      scene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material) {
            child.material.envMapIntensity = config.envMapIntensity

            // Doblo: override blue body color to grey
            if (doblo && child.material.name) {
              const matName = child.material.name.toUpperCase()
              if (matName.includes('FIAT_BLUE_PRIMARY') || matName.includes('PRIMARY_COLOR')) {
                child.material.color = new THREE.Color(0x8a8f94) // Medium grey
                child.material.metalness = 0.4
                child.material.roughness = 0.45
              } else if (matName.includes('FIAT_BLUE_BADGE')) {
                child.material.color = new THREE.Color(0x6b7280) // Darker grey for badges
              }
            }

            child.material.needsUpdate = true
          }
        }
      })
    }
  }, [scene, config, doblo])

  return <primitive object={scene} />
}

function HotspotMarker({ 
  position, 
  label, 
  isActive, 
  isAvailable,
  onClick,
  showLabels,
  isModalOpen
}: { 
  position: [number, number, number]
  label: string
  isActive: boolean
  isAvailable: boolean
  onClick: () => void
  showLabels: boolean
  isModalOpen?: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing animation
      const t = state.clock.elapsedTime
      const pulse = isActive ? 1.0 + Math.sin(t * 3) * 0.35 : (hovered ? 1.2 : 1.0)
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
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={isActive ? 2.5 : hovered ? 1.8 : 0.8}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Label */}
      {!isModalOpen && (showLabels || isActive || hovered) && (
        <Html
          position={[0, 0.28, 0]}
          center
          distanceFactor={3.5}
          style={{ pointerEvents: 'none' }}
        >
          <div className={cn(
            "whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-bold font-mono shadow-[0_0_12px_rgba(0,0,0,0.6)] border backdrop-blur-md transition-all",
            isActive
              ? "bg-[rgba(22,163,74,0.92)] text-white border-green-400/50"
              : "bg-[rgba(10,14,26,0.85)] text-cyan-300 border-cyan-500/40"
          )}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}

// ——— Garage Floor ———
// ——— Sprinter Hotspots (van vehicle, scaled to ~5.8 unit length) ———
const SPRINTER_HOTSPOTS: Record<string, { position: [number, number, number]; label: string }> = {
  arac_ici:       { position: [0.0,   1.2,  1.0],  label: "Araç İçi" },
  kabin_ici:      { position: [0.0,   1.1,  2.0],  label: "Kabin İçi" },
  bagaj_ici:      { position: [0.0,   1.0,  -2.5], label: "Bagaj İçi" },
  arka_kapak:     { position: [0.0,   1.0,  -3.0], label: "Arka Kapak" },
  sag_kapi:       { position: [-1.1,  1.0,  0.5],  label: "Sağ Sürgülü Kapı" },
  sol_kapi:       { position: [1.1,   1.0,  2.0],  label: "Sol Kapı" },
  arac_ustu:      { position: [0.0,   2.5,  0.0],  label: "Araç Üstü" },
}

function GarageFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[15, 15]} />
      <meshStandardMaterial 
        color="#0b0f19"
        roughness={0.4}
        metalness={0.7}
      />
    </mesh>
  )
}

// ——— Garage Grid Lines ———
function GarageGrid() {
  return (
    <gridHelper 
      args={[12, 24, '#1e3a5f', '#090d16']} 
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
  autoRotate,
  isModalOpen,
  plaka,
  modelUrl,
  vehicleModel
}: {
  compartmentKeys: string[]
  activeCompartment: string | null
  onSelect: (key: string) => void
  showLabels: boolean
  autoRotate: boolean
  isModalOpen?: boolean
  plaka?: string
  modelUrl?: string
  vehicleModel?: string
}) {
  const controlsRef = useRef<any>(null)

  // Determine which hotspot set to use based on vehicle model
  const isDoblo = vehicleModel && vehicleModel.toLowerCase().includes('doblo')
  const isHyundai = vehicleModel && (vehicleModel.toLowerCase().includes('hyundai') || vehicleModel.toLowerCase().includes('accent'))
  const isSprinter = vehicleModel && vehicleModel.toLowerCase().includes('sprinter')
  const hotspotSource = isDoblo ? DOBLO_HOTSPOTS : (isHyundai ? HYUNDAI_HOTSPOTS : (isSprinter ? SPRINTER_HOTSPOTS : COMPARTMENT_HOTSPOTS))

  const hotspots = Object.entries(hotspotSource).map(([key, data]) => {
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
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[8, 12, 8]} 
        intensity={1.4} 
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={30}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-8, 6, -8]} intensity={0.4} />
      <pointLight position={[0, 4, 0]} intensity={0.4} color="#06b6d4" />

      {/* Environment */}
      <Environment preset="city" />

      {/* Garage */}
      <GarageFloor />
      <GarageGrid />

      {/* Contact shadows for grounding */}
      <ContactShadows
        position={[0, -0.009, 0]}
        opacity={0.75}
        scale={8}
        blur={1.5}
        far={1.5}
      />

      {/* Vehicle model — centered and scaled in FireTruckModel component */}
      <FireTruckModel url={modelUrl || "/3dmodels/scene.gltf"} vehicleModel={vehicleModel} />

      {/* License Plates — positioned differently based on vehicle type */}
      {plaka && !isDoblo && !isHyundai && !isSprinter && (
        <>
          {/* Rear License Plate (Fire Truck) */}
          <Html position={[0.46, 0.64, -3.01]} transform rotation={[0, Math.PI, 0]} scale={0.22}>
            <div className="bg-white border border-slate-400 px-1 py-0.5 rounded text-black font-extrabold text-[10px] tracking-wider select-none flex items-center justify-center gap-1 shadow-md border-l-[3px] border-l-blue-600 font-sans min-w-[65px] h-[14px] leading-none">
              <span>{plaka}</span>
            </div>
          </Html>
          {/* Front License Plate (Fire Truck) */}
          <Html position={[0, 0.48, 3.11]} transform scale={0.25}>
            <div className="bg-white border border-slate-400 px-2 py-0.5 rounded text-black font-extrabold text-[12px] tracking-wider select-none flex items-center justify-center gap-1 shadow-md border-l-[4px] border-l-blue-600 font-sans min-w-[70px] h-[16px]">
              <span>{plaka}</span>
            </div>
          </Html>
        </>
      )}
      {plaka && isDoblo && (
        <>
          {/* Front License Plate (Doblo) — front bumper at +Z, bottom intake (red circle) */}
          <Html position={[0.0, 0.15, 2.28]} transform scale={0.14}>
            <div 
              style={{ backfaceVisibility: 'hidden' }}
              className="bg-white border border-slate-400 px-1.5 py-0.5 rounded text-black font-extrabold text-[10px] tracking-wider select-none flex items-center justify-center gap-1 shadow-md border-l-[3px] border-l-blue-600 font-sans min-w-[58px] h-[13px] leading-none"
            >
              <span>{plaka}</span>
            </div>
          </Html>
          {/* Rear License Plate (Doblo) — trunk at -Z, left bumper recess (red circle) */}
          <Html position={[-0.32, 0.35, -2.25]} transform rotation={[0, Math.PI, 0]} scale={0.14}>
            <div 
              style={{ backfaceVisibility: 'hidden' }}
              className="bg-white border border-slate-400 px-1.5 py-0.5 rounded text-black font-extrabold text-[10px] tracking-wider select-none flex items-center justify-center gap-1 shadow-md border-l-[3px] border-l-blue-600 font-sans min-w-[58px] h-[13px]"
            >
              <span>{plaka}</span>
            </div>
          </Html>
        </>
      )}
      {plaka && isHyundai && (
        <>
          {/* Front License Plate (Hyundai) */}
          <Html position={[0.0, 0.22, 2.15]} transform scale={0.14}>
            <div 
              style={{ backfaceVisibility: 'hidden' }}
              className="bg-white border border-slate-400 px-1.5 py-0.5 rounded text-black font-extrabold text-[10px] tracking-wider select-none flex items-center justify-center gap-1 shadow-md border-l-[3px] border-l-blue-600 font-sans min-w-[58px] h-[13px] leading-none"
            >
              <span>{plaka}</span>
            </div>
          </Html>
          {/* Rear License Plate (Hyundai) */}
          <Html position={[0.0, 0.35, -2.15]} transform rotation={[0, Math.PI, 0]} scale={0.14}>
            <div 
              style={{ backfaceVisibility: 'hidden' }}
              className="bg-white border border-slate-400 px-1.5 py-0.5 rounded text-black font-extrabold text-[10px] tracking-wider select-none flex items-center justify-center gap-1 shadow-md border-l-[3px] border-l-blue-600 font-sans min-w-[58px] h-[13px]"
            >
              <span>{plaka}</span>
            </div>
          </Html>
        </>
      )}
      {plaka && isSprinter && (
        <>
          {/* Front License Plate (Sprinter) */}
          <Html position={[0.0, 0.11, 3.06]} transform scale={0.17}>
            <div 
              style={{ backfaceVisibility: 'hidden' }}
              className="bg-white border border-slate-400 px-1.5 py-0.5 rounded text-black font-extrabold text-[10px] tracking-wider select-none flex items-center justify-center gap-1 shadow-md border-l-[3px] border-l-blue-600 font-sans min-w-[65px] h-[14px] leading-none"
            >
              <span>{plaka}</span>
            </div>
          </Html>
          {/* Rear License Plate (Sprinter) */}
          <Html position={[0.0, 0.75, -2.93]} transform rotation={[0, Math.PI, 0]} scale={0.15}>
            <div 
              style={{ backfaceVisibility: 'hidden' }}
              className="bg-white border border-slate-400 px-1.5 py-0.5 rounded text-black font-extrabold text-[10px] tracking-wider select-none flex items-center justify-center gap-1 shadow-md border-l-[3px] border-l-blue-600 font-sans min-w-[65px] h-[14px]"
            >
              <span>{plaka}</span>
            </div>
          </Html>
        </>
      )}

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
          isModalOpen={isModalOpen}
        />
      ))}

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
        minDistance={isDoblo ? 3.0 : 4.0}
        maxDistance={isDoblo ? 12.0 : 15.0}
        minPolarAngle={Math.PI / 12}
        maxPolarAngle={Math.PI / 2.15}
        enablePan={true}
        panSpeed={0.6}
        target={[0, isDoblo ? 0.7 : 1.0, 0]}
      />
    </>
  )
}

// ——— Loading Fallback ———
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[rgba(10,14,26,0.85)] border border-cyan-500/35 backdrop-blur-md">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <div className="text-center">
          <p className="text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider">3D Garaj Yükleniyor</p>
          <p className="text-[10px] text-slate-400 mt-1">İtfaiye aracı modeli hazırlanıyor...</p>
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
  kopukKapasite,
  isModalOpen,
  plaka,
  modelUrl,
  vehicleModel
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
        "relative w-full rounded-xl overflow-hidden border border-[var(--fd-border)] bg-gradient-to-b from-[#060814] via-[#0d1225] to-[#060814]",
        isFullscreen ? "h-screen" : "h-[420px] sm:h-[500px] lg:h-[580px]"
      )}>
        {/* Tactical HUD overlay top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2">
              3D GARAJ — {vehicleType || "İtfaiye Aracı"}
              {plaka && (
                <span className="ml-2 bg-white border border-slate-400 px-1.5 py-0.5 rounded text-black font-extrabold text-[8px] tracking-wider select-none inline-flex items-center justify-center border-l-[2.5px] border-l-blue-600 font-sans h-[12px] leading-none">
                  {plaka}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className="p-1.5 rounded-md bg-black/40 border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all cursor-pointer"
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
                "p-1.5 rounded-md border transition-all cursor-pointer",
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
              className="p-1.5 rounded-md bg-black/40 border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all cursor-pointer"
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
          camera={{ position: [7.0, 4.5, 7.0], fov: 40, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          dpr={[1, 1.5]}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.1
          }}
        >
          <color attach="background" args={["#060814"]} />
          <fog attach="fog" args={["#060814", 8, 18]} />
          <Suspense fallback={<LoadingFallback />}>
            <Scene 
              compartmentKeys={compartmentKeys}
              activeCompartment={activeCompartment}
              onSelect={onSelect}
              showLabels={showLabels}
              autoRotate={autoRotate}
              isModalOpen={isModalOpen}
              plaka={plaka}
              modelUrl={modelUrl}
              vehicleModel={vehicleModel}
            />
          </Suspense>
        </Canvas>

        {/* Bottom HUD info bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <MousePointer2 className="w-3 h-3" /> Sol Tık: Sürükle (Döndür)
            </span>
            <span className="flex items-center gap-1">
              <Move3D className="w-3 h-3" /> Scroll / İki Parmak: Yakınlaştır
            </span>
          </div>

          <div className="flex items-center gap-3">
            {suKapasite && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-blue-400">💧</span>
                <span className="text-blue-300">{suKapasite}L Su</span>
              </div>
            )}
            {kopukKapasite && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-amber-400">🧯</span>
                <span className="text-amber-300">{kopukKapasite}L Köpük</span>
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
