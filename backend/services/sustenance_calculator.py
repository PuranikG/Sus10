"""
Sus10 AI - Sustenance Potential Calculator
============================================
Computes 4-pillar sustenance potential for rooftops:
  1. Solar PV generation (MNRE GHI-based, 20° tilt, equator-facing)
  2. Rooftop plantation (container/grow-bag/NFT, plants ≤7 ft only)
  3. Biogas (occupancy-based organic waste -> m³/day)
  4. Rainwater harvesting (catchment × rainfall × runoff coefficient)

All formulas are deterministic. No external API calls. Cheap to run in batch.

References:
- MNRE Solar Radiation Handbook (annual GHI kWh/m²/day for Indian cities)
- IMD/CGWB annual rainfall averages
- CPCB Guidelines for Rainwater Harvesting (runoff coefficient 0.80-0.85)
- IS 16190:2014 Biogas standards (residential organic waste ~0.4 kg/person/day)
"""

from typing import Dict, Any, List, Optional
import math


# ===================== MNRE GHI LOOKUP (kWh/m²/day annual avg) =====================
# Source: MNRE Solar Radiation Handbook + NREL India Solar Resource Maps
MNRE_GHI = {
    "bangalore": 5.50,
    "bengaluru": 5.50,
    "mumbai": 5.20,
    "delhi": 5.30,
    "new delhi": 5.30,
    "gurugram": 5.30,
    "gurgaon": 5.30,
    "noida": 5.25,
    "faridabad": 5.30,
    "ghaziabad": 5.25,
    "navi mumbai": 5.20,
    "pune": 5.40,
    "hyderabad": 5.60,
    "chennai": 5.50,
    "kolkata": 4.80,
    "ahmedabad": 5.80,
    "jaipur": 5.70,
    "lucknow": 5.20,
    "amravati": 5.50,
    "thane": 5.20,
    "default": 5.30,  # India average
}

# ===================== ANNUAL RAINFALL (mm) =====================
# Source: IMD long-period averages
ANNUAL_RAINFALL_MM = {
    "bangalore": 970,
    "bengaluru": 970,
    "mumbai": 2400,
    "delhi": 770,
    "new delhi": 770,
    "gurugram": 750,
    "gurgaon": 750,
    "noida": 760,
    "faridabad": 750,
    "ghaziabad": 760,
    "navi mumbai": 2300,
    "pune": 720,
    "hyderabad": 800,
    "chennai": 1400,
    "kolkata": 1750,
    "ahmedabad": 800,
    "jaipur": 650,
    "lucknow": 950,
    "amravati": 850,
    "thane": 2400,
    "default": 1100,
}

# ===================== SOLAR LATITUDE (for tilt) =====================
CITY_LATITUDE = {
    "bangalore": 12.97, "bengaluru": 12.97,
    "mumbai": 19.08, "navi mumbai": 19.03, "thane": 19.22,
    "delhi": 28.61, "new delhi": 28.61,
    "gurugram": 28.46, "gurgaon": 28.46,
    "noida": 28.54, "faridabad": 28.41, "ghaziabad": 28.67,
    "pune": 18.52,
    "hyderabad": 17.39,
    "chennai": 13.08,
    "kolkata": 22.57,
    "ahmedabad": 23.02,
    "jaipur": 26.92,
    "lucknow": 26.85,
    "amravati": 20.93,
}


