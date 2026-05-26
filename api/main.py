"""
JARVIS HUD — FastAPI Backend
Public safety awareness dashboard (lawful feeds only).
"""

import asyncio
import io
import math
import os
import time
from datetime import datetime, timezone
from urllib.parse import quote

import aiohttp
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
import json as _json

load_dotenv()

OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY", "")
ELEVEN_API_KEY   = os.getenv("ELEVEN_API_KEY", "")
ELEVEN_VOICE_ID  = os.getenv("ELEVEN_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")
MAPBOX_TOKEN     = os.getenv("MAPBOX_TOKEN", "")
SPOTCRIME_KEY    = os.getenv("SPOTCRIME_KEY", "")

app = FastAPI(title="Jarvis HUD API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Mock event templates — fallback only, spawned relative to user's GPS
# ---------------------------------------------------------------------------

_EVENT_TEMPLATES = [
    {
        "id": "EVT001", "dlat":  0.013, "dlon":  0.007,
        "call_type": "Traffic Stop", "priority": 3,
        "summary": "Vehicle stop — expired registration, driver cooperative.",
        "transcript": "Unit 42 conducting traffic stop northbound. Tag shows expired. Subject ID in progress.",
        "ago_min": 12,
    },
    {
        "id": "EVT002", "dlat": -0.005, "dlon":  0.018,
        "call_type": "Disturbance", "priority": 2,
        "summary": "Verbal dispute between subjects, parties separated.",
        "transcript": "Units on scene. No weapons. Parties separated — no arrest at this time.",
        "ago_min": 6,
    },
    {
        "id": "EVT003", "dlat":  0.021, "dlon": -0.009,
        "call_type": "Burglar Alarm", "priority": 4,
        "summary": "Alarm activation at retail plaza — likely false positive.",
        "transcript": "Unit en route. Owner notified, keyholder responding.",
        "ago_min": 27,
    },
    {
        "id": "EVT004", "dlat": -0.018, "dlon": -0.022,
        "call_type": "Suspicious Vehicle", "priority": 3,
        "summary": "Suspicious vehicle parked at closed business.",
        "transcript": "Unit checking plates. No wants. Area clear.",
        "ago_min": 14,
    },
    {
        "id": "EVT005", "dlat":  0.008, "dlon": -0.031,
        "call_type": "Road Hazard", "priority": 3,
        "summary": "Debris in roadway near on-ramp.",
        "transcript": "Caller reports large object partially blocking right lane. Road crew notified.",
        "ago_min": 19,
    },
    {
        "id": "EVT006", "dlat": -0.027, "dlon":  0.014,
        "call_type": "Welfare Check", "priority": 2,
        "summary": "Welfare check requested by caller.",
        "transcript": "Units on scene. Subject located — no further action required.",
        "ago_min": 2,
    },
]


def _build_mock_events(user_lat: float, user_lon: float):
    now = datetime.now(timezone.utc)
    results = []
    for t in _EVENT_TEMPLATES:
        lat = user_lat + t["dlat"]
        lon = user_lon + t["dlon"]
        ts  = now.replace(second=0, microsecond=0).timestamp() - t["ago_min"] * 60
        results.append({
            "id":         t["id"],
            "lat":        round(lat, 6),
            "lon":        round(lon, 6),
            "call_type":  t["call_type"],
            "priority":   t["priority"],
            "summary":    t["summary"],
            "transcript": t["transcript"],
            "timestamp":  datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
        })
    return results


# ---------------------------------------------------------------------------
# Signal intersection templates — relative offsets from user
# ---------------------------------------------------------------------------

_SIGNAL_TEMPLATES = [
    {"id": "INT001", "name": "Main St & 1st Ave",     "dlat":  0.005, "dlon":  0.003},
    {"id": "INT002", "name": "Oak Blvd & 5th St",     "dlat": -0.004, "dlon":  0.011},
    {"id": "INT003", "name": "Park Rd & Highway Dr",  "dlat":  0.014, "dlon": -0.006},
    {"id": "INT004", "name": "Elm Ave & Cross St",    "dlat": -0.009, "dlon": -0.014},
    {"id": "INT005", "name": "Bridge Rd & North Blvd","dlat":  0.019, "dlon":  0.008},
    {"id": "INT006", "name": "Center St & West Ave",  "dlat":  0.002, "dlon": -0.021},
    {"id": "INT007", "name": "Commerce Dr & Ring Rd", "dlat": -0.017, "dlon":  0.017},
    {"id": "INT008", "name": "Industrial Blvd & 3rd", "dlat":  0.024, "dlon": -0.019},
]


def _build_intersections(user_lat: float, user_lon: float):
    return [
        {
            "id":   t["id"],
            "name": t["name"],
            "lat":  round(user_lat + t["dlat"], 6),
            "lon":  round(user_lon + t["dlon"], 6),
        }
        for t in _SIGNAL_TEMPLATES
    ]


# ---------------------------------------------------------------------------
# Spot Crime — real geocoded police incidents
# ---------------------------------------------------------------------------
# SpotCrime aggregates live CAD feeds from police departments nationwide.
# Requires a free API key from spotcrime.com/user/api
# Returns incidents with lat/lon, type, date, address — updated every few minutes.

_SC_TYPE_MAP = {
    "Arrest":    ("Arrest",         3),
    "Arson":     ("Arson",          1),
    "Assault":   ("Assault",        1),
    "Burglary":  ("Burglary",       2),
    "Robbery":   ("Robbery",        1),
    "Shooting":  ("Shooting",       1),
    "Theft":     ("Theft",          3),
    "Vandalism": ("Vandalism",      4),
    "Other":     ("Incident",       4),
}

def _sc_priority(crime_type: str) -> int:
    for k, (_, p) in _SC_TYPE_MAP.items():
        if k.lower() in crime_type.lower():
            return p
    return 3


async def fetch_spotcrime(lat: float, lon: float, radius_km: float) -> list:
    if not SPOTCRIME_KEY:
        return []
    # SpotCrime radius is in decimal degrees; 0.01 deg ≈ 1.1 km
    radius_deg = radius_km / 111.0
    url = "https://api.spotcrime.com/crimes.json"
    params = {
        "lat": lat,
        "lon": lon,
        "r":   round(radius_deg, 4),
        "key": SPOTCRIME_KEY,
    }
    try:
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=8),
            headers={"User-Agent": "Mozilla/5.0"},
        ) as session:
            async with session.get(url, params=params) as resp:
                if resp.status != 200:
                    print(f"SpotCrime HTTP {resp.status}")
                    return []
                data = await resp.json(content_type=None)
    except Exception as e:
        print(f"SpotCrime fetch error: {e}")
        return []

    crimes = data.get("crimes", [])
    results = []
    for c in crimes:
        try:
            inc_lat = float(c.get("lat", 0))
            inc_lon = float(c.get("lon", 0))
            if not inc_lat or not inc_lon:
                continue
            d_km = haversine_km(lat, lon, inc_lat, inc_lon)
            crime_type = c.get("type", "Incident")
            results.append({
                "id":           f"SC-{c.get('cdid', int(time.time()*1000))}",
                "lat":          round(inc_lat, 6),
                "lon":          round(inc_lon, 6),
                "call_type":    crime_type,
                "priority":     _sc_priority(crime_type),
                "summary":      f"{crime_type} — {c.get('address', '')}".strip(" —"),
                "transcript":   f"Reported: {c.get('date', '')}. Address: {c.get('address', '')}.",
                "timestamp":    c.get("date", datetime.now(timezone.utc).isoformat()),
                "distance_km":  round(d_km, 2),
                "source":       "SpotCrime",
            })
        except Exception:
            continue

    results.sort(key=lambda e: e["distance_km"])
    return results


