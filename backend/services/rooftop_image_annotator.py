"""
Rooftop Image Annotator — PPT-style multi-slide output
=======================================================
Takes the original satellite image + Gemini's analysis + Google's footprint polygon
and produces an ARRAY of slides. Each slide focuses on ONE category and has:
  - Header strip: title + 1-line description
  - Large clean image with THIN colored borders (no per-box labels)
  - Numbered markers (1, 2, 3...) at each detection
  - Footer strip: count, total area, summary line, legend swatch

Categories (skipped if count == 0):
  1. overview          → building footprint outline + key stats
  2. water_tanks
  3. ac_units
  4. vent_stacks
  5. solar_panels
  6. stairwells
  7. antennas
  8. shadows
  9. zones             → solar + plantation recommended areas (semi-transparent overlay)

Frontend renders these as a carousel — one slide per category.
"""

import io
import math
import base64
import logging
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

# Category configuration: each maps internal label keys → display config
CATEGORIES = {
    "overview": {
        "title": "Rooftop Overview",
        "description": "Building footprint outline and overall sustainability assessment.",
        "color": (60, 180, 255),  # blue
        "labels": [],  # filled by building outline + stats, no detected_objects
    },
    "water_tanks": {
        "title": "Water Tanks",
        "description": "Existing overhead water tanks occupy roof space and require clearance around them.",
        "color": (0, 200, 255),
        "labels": ["water_tank", "water_tanks"],
    },
    "ac_units": {
        "title": "AC Compressors & Chillers",
        "description": "Cooling equipment occupies roof real estate. Relocating or consolidating opens solar PV opportunity.",
        "color": (255, 80, 80),
        "labels": ["ac_unit", "ac_units_or_chillers", "chiller"],
    },
    "vent_stacks": {
        "title": "Vent Stacks & Pipes",
        "description": "Vertical pipes for kitchen / bathroom / industrial exhaust — typically minor obstructions.",
        "color": (255, 165, 40),
        "labels": ["vent_stack", "vent_stacks_or_pipes", "pipe"],
    },
    "solar_panels": {
        "title": "Existing Solar Installation",
        "description": "Solar PV panels already deployed on this rooftop. Future capacity should account for these.",
        "color": (180, 100, 255),
        "labels": ["solar_panel", "existing_solar_panels"],
    },
    "stairwells": {
        "title": "Stairwells & Lift Rooms",
        "description": "Structural protrusions providing roof access. Casts self-shadow on adjacent roof area.",
        "color": (160, 160, 160),
        "labels": ["stairwell", "stairwell_or_lift_room", "lift_room"],
    },
    "antennas": {
        "title": "Antennas & Dish Mounts",
        "description": "Communication equipment — minor obstructions, but verify line-of-sight constraints before relocating.",
        "color": (255, 220, 60),
        "labels": ["antenna", "antennas_or_dishes"],
    },
    "shadows": {
        "title": "Shadow Analysis",
        "description": "Shaded zones reduce solar generation. Source attribution helps assess whether shadows are temporary.",
        "color": (40, 40, 40),
        "labels": [],  # shadows pulled from shadow_regions, not detected_objects
    },
    "zones": {
        "title": "Recommended Deployment Zones",
        "description": "Suggested zones for solar PV (yellow) and rooftop plantation (green) based on obstructions and shadows.",
        "color": (50, 200, 100),
        "labels": [],
    },
}

BUILDING_OUTLINE_COLOR = (60, 180, 255)


def _load_font(size: int):
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _meters_per_pixel(lat: float, zoom: int) -> float:
    return 156543.03 * math.cos(math.radians(lat)) / (2 ** zoom)


def _project_latlng_to_pixel(p_lat, p_lng, tile_x_center, tile_y_center, zoom, crop_offset):
    n = 2.0 ** zoom
    p_lat_rad = math.radians(p_lat)
    p_x_tile_f = (p_lng + 180.0) / 360.0 * n
    p_y_tile_f = (1.0 - math.asinh(math.tan(p_lat_rad)) / math.pi) / 2.0 * n
    px = 256.0 * (p_x_tile_f - tile_x_center + 1) - crop_offset
    py = 256.0 * (p_y_tile_f - tile_y_center + 1) - crop_offset
    return (px, py)