# ===================== SOLAR PV =====================
def calculate_solar_potential(
    usable_area_sqm: float,
    city: str,
    panel_efficiency: float = 0.20,
    performance_ratio: float = 0.75,
    area_utilization: float = 0.65,
) -> Dict[str, Any]:
    """
    Solar PV generation using MNRE GHI for Indian cities.

    Formula:
      Installable kWp = usable_area × area_util × panel_efficiency × 1.0 kW/m² (STC)
      Annual kWh = Installable kWp × GHI × 365 × performance_ratio

    Defaults:
      - area_utilization = 0.65 (35% lost to walkways, AHU, water tanks, shadow)
      - panel_efficiency = 20% (modern mono-PERC)
      - performance_ratio = 0.75 (real-world soiling, temperature, inverter)

    Optimal tilt = latitude (approx). User instructed 20° for India broad use.
    """
    city_key = (city or "").lower().strip()
    ghi = MNRE_GHI.get(city_key, MNRE_GHI["default"])
    latitude = CITY_LATITUDE.get(city_key, 20.0)

    effective_area = usable_area_sqm * area_utilization
    installed_kwp = effective_area * panel_efficiency  # 1 kW/m² STC
    annual_kwh = installed_kwp * ghi * 365 * performance_ratio
    monthly_kwh = annual_kwh / 12

    # Financial: avg commercial tariff in India ~₹8/kWh
    annual_savings_inr = annual_kwh * 8
    # CO2 offset: Indian grid emission factor 0.82 kgCO2/kWh (CEA 2023)
    co2_offset_kg_yr = annual_kwh * 0.82

    # Panel orientation: south-facing in northern hemisphere (India is entirely N)
    optimal_tilt = round(latitude, 1) if latitude > 0 else 20.0
    panel_orientation = "South-facing (azimuth 180°)"
    user_requested_tilt = 20.0

    return {
        "installed_capacity_kwp": round(installed_kwp, 2),
        "annual_generation_kwh": round(annual_kwh),
        "monthly_generation_kwh": round(monthly_kwh),
        "ghi_kwh_per_m2_per_day": ghi,
        "panel_efficiency_pct": round(panel_efficiency * 100, 1),
        "area_utilization_pct": round(area_utilization * 100, 1),
        "effective_area_sqm": round(effective_area, 1),
        "optimal_tilt_degrees": optimal_tilt,
        "recommended_tilt_degrees": user_requested_tilt,
        "panel_orientation": panel_orientation,
        "annual_savings_inr": round(annual_savings_inr),
        "co2_offset_kg_per_year": round(co2_offset_kg_yr),
        "methodology": (
            f"Installed kWp = {round(effective_area,1)} m² × {panel_efficiency} = "
            f"{round(installed_kwp,2)} kWp. Annual kWh = kWp × {ghi} GHI × 365 × "
            f"{performance_ratio} PR = {round(annual_kwh)} kWh/year. "
            f"Tilt: {user_requested_tilt}° (general) or {optimal_tilt}° (latitude-optimal). "
            f"Orientation: south-facing for {city}."
        ),
        "data_source": "MNRE Solar Radiation Handbook + CEA Grid Emission Factor",
    }


# ===================== ROOFTOP PLANTATION =====================
# Container/Grow-bag/NFT only — plants <= 7 ft
# Mix of food crops and ornamentals; same biophysics
GROWING_METHODS = {
    "grow_bags": {"plants_per_sqm": 4, "water_lpd_per_plant": 2.5, "type": "vegetables_fruits"},
    "nft_hydroponics": {"plants_per_sqm": 16, "water_lpd_per_plant": 0.5, "type": "leafy_greens"},
    "raised_planters": {"plants_per_sqm": 6, "water_lpd_per_plant": 2.0, "type": "herbs_vegetables"},
    "ornamental_containers": {"plants_per_sqm": 3, "water_lpd_per_plant": 3.0, "type": "ornamental"},
}

