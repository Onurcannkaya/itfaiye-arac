"use client"

import React, { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { COMPARTMENT_NAMES } from "@/lib/constants"
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Play, 
  Pause,
  Activity
} from "lucide-react"

export interface ThreeSceneProps {
  compartmentKeys: string[];
  activeCompartment: string | null;
  onSelect: (key: string) => void;
  vehicleType?: string;
  className?: string;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
  zDepth: number;
}

export interface HatchNode {
  key: string;
  label: string;
  x: number;
  y: number;
  z: number;
  side: "left" | "right" | "top" | "center";
}

interface CameraTarget {
  yaw: number;
  pitch: number;
  zoom: number;
}

// === 3D MODEL DEFINITIONS ===
const CAB_VERTICES: Point3D[] = [
  { x: 80, y: -18, z: -27 }, // 0: cab front bottom left
  { x: 80, y: -18, z: 27 },  // 1: cab front bottom right
  { x: 78, y: 3, z: -27 },   // 2: cab hood front left
  { x: 78, y: 3, z: 27 },    // 3: cab hood front right
  { x: 60, y: 22, z: -27 },  // 4: cab roof front left
  { x: 60, y: 22, z: 27 },   // 5: cab roof front right
  { x: 38, y: 22, z: -27 },  // 6: cab roof back left
  { x: 38, y: 22, z: 27 },   // 7: cab roof back right
  { x: 38, y: -18, z: -27 }, // 8: cab bottom back left
  { x: 38, y: -18, z: 27 },  // 9: cab bottom back right
];

const BODY_VERTICES: Point3D[] = [
  { x: 36, y: 24, z: -28 },  // 10: body front top left
  { x: 36, y: 24, z: 28 },   // 11: body front top right
  { x: 36, y: -18, z: -28 }, // 12: body front bottom left
  { x: 36, y: -18, z: 28 },  // 13: body front bottom right
  { x: -80, y: 24, z: -28 }, // 14: body rear top left
  { x: -80, y: 24, z: 28 },  // 15: body rear top right
  { x: -80, y: -18, z: -28 },// 16: body rear bottom left
  { x: -80, y: -18, z: 28 }, // 17: body rear bottom right
];

const LADDER_VERTICES: Point3D[] = [
  { x: 25, y: 29, z: -7 },   // 18: ladder front left
  { x: 25, y: 29, z: 7 },    // 19: ladder front right
  { x: -75, y: 29, z: -7 },  // 20: ladder rear left
  { x: -75, y: 29, z: 7 },   // 21: ladder rear right
];

const BUMPER_VERTICES: Point3D[] = [
  { x: 86, y: -12, z: -25 }, // 22: bumper top left
  { x: 86, y: -12, z: 25 },  // 23: bumper top right
  { x: 86, y: -18, z: -25 }, // 24: bumper bottom left
  { x: 86, y: -18, z: 25 },  // 25: bumper bottom right
];

const SIREN_VERTICES: Point3D[] = [
  { x: 55, y: 26, z: -15 },  // 26: siren left front top
  { x: 45, y: 26, z: -15 },  // 27: siren left back top
  { x: 55, y: 23, z: -18 },  // 28: siren left base front
  { x: 45, y: 23, z: -18 },  // 29: siren left base back
  { x: 55, y: 26, z: 15 },   // 30: siren right front top
  { x: 45, y: 26, z: 15 },   // 31: siren right back top
  { x: 55, y: 23, z: 18 },   // 32: siren right base front
  { x: 45, y: 23, z: 18 },   // 33: siren right base back
];

const VERTICES: Point3D[] = [
  ...CAB_VERTICES,
  ...BODY_VERTICES,
  ...LADDER_VERTICES,
  ...BUMPER_VERTICES,
  ...SIREN_VERTICES,
];

const CAB_EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 3], // front
  [2, 4], [3, 5], [4, 5],         // windshield
  [4, 6], [5, 7], [6, 7],         // roof
  [6, 8], [7, 9], [8, 9],         // back wall
  [0, 8], [1, 9],                 // floor rails
];

const BODY_EDGES: [number, number][] = [
  [10, 11], [10, 12], [11, 13], [12, 13], // body front
  [10, 14], [11, 15], [12, 16], [13, 17], // body side rails
  [14, 15], [14, 16], [15, 17], [16, 17], // body rear
];

