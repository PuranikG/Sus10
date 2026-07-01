"""
AI Benchmark Service
====================
Runs Gemini and Claude rooftop analysis in parallel for the same image.
Captures: latency, token counts, cost, JSON completeness, confidence.
Stores results in the `ai_benchmarks` collection.

Usage:
    result = await run_rooftop_benchmark(db, building, benchmark_id)
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import uuid

from services.gemini_rooftop_analyzer import fetch_satellite_image_base64, analyze_rooftop as analyze_rooftop_gemini
from services.claude_rooftop_analyzer import analyze_rooftop_claude

logger = logging.getLogger(__name__)

# Gemini 2.5 Flash pricing (USD per million tokens)
GEMINI_25_FLASH_INPUT_COST_PER_MTOK = 0.30
GEMINI_25_FLASH_OUTPUT_COST_PER_MTOK = 2.50


def _gemini_cost(response_obj: Dict[str, Any]) -> float:
    """
    Gemini's response doesn't include token counts in the current wrapper.
    Estimate based on typical image analysis: ~800 input tokens text + ~1200 image tokens + ~500 output.
    This is a rough estimate — replace with actual token counts if Gemini SDK returns them.
    """
    estimated_input = 2000
    estimated_output = 500
    cost = (estimated_input / 1_000_000) * GEMINI_25_FLASH_INPUT_COST_PER_MTOK
    cost += (estimated_output / 1_000_000) * GEMINI_25_FLASH_OUTPUT_COST_PER_MTOK
    return round(cost, 6)


def _score_analysis(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Score analysis quality 0-100 based on:
    - JSON parsability (was success=True?)          25 pts
    - Field completeness (required fields present)  25 pts
    - Detected objects count (more = better detail) 25 pts
    - Confidence score from the model itself        25 pts
    """
    if not result.get("success"):
        return {"total": 0, "breakdown": {"parsable": 0, "complete": 0, "detail": 0, "confidence": 0}}

    analysis = result.get("analysis", {})

    # Parsability
    parsable = 25 if analysis else 0

    # Field completeness — check required top-level fields
    required_fields = [
        "rooftop_visible", "rooftop_type", "estimated_obstruction_percentage",
        "obstructions_visible", "shadow_analysis", "usable_for_solar_pct",
        "usable_for_plantation_pct", "confidence_score"
    ]
    present = sum(1 for f in required_fields if f in analysis)
    complete = round((present / len(required_fields)) * 25)

    # Detail — number of detected objects (capped at 5 for max score)
    obj_count = len(analysis.get("detected_objects", []))
    detail = min(25, obj_count * 5)

    # Confidence
    conf = analysis.get("confidence_score", 0)
    confidence_pts = round(conf * 25)

    total = parsable + complete + detail + confidence_pts
    return {
        "total": total,
        "breakdown": {
            "parsable": parsable,
            "complete": complete,
            "detail": detail,
            "confidence": confidence_pts,
        },
        "detected_objects_count": obj_count,
        "model_confidence": conf,
    }


async def _run_gemini_timed(building: Dict[str, Any], image_b64: str, image_source: str, image_zoom: int) -> Dict[str, Any]:
    """Run Gemini analysis with timing. Gemini wrapper fetches its own image but we pass metadata."""
    t0 = time.monotonic()
    # Pass the pre-fetched image via building dict augmentation
    building_with_image = {**building, "_prefetched_image_b64": image_b64}
    result = await analyze_rooftop_gemini(building_with_image)
    latency_ms = int((time.monotonic() - t0) * 1000)

    return {
        **result,
        "latency_ms": result.get("latency_ms", latency_ms),  # use inner if present
        "cost_usd": result.get("cost_usd", _gemini_cost(result)),
        "input_tokens": result.get("input_tokens"),
        "output_tokens": result.get("output_tokens"),
    }