# ---------------------------------------------------------------------------
# Scanner Whisper pipeline — browser posts 30s audio chunks here
# ---------------------------------------------------------------------------

_live_events: list = []  # geocoded incidents from scanner transcription, newest first

_PARSE_SYSTEM = """You are a Miami-Dade County police scanner transcript parser.
Extract incident data and return JSON array (empty if no real incident).
Format: [{"call_type": "...", "location": "...", "summary": "...", "units": "..."}]
- call_type: short label e.g. "Traffic Stop", "Shooting", "Disturbance", "Pursuit", "Battery", "Robbery"
- location: full street address or intersection heard. Miami-Dade uses compass prefixes (NW, SW, NE, SE) — always include them. Convert "Northwest 7th" → "NW 7th Ave". If a zone/district is mentioned with no address, omit that entry.
- summary: one sentence under 15 words describing the incident
- units: unit IDs mentioned (e.g. "C12", "Delta 4")
Miami police codes: Code 3 = emergency, 10-30 = robbery, 10-31 = burglary, 10-54 = accident, Baker = B-unit, Charlie = C-unit.
Only include entries with a clear geocodable Miami street location. Return [] for radio noise, status checks, or unclear traffic."""


async def _parse_transcript(raw: str) -> list:
    if not openai_client or not raw.strip():
        return []
    try:
        resp = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _PARSE_SYSTEM},
                {"role": "user",   "content": raw[:1200]},
            ],
            max_tokens=400,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        parsed = _json.loads(resp.choices[0].message.content)
        if isinstance(parsed, list):
            return parsed
        for v in parsed.values():
            if isinstance(v, list):
                return v
        return []
    except Exception as e:
        print(f"Parse transcript error: {e}")
        return []


def _priority_from_call_type(call_type: str) -> int:
    ct = call_type.lower()
    if any(w in ct for w in ["shoot", "stab", "robbery", "assault", "pursuit", "weapon", "homicide"]):
        return 1
    if any(w in ct for w in ["disturbance", "fight", "domestic", "drug", "suspicious"]):
        return 2
    if any(w in ct for w in ["traffic", "accident", "alarm", "theft", "burglary"]):
        return 3
    return 4


async def _geocode_address(session: aiohttp.ClientSession, address: str,
                            hint_lat: float = 25.76, hint_lon: float = -80.19):
    if not MAPBOX_TOKEN or not address.strip():
        return None
    try:
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{quote(address)}.json"
        async with session.get(url, params={
            "access_token": MAPBOX_TOKEN,
            "proximity": f"{hint_lon},{hint_lat}",
            "limit": 1,
        }) as resp:
            if resp.status != 200:
                return None
            geo = await resp.json(content_type=None)
        features = geo.get("features", [])
        if features:
            lon, lat = features[0]["center"]
            return lat, lon
    except Exception as e:
        print(f"Geocode error: {e}")
    return None


@app.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    lat:   float      = Form(...),
    lon:   float      = Form(...),
):
    """Receive a 30s scanner audio chunk from the browser, Whisper it, geocode, return new events."""
    if not openai_client:
        return []

    audio_bytes = await audio.read()
    if len(audio_bytes) < 1000:
        return []

    try:
        buf = io.BytesIO(audio_bytes)
        buf.name = audio.filename or "scanner.webm"
        result = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=buf,
            language="en",
            prompt="Police scanner dispatch. Street address, unit number, call code.",
        )
        transcript = result.text.strip()
    except Exception as e:
        print(f"Whisper error: {e}")
        return []

    if not transcript or len(transcript) < 5:
        return []

    print(f"[Scanner] {transcript[:120]}")

    incidents = await _parse_transcript(transcript)
    if not incidents:
        return []

    new_events = []
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8)) as session:
        for inc in incidents:
            address = inc.get("location", "")
            if not address:
                continue
            coords = await _geocode_address(session, address, hint_lat=lat, hint_lon=lon)
            if not coords:
                continue
            inc_lat, inc_lon = coords
            d_km = haversine_km(lat, lon, inc_lat, inc_lon)
            call_type = inc.get("call_type", "Incident")
            ev = {
                "id":          f"WSP-{int(time.time() * 1000)}",
                "lat":         round(inc_lat, 6),
                "lon":         round(inc_lon, 6),
                "call_type":   call_type,
                "priority":    _priority_from_call_type(call_type),
                "summary":     inc.get("summary") or transcript[:80],
                "transcript":  transcript[:300],
                "units":       inc.get("units", ""),
                "timestamp":   datetime.now(timezone.utc).isoformat(),
                "distance_km": round(d_km, 2),
                "source":      "Scanner/Whisper",
            }
            _live_events.insert(0, ev)
            new_events.append(ev)

    _live_events[:] = _live_events[:100]
    return new_events


