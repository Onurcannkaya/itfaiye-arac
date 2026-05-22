"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Check if already registered to prevent redundant registrations
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        const hasSW = registrations.some(r => r.active && r.active.scriptURL.includes('/sw.js'));
        if (!hasSW) {
          navigator.serviceWorker.register("/sw.js")
            .then((reg) => {
              console.log("[SW] Registered with scope:", reg.scope)
            })
            .catch((err) => {
              console.error("[SW] Registration failed:", err)
            })
        }
      });
    }
  }, [])

  return null
}
