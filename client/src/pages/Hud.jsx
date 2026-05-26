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
function timeAgo(iso) {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60)  return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    return `${Math.floor(diff/3600)}h ago`
  } catch { return '' }
}
function priorityLabel(p) {
  if (p === 1) return { label: 'CRITICAL', color: '#ff2222' }
  if (p === 2) return { label: 'HIGH',     color: '#ff6600' }
  if (p === 3) return { label: 'NORMAL',   color: '#ffaa00' }
  return              { label: 'ROUTINE',  color: '#555555' }
}
function signalColor(state) {
  if (state?.includes('red'))  return '#ff2222'
  if (state?.includes('soon')) return '#ff8800'
  return '#444444'
}
// Extract short radio codes from call type string
function extractCodes(ev) {
  const codes = []
  const code = ev.call_type?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  if (code) codes.push(code)
  // Add PulsePoint raw code if present in transcript
  const match = ev.transcript?.match(/\b([0-9]{2,3}[A-Z]?)\b/)
  if (match) codes.push(match[1])
  return [...new Set(codes)].slice(0, 3)
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
  const [panelOpen,   setPanelOpen]   = useState(false)
  const [alertBanner, setAlertBanner] = useState(null)
  // Scanner channel state
  const [channels,       setChannels]       = useState([])
  const [activeChannel,  setActiveChannel]  = useState(null)
  const [scannerOpen,    setScannerOpen]     = useState(false)
  const [aiPickReason,   setAiPickReason]   = useState('')
  const [aiPicking,      setAiPicking]      = useState(false)
  const [reportOpen,     setReportOpen]     = useState(false)
  const audioRef      = useRef(null)
  const recorderRef   = useRef(null)
  const userPosRef    = useRef(null)
  const cameraMarkers = useRef([])
  const reportMarkers = useRef([])

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
        userPosRef.current = { lat, lon, heading }
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

  // ── Fetch cameras ─────────────────────────────────────────────────────────
  const fetchCameras = useCallback(async (lat, lon) => {
    try {
      const r = await fetch(`${API_BASE}/cameras?lat=${lat}&lon=${lon}&radius_km=12`)
      if (!r.ok) return
      const data = await r.json()
      cameraMarkers.current.forEach(m => m.remove())
      cameraMarkers.current = []
      data.forEach(cam => {
        const el = document.createElement('div')
        el.className = 'camera-dot'
        el.title = cam.name
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([cam.lon, cam.lat])
          .setPopup(new mapboxgl.Popup({ className: 'olik-popup', offset: 10 }).setHTML(
            `<div class="popup-inner"><div class="popup-type">${cam.type === 'red_light' ? '🔴 RED LIGHT CAM' : '📷 SPEED CAM'}</div><div class="popup-summary">${cam.name}</div><div class="popup-time">${cam.distance_km} km away</div></div>`
          )).addTo(map.current)
        cameraMarkers.current.push(marker)
      })
    } catch (e) { console.warn('Cameras fetch failed:', e) }
  }, [])

  // ── Fetch user reports ────────────────────────────────────────────────────
  const fetchReports = useCallback(async (lat, lon) => {
    try {
      const r = await fetch(`${API_BASE}/reports?lat=${lat}&lon=${lon}&radius_km=12`)
      if (!r.ok) return
      const data = await r.json()
      reportMarkers.current.forEach(m => m.remove())
      reportMarkers.current = []
      data.forEach(rep => {
        const el = document.createElement('div')
        el.className = `report-dot report-dot--${rep.type}`
        el.title = rep.call_type
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([rep.lon, rep.lat])
          .setPopup(new mapboxgl.Popup({ className: 'olik-popup', offset: 10 }).setHTML(
            `<div class="popup-inner"><div class="popup-type">${rep.call_type}</div><div class="popup-summary">${rep.note || 'User reported'}</div><div class="popup-time">${timeAgo(rep.timestamp)}</div></div>`
          )).addTo(map.current)
        reportMarkers.current.push(marker)
      })
    } catch (e) { console.warn('Reports fetch failed:', e) }
  }, [])

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userPos) return
    fetchEvents(userPos.lat, userPos.lon)
    fetchSignals(userPos.lat, userPos.lon)
    fetchCameras(userPos.lat, userPos.lon)
    fetchReports(userPos.lat, userPos.lon)
    const t = setInterval(() => {
      fetchEvents(userPos.lat, userPos.lon)
      fetchSignals(userPos.lat, userPos.lon)
      fetchReports(userPos.lat, userPos.lon)
    }, REFRESH_MS)
    return () => clearInterval(t)
  }, [userPos?.lat, userPos?.lon, fetchEvents, fetchSignals, fetchCameras, fetchReports])

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

  // ── Load scanner channels on mount ───────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/channels`)
      .then(r => r.json())
      .then(data => setChannels(data))
      .catch(e => console.warn('Channels fetch failed:', e))
  }, [])

  // ── Play a scanner channel + start Whisper capture ───────────────────────
  function playChannel(ch) {
    // Stop previous audio + capture
    if (recorderRef.current) {
      try { recorderRef.current.abort() } catch {}
      recorderRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    if (activeChannel?.id === ch.id) {
      setActiveChannel(null)
      return
    }

    const proxyUrl = `${API_BASE}/stream-proxy?url=${encodeURIComponent(ch.stream_url)}`
    const audio = new Audio(proxyUrl)
    audioRef.current = audio

    audio.play().catch(e => setStatus(`Stream error: ${e.message}`))
    setActiveChannel(ch)
    setStatus(`Monitoring: ${ch.name}`)

    // Separate fetch-based capture for transcription (doesn't affect audio playback)
    let stopped = false
    const captureLoop = async () => {
      while (!stopped) {
        try {
          const ctrl = new AbortController()
          recorderRef.current = ctrl
          const resp = await fetch(proxyUrl, { signal: ctrl.signal })
          if (!resp.ok) break

          const reader = resp.body.getReader()
          const chunks = []
          const t0 = Date.now()
          while (Date.now() - t0 < 30_000 && !stopped) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
          }
          reader.cancel()

          if (chunks.length && !stopped) {
            const total = chunks.reduce((s, c) => s + c.length, 0)
            const buf = new Uint8Array(total)
            let off = 0
            for (const c of chunks) { buf.set(c, off); off += c.length }
            const pos = userPosRef.current
            if (pos && buf.length > 8000) {
              const form = new FormData()
              form.append('audio', new Blob([buf], { type: 'audio/mpeg' }), 'scanner.mp3')
              form.append('lat', String(pos.lat))
              form.append('lon', String(pos.lon))
              fetch(`${API_BASE}/transcribe`, { method: 'POST', body: form })
                .then(r => r.ok ? r.json() : [])
                .then(newEvs => {
                  if (!newEvs.length) return
                  setEvents(prev => {
                    const merged = [...newEvs, ...prev].slice(0, 50)
                    placeEventMarkers(merged)
                    checkProximityAlerts(newEvs, userPosRef.current)
                    return merged
                  })
                  setStatus(`Scanner: ${newEvs[0].call_type} detected`)
                })
                .catch(() => {})
            }
          }
        } catch {
          if (!stopped) await new Promise(r => setTimeout(r, 5000))
        }
      }
    }
    captureLoop()
  }

  // ── AI channel pick ───────────────────────────────────────────────────────
  async function aiPickChannel() {
    if (!userPos || aiPicking) return
    setAiPicking(true)
    setStatus('AI selecting channel …')
    const nearestEvent = events[0]
      ? `${events[0].call_type}: ${events[0].summary}`
      : ''
    const eventsSummary = events.slice(0, 3).map(e => e.call_type).join(', ')
    try {
      const r = await fetch(
        `${API_BASE}/select-channel?lat=${userPos.lat}&lon=${userPos.lon}` +
        `&events_summary=${encodeURIComponent(eventsSummary)}` +
        `&nearest_event=${encodeURIComponent(nearestEvent)}`
      )
      const data = await r.json()
      setAiPickReason(data.reason)
      playChannel(data.channel)
      setStatus(`AI → ${data.channel.name}`)
    } catch (e) {
      setStatus(`Channel AI error: ${e.message}`)
    } finally {
      setAiPicking(false)
    }
  }

  // ── Submit user report ────────────────────────────────────────────────────
  async function submitReport(type) {
    if (!userPos) { setStatus('GPS required to report.'); return }
    const form = new FormData()
    form.append('type', type)
    form.append('lat', String(userPos.lat))
    form.append('lon', String(userPos.lon))
    form.append('note', '')
    try {
      const r = await fetch(`${API_BASE}/report`, { method: 'POST', body: form })
      if (!r.ok) throw new Error(r.statusText)
      setStatus(`Reported: ${type} — thanks!`)
      setReportOpen(false)
      fetchReports(userPos.lat, userPos.lon)
    } catch (e) { setStatus(`Report failed: ${e.message}`) }
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
            <span className="hud-brand-olik">OLIK</span>
            <div className="hud-brand-dot"></div>
            <span className="brand-sub">RADAR</span>
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
          <button className="btn btn-report" onClick={() => setReportOpen(o => !o)} title="Report">⚑</button>
          <button
            className={`btn btn-speak ${speaking ? 'pulsing' : ''}`}
            onClick={speakBrief} disabled={speaking}>
            {speaking ? '◉' : '⬡'}
          </button>
        </div>

        <div className="status-bar">{status}</div>
      </div>

      {/* ── REPORT MODAL ── */}
      {reportOpen && (
        <div className="report-modal">
          <div className="report-title">⚑ REPORT</div>
          <div className="report-grid">
            <button className="report-btn report-btn--police" onClick={() => submitReport('police')}>
              <span className="report-icon">🚔</span>
              <span>Police</span>
            </button>
            <button className="report-btn report-btn--camera" onClick={() => submitReport('camera')}>
              <span className="report-icon">📷</span>
              <span>Camera</span>
            </button>
            <button className="report-btn report-btn--accident" onClick={() => submitReport('accident')}>
              <span className="report-icon">💥</span>
              <span>Accident</span>
            </button>
            <button className="report-btn report-btn--hazard" onClick={() => submitReport('hazard')}>
              <span className="report-icon">⚠</span>
              <span>Hazard</span>
            </button>
          </div>
          <button className="report-close" onClick={() => setReportOpen(false)}>✕</button>
        </div>
      )}

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

      {/* Scanner toggle */}
      <button className="scanner-toggle" onClick={() => setScannerOpen(o => !o)}>
        {activeChannel ? `◉ ${activeChannel.agency}` : '⬡ SCANNER'}
      </button>

      {/* Scanner panel */}
      {scannerOpen && (
        <div className="scanner-panel">
          <div className="scanner-header">
            <span className="scanner-title">⬡ SCANNER FEEDS</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className={`btn btn-ai-pick ${aiPicking ? 'pulsing' : ''}`}
                onClick={aiPickChannel}
                disabled={aiPicking || !userPos}
              >
                {aiPicking ? '◉ AI THINKING…' : '⚡ AI PICK'}
              </button>
              <button className="panel-close" onClick={() => setScannerOpen(false)}>✕</button>
            </div>
          </div>
          {aiPickReason && (
            <div className="scanner-ai-reason">▸ {aiPickReason}</div>
          )}
          <div className="scanner-channel-list">
            {channels.map(ch => (
              <div
                key={ch.id}
                className={`scanner-channel ${activeChannel?.id === ch.id ? 'scanner-channel--active' : ''}`}
                onClick={() => playChannel(ch)}
              >
                <div className="sc-top">
                  <span className="sc-name">{ch.name}</span>
                  {activeChannel?.id === ch.id && (
                    <span className="sc-live">● LIVE</span>
                  )}
                </div>
                <div className="sc-desc">{ch.description}</div>
                <div className="sc-footer">
                  <span className="sc-agency">{ch.agency}</span>
                  <span className="sc-action">
                    {activeChannel?.id === ch.id ? 'TAP TO STOP' : 'TAP TO MONITOR'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RIGHT / BOTTOM PANEL ── */}
      <div className={`right-panel ${panelOpen ? 'panel--open' : ''}`}>
        {/* Panel header */}
        <div className="panel-header">
          <div className="panel-header-top">
            <span className="panel-title">⬡ INCIDENT FEED</span>
            <button className="panel-close" onClick={() => setPanelOpen(false)}>✕</button>
          </div>
          <div className="panel-search-row">
            <input className="panel-search" placeholder="Search incidents..." readOnly />
            <div className="panel-filter">ALL PRIORITIES ▾</div>
          </div>
          <div className="panel-meta">SHOWING: {events.length} / {events.length}</div>
        </div>

        {/* Signal strip */}
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

        {/* Incident cards */}
        <div className="event-list">
          {events.length === 0 ? (
            <div className="no-events">// SCANNER ACTIVE — AWAITING DISPATCH //<br/><span style={{fontSize:'0.7rem',opacity:0.5}}>Real incidents appear within 90 seconds</span></div>
          ) : events.map((ev, idx) => {
            const prio    = priorityLabel(ev.priority)
            const isClose = ev.distance_km <= ALERT_RADIUS_KM
            const codes   = extractCodes(ev)
            const incidentNum = `#${String(idx + 1).padStart(4, '0')}${isClose ? ' ●' : ''}`
            return (
              <div key={ev.id} className={`event-card ${isClose ? 'event-card--alert' : ''}`}>
                {/* Card top row */}
                <div className="card-top-row">
                  <span className="card-incident-num">{incidentNum}</span>
                  <span className="card-time-ago">{timeAgo(ev.timestamp)}</span>
                  <span className="card-classified">🔒 CLASSIFIED</span>
                </div>

                {/* Priority badge */}
                <div className="card-priority-row">
                  <span className="card-prio-badge" style={{ borderColor: prio.color, color: prio.color }}>
                    ⊘ {prio.label}
                  </span>
                  {isClose && <span className="card-active-badge">● ACTIVE</span>}
                </div>

                {/* Summary */}
                <div className="card-label">SUMMARY:</div>
                <div className="card-summary">{ev.summary}</div>

                {/* Codes */}
                {codes.length > 0 && (
                  <div className="card-codes-row">
                    <span className="card-label">CODES:</span>
                    {codes.map(c => <span key={c} className="card-code-chip">{c}</span>)}
                  </div>
                )}

                {/* Transcript */}
                <div className="card-label">TRANSCRIPT:</div>
                <div className="card-transcript">{ev.transcript}</div>

                {/* Footer */}
                <div className="card-footer">
                  <span className="card-source-label">
                    SOURCE: <span style={{ color: ev.source === 'demo' ? '#ffcc00' : '#00cc66' }}>
                      {ev.source === 'demo' ? 'DEMO DATA' : (ev.source || 'PULSEPOINT').toUpperCase()}
                    </span>
                  </span>
                  <span className="card-dist" style={{ color: isClose ? '#ff2222' : undefined }}>
                    {(ev.distance_km * 0.621).toFixed(2)} MI
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