# ---------------------------------------------------------------------------
# /events
# ---------------------------------------------------------------------------

@app.get("/events")
async def get_events(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(10.0),
):
    # 1. Live scanner events from browser Whisper pipeline
    if _live_events:
        results = [
            {**ev, "distance_km": round(haversine_km(lat, lon, ev["lat"], ev["lon"]), 2)}
            for ev in _live_events
            if haversine_km(lat, lon, ev["lat"], ev["lon"]) <= radius_km
        ]
        if results:
            return sorted(results, key=lambda e: e["distance_km"])

    # 2. SpotCrime — real geocoded police incidents (requires SPOTCRIME_KEY)
    if SPOTCRIME_KEY:
        try:
            real = await fetch_spotcrime(lat, lon, radius_km)
            if real:
                return real
        except Exception as e:
            print(f"SpotCrime error: {e}")

    # No real data yet — return empty, scanner will populate within 90s
    return []


# ---------------------------------------------------------------------------
# /route  — Mapbox Geocoding + Directions + hazard scan
# ---------------------------------------------------------------------------

def _min_dist_to_route_km(pt_lat: float, pt_lon: float, coords: list) -> float:
    """Minimum haversine distance from a point to any vertex in the route polyline."""
    best = float("inf")
    for c in coords:
        d = haversine_km(pt_lat, pt_lon, c[1], c[0])
        if d < best:
            best = d
    return best