async def run_rooftop_benchmark(
    db,
    building: Dict[str, Any],
    benchmark_id: Optional[str] = None,
    providers: list = None,
) -> Dict[str, Any]:
    """
    Run Gemini and/or Claude analysis in parallel on the same satellite image.

    Args:
        db: Motor async MongoDB client
        building: building document (must have lat/lng; building_id optional)
        benchmark_id: optional ID, auto-generated if None
        providers: list of 'gemini'|'claude', defaults to both

    Returns:
        Full benchmark comparison dict (also stored in ai_benchmarks collection).
    """
    if providers is None:
        providers = ["gemini", "claude"]

    if not benchmark_id:
        benchmark_id = f"bm_{uuid.uuid4().hex[:12]}"

    # 1. Fetch satellite image once (both providers share the same image)
    lat = building.get("latitude")
    lng = building.get("longitude")
    from services.gemini_rooftop_analyzer import auto_zoom
    footprint_sqft = building.get("building_footprint_sqft") or (
        (building.get("building_footprint_area") or 0) * 10.764
    )
    zoom = auto_zoom(footprint_sqft, lat=lat or 19.0)
    img_info = await fetch_satellite_image_base64(lat, lng, zoom=zoom)
    if not img_info:
        return {
            "benchmark_id": benchmark_id,
            "success": False,
            "error": "Could not fetch satellite image",
        }

    image_b64 = img_info["image_b64"]
    image_source = img_info["source"]
    image_zoom = img_info["zoom"]

    # 2. Build tasks for selected providers
    tasks = {}
    if "gemini" in providers:
        tasks["gemini"] = _run_gemini_timed(building, image_b64, image_source, image_zoom)
    if "claude" in providers:
        tasks["claude"] = analyze_rooftop_claude(
            building,
            image_b64=image_b64,
            image_source=image_source,
            image_zoom=image_zoom,
        )

    # 3. Run in parallel
    t_start = time.monotonic()
    results_raw = await asyncio.gather(*tasks.values(), return_exceptions=True)
    total_wall_ms = int((time.monotonic() - t_start) * 1000)

    provider_results = {}
    for provider, raw in zip(tasks.keys(), results_raw):
        if isinstance(raw, Exception):
            provider_results[provider] = {"success": False, "error": str(raw), "model": provider}
        else:
            provider_results[provider] = raw

    # 4. Score each result
    scores = {p: _score_analysis(r) for p, r in provider_results.items()}

    # 5. Build comparison summary
    comparison = {"providers_tested": list(tasks.keys()), "total_wall_ms": total_wall_ms}

    successful = [p for p, r in provider_results.items() if r.get("success")]
    if len(successful) == 2:
        g = provider_results.get("gemini", {})
        c = provider_results.get("claude", {})
        g_lat = g.get("latency_ms", 99999)
        c_lat = c.get("latency_ms", 99999)
        comparison["faster_provider"] = "gemini" if g_lat < c_lat else "claude"
        comparison["speed_diff_ms"] = abs(g_lat - c_lat)

        g_cost = g.get("cost_usd", 0)
        c_cost = c.get("cost_usd", 0)
        comparison["cheaper_provider"] = "gemini" if g_cost < c_cost else "claude"
        comparison["cost_diff_usd"] = round(abs(g_cost - c_cost), 6)
        comparison["total_cost_usd"] = round(g_cost + c_cost, 6)

        g_score = scores.get("gemini", {}).get("total", 0)
        c_score = scores.get("claude", {}).get("total", 0)
        comparison["higher_quality_provider"] = "gemini" if g_score >= c_score else "claude"
        comparison["quality_score_diff"] = abs(g_score - c_score)
    elif len(successful) == 1:
        comparison["only_successful_provider"] = successful[0]

    # 6. Strip large image data from stored results (keep analysis only)
    def _strip_image(r: Dict) -> Dict:
        return {k: v for k, v in r.items() if k not in ("slides",)}

    doc = {
        "benchmark_id": benchmark_id,
        "building_id": building.get("building_id"),
        "building_name": building.get("name") or building.get("address"),
        "lat": lat,
        "lng": lng,
        "image_source": image_source,
        "image_zoom": image_zoom,
        "created_at": datetime.now(timezone.utc),
        "providers": {p: _strip_image(r) for p, r in provider_results.items()},
        "scores": scores,
        "comparison": comparison,
    }

    try:
        await db.ai_benchmarks.insert_one({**doc, "_id": benchmark_id})
    except Exception as e:
        logger.warning(f"Failed to store benchmark result: {e}")

    # Return full result including the raw satellite image for frontend display
    return {
        **doc,
        "satellite_image_b64": image_b64,
        "success": True,
    }


