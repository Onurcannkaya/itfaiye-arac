import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTriageInfo(olayTuru: string) {
  const type = (olayTuru || "").trim();
  
  const redTypes = ["Ev Yangını", "Bina/Fabrika Yangını", "Sıkışmalı Trafik Kazası", "KBRN Sızıntısı", "Yangın", "Trafik Kazası"];
  const yellowTypes = ["Araç Yangını", "İşyeri Yangını", "Kurtarma Operasyonları", "Kurtarma", "Su Baskını"];
  
  if (redTypes.includes(type)) {
    return {
      seviye: 3,
      label: "KRİTİK",
      badgeText: "KRİTİK",
      badgeVariant: "danger" as const,
      color: "#ef4444",
      bgClass: "bg-[rgba(220,38,38,0.11)] text-[#b91c1c] dark:text-[#f87171]",
      glowClass: "triage-critical-glow",
      animation: "pulse-glow-red 1s infinite ease-in-out"
    };
  }
  
  if (yellowTypes.includes(type)) {
    return {
      seviye: 2,
      label: "ORTA",
      badgeText: "ORTA",
      badgeVariant: "warning" as const,
      color: "#eab308",
      bgClass: "bg-[rgba(245,158,11,0.11)] text-[#b45309] dark:text-[#fbbf24]",
      glowClass: "triage-medium-glow",
      animation: "pulse-glow-yellow 2s infinite ease-in-out"
    };
  }
  
  // Default to low (green)
  return {
    seviye: 1,
    label: "DÜŞÜK",
    badgeText: "DÜŞÜK",
    badgeVariant: "success" as const,
    color: "#22c55e",
    bgClass: "bg-[rgba(22,163,74,0.11)] text-[#15803d] dark:text-[#4ade80]",
    glowClass: "triage-low-glow",
    animation: "pulse-glow-green 2.5s infinite ease-in-out"
  };
}

export function calculateRemainingDays(targetDate: string | null | undefined): { days: number | null; text: string } {
  if (!targetDate) {
    return { days: null, text: "Tarih Girilmemiş" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(targetDate);
  expiry.setHours(0, 0, 0, 0);
  
  if (isNaN(expiry.getTime())) {
    return { days: null, text: "Tarih Girilmemiş" };
  }
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { days: diffDays, text: "SÜRESİ GEÇTİ" };
  }
  if (diffDays === 0) {
    return { days: 0, text: "Bugün son gün" };
  }
  return { days: diffDays, text: `${diffDays} gün kaldı` };
}
