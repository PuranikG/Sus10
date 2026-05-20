"""
Vendor one-pager 'Integrated Sustenance Roof Offering' PDF (P2 May 19, 2026).

A single-page A4 brochure that vendors can co-brand and hand to their warm
leads. Replaces the need for a heavyweight proposal generation module —
Sus10 supplies the integrated narrative, the vendor handles BOQ on their
own tools.

The PDF is sized for a specific building (or generic if no building_id) so
the vendor can attach concrete numbers.
"""
from __future__ import annotations
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")
_env = Environment(
    loader=FileSystemLoader(os.path.abspath(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _fmt_inr(value) -> str:
    if value is None:
        return "—"
    try:
        n = int(value)
    except (TypeError, ValueError):
        return str(value)
    if n >= 10_000_000:
        return f"₹{n/10_000_000:.1f} Cr"
    if n >= 100_000:
        return f"₹{n/100_000:.1f} L"
    if n >= 1000:
        return f"₹{n/1000:.0f}k"
    return f"₹{n}"


def _fmt_int(value) -> str:
    if value is None:
        return "—"
    try:
        return f"{int(round(float(value))):,}"
    except (TypeError, ValueError):
        return str(value)


def build_vendor_offering_context(
    *,
    vendor: Dict[str, Any],
    building: Optional[Dict[str, Any]] = None,
    sustenance: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Compose the Jinja template context for the vendor one-pager."""
    accent = vendor.get("accent_color") or "#0f3a3a"
    summary = (sustenance or {}).get("summary") or {}
    pillars_src = (sustenance or {}).get("pillars") or {}

    def pillar_view(key: str, default_headline: str, default_desc: str) -> Dict[str, str]:
        p = pillars_src.get(key) or {}
        if key == "solar":
            head = f"{_fmt_int(p.get('annual_generation_kwh'))} kWh/yr" if p else default_headline
            desc = f"~{_fmt_int(p.get('installed_capacity_kwp'))} kWp installable · {_fmt_inr(p.get('annual_savings_inr'))} saved/yr" if p else default_desc
        elif key == "biogas":
            head = f"{_fmt_int(p.get('biogas_m3_per_year'))} m³/yr" if p else default_headline
            desc = f"~{_fmt_int(p.get('daily_organic_waste_kg'))} kg waste/day diverted · {_fmt_inr(p.get('annual_savings_inr'))} LPG saved" if p else default_desc
        elif key == "rainwater":
            head = f"{_fmt_int(p.get('annual_yield_kiloliters'))} kL/yr" if p else default_headline
            desc = f"{_fmt_int(p.get('catchment_area_sqm'))} sqm catchment · ~{_fmt_int(p.get('households_served'))} households served" if p else default_desc
        else:  # plantation
            head = f"{_fmt_int(p.get('total_plants_count'))} plants" if p else default_headline
            desc = f"{_fmt_int(p.get('annual_food_yield_kg'))} kg food/yr · {p.get('temp_reduction_c','—')}°C cooling" if p else default_desc
        return {"headline": head, "desc": desc}

    return {
        "accent": accent,
        "vendor": vendor,
        "building": {
            "address": (building or {}).get("address") or "",
            "city": (building or {}).get("city") or "",
            "building_type": (building or {}).get("building_type") or "",
        } if building else {"address": "", "city": "", "building_type": ""},
        "summary": {
            "annual_savings_fmt": _fmt_inr(summary.get("total_annual_savings_inr")) if summary else "Estimated post-survey",
            "co2_tonnes_fmt": _fmt_int(summary.get("total_co2_offset_tonnes_per_year")) if summary else "—",
            "roof_area_fmt": _fmt_int((building or {}).get("usable_terrace_area") or (building or {}).get("building_footprint_area")) if building else "—",
            "floors": (building or {}).get("floors_estimated") or 1,
        },
        "pillars": {
            "solar": pillar_view("solar", "Sized post-survey", "Roof-mounted PV with net-metering"),
            "biogas": pillar_view("biogas", "Society-scale", "Kitchen-waste to cooking fuel"),
            "rainwater": pillar_view("rainwater", "Catchment-based", "Roof to recharge / storage tank"),
            "plantation": pillar_view("plantation", "Container-based", "Edible + ornamental green roof"),
        },
        "generated_at": datetime.now(timezone.utc).strftime("%d %b %Y"),
        "report_id": f"V-{uuid.uuid4().hex[:8].upper()}",
    }


def render_vendor_offering_pdf(context: Dict[str, Any]) -> bytes:
    """Render the vendor one-pager via Jinja2 + WeasyPrint."""
    tpl = _env.get_template("vendor_offering.html")
    html = tpl.render(**context)
    return HTML(string=html, base_url=os.path.abspath(TEMPLATES_DIR)).write_pdf()
