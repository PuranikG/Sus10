"""
Commercial calculator v2.0 wrapper.
Takes raw v2.0 plantation calc, adds BRSR/ESG metrics.
"""

from typing import Dict, Any
from services.sustenance_calculator_v2 import calculate_plantation_potential_v2


async def calculate_commercial_v2(
    db,
    property_id: str,
    property_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Commercial persona calculation.

    Input: commercial property document
    Output: BRSR/ESG metrics, Scope 2 reduction, GRI mapping
    """

    raw_calc = await calculate_plantation_potential_v2(
        db=db,
        usable_area_sqm=property_data.get("terrace_area_sqm", 5000),
        city=property_data.get("city", "Mumbai"),
        plantation_type=property_data.get("plantation_type", "ornamental"),
        growing_methods=property_data.get("preferred_methods", ["raised_bed", "nft_hydroponics"]),
        area_utilization_factor=0.78,
        survival_rate=0.85,
    )

    if "error" in raw_calc:
        return raw_calc

    co2_esg = raw_calc.get("co2_sequestered_kg_per_year_esg_eligible", 0)
    co2_per_tree_equivalent = 21  # kg CO2/tree/year (avg)
    trees_equivalent = round(co2_esg / co2_per_tree_equivalent)

    # Carbon offset value (₹650/kg CO2 corporate rate)
    carbon_offset_value_rupees = int(co2_esg * 650)

    # Scope 2 reduction (HVAC): planted area reduces ambient temp ~2-3°C = 15% HVAC load reduction
    hvac_kwh = property_data.get("annual_hvac_kwh", 100000)
    hvac_reduction_kwh = int(hvac_kwh * 0.15)
    hvac_savings_rupees = int(hvac_reduction_kwh * 8)  # ₹8/kWh

    gri_mapping = {
        "GRI_302": f"Energy reduction: {hvac_reduction_kwh} kWh/year from HVAC optimization",
        "GRI_303": f"Water management: {raw_calc.get('water_required_annual_litres', 0)} L/year from irrigation",
        "GRI_304": f"Biodiversity: {len(raw_calc.get('plant_mix', []))} plant species, {trees_equivalent} CO2-equivalent trees",
        "GRI_305": f"Emissions reduction: {co2_esg} kg CO2/year sequestered (Scope 3 offset)",
        "GRI_306": f"Waste reduction: Organic waste composted for soil amendment",
    }

    brsr_narrative = (
        f"Planted terrace {property_data.get('terrace_area_sqm', 5000)} sqm with {len(raw_calc.get('plant_mix', []))} "
        f"species, sequestering {co2_esg}kg CO2/year (Scope 3 offset). "
        f"Reduces HVAC demand by {hvac_reduction_kwh}kWh/year. "
        f"Aligns with GRI 302, 303, 304, 305."
    )

    return {
        "persona": "commercial",
        **raw_calc,
        "commercial_metrics": {
            "co2_esg_eligible_kg_year": co2_esg,
            "trees_equivalent": trees_equivalent,
            "carbon_offset_value_rupees": carbon_offset_value_rupees,
            "hvac_reduction_kwh_year": hvac_reduction_kwh,
            "hvac_savings_rupees_year": hvac_savings_rupees,
            "gri_mapping": gri_mapping,
            "brsr_section_a6_narrative": brsr_narrative,
        },
    }
