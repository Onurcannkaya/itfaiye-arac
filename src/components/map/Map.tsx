"use client"

import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Incident {
  id: string
  olay_turu: string
  mahalle: string
  adres: string
  cikis_saati: string
  location?: any
}

interface Hydrant {
  id: string
  no: string
  tip: string
  durum: string
  mahalle: string
  location?: any
}

interface MapProps {
  incidents: Incident[]
  hydrants: Hydrant[]
  mode: 'idle' | 'add_incident' | 'add_hydrant'
  onMapClick: (lat: number, lng: number) => void
  focusLocation: [number, number] | null
}

const parseLocation = (loc: any): [number, number] | null => {
  if (!loc) return null
  if (typeof loc === 'string') {
    try {
      const parsed = JSON.parse(loc)
      if (parsed.coordinates) {
        // GeoJSON stores [lng, lat]
        return [parsed.coordinates[0], parsed.coordinates[1]]
      }
    } catch {
      return null
    }
  }
  if (loc.coordinates) {
    return [loc.coordinates[0], loc.coordinates[1]]
  }
  return null
}

export default function Map({ incidents, hydrants, mode, onMapClick, focusLocation }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const modeRef = useRef(mode)

  // Keep modeRef in sync so the click handler can read the latest value
  useEffect(() => {
    modeRef.current = mode
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = mode !== 'idle' ? 'crosshair' : ''
    }
  }, [mode])

  // ─── Initialize MapLibre GL ───────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: 'Sivas İtfaiye CBS',
        sources: {
          'osm-raster': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          },
          'sivas-binalar': {
            type: 'vector',
            tiles: ['https://harita.sivas.bel.tr/binalar/{z}/{x}/{y}'],
            minzoom: 0,
            maxzoom: 18
          },
          'sivas-sokaklar': {
            type: 'vector',
            tiles: ['https://harita.sivas.bel.tr/sokaklar/{z}/{x}/{y}'],
            minzoom: 0,
            maxzoom: 18
          }
        },
        layers: [
          {
            id: 'osm-base',
            type: 'raster',
            source: 'osm-raster',
            minzoom: 0,
            maxzoom: 19
          },
          // ── Sokak vektör katmanı ──
          {
            id: 'sokaklar-line',
            type: 'line',
            source: 'sivas-sokaklar',
            'source-layer': 'default',
            paint: {
              'line-color': '#6366f1',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                12, 1,
                16, 3,
                20, 6
              ],
              'line-opacity': 0.7
            }
          },
          // ── Bina vektör katmanı ──
          {
            id: 'binalar-fill',
            type: 'fill',
            source: 'sivas-binalar',
            'source-layer': 'default',
            paint: {
              'fill-color': '#f59e0b',
              'fill-opacity': [
                'interpolate', ['linear'], ['zoom'],
                13, 0.15,
                16, 0.35,
                19, 0.55
              ]
            }
          },
          {
            id: 'binalar-outline',
            type: 'line',
            source: 'sivas-binalar',
            'source-layer': 'default',
            paint: {
              'line-color': '#d97706',
              'line-width': 0.8,
              'line-opacity': 0.6
            }
          }
        ]
      },
      center: [37.016, 39.750], // Sivas merkez [lng, lat]
      zoom: 13,
      maxZoom: 20,
      attributionControl: {}
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    // Map click handler — uses modeRef so it always reads latest mode
    map.on('click', (e) => {
      if (modeRef.current !== 'idle') {
        onMapClick(e.lngLat.lat, e.lngLat.lng)
      }
    })

    // Interactive tooltips for vector layers
    map.on('click', 'binalar-fill', (e) => {
      if (modeRef.current !== 'idle') return
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties
        const html = Object.entries(props)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
          .join('<br/>')
        new maplibregl.Popup({ maxWidth: '320px' })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:system-ui;font-size:12px;line-height:1.6">${html || 'Bina verisi'}</div>`)
          .addTo(map)
      }
    })

    map.on('click', 'sokaklar-line', (e) => {
      if (modeRef.current !== 'idle') return
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties
        const html = Object.entries(props)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
          .join('<br/>')
        new maplibregl.Popup({ maxWidth: '320px' })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:system-ui;font-size:12px;line-height:1.6">${html || 'Sokak verisi'}</div>`)
          .addTo(map)
      }
    })

    // Pointer cursor on hover over vector features
    map.on('mouseenter', 'binalar-fill', () => {
      if (modeRef.current === 'idle') map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'binalar-fill', () => {
      if (modeRef.current === 'idle') map.getCanvas().style.cursor = ''
    })
    map.on('mouseenter', 'sokaklar-line', () => {
      if (modeRef.current === 'idle') map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'sokaklar-line', () => {
      if (modeRef.current === 'idle') map.getCanvas().style.cursor = ''
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Sync markers for incidents & hydrants ────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Incident markers (red)
    incidents.forEach(inc => {
      const coords = parseLocation(inc.location)
      if (!coords) return
      
      const el = document.createElement('div')
      el.className = 'map-marker-incident'
      el.style.cssText = `
        width: 28px; height: 28px;
        background: #ef4444;
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(239,68,68,0.5);
        cursor: pointer;
      `

      const popup = new maplibregl.Popup({ offset: 18, maxWidth: '280px' }).setHTML(`
        <div style="font-family:system-ui;padding:4px 0">
          <h3 style="font-weight:700;color:#ef4444;font-size:13px;border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:4px">${inc.olay_turu}</h3>
          <p style="font-size:12px;margin:2px 0"><strong>Mahalle:</strong> ${inc.mahalle || '-'}</p>
          <p style="font-size:12px;margin:2px 0"><strong>Adres:</strong> ${inc.adres || '-'}</p>
          <p style="font-size:11px;color:#888;margin-top:4px">${inc.cikis_saati ? new Date(inc.cikis_saati).toLocaleString('tr-TR') : 'Zaman bilgisi yok'}</p>
        </div>
      `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })

    // Hydrant markers (blue)
    hydrants.forEach(hyd => {
      const coords = parseLocation(hyd.location)
      if (!coords) return

      const el = document.createElement('div')
      el.className = 'map-marker-hydrant'
      el.style.cssText = `
        width: 24px; height: 24px;
        background: #3b82f6;
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(59,130,246,0.5);
        cursor: pointer;
      `

      const popup = new maplibregl.Popup({ offset: 16, maxWidth: '260px' }).setHTML(`
        <div style="font-family:system-ui;padding:4px 0">
          <h3 style="font-weight:700;color:#3b82f6;font-size:13px;border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:4px">Yangın Hidrantı #${hyd.no}</h3>
          <p style="font-size:12px;margin:2px 0"><strong>Tip:</strong> ${hyd.tip}</p>
          <p style="font-size:12px;margin:2px 0"><strong>Durum:</strong> ${hyd.durum}</p>
          <p style="font-size:12px;margin:2px 0"><strong>Mahalle:</strong> ${hyd.mahalle || '-'}</p>
        </div>
      `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [incidents, hydrants])

  // ─── Focus / flyTo on search result ───────────────────────
  useEffect(() => {
    if (!mapRef.current || !focusLocation) return
    // focusLocation is [lat, lng] from the parent — convert to [lng, lat]
    mapRef.current.flyTo({
      center: [focusLocation[1], focusLocation[0]],
      zoom: 16,
      duration: 1500
    })
  }, [focusLocation])

  return (
    <div
      ref={mapContainerRef}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
