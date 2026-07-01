"""
Claude Rooftop Analyzer
========================
Uses Claude Haiku Vision to analyze a rooftop satellite image.
Produces the same JSON schema as gemini_rooftop_analyzer.py so both can be
swapped or compared transparently.

Model: claude-haiku-4-5-20251001
Cost: ~$0.004 per analysis (image ~1600 tokens + prompt ~800 + output ~500)
Key:  ANTHROPIC_API_KEY env var
"""

import os
import json
import asyncio
import logging
import base64
from typing import Dict, Any, Optional

import anthropic

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-haiku-4-5-20251001"

# Pricing per million tokens (USD) — update if pricing changes
CLAUDE_HAIKU_INPUT_COST_PER_MTOK = 0.80
CLAUDE_HAIKU_OUTPUT_COST_PER_MTOK = 4.00


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
- All bounding boxes use the format [ymin, xmin, ymax, xmax] in NORMALIZED 0-1000 scale.
- Provide tight boxes around each detected object.
- If you flagged an obstruction as true, include AT LEAST ONE entry per type in detected_objects.
- "building_boundary_box" = tight box around the central building's rooftop perimeter.
- "shadow_regions" = boxes around clearly shadowed areas on the central building's rooftop only.

Rules:
- Treat the building at the image center as your subject.
- "usable_for_solar_pct" = 100 - obstructions% - shadow%, capped at 75% for typical Indian commercial roofs.
- "usable_for_plantation_pct" typically 30-60% on commercial roofs after subtracting obstructions.
- Be CONSERVATIVE. confidence_score 0.5-0.9 for valid aerials. 0.0 only for completely useless images.
"""


def _estimate_cost(input_tokens: int, output_tokens: int) -> float:
    """Estimate cost in USD."""
    input_cost = (input_tokens / 1_000_000) * CLAUDE_HAIKU_INPUT_COST_PER_MTOK
    output_cost = (output_tokens / 1_000_000) * CLAUDE_HAIKU_OUTPUT_COST_PER_MTOK
    return round(input_cost + output_cost, 6)


async def analyze_rooftop_claude(
    building: Dict[str, Any],
    image_b64: Optional[str] = None,
    image_source: Optional[str] = None,
    image_zoom: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Analyze a building's rooftop using Claude Haiku Vision.

    If image_b64 is provided (pre-fetched), uses it directly.
    Otherwise fetches the satellite image itself.

    Returns the same dict structure as gemini_rooftop_analyzer.analyze_rooftop().
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY not configured", "success": False}

    lat = building.get("latitude")
    lng = building.get("longitude")
    if lat is None or lng is None:
        return {"error": "Missing latitude/longitude", "success": False}

    name = building.get("name") or building.get("address") or "Unknown building"
    footprint = building.get("building_footprint_area") or building.get("usable_terrace_area") or 0
    city = building.get("city", "")

    # Fetch satellite image if not provided
    if not image_b64:
        from services.gemini_rooftop_analyzer import fetch_satellite_image_base64
        img_info = await fetch_satellite_image_base64(lat, lng, zoom=19)
        if not img_info:
            return {"error": "Could not fetch satellite image", "success": False}
        image_b64 = img_info["image_b64"]
        image_source = img_info["source"]
        image_zoom = img_info["zoom"]

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)

        import time
        t0 = time.monotonic()

        response = await client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2048,
            system=_build_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": _build_analysis_prompt(name, footprint, city),
                        },
                    ],
                }
            ],
        )

        latency_ms = int((time.monotonic() - t0) * 1000)
        raw = response.content[0].text
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens

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
                parsed = json.loads(cleaned[start: end + 1])
            else:
                logger.warning(f"Claude returned non-JSON: {cleaned[:300]}")
                return {
                    "success": False,
                    "error": "Claude returned non-JSON response",
                    "raw_response": cleaned[:500],
                    "model": CLAUDE_MODEL,
                    "latency_ms": latency_ms,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost_usd": _estimate_cost(input_tokens, output_tokens),
                }

        return {
            "success": True,
            "model": CLAUDE_MODEL,
            "building_id": building.get("building_id"),
            "building_name": name,
            "image_zoom": image_zoom,
            "image_source": image_source,
            "analysis": parsed,
            "latency_ms": latency_ms,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": _estimate_cost(input_tokens, output_tokens),
        }

    except Exception as e:
        logger.exception(f"Claude rooftop analysis failed: {e}")
        return {"success": False, "error": str(e), "model": CLAUDE_MODEL}
