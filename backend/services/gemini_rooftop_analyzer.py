"""
Gemini Rooftop Analyzer
========================
Uses Gemini 2.5 Flash (vision) to analyze a rooftop satellite image and extract:
- Obstructions (water tanks, AC units, vent stacks)
- Existing solar panels / vegetation
- Estimated usable area %
- Recommended solar/garden zones
- Shadow patterns

Image source: Google Static Maps API (cheap, reliable, already have the key)
Cost: ~$0.002 per analysis (gemini-2.5-flash vision)
"""

import os
import io
import math
import json
import base64
import logging
from typing import Dict, Any, Optional
import httpx
from PIL import Image
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"
GOOGLE_STATIC_MAPS_URL = "https://maps.googleapis.com/maps/api/staticmap"


def _build_system_prompt() -> str:
    return (
        "You are a rooftop sustainability assessor analyzing a satellite/aerial image of a building's roof. "
        "Your job is to identify visual features ONLY VISIBLE in the image. Be honest and conservative — if "
        "something is not clearly visible, mark it as 'unknown'. Never invent details. "
        "Always respond with VALID JSON matching the schema. No prose outside JSON. No markdown fences."
    )


def _build_analysis_prompt(building_name: str, footprint_sqm: float, city: str) -> str:
    return f"""You are looking at a top-down satellite/aerial image (zoom 19, ~0.3 m/pixel) of an urban area.

**THE TARGET BUILDING IS LOCATED AT THE GEOMETRIC CENTER OF THE IMAGE.** Focus your analysis on the structure(s) at the image center. The surrounding buildings are context only.

Target Building: {building_name}
Approximate footprint area: {footprint_sqm:.0f} m²
City: {city}

Examine the CENTER building's rooftop carefully. Return ONLY this JSON (no markdown, no explanation):
{{
  "rooftop_visible": true|false,
  "rooftop_type": "flat" | "sloped" | "mixed" | "unknown",
  "estimated_obstruction_percentage": 0-100,
  "obstructions_visible": {{
    "water_tanks": true|false,
    "ac_units_or_chillers": true|false,
    "vent_stacks_or_pipes": true|false,
    "existing_solar_panels": true|false,
    "antennas_or_dishes": true|false,
    "stairwell_or_lift_room": true|false
  }},
  "existing_vegetation": {{
    "present": true|false,
    "approximate_coverage_percentage": 0-100,
    "type": "tree_canopy" | "container_garden" | "moss_or_weeds" | "none" | "unknown"
  }},
  "shadow_analysis": {{
    "significant_shadows_present": true|false,
    "shadow_source": "adjacent_taller_building" | "trees" | "self_shadow" | "none" | "unknown",
    "shaded_area_percentage_estimated": 0-100
  }},
  "usable_for_solar_pct": 0-100,
  "usable_for_plantation_pct": 0-100,
  "recommended_zones": {{
    "solar_zone": "north_half" | "south_half" | "east_half" | "west_half" | "center" | "perimeter" | "spread_across" | "unknown",
    "plantation_zone": "edges" | "north_half" | "south_half" | "center" | "unknown",
    "biogas_unit_placement": "corner" | "ground_floor_adjacent" | "rooftop_corner" | "unknown"
  }},
  "data_quality_notes": "1-2 sentence honest assessment — what is clear, what was hard to determine, but DO assess the center building",
  "confidence_score": 0.0-1.0
}}

Rules:
- The image IS a valid aerial of an Indian urban setting. Treat the building at the image center as your subject — do NOT refuse to analyze.
- "rooftop_visible": true if any rooftop is visible near image center (almost always true for valid aerials).
- "usable_for_solar_pct" should be (100 - obstructions% - shadow%), capped at 75% for typical Indian commercial roofs.
- "usable_for_plantation_pct" typically 30-60% on commercial roofs after subtracting obstructions.
- Be CONSERVATIVE but not zero. If you see a roof, estimate. Only use 'unknown' for fine-grained details you genuinely cannot see.
- Aim for confidence_score 0.5-0.9 for valid aerials. 0.0 is reserved for completely useless images (clouds, all-white).
"""


