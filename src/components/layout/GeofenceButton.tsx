"use client"

import { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Sivas Ana İtfaiye Binası Koordinatları
const STATION_LAT = 39.7388
const STATION_LNG = 37.0025
const MAX_DISTANCE_METERS = 150

export function GeofenceButton() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  // Haversine formula to calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  }

  const handleStartShift = () => {
    if (!navigator.geolocation) {
      setStatus("error")
      setMessage("Tarayıcınız konum servisini desteklemiyor.")
      setTimeout(() => setStatus("idle"), 5000)
      return
    }

    setLoading(true)
    setStatus("idle")
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const distance = calculateDistance(latitude, longitude, STATION_LAT, STATION_LNG)

        if (distance <= MAX_DISTANCE_METERS) {
          setStatus("success")
          setMessage("Nöbet kaydınız başarıyla başlatıldı.")
          // Here we would typically make an API call to record the shift start
        } else {
          setStatus("error")
          setMessage(`Binaya çok uzaksınız (${Math.round(distance)}m). Nöbet başlatılamaz!`)
        }
        setLoading(false)
        setTimeout(() => setStatus("idle"), 5000)
      },
      (error) => {
        setStatus("error")
        if (error.code === error.PERMISSION_DENIED) {
          setMessage("Konum izni verilmedi.")
        } else {
          setMessage("Konum alınamadı, tekrar deneyin.")
        }
        setLoading(false)
        setTimeout(() => setStatus("idle"), 5000)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div className="relative flex items-center">
      <Button 
        onClick={handleStartShift}
        disabled={loading}
        className={`hidden md:flex items-center space-x-2 rounded-full px-4 transition-colors ${
          status === 'error' ? 'bg-danger hover:bg-danger/90 text-white' :
          status === 'success' ? 'bg-success hover:bg-success/90 text-white' :
          'bg-cyan-600 hover:bg-cyan-700 text-white'
        }`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        <span className="text-sm font-bold">Nöbete Başla</span>
      </Button>
      
      {/* Toast-like message */}
      {status !== 'idle' && message && (
        <div className={`absolute top-full mt-2 right-0 px-3 py-2 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-2 ${
          status === 'error' ? 'bg-danger text-white' : 'bg-success text-white'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}
