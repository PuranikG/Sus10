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
import asyncio
import logging
from typing import Dict, Any, Optional
import httpx
from PIL import Image
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"
GOOGLE_STATIC_MAPS_URL = "https://maps.googleapis.com/maps/api/staticmap"


def auto_zoom(footprint_sqft: float = 0, lat: float = 19.0) -> int:
    """
    Select the optimal satellite zoom level so the target building fills
    25–50% of the image frame.

    At Google Static Maps (640×640, scale=2) the image coverage in meters is:
        coverage_m = 640 × (40_075_017 / (2^Z × 256)) × cos(lat_rad)

    Zoom → coverage at lat=19° (Mumbai/Bengaluru):
        21 → ~45 m   |  20 → ~90 m  |  19 → ~180 m
        18 → ~360 m  |  17 → ~720 m |  16 → ~1,440 m

    A building with footprint F sqft has linear dimension ≈ sqrt(F/10.764) m.
    We want that dimension to be ~35% of image width → ideal coverage ≈ dim / 0.35.
    """
    if footprint_sqft <= 0:
        return 20  # zoom 20 ≈ 90 m coverage → one building wing fits; 19 was too wide (180 m shows neighbours)

    sqm = footprint_sqft / 10.764
    dim_m = sqm ** 0.5            # approximate building linear dimension
    ideal_coverage_m = dim_m / 0.35

    cos_lat = math.cos(math.radians(lat))
    earth_circ = 40_075_016.686

    for z in range(21, 15, -1):   # try from closest to furthest
        coverage_m = 640 * (earth_circ / (2 ** z * 256)) * cos_lat
        if coverage_m >= ideal_coverage_m:
            return z

    return 16   # fallback for very large complexes


def _build_system_prompt() -> str:
    return (
        "You are a rooftop sustainability assessor analyzing a satellite/aerial image of a building's roof. "
        "Your job is to identify visual features ONLY VISIBLE in the image. Be honest and conservative — if "
        "something is not clearly visible, mark it as 'unknown'. Never invent details. "
        "Always respond with VALID JSON matching the schema. No prose outside JSON. No markdown fences."
    )


def _build_analysis_prompt(building_name: str, footprint_sqm: float, city: str, zoom: int = 19) -> str:
    # Coverage at zoom Z for lat ~19° (Mumbai/Bengaluru)
    coverage_m = int(640 * (40_075_017 / (2 ** zoom * 256)) * math.cos(math.radians(19)))
    footprint_sqft = int(footprint_sqm * 10.764)
    return f"""You are looking at a top-down satellite/aerial image (zoom {zoom}, image covers ~{coverage_m}m × {coverage_m}m) of an urban area.

**THE TARGET BUILDING IS LOCATED AT THE GEOMETRIC CENTER OF THE IMAGE.** Focus your analysis on the structure(s) at the image center. The surrounding buildings are context only.

Target Building: {building_name}
Approximate rooftop footprint: {footprint_sqft:,} sq ft ({footprint_sqm:.0f} sqm)
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
  "detected_objects": [
    {{
      "label": "water_tank" | "ac_unit" | "vent_stack" | "solar_panel" | "antenna" | "stairwell" | "lift_room",
      "box_2d": [ymin, xmin, ymax, xmax],
      "confidence": 0.0-1.0
    }}
  ],
  "building_boundary_box": [ymin, xmin, ymax, xmax],
  "shadow_regions": [
    {{
      "box_2d": [ymin, xmin, ymax, xmax],
      "source": "adjacent_taller_building" | "trees" | "self_shadow" | "unknown"
    }}
  ],
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
  "data_quality_notes": "1-2 sentence honest assessment — what is clear, what was hard to determine",
  "confidence_score": 0.0-1.0
}}

CRITICAL — bounding box format:
- All bounding boxes use the format [ymin, xmin, ymax, xmax] in NORMALIZED 0-1000 scale (Gemini standard).
- Provide tight boxes around each detected object. Do NOT skip detected_objects — if you flagged it in obstructions_visible:true, include AT LEAST ONE entry per type in detected_objects.
- If you see TWO water tanks on the rooftop, return TWO entries with type "water_tank". Same for AC units, vent stacks, etc.
- "building_boundary_box" = tight box around the central building's rooftop perimeter as you see it.
- "shadow_regions" = boxes around clearly shadowed areas on the central building's rooftop only (not surrounding ground shadows).

IMPORTANT — be thorough on detected_objects:
- Look at the rooftop carefully and identify ALL clearly visible objects: round/square white things (water tanks), grey rectangular units (AC chillers), small pipes/stacks (vent stacks), dark glass-like rectangles (solar panels), small tall structures with door access (stairwell/lift room), thin protruding pole-like objects (antennas).
- A typical Indian commercial rooftop has 1-2 stairwells, 2-6 AC chillers, 1-3 water tanks, and a few vent stacks. AIM TO DETECT THEM ALL with separate boxes.
- Better to over-detect (with appropriate label) than under-detect.

Rules:
- Treat the building at the image center as your subject — do NOT refuse to analyze.
- "usable_for_solar_pct" should be (100 - obstructions% - shadow%), capped at 75% for typical Indian commercial roofs.
- "usable_for_plantation_pct" typically 30-60% on commercial roofs after subtracting obstructions.
- Be CONSERVATIVE. Aim for confidence_score 0.5-0.9 for valid aerials. 0.0 is reserved for completely useless images.
"""