const LADDER_EDGES: [number, number][] = [
  [18, 19], [18, 20], [19, 21], [20, 21], // ladder rails
];

const BUMPER_EDGES: [number, number][] = [
  [22, 23], [22, 24], [23, 25], [24, 25], // bumper front
  [0, 24], [1, 25],                       // bumper mounts
];

const SIREN_EDGES: [number, number][] = [
  [26, 27], [26, 28], [27, 29], [28, 29], // left siren
  [30, 31], [30, 32], [31, 33], [32, 33], // right siren
];

const EDGES: [number, number][] = [
  ...CAB_EDGES,
  ...BODY_EDGES,
  ...LADDER_EDGES,
  ...BUMPER_EDGES,
  ...SIREN_EDGES,
];

// === COMPARTMENT PANELS IN 3D SPACE ===
const COMPARTMENT_PANELS: Record<string, Point3D[]> = {
  sol_on_kapak: [
    { x: 30, y: -12, z: -28.2 },
    { x: 5, y: -12, z: -28.2 },
    { x: 5, y: 15, z: -28.2 },
    { x: 30, y: 15, z: -28.2 }
  ],
  sol_orta_kapak: [
    { x: -2, y: -12, z: -28.2 },
    { x: -27, y: -12, z: -28.2 },
    { x: -27, y: 15, z: -28.2 },
    { x: -2, y: 15, z: -28.2 }
  ],
  sol_arka_kapak: [
    { x: -35, y: -12, z: -28.2 },
    { x: -75, y: -12, z: -28.2 },
    { x: -75, y: 15, z: -28.2 },
    { x: -35, y: 15, z: -28.2 }
  ],
  sag_on_kapak: [
    { x: 30, y: -12, z: 28.2 },
    { x: 5, y: -12, z: 28.2 },
    { x: 5, y: 15, z: 28.2 },
    { x: 30, y: 15, z: 28.2 }
  ],
  sag_orta_kapak: [
    { x: -2, y: -12, z: 28.2 },
    { x: -27, y: -12, z: 28.2 },
    { x: -27, y: 15, z: 28.2 },
    { x: -2, y: 15, z: 28.2 }
  ],
  sag_arka_kapak: [
    { x: -35, y: -12, z: 28.2 },
    { x: -75, y: -12, z: 28.2 },
    { x: -75, y: 15, z: 28.2 },
    { x: -35, y: 15, z: 28.2 }
  ],
  kabin_ici: [
    { x: 72, y: -10, z: -27.2 },
    { x: 42, y: -10, z: -27.2 },
    { x: 42, y: 18, z: -27.2 },
    { x: 58, y: 18, z: -27.2 }
  ],
  arac_ustu: [
    { x: 30, y: 22.2, z: -20 },
    { x: -70, y: 22.2, z: -20 },
    { x: -70, y: 22.2, z: 20 },
    { x: 30, y: 22.2, z: 20 }
  ],
  arac_ici: [
    { x: 25, y: -8, z: 0 },
    { x: -25, y: -8, z: 0 },
    { x: -25, y: 10, z: 0 },
    { x: 25, y: 10, z: 0 }
  ]
};

// === HOTSPOTS IN 3D SPACE ===
const HOTSPOT_3D: Record<string, HatchNode> = {
  kabin_ici:      { key: "kabin_ici",      x: 55,  y: 2,   z: -27.2, label: "Kabin İçi",   side: "center" },
  arac_ici:       { key: "arac_ici",       x: 0,   y: 0,   z: 0,     label: "Araç İçi",    side: "center" },
  sol_on_kapak:   { key: "sol_on_kapak",   x: 17.5,y: 1.5, z: -28.2, label: "Sol Ön",      side: "left" },
  sol_orta_kapak: { key: "sol_orta_kapak", x: -14.5,y: 1.5,z: -28.2, label: "Sol Orta",    side: "left" },
  sol_arka_kapak: { key: "sol_arka_kapak", x: -55, y: 1.5, z: -28.2, label: "Sol Arka",    side: "left" },
  sag_on_kapak:   { key: "sag_on_kapak",   x: 17.5,y: 1.5, z: 28.2,  label: "Sağ Ön",      side: "right" },
  sag_orta_kapak: { key: "sag_orta_kapak", x: -14.5,y: 1.5,z: 28.2,  label: "Sağ Orta",    side: "right" },
  sag_arka_kapak: { key: "sag_arka_kapak", x: -55, y: 1.5, z: 28.2,  label: "Sağ Arka",    side: "right" },
  arac_ustu:      { key: "arac_ustu",      x: -25, y: 22.5, z: 0,    label: "Araç Üstü",   side: "top" },
};

