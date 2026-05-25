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
OPENMHZ_SYSTEM   = os.getenv("OPENMHZ_SYSTEM", "miamidade")

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
# OpenMHZ — real police scanner calls with Whisper transcription
# ---------------------------------------------------------------------------
# OpenMHZ is a public scanner archive. We poll for recent calls, Whisper-
# transcribe the audio, extract addresses with GPT, then geocode with Mapbox.
# Talkgroup tags that indicate fire/EMS are skipped so we only show police.

_SKIP_TALKGROUP_TAGS = {
    "Fire Dispatch", "Fire Talk", "Fire-Tac", "Fire-Patch",
    "EMS Dispatch", "EMS Talk", "EMS-Tac", "EMS-Patch",
    "Hospital", "Public Works",
}

_live_events: list = []   # geocoded police incidents, newest first
_omz_running = False

_PARSE_SYSTEM = """You are a police scanner transcript parser for Miami-Dade County.
Extract incident data from raw scanner audio transcripts and return JSON.
Output format (array, can be empty if no real incidents found):
[{"call_type": "...", "location": "...", "summary": "...", "units": "..."}]
- call_type: short label e.g. "Traffic Stop", "Shooting", "Disturbance", "Pursuit"
- location: street address or intersection mentioned, exactly as heard (e.g. "NW 7th Ave and 36th St")
- summary: one sentence, under 15 words
- units: unit IDs mentioned (e.g. "Unit 42, K9-7")
If transcript is silence, noise, or chatter with no dispatchable incident, return [].
Only include entries with a clear location."""


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
            max_tokens=500,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content
        parsed = _json.loads(content)
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


def _is_police_talkgroup(call: dict) -> bool:
    tg = call.get("talkgroup") or {}
    if isinstance(tg, dict):
        tag = tg.get("tag", "")
    else:
        tag = ""
    if tag in _SKIP_TALKGROUP_TAGS:
        return False
    # Skip if talkgroup alpha name contains obvious fire/EMS words
    alpha = (tg.get("alpha", "") if isinstance(tg, dict) else "").lower()
    if any(w in alpha for w in ["fire", " ems", "rescue", "medic", "engine", "ladder", "truck"]):
        return False
    return True