# Common rooftop-suitable plants (all ≤7 ft, container-friendly)
ROOFTOP_PLANT_CATALOG = {
    "food": [
        {"name": "Tomato", "scientific": "Solanum lycopersicum", "max_height_ft": 6, "yield_kg_per_plant_yr": 4.0, "method": "grow_bags"},
        {"name": "Brinjal (Eggplant)", "scientific": "Solanum melongena", "max_height_ft": 4, "yield_kg_per_plant_yr": 3.0, "method": "grow_bags"},
        {"name": "Chilli", "scientific": "Capsicum annuum", "max_height_ft": 3, "yield_kg_per_plant_yr": 1.5, "method": "grow_bags"},
        {"name": "Okra (Bhindi)", "scientific": "Abelmoschus esculentus", "max_height_ft": 5, "yield_kg_per_plant_yr": 2.0, "method": "grow_bags"},
        {"name": "Spinach (Palak)", "scientific": "Spinacia oleracea", "max_height_ft": 1, "yield_kg_per_plant_yr": 0.3, "method": "nft_hydroponics"},
        {"name": "Coriander", "scientific": "Coriandrum sativum", "max_height_ft": 2, "yield_kg_per_plant_yr": 0.2, "method": "nft_hydroponics"},
        {"name": "Mint (Pudina)", "scientific": "Mentha", "max_height_ft": 2, "yield_kg_per_plant_yr": 0.4, "method": "raised_planters"},
        {"name": "Curry Leaf", "scientific": "Murraya koenigii", "max_height_ft": 6, "yield_kg_per_plant_yr": 1.0, "method": "grow_bags"},
        {"name": "Lemon (Dwarf)", "scientific": "Citrus limon", "max_height_ft": 7, "yield_kg_per_plant_yr": 5.0, "method": "grow_bags"},
        {"name": "Papaya (Dwarf)", "scientific": "Carica papaya", "max_height_ft": 7, "yield_kg_per_plant_yr": 10.0, "method": "grow_bags"},
    ],
    "ornamental": [
        {"name": "Marigold", "scientific": "Tagetes erecta", "max_height_ft": 3, "method": "ornamental_containers"},
        {"name": "Hibiscus", "scientific": "Hibiscus rosa-sinensis", "max_height_ft": 7, "method": "ornamental_containers"},
        {"name": "Bougainvillea (Dwarf)", "scientific": "Bougainvillea glabra", "max_height_ft": 5, "method": "ornamental_containers"},
        {"name": "Tulsi (Holy Basil)", "scientific": "Ocimum sanctum", "max_height_ft": 3, "method": "raised_planters"},
        {"name": "Aloe Vera", "scientific": "Aloe barbadensis", "max_height_ft": 2, "method": "ornamental_containers"},
        {"name": "Jasmine", "scientific": "Jasminum sambac", "max_height_ft": 6, "method": "ornamental_containers"},
    ],
}


