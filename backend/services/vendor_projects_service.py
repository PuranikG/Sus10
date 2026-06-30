"""
backend/services/vendor_projects_service.py
Vendor Projects Service - handles commercial project creation, building surveys, proposal generation
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
import uuid
import logging

logger = logging.getLogger(__name__)


# ==================== SERVICE FUNCTIONS ====================

async def create_vendor_project(db, vendor_id: str, user_id: str, project_data: Dict[str, Any]) -> Dict:
    """Create new vendor project"""
    vendor_project_id = f"vprj_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow()

    doc = {
        "vendor_project_id": vendor_project_id,
        "vendor_id": vendor_id,
        "provider_user_id": user_id,
        "name": project_data.get("name"),
        "description": project_data.get("description", ""),
        "status": "draft",
        "complex_name": project_data.get("complex_name"),
        "complex_address": project_data.get("complex_address"),
        "complex_city": project_data.get("complex_city"),
        "complex_type": project_data.get("complex_type"),
        "complex_latitude": project_data.get("complex_latitude"),
        "complex_longitude": project_data.get("complex_longitude"),
        "contact_name": project_data.get("contact_name"),
        "contact_email": project_data.get("contact_email"),
        "contact_phone": project_data.get("contact_phone"),
        "budget_range": project_data.get("budget_range", ""),
        "timeline_months": project_data.get("timeline_months", 6),
        "building_surveys": [],
        "proposal": None,
        "created_at": now,
        "updated_at": now,
        "created_by_vendor_id": vendor_id,
    }

    result = await db.vendor_projects.insert_one(doc)
    return {**doc, "_id": str(result.inserted_id)}


async def get_vendor_projects(db, vendor_id: str) -> List[Dict]:
    """List all projects for a vendor"""
    projects = await db.vendor_projects.find(
        {"vendor_id": vendor_id},
        {"_id": 0}
    ).to_list(100)
    return projects or []


async def get_vendor_project(db, vendor_project_id: str, vendor_id: str) -> Optional[Dict]:
    """Get single project (auth: vendor_id must match)"""
    project = await db.vendor_projects.find_one(
        {"vendor_project_id": vendor_project_id, "vendor_id": vendor_id},
        {"_id": 0}
    )
    return project


async def update_vendor_project(db, vendor_project_id: str, vendor_id: str, updates: Dict) -> Dict:
    """Update project details"""
    updates["updated_at"] = datetime.utcnow()
    result = await db.vendor_projects.update_one(
        {"vendor_project_id": vendor_project_id, "vendor_id": vendor_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise ValueError("Project not found or unauthorized")
    return await get_vendor_project(db, vendor_project_id, vendor_id)


async def delete_vendor_project(db, vendor_project_id: str, vendor_id: str):
    """Delete project"""
    result = await db.vendor_projects.delete_one(
        {"vendor_project_id": vendor_project_id, "vendor_id": vendor_id}
    )
    return result.deleted_count > 0


async def add_building_survey(db, vendor_project_id: str, vendor_id: str, survey_data: Dict) -> Dict:
    """Add building survey to project"""
    survey_id = f"surv_{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow()

    survey = {
        "survey_id": survey_id,
        "building_name": survey_data.get("building_name"),
        "building_type": survey_data.get("building_type"),
        "status": "survey_complete",
        "rooftop": survey_data.get("rooftop", {}),
        "balconies": survey_data.get("balconies", {}),
        "walls": survey_data.get("walls", {}),
        "utility": survey_data.get("utility", {}),
        "existing_solar": survey_data.get("existing_solar", {}),
        "survey_notes": survey_data.get("survey_notes", ""),
        "surveyed_by_vendor": True,
        "survey_date": now,
    }

    result = await db.vendor_projects.update_one(
        {"vendor_project_id": vendor_project_id, "vendor_id": vendor_id},
        {
            "$push": {"building_surveys": survey},
            "$set": {"updated_at": now}
        }
    )

    if result.matched_count == 0:
        raise ValueError("Project not found")

    return survey


async def get_vendor_dashboard_stats(db, vendor_id: str) -> Dict:
    """Get vendor dashboard stats"""
    new_leads = await db.leads.count_documents({
        "provider_id": vendor_id,
        "lead_status": "new"
    })

    active_projects = await db.vendor_projects.count_documents({
        "vendor_id": vendor_id,
        "status": "active"
    })

    completed_projects = await db.vendor_projects.count_documents({
        "vendor_id": vendor_id,
        "status": "completed"
    })

    return {
        "new_leads": new_leads,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "revenue_this_month": 0,
        "revenue_trend_pct": 0,
    }


async def generate_proposal_for_project(db, vendor_project_id: str, vendor_id: str) -> Dict:
    """Generate proposal using solar + greening calculations"""
    project = await get_vendor_project(db, vendor_project_id, vendor_id)
    if not project:
        raise ValueError("Project not found")

    if not project.get("building_surveys"):
        raise ValueError("No building surveys found — add at least one building first")

    proposal = {
        "generated_at": datetime.utcnow().isoformat(),
        "status": "draft",
        "per_building": [],
        "aggregate": {
            "total_solar_kw": 0,
            "total_solar_annual_savings_rupees": 0,
            "total_greening_co2_kg_year": 0,
            "total_payback_years": 0,
            "combined_year_1_savings_rupees": 0,
            "combined_year_5_savings_rupees": 0,
        }
    }

    total_solar_kw = 0
    total_solar_savings = 0
    total_greening_co2 = 0
    payback_years_list = []

    for survey in project["building_surveys"]:
        try:
            rooftop = survey.get("rooftop", {})
            rooftop_sqft = float(rooftop.get("area_sqft", 5000))
            rooftop_sqm = rooftop_sqft / 10.764

            # Solar: 150W per sqm usable (accounting for shading)
            shading = float(rooftop.get("shading_percentage", 15)) / 100
            usable_solar_sqm = rooftop_sqm * (1 - shading)
            building_solar_kw = (usable_solar_sqm * 150) / 1000
            annual_generation_kwh = building_solar_kw * 1200

            rate = float(survey.get("utility", {}).get("rate_per_unit_rupees", 8))
            annual_savings = annual_generation_kwh * rate
            install_cost = rooftop_sqft * 500
            payback_years = install_cost / annual_savings if annual_savings > 0 else 0

            # Greening: 80% of rooftop usable for plants
            usable_green_sqm = rooftop_sqm * 0.8
            plants = int(usable_green_sqm * 10)
            greening_co2 = plants * 20

            building_proposal = {
                "survey_id": survey["survey_id"],
                "building_name": survey["building_name"],
                "solar": {
                    "rooftop_potential_kw": round(building_solar_kw, 2),
                    "annual_generation_kwh": round(annual_generation_kwh),
                    "annual_savings_rupees": round(annual_savings),
                    "payback_years": round(payback_years, 1),
                    "co2_offset_kg_year": round(annual_generation_kwh * 1.2),
                },
                "greening": {
                    "rooftop_area_utilizable_sqm": round(usable_green_sqm, 1),
                    "plants_recommended": plants,
                    "co2_sequestered_kg_year": round(greening_co2),
                    "food_yield_kg_year": round(plants * 5),
                },
            }

            proposal["per_building"].append(building_proposal)
            total_solar_kw += building_solar_kw
            total_solar_savings += annual_savings
            total_greening_co2 += greening_co2
            payback_years_list.append(payback_years)

        except Exception as e:
            logger.error(f"Error processing building {survey.get('building_name')}: {e}")
            continue

    avg_payback = sum(payback_years_list) / len(payback_years_list) if payback_years_list else 0

    proposal["aggregate"] = {
        "total_solar_kw": round(total_solar_kw, 2),
        "total_solar_annual_savings_rupees": round(total_solar_savings),
        "total_greening_co2_kg_year": round(total_greening_co2),
        "total_payback_years": round(avg_payback, 1),
        "combined_year_1_savings_rupees": round(total_solar_savings * 0.8),
        "combined_year_5_savings_rupees": round(total_solar_savings * 4.5),
    }

    await update_vendor_project(db, vendor_project_id, vendor_id, {"proposal": proposal})
    return proposal