async def get_production_analysis(
    db,
    building: Dict[str, Any],
    provider: str = "auto",
) -> Dict[str, Any]:
    """
    Production endpoint — returns a single analysis result.

    provider='auto': tries both in parallel, returns the higher-quality successful result.
    provider='gemini': Gemini only, no fallback.
    provider='claude': Claude only, no fallback.
    provider='gemini_with_fallback': Gemini first, Claude if Gemini fails.
    provider='claude_with_fallback': Claude first, Gemini if Claude fails.
    """
    img_info = await fetch_satellite_image_base64(
        building.get("latitude"), building.get("longitude"), zoom=19
    )
    if not img_info:
        return {"success": False, "error": "Could not fetch satellite image"}

    image_b64 = img_info["image_b64"]
    image_source = img_info["source"]
    image_zoom = img_info["zoom"]

    if provider == "gemini":
        r = await _run_gemini_timed(building, image_b64, image_source, image_zoom)
        return {**r, "satellite_image_b64": image_b64}

    if provider == "claude":
        r = await analyze_rooftop_claude(building, image_b64=image_b64, image_source=image_source, image_zoom=image_zoom)
        return {**r, "satellite_image_b64": image_b64}

    if provider == "gemini_with_fallback":
        result = await _run_gemini_timed(building, image_b64, image_source, image_zoom)
        if result.get("success"):
            return {**result, "provider_used": "gemini", "satellite_image_b64": image_b64}
        logger.warning("Gemini failed, falling back to Claude")
        result = await analyze_rooftop_claude(building, image_b64=image_b64, image_source=image_source, image_zoom=image_zoom)
        return {**result, "provider_used": "claude", "fallback_used": True, "satellite_image_b64": image_b64}

    if provider == "claude_with_fallback":
        result = await analyze_rooftop_claude(building, image_b64=image_b64, image_source=image_source, image_zoom=image_zoom)
        if result.get("success"):
            return {**result, "provider_used": "claude", "satellite_image_b64": image_b64}
        logger.warning("Claude failed, falling back to Gemini")
        result = await _run_gemini_timed(building, image_b64, image_source, image_zoom)
        return {**result, "provider_used": "gemini", "fallback_used": True, "satellite_image_b64": image_b64}

    # 'auto' — run both, pick higher quality
    gemini_task = _run_gemini_timed(building, image_b64, image_source, image_zoom)
    claude_task = analyze_rooftop_claude(building, image_b64=image_b64, image_source=image_source, image_zoom=image_zoom)
    g_result, c_result = await asyncio.gather(gemini_task, claude_task, return_exceptions=True)

    if isinstance(g_result, Exception):
        g_result = {"success": False, "error": str(g_result)}
    if isinstance(c_result, Exception):
        c_result = {"success": False, "error": str(c_result)}

    g_success = g_result.get("success", False)
    c_success = c_result.get("success", False)

    if g_success and c_success:
        g_score = _score_analysis(g_result)["total"]
        c_score = _score_analysis(c_result)["total"]
        if g_score >= c_score:
            return {**g_result, "provider_used": "gemini", "alt_provider_score": c_score, "satellite_image_b64": image_b64}
        return {**c_result, "provider_used": "claude", "alt_provider_score": g_score, "satellite_image_b64": image_b64}

    if g_success:
        return {**g_result, "provider_used": "gemini", "satellite_image_b64": image_b64}
    if c_success:
        return {**c_result, "provider_used": "claude", "satellite_image_b64": image_b64}

    return {
        "success": False,
        "error": "Both providers failed",
        "gemini_error": g_result.get("error"),
        "claude_error": c_result.get("error"),
    }