async def _scan_route_hazards(coords: list, origin_lat: float, origin_lon: float) -> list:
    """Return incidents, cameras, and reports that fall within 300 m of the route."""
    THRESHOLD_KM = 0.30
    hazards = []

    # ── TomTom incidents ──────────────────────────────────────────────────────
    if TOMTOM_API_KEY and coords:
        lats = [c[1] for c in coords]; lons = [c[0] for c in coords]
        bbox = f"{min(lons):.5f},{min(lats):.5f},{max(lons):.5f},{max(lats):.5f}"
        fields = ("{incidents{type,geometry{type,coordinates},"
                  "properties{iconCategory,magnitudeOfDelay,"
                  "events{description},from,to,roadNumbers}}}")
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8)) as s:
                async with s.get(
                    "https://api.tomtom.com/traffic/services/5/incidentDetails",
                    params={"key": TOMTOM_API_KEY, "bbox": bbox,
                            "fields": fields, "language": "en-GB",
                            "timeValidityFilter": "present"},
                    headers={"User-Agent": "OlikRadar/1.0"},
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json(content_type=None)
                        for feat in data.get("incidents", []):
                            props = feat.get("properties", {})
                            geom  = feat.get("geometry", {})
                            c2    = geom.get("coordinates", [])
                            if geom.get("type") == "Point":
                                inc_lon2, inc_lat2 = c2[0], c2[1]
                            elif geom.get("type") == "LineString" and c2:
                                inc_lon2, inc_lat2 = c2[0][0], c2[0][1]
                            else:
                                continue
                            if _min_dist_to_route_km(inc_lat2, inc_lon2, coords) <= THRESHOLD_KM:
                                icon_cat = props.get("iconCategory", 0)
                                events   = props.get("events", [])
                                desc     = events[0]["description"] if events else _INCIDENT_TYPES.get(icon_cat, {}).get("label", "Incident")
                                road     = (props.get("roadNumbers") or [""])[0]
                                hazards.append({
                                    "source":      "tomtom",
                                    "type":        _INCIDENT_TYPES.get(icon_cat, {}).get("label", "Incident"),
                                    "color":       _INCIDENT_TYPES.get(icon_cat, {}).get("color", "#ff6600"),
                                    "description": desc,
                                    "road":        road,
                                    "lat": inc_lat2, "lon": inc_lon2,
                                })
        except Exception as e:
            print(f"[RouteHazards/TomTom] {e}")

    # ── Cameras ───────────────────────────────────────────────────────────────
    for cam in _MDC_CAMERAS:
        if _min_dist_to_route_km(cam["lat"], cam["lon"], coords) <= THRESHOLD_KM:
            hazards.append({
                "source":      "camera",
                "type":        "Red Light Camera" if cam["type"] == "red_light" else "Speed Camera",
                "color":       "#ffaa00",
                "description": cam["name"],
                "road":        "",
                "lat": cam["lat"], "lon": cam["lon"],
            })

    # ── User reports ──────────────────────────────────────────────────────────
    now = time.time()
    for r in list(_user_reports):
        if now - r["timestamp"] > 3600:
            continue
        if _min_dist_to_route_km(r["lat"], r["lon"], coords) <= THRESHOLD_KM:
            hazards.append({
                "source":      "report",
                "type":        r["call_type"].capitalize(),
                "color":       "#3b82f6" if r["call_type"] == "police" else "#f97316",
                "description": r.get("note") or f"User reported {r['call_type']}",
                "road":        "",
                "lat": r["lat"], "lon": r["lon"],
            })

    # ── Scanner events ────────────────────────────────────────────────────────
    for ev in list(_live_events):
        if _min_dist_to_route_km(ev["lat"], ev["lon"], coords) <= THRESHOLD_KM:
            hazards.append({
                "source":      "scanner",
                "type":        ev.get("call_type", "Scanner Alert"),
                "color":       "#ff2244",
                "description": ev.get("summary", ""),
                "road":        ev.get("address", ""),
                "lat": ev["lat"], "lon": ev["lon"],
            })

    return hazards


@app.get("/route")
async def get_route(
    dest: str = Query(...),
    lat: float = Query(...),
    lon: float = Query(...),
):
    if not MAPBOX_TOKEN:
        raise HTTPException(status_code=503, detail="MAPBOX_TOKEN not configured")

    async with aiohttp.ClientSession() as session:
        geocode_url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{quote(dest)}.json"
        async with session.get(geocode_url, params={
            "proximity": f"{lon},{lat}",
            "access_token": MAPBOX_TOKEN,
            "limit": 1,
        }) as resp:
            geo = await resp.json()

        features = geo.get("features", [])
        if not features:
            raise HTTPException(status_code=404, detail="Destination not found")

        dest_lon, dest_lat = features[0]["center"]

        directions_url = (
            f"https://api.mapbox.com/directions/v5/mapbox/driving-traffic/"
            f"{lon},{lat};{dest_lon},{dest_lat}"
        )
        async with session.get(directions_url, params={
            "geometries": "geojson",
            "steps": "true",
            "overview": "full",
            "access_token": MAPBOX_TOKEN,
        }) as resp:
            data = await resp.json()

    if not data.get("routes"):
        raise HTTPException(status_code=404, detail="No route found")

    route_coords = data["routes"][0]["geometry"]["coordinates"]
    hazards = await _scan_route_hazards(route_coords, lat, lon)
    data["route_hazards"] = hazards
    return data


# ---------------------------------------------------------------------------
# /ahead
# ---------------------------------------------------------------------------

@app.get("/ahead")
async def get_ahead(
    lat: float = Query(...),
    lon: float = Query(...),
):
    intersections = _build_intersections(lat, lon)
    ranked = sorted(
        intersections,
        key=lambda i: haversine_km(lat, lon, i["lat"], i["lon"]),
    )
    nearest = ranked[:2]

    results = []
    for inter in nearest:
        dist_km = haversine_km(lat, lon, inter["lat"], inter["lon"])
        bucket = (int(time.time()) // 90 + hash(inter["id"])) % 3
        state  = ["likely red / queued", "possibly red soon", "likely green / flowing"][bucket]
        results.append({
            "id":          inter["id"],
            "name":        inter["name"],
            "lat":         inter["lat"],
            "lon":         inter["lon"],
            "distance_km": round(dist_km, 2),
            "state":       state,
        })

    return results


# ---------------------------------------------------------------------------
# /brief
# ---------------------------------------------------------------------------

def _build_fallback_brief(text: str) -> str:
    lines = [l.strip() for l in text.split('.') if l.strip()]
    parts = []
    for l in lines:
        if 'step' in l.lower() and 'no active route' not in l.lower():
            step = l.split(':', 1)[-1].strip()
            if step: parts.append(step)
        elif 'activity' in l.lower() and 'none' not in l.lower():
            act = l.split(':', 1)[-1].strip()
            if act: parts.append(act)
        elif 'signal' in l.lower() and 'none' not in l.lower():
            sig = l.split(':', 1)[-1].strip()
            if sig: parts.append(f"signals: {sig}")
    if parts:
        body = ' — '.join(parts[:2])
        return f"OLIK radar — {body}."
    return "OLIK radar — all clear. No significant activity in your area."


@app.get("/brief")
async def get_brief(text: str = Query(...)):
    if not OPENAI_API_KEY or not openai_client:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    jarvis_line = None
    try:
        chat = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": (
                    "You are OLIK, a calm and precise AI radar assistant. "
                    "Rewrite the following situational briefing as exactly ONE crisp tactical sentence "
                    "in a confident, slightly formal voice. "
                    "Keep it under 35 words. Start with 'Heads up —' or 'OLIK radar —'."
                )},
                {"role": "user", "content": text},
            ],
            max_tokens=80,
            temperature=0.7,
        )
        jarvis_line = chat.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI brief failed: {e}")
        jarvis_line = _build_fallback_brief(text)

    # Try OpenAI TTS first, fall back to ElevenLabs
    audio_bytes = None
    try:
        tts_response = await openai_client.audio.speech.create(
            model="tts-1",
            voice="onyx",
            input=jarvis_line,
            response_format="mp3",
        )
        audio_bytes = await tts_response.aread()
    except Exception as e:
        print(f"OpenAI TTS failed: {e}")

    if audio_bytes is None and ELEVEN_API_KEY:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE_ID}",
                    headers={"xi-api-key": ELEVEN_API_KEY, "Content-Type": "application/json"},
                    json={"text": jarvis_line, "model_id": "eleven_monolingual_v1",
                          "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}},
                ) as resp:
                    if resp.status == 200:
                        audio_bytes = await resp.read()
        except Exception as e:
            print(f"ElevenLabs TTS failed: {e}")

    if not audio_bytes:
        raise HTTPException(status_code=503, detail="TTS unavailable")

    safe_text = jarvis_line.encode("ascii", errors="replace").decode("ascii")
    return StreamingResponse(
        iter([audio_bytes]),
        media_type="audio/mpeg",
        headers={"X-Olik-Text": safe_text},
    )


# ---------------------------------------------------------------------------
# Red-light / speed cameras
# ---------------------------------------------------------------------------