// === CAMERA FOCUS TARGETS FOR EACH COMPARTMENT ===
const COMPARTMENT_CAMERA_TARGETS: Record<string, CameraTarget> = {
  sol_on_kapak:   { yaw: -Math.PI / 2, pitch: 0.05, zoom: 115 },
  sol_orta_kapak: { yaw: -Math.PI / 2, pitch: 0.05, zoom: 115 },
  sol_arka_kapak: { yaw: -Math.PI / 2, pitch: 0.05, zoom: 115 },
  sag_on_kapak:   { yaw: Math.PI / 2,  pitch: 0.05, zoom: 115 },
  sag_orta_kapak: { yaw: Math.PI / 2,  pitch: 0.05, zoom: 115 },
  sag_arka_kapak: { yaw: Math.PI / 2,  pitch: 0.05, zoom: 115 },
  kabin_ici:      { yaw: -Math.PI / 5, pitch: 0.22, zoom: 125 },
  arac_ici:       { yaw: -Math.PI / 4, pitch: 0.35, zoom: 110 },
  arac_ustu:      { yaw: 0,            pitch: Math.PI / 3, zoom: 125 },
};

// === 3D TO 2D PERSPECTIVE PROJECTION ===
function project(
  p: Point3D,
  yaw: number,
  pitch: number,
  zoom: number,
  width: number,
  height: number
): Point2D {
  // Rotate around Y-axis (Yaw)
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;

  // Rotate around X-axis (Pitch)
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y2 = p.y * cosP - z1 * sinP;
  const z2 = p.y * sinP + z1 * cosP;

  // Camera parameters
  const distance = 210; // distance from origin
  const fov = 350;      // field of view factor
  const scale = fov / (distance + z2);

  const cx = width / 2;
  const cy = height / 2;

  // Apply zoom scaling
  const projX = cx + x1 * scale * (zoom / 100);
  const projY = cy - y2 * scale * (zoom / 100);

  return { x: projX, y: projY, zDepth: z2 };
}

