"""
Rooftop Image Annotator
========================
Takes a satellite image + Gemini's analysis + Google's footprint polygon
and produces a publication-quality annotated image showing:
  - Building outline (from actual Google geocoding polygon if available)
  - Obstruction bounding boxes (water tanks, AC units, vent stacks, solar panels, stairwell)
  - Shadow overlay (semi-transparent dark)
  - Usable solar/plantation zone overlay (semi-transparent green/yellow)
  - Measurements in meters (computed from zoom level → meters/pixel)
  - Legend with color key
  - Scale bar
  - Title strip

Returns annotated image as base64 JPEG.
"""

import io
import math
import base64
import logging
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

# Color scheme for obstructions (RGBA, 0-255)
OBSTRUCTION_COLORS = {
    "water_tank":              (0,   200, 255, 255),   # cyan
    "ac_unit":                 (255,  80,  80, 255),   # red
    "ac_units_or_chillers":    (255,  80,  80, 255),
    "chiller":                 (255,  80,  80, 255),
    "vent_stack":              (255, 165,  40, 255),   # orange
    "vent_stacks_or_pipes":    (255, 165,  40, 255),
    "pipe":                    (255, 165,  40, 255),
    "solar_panel":             (180, 100, 255, 255),   # purple
    "existing_solar_panels":   (180, 100, 255, 255),
    "antenna":                 (255, 220,  60, 255),   # yellow
    "antennas_or_dishes":      (255, 220,  60, 255),
    "stairwell":               (160, 160, 160, 255),   # gray
    "stairwell_or_lift_room":  (160, 160, 160, 255),
    "lift_room":               (160, 160, 160, 255),
}
DEFAULT_OBSTRUCTION_COLOR = (200, 200, 200, 255)

BUILDING_OUTLINE_COLOR = (60, 180, 255, 255)   # bright blue
SHADOW_OVERLAY_COLOR   = (0, 0, 0, 110)        # 43% transparent black
USABLE_ZONE_COLOR      = (50, 200, 100, 80)    # transparent green


def _load_font(size: int):
    """Best-effort font loader — falls back to default if no TTF available."""
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _meters_per_pixel(lat: float, zoom: int) -> float:
    """Web Mercator m/px at given latitude and zoom."""
    return 156543.03 * math.cos(math.radians(lat)) / (2 ** zoom)


def _project_latlng_to_pixel(
    p_lat: float, p_lng: float,
    tile_x_center: int, tile_y_center: int,
    zoom: int, crop_offset: int
) -> Tuple[float, float]:
    """
    Project a (lat, lng) onto the cropped satellite image pixel coords.

    The cropped image was made by:
      1. Stitching a 3x3 grid of 256-px tiles around (tile_x_center, tile_y_center) at `zoom`
      2. Cropping the center (crop_offset, crop_offset) - (crop_offset+W, crop_offset+H)
    """
    n = 2.0 ** zoom
    p_lat_rad = math.radians(p_lat)
    p_x_tile_f = (p_lng + 180.0) / 360.0 * n
    p_y_tile_f = (1.0 - math.asinh(math.tan(p_lat_rad)) / math.pi) / 2.0 * n
    # Stitched-image pixel (top-left of stitch is tile (tile_x_center-1, tile_y_center-1))
    px_stitched = 256.0 * (p_x_tile_f - tile_x_center + 1)
    py_stitched = 256.0 * (p_y_tile_f - tile_y_center + 1)
    return (px_stitched - crop_offset, py_stitched - crop_offset)


def _normalize_box_2d(box: List[int], w: int, h: int) -> Tuple[int, int, int, int]:
    """Gemini box_2d is [ymin, xmin, ymax, xmax] in 0-1000 normalized scale."""
    ymin, xmin, ymax, xmax = box
    return (
        int(xmin / 1000 * w),
        int(ymin / 1000 * h),
        int(xmax / 1000 * w),
        int(ymax / 1000 * h),
    )


