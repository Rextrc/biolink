import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import { clearAuth } from '../utils/auth'
import './Hud.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const API_BASE     = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const REFRESH_MS   = 30_000
const ALERT_RADIUS_KM = 1.609  // 1 mile

mapboxgl.accessToken = MAPBOX_TOKEN

function fmtTime(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}
function priorityLabel(p) {
  if (p === 1) return { label: 'CRITICAL', color: '#ff2222' }
  if (p === 2) return { label: 'HIGH',     color: '#ff6600' }
  if (p === 3) return { label: 'MEDIUM',   color: '#ffcc00' }
  return              { label: 'LOW',      color: '#888888' }
}
function signalColor(state) {
  if (state?.includes('red'))  return '#ff2222'
  if (state?.includes('soon')) return '#ff8800'
  return '#444444'
}

export default function HudPage() {
  const navigate      = useNavigate()
  const mapContainer  = useRef(null)
  const map           = useRef(null)
  const userMarker    = useRef(null)
  const eventMarkers  = useRef([])
  const signalMarkers = useRef([])
  const notifiedIds   = useRef(new Set())   // track which events already alerted

  const [userPos,     setUserPos]     = useState(null)
  const [destination, setDestination] = useState('')
  const [events,      setEvents]      = useState([])
  const [signals,     setSignals]     = useState([])
  const [routeSteps,  setRouteSteps]  = useState([])
  const [stepIndex,   setStepIndex]   = useState(0)
  const [status,      setStatus]      = useState('Initialising OLIK RADAR …')
  const [speaking,    setSpeaking]    = useState(false)
  const [panelOpen,   setPanelOpen]   = useState(false)  // closed by default on mobile
  const [alertBanner, setAlertBanner] = useState(null)   // { message, id }

  // ── Lock body scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ── Request notification permission ──────────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-80.1918, 25.7617],
      zoom: 15,
      pitch: 60,
      bearing: 0,
      attributionControl: false,
    })
    map.current.on('load', () => {
      map.current.setPaintProperty('background', 'background-color', '#0a0000')
      map.current.addSource('route', { type: 'geojson', data: emptyGeoJSON() })
      map.current.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ff1a1a', 'line-width': 6, 'line-opacity': 0.95, 'line-blur': 1 },
      })
      map.current.addLayer({
        id: 'route-glow', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ff4444', 'line-width': 14, 'line-opacity': 0.15, 'line-blur': 8 },
      }, 'route-line')
      setStatus('Awaiting GPS lock …')
    })
    return () => { map.current?.remove(); map.current = null }
  }, [])

  // ── GPS ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setStatus('GPS unavailable.'); return }
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, heading } = pos.coords
        setUserPos({ lat, lon, heading })
        setStatus('GPS locked.')
        if (!userMarker.current) {
          const el = document.createElement('div')
          el.className = 'user-dot'
          userMarker.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([lon, lat]).addTo(map.current)
        } else {
          userMarker.current.setLngLat([lon, lat])
        }
        map.current?.easeTo({
          center: [lon, lat],
          bearing: heading ?? map.current.getBearing(),
          duration: 800,
        })
      },
      (err) => setStatus(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 2000 }
    )
    return () => navigator.geolocation.clearWatch(wid)
  }, [])

  // ── Police proximity alert ────────────────────────────────────────────────
  const checkProximityAlerts = useCallback((evs, pos) => {
    if (!pos) return
    evs.forEach(ev => {
      if (ev.distance_km <= ALERT_RADIUS_KM && !notifiedIds.current.has(ev.id)) {
        notifiedIds.current.add(ev.id)

        // In-app banner
        setAlertBanner({ message: `${ev.call_type} — ${(ev.distance_km * 0.621).toFixed(2)} mi away`, id: ev.id })
        setTimeout(() => setAlertBanner(null), 6000)

        // Browser / phone notification
        if (Notification.permission === 'granted') {
          new Notification('⚠ OLIK RADAR — Activity Nearby', {
            body: `${ev.call_type}: ${ev.summary}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: ev.id,
            requireInteraction: false,
          })
        }

        // Vibrate on mobile
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      }
    })
  }, [])

  // ── Fetch events ──────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (lat, lon) => {
    try {
      const r = await fetch(`${API_BASE}/events?lat=${lat}&lon=${lon}&radius_km=10`)
      if (!r.ok) throw new Error(r.statusText)
      const data = await r.json()
      setEvents(data)
      placeEventMarkers(data)
      checkProximityAlerts(data, { lat, lon })
    } catch (e) { console.warn('Events fetch failed:', e) }
  }, [checkProximityAlerts])

  // ── Fetch signals ─────────────────────────────────────────────────────────
  const fetchSignals = useCallback(async (lat, lon) => {
    try {
      const r = await fetch(`${API_BASE}/ahead?lat=${lat}&lon=${lon}`)
      if (!r.ok) throw new Error(r.statusText)
      const data = await r.json()
      setSignals(data)
      placeSignalMarkers(data)
    } catch (e) { console.warn('Signals fetch failed:', e) }
  }, [])

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userPos) return
    fetchEvents(userPos.lat, userPos.lon)
    fetchSignals(userPos.lat, userPos.lon)
    const t = setInterval(() => {
      fetchEvents(userPos.lat, userPos.lon)
      fetchSignals(userPos.lat, userPos.lon)
    }, REFRESH_MS)
    return () => clearInterval(t)
  }, [userPos?.lat, userPos?.lon, fetchEvents, fetchSignals])

  // ── Set route ─────────────────────────────────────────────────────────────
  async function setRoute() {
    if (!destination.trim()) { setStatus('Enter a destination.'); return }
    if (!userPos)            { setStatus('Waiting for GPS …');    return }
    setStatus('Routing …')
    try {
      const r = await fetch(`${API_BASE}/route?dest=${encodeURIComponent(destination)}&lat=${userPos.lat}&lon=${userPos.lon}`)
      if (!r.ok) throw new Error(r.statusText)
      const data = await r.json()
      if (!data.routes?.length) { setStatus('No route found.'); return }
      const route  = data.routes[0]
      const coords = route.geometry.coordinates
      map.current.getSource('route').setData({ type: 'Feature', geometry: route.geometry })
      const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]))
      map.current.fitBounds(bounds, { padding: { top: 120, bottom: 180, left: 20, right: 20 }, duration: 1200 })
      const steps = route.legs[0]?.steps?.map(s => s.maneuver?.instruction ?? '') ?? []
      setRouteSteps(steps)
      setStepIndex(0)
      setStatus(`Route set — ${Math.round(route.duration / 60)} min`)
    } catch (e) { setStatus(`Route error: ${e.message}`) }
  }

  // ── Speak brief ───────────────────────────────────────────────────────────
  async function speakBrief() {
    if (speaking) return
    setSpeaking(true)
    setStatus('Generating OLIK brief …')
    const context = [
      `Next step: ${routeSteps[stepIndex] ?? 'No active route'}`,
      `Signals: ${signals.map(s => `${s.name}: ${s.state}`).join('; ') || 'none'}`,
      `Nearest activity: ${events[0] ? `${events[0].call_type} ${events[0].distance_km} km — ${events[0].summary}` : 'none'}`,
    ].join('. ')
    try {
      const r = await fetch(`${API_BASE}/brief?text=${encodeURIComponent(context)}`)
      if (!r.ok) throw new Error(r.statusText)
      const blob  = await r.blob()
      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); setStatus('Brief complete.') }
      audio.onerror = () => { setSpeaking(false); setStatus('Audio error.') }
      audio.play()
      setStatus('Broadcasting …')
    } catch (e) { setSpeaking(false); setStatus(`Brief error: ${e.message}`) }
  }

  // ── Marker helpers ────────────────────────────────────────────────────────
  function placeEventMarkers(evs) {
    eventMarkers.current.forEach(m => m.remove()); eventMarkers.current = []
    evs.forEach(ev => {
      const el = document.createElement('div')
      el.className = ev.distance_km <= ALERT_RADIUS_KM ? 'event-dot event-dot--alert' : 'event-dot'
      el.title = ev.summary
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([ev.lon, ev.lat])
        .setPopup(new mapboxgl.Popup({ className: 'olik-popup', offset: 12 }).setHTML(
          `<div class="popup-inner"><div class="popup-type">${ev.call_type}</div><div class="popup-summary">${ev.summary}</div><div class="popup-time">${fmtTime(ev.timestamp)}</div></div>`
        )).addTo(map.current)
      eventMarkers.current.push(marker)
    })
  }

  function placeSignalMarkers(sigs) {
    signalMarkers.current.forEach(m => m.remove()); signalMarkers.current = []
    sigs.forEach(sig => {
      const el = document.createElement('div'); el.className = 'signal-dot'
      el.style.background = signalColor(sig.state); el.title = `${sig.name}: ${sig.state}`
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([sig.lon, sig.lat])
        .setPopup(new mapboxgl.Popup({ className: 'olik-popup', offset: 10 }).setHTML(
          `<div class="popup-inner"><div class="popup-type">SIGNAL</div><div class="popup-summary">${sig.name}</div><div class="popup-state" style="color:${signalColor(sig.state)}">${sig.state.toUpperCase()}</div></div>`
        )).addTo(map.current)
      signalMarkers.current.push(marker)
    })
  }

  function emptyGeoJSON() {
    return { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
  }

  const nearbyCount = events.filter(e => e.distance_km <= ALERT_RADIUS_KM).length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="hud-root">
      <div ref={mapContainer} className="map-container" />

      {/* ── PROXIMITY ALERT BANNER ── */}
      {alertBanner && (
        <div className="alert-banner">
          <span className="alert-icon">⚠</span>
          <span className="alert-text">{alertBanner.message}</span>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="top-bar">
        <div className="top-bar-row1">
          <div className="hud-brand">
            OLIK<span className="brand-sub"> RADAR</span>
          </div>
          <div className="hud-top-right">
            {nearbyCount > 0 && (
              <div className="nearby-badge" onClick={() => setPanelOpen(true)}>
                ⚠ {nearbyCount} nearby
              </div>
            )}
            <button className="btn btn-back" onClick={() => { clearAuth(); navigate('/login') }}>⏻</button>
          </div>
        </div>

        <div className="top-controls">
          <input className="dest-input" type="text" placeholder="Where to?"
            value={destination} onChange={e => setDestination(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setRoute()} />
          <button className="btn btn-primary" onClick={setRoute}>GO</button>
          <button
            className={`btn btn-speak ${speaking ? 'pulsing' : ''}`}
            onClick={speakBrief} disabled={speaking}>
            {speaking ? '◉' : '⬡'}
          </button>
        </div>

        <div className="status-bar">{status}</div>
      </div>

      {/* ── NEXT STEP STRIP (driving nav) ── */}
      {routeSteps.length > 0 && (
        <div className="nav-strip" onClick={() => setStepIndex(i => Math.min(i + 1, routeSteps.length - 1))}>
          <span className="nav-arrow">▶</span>
          <span className="nav-step">{routeSteps[stepIndex]}</span>
          <span className="nav-count">{stepIndex + 1}/{routeSteps.length}</span>
        </div>
      )}

      {/* ── PANEL TOGGLE ── */}
      <button className="panel-toggle" onClick={() => setPanelOpen(o => !o)}>
        {panelOpen ? '▼' : `▲ ${events.length}`}
      </button>

      {/* ── RIGHT / BOTTOM PANEL ── */}
      <div className={`right-panel ${panelOpen ? 'panel--open' : ''}`}>
        <div className="panel-header">
          <span className="panel-title">ACTIVITY</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="panel-count">{events.length} INCIDENTS</span>
            <button className="panel-close" onClick={() => setPanelOpen(false)}>✕</button>
          </div>
        </div>

        {signals.length > 0 && (
          <div className="signal-strip">
            {signals.map(s => (
              <div key={s.id} className="signal-pill" style={{ borderColor: signalColor(s.state) }}>
                <span className="signal-name">{s.name.split('&')[0].trim()}</span>
                <span className="signal-state" style={{ color: signalColor(s.state) }}>{s.state.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        <div className="event-list">
          {events.length === 0 ? (
            <div className="no-events">No incidents in range.</div>
          ) : events.map(ev => {
            const prio    = priorityLabel(ev.priority)
            const isClose = ev.distance_km <= ALERT_RADIUS_KM
            return (
              <div key={ev.id} className={`event-card ${isClose ? 'event-card--alert' : ''}`}>
                <div className="card-top">
                  <span className="card-type">{isClose && '⚠ '}{ev.call_type}</span>
                  <span className="card-prio" style={{ color: prio.color }}>{prio.label}</span>
                </div>
                <div className="card-summary">{ev.summary}</div>
                <div className="card-transcript">{ev.transcript}</div>
                <div className="card-footer">
                  <span>
                    {fmtTime(ev.timestamp)}
                    {ev.source && (
                      <span className={`card-source ${ev.source === 'demo' ? 'card-source--demo' : ''}`}>
                        {ev.source === 'demo' ? 'DEMO' : ev.source.toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span style={{ color: isClose ? '#ff2222' : undefined }}>
                    {(ev.distance_km * 0.621).toFixed(2)} mi
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="scanline" />
    </div>
  )
}