// === HELPER DRAWING FUNCTIONS ===
function drawWheel(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  centerZ: number,
  yaw: number,
  pitch: number,
  zoom: number,
  w: number,
  h: number
) {
  const radius = 10;
  const segments = 12;
  const outerPoints: Point3D[] = [];
  const innerPoints: Point3D[] = [];
  const thickness = centerZ > 0 ? -4 : 4;
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    outerPoints.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      z: centerZ
    });
    innerPoints.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      z: centerZ + thickness
    });
  }

  const projOuter = outerPoints.map(p => project(p, yaw, pitch, zoom, w, h));
  const projInner = innerPoints.map(p => project(p, yaw, pitch, zoom, w, h));

  // Draw outer circle
  ctx.beginPath();
  ctx.moveTo(projOuter[0].x, projOuter[0].y);
  for (let i = 1; i < segments; i++) {
    ctx.lineTo(projOuter[i].x, projOuter[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  // Draw inner circle
  ctx.beginPath();
  ctx.moveTo(projInner[0].x, projInner[0].y);
  for (let i = 1; i < segments; i++) {
    ctx.lineTo(projInner[i].x, projInner[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  // Connect them
  ctx.beginPath();
  for (let i = 0; i < segments; i += 3) {
    ctx.moveTo(projOuter[i].x, projOuter[i].y);
    ctx.lineTo(projInner[i].x, projInner[i].y);
  }
  ctx.stroke();
}

function drawLadderRungs(
  ctx: CanvasRenderingContext2D,
  yaw: number,
  pitch: number,
  zoom: number,
  w: number,
  h: number
) {
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const leftP = {
      x: 25 * (1 - t) + -75 * t,
      y: 29,
      z: -7
    };
    const rightP = {
      x: 25 * (1 - t) + -75 * t,
      y: 29,
      z: 7
    };

    const projL = project(leftP, yaw, pitch, zoom, w, h);
    const projR = project(rightP, yaw, pitch, zoom, w, h);

    ctx.beginPath();
    ctx.moveTo(projL.x, projL.y);
    ctx.lineTo(projR.x, projR.y);
    ctx.stroke();
  }
}

function drawWaterCannon(
  ctx: CanvasRenderingContext2D,
  yaw: number,
  pitch: number,
  zoom: number,
  w: number,
  h: number
) {
  const base = { x: 28, y: 24, z: 0 };
  const neck = { x: 28, y: 27, z: 0 };
  const nozzle = { x: 36, y: 28, z: 0 };

  const projBase = project(base, yaw, pitch, zoom, w, h);
  const projNeck = project(neck, yaw, pitch, zoom, w, h);
  const projNozzle = project(nozzle, yaw, pitch, zoom, w, h);

  ctx.beginPath();
  ctx.moveTo(projBase.x, projBase.y);
  ctx.lineTo(projNeck.x, projNeck.y);
  ctx.lineTo(projNozzle.x, projNozzle.y);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.lineWidth = 1; // restore
}

function drawHeadlightBeams(
  ctx: CanvasRenderingContext2D,
  yaw: number,
  pitch: number,
  zoom: number,
  w: number,
  h: number
) {
  const leftHeadlight = { x: 80, y: -8, z: -20 };
  const rightHeadlight = { x: 80, y: -8, z: 20 };

  const leftBeamEnd = { x: 120, y: -12, z: -35 };
  const rightBeamEnd = { x: 120, y: -12, z: 35 };

  const projLStart = project(leftHeadlight, yaw, pitch, zoom, w, h);
  const projLEnd = project(leftBeamEnd, yaw, pitch, zoom, w, h);

  const projRStart = project(rightHeadlight, yaw, pitch, zoom, w, h);
  const projREnd = project(rightBeamEnd, yaw, pitch, zoom, w, h);

  // Draw light cones
  ctx.fillStyle = "rgba(250, 204, 21, 0.04)";
  
  ctx.beginPath();
  ctx.moveTo(projLStart.x, projLStart.y);
  ctx.lineTo(projLEnd.x, projLEnd.y - 12);
  ctx.lineTo(projLEnd.x, projLEnd.y + 12);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(projRStart.x, projRStart.y);
  ctx.lineTo(projREnd.x, projREnd.y - 12);
  ctx.lineTo(projREnd.x, projREnd.y + 12);
  ctx.closePath();
  ctx.fill();

  // Headlight points
  ctx.fillStyle = "rgba(250, 204, 21, 0.8)";
  ctx.beginPath();
  ctx.arc(projLStart.x, projLStart.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(projRStart.x, projRStart.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// === COMPONENT ===
export function Vehicle3DSchematic({
  compartmentKeys,
  activeCompartment,
  onSelect,
  vehicleType,
  className
}: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interaction States
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [hudActive, setHudActive] = useState<boolean>(true);

  // Use refs for continuous values to avoid performance hit on 60fps draw loop
  const yawRef = useRef<number>(-Math.PI / 4);
  const pitchRef = useRef<number>(0.25);
  const zoomRef = useRef<number>(100);

  const targetYawRef = useRef<number>(-Math.PI / 4);
  const targetPitchRef = useRef<number>(0.25);
  const targetZoomRef = useRef<number>(100);

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartYawRef = useRef<number>(-Math.PI / 4);
  const dragStartPitchRef = useRef<number>(0.25);
  const isDragClickRef = useRef<boolean>(true);
  
  const lastInteractionRef = useRef<number>(0);
  const projectedHotspotsRef = useRef<{ key: string; x: number; y: number; r: number }[]>([]);

  // Focus transition when active compartment prop is updated
  useEffect(() => {
    if (activeCompartment && COMPARTMENT_CAMERA_TARGETS[activeCompartment]) {
      const target = COMPARTMENT_CAMERA_TARGETS[activeCompartment];
      targetYawRef.current = target.yaw;
      targetPitchRef.current = target.pitch;
      targetZoomRef.current = target.zoom;
      lastInteractionRef.current = 0; // immediate lock
    }
  }, [activeCompartment]);

  // Event handlers
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e && e.touches && e.touches.length > 0) {
      const touchList = e.touches as unknown as TouchList;
      const touch = touchList[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else if ('changedTouches' in e && e.changedTouches && e.changedTouches.length > 0) {
      const touchList = e.changedTouches as unknown as TouchList;
      const touch = touchList[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      const mouseEvent = e as MouseEvent | React.MouseEvent<HTMLCanvasElement>;
      return {
        x: mouseEvent.clientX - rect.left,
        y: mouseEvent.clientY - rect.top
      };
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('button' in e && e.button !== 0) return;
    
    isDraggingRef.current = true;
    isDragClickRef.current = true;
    const pos = getMousePos(e);
    dragStartRef.current = pos;
    dragStartYawRef.current = yawRef.current;
    dragStartPitchRef.current = pitchRef.current;
    lastInteractionRef.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    
    if (isDraggingRef.current) {
      const dx = pos.x - dragStartRef.current.x;
      const dy = pos.y - dragStartRef.current.y;
      
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragClickRef.current = false;
      }
      
      targetYawRef.current = dragStartYawRef.current + dx * 0.007;
      targetPitchRef.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, dragStartPitchRef.current - dy * 0.007));
      lastInteractionRef.current = Date.now();
    } else {
      let foundHover: string | null = null;
      for (const hs of projectedHotspotsRef.current) {
        const dist = Math.hypot(pos.x - hs.x, pos.y - hs.y);
        if (dist < hs.r + 5) {
          foundHover = hs.key;
          break;
        }
      }
      if (foundHover !== hoveredKey) {
        setHoveredKey(foundHover);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    if (isDragClickRef.current) {
      const pos = getMousePos(e);
      let clickedKey: string | null = null;
      for (const hs of projectedHotspotsRef.current) {
        const dist = Math.hypot(pos.x - hs.x, pos.y - hs.y);
        if (dist < hs.r + 5) {
          clickedKey = hs.key;
          break;
        }
      }
      if (clickedKey && compartmentKeys.includes(clickedKey)) {
        onSelect(clickedKey);
      }
    }
    lastInteractionRef.current = Date.now();
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    setHoveredKey(null);
  };

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const w = 800;
      const h = 450;
      
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      // Camera state transition math
      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteractionRef.current;

      if (timeSinceLastInteraction > 3000 && autoRotate) {
        if (activeCompartment && COMPARTMENT_CAMERA_TARGETS[activeCompartment]) {
          const target = COMPARTMENT_CAMERA_TARGETS[activeCompartment];
          targetYawRef.current = target.yaw;
          targetPitchRef.current = target.pitch;
          targetZoomRef.current = target.zoom;
        } else {
          targetYawRef.current += 0.002;
          targetPitchRef.current = 0.25;
          targetZoomRef.current = 100;
        }
      }

      // Smooth interpolation using LERP
      yawRef.current += (targetYawRef.current - yawRef.current) * 0.07;
      pitchRef.current += (targetPitchRef.current - pitchRef.current) * 0.07;
      zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.07;

      const yaw = yawRef.current;
      const pitch = pitchRef.current;
      const zoom = zoomRef.current;

      // 1. Perspective grid on Y = -18 floor
      if (hudActive) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.05)";
        ctx.lineWidth = 0.8;
        const gridY = -18;
        const spacing = 20;
        const range = 6;
        
        // Z direction lines
        for (let i = -range; i <= range; i++) {
          const gridX = i * spacing;
          const p1 = { x: gridX, y: gridY, z: -spacing * range };
          const p2 = { x: gridX, y: gridY, z: spacing * range };
          const pr1 = project(p1, yaw, pitch, zoom, w, h);
          const pr2 = project(p2, yaw, pitch, zoom, w, h);
          
          ctx.beginPath();
          ctx.moveTo(pr1.x, pr1.y);
          ctx.lineTo(pr2.x, pr2.y);
          ctx.stroke();
        }
        // X direction lines
        for (let i = -range; i <= range; i++) {
          const gridZ = i * spacing;
          const p1 = { x: -spacing * range, y: gridY, z: gridZ };
          const p2 = { x: spacing * range, y: gridY, z: gridZ };
          const pr1 = project(p1, yaw, pitch, zoom, w, h);
          const pr2 = project(p2, yaw, pitch, zoom, w, h);
          
          ctx.beginPath();
          ctx.moveTo(pr1.x, pr1.y);
          ctx.lineTo(pr2.x, pr2.y);
          ctx.stroke();
        }
      }

      // 2. Inactive Compartment Panels (Faint lines and fill)
      Object.entries(COMPARTMENT_PANELS).forEach(([key, vertices]) => {
        if (!compartmentKeys.includes(key)) return;
        const isActive = activeCompartment === key;
        const isHovered = hoveredKey === key;
        
        if (!isActive && !isHovered) {
          ctx.fillStyle = "rgba(6, 182, 212, 0.012)";
          ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
          ctx.lineWidth = 0.6;

          ctx.beginPath();
          const p0 = project(vertices[0], yaw, pitch, zoom, w, h);
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < vertices.length; i++) {
            const pi = project(vertices[i], yaw, pitch, zoom, w, h);
            ctx.lineTo(pi.x, pi.y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });

      // 3. Wheels in 3D
      ctx.strokeStyle = "rgba(6, 182, 212, 0.35)";
      ctx.lineWidth = 0.8;
      drawWheel(ctx, 58, -18, -27.5, yaw, pitch, zoom, w, h);
      drawWheel(ctx, 58, -18, 27.5, yaw, pitch, zoom, w, h);
      drawWheel(ctx, -25, -18, -28.5, yaw, pitch, zoom, w, h);
      drawWheel(ctx, -25, -18, 28.5, yaw, pitch, zoom, w, h);
      drawWheel(ctx, -58, -18, -28.5, yaw, pitch, zoom, w, h);
      drawWheel(ctx, -58, -18, 28.5, yaw, pitch, zoom, w, h);

      // 4. Main Wireframe Body
      ctx.strokeStyle = "rgba(6, 182, 212, 0.55)";
      ctx.lineWidth = 1;
      
      EDGES.forEach(([i, j]) => {
        const p1 = VERTICES[i];
        const p2 = VERTICES[j];
        const pr1 = project(p1, yaw, pitch, zoom, w, h);
        const pr2 = project(p2, yaw, pitch, zoom, w, h);
        
        ctx.beginPath();
        ctx.moveTo(pr1.x, pr1.y);
        ctx.lineTo(pr2.x, pr2.y);
        ctx.stroke();
      });

      // 5. Ladder and water cannon
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 0.8;
      drawLadderRungs(ctx, yaw, pitch, zoom, w, h);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.65)";
      drawWaterCannon(ctx, yaw, pitch, zoom, w, h);

      // 6. Active/Hovered Panels on Top
      Object.entries(COMPARTMENT_PANELS).forEach(([key, vertices]) => {
        if (!compartmentKeys.includes(key)) return;
        const isActive = activeCompartment === key;
        const isHovered = hoveredKey === key;
        
        if (isActive || isHovered) {
          ctx.fillStyle = isActive ? "rgba(34, 197, 94, 0.16)" : "rgba(34, 211, 238, 0.08)";
          ctx.strokeStyle = isActive ? "#22c55e" : "#22d3ee";
          ctx.lineWidth = isActive ? 2 : 1.2;

          ctx.beginPath();
          const p0 = project(vertices[0], yaw, pitch, zoom, w, h);
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < vertices.length; i++) {
            const pi = project(vertices[i], yaw, pitch, zoom, w, h);
            ctx.lineTo(pi.x, pi.y);
          }
          ctx.closePath();
          ctx.fill();
          
          ctx.shadowBlur = 8;
          ctx.shadowColor = isActive ? "#22c55e" : "#22d3ee";
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      });

      // 7. Headlight Beams
      ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
      drawHeadlightBeams(ctx, yaw, pitch, zoom, w, h);

      // 8. Projected Hotspots
      const newHotspots: { key: string; x: number; y: number; r: number }[] = [];

      Object.entries(HOTSPOT_3D).forEach(([key, hs]) => {
        if (!compartmentKeys.includes(key)) return;

        const proj = project(hs, yaw, pitch, zoom, w, h);
        const isActive = activeCompartment === key;
        const isHovered = hoveredKey === key;
        const radius = isActive ? 10 : isHovered ? 8 : 6;

        newHotspots.push({ key, x: proj.x, y: proj.y, r: radius + 4 });

        if (isActive || isHovered) {
          const color = isActive ? "#22c55e" : "#22d3ee";
          ctx.strokeStyle = color;
          ctx.lineWidth = isActive ? 1.5 : 1;
          
          // Pulsing circle
          ctx.beginPath();
          const pulse = radius + 6 + Math.sin(now / 150) * 3.5;
          ctx.arc(proj.x, proj.y, pulse, 0, Math.PI * 2);
          ctx.stroke();

          // Rotating segments
          ctx.beginPath();
          const bracketSize = radius + 11;
          const rotationAngle = (now / 800) % (Math.PI * 2);
          ctx.arc(proj.x, proj.y, bracketSize, rotationAngle, rotationAngle + Math.PI / 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, bracketSize, rotationAngle + Math.PI / 2, rotationAngle + Math.PI / 2 + Math.PI / 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, bracketSize, rotationAngle + Math.PI, rotationAngle + Math.PI + Math.PI / 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, bracketSize, rotationAngle + 1.5 * Math.PI, rotationAngle + 1.5 * Math.PI + Math.PI / 4);
          ctx.stroke();

          // Radar Leader Line
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(proj.x, proj.y);
          const labelX = proj.x + 35;
          const labelY = proj.y - 25;
          ctx.lineTo(proj.x + 15, proj.y - 15);
          ctx.lineTo(labelX, labelY);
          ctx.stroke();

          // Text box background
          ctx.fillStyle = "rgba(10, 15, 30, 0.9)";
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          
          const labelText = hs.label.toUpperCase();
          const subText = isActive ? "TACTICAL LOCKED" : "TARGET ENGAGED";
          
          ctx.font = "bold 9px monospace";
          const textW = Math.max(ctx.measureText(labelText).width, ctx.measureText(subText).width) + 12;
          const textH = 24;
          
          ctx.beginPath();
          ctx.rect(labelX, labelY - 12, textW, textH);
          ctx.fill();
          ctx.stroke();

          // Draw Text
          ctx.fillStyle = color;
          ctx.fillText(labelText, labelX + 6, labelY - 2);
          ctx.font = "7px monospace";
          ctx.fillStyle = isActive ? "#22c55e" : "rgba(34, 211, 238, 0.75)";
          ctx.fillText(subText, labelX + 6, labelY + 7);
        } else {
          ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
          ctx.strokeStyle = "rgba(6, 182, 212, 0.75)";
          ctx.lineWidth = 1;
          
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(proj.x, proj.y, radius + 4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "rgba(6, 182, 212, 0.55)";
          ctx.font = "7px monospace";
          ctx.textAlign = "center";
          ctx.fillText(hs.label.toUpperCase(), proj.x, proj.y + radius + 11);
          ctx.textAlign = "left";
        }

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, isActive ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      projectedHotspotsRef.current = newHotspots;

      // 9. HUD Graphics and Telemetry
      if (hudActive) {
        ctx.fillStyle = "rgba(6, 182, 212, 0.85)";
        ctx.font = "bold 9px monospace";

        // Four Corner Brackets
        const chSize = 15;
        ctx.strokeStyle = "rgba(6, 182, 212, 0.25)";
        ctx.lineWidth = 1;
        
        ctx.beginPath(); // Top-Left
        ctx.moveTo(chSize, 5); ctx.lineTo(5, 5); ctx.lineTo(5, chSize);
        ctx.stroke();
        ctx.beginPath(); // Top-Right
        ctx.moveTo(w - chSize, 5); ctx.lineTo(w - 5, 5); ctx.lineTo(w - 5, chSize);
        ctx.stroke();
        ctx.beginPath(); // Bottom-Left
        ctx.moveTo(chSize, h - 5); ctx.lineTo(5, h - 5); ctx.lineTo(5, h - chSize);
        ctx.stroke();
        ctx.beginPath(); // Bottom-Right
        ctx.moveTo(w - chSize, h - 5); ctx.lineTo(w - 5, h - 5); ctx.lineTo(w - 5, h - chSize);
        ctx.stroke();

        // Top Left Telemetry Readout
        ctx.fillText("TACTICAL HUD DISPLAY v23.01", 15, 20);
        ctx.fillStyle = "rgba(6, 182, 212, 0.55)";
        ctx.font = "8px monospace";
        ctx.fillText("SYSTEM STATUS: NOMINAL", 15, 30);
        ctx.fillText(`AZIMUTH:   ${((yaw * 180) / Math.PI).toFixed(1)}°`, 15, 42);
        ctx.fillText(`ELEVATION: ${((pitch * 180) / Math.PI).toFixed(1)}°`, 15, 52);
        ctx.fillText(`ZOOM:      ${zoom.toFixed(1)}%`, 15, 62);

        // Top Right Target Readout
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(6, 182, 212, 0.85)";
        ctx.font = "bold 9px monospace";
        ctx.fillText("RADAR LINK: OPERATIONAL", w - 15, 20);
        
        ctx.font = "8px monospace";
        ctx.fillStyle = activeCompartment ? "#22c55e" : "rgba(6, 182, 212, 0.5)";
        const activeName = activeCompartment ? (COMPARTMENT_NAMES[activeCompartment] || activeCompartment).toUpperCase() : "NONE";
        ctx.fillText(`LOCKED TARGET: [${activeName}]`, w - 15, 32);

        ctx.fillStyle = "rgba(6, 182, 212, 0.5)";
        ctx.fillText(`CAMERA MODE:   [${autoRotate ? "AUTO-ORBIT" : "MANUAL-DRAG"}]`, w - 15, 42);
        ctx.fillText(`VEHICLE TYPE:  [${(vehicleType || "Taktiksel").toUpperCase()}]`, w - 15, 52);
        ctx.textAlign = "left";

        // Bottom Left Radar Sweep
        const radarCx = 35;
        const radarCy = h - 35;
        const radarR = 18;
        ctx.strokeStyle = "rgba(6, 182, 212, 0.2)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(radarCx, radarCy, radarR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(radarCx, radarCy, radarR / 2, 0, Math.PI * 2);
        ctx.stroke();
        
        const sweepAngle = (now / 600) % (Math.PI * 2);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
        ctx.beginPath();
        ctx.moveTo(radarCx, radarCy);
        ctx.lineTo(radarCx + Math.cos(sweepAngle) * radarR, radarCy + Math.sin(sweepAngle) * radarR);
        ctx.stroke();

        ctx.fillStyle = "rgba(6, 182, 212, 0.6)";
        ctx.font = "8px monospace";
        ctx.fillText("SCAN ACTIVE", 60, h - 32);

        // Bottom Right Status
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(6, 182, 212, 0.5)";
        ctx.fillText("GRID_LOCK: TRUE", w - 15, h - 30);
        ctx.fillText("COMM_LINK: 100%", w - 15, h - 20);
        ctx.textAlign = "left";

        // CRT Scanline filter
        ctx.strokeStyle = "rgba(6, 182, 212, 0.03)";
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 4) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [compartmentKeys, activeCompartment, hoveredKey, autoRotate, hudActive, vehicleType]);

  return (
    <div className="w-full relative rounded-xl border border-cyan-500/10 bg-slate-950/80 overflow-hidden select-none">
      {/* 3D Canvas element */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        className="w-full aspect-[16/9] bg-slate-950/80 cursor-grab active:cursor-grabbing block"
      />

      {/* Floating HUD Control Overlay */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={cn(
            "p-2 rounded-lg border font-mono text-[9px] font-bold tracking-wider transition-all flex items-center gap-1.5",
            autoRotate
              ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
          )}
          title="Auto-Orbit"
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>DÖNDÜR</span>
        </button>

        <button
          onClick={() => setHudActive(!hudActive)}
          className={cn(
            "p-2 rounded-lg border font-mono text-[9px] font-bold tracking-wider transition-all flex items-center gap-1.5",
            hudActive
              ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
          )}
          title="Toggle HUD Telemetry"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>HUD</span>
        </button>

        <button
          onClick={() => {
            targetYawRef.current = -Math.PI / 4;
            targetPitchRef.current = 0.25;
            targetZoomRef.current = 100;
            lastInteractionRef.current = Date.now();
          }}
          className="p-2 rounded-lg border bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-mono text-[9px] font-bold tracking-wider transition-all flex items-center gap-1.5"
          title="Reset Camera Angle"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>SIFIRLA</span>
        </button>

        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
          <button
            onClick={() => {
              targetZoomRef.current = Math.max(50, targetZoomRef.current - 15);
              lastInteractionRef.current = Date.now();
            }}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-r border-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              targetZoomRef.current = Math.min(200, targetZoomRef.current + 15);
              lastInteractionRef.current = Date.now();
            }}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