# Known Miami-Dade County red-light camera intersections (public record)
_MDC_CAMERAS = [
    # ── Calle Ocho / SW 8th St corridor ──────────────────────────────────────
    {"id":"cam001","lat":25.7617,"lon":-80.1848,"name":"SW 8th St & Brickell Ave","type":"red_light"},
    {"id":"cam002","lat":25.7617,"lon":-80.1975,"name":"SW 8th St & SW 12th Ave","type":"red_light"},
    {"id":"cam003","lat":25.7617,"lon":-80.2271,"name":"SW 8th St & SW 37th Ave (Douglas Rd)","type":"red_light"},
    {"id":"cam004","lat":25.7617,"lon":-80.2614,"name":"SW 8th St & SW 67th Ave","type":"red_light"},
    {"id":"cam005","lat":25.7484,"lon":-80.2614,"name":"SW 8th St & SW 57th Ave","type":"red_light"},
    {"id":"cam006","lat":25.7617,"lon":-80.3137,"name":"SW 8th St & SW 87th Ave","type":"red_light"},
    {"id":"cam007","lat":25.7617,"lon":-80.3412,"name":"SW 8th St & SW 97th Ave","type":"red_light"},
    {"id":"cam008","lat":25.7564,"lon":-80.3754,"name":"SW 8th St & SW 107th Ave","type":"red_light"},
    # ── Biscayne Blvd / US-1 corridor ────────────────────────────────────────
    {"id":"cam009","lat":25.7639,"lon":-80.1918,"name":"Biscayne Blvd & NE 36th St","type":"red_light"},
    {"id":"cam010","lat":25.7747,"lon":-80.1848,"name":"Biscayne Blvd & NE 79th St","type":"red_light"},
    {"id":"cam011","lat":25.8010,"lon":-80.1720,"name":"Biscayne Blvd & NE 119th St","type":"red_light"},
    {"id":"cam012","lat":25.8310,"lon":-80.1650,"name":"Biscayne Blvd & NE 163rd St","type":"red_light"},
    {"id":"cam013","lat":25.8500,"lon":-80.1570,"name":"Biscayne Blvd & NE 185th St","type":"red_light"},
    # ── NW 27th Ave corridor ──────────────────────────────────────────────────
    {"id":"cam014","lat":25.7743,"lon":-80.1937,"name":"NW 27th Ave & NW 79th St","type":"red_light"},
    {"id":"cam015","lat":25.7748,"lon":-80.3412,"name":"NW 27th Ave & NW 103rd St","type":"red_light"},
    {"id":"cam016","lat":25.7900,"lon":-80.3200,"name":"NW 27th Ave & NW 119th St","type":"red_light"},
    {"id":"cam017","lat":25.8128,"lon":-80.2012,"name":"NW 27th Ave & NW 135th St","type":"red_light"},
    {"id":"cam018","lat":25.8216,"lon":-80.3127,"name":"NW 27th Ave & NW 151st St","type":"red_light"},
    # ── NW/SW 7th Ave corridor ────────────────────────────────────────────────
    {"id":"cam019","lat":25.7742,"lon":-80.2945,"name":"NW 7th Ave & NW 79th St","type":"red_light"},
    {"id":"cam020","lat":25.7832,"lon":-80.2143,"name":"NW 7th Ave & NW 95th St","type":"red_light"},
    {"id":"cam021","lat":25.7639,"lon":-80.1950,"name":"NW 7th Ave & NW 36th St","type":"red_light"},
    # ── SW/NW 57th Ave (Red Rd) ───────────────────────────────────────────────
    {"id":"cam022","lat":25.7270,"lon":-80.2614,"name":"SW 57th Ave & SW 72nd St (Sunset Dr)","type":"red_light"},
    {"id":"cam023","lat":25.7422,"lon":-80.2614,"name":"SW 57th Ave & SW 40th St (Bird Rd)","type":"red_light"},
    {"id":"cam024","lat":25.8450,"lon":-80.2614,"name":"NW 57th Ave & NW 167th St","type":"red_light"},
    # ── Flagler St / W Flagler ────────────────────────────────────────────────
    {"id":"cam025","lat":25.7741,"lon":-80.1938,"name":"W Flagler St & NW 27th Ave","type":"red_light"},
    {"id":"cam026","lat":25.7741,"lon":-80.2271,"name":"W Flagler St & SW 37th Ave","type":"red_light"},
    {"id":"cam027","lat":25.7741,"lon":-80.2614,"name":"W Flagler St & SW 67th Ave","type":"red_light"},
    # ── US-1 / S Dixie Hwy ───────────────────────────────────────────────────
    {"id":"cam028","lat":25.7070,"lon":-80.2720,"name":"US-1 & SW 88th St (Kendall Dr)","type":"red_light"},
    {"id":"cam029","lat":25.6951,"lon":-80.3127,"name":"US-1 & SW 104th St","type":"red_light"},
    {"id":"cam030","lat":25.6800,"lon":-80.3412,"name":"US-1 & SW 120th St","type":"red_light"},
    # ── Kendall Dr (SW 88th St) ───────────────────────────────────────────────
    {"id":"cam031","lat":25.7070,"lon":-80.2271,"name":"Kendall Dr & SW 37th Ave","type":"red_light"},
    {"id":"cam032","lat":25.7070,"lon":-80.2614,"name":"Kendall Dr & SW 67th Ave","type":"red_light"},
    {"id":"cam033","lat":25.7070,"lon":-80.3137,"name":"Kendall Dr & SW 87th Ave","type":"red_light"},
    {"id":"cam034","lat":25.7070,"lon":-80.3412,"name":"Kendall Dr & SW 97th Ave","type":"red_light"},
    {"id":"cam035","lat":25.7070,"lon":-80.3754,"name":"Kendall Dr & SW 107th Ave","type":"red_light"},
    # ── Bird Rd (SW 40th St) ──────────────────────────────────────────────────
    {"id":"cam036","lat":25.7422,"lon":-80.2271,"name":"Bird Rd & SW 37th Ave (Douglas Rd)","type":"red_light"},
    {"id":"cam037","lat":25.7422,"lon":-80.2945,"name":"Bird Rd & SW 82nd Ave","type":"red_light"},
    {"id":"cam038","lat":25.7422,"lon":-80.3412,"name":"Bird Rd & SW 97th Ave","type":"red_light"},
    # ── 836 / Dolphin Expressway ramps ───────────────────────────────────────
    {"id":"cam039","lat":25.7750,"lon":-80.2614,"name":"836 & NW 67th Ave","type":"speed"},
    {"id":"cam040","lat":25.7750,"lon":-80.3137,"name":"836 & NW 87th Ave","type":"speed"},
    # ── I-95 speed enforcement ────────────────────────────────────────────────
    {"id":"cam041","lat":25.7980,"lon":-80.2050,"name":"I-95 NB @ NW 125th St","type":"speed"},
    {"id":"cam042","lat":25.8200,"lon":-80.1980,"name":"I-95 NB @ NW 151st St","type":"speed"},
    # ── Coral Gables / South Miami ────────────────────────────────────────────
    {"id":"cam043","lat":25.7220,"lon":-80.2680,"name":"S Dixie Hwy & Sunset Dr","type":"red_light"},
    {"id":"cam044","lat":25.7485,"lon":-80.2700,"name":"Miracle Mile & Douglas Rd","type":"red_light"},
    {"id":"cam045","lat":25.7325,"lon":-80.2800,"name":"Coral Way & Red Rd","type":"red_light"},
    # ── Miami Beach ───────────────────────────────────────────────────────────
    {"id":"cam046","lat":25.7685,"lon":-80.1305,"name":"5th St & Washington Ave (SoBe)","type":"red_light"},
    {"id":"cam047","lat":25.7915,"lon":-80.1403,"name":"Alton Rd & 17th St","type":"red_light"},
    {"id":"cam048","lat":25.8130,"lon":-80.1220,"name":"Arthur Godfrey Rd & Collins Ave","type":"red_light"},
    # ── Hialeah ──────────────────────────────────────────────────────────────
    {"id":"cam049","lat":25.8576,"lon":-80.2781,"name":"E 4th Ave & W 49th St (Hialeah)","type":"red_light"},
    {"id":"cam050","lat":25.8624,"lon":-80.2950,"name":"W 29th St & W 4th Ave (Hialeah)","type":"red_light"},
    {"id":"cam051","lat":25.8451,"lon":-80.2881,"name":"Palm Ave & E 8th Ave (Hialeah)","type":"red_light"},
    # ── Homestead / South Dade ────────────────────────────────────────────────
    {"id":"cam052","lat":25.4687,"lon":-80.4776,"name":"Krome Ave & SW 312th St (Homestead)","type":"red_light"},
    {"id":"cam053","lat":25.4773,"lon":-80.4564,"name":"N Homestead Blvd & NW 7th Ave","type":"red_light"},
    # ── Aventura / North Dade ─────────────────────────────────────────────────
    {"id":"cam054","lat":25.9565,"lon":-80.1389,"name":"Biscayne Blvd & NE 211th St (Aventura)","type":"red_light"},
    {"id":"cam055","lat":25.9500,"lon":-80.1450,"name":"Ives Dairy Rd & Biscayne Blvd","type":"red_light"},
    # ── Airport area ─────────────────────────────────────────────────────────
    {"id":"cam056","lat":25.7959,"lon":-80.2870,"name":"NW 36th St & NW 72nd Ave (MIA area)","type":"red_light"},
    {"id":"cam057","lat":25.8000,"lon":-80.3000,"name":"Le Jeune Rd & NW 36th St","type":"red_light"},
    {"id":"cam058","lat":25.7900,"lon":-80.2780,"name":"NW 42nd Ave & NW 36th St","type":"red_light"},
    # ── Doral ─────────────────────────────────────────────────────────────────
    {"id":"cam059","lat":25.8193,"lon":-80.3540,"name":"NW 87th Ave & NW 41st St (Doral)","type":"red_light"},
    {"id":"cam060","lat":25.8142,"lon":-80.3654,"name":"NW 97th Ave & NW 36th St (Doral)","type":"red_light"},
]


TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY", "")

_INCIDENT_TYPES = {
    0:  {"label": "Unknown",            "color": "#888888"},
    1:  {"label": "Accident",           "color": "#ff2244"},
    2:  {"label": "Fog",                "color": "#aaaaaa"},
    3:  {"label": "Dangerous Cond.",    "color": "#ff6600"},
    4:  {"label": "Rain",               "color": "#4499ff"},
    5:  {"label": "Ice",                "color": "#00ccff"},
    6:  {"label": "Traffic Jam",        "color": "#ff8800"},
    7:  {"label": "Lane Closed",        "color": "#ffaa00"},
    8:  {"label": "Road Closed",        "color": "#ff2244"},
    9:  {"label": "Road Works",         "color": "#ffcc00"},
    10: {"label": "High Winds",         "color": "#aaaaff"},
    11: {"label": "Flooding",           "color": "#0066ff"},
    12: {"label": "Detour",             "color": "#aa44ff"},
    13: {"label": "Incident Cluster",   "color": "#ff4400"},
    14: {"label": "Broken Down Vehicle","color": "#ff8800"},
}


@app.get("/incidents")
async def get_incidents(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(10.0),
):
    if not TOMTOM_API_KEY:
        return {"incidents": [], "source": "tomtom_unavailable"}

    delta_lat = radius_km / 111.0
    delta_lon = radius_km / (111.0 * math.cos(math.radians(lat)))
    bbox = f"{lon-delta_lon:.5f},{lat-delta_lat:.5f},{lon+delta_lon:.5f},{lat+delta_lat:.5f}"
    fields = ("{incidents{type,geometry{type,coordinates},"
              "properties{iconCategory,magnitudeOfDelay,"
              "events{description,iconCategory},from,to,roadNumbers}}}")

    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8)) as session:
            async with session.get(
                "https://api.tomtom.com/traffic/services/5/incidentDetails",
                params={"key": TOMTOM_API_KEY, "bbox": bbox,
                        "fields": fields, "language": "en-GB",
                        "timeValidityFilter": "present"},
                headers={"User-Agent": "OlikRadar/1.0"},
            ) as resp:
                if resp.status != 200:
                    return {"incidents": [], "error": resp.status}
                data = await resp.json(content_type=None)
    except Exception as e:
        print(f"[TomTom] Error: {e}")
        return {"incidents": [], "error": str(e)}

    out = []
    for feat in data.get("incidents", []):
        props = feat.get("properties", {})
        geom  = feat.get("geometry", {})
        coords = geom.get("coordinates", [])
        if geom.get("type") == "Point":
            inc_lon, inc_lat = coords[0], coords[1]
        elif geom.get("type") == "LineString" and coords:
            inc_lon, inc_lat = coords[0][0], coords[0][1]
        else:
            continue

        icon_cat = props.get("iconCategory", 0)
        events   = props.get("events", [])
        desc     = events[0]["description"] if events else _INCIDENT_TYPES.get(icon_cat, {}).get("label", "Incident")
        road     = (props.get("roadNumbers") or [""])[0]
        loc_str  = " — ".join(filter(None, [road, props.get("from", ""), props.get("to", "")]))

        out.append({
            "lat":         inc_lat,
            "lon":         inc_lon,
            "type":        _INCIDENT_TYPES.get(icon_cat, {}).get("label", "Incident"),
            "color":       _INCIDENT_TYPES.get(icon_cat, {}).get("color", "#888888"),
            "icon_category": icon_cat,
            "magnitude":   props.get("magnitudeOfDelay", 0),
            "description": desc,
            "location":    loc_str,
            "distance_km": round(haversine_km(lat, lon, inc_lat, inc_lon), 2),
        })

    out.sort(key=lambda x: x["distance_km"])
    return {"incidents": out, "source": "tomtom", "count": len(out)}


