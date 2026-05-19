"""
Server-side persona-tuned PDF report builder using Jinja2 + WeasyPrint.

Personas:
  - rwa             : Resident Welfare Association / housing society
  - citizen_owner   : Individual homeowner
  - provider        : Solution provider (technical, BOQ-lite)
  - corporate_esg   : Corporate / BRSR-focused

Sections (toggle individually): summary, solar, plantation, biogas,
rainwater, subsidies, methodology.
"""
from __future__ import annotations
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")
_env = Environment(
    loader=FileSystemLoader(os.path.abspath(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)

PERSONAS = {
    "citizen_owner": {
        "label": "Homeowner",
        "accent": "#1a3d2b",
        "subtitle": (
            "Your personal sustenance plan — what your rooftop can generate, "
            "save, and grow, with simple monthly numbers."
        ),
        "summary_extra": (
            "Crafted as a homeowner's primer: monthly savings, indicative ROI, "
            "vendor next-step. Bring this to family discussions or your RWA meeting."
        ),
        "default_sections": {"summary", "solar", "plantation", "rainwater", "subsidies", "methodology"},
        "extra_block_html": (
            "<h3>Your next steps</h3><ul>"
            "<li>Compare 3 verified vendor quotes on the Sus10 AI marketplace.</li>"
            "<li>Apply for PMSGMBY central CFA before installation begins.</li>"
            "<li>Coordinate net-metering paperwork with your DISCOM (~3 weeks).</li>"
            "</ul>"
        ),
    },
    "rwa": {
        "label": "RWA / Housing society",
        "accent": "#0f3a3a",
        "subtitle": (
            "A community-scale sustenance plan for your colony — combining "
            "shared rooftops, common-area savings, and resident benefits."
        ),
        "summary_extra": (
            "Tailored for an RWA committee: common-area solar to cut society "
            "bills, shared rainwater capture, community composting, and a "
            "vendor framework you can put to a society vote."
        ),
        "default_sections": {"summary", "solar", "plantation", "biogas", "rainwater", "subsidies", "methodology"},
        "extra_block_html": (
            "<h3>RWA action checklist</h3><ul>"
            "<li>Pass an AGM resolution to authorise pilot rooftop solar on common areas.</li>"
            "<li>Apply for the Group Housing Society CFA (₹18,000/kW, cap 500 kW).</li>"
            "<li>Form a 3-member rooftop committee to manage vendor + DISCOM coordination.</li>"
            "<li>Communicate monthly savings projection to all residents.</li>"
            "</ul>"
        ),
    },
    "provider": {
        "label": "Solution provider",
        "accent": "#1e3a8a",
        "subtitle": (
            "Technical feasibility snapshot for a prospective installation. "
            "Use this to scope a site visit and shape your proposal."
        ),
        "summary_extra": (
            "Technical scoping report — capacity, footprint, base load assumptions "
            "and a sanity check on cost ranges. Validate with on-site survey."
        ),
        "default_sections": {"summary", "solar", "plantation", "biogas", "rainwater", "methodology"},
        "extra_block_html": (
            "<h3>For your scoping call</h3><ul>"
            "<li>Verify roof load capacity + shading at site (no aerial data substitutes for it).</li>"
            "<li>Confirm DISCOM net-metering category & sanction limit before sizing.</li>"
            "<li>Cross-check that the customer qualifies for the subsidies listed below.</li>"
            "<li>This client is a warm lead — reach out via the Sus10 AI provider portal.</li>"
            "</ul>"
        ),
    },
    "corporate_esg": {
        "label": "Corporate / ESG",
        "accent": "#0c4a6e",
        "subtitle": (
            "Sustenance performance snapshot with BRSR-aligned narrative — "
            "ready for board reviews, ESG disclosures, and impact reporting."
        ),
        "summary_extra": (
            "BRSR-aligned format — quantified environmental, social and "
            "operational impact ready to be lifted into your annual ESG report."
        ),
        "default_sections": {"summary", "solar", "plantation", "biogas", "rainwater", "subsidies", "methodology"},
        "extra_block_html": (
            "<h3>BRSR alignment notes</h3>"
            "<p>The metrics in this report map directly to BRSR Principle 6 (Environment) "
            "disclosures — scope-2 emissions avoided, water harvested, waste diverted from "
            "landfill, and renewable energy share. Pair with audited utility bills for "
            "your assurance pack.</p>"
        ),
    },
}


def _fmt_int(n: Any) -> str:
    try:
        return f"{int(round(float(n))):,}"
    except Exception:
        return "—"


def _fmt_inr(n: Any) -> str:
    try:
        return f"₹{int(round(float(n))):,}"
    except Exception:
        return "₹0"


def _pillar_card(
    key: str,
    title: str,
    glyph: str,
    color: str,
    headline: str,
    description: str,
    stats: List[Dict[str, str]],
    methodology: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "key": key, "title": title, "glyph": glyph, "color": color,
        "headline": headline, "description": description,
        "stats": stats, "methodology": methodology,
    }


def build_report_context(
    *,
    building: Dict[str, Any],
    sustenance: Dict[str, Any],
    persona: str,
    sections: Set[str],
    subsidies: Optional[List[Dict[str, Any]]] = None,
    intel_notes: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    p = PERSONAS.get(persona) or PERSONAS["citizen_owner"]

    summary = sustenance.get("summary") or {}
    pillars = sustenance.get("pillars") or {}

    # Format helpers for template
    summary_fmt = {
        "total_annual_savings_inr_fmt": _fmt_inr(summary.get("total_annual_savings_inr")),
        "total_co2_offset_tonnes_per_year_fmt": _fmt_int(summary.get("total_co2_offset_tonnes_per_year")),
        "solar_kwh_per_year_fmt": _fmt_int(summary.get("solar_kwh_per_year")),
        "rainwater_kl_per_year_fmt": _fmt_int(summary.get("rainwater_kl_per_year")),
    }

    pillars_to_show: List[Dict[str, Any]] = []

    if "solar" in sections and "solar" in pillars:
        s = pillars["solar"]
        pillars_to_show.append(_pillar_card(
            "solar", "Solar PV", "☀", "#f59e0b",
            f"{_fmt_int(s.get('installed_capacity_kwp'))} kWp installable",
            f"Rooftop solar PV can generate {_fmt_int(s.get('annual_generation_kwh'))} kWh of clean electricity per year on this building, offsetting a meaningful share of its grid demand.",
            [
                {"label": "Annual generation", "value": f"{_fmt_int(s.get('annual_generation_kwh'))} kWh"},
                {"label": "Annual savings", "value": _fmt_inr(s.get('annual_savings_inr'))},
                {"label": "CO₂ offset / year", "value": f"{_fmt_int(s.get('co2_offset_kg_per_year'))} kg"},
                {"label": "Capex estimate", "value": _fmt_inr(s.get('estimated_capex_inr'))},
                {"label": "Payback", "value": f"{s.get('payback_years', '—')} yrs"},
                {"label": "Panels", "value": f"~{_fmt_int(s.get('estimated_panels'))}"},
            ],
            s.get("methodology"),
        ))

    if "plantation" in sections and "plantation" in pillars:
        s = pillars["plantation"]
        pillars_to_show.append(_pillar_card(
            "plantation", "Greening & plantation", "🌱", "#14b8a6",
            f"{_fmt_int(s.get('total_plants_count'))} plants",
            f"A {s.get('plantation_type','mixed')} green-roof / terrace garden on the usable area can sequester carbon, drop indoor temperatures, and grow food on-site.",
            [
                {"label": "Food yield / year", "value": f"{_fmt_int(s.get('annual_food_yield_kg'))} kg"},
                {"label": "CO₂ sequestered", "value": f"{_fmt_int(s.get('co2_sequestered_kg_per_year'))} kg / yr"},
                {"label": "Temp reduction", "value": f"{s.get('temp_reduction_c','—')}°C"},
                {"label": "Capex estimate", "value": _fmt_inr(s.get('estimated_capex_inr'))},
                {"label": "Annual savings", "value": _fmt_inr(s.get('annual_savings_inr'))},
                {"label": "Maintenance", "value": s.get("maintenance_level", "Medium")},
            ],
            s.get("methodology"),
        ))

    if "biogas" in sections and "biogas" in pillars:
        s = pillars["biogas"]
        pillars_to_show.append(_pillar_card(
            "biogas", "Biogas & composting", "♻", "#16a34a",
            f"{_fmt_int(s.get('biogas_m3_per_year'))} m³ / year",
            f"Organic kitchen waste from this building (~{_fmt_int(s.get('daily_organic_waste_kg'))} kg/day) can be diverted from landfill and converted to cooking fuel and compost on-site.",
            [
                {"label": "Daily waste diverted", "value": f"{_fmt_int(s.get('daily_organic_waste_kg'))} kg"},
                {"label": "LPG saved / year", "value": f"{_fmt_int(s.get('lpg_equivalent_kg_per_year'))} kg"},
                {"label": "Annual savings", "value": _fmt_inr(s.get('annual_savings_inr'))},
                {"label": "Plant size", "value": s.get('recommended_plant_size', '—')},
                {"label": "CO₂ offset / year", "value": f"{_fmt_int(s.get('co2_offset_kg_per_year'))} kg"},
                {"label": "Capex estimate", "value": _fmt_inr(s.get('estimated_capex_inr'))},
            ],
            s.get("methodology"),
        ))

    if "rainwater" in sections and "rainwater" in pillars:
        s = pillars["rainwater"]
        pillars_to_show.append(_pillar_card(
            "rainwater", "Rainwater harvesting", "💧", "#0ea5e9",
            f"{_fmt_int(s.get('annual_yield_kiloliters'))} kL / year",
            f"With a catchment of {_fmt_int(s.get('catchment_area_sqm'))} sqm and {s.get('annual_rainfall_mm','—')} mm annual rainfall, this building can capture significant water — covering a meaningful share of non-potable demand.",
            [
                {"label": "Annual capture", "value": f"{_fmt_int(s.get('annual_yield_kiloliters'))} kL"},
                {"label": "Households served", "value": f"{_fmt_int(s.get('households_served'))}"},
                {"label": "Annual savings", "value": _fmt_inr(s.get('annual_savings_inr'))},
                {"label": "Storage tank", "value": s.get('recommended_storage_size', '—')},
                {"label": "Catchment area", "value": f"{_fmt_int(s.get('catchment_area_sqm'))} sqm"},
                {"label": "Capex estimate", "value": _fmt_inr(s.get('estimated_capex_inr'))},
            ],
            s.get("methodology"),
        ))

    building_view = {
        "name": building.get("name") or building.get("address"),
        "address": building.get("address"),
        "city": building.get("city"),
        "building_type": building.get("building_type") or "",
        "footprint_area_sqm_fmt": _fmt_int(building.get("building_footprint_area")),
        "usable_terrace_sqm_fmt": _fmt_int(building.get("usable_terrace_area")),
        "current_aqi": building.get("current_aqi"),
    }

    return {
        "accent": p["accent"],
        "persona_label": p["label"],
        "persona_subtitle": p["subtitle"],
        "persona_summary": p["summary_extra"],
        "persona_block_html": p["extra_block_html"],
        "sections": sections,
        "building": building_view,
        "summary": summary_fmt,
        "pillars_to_show": pillars_to_show,
        "subsidies": (subsidies or [])[:8] if "subsidies" in sections else [],
        "intel_notes": intel_notes or [],
        "generated_at": datetime.now(timezone.utc).strftime("%d %b %Y"),
        "report_id": f"R-{uuid.uuid4().hex[:8].upper()}",
    }


def render_report_pdf(context: Dict[str, Any]) -> bytes:
    """Render the Jinja2 template + WeasyPrint pipeline. Returns raw PDF bytes."""
    tpl = _env.get_template("report.html")
    html = tpl.render(**context)
    return HTML(string=html, base_url=os.path.abspath(TEMPLATES_DIR)).write_pdf()


def parse_sections(raw: Optional[str], default: Set[str]) -> Set[str]:
    if not raw:
        return set(default)
    parts = {p.strip() for p in raw.split(",") if p.strip()}
    return parts or set(default)
