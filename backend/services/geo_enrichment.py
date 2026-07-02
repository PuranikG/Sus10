"""
geo_enrichment.py

Enriches a building survey with three data points fetched in parallel
when lat/lng is available:

  1. Google Solar API  — rooftop solar potential (panels, kWp, sunshine hours)
  2. Google Air Quality API — current AQI + dominant pollutant, timestamped
  3. Street View static image URL — facade photo for proposals

All three are fire-and-forget from the caller's perspective: failures are
logged and return None rather than crashing the building-save flow.
"""

import os
import logging
import asyncio
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

# ── 1. Solar API ──────────────────────────────────────────────────────────────

async def fetch_solar(lat: float, lng: float) -> dict | None:
    """
    Call Google Solar API buildingInsights for a lat/lng.
    Returns a compact dict with the fields we store; None on any failure.
    """
    if not GOOGLE_API_KEY or not lat or not lng:
        return None
    url = (
        "https://solar.googleapis.com/v1/buildingInsights:findClosest"
        f"?location.latitude={lat}&location.longitude={lng}"
        f"&requiredQuality=LOW&key={GOOGLE_API_KEY}"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            if r.status_code != 200:
                logger.warning(f"Solar API {r.status_code}: {r.text[:200]}")
                return None
            data = r.json()
            sp = data.get("solarPotential", {})
            max_panels = sp.get("maxArrayPanelsCount", 0)
            panel_watt = 400  # standard panel wattage assumption
            kwp = round((max_panels * panel_watt) / 1000, 2) if max_panels else None
            area_m2 = sp.get("maxArrayAreaMeters2")
            sunshine_hrs = sp.get("maxSunshineHoursPerYear")
            return {
                "source": "google_solar_api",
                "max_panels": max_panels,
                "max_kwp": kwp,
                "max_area_sqft": round(area_m2 * 10.764, 0) if area_m2 else None,
                "sunshine_hours_per_year": round(sunshine_hrs, 0) if sunshine_hrs else None,
                "annual_kwh_estimate": round(kwp * sunshine_hrs, 0) if (kwp and sunshine_hrs) else None,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
    except Exception as e:
        logger.warning(f"Solar API error: {e}")
        return None


# ── 2. Air Quality API ────────────────────────────────────────────────────────

AQI_CATEGORY_MAP = {
    1: "Good", 2: "Moderate", 3: "Unhealthy for Sensitive Groups",
    4: "Unhealthy", 5: "Very Unhealthy", 6: "Hazardous",
}

async def fetch_aqi(lat: float, lng: float) -> dict | None:
    """
    Call Google Air Quality currentConditions for a lat/lng.
    Returns a compact dict with AQI value, category, dominant pollutant.
    """
    if not GOOGLE_API_KEY or not lat or not lng:
        return None
    url = f"https://airquality.googleapis.com/v1/currentConditions:lookup?key={GOOGLE_API_KEY}"
    body = {
        "location": {"latitude": lat, "longitude": lng},
        "universalAqi": True,
        "extraComputations": ["DOMINANT_POLLUTANT_CONCENTRATION"],
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=body)
            if r.status_code != 200:
                logger.warning(f"AQI API {r.status_code}: {r.text[:200]}")
                return None
            data = r.json()
            indexes = data.get("indexes", [])
            uaqi = next((i for i in indexes if i.get("code") == "uaqi"), None)
            if not uaqi:
                uaqi = indexes[0] if indexes else {}
            pollutants = data.get("pollutants", [])
            dominant = next(
                (p for p in pollutants if p.get("code") in ("pm25", "pm10", "o3", "no2")),
                pollutants[0] if pollutants else {}
            )
            return {
                "source": "google_air_quality_api",
                "aqi": uaqi.get("aqi"),
                "category": uaqi.get("category") or AQI_CATEGORY_MAP.get(uaqi.get("aqiDisplay", {}).get("value", 0)),
                "dominant_pollutant": dominant.get("displayName") or dominant.get("code"),
                "dominant_pollutant_value": (
                    dominant.get("concentration", {}).get("value")
                    if dominant else None
                ),
                "dominant_pollutant_unit": (
                    dominant.get("concentration", {}).get("units")
                    if dominant else None
                ),
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
    except Exception as e:
        logger.warning(f"AQI API error: {e}")
        return None


# ── 3. Street View ────────────────────────────────────────────────────────────

async def fetch_street_view(lat: float, lng: float) -> dict | None:
    """
    Build Street View static image URLs for the building.
    Verifies at least one angle returns a real image (status 200, not a gray placeholder).
    Returns URLs for front (heading 0) and three additional angles.
    """
    if not GOOGLE_API_KEY or not lat or not lng:
        return None
    base = "https://maps.googleapis.com/maps/api/streetview"
    params_base = f"size=640x400&location={lat},{lng}&fov=90&pitch=5&key={GOOGLE_API_KEY}"
    headings = [0, 90, 180, 270]
    urls = {
        f"h{h}": f"{base}?{params_base}&heading={h}" for h in headings
    }
    # Verify at least the primary angle has imagery via metadata endpoint
    meta_url = (
        f"{base}/metadata?location={lat},{lng}&key={GOOGLE_API_KEY}"
    )
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            meta = await client.get(meta_url)
            if meta.status_code == 200:
                meta_data = meta.json()
                status = meta_data.get("status", "ZERO_RESULTS")
                if status != "OK":
                    logger.info(f"Street View no coverage at {lat},{lng}: {status}")
                    return None
                return {
                    "available": True,
                    "primary_url": urls["h0"],
                    "angles": urls,
                    "pano_id": meta_data.get("pano_id"),
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                }
    except Exception as e:
        logger.warning(f"Street View metadata error: {e}")
    return None


# ── Combined enrichment call ──────────────────────────────────────────────────

async def enrich_building(lat: float | None, lng: float | None) -> dict:
    """
    Fetch Solar, AQI, and Street View in parallel.
    Returns a dict with keys solar / aqi / street_view — each None if unavailable.
    Safe to call with None lat/lng (returns all-None dict immediately).
    """
    if not lat or not lng:
        return {"solar": None, "aqi": None, "street_view": None}

    solar, aqi, sv = await asyncio.gather(
        fetch_solar(lat, lng),
        fetch_aqi(lat, lng),
        fetch_street_view(lat, lng),
        return_exceptions=True,
    )

    def _safe(v):
        return None if isinstance(v, Exception) else v

    return {
        "solar": _safe(solar),
        "aqi": _safe(aqi),
        "street_view": _safe(sv),
    }