async def fetch_satellite_image_base64(
    lat: float, lng: float, zoom: int = 19, size: str = "640x640"
) -> Optional[Dict[str, Any]]:
    """
    Fetch a satellite image and return projection metadata for downstream annotation.

    Returns a dict:
        {
          "image_b64": str,
          "source": "google_static_maps" | "esri_world_imagery",
          "zoom": int,
          "tile_x_center": int (only for esri),
          "tile_y_center": int (only for esri),
          "crop_offset": int (only for esri),
          "width": int, "height": int,
        }
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
                    return {
                        "image_b64": base64.b64encode(resp.content).decode("ascii"),
                        "source": "google_static_maps",
                        "zoom": zoom,
                        "width": 640, "height": 640,
                    }
                else:
                    logger.warning(
                        f"Google Static Maps not available (status={resp.status_code}). "
                        "Falling back to Esri World Imagery."
                    )
        except Exception as e:
            logger.warning(f"Google Static Maps error, falling back: {e}")

    # ---- Attempt 2: Esri World Imagery — stitch XYZ tiles ----
    z = zoom
    lat_rad = math.radians(lat)
    n = 2.0 ** z
    x_tile_f = (lng + 180.0) / 360.0 * n
    y_tile_f = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    x_center = int(x_tile_f)
    y_center = int(y_tile_f)

    tile_size = 256
    grid = 3
    final = Image.new("RGB", (tile_size * grid, tile_size * grid))
    offset = grid // 2
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

        crop_offset = (tile_size * grid - 400) // 2  # = 184 for 768→400 crop
        cropped = final.crop((crop_offset, crop_offset, crop_offset + 400, crop_offset + 400))

        buf = io.BytesIO()
        cropped.save(buf, format="JPEG", quality=88)
        logger.info(f"Satellite image stitched via Esri World Imagery (zoom={z})")
        return {
            "image_b64": base64.b64encode(buf.getvalue()).decode("ascii"),
            "source": "esri_world_imagery",
            "zoom": z,
            "tile_x_center": x_center,
            "tile_y_center": y_center,
            "crop_offset": crop_offset,
            "width": 400, "height": 400,
        }
    except Exception as e:
        logger.exception(f"Esri tile stitching failed: {e}")

    return None


async def analyze_rooftop(building: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze a building's rooftop using Gemini vision + produce an annotated overlay image.

    Returns dict containing:
      - success, model, building_id, building_name
      - image_source, image_zoom
      - analysis: structured JSON from Gemini
      - annotated_image_b64: data URI-ready base64 JPEG with overlays
      - raw_image_b64: the original (un-annotated) base64 JPEG
    """
    lat = building.get("latitude")
    lng = building.get("longitude")
    if lat is None or lng is None:
        return {"error": "Missing latitude/longitude", "success": False}

    name = building.get("name") or building.get("address") or "Unknown building"
    # Support both sqm (legacy) and sqft fields
    footprint_sqft = (
        building.get("building_footprint_sqft")
        or building.get("rooftop_area_sqft")
        or ((building.get("building_footprint_area") or building.get("usable_terrace_area") or 0) * 10.764)
    )
    footprint_sqm = footprint_sqft / 10.764
    city = building.get("city", "")

    # Auto-select zoom unless explicitly overridden
    requested_zoom = building.get("_zoom_override") or auto_zoom(footprint_sqft, lat=lat)

    # 1) Fetch satellite image + projection metadata
    # Accept pre-fetched image from benchmark service to avoid double-fetching
    if building.get("_prefetched_image_b64"):
        image_b64 = building["_prefetched_image_b64"]
        img_info = {"source": "pre-fetched", "zoom": requested_zoom, "width": 640, "height": 640}
    else:
        img_info = await fetch_satellite_image_base64(lat, lng, zoom=requested_zoom)
        if not img_info:
            return {"error": "Could not fetch satellite image", "success": False}
        image_b64 = img_info["image_b64"]

    # 2) Send to Gemini
    api_key = os.environ.get("Gemini_API_Key") or os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return {"error": "Gemini_API_Key not configured", "success": False}

    try:
        import time as _time
        client = genai.Client(api_key=api_key)

        image_bytes = base64.b64decode(image_b64)

        _t0 = _time.monotonic()
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GEMINI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        types.Part.from_text(text=_build_analysis_prompt(name, footprint_sqm, city, requested_zoom)),
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=_build_system_prompt(),
                response_mime_type="application/json",
            )
        )
        _latency_ms = int((_time.monotonic() - _t0) * 1000)

        raw = response.text

        # Extract token counts if available
        _input_tokens = None
        _output_tokens = None
        try:
            _input_tokens = response.usage_metadata.prompt_token_count
            _output_tokens = response.usage_metadata.candidates_token_count
        except Exception:
            pass

        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
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
                    "latency_ms": _latency_ms,
                }

        # 3) Annotate — produce multi-slide PPT-style output
        from services.rooftop_image_annotator import annotate_rooftop_slides
        slides = []
        if img_info.get("source") == "esri_world_imagery":
            try:
                slides = annotate_rooftop_slides(
                    image_b64=image_b64,
                    analysis=parsed,
                    lat=lat,
                    lng=lng,
                    zoom=img_info["zoom"],
                    tile_x_center=img_info["tile_x_center"],
                    tile_y_center=img_info["tile_y_center"],
                    crop_offset=img_info["crop_offset"],
                    building_polygon=building.get("footprint_polygon"),
                )
            except Exception as e:
                logger.exception(f"Slide generation failed: {e}")

        # Estimate cost if token counts unavailable
        _cost = None
        if _input_tokens and _output_tokens:
            _cost = round(
                (_input_tokens / 1_000_000) * 0.30 + (_output_tokens / 1_000_000) * 2.50,
                6,
            )

        return {
            "success": True,
            "model": GEMINI_MODEL,
            "building_id": building.get("building_id"),
            "building_name": name,
            "image_zoom": img_info["zoom"],
            "image_source": img_info["source"],
            "analysis": parsed,
            "slides": slides,
            "latency_ms": _latency_ms,
            "input_tokens": _input_tokens,
            "output_tokens": _output_tokens,
            "cost_usd": _cost,
        }
    except Exception as e:
        logger.exception(f"Gemini analysis failed: {e}")
        return {"success": False, "error": str(e)}