async def _geocode_address(session: aiohttp.ClientSession, address: str, hint_lat: float = 25.76, hint_lon: float = -80.19) -> tuple[float, float] | None:
    if not MAPBOX_TOKEN or not address.strip():
        return None
    try:
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{quote(address)}.json"
        async with session.get(url, params={
            "access_token": MAPBOX_TOKEN,
            "proximity": f"{hint_lon},{hint_lat}",
            "bbox": "-81.0,25.0,-79.5,26.5",  # greater Miami-Dade area
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


async def _openmhz_loop():
    global _live_events, _omz_running
    _omz_running = True
    seen_ids: set = set()
    POLL_INTERVAL = 45  # seconds between polls

    while True:
        await asyncio.sleep(POLL_INTERVAL)
        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=20),
                headers={"User-Agent": "Mozilla/5.0"}
            ) as session:
                # Fetch recent calls (last 5 minutes)
                url = f"https://api.openmhz.com/{OPENMHZ_SYSTEM}/calls"
                params = {"time": int(time.time() - 300)}
                async with session.get(url, params=params) as resp:
                    if resp.status != 200:
                        print(f"OpenMHZ fetch HTTP {resp.status}")
                        continue
                    data = await resp.json(content_type=None)

                calls = data.get("calls", [])
                new_calls = [c for c in calls if c.get("_id") not in seen_ids]
                print(f"[OpenMHZ] {len(new_calls)} new calls of {len(calls)} fetched")

                for call in new_calls:
                    call_id = call.get("_id") or str(call.get("startTime", time.time()))
                    seen_ids.add(call_id)

                    if not _is_police_talkgroup(call):
                        continue

                    # Use pre-existing transcript if OpenMHZ already transcribed it
                    transcript_obj = call.get("transcript") or {}
                    transcript = transcript_obj.get("text", "") if isinstance(transcript_obj, dict) else ""

                    if not transcript and OPENAI_API_KEY:
                        # Download audio and Whisper-transcribe
                        audio_url = call.get("filename") or call.get("url", "")
                        if not audio_url:
                            continue
                        if not audio_url.startswith("http"):
                            audio_url = "https://api.openmhz.com" + audio_url
                        try:
                            async with session.get(audio_url) as ar:
                                if ar.status != 200:
                                    continue
                                audio_bytes = await ar.read()
                            if len(audio_bytes) < 500:
                                continue
                            audio_file = io.BytesIO(audio_bytes)
                            audio_file.name = "call.m4a"
                            result = await openai_client.audio.transcriptions.create(
                                model="whisper-1",
                                file=audio_file,
                                language="en",
                                prompt="Police dispatch Miami-Dade. Street address, unit number, call code.",
                            )
                            transcript = result.text.strip()
                            print(f"[Whisper] {transcript[:100]}")
                        except Exception as e:
                            print(f"Whisper error for {call_id}: {e}")
                            continue

                    if not transcript or len(transcript) < 5:
                        continue

                    incidents = await _parse_transcript(transcript)
                    tg = call.get("talkgroup") or {}
                    tg_name = (tg.get("alpha") or tg.get("description") or "Dispatch") if isinstance(tg, dict) else "Dispatch"

                    for inc in incidents:
                        address = inc.get("location", "")
                        coords = await _geocode_address(session, address)
                        if coords is None:
                            continue
                        lat, lon = coords

                        call_type = inc.get("call_type") or tg_name
                        entry = {
                            "id":         f"OMZ-{call_id}",
                            "lat":        round(lat, 6),
                            "lon":        round(lon, 6),
                            "call_type":  call_type,
                            "priority":   _priority_from_call_type(call_type),
                            "summary":    inc.get("summary") or transcript[:80],
                            "transcript": transcript[:300],
                            "units":      inc.get("units", ""),
                            "timestamp":  call.get("startTime") or datetime.now(timezone.utc).isoformat(),
                            "source":     f"OpenMHZ/{OPENMHZ_SYSTEM}",
                        }
                        _live_events.insert(0, entry)
                        print(f"[Event] {call_type} @ {address}")

        except Exception as e:
            print(f"OpenMHZ loop error: {e}")

        # Cap stored events and seen_ids to prevent unbounded growth
        _live_events = _live_events[:100]
        if len(seen_ids) > 2000:
            seen_ids = set(list(seen_ids)[-1000:])


# ---------------------------------------------------------------------------
# /events
# ---------------------------------------------------------------------------

@app.get("/events")
async def get_events(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(10.0),
):
    # 1. Return live geocoded police events from the OpenMHZ/Whisper pipeline
    if _live_events:
        results = []
        for ev in _live_events:
            d = haversine_km(lat, lon, ev["lat"], ev["lon"])
            if d <= radius_km:
                results.append({**ev, "distance_km": round(d, 2)})
        if results:
            results.sort(key=lambda e: e["distance_km"])
            return results

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
# /live-transcripts — expose raw pipeline state for debugging
# ---------------------------------------------------------------------------

@app.get("/live-transcripts")
async def get_live_transcripts():
    return {
        "events": _live_events,
        "running": _omz_running,
        "source": f"OpenMHZ/{OPENMHZ_SYSTEM}",
        "count": len(_live_events),
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    if OPENAI_API_KEY and MAPBOX_TOKEN:
        asyncio.create_task(_openmhz_loop())
        print(f"✅ OpenMHZ police scanner pipeline started (system: {OPENMHZ_SYSTEM})")
    elif not OPENAI_API_KEY:
        print("⚠️  OPENAI_API_KEY not set — scanner transcription disabled, using mock data")
    elif not MAPBOX_TOKEN:
        print("⚠️  MAPBOX_TOKEN not set — geocoding disabled, scanner pipeline disabled")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "pipeline": "openmhz+whisper",
        "openmhz_system": OPENMHZ_SYSTEM,
        "live_events": len(_live_events),
        "transcription": bool(OPENAI_API_KEY),
        "geocoding": bool(MAPBOX_TOKEN),
    }