async def fetch_satellite_image_base64(
    lat: float, lng: float, zoom: int = 19, size: str = "640x640"
) -> Optional[str]:
    """
    Fetch a satellite image as base64.
    Strategy:
      1) Try Google Static Maps (if Static Maps API enabled)
      2) Fallback to Esri World Imagery exportImage REST API (free, no key needed)
    """
    # ---- Attempt 1: Google Static Maps ----
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if api_key:
        try:
            params = {
                "center": f"{lat},{lng}",
                "zoom": str(zoom),
                "size": size,
                "maptype": "satellite",
                "scale": "2",
                "key": api_key,
            }
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(GOOGLE_STATIC_MAPS_URL, params=params)
                if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("image/"):
                    logger.info("Satellite image fetched via Google Static Maps")
                    return base64.b64encode(resp.content).decode("ascii")
                else:
                    logger.warning(
                        f"Google Static Maps not available (status={resp.status_code}). "
                        "Falling back to Esri World Imagery."
                    )
        except Exception as e:
            logger.warning(f"Google Static Maps error, falling back: {e}")

    # ---- Attempt 2: Esri World Imagery — stitch XYZ tiles ----
    # Convert lat/lng to tile coordinates at zoom 19 (highest typical)
    z = 19
    lat_rad = math.radians(lat)
    n = 2.0 ** z
    x_tile_f = (lng + 180.0) / 360.0 * n
    y_tile_f = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    x_center = int(x_tile_f)
    y_center = int(y_tile_f)

    # Fetch a 3x3 grid of 256x256 tiles → 768x768 final image
    tile_size = 256
    grid = 3
    final = Image.new("RGB", (tile_size * grid, tile_size * grid))
    offset = grid // 2  # -1, 0, +1 for 3x3
    tiles_to_fetch = [
        (x_center + dx, y_center + dy, dx + offset, dy + offset)
        for dx in range(-offset, offset + 1)
        for dy in range(-offset, offset + 1)
    ]

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            for tile_x, tile_y, grid_x, grid_y in tiles_to_fetch:
                tile_url = (
                    f"https://server.arcgisonline.com/ArcGIS/rest/services/"
                    f"World_Imagery/MapServer/tile/{z}/{tile_y}/{tile_x}"
                )
                resp = await client.get(tile_url)
                if resp.status_code != 200:
                    logger.warning(f"Esri tile {z}/{tile_y}/{tile_x} failed: {resp.status_code}")
                    continue
                tile_img = Image.open(io.BytesIO(resp.content)).convert("RGB")
                final.paste(tile_img, (grid_x * tile_size, grid_y * tile_size))

        # Crop to center 400x400 to focus on the building (avoid edge tiles distracting Gemini)
        center_px = (tile_size * grid) // 2
        half = 200
        cropped = final.crop((center_px - half, center_px - half, center_px + half, center_px + half))

        buf = io.BytesIO()
        cropped.save(buf, format="JPEG", quality=85)
        logger.info(f"Satellite image stitched via Esri World Imagery (zoom={z})")
        return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception as e:
        logger.exception(f"Esri tile stitching failed: {e}")

    return None


async def analyze_rooftop(building: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze a building's rooftop using Gemini vision.

    Args:
        building: dict with latitude, longitude, name/address, building_footprint_area, city

    Returns:
        Structured rooftop analysis JSON + metadata
    """
    lat = building.get("latitude")
    lng = building.get("longitude")
    if lat is None or lng is None:
        return {"error": "Missing latitude/longitude", "success": False}

    name = building.get("name") or building.get("address") or "Unknown building"
    footprint = building.get("building_footprint_area") or building.get("usable_terrace_area") or 0
    city = building.get("city", "")

    # 1) Fetch satellite image
    image_b64 = await fetch_satellite_image_base64(lat, lng, zoom=19)
    if not image_b64:
        return {"error": "Could not fetch satellite image", "success": False}

    # 2) Send to Gemini
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return {"error": "EMERGENT_LLM_KEY not configured", "success": False}

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"rooftop-{building.get('building_id', 'unknown')}",
            system_message=_build_system_prompt(),
        ).with_model("gemini", GEMINI_MODEL)

        msg = UserMessage(
            text=_build_analysis_prompt(name, footprint, city),
            file_contents=[ImageContent(image_base64=image_b64)],
        )

        raw = await chat.send_message(msg)

        # Strip any accidental markdown fencing
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            # Remove ``` and optional language tag
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to extract a JSON object substring
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start >= 0 and end > start:
                parsed = json.loads(cleaned[start : end + 1])
            else:
                logger.warning(f"Gemini returned non-JSON: {cleaned[:300]}")
                return {
                    "success": False,
                    "error": "Gemini returned non-JSON response",
                    "raw_response": cleaned[:500],
                }

        return {
            "success": True,
            "model": GEMINI_MODEL,
            "building_id": building.get("building_id"),
            "building_name": name,
            "image_zoom": 19,
            "image_source": "Esri World Imagery (or Google Static Maps if available)",
            "analysis": parsed,
        }
    except Exception as e:
        logger.exception(f"Gemini analysis failed: {e}")
        return {"success": False, "error": str(e)}