def calculate_plantation_potential(
    usable_area_sqm: float,
    plantation_type: str = "mixed",  # food | ornamental | mixed
    area_utilization: float = 0.70,
    planting_density: float = 1.0,   # user multiplier: 0.5–3.0 plants/sqft scale
) -> Dict[str, Any]:
    """
    Rooftop container plantation (grow bags + NFT channels + raised planters).
    All plants ≤ 7 ft. No in-ground/outdoor trees.

    Default mix (when plantation_type='mixed'):
      - 50% grow bags (vegetables/fruits)
      - 30% NFT hydroponics (leafy greens)
      - 20% raised planters (herbs)

    When 'food': 60% grow bags + 40% NFT
    When 'ornamental': 100% ornamental containers
    """
    effective_area = usable_area_sqm * area_utilization

    if plantation_type == "food":
        mix = {"grow_bags": 0.6, "nft_hydroponics": 0.4}
    elif plantation_type == "ornamental":
        mix = {"ornamental_containers": 1.0}
    else:  # mixed
        mix = {"grow_bags": 0.5, "nft_hydroponics": 0.3, "raised_planters": 0.2}

    total_plants = 0
    total_water_lpd = 0
    breakdown = []
    for method, share in mix.items():
        area_for_method = effective_area * share
        params = GROWING_METHODS[method]
        plants = int(area_for_method * params["plants_per_sqm"] * planting_density)
        water = plants * params["water_lpd_per_plant"]
        total_plants += plants
        total_water_lpd += water
        breakdown.append({
            "method": method,
            "area_sqm": round(area_for_method, 1),
            "plants_count": plants,
            "water_lpd": round(water, 1),
            "plant_type": params["type"],
        })

    # CO2 sequestration: container plants ~2-5 kg CO2/year/plant
    co2_sequestered_kg_yr = total_plants * 3.5

    # Food yield estimate (only food/mixed)
    annual_food_yield_kg = 0
    if plantation_type in ("food", "mixed"):
        # Avg yield across food plants ~3 kg/plant/year, but only ~60% are food-yielding plants
        food_plants_fraction = 0.6 if plantation_type == "mixed" else 1.0
        annual_food_yield_kg = total_plants * food_plants_fraction * 3.0

    # Recommended species (top 5 by suitability)
    if plantation_type == "food":
        species = ROOFTOP_PLANT_CATALOG["food"][:6]
    elif plantation_type == "ornamental":
        species = ROOFTOP_PLANT_CATALOG["ornamental"]
    else:
        species = ROOFTOP_PLANT_CATALOG["food"][:4] + ROOFTOP_PLANT_CATALOG["ornamental"][:2]

    return {
        "plantation_type": plantation_type,
        "effective_area_sqm": round(effective_area, 1),
        "area_utilization_pct": round(area_utilization * 100, 1),
        "total_plants_count": total_plants,
        "water_required_lpd": round(total_water_lpd),
        "water_required_annual_kl": round(total_water_lpd * 365 / 1000, 1),
        "annual_food_yield_kg": round(annual_food_yield_kg, 1) if annual_food_yield_kg else None,
        "co2_sequestered_kg_per_year": round(co2_sequestered_kg_yr),
        "growing_methods_breakdown": breakdown,
        "recommended_species": species,
        "methodology": (
            f"Container plantation on {round(effective_area,1)} m² ({round(area_utilization*100)}% utilization). "
            f"All species ≤7 ft height. Mix: {plantation_type}. "
            f"CO2 estimate based on 3.5 kg/plant/year for container plants."
        ),
        "constraints": [
            "Only plants with max height ≤ 7 ft (terrace structural & wind safety)",
            "Container/grow-bag/NFT based — no in-ground planting",
            "Requires waterproofing layer and drip irrigation setup",
            "Avoid heavy soil — use cocopeat + compost mix",
        ],
        "data_source": "ICAR + KVK rooftop farming guidelines",
    }


# ===================== BIOGAS =====================
# Occupancy-based organic waste estimation
OCCUPANCY_DEFAULTS = {
    # building_type: (people_per_sqm_built, waste_kg_per_person_per_day)
    "residential": (0.04, 0.40),
    "it_park": (0.10, 0.20),
    "commercial": (0.08, 0.25),
    "hospital": (0.05, 0.50),
    "college": (0.15, 0.30),
    "industrial": (0.02, 0.15),
}