def _normalize_box_2d(box, w, h):
    ymin, xmin, ymax, xmax = box
    return (int(xmin / 1000 * w), int(ymin / 1000 * h),
            int(xmax / 1000 * w), int(ymax / 1000 * h))


def _polygon_area_pixels(pts):
    if len(pts) < 3:
        return 0.0
    a = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0


def _draw_building_outline(draw, building_polygon, tile_x_center, tile_y_center,
                            zoom, crop_offset, w, h, color, width=3):
    """Draw the actual Google polygon. Returns approx area in m²."""
    if not building_polygon or building_polygon.get("type") != "Polygon":
        return None
    try:
        coords = building_polygon["coordinates"][0]
        pts = [
            _project_latlng_to_pixel(c[1], c[0], tile_x_center, tile_y_center, zoom, crop_offset)
            for c in coords
        ]
        inside = sum(1 for p in pts if 0 <= p[0] <= w and 0 <= p[1] <= h)
        if inside < max(3, len(pts) // 2):
            return None
        draw.line(pts + [pts[0]], fill=color, width=width, joint="curve")
        return _polygon_area_pixels(pts)
    except Exception:
        return None


def _slide_from_image(
    base_img: Image.Image,
    category_key: str,
    title: str,
    description: str,
    color: Tuple[int, int, int],
    detections: List[Dict[str, Any]],  # list of {box, optional label}
    shadows: List[Dict[str, Any]],
    building_polygon,
    tile_x_center, tile_y_center, zoom, crop_offset,
    mpp: float,
    extra_summary_lines: Optional[List[str]] = None,
    zones_overlay: Optional[Dict[str, str]] = None,  # e.g. {"solar":"south_half", "plantation":"edges"}
):
    """Generate a single annotated slide image."""
    w, h = base_img.size

    # Layers
    underlay = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
    overlay = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
    draw_under = ImageDraw.Draw(underlay)
    draw_over = ImageDraw.Draw(overlay)

    font_marker = _load_font(14)

    # Always draw building footprint outline (light blue, thin)
    approx_area = _draw_building_outline(
        draw_over, building_polygon,
        tile_x_center, tile_y_center, zoom, crop_offset,
        w, h, color=BUILDING_OUTLINE_COLOR + (255,), width=2,
    )

    total_object_area_m2 = 0.0

    # Draw shadows specifically when this is the shadows slide
    if category_key == "shadows":
        for i, s in enumerate(shadows):
            box = s.get("box_2d")
            if not box or len(box) != 4:
                continue
            x1, y1, x2, y2 = _normalize_box_2d(box, w, h)
            draw_under.rectangle([x1, y1, x2, y2], fill=(0, 0, 0, 95))
            draw_over.rectangle([x1, y1, x2, y2], outline=(255, 235, 100, 255), width=2)
            total_object_area_m2 += (x2 - x1) * (y2 - y1) * mpp * mpp
            _draw_corner_marker(draw_over, x1, y1, i + 1, (255, 235, 100, 230), font_marker)

    # Draw zones slide — semi-transparent overlays per recommended zone
    elif category_key == "zones":
        zones = zones_overlay or {}
        solar_zone = (zones.get("solar_zone") or "").replace("_", " ")
        plant_zone = (zones.get("plantation_zone") or "").replace("_", " ")
        _draw_zone_overlay(draw_under, solar_zone, w, h, (255, 200, 60, 90))
        _draw_zone_overlay(draw_under, plant_zone, w, h, (90, 200, 100, 90), pattern=True)

    # Object detection slide
    else:
        for i, obj in enumerate(detections):
            box = obj.get("box_2d")
            if not box or len(box) != 4:
                continue
            x1, y1, x2, y2 = _normalize_box_2d(box, w, h)
            # THIN border only, no label text
            draw_over.rectangle([x1, y1, x2, y2], outline=color + (255,), width=2)
            # Light tint fill (very subtle)
            draw_under.rectangle([x1, y1, x2, y2], fill=color + (40,))
            # Numbered marker in top-left corner of the box
            _draw_corner_marker(draw_over, x1, y1, i + 1, color + (240,), font_marker)
            total_object_area_m2 += (x2 - x1) * (y2 - y1) * mpp * mpp

    # Composite
    final = Image.alpha_composite(base_img.convert("RGBA"), underlay)
    final = Image.alpha_composite(final, overlay)

    # Add PPT-style chrome
    return _add_slide_chrome(
        final.convert("RGB"),
        title=title,
        description=description,
        color=color,
        count=len(detections) if category_key not in ("shadows", "zones", "overview") else (
            len(shadows) if category_key == "shadows" else None
        ),
        total_area_m2=total_object_area_m2,
        footprint_m2=(approx_area * mpp * mpp) if approx_area else None,
        extra_summary_lines=extra_summary_lines or [],
        mpp=mpp,
    )


def _draw_corner_marker(draw, x, y, number, color, font):
    """Draw a small numbered circle indicator near box top-left."""
    radius = 8
    cx, cy = x + radius, y + radius
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                 fill=color, outline=(255, 255, 255, 255), width=1)
    # Number text
    text = str(number)
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
    except Exception:
        tw, th = 6, 8
    draw.text((cx - tw // 2, cy - th // 2 - 1), text,
              font=font, fill=(255, 255, 255, 255))


def _draw_zone_overlay(draw, zone_name: str, w: int, h: int, color, pattern=False):
    """Draw a semi-transparent zone overlay per recommended zone hint."""
    if not zone_name or zone_name in ("unknown", "none"):
        return
    z = zone_name.lower()
    if "north" in z:
        rect = [0, 0, w, h // 2]
    elif "south" in z:
        rect = [0, h // 2, w, h]
    elif "east" in z:
        rect = [w // 2, 0, w, h]
    elif "west" in z:
        rect = [0, 0, w // 2, h]
    elif "center" in z:
        rect = [w // 4, h // 4, 3 * w // 4, 3 * h // 4]
    elif "perimeter" in z or "edge" in z:
        # Just draw a border frame
        thickness = 40
        draw.rectangle([0, 0, w, thickness], fill=color)
        draw.rectangle([0, h - thickness, w, h], fill=color)
        draw.rectangle([0, 0, thickness, h], fill=color)
        draw.rectangle([w - thickness, 0, w, h], fill=color)
        return
    else:
        rect = [w // 4, h // 4, 3 * w // 4, 3 * h // 4]
    draw.rectangle(rect, fill=color)


def _add_slide_chrome(
    img: Image.Image, title: str, description: str, color: Tuple[int, int, int],
    count: Optional[int], total_area_m2: float, footprint_m2: Optional[float],
    extra_summary_lines: List[str], mpp: float,
):
    """Wrap the image in a PPT-slide-like header + footer."""
    pad_top, pad_bottom = 110, 110
    w, h = img.size
    SLIDE_W = max(900, w + 120)  # widen so we have room
    img_resized = img
    if w < SLIDE_W - 80:
        # Upscale the image so it's a prominent visual
        new_w = SLIDE_W - 80
        new_h = int(h * new_w / w)
        img_resized = img.resize((new_w, new_h), Image.LANCZOS)
        w, h = new_w, new_h

    SLIDE_H = h + pad_top + pad_bottom
    canvas = Image.new("RGB", (SLIDE_W, SLIDE_H), (20, 26, 36))
    canvas.paste(img_resized, (40, pad_top))
    draw = ImageDraw.Draw(canvas)

    font_title = _load_font(22)
    font_desc = _load_font(13)
    font_label = _load_font(13)
    font_small = _load_font(11)

    # Header: color accent strip on the left
    draw.rectangle([0, 0, 8, SLIDE_H], fill=color)
    # Title
    draw.text((24, 20), title, font=font_title, fill=(245, 250, 255))
    # Description (wrap to fit)
    _draw_wrapped(draw, description, (24, 56), SLIDE_W - 50, font_desc, fill=(180, 195, 215))

    # Count badge top-right
    if count is not None:
        badge = f"{count} detected"
        try:
            bbox = draw.textbbox((0, 0), badge, font=font_label)
            tw = bbox[2] - bbox[0]
        except Exception:
            tw = len(badge) * 7
        bx2 = SLIDE_W - 24
        bx1 = bx2 - tw - 16
        draw.rectangle([bx1, 22, bx2, 48], fill=color, outline=(255, 255, 255), width=1)
        draw.text((bx1 + 8, 26), badge, font=font_label, fill=(255, 255, 255))

    # Footer
    footer_y = pad_top + h + 14
    summary_parts = []
    if count is not None and count > 0:
        summary_parts.append(f"{count} object(s) shown · numbered in image")
    if total_area_m2 > 0:
        summary_parts.append(f"~{total_area_m2:.0f} m^2 occupied")
    if footprint_m2:
        summary_parts.append(f"Footprint ~{footprint_m2:.0f} m^2")
    summary = "  •  ".join(summary_parts) if summary_parts else ""

    if summary:
        draw.text((24, footer_y), summary, font=font_label, fill=(220, 230, 245))
        footer_y += 22
    for line in extra_summary_lines[:3]:
        draw.text((24, footer_y), line, font=font_small, fill=(170, 190, 215))
        footer_y += 16

    # Color swatch + legend on right
    legend_x = SLIDE_W - 220
    legend_y = pad_top + h + 14
    draw.rectangle([legend_x, legend_y + 1, legend_x + 16, legend_y + 13], fill=color, outline=(255, 255, 255))
    draw.text((legend_x + 22, legend_y - 1), title.split(" · ")[0], font=font_small, fill=(220, 230, 245))
    # Scale bar (10 m)
    bar_meters = 10
    bar_px = int(bar_meters / mpp)
    if 30 < bar_px < SLIDE_W - 200:
        sx2 = SLIDE_W - 24
        sx1 = sx2 - bar_px
        sy = SLIDE_H - 22
        draw.line([(sx1, sy), (sx2, sy)], fill=(255, 255, 255), width=3)
        draw.line([(sx1, sy - 4), (sx1, sy + 4)], fill=(255, 255, 255), width=3)
        draw.line([(sx2, sy - 4), (sx2, sy + 4)], fill=(255, 255, 255), width=3)
        try:
            bbox = draw.textbbox((0, 0), f"{bar_meters} m", font=font_small)
            tw = bbox[2] - bbox[0]
        except Exception:
            tw = 22
        draw.text((sx1 + (bar_px - tw) // 2, sy - 16), f"{bar_meters} m",
                  font=font_small, fill=(255, 255, 255))

    return canvas


def _draw_wrapped(draw, text, xy, max_width, font, fill):
    """Naive word-wrap text drawing within max_width."""
    if not text:
        return
    words = text.split()
    lines, cur = [], ""
    for w_ in words:
        cand = (cur + " " + w_).strip()
        try:
            bbox = draw.textbbox((0, 0), cand, font=font)
            tw = bbox[2] - bbox[0]
        except Exception:
            tw = len(cand) * 6
        if tw > max_width and cur:
            lines.append(cur)
            cur = w_
        else:
            cur = cand
    if cur:
        lines.append(cur)
    x, y = xy
    for line in lines[:2]:  # limit to 2 lines
        draw.text((x, y), line, font=font, fill=fill)
        y += 18


def annotate_rooftop_slides(
    image_b64: str,
    analysis: Dict[str, Any],
    lat: float, lng: float,
    zoom: int,
    tile_x_center: int, tile_y_center: int, crop_offset: int,
    building_polygon: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Produce a multi-slide PPT-style annotation set.

    Returns list of {id, title, description, image_b64, count, summary_lines}.
    """
    try:
        base_img = Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("RGB")
    except Exception as e:
        logger.exception(f"Image decode failed: {e}")
        return []

    w, h = base_img.size
    mpp = _meters_per_pixel(lat, zoom)

    # Bucket detections by category
    by_cat: Dict[str, List[Dict[str, Any]]] = {k: [] for k in CATEGORIES}
    for obj in (analysis.get("detected_objects") or []):
        label = (obj.get("label") or "").lower().strip().replace(" ", "_")
        for cat_key, cfg in CATEGORIES.items():
            if label in cfg["labels"]:
                by_cat[cat_key].append(obj)
                break

    shadows = analysis.get("shadow_regions") or []
    zones = analysis.get("recommended_zones") or {}

    slides: List[Dict[str, Any]] = []

    # 1) Overview slide — building outline + headline stats
    overview_lines = [
        f"Rooftop type: {analysis.get('rooftop_type', 'unknown')}",
        f"Solar usable: {analysis.get('usable_for_solar_pct', '—')}%  •  Plantation usable: {analysis.get('usable_for_plantation_pct', '—')}%",
        f"Overall obstruction: {analysis.get('estimated_obstruction_percentage', '—')}%  •  AI confidence: {int((analysis.get('confidence_score', 0) or 0) * 100)}%",
    ]
    slides.append({
        "id": "overview",
        "title": "Rooftop Overview",
        "description": CATEGORIES["overview"]["description"],
        "count": None,
        "summary_lines": overview_lines,
        "image_b64": _encode(_slide_from_image(
            base_img, "overview",
            "Rooftop Overview",
            CATEGORIES["overview"]["description"],
            CATEGORIES["overview"]["color"],
            [], shadows, building_polygon,
            tile_x_center, tile_y_center, zoom, crop_offset, mpp,
            extra_summary_lines=overview_lines,
        )),
    })

    # 2..N) Per-category obstruction slides — only when count > 0
    category_order = ["water_tanks", "ac_units", "vent_stacks", "solar_panels", "stairwells", "antennas"]
    for cat_key in category_order:
        detections = by_cat.get(cat_key, [])
        if not detections:
            continue
        cfg = CATEGORIES[cat_key]
        # Compute total area for summary
        total_area = sum(
            ((b[3] - b[1]) * (b[2] - b[0]) * mpp * mpp)
            for b in [_normalize_box_2d(o.get("box_2d"), w, h) for o in detections if o.get("box_2d")]
        )
        avg_area = total_area / max(1, len(detections))
        summary = [
            f"{len(detections)} unit(s) — average size ~{avg_area:.1f} m^2",
            f"Combined footprint ~{total_area:.0f} m^2 — relocate or consolidate to free roof area",
        ]
        slides.append({
            "id": cat_key,
            "title": cfg["title"],
            "description": cfg["description"],
            "count": len(detections),
            "summary_lines": summary,
            "image_b64": _encode(_slide_from_image(
                base_img, cat_key,
                cfg["title"], cfg["description"], cfg["color"],
                detections, shadows, building_polygon,
                tile_x_center, tile_y_center, zoom, crop_offset, mpp,
                extra_summary_lines=summary,
            )),
        })

    # Shadow slide
    if shadows:
        shadow_sources = set(s.get("source", "unknown") for s in shadows)
        summary = [
            f"{len(shadows)} shaded region(s) — source(s): {', '.join(s.replace('_', ' ') for s in shadow_sources)}",
            f"Estimated ~{analysis.get('shadow_analysis', {}).get('shaded_area_percentage_estimated', 0)}% of rooftop affected — design solar layout around these zones",
        ]
        slides.append({
            "id": "shadows",
            "title": CATEGORIES["shadows"]["title"],
            "description": CATEGORIES["shadows"]["description"],
            "count": len(shadows),
            "summary_lines": summary,
            "image_b64": _encode(_slide_from_image(
                base_img, "shadows",
                CATEGORIES["shadows"]["title"],
                CATEGORIES["shadows"]["description"],
                CATEGORIES["shadows"]["color"],
                [], shadows, building_polygon,
                tile_x_center, tile_y_center, zoom, crop_offset, mpp,
                extra_summary_lines=summary,
            )),
        })

    # Recommended zones slide
    summary = [
        f"Solar zone: {(zones.get('solar_zone') or 'unknown').replace('_', ' ')}",
        f"Plantation zone: {(zones.get('plantation_zone') or 'unknown').replace('_', ' ')}",
        f"Biogas unit placement: {(zones.get('biogas_unit_placement') or 'unknown').replace('_', ' ')}",
    ]
    slides.append({
        "id": "zones",
        "title": CATEGORIES["zones"]["title"],
        "description": CATEGORIES["zones"]["description"],
        "count": None,
        "summary_lines": summary,
        "image_b64": _encode(_slide_from_image(
            base_img, "zones",
            CATEGORIES["zones"]["title"],
            CATEGORIES["zones"]["description"],
            CATEGORIES["zones"]["color"],
            [], [], building_polygon,
            tile_x_center, tile_y_center, zoom, crop_offset, mpp,
            extra_summary_lines=summary,
            zones_overlay=zones,
        )),
    })

    return slides


def _encode(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("ascii")