@app.get("/cameras")
async def get_cameras(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(15.0),
):
    results = []
    for cam in _MDC_CAMERAS:
        d = haversine_km(lat, lon, cam["lat"], cam["lon"])
        if d <= radius_km:
            results.append({**cam, "distance_km": round(d, 2)})

    # Also query OpenStreetMap for any cameras not in our hardcoded list
    try:
        overpass_q = (
            f"[out:json][timeout:8];"
            f"node[\"highway\"=\"speed_camera\"](around:{int(radius_km*1000)},{lat},{lon});"
            f"out;"
        )
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
            async with session.get(
                "https://overpass-api.de/api/interpreter",
                params={"data": overpass_q},
                headers={"User-Agent": "OlikRadar/1.0"},
            ) as resp:
                if resp.status == 200:
                    osm = await resp.json(content_type=None)
                    known_ids = {c["id"] for c in results}
                    for node in osm.get("elements", []):
                        osm_id = f"osm-{node['id']}"
                        if osm_id not in known_ids:
                            tags = node.get("tags", {})
                            cam_name = tags.get("name") or tags.get("description") or tags.get("ref")
                            # Skip unnamed OSM nodes — likely misplaced or in water
                            if not cam_name:
                                continue
                            results.append({
                                "id":          osm_id,
                                "lat":         node["lat"],
                                "lon":         node["lon"],
                                "name":        cam_name,
                                "type":        "speed",
                                "distance_km": round(haversine_km(lat, lon, node["lat"], node["lon"]), 2),
                            })
    except Exception as e:
        print(f"OSM cameras error: {e}")

    results.sort(key=lambda c: c["distance_km"])
    return results


# ---------------------------------------------------------------------------
# User reports (police, accident, hazard — expire after 60 min)
# ---------------------------------------------------------------------------

_user_reports: list = []
_REPORT_TTL_SEC = 3600  # 1 hour


def _prune_reports():
    cutoff = time.time() - _REPORT_TTL_SEC
    _user_reports[:] = [r for r in _user_reports if r["_ts"] > cutoff]


@app.post("/report")
async def post_report(
    type: str  = Form(...),   # "police" | "accident" | "hazard" | "camera"
    lat:  float = Form(...),
    lon:  float = Form(...),
    note: str   = Form(""),
):
    _prune_reports()
    allowed = {"police", "accident", "hazard", "camera"}
    if type not in allowed:
        raise HTTPException(status_code=400, detail=f"type must be one of {allowed}")
    labels = {"police": "Police Spotted", "accident": "Accident", "hazard": "Road Hazard", "camera": "Speed Camera"}
    report = {
        "id":          f"RPT-{int(time.time()*1000)}",
        "lat":         round(lat, 6),
        "lon":         round(lon, 6),
        "type":        type,
        "call_type":   labels[type],
        "note":        note[:120],
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "source":      "user-report",
        "_ts":         time.time(),
    }
    _user_reports.insert(0, report)
    _user_reports[:] = _user_reports[:200]
    return {"ok": True, "id": report["id"]}


@app.get("/reports")
async def get_reports(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(15.0),
):
    _prune_reports()
    results = []
    for r in _user_reports:
        d = haversine_km(lat, lon, r["lat"], r["lon"])
        if d <= radius_km:
            results.append({k: v for k, v in r.items() if k != "_ts"} | {"distance_km": round(d, 2)})
    results.sort(key=lambda r: r["distance_km"])
    return results


# ---------------------------------------------------------------------------
# Scanner channels (audio streams for in-browser listening)
# ---------------------------------------------------------------------------

