"""
Colony calculator v2.0 wrapper.
Takes raw v2.0 plantation calc, aggregates across buildings, adds per-flat metrics.
"""

from typing import Dict, Any
from services.sustenance_calculator_v2 import calculate_plantation_potential_v2


async def calculate_colony_v2(
    db,
    colony_id: str,
    colony_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Colony persona calculation.

    Input: colony document (multiple buildings)
    Output: Aggregate metrics + per-flat breakdown
    """

    total_area_sqm = colony_data.get("total_terrace_area_sqm", 1000)
    num_buildings = len(colony_data.get("buildings", []))
    num_families = colony_data.get("num_families", num_buildings * 20)  # Estimate

    raw_calc = await calculate_plantation_potential_v2(
        db=db,
        usable_area_sqm=total_area_sqm,
        city=colony_data.get("city", "Mumbai"),
        plantation_type=colony_data.get("plantation_type", "mixed"),
        growing_methods=colony_data.get("preferred_methods", ["raised_bed", "nft_hydroponics"]),
        area_utilization_factor=0.78,
        survival_rate=0.85,
    )

    if "error" in raw_calc:
        return raw_calc

    total_yield = raw_calc.get("annual_food_yield_kg", 0) or 0
    total_savings = int(total_yield * 150)

    yield_per_family = round(total_yield / num_families, 1) if num_families else 0
    savings_per_family_annual = int(total_savings / num_families) if num_families else 0
    savings_per_family_monthly = int(savings_per_family_annual / 12)

    co2_per_family = round(
        raw_calc.get("co2_sequestered_kg_per_year_total", 0) / num_families, 1
    ) if num_families else 0

    return {
        "persona": "colony",
        **raw_calc,
        "colony_metrics": {
            "num_buildings": num_buildings,
            "num_families": num_families,
            "total_annual_savings_rupees": total_savings,
            "per_family_monthly_savings": savings_per_family_monthly,
            "per_family_annual_savings": savings_per_family_annual,
            "yield_per_family_kg_year": yield_per_family,
            "co2_offset_per_family_kg_year": co2_per_family,
            "committee_approval_message": (
                f"{num_families} families, ₹{savings_per_family_monthly}/family/month savings, "
                f"{yield_per_family}kg vegetables/family/year"
            ),
        },
    }
