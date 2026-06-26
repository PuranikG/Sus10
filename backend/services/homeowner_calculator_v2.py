"""
Homeowner calculator v2.0 wrapper.
Takes raw v2.0 plantation calc, adds homeowner-specific metrics.
"""

from typing import Dict, Any
from services.sustenance_calculator_v2 import calculate_plantation_potential_v2


async def calculate_homeowner_v2(
    db,
    building_id: str,
    building_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Homeowner persona calculation.

    Input: building document from DB
    Output: Homeowner-specific metrics (not ESG/BRSR language)
    """

    raw_calc = await calculate_plantation_potential_v2(
        db=db,
        usable_area_sqm=building_data.get("terrace_area_sqm", 500),
        city=building_data.get("city", "Mumbai"),
        plantation_type=building_data.get("plantation_type", "mixed"),
        growing_methods=building_data.get("preferred_methods", ["raised_bed", "nft_hydroponics"]),
        area_utilization_factor=0.78,
        survival_rate=0.85,
    )

    if "error" in raw_calc:
        return raw_calc

    adjusted_yield = raw_calc.get("annual_food_yield_kg", 0) or 0

    # Estimate: avg family meal = 0.5 kg vegetables/day
    meals_equivalent = int((adjusted_yield / 365) / 0.5) if adjusted_yield else 0

    # Cost savings: ₹150 per kg vegetables (conservative)
    annual_savings_rupees = int(adjusted_yield * 150)
    monthly_savings = int(annual_savings_rupees / 12)

    return {
        "persona": "homeowner",
        **raw_calc,
        "homeowner_metrics": {
            "monthly_bill_savings_rupees": monthly_savings,
            "annual_savings_rupees": annual_savings_rupees,
            "family_meals_equivalent_per_year": meals_equivalent,
            "groceries_saved_kg": adjusted_yield,
        },
    }
