"""
JARVIS HUD — FastAPI Backend
Public safety awareness dashboard (lawful feeds only).
"""

import math
import os
import time
from datetime import datetime, timezone
from urllib.parse import quote

import aiohttp
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
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
# /events
# ---------------------------------------------------------------------------

@app.get("/events")
async def get_events(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(10.0),
):
    # 1. SpotCrime — real geocoded police incidents
    if SPOTCRIME_KEY:
        try:
            real = await fetch_spotcrime(lat, lon, radius_km)
            if real:
                return real
        except Exception as e:
            print(f"SpotCrime error: {e}")

    # 2. Fallback: mock data so the UI never goes empty
    events = _build_mock_events(lat, lon)
    results = []
    for ev in events:
        d = haversine_km(lat, lon, ev["lat"], ev["lon"])
        if d <= radius_km:
            results.append({**ev, "distance_km": round(d, 2), "source": "demo"})
    results.sort(key=lambda e: e["distance_km"])
    return results


# ---------------------------------------------------------------------------
# /route  — Mapbox Geocoding + Directions
# ---------------------------------------------------------------------------

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

    tts_response = await openai_client.audio.speech.create(
        model="tts-1",
        voice="onyx",
        input=jarvis_line,
        response_format="mp3",
    )
    audio_bytes = tts_response.content

    return StreamingResponse(
        iter([audio_bytes]),
        media_type="audio/mpeg",
        headers={"X-Olik-Text": jarvis_line},
    )


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
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    if SPOTCRIME_KEY:
        print("✅ SpotCrime API configured — real police incidents active")
    else:
        print("⚠️  SPOTCRIME_KEY not set — get a free key at spotcrime.com/user/api")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "pipeline": "spotcrime",
        "spotcrime": bool(SPOTCRIME_KEY),
        "tts": bool(OPENAI_API_KEY),
    }
