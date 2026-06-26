"""
Sus10 AI - Plantation Potential Calculator v2.0
Uses per-plant values from plants DB.
Applies k_infra (0.78) + survival_rate (0.85).
Returns both total and ESG-eligible CO2.

SHARED by homeowner, colony, and commercial personas.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase


async def query_plants(
    db: AsyncIOMotorDatabase,
    city: str,
    growing_methods: List[str],
    plantation_type: str = "mixed"
) -> List[Dict[str, Any]]:
    """
    Query plants collection for recommendations.

    Filters:
    - Active plants only
    - Climate zone matches city
    - At least one growing method supported by plant
    - Type preference if specified (food, ornamental, mixed)

    Returns: List of plants, sorted by terrace_suitability_score DESC

    From plant DB schema:
    - co2_kg_per_plant_yr: per-plant CO2 value (from category defaults or custom)
    - co2_for_esg_reporting: boolean (True only for perennial, medicinal, woody, creeper, ornamental, butterfly)
    - yield_kg_per_plant_yr: per-plant food yield
    - methods: dict with booleans for {grow_bag, raised_bed, nft_hydroponics, dwc_hydroponics, vertical_panel, trellis}
    - climate_zones: array
    - plant_type: "food" or "ornamental"
    """
    from services.city_data import get_city_params

    city_params = get_city_params(city.lower())
    climate_zone = city_params.get("climate_zone", "composite")

    query = {
        "active": True,
        "climate_zones": climate_zone,
    }

    if growing_methods:
        method_filters = [
            {f"methods.{method}": True} for method in growing_methods
        ]
        query["$or"] = method_filters

    if plantation_type == "food":
        query["plant_type"] = "food"
    elif plantation_type == "ornamental":
        query["plant_type"] = "ornamental"
    # "mixed" returns all

    cursor = (
        db.plants.find(query)
        .sort("terrace_suitability_score", -1)
        .limit(20)
    )
    plants = await cursor.to_list(20)

    for plant in plants:
        plant.pop("_id", None)

    return plants


async def calculate_plantation_potential_v2(
    db: AsyncIOMotorDatabase,
    usable_area_sqm: float,
    city: str,
    plantation_type: str = "mixed",
    growing_methods: List[str] = None,
    area_utilization_factor: float = 0.78,
    survival_rate: float = 0.85,
    planting_density: float = 1.0,
) -> Dict[str, Any]:
    """
    v2.0 Calculation with per-plant DB values.

    Steps:
    1. Apply k_infra to get net plantable area
    2. Query plants DB for recommendations
    3. Distribute plants across species
    4. Calculate CO2/yield using per-plant values
    5. Apply survival_rate to get risk-adjusted estimates
    6. Separate ESG-eligible CO2 (only where co2_for_esg_reporting=True)

    Returns: Raw calculation (shared by all 3 personas)
    """

    if growing_methods is None:
        growing_methods = ["raised_bed", "nft_hydroponics", "grow_bag"]

    # STEP 1: Apply k_infra
    net_plantable_area_sqm = usable_area_sqm * area_utilization_factor
    net_plantable_area_sqft = round(net_plantable_area_sqm * 10.764)

    # STEP 2: Query plants DB
    recommended_plants = await query_plants(
        db=db,
        city=city,
        growing_methods=growing_methods,
        plantation_type=plantation_type
    )

    if not recommended_plants:
        return {
            "error": f"No plants found for city={city}, methods={growing_methods}, type={plantation_type}",
            "version": "v2.0",
        }

    # STEP 3: Distribute plants across species
    num_species = len(recommended_plants)
    total_plants_before_distribution = int(net_plantable_area_sqm * planting_density * 10.764)
    plants_per_species = max(1, int(total_plants_before_distribution / num_species))

    # STEP 4: Calculate CO2/yield using per-plant DB values
    total_plants = 0
    co2_total_kg_yr = 0.0
    co2_esg_eligible_kg_yr = 0.0
    yield_total_kg_yr = 0.0
    plant_mix = []

    for plant in recommended_plants:
        count = plants_per_species
        total_plants += count

        plant_co2 = count * plant.get("co2_kg_per_plant_yr", 0)
        co2_total_kg_yr += plant_co2

        if plant.get("co2_for_esg_reporting", False):
            co2_esg_eligible_kg_yr += plant_co2

        plant_yield = count * plant.get("yield_kg_per_plant_yr", 0)
        yield_total_kg_yr += plant_yield

        plant_mix.append({
            "common_name": plant.get("common_name", "Unknown"),
            "plant_category": plant.get("plant_category", "unknown"),
            "count": count,
            "yield_kg_yr": round(plant_yield, 1),
            "co2_kg_yr": round(plant_co2, 1),
            "co2_for_esg_reporting": plant.get("co2_for_esg_reporting", False),
        })

    # STEP 5: Apply survival_rate
    adjusted_total_plants = int(total_plants * survival_rate)
    adjusted_yield_kg_yr = round(yield_total_kg_yr * survival_rate, 1)
    adjusted_co2_total_kg_yr = round(co2_total_kg_yr * survival_rate)
    adjusted_co2_esg_kg_yr = round(co2_esg_eligible_kg_yr * survival_rate)

    # Water calculation
    water_lpd = adjusted_total_plants * 2.0
    water_annual_litres = round(water_lpd * 365)

    return {
        "version": "v2.0",
        "net_plantable_area_sqm": round(net_plantable_area_sqm, 1),
        "net_plantable_area_sqft": net_plantable_area_sqft,
        "k_infra_factor": area_utilization_factor,
        "total_plants_count": total_plants,
        "survival_rate": survival_rate,
        "adjusted_plants_count": adjusted_total_plants,
        "plant_mix": plant_mix,
        "annual_food_yield_kg": adjusted_yield_kg_yr if adjusted_yield_kg_yr > 0 else None,
        "co2_sequestered_kg_per_year_total": adjusted_co2_total_kg_yr,
        "co2_sequestered_kg_per_year_esg_eligible": adjusted_co2_esg_kg_yr,
        "water_required_lpd": round(water_lpd),
        "water_required_annual_litres": water_annual_litres,
        "city": city,
        "plantation_type": plantation_type,
        "growing_methods": growing_methods,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