def annotate_rooftop_image(
    image_b64: str,
    analysis: Dict[str, Any],
    lat: float,
    lng: float,
    zoom: int,
    tile_x_center: int,
    tile_y_center: int,
    crop_offset: int,
    building_polygon: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """
    Produce an annotated image as base64-encoded JPEG.

    Args:
        image_b64: Original satellite image (base64)
        analysis: Gemini analysis JSON (with detected_objects, shadow_regions, building_boundary_box)
        lat, lng: building center
        zoom: tile zoom level (typically 19)
        tile_x_center, tile_y_center: integer tile coords used during stitch
        crop_offset: top-left offset of crop region in stitched image
        building_polygon: GeoJSON polygon from Google Geocoding (preferred over Gemini for outline)

    Returns:
        Base64 JPEG of annotated image, or None on failure.
    """
    try:
        img = Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("RGBA")
    except Exception as e:
        logger.exception(f"Could not decode image: {e}")
        return None

    w, h = img.size
    mpp = _meters_per_pixel(lat, zoom)

    # Composite layers: shadows + zones first (under boxes), then boxes, then text/legend
    underlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_under = ImageDraw.Draw(underlay)
    draw_over = ImageDraw.Draw(overlay)

    font_label = _load_font(14)
    font_small = _load_font(11)
    font_title = _load_font(18)

    # ---- 1) Shadow regions (under boxes) ----
    for shadow in (analysis.get("shadow_regions") or []):
        box = shadow.get("box_2d")
        if not box or len(box) != 4:
            continue
        x1, y1, x2, y2 = _normalize_box_2d(box, w, h)
        draw_under.rectangle([x1, y1, x2, y2], fill=SHADOW_OVERLAY_COLOR)
        label = f"Shadow ({shadow.get('source', 'unknown').replace('_', ' ')})"
        _draw_label(draw_over, label, (x1 + 4, y1 + 4), font_small,
                    fill=(255, 230, 100, 255), bg=(0, 0, 0, 180))

    # ---- 2) Usable solar zone (visualized as a soft tint) ----
    # Optional: if Gemini gave a usable_solar_region_box, fill it green
    solar_region = analysis.get("usable_solar_region_box")
    if solar_region and len(solar_region) == 4:
        x1, y1, x2, y2 = _normalize_box_2d(solar_region, w, h)
        draw_under.rectangle([x1, y1, x2, y2], fill=USABLE_ZONE_COLOR)

    # ---- 3) Building footprint (prefer actual Google polygon) ----
    drew_google_polygon = False
    if building_polygon and building_polygon.get("type") == "Polygon":
        try:
            coords = building_polygon["coordinates"][0]  # outer ring, list of [lng, lat]
            pixel_pts = [
                _project_latlng_to_pixel(
                    pt[1], pt[0], tile_x_center, tile_y_center, zoom, crop_offset
                )
                for pt in coords
            ]
            # Only draw if at least half the points are inside the image
            inside = sum(1 for (px, py) in pixel_pts if 0 <= px <= w and 0 <= py <= h)
            if inside >= max(3, len(pixel_pts) // 2):
                draw_over.line(
                    pixel_pts + [pixel_pts[0]],
                    fill=BUILDING_OUTLINE_COLOR, width=4, joint="curve"
                )
                # Compute footprint area from polygon (using projected pixels × mpp²)
                pixel_area = _polygon_area_pixels(pixel_pts)
                approx_area_m2 = pixel_area * mpp * mpp
                # Label near centroid
                cx = sum(p[0] for p in pixel_pts) / len(pixel_pts)
                cy = sum(p[1] for p in pixel_pts) / len(pixel_pts)
                _draw_label(
                    draw_over,
                    f"Footprint ~ {approx_area_m2:.0f} m^2",
                    (cx - 70, cy - 10), font_label,
                    fill=BUILDING_OUTLINE_COLOR, bg=(20, 30, 60, 200)
                )
                drew_google_polygon = True
        except Exception as e:
            logger.warning(f"Could not project building polygon: {e}")

    # Fallback: Gemini's building_boundary_box
    if not drew_google_polygon:
        bbox = analysis.get("building_boundary_box")
        if bbox and len(bbox) == 4:
            x1, y1, x2, y2 = _normalize_box_2d(bbox, w, h)
            draw_over.rectangle([x1, y1, x2, y2], outline=BUILDING_OUTLINE_COLOR, width=4)
            width_m = (x2 - x1) * mpp
            height_m = (y2 - y1) * mpp
            area_m2 = width_m * height_m
            _draw_label(
                draw_over,
                f"Footprint ~ {width_m:.0f}m x {height_m:.0f}m ~ {area_m2:.0f} m^2",
                (x1 + 4, y1 + 4), font_label,
                fill=BUILDING_OUTLINE_COLOR, bg=(20, 30, 60, 200)
            )

    # ---- 4) Detected obstructions ----
    detected_count_by_type = {}
    drawn_label_boxes: List[Tuple[float, float, float, float]] = []
    for obj in (analysis.get("detected_objects") or []):
        label = (obj.get("label") or "object").lower().strip().replace(" ", "_")
        box = obj.get("box_2d")
        if not box or len(box) != 4:
            continue
        color = OBSTRUCTION_COLORS.get(label, DEFAULT_OBSTRUCTION_COLOR)
        x1, y1, x2, y2 = _normalize_box_2d(box, w, h)
        # Semi-transparent fill
        fill = (*color[:3], 60)
        draw_under.rectangle([x1, y1, x2, y2], fill=fill)
        # Outline
        draw_over.rectangle([x1, y1, x2, y2], outline=color, width=2)
        # Measurement
        width_m = max(0.3, (x2 - x1) * mpp)
        height_m = max(0.3, (y2 - y1) * mpp)
        # Compact label for small/clustered boxes (AC units etc.)
        is_compact = (x2 - x1) < 50 or (y2 - y1) < 25
        pretty = label.replace("_", " ").title()
        if is_compact:
            text = f"{pretty[:6]} {width_m:.1f}m"
        else:
            text = f"{pretty} {width_m:.1f}x{height_m:.1f}m"

        # Find a non-overlapping label spot — try above, then below, then inside
        candidates = [
            (x1 + 2, max(0, y1 - 14)),  # above
            (x1 + 2, min(h - 14, y2 + 2)),  # below
            (x1 + 2, y1 + 2),  # inside top-left
        ]
        chosen = candidates[0]
        for cx, cy in candidates:
            est_w = len(text) * 6
            cb = (cx, cy, cx + est_w, cy + 12)
            overlap = any(
                not (cb[2] < db[0] or cb[0] > db[2] or cb[3] < db[1] or cb[1] > db[3])
                for db in drawn_label_boxes
            )
            if not overlap:
                chosen = (cx, cy)
                drawn_label_boxes.append(cb)
                break
        else:
            drawn_label_boxes.append((chosen[0], chosen[1], chosen[0] + len(text) * 6, chosen[1] + 12))

        _draw_label(
            draw_over, text, chosen, font_small,
            fill=(255, 255, 255, 255), bg=(*color[:3], 220)
        )
        detected_count_by_type[pretty] = detected_count_by_type.get(pretty, 0) + 1

    # ---- 5) Composite ----
    final = Image.alpha_composite(img, underlay)
    final = Image.alpha_composite(final, overlay)

    # ---- 6) Add title + legend + scale bar in a top strip + bottom strip ----
    padded = _add_chrome(
        final.convert("RGB"),
        title="Sus10 AI · Rooftop Visual Analysis",
        subtitle=analysis.get("data_quality_notes", "") or "Gemini 2.5 Flash · Aerial annotation",
        detected_counts=detected_count_by_type,
        usable_solar_pct=analysis.get("usable_for_solar_pct"),
        usable_plant_pct=analysis.get("usable_for_plantation_pct"),
        confidence=analysis.get("confidence_score"),
        mpp=mpp,
        zoom=zoom,
        font_title=font_title,
        font_label=font_label,
        font_small=font_small,
    )

    buf = io.BytesIO()
    padded.save(buf, format="JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _draw_label(draw, text, xy, font, fill, bg):
    """Draw text with a rectangular background for readability."""
    x, y = xy
    try:
        # Pillow 10+: textbbox
        bbox = draw.textbbox((x, y), text, font=font)
        pad = 3
        draw.rectangle(
            [bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad],
            fill=bg
        )
    except Exception:
        pass
    draw.text(xy, text, font=font, fill=fill)


def _polygon_area_pixels(pts: List[Tuple[float, float]]) -> float:
    """Shoelace formula on pixel coords."""
    if len(pts) < 3:
        return 0.0
    a = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0


def _add_chrome(
    img: Image.Image, title: str, subtitle: str,
    detected_counts: Dict[str, int],
    usable_solar_pct, usable_plant_pct, confidence, mpp, zoom,
    font_title, font_label, font_small,
):
    """Add a top header bar and a bottom legend strip with scale bar."""
    pad_top, pad_bottom = 90, 110
    w, h = img.size
    canvas = Image.new("RGB", (w, h + pad_top + pad_bottom), (18, 22, 30))
    canvas.paste(img, (0, pad_top))
    draw = ImageDraw.Draw(canvas)

    # Title bar
    draw.text((16, 14), title, font=font_title, fill=(245, 250, 255))
    draw.text((16, 44), subtitle[:130], font=font_small, fill=(170, 185, 210))
    # Usable stats top-right
    stats = []
    if usable_solar_pct is not None:
        stats.append(f"Solar usable: {usable_solar_pct}%")
    if usable_plant_pct is not None:
        stats.append(f"Plantation: {usable_plant_pct}%")
    if confidence is not None:
        stats.append(f"AI confidence: {int(confidence * 100)}%")
    y = 18
    for s in stats:
        try:
            bbox = draw.textbbox((0, 0), s, font=font_label)
            tw = bbox[2] - bbox[0]
        except Exception:
            tw = len(s) * 7
        draw.text((w - tw - 16, y), s, font=font_label, fill=(220, 230, 245))
        y += 22

    # Bottom legend
    legend_y = h + pad_top + 8
    draw.text((16, legend_y), "Legend:", font=font_label, fill=(245, 250, 255))
    legend_items = [
        ("Building footprint", BUILDING_OUTLINE_COLOR),
        ("Water tank", OBSTRUCTION_COLORS["water_tank"]),
        ("AC / chiller", OBSTRUCTION_COLORS["ac_unit"]),
        ("Vent / pipes", OBSTRUCTION_COLORS["vent_stack"]),
        ("Solar panel", OBSTRUCTION_COLORS["solar_panel"]),
        ("Stairwell / lift", OBSTRUCTION_COLORS["stairwell"]),
        ("Shadow", (60, 60, 60, 255)),
    ]
    x = 90
    for name, color in legend_items:
        draw.rectangle([x, legend_y + 2, x + 14, legend_y + 14], fill=color[:3], outline=(255, 255, 255))
        draw.text((x + 19, legend_y - 1), name, font=font_small, fill=(220, 230, 245))
        try:
            bbox = draw.textbbox((x + 19, legend_y - 1), name, font=font_small)
            x = bbox[2] + 16
        except Exception:
            x += 90 + len(name) * 6

    # Detected obstruction counts on next line
    if detected_counts:
        line2_y = legend_y + 30
        counts_str = "Detected: " + ", ".join(
            f"{k}×{v}" for k, v in sorted(detected_counts.items(), key=lambda kv: -kv[1])
        )
        draw.text((16, line2_y), counts_str[:200], font=font_small, fill=(180, 200, 230))

    # Scale bar (bottom right) — show 10 m
    bar_meters = 10
    bar_px = int(bar_meters / mpp)
    if bar_px > 40 and bar_px < w - 40:
        bar_x_right = w - 24
        bar_x_left = bar_x_right - bar_px
        bar_y = h + pad_top + pad_bottom - 24
        draw.line([(bar_x_left, bar_y), (bar_x_right, bar_y)], fill=(255, 255, 255), width=3)
        # tick marks
        draw.line([(bar_x_left, bar_y - 5), (bar_x_left, bar_y + 5)], fill=(255, 255, 255), width=3)
        draw.line([(bar_x_right, bar_y - 5), (bar_x_right, bar_y + 5)], fill=(255, 255, 255), width=3)
        # label
        try:
            bbox = draw.textbbox((0, 0), f"{bar_meters} m", font=font_small)
            tw = bbox[2] - bbox[0]
        except Exception:
            tw = 22
        draw.text((bar_x_left + (bar_px - tw) // 2, bar_y - 18), f"{bar_meters} m",
                  font=font_small, fill=(255, 255, 255))
        draw.text((16, bar_y - 6), f"Zoom {zoom} · {mpp:.2f} m/px",
                  font=font_small, fill=(160, 175, 195))

    return canvas
