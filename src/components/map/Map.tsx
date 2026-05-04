"use client"

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default Leaflet icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom Icons
const incidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const hydrantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface Incident {
  id: string
  olay_turu: string
  mahalle: string
  adres: string
  cikis_saati: string
  location?: any // GeoJSON point
}

interface Hydrant {
  id: string
  no: string
  tip: string
  durum: string
  mahalle: string
  location?: any // GeoJSON point
}

interface MapProps {
  incidents: Incident[]
  hydrants: Hydrant[]
}

const parseLocation = (loc: any) => {
  // PostGIS location points often come as GeoJSON or WKT string depending on the Supabase client settings.
  // Assuming Supabase returns GeoJSON { type: 'Point', coordinates: [lng, lat] }
  if (!loc) return null;
  if (typeof loc === 'string') {
    // If it's a WKT string, we would need to parse it, but Supabase usually returns strings for Geography if casted, 
    // or we might need to cast to GeoJSON in SQL. We'll handle both basic cases.
    try {
      const parsed = JSON.parse(loc);
      if (parsed.coordinates) {
        return [parsed.coordinates[1], parsed.coordinates[0]] as [number, number]; // leaflet uses [lat, lng]
      }
    } catch(e) {}
    return null;
  }
  
  if (loc.coordinates) {
    return [loc.coordinates[1], loc.coordinates[0]] as [number, number];
  }
  return null;
}

export default function Map({ incidents, hydrants }: MapProps) {
  // Sivas Coordinates
  const defaultCenter: [number, number] = [39.750, 37.016]

  return (
    <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Incidents Layer */}
      {incidents.map(inc => {
        const coords = parseLocation(inc.location)
        if (!coords) return null
        return (
          <Marker key={`inc-${inc.id}`} position={coords} icon={incidentIcon}>
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-danger text-sm border-b pb-1 mb-1">{inc.olay_turu}</h3>
                <p className="text-xs"><strong>Mahalle:</strong> {inc.mahalle}</p>
                <p className="text-xs"><strong>Adres:</strong> {inc.adres}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(inc.cikis_saati).toLocaleString('tr-TR')}</p>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Hydrants Layer */}
      {hydrants.map(hyd => {
        const coords = parseLocation(hyd.location)
        if (!coords) return null
        return (
          <Marker key={`hyd-${hyd.id}`} position={coords} icon={hydrantIcon}>
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-primary text-sm border-b pb-1 mb-1">Yangın Hidrantı #{hyd.no}</h3>
                <p className="text-xs"><strong>Tip:</strong> {hyd.tip}</p>
                <p className="text-xs"><strong>Durum:</strong> {hyd.durum}</p>
                <p className="text-xs"><strong>Mahalle:</strong> {hyd.mahalle}</p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