_SCANNER_CHANNELS = [
    {
        "id": "mdpd",
        "name": "Miami-Dade Police",
        "agency": "Miami-Dade PD",
        "description": "Miami-Dade County Police Department dispatch",
        "stream_url": "https://broadcastify.cdnstream1.com/30513",
        "feed_id": "30513",
    },
    {
        "id": "mbpd",
        "name": "Miami Beach Police",
        "agency": "Miami Beach PD",
        "description": "Miami Beach Police Department",
        "stream_url": "https://broadcastify.cdnstream1.com/14100",
        "feed_id": "14100",
    },
    {
        "id": "fhp_miami",
        "name": "FHP Miami District",
        "agency": "Florida Highway Patrol",
        "description": "Florida Highway Patrol — Miami District",
        "stream_url": "https://broadcastify.cdnstream1.com/12063",
        "feed_id": "12063",
    },
    {
        "id": "coral_gables",
        "name": "Coral Gables PD",
        "agency": "CGPD",
        "description": "Coral Gables Police Department",
        "stream_url": "https://broadcastify.cdnstream1.com/6380",
        "feed_id": "6380",
    },
]


@app.get("/channels")
async def get_channels():
    return _SCANNER_CHANNELS


@app.get("/stream-proxy")
async def stream_proxy(url: str = Query(...)):
    allowed_hosts = ["broadcastify.cdnstream1.com", "audio.broadcastify.com",
                     "broadcastify.cdnstream.com", "openmhz.com"]
    from urllib.parse import urlparse
    host = urlparse(url).netloc
    if not any(h in host for h in allowed_hosts):
        raise HTTPException(status_code=403, detail="Stream host not allowed")

    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        "Icy-MetaData": "0",
        "Accept": "audio/mpeg, audio/*, */*",
    }

    async def generate():
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers,
                                   timeout=aiohttp.ClientTimeout(total=None, connect=10)) as resp:
                if resp.status != 200:
                    return
                async for chunk in resp.content.iter_chunked(8192):
                    yield chunk

    return StreamingResponse(
        generate(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Background scanner — auto-fetches Broadcastify Miami-Dade Police every 90s
# ---------------------------------------------------------------------------

_AUTO_SCANNER_URL = "https://broadcastify.cdnstream1.com/30513"
_AUTO_SCANNER_LAT = 25.7617
_AUTO_SCANNER_LON = -80.1918


async def _auto_scanner_loop():
    """Fetch 30s of scanner audio every 90s, transcribe, geocode, store events."""
    if not openai_client:
        print("⚠️  No OpenAI key — auto-scanner disabled")
        return
    await asyncio.sleep(15)  # let server warm up
    print("✅ Auto-scanner started (Miami-Dade Police)")
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        "Icy-MetaData": "0",
        "Accept": "audio/mpeg, audio/*, */*",
    }
    while True:
        try:
            chunks: list[bytes] = []
            timeout = aiohttp.ClientTimeout(total=None, connect=10, sock_read=35)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(_AUTO_SCANNER_URL, headers=headers) as resp:
                    if resp.status != 200:
                        await asyncio.sleep(60)
                        continue
                    deadline = asyncio.get_event_loop().time() + 30
                    async for chunk in resp.content.iter_chunked(4096):
                        chunks.append(chunk)
                        if asyncio.get_event_loop().time() >= deadline:
                            break

            audio_bytes = b"".join(chunks)
            if len(audio_bytes) < 8000:
                await asyncio.sleep(30)
                continue

            buf = io.BytesIO(audio_bytes)
            buf.name = "scanner.mp3"
            result = await openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=buf,
                language="en",
                prompt="Police scanner dispatch Miami-Dade. Street address, unit, call code.",
            )
            transcript = result.text.strip()
            if transcript and len(transcript) > 8:
                print(f"[AutoScanner] {transcript[:120]}")
                incidents = await _parse_transcript(transcript)
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8)) as session:
                    for inc in incidents:
                        address = inc.get("location", "")
                        if not address:
                            continue
                        coords = await _geocode_address(session, address,
                                                        _AUTO_SCANNER_LAT, _AUTO_SCANNER_LON)
                        if not coords:
                            continue
                        inc_lat, inc_lon = coords
                        d_km = haversine_km(_AUTO_SCANNER_LAT, _AUTO_SCANNER_LON, inc_lat, inc_lon)
                        call_type = inc.get("call_type", "Incident")
                        ev = {
                            "id":          f"AUTO-{int(time.time() * 1000)}",
                            "lat":         round(inc_lat, 6),
                            "lon":         round(inc_lon, 6),
                            "call_type":   call_type,
                            "priority":    _priority_from_call_type(call_type),
                            "summary":     inc.get("summary") or transcript[:80],
                            "transcript":  transcript[:300],
                            "units":       inc.get("units", ""),
                            "timestamp":   datetime.now(timezone.utc).isoformat(),
                            "distance_km": round(d_km, 2),
                            "source":      "MDPD Scanner",
                        }
                        _live_events.insert(0, ev)
                        print(f"[AutoScanner] Event: {call_type} @ {address}")
                _live_events[:] = _live_events[:100]

        except Exception as e:
            print(f"[AutoScanner] Error: {e}")

        await asyncio.sleep(90)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    if SPOTCRIME_KEY:
        print("✅ SpotCrime API configured — real police incidents active")
    else:
        print("⚠️  SPOTCRIME_KEY not set — get a free key at spotcrime.com/user/api")
    asyncio.create_task(_auto_scanner_loop())


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "pipeline": "auto-scanner+spotcrime",
        "auto_scanner": bool(OPENAI_API_KEY),
        "live_events": len(_live_events),
        "spotcrime": bool(SPOTCRIME_KEY),
        "tts": bool(OPENAI_API_KEY),
    }