def calculate_biogas_potential(
    building_footprint_sqm: float,
    building_type: str,
    floors: int = 1,
    occupants_override: Optional[int] = None,
    families: Optional[int] = None,
    waste_kg_per_family_per_day: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Biogas from organic kitchen/canteen/food waste.

    Override priority:
      1. (families × waste_kg_per_family_per_day) — when the user adjusts the
         kitchen-waste slider on the Sustenance Potential page.
      2. occupants_override × waste_per_person_per_day
      3. derived from built-up area & type-default occupancy.

    Formula:
      Daily organic waste (kg) = occupants × waste_per_person_per_day
      Biogas yield = 0.05-0.10 m³/kg organic waste (avg 0.08 m³/kg)
      LPG equivalent: 1 m³ biogas ≈ 0.45 kg LPG
    """
    btype = (building_type or "commercial").lower()
    people_density, waste_per_person = OCCUPANCY_DEFAULTS.get(
        btype, OCCUPANCY_DEFAULTS["commercial"]
    )

    built_up_area = building_footprint_sqm * floors

    daily_waste_source = "occupancy_default"
    if families is not None and waste_kg_per_family_per_day is not None:
        daily_organic_waste_kg = float(families) * float(waste_kg_per_family_per_day)
        # Back-compute equivalent occupant count for display continuity
        # assuming an average family size of 4.
        occupants = int(families) * 4
        daily_waste_source = "user_kitchen_waste"
    elif occupants_override:
        occupants = occupants_override
        daily_organic_waste_kg = occupants * waste_per_person
        daily_waste_source = "user_occupants_override"
    else:
        occupants = int(built_up_area * people_density)
        daily_organic_waste_kg = occupants * waste_per_person
    annual_waste_kg = daily_organic_waste_kg * 365

    # Biogas yield: 0.08 m³ per kg organic waste
    biogas_m3_per_day = daily_organic_waste_kg * 0.08
    biogas_m3_per_year = biogas_m3_per_day * 365

    # LPG savings: 1 m³ biogas ≈ 0.45 kg LPG
    lpg_equivalent_kg_yr = biogas_m3_per_year * 0.45
    # LPG price ~₹100/kg commercial
    savings_inr_yr = lpg_equivalent_kg_yr * 100

    # CO2 offset: avoiding LPG + waste-to-landfill methane (very significant)
    # LPG CO2: 3.0 kg/kg; landfill methane (CH4): ~50 kg CO2e per ton organic waste
    co2_offset_lpg = lpg_equivalent_kg_yr * 3.0
    co2_offset_methane = (annual_waste_kg / 1000) * 50
    co2_total_kg_yr = co2_offset_lpg + co2_offset_methane

    # Plant sizing
    if biogas_m3_per_day < 1:
        plant_size = "Mini (1-2 m³ digester, household-scale)"
        capex_inr = 35000
    elif biogas_m3_per_day < 5:
        plant_size = "Small (5 m³ digester, community-scale)"
        capex_inr = 150000
    elif biogas_m3_per_day < 15:
        plant_size = "Medium (15 m³ digester, society-scale)"
        capex_inr = 400000
    else:
        plant_size = "Large (25+ m³ digester, commercial-scale)"
        capex_inr = 800000

    return {
        "occupants_estimated": occupants,
        "families_estimated": (int(families) if families is not None else max(1, occupants // 4)),
        "people_density_per_sqm": people_density,
        "waste_kg_per_family_per_day_used": (
            float(waste_kg_per_family_per_day)
            if waste_kg_per_family_per_day is not None
            else round(waste_per_person * 4, 2)
        ),
        "daily_waste_source": daily_waste_source,
        "built_up_area_sqm": round(built_up_area, 1),
        "floors_assumed": floors,
        "daily_organic_waste_kg": round(daily_organic_waste_kg, 1),
        "annual_waste_diverted_kg": round(annual_waste_kg),
        "biogas_m3_per_day": round(biogas_m3_per_day, 2),
        "biogas_m3_per_year": round(biogas_m3_per_year),
        "lpg_equivalent_kg_per_year": round(lpg_equivalent_kg_yr),
        "annual_savings_inr": round(savings_inr_yr),
        "recommended_plant_size": plant_size,
        "estimated_capex_inr": capex_inr,
        "co2_offset_kg_per_year": round(co2_total_kg_yr),
        "methodology": (
            f"Daily organic waste: {round(daily_organic_waste_kg,1)} kg/day. "
            f"Biogas yield: 0.08 m³/kg = {round(biogas_m3_per_day,2)} m³/day. "
            f"LPG saved: ~₹{round(savings_inr_yr)}/yr. (Source: {daily_waste_source})"
        ),
        "data_source": "IS 16190:2014 + CPCB Solid Waste Management Rules 2016",
    }


# ===================== RAINWATER HARVESTING =====================
def calculate_rainwater_potential(
    catchment_area_sqm: float,
    city: str,
    runoff_coefficient: float = 0.85,
    first_flush_loss_pct: float = 0.05,
) -> Dict[str, Any]:
    """
    Rainwater harvesting yield.

    Formula:
      Yield (liters) = catchment_area × annual_rainfall × runoff_coefficient × (1 - first_flush)

    Defaults:
      - runoff_coefficient = 0.85 (RCC roof — CPCB standard)
      - first_flush_loss = 5% (dirt/debris flushed)
    """
    city_key = (city or "").lower().strip()
    rainfall_mm = ANNUAL_RAINFALL_MM.get(city_key, ANNUAL_RAINFALL_MM["default"])

    # 1 mm rainfall on 1 m² = 1 liter
    gross_yield_l = catchment_area_sqm * rainfall_mm
    net_yield_l = gross_yield_l * runoff_coefficient * (1 - first_flush_loss_pct)
    net_yield_kl = net_yield_l / 1000

    # Municipal water cost in India: ~₹15-25/kL (using ₹20)
    annual_savings_inr = net_yield_kl * 20

    # Household water need: ~135 LPCD × 4 people = 540 L/day = ~197 kL/year
    households_supported = net_yield_kl / 197

    # Recharge potential (if used for groundwater recharge)
    recharge_pits_recommended = max(1, int(catchment_area_sqm / 200))

    return {
        "catchment_area_sqm": round(catchment_area_sqm, 1),
        "annual_rainfall_mm": rainfall_mm,
        "runoff_coefficient": runoff_coefficient,
        "first_flush_loss_pct": round(first_flush_loss_pct * 100, 1),
        "annual_yield_liters": round(net_yield_l),
        "annual_yield_kiloliters": round(net_yield_kl, 1),
        "annual_savings_inr": round(annual_savings_inr),
        "households_supported": round(households_supported, 1),
        "recharge_pits_recommended": recharge_pits_recommended,
        "storage_tank_size_recommended_l": int(net_yield_l * 0.1),  # ~10% as buffer
        "methodology": (
            f"Yield = {round(catchment_area_sqm,1)} m² × {rainfall_mm} mm × "
            f"{runoff_coefficient} runoff × {1-first_flush_loss_pct} flush = "
            f"{round(net_yield_kl,1)} kL/year (offsets ~{round(households_supported,1)} household-years)."
        ),
        "data_source": "IMD rainfall LPA + CPCB/CGWB Rainwater Harvesting Manual",
    }


# ===================== MASTER CALCULATOR =====================
def calculate_full_sustenance_potential(
    building: Dict[str, Any],
    plantation_type: str = "mixed",
    floors: int = 1,
    occupants_override: Optional[int] = None,
    families: Optional[int] = None,
    waste_kg_per_family_per_day: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Master function: computes all 4 pillars for a single building.
    `building` should contain: city, building_footprint_area, usable_terrace_area, building_type
    """
    city = building.get("city", "")
    footprint = building.get("building_footprint_area") or building.get("total_footprint_area") or 0
    terrace = building.get("usable_terrace_area") or (footprint * 0.7)
    btype = building.get("building_type", "commercial")

    # If terrace not provided, assume 70% of footprint is usable rooftop
    if not terrace and footprint:
        terrace = footprint * 0.7

    solar = calculate_solar_potential(usable_area_sqm=terrace, city=city)
    plantation = calculate_plantation_potential(
        usable_area_sqm=terrace, plantation_type=plantation_type
    )
    biogas = calculate_biogas_potential(
        building_footprint_sqm=footprint, building_type=btype,
        floors=floors, occupants_override=occupants_override,
        families=families,
        waste_kg_per_family_per_day=waste_kg_per_family_per_day,
    )
    rainwater = calculate_rainwater_potential(catchment_area_sqm=footprint, city=city)

    # Aggregate scores
    total_annual_savings_inr = (
        solar["annual_savings_inr"] +
        biogas["annual_savings_inr"] +
        rainwater["annual_savings_inr"]
    )
    total_co2_offset_kg_yr = (
        solar["co2_offset_kg_per_year"] +
        plantation["co2_sequestered_kg_per_year"] +
        biogas["co2_offset_kg_per_year"]
    )

    return {
        "building_id": building.get("building_id"),
        "building_name": building.get("name") or building.get("address"),
        "city": city,
        "footprint_sqm": round(footprint, 1),
        "usable_terrace_sqm": round(terrace, 1),
        "pillars": {
            "solar": solar,
            "plantation": plantation,
            "biogas": biogas,
            "rainwater": rainwater,
        },
        "summary": {
            "total_annual_savings_inr": round(total_annual_savings_inr),
            "total_co2_offset_kg_per_year": round(total_co2_offset_kg_yr),
            "total_co2_offset_tonnes_per_year": round(total_co2_offset_kg_yr / 1000, 2),
            "solar_kwp": solar["installed_capacity_kwp"],
            "solar_kwh_per_year": solar["annual_generation_kwh"],
            "plants_count": plantation["total_plants_count"],
            "annual_food_kg": plantation.get("annual_food_yield_kg") or 0,
            "biogas_m3_per_year": biogas["biogas_m3_per_year"],
            "rainwater_kl_per_year": rainwater["annual_yield_kiloliters"],
        },
    }


def aggregate_group_potential(building_reports: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Roll up multiple building reports into a group/cluster-level summary.
    Used for BRSR/ESG reporting at developer or federation level.
    """
    if not building_reports:
        return {"buildings_count": 0, "summary": {}}

    total = {
        "buildings_count": len(building_reports),
        "total_footprint_sqm": 0,
        "total_terrace_sqm": 0,
        "total_solar_kwp": 0,
        "total_solar_kwh_per_year": 0,
        "total_plants_count": 0,
        "total_food_kg_per_year": 0,
        "total_biogas_m3_per_year": 0,
        "total_rainwater_kl_per_year": 0,
        "total_annual_savings_inr": 0,
        "total_co2_offset_kg_per_year": 0,
    }

    for r in building_reports:
        s = r.get("summary", {})
        total["total_footprint_sqm"] += r.get("footprint_sqm", 0)
        total["total_terrace_sqm"] += r.get("usable_terrace_sqm", 0)
        total["total_solar_kwp"] += s.get("solar_kwp", 0)
        total["total_solar_kwh_per_year"] += s.get("solar_kwh_per_year", 0)
        total["total_plants_count"] += s.get("plants_count", 0)
        total["total_food_kg_per_year"] += s.get("annual_food_kg", 0)
        total["total_biogas_m3_per_year"] += s.get("biogas_m3_per_year", 0)
        total["total_rainwater_kl_per_year"] += s.get("rainwater_kl_per_year", 0)
        total["total_annual_savings_inr"] += s.get("total_annual_savings_inr", 0)
        total["total_co2_offset_kg_per_year"] += s.get("total_co2_offset_kg_per_year", 0)

    # Round everything
    for k, v in total.items():
        if isinstance(v, float):
            total[k] = round(v, 1)
        elif isinstance(v, int) and k != "buildings_count":
            total[k] = round(v)

    total["total_co2_offset_tonnes_per_year"] = round(total["total_co2_offset_kg_per_year"] / 1000, 2)

    # BRSR-aligned narrative
    total["brsr_narrative"] = (
        f"Across {total['buildings_count']} buildings ({round(total['total_footprint_sqm'])} m² built-up), "
        f"the group's untapped rooftop sustainability potential includes "
        f"{round(total['total_solar_kwp'])} kWp solar (≈{round(total['total_solar_kwh_per_year']/1000)} MWh/yr), "
        f"{round(total['total_rainwater_kl_per_year'])} kL/yr rainwater harvest, "
        f"{round(total['total_biogas_m3_per_year'])} m³/yr biogas, and "
        f"{total['total_plants_count']:,} container plants — "
        f"offsetting ~{total['total_co2_offset_tonnes_per_year']} tCO₂e/yr "
        f"with annual savings of ₹{total['total_annual_savings_inr']:,}."
    )

    return total
