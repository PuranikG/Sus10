from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import re
import asyncio
import hashlib
import json as json_module
from datetime import datetime, timezone, timedelta
from enum import Enum
import sys

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Sus10 AI API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================
class UserType(str, Enum):
    individual = "individual"
    company = "company"
    ngo = "ngo"
    provider = "provider"
    admin = "admin"

class BuildingType(str, Enum):
    it_park = "it_park"
    hospital = "hospital"
    college = "college"
    residential = "residential"
    commercial = "commercial"
    industrial = "industrial"

class SolutionCategory(str, Enum):
    greening = "greening"
    energy = "energy"
    water = "water"
    waste = "waste"

class LeadStatus(str, Enum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    proposal_sent = "proposal_sent"
    won = "won"
    lost = "lost"

class InitiativeType(str, Enum):
    society = "society"
    corporate = "corporate"
    community = "community"
    ngo = "ngo"

class PledgeType(str, Enum):
    funding = "funding"
    volunteering = "volunteering"
    implementation = "implementation"

class ProviderStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

# ==================== MODELS ====================
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    user_type: UserType = UserType.individual
    organization: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    user_type: UserType = UserType.individual

class Building(BaseModel):
    model_config = ConfigDict(extra="ignore")
    building_id: str
    address: str
    city: str
    pincode: str
    ward: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    building_type: BuildingType
    building_footprint_area: Optional[float] = None
    usable_terrace_area: Optional[float] = None
    existing_structures: Optional[Dict] = None
    current_aqi: Optional[float] = None
    aqi_trend: Optional[str] = None
    aqi_source: Optional[str] = None
    solution_potentials: Optional[List[Dict]] = None
    data_quality_score: Optional[float] = None
    data_source: Optional[str] = None
    curated_by_admin_id: Optional[str] = None
    is_approved: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

class BuildingCreate(BaseModel):
    address: str
    city: str
    pincode: str
    ward: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    building_type: BuildingType
    building_footprint_area: Optional[float] = None
    usable_terrace_area: Optional[float] = None
    total_footprint_area: Optional[float] = None  # Alias for building_footprint_area
    lat: Optional[float] = None  # Alias for latitude
    lng: Optional[float] = None  # Alias for longitude
    google_place_id: Optional[str] = None
    data_quality_score: Optional[float] = None
    current_aqi: Optional[float] = None

class SolutionType(BaseModel):
    model_config = ConfigDict(extra="ignore")
    solution_type_id: str
    name: str
    category: SolutionCategory
    description: Optional[str] = None
    icon_name: Optional[str] = None
    metrics: Optional[List[Dict]] = None
    cost_range_min: Optional[int] = None
    cost_range_max: Optional[int] = None
    timeline_days: Optional[int] = None
    sub_types: Optional[List[Dict]] = None
    is_active: bool = True
    created_at: datetime

class SolutionRecommendation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    recommendation_id: str
    building_id: str
    solution_type_id: str
    suitability_score: float
    reasoning: Optional[str] = None
    impact_projections: Optional[Dict] = None
    cost_estimate: Optional[int] = None
    required_area: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class CalculationAuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    audit_id: str
    recommendation_id: str
    building_id: str
    calculation_steps: List[Dict]
    final_output: Dict
    sensitivity_analysis: Optional[Dict] = None
    created_at: datetime
    feedback_score: Optional[float] = None
    feedback_text: Optional[str] = None

class SolutionProvider(BaseModel):
    model_config = ConfigDict(extra="ignore")
    provider_id: str
    user_id: str
    company_name: str
    company_type: str
    description: Optional[str] = None
    service_areas: Optional[List[str]] = None
    certifications: Optional[List[Dict]] = None
    portfolio_projects: Optional[List[Dict]] = None
    pricing_model: Optional[str] = None
    team_composition: Optional[Dict] = None
    verification_status: ProviderStatus = ProviderStatus.pending
    approval_date: Optional[datetime] = None
    approved_by_admin_id: Optional[str] = None
    customer_rating: Optional[float] = None
    review_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

class ProviderCreate(BaseModel):
    company_name: str
    company_type: str
    description: Optional[str] = None
    service_areas: Optional[List[str]] = None
    certifications: Optional[List[Dict]] = None
    portfolio_projects: Optional[List[Dict]] = None
    pricing_model: Optional[str] = None

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lead_id: str
    building_id: str
    user_id: str
    provider_id: Optional[str] = None
    lead_status: LeadStatus = LeadStatus.new
    timeline: Optional[str] = None
    budget_disclosed: bool = True
    budget_amount: Optional[int] = None
    additional_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    contacted_at: Optional[datetime] = None

class LeadCreate(BaseModel):
    building_id: str
    provider_id: Optional[str] = None
    timeline: Optional[str] = None
    budget_disclosed: bool = True
    budget_amount: Optional[int] = None
    additional_notes: Optional[str] = None

class Initiative(BaseModel):
    model_config = ConfigDict(extra="ignore")
    initiative_id: str
    champion_id: str
    title: str
    description: Optional[str] = None
    initiative_type: InitiativeType
    area: Optional[str] = None
    impact_goal: Optional[Dict] = None
    funding_goal: Optional[int] = None
    funding_pledged: int = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    milestones: Optional[List[Dict]] = None
    team_members: Optional[List[str]] = None
    visibility: str = "public"
    created_at: datetime
    updated_at: Optional[datetime] = None

class InitiativeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    initiative_type: InitiativeType
    area: Optional[str] = None
    impact_goal: Optional[Dict] = None
    funding_goal: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class InitiativePledge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pledge_id: str
    initiative_id: str
    pledger_id: str
    pledge_type: PledgeType
    pledge_amount: Optional[int] = None
    pledge_status: str = "pledged"
    created_at: datetime
    updated_at: Optional[datetime] = None

class PledgeCreate(BaseModel):
    pledge_type: PledgeType
    pledge_amount: Optional[int] = None

class BlogPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    post_id: str
    title: str
    slug: str
    author_id: str
    content: str
    excerpt: Optional[str] = None
    featured_image_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    published: bool = False
    published_at: Optional[datetime] = None
    views_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

class ForumPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    forum_post_id: str
    initiative_id: str
    author_id: str
    title: str
    content: str
    post_type: str = "discussion"
    replies_count: int = 0
    views_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

class FeatureFlag(BaseModel):
    model_config = ConfigDict(extra="ignore")
    flag_id: str
    name: str
    is_enabled: bool = False
    description: Optional[str] = None
    updated_at: datetime
    updated_by: Optional[str] = None

# ==================== AUTH HELPERS ====================
async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from session token (cookie or header)"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        return None
    
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return User(**user_doc)

async def require_auth(request: Request) -> User:
    """Require authentication - raises 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(request: Request) -> User:
    """Require admin authentication"""
    user = await require_auth(request)
    if user.user_type != UserType.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== AUTH ENDPOINTS ====================
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = resp.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = data.get("email")
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")

    # ---- Private Beta Allowlist Check ----
    # Sus10 AI is currently in private beta. Only allowlisted emails can sign in.
    # Configure via AUTH_ALLOWLIST_ENABLED and AUTH_ALLOWLIST_EMAILS env vars.
    allowlist_enabled = os.environ.get("AUTH_ALLOWLIST_ENABLED", "false").lower() == "true"
    if allowlist_enabled and email:
        raw_emails = os.environ.get("AUTH_ALLOWLIST_EMAILS", "")
        allowed = {e.strip().lower() for e in raw_emails.split(",") if e.strip()}
        if email.strip().lower() not in allowed:
            contact = os.environ.get("AUTH_CONTACT_EMAIL", "hello@sus10.ai")
            logger.warning(f"Auth rejected (not allowlisted): {email}")
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "private_beta",
                    "message": "Sus10 AI is currently in private beta. Contact us for access.",
                    "contact_email": contact,
                }
            )

    # Find or create user
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "user_type": "individual",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout - clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ==================== FEATURE FLAGS ====================
async def get_feature_flags() -> Dict[str, bool]:
    """Get all feature flags as dict"""
    flags = await db.feature_flags.find({}, {"_id": 0}).to_list(100)
    return {f["name"]: f["is_enabled"] for f in flags}

async def is_feature_enabled(name: str) -> bool:
    """Check if a feature is enabled"""
    flag = await db.feature_flags.find_one({"name": name}, {"_id": 0})
    return flag["is_enabled"] if flag else False

@api_router.get("/feature-flags")
async def list_feature_flags():
    """Get all feature flags"""
    flags = await db.feature_flags.find({}, {"_id": 0}).to_list(100)
    return flags

@api_router.put("/admin/feature-flags/{name}")
async def toggle_feature_flag(name: str, request: Request):
    """Toggle a feature flag (admin only)"""
    user = await require_admin(request)
    body = await request.json()
    is_enabled = body.get("is_enabled", False)
    
    result = await db.feature_flags.update_one(
        {"name": name},
        {"$set": {"is_enabled": is_enabled, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user.user_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    
    return {"name": name, "is_enabled": is_enabled}

@api_router.post("/admin/make-admin/{email}")
async def make_user_admin(email: str):
    """Make a user admin by email (for initial setup only)"""
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"user_type": "admin", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {email} is now an admin"}

# ==================== BUILDINGS ENDPOINTS ====================
@api_router.get("/buildings/search")
async def search_buildings(
    city: Optional[str] = None,
    address: Optional[str] = None,
    building_type: Optional[str] = None,
    limit: int = Query(default=50, le=200)
):
    """Search buildings with filters"""
    query = {"is_approved": True}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if address:
        query["address"] = {"$regex": address, "$options": "i"}
    if building_type:
        query["building_type"] = building_type
    
    buildings = await db.buildings.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return buildings

@api_router.get("/buildings/{building_id}")
async def get_building(building_id: str):
    """Get building details"""
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building

@api_router.get("/buildings/{building_id}/solutions")
async def get_building_solutions(building_id: str):
    """Get solution recommendations for a building"""
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    recommendations = await db.solution_recommendations.find(
        {"building_id": building_id}, {"_id": 0}
    ).to_list(100)

    # Batch-fetch solution types to avoid N+1
    solution_type_ids = list({rec["solution_type_id"] for rec in recommendations if rec.get("solution_type_id")})
    if solution_type_ids:
        type_docs = await db.solution_types.find(
            {"solution_type_id": {"$in": solution_type_ids}}, {"_id": 0}
        ).to_list(len(solution_type_ids))
        type_map = {st["solution_type_id"]: st for st in type_docs}
        for rec in recommendations:
            st = type_map.get(rec.get("solution_type_id"))
            if st:
                rec["solution_type"] = st

    return recommendations

@api_router.get("/buildings/{building_id}/report")
async def get_building_report(building_id: str, report_type: str = "full"):
    """Get green potential report data for a building"""
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    recommendations = await db.solution_recommendations.find(
        {"building_id": building_id}, {"_id": 0}
    ).to_list(100)
    
    # Get audit logs for explainability
    audit_logs = []
    for rec in recommendations:
        audit = await db.calculation_audit_log.find_one(
            {"recommendation_id": rec["recommendation_id"]}, {"_id": 0}
        )
        if audit:
            audit_logs.append(audit)
    
    # Get relevant providers
    providers = await db.solution_providers.find(
        {"verification_status": "approved", "service_areas": {"$in": [building["city"]]}}, {"_id": 0}
    ).to_list(10)
    
    return {
        "building": building,
        "recommendations": recommendations,
        "audit_logs": audit_logs,
        "providers": providers,
        "report_type": report_type
    }

@api_router.get("/recommendations/{recommendation_id}/explainability")
async def get_recommendation_explainability(recommendation_id: str):
    """Get full calculation breakdown for a recommendation"""
    audit = await db.calculation_audit_log.find_one(
        {"recommendation_id": recommendation_id}, {"_id": 0}
    )
    if not audit:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return audit

# ==================== ADMIN BUILDINGS ====================
@api_router.get("/admin/buildings")
async def admin_list_buildings(
    request: Request,
    city: Optional[str] = None,
    ward: Optional[str] = None,
    is_approved: Optional[bool] = None,
    status: Optional[str] = Query(default=None, description="pending | approved | rejected | all"),
    building_type: Optional[str] = Query(default=None, description="Comma-separated types"),
    q: Optional[str] = Query(default=None, description="Full-text address search"),
    sort: str = Query(default="created_at_desc"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=2000)
):
    """Admin: List buildings with rich filters + pagination.

    Response: { buildings: [...], total: int, page, limit, sort,
                counts: { pending, approved, rejected, total } }
    """
    await require_admin(request)

    query: Dict[str, Any] = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if ward:
        query["ward"] = ward
    # Legacy bool param kept for backwards compatibility
    if is_approved is not None:
        query["is_approved"] = is_approved
    # New status param (B1.5)
    if status and status != "all":
        if status == "rejected":
            query["is_rejected"] = True
        elif status == "approved":
            query["is_approved"] = True
            query["is_rejected"] = {"$ne": True}
        elif status == "pending":
            query["$and"] = [
                {"$or": [{"is_approved": {"$ne": True}}, {"is_approved": False}]},
                {"$or": [{"is_rejected": {"$ne": True}}, {"is_rejected": False}]},
            ]
    if building_type:
        types = [t.strip() for t in building_type.split(",") if t.strip()]
        if len(types) == 1:
            query["building_type"] = types[0]
        elif len(types) > 1:
            query["building_type"] = {"$in": types}
    if q:
        query["address"] = {"$regex": q, "$options": "i"}

    total = await db.buildings.count_documents(query)

    sort_field = "created_at"
    sort_dir = -1
    if sort == "created_at_asc":
        sort_dir = 1
    elif sort == "city_asc":
        sort_field = "city"; sort_dir = 1
    elif sort == "area_desc":
        sort_field = "usable_terrace_area"; sort_dir = -1
    elif sort == "area_asc":
        sort_field = "usable_terrace_area"; sort_dir = 1

    skip = (page - 1) * limit
    cursor = db.buildings.find(query, {"_id": 0}).sort(sort_field, sort_dir).skip(skip).limit(limit)
    buildings = await cursor.to_list(limit)

    # Quick status counts (independent of current query — useful header chips)
    base = {}
    if city:
        base["city"] = {"$regex": city, "$options": "i"}
    counts = {
        "total": await db.buildings.count_documents(base),
        "approved": await db.buildings.count_documents({**base, "is_approved": True, "is_rejected": {"$ne": True}}),
        "rejected": await db.buildings.count_documents({**base, "is_rejected": True}),
    }
    counts["pending"] = counts["total"] - counts["approved"] - counts["rejected"]

    return {
        "buildings": buildings,
        "total": total,
        "page": page,
        "limit": limit,
        "sort": sort,
        "counts": counts,
    }


@api_router.put("/admin/buildings/{building_id}/reject")
async def admin_reject_building(building_id: str, request: Request):
    """Admin: Reject a discovered building so it doesn't keep resurfacing.

    Optional body: { "reason": "..." }
    """
    user = await require_admin(request)
    reason = None
    try:
        body = await request.json()
        reason = (body or {}).get("reason")
    except Exception:
        pass

    result = await db.buildings.update_one(
        {"building_id": building_id},
        {"$set": {
            "is_rejected": True,
            "is_approved": False,
            "rejection_reason": reason,
            "rejected_by_admin_id": user.user_id,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Building not found")
    await record_audit(
        user=user, action="building.reject", resource_type="building",
        resource_id=building_id, metadata={"reason": reason},
        ip=request.client.host if request.client else None,
    )
    return {"building_id": building_id, "is_rejected": True, "reason": reason}


@api_router.post("/admin/buildings/bulk-action")
async def admin_bulk_building_action(request: Request):
    """Admin: Approve / reject many buildings at once.

    Body: { "building_ids": [...], "action": "approve" | "reject", "reason": "..." }
    """
    user = await require_admin(request)
    body = await request.json()
    ids = body.get("building_ids") or []
    action = body.get("action")
    reason = body.get("reason")

    if not ids or not isinstance(ids, list):
        raise HTTPException(status_code=400, detail="building_ids required")
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    now = datetime.now(timezone.utc).isoformat()
    if action == "approve":
        update = {
            "is_approved": True,
            "is_rejected": False,
            "curated_by_admin_id": user.user_id,
            "updated_at": now,
        }
    else:
        update = {
            "is_rejected": True,
            "is_approved": False,
            "rejection_reason": reason,
            "rejected_by_admin_id": user.user_id,
            "rejected_at": now,
            "updated_at": now,
        }
    res = await db.buildings.update_many({"building_id": {"$in": ids}}, {"$set": update})
    await record_audit(
        user=user, action=f"building.bulk_{action}", resource_type="building",
        resource_id=None,
        metadata={"count": len(ids), "matched": res.matched_count, "modified": res.modified_count, "reason": reason, "ids_sample": ids[:10]},
        ip=request.client.host if request.client else None,
    )
    return {"action": action, "matched": res.matched_count, "modified": res.modified_count, "count": len(ids)}


# ==================== BUILDING INTELLIGENCE NOTES (B1.6) ====================
INTEL_TAG_VOCABULARY = [
    "high_wind_exposure", "weak_slab", "heritage_protected",
    "gov_approval_required", "flood_prone", "low_sunlight",
    "structural_concern", "fire_hazard", "no_water_access",
    "neighbour_objection",
]


class IntelNoteCreate(BaseModel):
    tag: str
    note: str
    severity: Optional[str] = "medium"  # low | medium | high


@api_router.get("/intel/tags")
async def list_intel_tags_public():
    """Public read of the intel-tag vocabulary so the Building Report can
    render human-readable badge labels (no auth — labels are not sensitive)."""
    return {"tags": INTEL_TAG_VOCABULARY}


@api_router.get("/admin/intelligence/tags")
async def list_intel_tags(request: Request):
    await require_admin(request)
    return {"tags": INTEL_TAG_VOCABULARY}


@api_router.get("/admin/buildings/{building_id}/intel")
async def list_building_intel(building_id: str, request: Request):
    await require_admin(request)
    bld = await db.buildings.find_one({"building_id": building_id}, {"_id": 0, "intel_notes": 1})
    if not bld:
        raise HTTPException(status_code=404, detail="Building not found")
    return {"building_id": building_id, "intel_notes": bld.get("intel_notes", [])}


@api_router.post("/admin/buildings/{building_id}/intel")
async def add_building_intel(building_id: str, note: IntelNoteCreate, request: Request):
    user = await require_admin(request)
    bld = await db.buildings.find_one({"building_id": building_id})
    if not bld:
        raise HTTPException(status_code=404, detail="Building not found")
    severity = note.severity if note.severity in ("low", "medium", "high") else "medium"
    new_note = {
        "note_id": f"intel_{uuid.uuid4().hex[:10]}",
        "tag": note.tag,
        "note": note.note,
        "severity": severity,
        "author": user.email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.buildings.update_one(
        {"building_id": building_id},
        {"$push": {"intel_notes": new_note}, "$set": {"updated_at": new_note["created_at"]}},
    )
    await record_audit(
        user=user, action="intel.add", resource_type="building",
        resource_id=building_id,
        metadata={"tag": new_note["tag"], "severity": severity, "note_id": new_note["note_id"]},
        ip=request.client.host if request.client else None,
    )
    return new_note


@api_router.delete("/admin/buildings/{building_id}/intel/{note_id}")
async def delete_building_intel(building_id: str, note_id: str, request: Request):
    await require_admin(request)
    res = await db.buildings.update_one(
        {"building_id": building_id},
        {"$pull": {"intel_notes": {"note_id": note_id}}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Building or note not found")
    return {"removed": True, "note_id": note_id}


@api_router.get("/buildings/{building_id}/intel")
async def get_public_building_intel(building_id: str):
    """Public read of intel notes so the Building Report can show warning badges.
    Returns notes for any existing building (approved or self-submitted).
    Admins can hide a note from public view by marking severity='private' (future)."""
    bld = await db.buildings.find_one(
        {"building_id": building_id},
        {"_id": 0, "intel_notes": 1},
    )
    if not bld:
        return {"intel_notes": []}
    return {"intel_notes": bld.get("intel_notes", [])}


# ==================== SUBSIDIES & FINANCING NAVIGATOR (N6) ====================
class SubsidyCreate(BaseModel):
    name: str
    scheme_code: Optional[str] = None  # e.g. PMSGMBY, MNRE_CFA, MH_SOLAR_RTS
    authority: str  # MNRE, MahaUrja, BESCOM, SBI etc.
    type: str  # subsidy | cfa | loan | tax_credit | net_metering
    category: List[str] = []  # ["solar","biogas","rainwater","greening"]
    geo_scope: str = "central"  # central | state | city
    state: Optional[str] = None
    city: Optional[str] = None
    eligible_building_types: List[str] = []  # ["residential","commercial",...]
    benefit_summary: str  # short marketing line
    benefit_details_markdown: str  # rich markdown
    max_amount_inr: Optional[float] = None
    rate_or_percent: Optional[str] = None  # "30% CFA" / "8.95% p.a."
    valid_until: Optional[str] = None
    application_url: Optional[str] = None
    documents_required: List[str] = []
    is_active: bool = True
    last_verified_at: Optional[str] = None
    notes_for_admin: Optional[str] = None


@api_router.get("/subsidies")
async def list_subsidies(
    category: Optional[str] = Query(default=None, description="solar | biogas | rainwater | greening"),
    state: Optional[str] = None,
    type: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(default=100, le=500),
):
    """Public catalogue of subsidies & financing options."""
    query: Dict[str, Any] = {"is_active": True}
    if category:
        query["category"] = category
    if state:
        query["$or"] = [{"state": state}, {"geo_scope": "central"}]
    if type:
        query["type"] = type
    if q:
        # Simple text search across a few fields
        q_re = {"$regex": q, "$options": "i"}
        query["$and"] = [
            {"$or": [
                {"name": q_re}, {"authority": q_re},
                {"benefit_summary": q_re}, {"scheme_code": q_re},
            ]}
        ]
    items = await (
        db.subsidies.find(query, {"_id": 0})
        .sort([("geo_scope", 1), ("name", 1)])
        .limit(limit).to_list(limit)
    )
    return {"subsidies": items, "total": len(items)}


@api_router.get("/subsidies/match/{building_id}")
async def match_subsidies_to_building(building_id: str, limit: int = 20):
    """Match active subsidies/financing to a specific building's state + type."""
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    state = (building.get("state") or "").strip()
    btype = (building.get("building_type") or "").lower()

    or_clauses: List[Dict[str, Any]] = [{"geo_scope": "central"}]
    if state:
        or_clauses.append({"state": state})

    query = {"is_active": True, "$or": or_clauses}
    if btype:
        query["$or"] = or_clauses  # state/central match
        query["eligible_building_types"] = {"$in": [btype, "all", ""]}

    items = await (
        db.subsidies.find(query, {"_id": 0})
        .sort("geo_scope", 1).limit(limit).to_list(limit)
    )
    return {"building_id": building_id, "state": state, "building_type": btype, "subsidies": items}


@api_router.get("/admin/subsidies")
async def admin_list_subsidies(request: Request, limit: int = Query(default=500, le=2000)):
    await require_admin(request)
    items = await db.subsidies.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"subsidies": items, "total": len(items)}


@api_router.post("/admin/subsidies")
async def admin_create_subsidy(payload: SubsidyCreate, request: Request):
    user = await require_admin(request)
    doc = payload.model_dump()
    doc["subsidy_id"] = f"sub_{uuid.uuid4().hex[:12]}"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    doc["created_by"] = user.email
    await db.subsidies.insert_one(doc)
    await record_audit(
        user=user, action="subsidy.create", resource_type="subsidy",
        resource_id=doc["subsidy_id"], metadata={"name": doc["name"], "type": doc["type"]},
    )
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/subsidies/{subsidy_id}")
async def admin_update_subsidy(subsidy_id: str, payload: SubsidyCreate, request: Request):
    user = await require_admin(request)
    update = payload.model_dump()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.subsidies.update_one({"subsidy_id": subsidy_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subsidy not found")
    await record_audit(
        user=user, action="subsidy.update", resource_type="subsidy",
        resource_id=subsidy_id, metadata={"name": update.get("name")},
    )
    return {"subsidy_id": subsidy_id, "updated": True}


@api_router.delete("/admin/subsidies/{subsidy_id}")
async def admin_delete_subsidy(subsidy_id: str, request: Request):
    user = await require_admin(request)
    res = await db.subsidies.delete_one({"subsidy_id": subsidy_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subsidy not found")
    await record_audit(
        user=user, action="subsidy.delete", resource_type="subsidy",
        resource_id=subsidy_id,
    )
    return {"subsidy_id": subsidy_id, "deleted": True}

@api_router.post("/admin/buildings")
async def admin_create_building(request: Request, building: BuildingCreate):
    """Admin: Create a new building"""
    user = await require_admin(request)
    
    building_id = f"bld_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    building_data = building.model_dump()
    
    # Handle field aliases
    if building_data.get('total_footprint_area') and not building_data.get('building_footprint_area'):
        building_data['building_footprint_area'] = building_data['total_footprint_area']
    if building_data.get('lat') and not building_data.get('latitude'):
        building_data['latitude'] = building_data['lat']
    if building_data.get('lng') and not building_data.get('longitude'):
        building_data['longitude'] = building_data['lng']
    
    # Remove alias fields
    for key in ['total_footprint_area', 'lat', 'lng']:
        building_data.pop(key, None)
    
    building_doc = {
        "building_id": building_id,
        **building_data,
        "curated_by_admin_id": user.user_id,
        "is_approved": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.buildings.insert_one(building_doc)
    if "_id" in building_doc:
        del building_doc["_id"]
    return building_doc

@api_router.put("/admin/buildings/{building_id}/approve")
async def admin_approve_building(building_id: str, request: Request):
    """Admin: Approve a building"""
    user = await require_admin(request)
    
    result = await db.buildings.update_one(
        {"building_id": building_id},
        {"$set": {
            "is_approved": True,
            "curated_by_admin_id": user.user_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Building not found")
    await record_audit(
        user=user, action="building.approve", resource_type="building",
        resource_id=building_id,
        ip=request.client.host if request.client else None,
    )
    return {"building_id": building_id, "is_approved": True}

@api_router.patch("/buildings/{building_id}/terrace")
async def update_building_terrace(building_id: str, request: Request):
    """
    Update building's custom terrace area (user-facing, no auth required)
    Used when users adjust the polygon on the map
    
    Body:
    {
        "custom_terrace_area": 2500,  // in sqm
        "terrace_polygon": [[lat1, lng1], [lat2, lng2], ...]  // optional
    }
    """
    body = await request.json()
    
    custom_area = body.get("custom_terrace_area")
    polygon = body.get("terrace_polygon")
    
    if custom_area is None:
        raise HTTPException(status_code=400, detail="custom_terrace_area is required")
    
    update_data = {
        "custom_terrace_area": float(custom_area),
        # Also update usable_terrace_area so all downstream consumers
        # (sustenance calculator, project rollup, top widget) reflect the edit.
        "usable_terrace_area": float(custom_area),
        "terrace_updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if polygon:
        update_data["custom_terrace_polygon"] = polygon
    
    result = await db.buildings.update_one(
        {"building_id": building_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Building not found")

    # B1.1: Regenerate recommendations + audit logs against the new terrace area
    # so the Explainability tab reflects the latest user-edited polygon.
    regen_summary = await regenerate_recommendations_for_building(building_id)

    return {
        "building_id": building_id,
        "custom_terrace_area": custom_area,
        "saved": True,
        "recommendations_refreshed": regen_summary,
    }


async def regenerate_recommendations_for_building(building_id: str) -> Dict[str, Any]:
    """
    Recompute solution recommendations + calculation_audit_log entries for a
    building using its CURRENT terrace area / footprint. Called after a user
    edits the rooftop polygon so the Explainability tab is never stale.

    Safe to call multiple times; existing rows for the building are replaced.
    """
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        return {"replaced": 0, "skipped": "building_not_found"}

    area = float(
        building.get("custom_terrace_area")
        or building.get("usable_terrace_area")
        or building.get("building_footprint_area")
        or 0
    )
    if area <= 0:
        return {"replaced": 0, "skipped": "no_area"}

    # Look up the active terrace-greening solution type (other categories can be
    # added later — keeping parity with the seed function for now).
    sol = await db.solution_types.find_one(
        {"solution_type_id": "sol_terrace_green"}, {"_id": 0}
    )
    if not sol:
        # Fall back: pick the first active solution type
        sol = await db.solution_types.find_one({"is_active": True}, {"_id": 0})
    if not sol:
        return {"replaced": 0, "skipped": "no_solution_type"}

    co2_seq = round(area * 3.5, 0)
    temp_reduction = round(min(5.0, area / 1000.0 * 2.5), 1)
    cost_low = int(area * (sol.get("cost_range_min") or 150))
    cost_high = int(area * (sol.get("cost_range_max") or 500))
    suitability = round(
        min(95.0, 60 + (building.get("data_quality_score", 70) / 10) + (area / 500)),
        1,
    )

    now = datetime.now(timezone.utc).isoformat()
    rec_id = f"rec_{uuid.uuid4().hex[:12]}"
    audit_id = f"audit_{uuid.uuid4().hex[:12]}"

    new_rec = {
        "recommendation_id": rec_id,
        "building_id": building_id,
        "solution_type_id": sol["solution_type_id"],
        "suitability_score": suitability,
        "reasoning": (
            f"Based on {int(area)} sqm usable terrace area and current AQI of "
            f"{building.get('current_aqi', 'N/A')}, terrace greening can "
            "significantly improve local air quality and reduce building temperature."
        ),
        "impact_projections": {
            "co2_sequestration_kg_year": co2_seq,
            "temperature_reduction_c": temp_reduction,
            "biodiversity_species": 15 + int(area / 500),
        },
        "cost_estimate": int((cost_low + cost_high) / 2),
        "required_area": area,
        "created_at": now,
    }

    new_audit = {
        "audit_id": audit_id,
        "recommendation_id": rec_id,
        "building_id": building_id,
        "calculation_steps": [
            {"step": 1, "description": "Determine usable terrace area",
             "input": f"{int(area):,} sqm", "source": "User-drawn polygon / building footprint"},
            {"step": 2, "description": "Calculate CO2 sequestration",
             "formula": "area × 3.5 kg/sqm/year",
             "result": f"{int(co2_seq):,} kg/year",
             "source": "EPA Green Roof Study 2023"},
            {"step": 3, "description": "Estimate temperature reduction",
             "formula": "min(5°C, area/1000 × 2.5)",
             "result": f"{temp_reduction}°C",
             "source": "Urban Heat Island Research, IIT Delhi"},
            {"step": 4, "description": "Calculate cost range",
             "formula": "area × (₹150-500/sqm)",
             "result": f"₹{cost_low:,} - ₹{cost_high:,}",
             "source": "Market survey 2024"},
        ],
        "final_output": {
            "co2_sequestration": {
                "value": co2_seq, "unit": "kg/year", "confidence": 0.85,
                "range_low": co2_seq * 0.8, "range_high": co2_seq * 1.2,
            },
            "cost_estimate": {
                "value": (cost_low + cost_high) / 2, "unit": "INR", "confidence": 0.75,
                "range_low": cost_low, "range_high": cost_high,
            },
        },
        "created_at": now,
    }

    # Replace existing recs + audits for this building (idempotent)
    del_recs = await db.solution_recommendations.delete_many({"building_id": building_id})
    del_audits = await db.calculation_audit_log.delete_many({"building_id": building_id})

    await db.solution_recommendations.insert_one(new_rec)
    await db.calculation_audit_log.insert_one(new_audit)

    return {
        "replaced": (del_recs.deleted_count or 0) + (del_audits.deleted_count or 0),
        "new_recommendation_id": rec_id,
        "area_used_sqm": area,
    }

@api_router.put("/admin/buildings/{building_id}")
async def admin_update_building(building_id: str, request: Request):
    """Admin: Update building data"""
    user = await require_admin(request)
    body = await request.json()
    
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    body["curated_by_admin_id"] = user.user_id
    
    result = await db.buildings.update_one(
        {"building_id": building_id},
        {"$set": body}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Building not found")
    
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    return building

@api_router.delete("/admin/buildings/{building_id}")
async def admin_delete_building(building_id: str, request: Request):
    """Admin: Delete/reject a building"""
    await require_admin(request)
    
    result = await db.buildings.delete_one({"building_id": building_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Building not found")
    
    return {"message": "Building deleted", "building_id": building_id}

@api_router.post("/admin/buildings/import")
async def admin_import_buildings(request: Request):
    """
    Admin: Import buildings from BigQuery export or coordinates
    
    Expected body:
    {
        "buildings": [
            {"latitude": 28.4595, "longitude": 77.0726, "area_in_meters": 15000, "confidence": 0.92},
            ...
        ]
    }
    """
    user = await require_admin(request)
    body = await request.json()
    buildings_data = body.get("buildings", [])
    
    if not buildings_data:
        raise HTTPException(status_code=400, detail="No buildings provided")
    
    # Import the pipeline
    from building_pipeline import process_building
    
    # Get Google API key
    google_api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if not google_api_key:
        raise HTTPException(status_code=500, detail="Google API key not configured")
    
    results = {
        "total": len(buildings_data),
        "imported": 0,
        "skipped": 0,
        "failed": 0,
        "buildings": []
    }
    
    for building_data in buildings_data:
        try:
            building_doc = await process_building(building_data, google_api_key, db)
            building_doc["curated_by_admin_id"] = user.user_id
            
            # Check for duplicates
            existing = await db.buildings.find_one({
                "latitude": building_doc["latitude"],
                "longitude": building_doc["longitude"]
            })
            
            if existing:
                results["skipped"] += 1
                continue
            
            await db.buildings.insert_one(building_doc)
            del building_doc["_id"]
            
            results["imported"] += 1
            results["buildings"].append({
                "building_id": building_doc["building_id"],
                "name": building_doc["address"],
                "type": building_doc["building_type"],
                "city": building_doc["city"],
            })
            
        except Exception as e:
            logger.error(f"Import error: {e}")
            results["failed"] += 1
    
    return results

@api_router.get("/buildings/map")
async def get_buildings_for_map(
    city: Optional[str] = None,
    building_type: Optional[str] = None,
    approved_only: bool = True
):
    """Get buildings with coordinates for map display"""
    query = {}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if building_type:
        query["building_type"] = building_type
    if approved_only:
        query["is_approved"] = True
    
    # Only get fields needed for map
    projection = {
        "_id": 0,
        "building_id": 1,
        "address": 1,
        "city": 1,
        "latitude": 1,
        "longitude": 1,
        "building_type": 1,
        "building_footprint_area": 1,
        "usable_terrace_area": 1,
        "current_aqi": 1,
        "is_approved": 1,
    }
    
    buildings = await db.buildings.find(query, projection).to_list(500)
    return buildings

@api_router.post("/admin/buildings/import-pilot")
async def admin_import_pilot_buildings(request: Request):
    """
    Admin: Import pilot buildings for Gurugram
    Uses predefined coordinates for 5 large buildings
    """
    user = await require_admin(request)
    
    # Pilot buildings data (coordinates of large buildings in Gurugram)
    pilot_buildings = [
        {"latitude": 28.4944, "longitude": 77.0892, "area_in_meters": 18000, "confidence": 0.95},  # DLF Cyber City Tower
        {"latitude": 28.4673, "longitude": 77.0631, "area_in_meters": 12000, "confidence": 0.92},  # Cyber Hub area
        {"latitude": 28.4502, "longitude": 77.0716, "area_in_meters": 8500, "confidence": 0.91},   # Sector 24
        {"latitude": 28.4432, "longitude": 77.0523, "area_in_meters": 22000, "confidence": 0.94},  # Medanta Hospital
        {"latitude": 28.4815, "longitude": 77.0293, "area_in_meters": 15000, "confidence": 0.90},  # Ambience Mall
    ]
    
    from building_pipeline import process_building
    
    google_api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if not google_api_key:
        raise HTTPException(status_code=500, detail="Google API key not configured")
    
    results = {
        "total": len(pilot_buildings),
        "imported": 0,
        "buildings": []
    }
    
    for building_data in pilot_buildings:
        try:
            building_doc = await process_building(building_data, google_api_key, db)
            building_doc["curated_by_admin_id"] = user.user_id
            
            # Check for duplicates
            existing = await db.buildings.find_one({
                "latitude": building_doc["latitude"],
                "longitude": building_doc["longitude"]
            })
            
            if existing:
                continue
            
            await db.buildings.insert_one(building_doc)
            del building_doc["_id"]
            
            results["imported"] += 1
            results["buildings"].append({
                "building_id": building_doc["building_id"],
                "name": building_doc["address"],
                "type": building_doc["building_type"],
                "city": building_doc["city"],
                "footprint": building_doc["building_footprint_area"],
                "terrace": building_doc["usable_terrace_area"],
            })
            
        except Exception as e:
            logger.error(f"Pilot import error: {e}")
    
    return results

@api_router.post("/admin/buildings/discover")
async def admin_discover_buildings(request: Request):
    """
    Admin: Discover and import buildings from OpenStreetMap
    Auto-enriches with Google Places API
    
    Body:
    {
        "city": "Gurugram",
        "building_type": "hospital",  // optional
        "min_area": 2000,  // optional, default 1000 sqm
        "limit": 20  // optional, default 20
    }
    """
    user = await require_admin(request)
    body = await request.json()
    
    city = body.get("city")
    if not city:
        raise HTTPException(status_code=400, detail="City is required")
    
    building_type = body.get("building_type")
    min_area = body.get("min_area", 1000)
    limit = min(body.get("limit", 20), 50)  # Max 50 per request
    strict_type = bool(body.get("strict_type", False))

    google_api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    
    logger.info(f"Admin {user.email} starting building discovery for {city} (strict_type={strict_type})")
    
    try:
        from building_discovery import discover_and_import_buildings
        
        results = await discover_and_import_buildings(
            city=city,
            building_type=building_type,
            min_area=min_area,
            limit=limit,
            google_api_key=google_api_key,
            db=db,
            admin_user_id=user.user_id,
            strict_type=strict_type,
        )
        
        logger.info(f"Discovery complete: discovered={results.get('discovered', 0)}, imported={results.get('imported', 0)}")
        return results
    except ValueError as e:
        logger.error(f"Discovery validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Discovery error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")

# ==================== AIR QUALITY (Open-Meteo) ====================
@api_router.get("/air-quality/location")
async def get_air_quality_by_coordinates(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude")
):
    """
    Get real-time air quality data from Open-Meteo API
    Free, no API key required, global coverage including India
    Returns US AQI, PM2.5, PM10, and other pollutants
    """
    from services.air_quality_service import get_air_quality_service
    
    service = get_air_quality_service()
    result = await service.get_air_quality(latitude, longitude)
    
    if not result:
        return {
            "aqi_value": None,
            "aqi_level": "Unknown",
            "pm25_value": None,
            "data_source": "Error",
            "message": "Unable to fetch air quality data"
        }
    
    return result

@api_router.get("/air-quality/city/{city}")
async def get_air_quality_by_city(city: str):
    """
    Get real-time air quality data for an Indian city
    Supported cities: Delhi, Mumbai, Bangalore, Gurugram, Noida, Pune, Hyderabad, Chennai, etc.
    """
    from services.air_quality_service import get_air_quality_service
    
    service = get_air_quality_service()
    result = await service.get_air_quality_for_city(city)
    
    if not result:
        return {
            "city": city,
            "aqi_value": None,
            "aqi_level": "Unknown",
            "data_source": "Unknown city",
            "message": f"City '{city}' not found in supported cities list"
        }
    
    return result

@api_router.get("/air-quality/building/{building_id}")
async def get_air_quality_for_building(building_id: str):
    """
    Get real-time air quality data for a specific building location
    Updates the building's AQI in database
    """
    from services.air_quality_service import get_air_quality_service
    
    # Get building coordinates
    building = await db.buildings.find_one(
        {"building_id": building_id},
        {"_id": 0, "latitude": 1, "longitude": 1, "city": 1, "current_aqi": 1}
    )
    
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    service = get_air_quality_service()
    
    lat = building.get("latitude")
    lng = building.get("longitude")
    
    if lat and lng:
        result = await service.get_air_quality(lat, lng)
    else:
        # Try city-based lookup
        city = building.get("city")
        result = await service.get_air_quality_for_city(city) if city else None
    
    if result:
        result["building_id"] = building_id
        # Update building AQI in database
        await db.buildings.update_one(
            {"building_id": building_id},
            {"$set": {
                "current_aqi": result.get("aqi_value"),
                "aqi_source": "Open-Meteo",
                "aqi_updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result
    
    # Return cached value if no live data
    return {
        "building_id": building_id,
        "aqi_value": building.get("current_aqi"),
        "aqi_level": "Unknown",
        "data_source": "Cached",
        "message": "Using cached AQI - live data unavailable"
    }

# ==================== SOLUTION TYPES ====================
@api_router.get("/solution-types")
async def list_solution_types(category: Optional[str] = None):
    """Get all solution types"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    types = await db.solution_types.find(query, {"_id": 0}).to_list(100)
    return types

@api_router.get("/solution-types/{solution_type_id}")
async def get_solution_type(solution_type_id: str):
    """Get solution type details"""
    sol_type = await db.solution_types.find_one({"solution_type_id": solution_type_id}, {"_id": 0})
    if not sol_type:
        raise HTTPException(status_code=404, detail="Solution type not found")
    return sol_type

# ==================== PROVIDERS ====================
@api_router.get("/providers")
async def list_providers(
    city: Optional[str] = None,
    service_type: Optional[str] = None,
    rating: Optional[float] = None,
    limit: int = Query(default=20, le=100)
):
    """Browse solution providers"""
    query = {"verification_status": "approved"}
    
    if city:
        query["service_areas"] = {"$in": [city]}
    if service_type:
        query["company_type"] = service_type
    if rating:
        query["customer_rating"] = {"$gte": rating}
    
    providers = await db.solution_providers.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return providers

@api_router.get("/providers/{provider_id}")
async def get_provider(provider_id: str):
    """Get provider details"""
    provider = await db.solution_providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider

@api_router.post("/providers/signup")
async def provider_signup(request: Request, provider: ProviderCreate):
    """Sign up as a solution provider"""
    user = await require_auth(request)
    
    # Check if user already has a provider profile
    existing = await db.solution_providers.find_one({"user_id": user.user_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Provider profile already exists")
    
    provider_id = f"prv_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    provider_doc = {
        "provider_id": provider_id,
        "user_id": user.user_id,
        **provider.model_dump(),
        "verification_status": "pending",
        "customer_rating": None,
        "review_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.solution_providers.insert_one(provider_doc)
    
    # Update user type
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"user_type": "provider", "updated_at": now}}
    )
    
    if "_id" in provider_doc:
        del provider_doc["_id"]
    return provider_doc

@api_router.get("/admin/providers/pending")
async def admin_pending_providers(request: Request):
    """Admin: Get pending provider applications"""
    await require_admin(request)
    
    providers = await db.solution_providers.find(
        {"verification_status": "pending"}, {"_id": 0}
    ).to_list(100)
    return providers

@api_router.post("/admin/providers/{provider_id}/approve")
async def admin_approve_provider(provider_id: str, request: Request):
    """Admin: Approve a provider"""
    user = await require_admin(request)
    
    result = await db.solution_providers.update_one(
        {"provider_id": provider_id},
        {"$set": {
            "verification_status": "approved",
            "approval_date": datetime.now(timezone.utc).isoformat(),
            "approved_by_admin_id": user.user_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    return {"provider_id": provider_id, "verification_status": "approved"}

# ==================== LEADS ====================
@api_router.post("/leads/create")
async def create_lead(request: Request, lead: LeadCreate):
    """Create a new lead"""
    user = await require_auth(request)
    
    # Verify building exists
    building = await db.buildings.find_one({"building_id": lead.building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    lead_id = f"lead_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    lead_doc = {
        "lead_id": lead_id,
        "user_id": user.user_id,
        **lead.model_dump(),
        "lead_status": "new",
        "created_at": now,
        "updated_at": now
    }
    
    await db.leads.insert_one(lead_doc)
    if "_id" in lead_doc:
        del lead_doc["_id"]
    return lead_doc

@api_router.get("/leads/user")
async def get_user_leads(request: Request):
    """Get leads submitted by current user"""
    user = await require_auth(request)
    
    leads = await db.leads.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return leads

@api_router.get("/leads/provider")
async def get_provider_leads(request: Request):
    """Get leads for current provider"""
    user = await require_auth(request)
    
    # Get provider profile
    provider = await db.solution_providers.find_one({"user_id": user.user_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    
    leads = await db.leads.find({"provider_id": provider["provider_id"]}, {"_id": 0}).to_list(100)
    return leads

@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, request: Request):
    """Update lead status"""
    await require_auth(request)  # Auth check only
    body = await request.json()
    
    new_status = body.get("status")
    if new_status not in [s.value for s in LeadStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {
        "lead_status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if new_status == "contacted":
        update_data["contacted_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    return lead

# ==================== INITIATIVES ====================
@api_router.post("/initiatives/create")
async def create_initiative(request: Request, initiative: InitiativeCreate):
    """Create a new initiative (become a champion)"""
    user = await require_auth(request)
    
    initiative_id = f"init_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    initiative_doc = {
        "initiative_id": initiative_id,
        "champion_id": user.user_id,
        **initiative.model_dump(),
        "funding_pledged": 0,
        "team_members": [user.user_id],
        "visibility": "public",
        "created_at": now,
        "updated_at": now
    }
    
    await db.initiatives.insert_one(initiative_doc)
    if "_id" in initiative_doc:
        del initiative_doc["_id"]
    return initiative_doc

@api_router.get("/initiatives")
async def list_initiatives(
    initiative_type: Optional[str] = None,
    area: Optional[str] = None,
    limit: int = Query(default=20, le=100)
):
    """List public initiatives"""
    query = {"visibility": "public"}
    
    if initiative_type:
        query["initiative_type"] = initiative_type
    if area:
        query["area"] = {"$regex": area, "$options": "i"}
    
    initiatives = await db.initiatives.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return initiatives

@api_router.get("/initiatives/{initiative_id}")
async def get_initiative(initiative_id: str):
    """Get initiative details"""
    initiative = await db.initiatives.find_one({"initiative_id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    # Get pledges
    pledges = await db.initiative_pledges.find({"initiative_id": initiative_id}, {"_id": 0}).to_list(100)
    
    # Get champion info
    champion = await db.users.find_one({"user_id": initiative["champion_id"]}, {"_id": 0, "user_id": 1, "name": 1, "picture": 1})
    
    return {
        "initiative": initiative,
        "pledges": pledges,
        "champion": champion
    }

@api_router.post("/initiatives/{initiative_id}/pledge")
async def create_pledge(initiative_id: str, request: Request, pledge: PledgeCreate):
    """Pledge support to an initiative"""
    user = await require_auth(request)
    
    # Verify initiative exists
    initiative = await db.initiatives.find_one({"initiative_id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    pledge_id = f"pledge_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    pledge_doc = {
        "pledge_id": pledge_id,
        "initiative_id": initiative_id,
        "pledger_id": user.user_id,
        **pledge.model_dump(),
        "pledge_status": "pledged",
        "created_at": now,
        "updated_at": now
    }
    
    await db.initiative_pledges.insert_one(pledge_doc)
    
    # Update funding pledged if it's a funding pledge
    if pledge.pledge_type == PledgeType.funding and pledge.pledge_amount:
        await db.initiatives.update_one(
            {"initiative_id": initiative_id},
            {"$inc": {"funding_pledged": pledge.pledge_amount}}
        )
    
    if "_id" in pledge_doc:
        del pledge_doc["_id"]
    return pledge_doc

@api_router.get("/initiatives/{initiative_id}/progress")
async def get_initiative_progress(initiative_id: str):
    """Get initiative progress data"""
    initiative = await db.initiatives.find_one({"initiative_id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    pledges = await db.initiative_pledges.find({"initiative_id": initiative_id}, {"_id": 0}).to_list(100)
    
    funding_progress = 0
    if initiative.get("funding_goal") and initiative["funding_goal"] > 0:
        funding_progress = (initiative.get("funding_pledged", 0) / initiative["funding_goal"]) * 100
    
    volunteer_count = len([p for p in pledges if p.get("pledge_type") == "volunteering"])
    
    return {
        "funding_goal": initiative.get("funding_goal", 0),
        "funding_pledged": initiative.get("funding_pledged", 0),
        "funding_progress": round(funding_progress, 1),
        "team_members": initiative.get("team_members", []),
        "volunteer_count": volunteer_count,
        "milestones": initiative.get("milestones", [])
    }

# ==================== BLOG (Feature Flagged) ====================
@api_router.get("/blog/posts")
async def list_blog_posts(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(default=10, le=50)
):
    """List blog posts (if feature enabled)"""
    if not await is_feature_enabled("blog"):
        raise HTTPException(status_code=404, detail="Feature not available")
    
    query = {"published": True}
    if category:
        query["category"] = category
    if tag:
        query["tags"] = {"$in": [tag]}
    
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    return posts

@api_router.get("/blog/posts/{slug}")
async def get_blog_post(slug: str):
    """Get blog post by slug"""
    if not await is_feature_enabled("blog"):
        raise HTTPException(status_code=404, detail="Feature not available")
    
    post = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Increment views
    await db.blog_posts.update_one({"slug": slug}, {"$inc": {"views_count": 1}})
    
    return post

# ==================== FORUM (Feature Flagged) ====================
@api_router.get("/forum/posts/{initiative_id}")
async def list_forum_posts(initiative_id: str, limit: int = Query(default=20, le=100)):
    """List forum posts for an initiative"""
    if not await is_feature_enabled("forum"):
        raise HTTPException(status_code=404, detail="Feature not available")
    
    posts = await db.forum_posts.find(
        {"initiative_id": initiative_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return posts

@api_router.post("/forum/posts/{initiative_id}")
async def create_forum_post(initiative_id: str, request: Request):
    """Create a forum post"""
    if not await is_feature_enabled("forum"):
        raise HTTPException(status_code=404, detail="Feature not available")
    
    user = await require_auth(request)
    body = await request.json()
    
    # Verify initiative exists
    initiative = await db.initiatives.find_one({"initiative_id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    post_id = f"forum_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    post_doc = {
        "forum_post_id": post_id,
        "initiative_id": initiative_id,
        "author_id": user.user_id,
        "title": body.get("title", ""),
        "content": body.get("content", ""),
        "post_type": body.get("post_type", "discussion"),
        "replies_count": 0,
        "views_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.forum_posts.insert_one(post_doc)
    if "_id" in post_doc:
        del post_doc["_id"]
    return post_doc

# ==================== GAMIFICATION (Feature Flagged) ====================
@api_router.get("/gamification/leaderboard")
async def get_leaderboard(city: Optional[str] = None, limit: int = Query(default=20, le=100)):
    """Get ward-level green rating leaderboard"""
    if not await is_feature_enabled("gamification"):
        raise HTTPException(status_code=404, detail="Feature not available")
    
    # Aggregate green scores by ward
    pipeline = [
        {"$match": {"is_approved": True}},
        {"$group": {
            "_id": {"city": "$city", "ward": "$ward"},
            "total_buildings": {"$sum": 1},
            "avg_data_quality": {"$avg": "$data_quality_score"},
            "total_footprint": {"$sum": "$building_footprint_area"}
        }},
        {"$sort": {"total_buildings": -1}},
        {"$limit": limit}
    ]
    
    if city:
        pipeline[0]["$match"]["city"] = {"$regex": city, "$options": "i"}
    
    results = await db.buildings.aggregate(pipeline).to_list(limit)
    
    leaderboard = []
    for i, r in enumerate(results):
        leaderboard.append({
            "rank": i + 1,
            "city": r["_id"]["city"],
            "ward": r["_id"]["ward"],
            "total_buildings": r["total_buildings"],
            "avg_data_quality": round(r.get("avg_data_quality") or 0, 1),
            "total_footprint": round(r.get("total_footprint") or 0, 0)
        })
    
    return leaderboard

# ==================== USER PROFILE ====================
@api_router.get("/users/{user_id}")
async def get_user_profile(user_id: str):
    """Get public user profile"""
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "bio": 1, "organization": 1, "user_type": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/profile")
async def update_user_profile(request: Request):
    """Update current user's profile"""
    user = await require_auth(request)
    body = await request.json()
    
    allowed_fields = ["name", "bio", "organization", "phone"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return updated_user

# ==================== STATS & METRICS ====================
@api_router.get("/stats/overview")
async def get_overview_stats():
    """Get platform overview statistics"""
    buildings_count = await db.buildings.count_documents({"is_approved": True})
    providers_count = await db.solution_providers.count_documents({"verification_status": "approved"})
    initiatives_count = await db.initiatives.count_documents({"visibility": "public"})
    users_count = await db.users.count_documents({})
    
    # Get cities covered
    cities = await db.buildings.distinct("city", {"is_approved": True})
    
    return {
        "buildings_analyzed": buildings_count,
        "active_providers": providers_count,
        "community_initiatives": initiatives_count,
        "registered_users": users_count,
        "cities_covered": len(cities),
        "cities": cities[:10]
    }

# ==================== SEED DATA ====================
@api_router.post("/admin/seed-data")
async def seed_initial_data(request: Request):
    """Seed initial data for MVP (admin only or first run)"""
    # Check if already seeded
    existing_flags = await db.feature_flags.count_documents({})
    if existing_flags > 0:
        return {"message": "Data already seeded"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Feature flags
    feature_flags = [
        {"flag_id": "flag_1", "name": "blog", "is_enabled": False, "description": "Blog & Resources module", "updated_at": now},
        {"flag_id": "flag_2", "name": "forum", "is_enabled": False, "description": "Project Forum module", "updated_at": now},
        {"flag_id": "flag_3", "name": "gamification", "is_enabled": False, "description": "Gamification & Leaderboards", "updated_at": now},
        {"flag_id": "flag_4", "name": "solar", "is_enabled": False, "description": "Solar solution type", "updated_at": now},
        {"flag_id": "flag_5", "name": "water", "is_enabled": False, "description": "Water harvesting solution", "updated_at": now},
        {"flag_id": "flag_6", "name": "waste", "is_enabled": False, "description": "Waste management solution", "updated_at": now},
        {"flag_id": "flag_7", "name": "show_user_map", "is_enabled": False, "description": "Show interactive map block on Building Report to public users. Admins always see it. Disabled by default — backend curation only.", "updated_at": now},
    ]
    await db.feature_flags.insert_many(feature_flags)
    
    # Solution types
    solution_types = [
        {
            "solution_type_id": "sol_terrace_green",
            "name": "Terrace Greening",
            "category": "greening",
            "description": "Transform your rooftop into a green oasis. Reduce heat, improve air quality, and create urban biodiversity.",
            "icon_name": "Leaf",
            "metrics": [
                {"name": "CO2 Sequestration", "unit": "kg/year", "formula": "area * 3.5", "confidence": 0.85},
                {"name": "Temperature Reduction", "unit": "°C", "formula": "coverage * 5", "confidence": 0.9},
                {"name": "Rainwater Retention", "unit": "liters/year", "formula": "area * rainfall * 0.6", "confidence": 0.8}
            ],
            "cost_range_min": 150,
            "cost_range_max": 500,
            "timeline_days": 30,
            "sub_types": [
                {"name": "Intensive Garden", "depth": "15-60cm", "maintenance": "high"},
                {"name": "Extensive Sedum", "depth": "5-15cm", "maintenance": "low"},
                {"name": "Container Garden", "depth": "variable", "maintenance": "medium"}
            ],
            "is_active": True,
            "created_at": now
        },
        {
            "solution_type_id": "sol_rooftop_solar",
            "name": "Rooftop Solar",
            "category": "energy",
            "description": "Harness solar energy to power your building. Reduce electricity costs and carbon footprint.",
            "icon_name": "Sun",
            "metrics": [
                {"name": "Annual Generation", "unit": "kWh/year", "formula": "area * 150 * efficiency", "confidence": 0.9},
                {"name": "CO2 Avoided", "unit": "kg/year", "formula": "generation * 0.82", "confidence": 0.95},
                {"name": "Cost Savings", "unit": "₹/year", "formula": "generation * tariff", "confidence": 0.85}
            ],
            "cost_range_min": 40000,
            "cost_range_max": 60000,
            "timeline_days": 45,
            "is_active": True,
            "created_at": now
        },
        {
            "solution_type_id": "sol_rainwater",
            "name": "Rainwater Harvesting",
            "category": "water",
            "description": "Capture and store rainwater for non-potable uses. Reduce water bills and groundwater dependency.",
            "icon_name": "Droplets",
            "metrics": [
                {"name": "Annual Collection", "unit": "liters/year", "formula": "area * rainfall * 0.8", "confidence": 0.85},
                {"name": "Water Cost Savings", "unit": "₹/year", "formula": "collection * water_rate", "confidence": 0.8}
            ],
            "cost_range_min": 50000,
            "cost_range_max": 200000,
            "timeline_days": 60,
            "is_active": True,
            "created_at": now
        }
    ]
    await db.solution_types.insert_many(solution_types)
    
    # Sample buildings (Delhi NCR, Mumbai, Pune)
    sample_buildings = [
        {"building_id": "bld_001", "address": "DLF Cyber City, Tower A", "city": "Gurugram", "pincode": "122002", "ward": "Sector 24", "latitude": 28.4949, "longitude": 77.0879, "building_type": "it_park", "building_footprint_area": 5000, "usable_terrace_area": 3500, "current_aqi": 156, "aqi_trend": "rising", "data_quality_score": 85, "is_approved": True, "created_at": now},
        {"building_id": "bld_002", "address": "Infosys Campus, Building 1", "city": "Pune", "pincode": "411057", "ward": "Hinjewadi Phase 1", "latitude": 18.5912, "longitude": 73.7388, "building_type": "it_park", "building_footprint_area": 8000, "usable_terrace_area": 6000, "current_aqi": 89, "aqi_trend": "stable", "data_quality_score": 92, "is_approved": True, "created_at": now},
        {"building_id": "bld_003", "address": "Mindspace IT Park, Tower B", "city": "Mumbai", "pincode": "400072", "ward": "Malad West", "latitude": 19.1726, "longitude": 72.8413, "building_type": "it_park", "building_footprint_area": 4500, "usable_terrace_area": 3000, "current_aqi": 112, "aqi_trend": "improving", "data_quality_score": 78, "is_approved": True, "created_at": now},
        {"building_id": "bld_004", "address": "Fortis Hospital", "city": "Delhi", "pincode": "110048", "ward": "Vasant Kunj", "latitude": 28.5244, "longitude": 77.1549, "building_type": "hospital", "building_footprint_area": 3000, "usable_terrace_area": 1800, "current_aqi": 178, "aqi_trend": "rising", "data_quality_score": 88, "is_approved": True, "created_at": now},
        {"building_id": "bld_005", "address": "BITS Pilani Campus", "city": "Pune", "pincode": "411045", "ward": "Balewadi", "latitude": 18.5568, "longitude": 73.7797, "building_type": "college", "building_footprint_area": 12000, "usable_terrace_area": 8500, "current_aqi": 78, "aqi_trend": "stable", "data_quality_score": 95, "is_approved": True, "created_at": now},
        {"building_id": "bld_006", "address": "World Trade Center", "city": "Mumbai", "pincode": "400005", "ward": "Cuffe Parade", "latitude": 18.9147, "longitude": 72.8228, "building_type": "commercial", "building_footprint_area": 6500, "usable_terrace_area": 4000, "current_aqi": 98, "aqi_trend": "improving", "data_quality_score": 82, "is_approved": True, "created_at": now},
        {"building_id": "bld_007", "address": "Noida Sector 62 Tech Park", "city": "Noida", "pincode": "201309", "ward": "Sector 62", "latitude": 28.6273, "longitude": 77.3714, "building_type": "it_park", "building_footprint_area": 7200, "usable_terrace_area": 5400, "current_aqi": 189, "aqi_trend": "rising", "data_quality_score": 75, "is_approved": True, "created_at": now},
        {"building_id": "bld_008", "address": "Phoenix Marketcity", "city": "Pune", "pincode": "411014", "ward": "Viman Nagar", "latitude": 18.5622, "longitude": 73.9169, "building_type": "commercial", "building_footprint_area": 9500, "usable_terrace_area": 7000, "current_aqi": 82, "aqi_trend": "stable", "data_quality_score": 90, "is_approved": True, "created_at": now},
    ]
    await db.buildings.insert_many(sample_buildings)
    
    # Generate recommendations for buildings
    recommendations = []
    audit_logs = []
    
    for bld in sample_buildings:
        for sol in solution_types[:1]:  # Start with terrace greening only
            rec_id = f"rec_{uuid.uuid4().hex[:12]}"
            area = bld.get("usable_terrace_area", 1000)
            
            # Calculate metrics
            co2_seq = area * 3.5
            temp_reduction = min(5, area / 1000 * 2.5)
            cost_low = area * sol["cost_range_min"]
            cost_high = area * sol["cost_range_max"]
            
            suitability = min(95, 60 + (bld.get("data_quality_score", 70) / 10) + (area / 500))
            
            recommendations.append({
                "recommendation_id": rec_id,
                "building_id": bld["building_id"],
                "solution_type_id": sol["solution_type_id"],
                "suitability_score": round(suitability, 1),
                "reasoning": f"Based on {area} sqm usable terrace area and current AQI of {bld.get('current_aqi', 'N/A')}, terrace greening can significantly improve local air quality and reduce building temperature.",
                "impact_projections": {
                    "co2_sequestration_kg_year": round(co2_seq, 0),
                    "temperature_reduction_c": round(temp_reduction, 1),
                    "biodiversity_species": 15 + int(area / 500)
                },
                "cost_estimate": int((cost_low + cost_high) / 2),
                "required_area": area,
                "created_at": now
            })
            
            # Create audit log
            audit_logs.append({
                "audit_id": f"audit_{uuid.uuid4().hex[:12]}",
                "recommendation_id": rec_id,
                "building_id": bld["building_id"],
                "calculation_steps": [
                    {"step": 1, "description": "Determine usable terrace area", "input": f"{area} sqm", "source": "Building footprint data"},
                    {"step": 2, "description": "Calculate CO2 sequestration", "formula": "area × 3.5 kg/sqm/year", "result": f"{co2_seq} kg/year", "source": "EPA Green Roof Study 2023"},
                    {"step": 3, "description": "Estimate temperature reduction", "formula": "min(5°C, area/1000 × 2.5)", "result": f"{temp_reduction}°C", "source": "Urban Heat Island Research, IIT Delhi"},
                    {"step": 4, "description": "Calculate cost range", "formula": "area × (₹150-500/sqft)", "result": f"₹{cost_low:,} - ₹{cost_high:,}", "source": "Market survey 2024"}
                ],
                "final_output": {
                    "co2_sequestration": {"value": co2_seq, "unit": "kg/year", "confidence": 0.85, "range_low": co2_seq * 0.8, "range_high": co2_seq * 1.2},
                    "cost_estimate": {"value": (cost_low + cost_high) / 2, "unit": "INR", "confidence": 0.75, "range_low": cost_low, "range_high": cost_high}
                },
                "created_at": now
            })
    
    await db.solution_recommendations.insert_many(recommendations)
    await db.calculation_audit_log.insert_many(audit_logs)
    
    # Sample provider
    sample_provider = {
        "provider_id": "prv_sample_001",
        "user_id": "user_provider_001",
        "company_name": "GreenScape Solutions",
        "company_type": "landscaper",
        "description": "Leading terrace garden specialists with 10+ years of experience in urban greening projects across India.",
        "service_areas": ["Delhi", "Gurugram", "Noida", "Mumbai", "Pune"],
        "certifications": [
            {"name": "IGBC Certified", "issued_by": "Indian Green Building Council", "valid_until": "2026-12-31"},
            {"name": "ISO 14001", "issued_by": "BSI", "valid_until": "2025-06-30"}
        ],
        "portfolio_projects": [
            {"name": "DLF Cyber Hub Garden", "location": "Gurugram", "area": 2500, "impact": "1500 kg CO2/year"},
            {"name": "Infosys Pune Rooftop", "location": "Pune", "area": 4000, "impact": "2800 kg CO2/year"}
        ],
        "pricing_model": "per_sqft",
        "team_composition": {"landscape_architects": 3, "horticulturists": 5, "installation_crew": 12},
        "verification_status": "approved",
        "approval_date": now,
        "customer_rating": 4.7,
        "review_count": 28,
        "created_at": now
    }
    await db.solution_providers.insert_one(sample_provider)
    
    # Create provider user
    await db.users.insert_one({
        "user_id": "user_provider_001",
        "email": "contact@greenscape.in",
        "name": "GreenScape Solutions",
        "user_type": "provider",
        "created_at": now
    })
    
    # Sample initiative
    sample_initiative = {
        "initiative_id": "init_sample_001",
        "champion_id": "user_provider_001",
        "title": "Green Gurugram 2025",
        "description": "A community-driven initiative to green 100 commercial rooftops in Gurugram by end of 2025, creating a network of urban green spaces.",
        "initiative_type": "community",
        "area": "Gurugram",
        "impact_goal": {"metric": "rooftops_greened", "target": 100, "unit": "buildings"},
        "funding_goal": 5000000,
        "funding_pledged": 1250000,
        "start_date": "2025-01-01",
        "end_date": "2025-12-31",
        "milestones": [
            {"date": "2025-03-31", "description": "10 buildings completed", "status": "completed"},
            {"date": "2025-06-30", "description": "30 buildings completed", "status": "in_progress"},
            {"date": "2025-09-30", "description": "60 buildings completed", "status": "pending"},
            {"date": "2025-12-31", "description": "100 buildings completed", "status": "pending"}
        ],
        "team_members": ["user_provider_001"],
        "visibility": "public",
        "created_at": now
    }
    await db.initiatives.insert_one(sample_initiative)
    
    return {"message": "Initial data seeded successfully", "buildings": len(sample_buildings), "solution_types": len(solution_types)}

# ==================== SEED BLOG CONTENT ====================
@api_router.post("/admin/seed-blog")
async def seed_blog_content(request: Request):
    """Seed blog content and enable blog feature"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if already seeded
    existing_posts = await db.blog_posts.count_documents({})
    if existing_posts > 0:
        return {"message": "Blog content already seeded"}
    
    # Sample blog posts
    blog_posts = [
        {
            "post_id": f"post_{uuid.uuid4().hex[:12]}",
            "title": "Complete Guide to Rooftop Greening in Indian Cities",
            "slug": "guide-rooftop-greening-india",
            "author_id": "user_provider_001",
            "content": """Rooftop greening is transforming urban landscapes across India. With rising temperatures and deteriorating air quality, green roofs offer a sustainable solution for commercial buildings.

What is Rooftop Greening?
Rooftop greening involves creating vegetated areas on building rooftops. These can range from simple sedum mats to elaborate gardens with trees and walkways.

Benefits for Indian Buildings:
1. Temperature Reduction: Green roofs can reduce indoor temperatures by 3-5°C, significantly cutting AC costs.
2. Air Quality Improvement: Plants absorb pollutants and produce oxygen, improving local air quality.
3. Rainwater Management: Vegetated roofs retain 60-70% of rainfall, reducing runoff and flooding.
4. Biodiversity: Urban gardens provide habitat for birds, butterflies, and beneficial insects.
5. Property Value: Green buildings command 10-15% premium in the market.

Getting Started:
- Assess your terrace area and structural capacity
- Choose appropriate plants for your climate zone
- Work with certified landscapers for installation
- Plan for maintenance and irrigation

The Sus10 AI platform can help you assess your building's green potential and connect you with verified providers.""",
            "excerpt": "Transform your building's terrace into a thriving green space. Learn about the benefits, costs, and implementation strategies for rooftop gardens in Indian commercial buildings.",
            "featured_image_url": "https://images.pexels.com/photos/29206495/pexels-photo-29206495.jpeg?auto=compress&cs=tinysrgb&w=800",
            "category": "guides",
            "tags": ["rooftop-greening", "sustainability", "commercial-buildings", "india"],
            "published": True,
            "published_at": now,
            "views_count": 156,
            "created_at": now
        },
        {
            "post_id": f"post_{uuid.uuid4().hex[:12]}",
            "title": "Case Study: How DLF Cyber Hub Achieved 40% Energy Savings",
            "slug": "case-study-dlf-cyber-hub-green-transformation",
            "author_id": "user_provider_001",
            "content": """DLF Cyber Hub in Gurugram has become a landmark example of sustainable urban development. Through comprehensive green interventions, the campus achieved remarkable environmental and financial outcomes.

The Challenge:
With over 50,000 daily visitors and extreme Delhi NCR summers, Cyber Hub faced:
- High cooling costs (40% of operational budget)
- Urban heat island effect (5-7°C higher than surroundings)
- Air quality index regularly exceeding 200

The Solution:
A multi-pronged sustainability approach:
1. Terrace Gardens: 2,500 sqm of intensive green roofs across buildings
2. Vertical Gardens: Living walls on parking structures
3. Solar Integration: 500 kW rooftop solar installation
4. Rainwater Harvesting: 1 million liters annual collection capacity

Results After 2 Years:
- 40% reduction in cooling costs
- 3°C average temperature reduction on campus
- 1,500 kg CO2 sequestered annually
- Property valuations increased 15%
- Employee satisfaction scores up 25%

Key Learnings:
Start with a comprehensive building assessment to prioritize interventions based on ROI and impact.""",
            "excerpt": "Discover how one of India's busiest commercial hubs transformed its environmental footprint while achieving significant cost savings.",
            "featured_image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=compress&w=800",
            "category": "case-studies",
            "tags": ["case-study", "dlf", "gurugram", "energy-savings", "green-building"],
            "published": True,
            "published_at": now,
            "views_count": 234,
            "created_at": now
        },
        {
            "post_id": f"post_{uuid.uuid4().hex[:12]}",
            "title": "Understanding AQI: What Building Managers Need to Know",
            "slug": "understanding-aqi-building-managers",
            "author_id": "user_provider_001",
            "content": """Air Quality Index (AQI) directly impacts building occupant health and productivity. Understanding AQI helps building managers make informed decisions about sustainability investments.

What is AQI?
AQI is a standardized index that communicates how polluted the air is. In India, it's calculated based on eight pollutants including PM2.5, PM10, NO2, SO2, CO, O3, NH3, and Pb.

AQI Categories:
- 0-50: Good (Minimal impact)
- 51-100: Satisfactory (Minor discomfort for sensitive people)
- 101-200: Moderate (Discomfort for all)
- 201-300: Poor (Health effects for everyone)
- 301-400: Very Poor (Serious health effects)
- 401-500: Severe (Emergency conditions)

Impact on Buildings:
Research shows that indoor AQI is often 2-5x worse than outdoor levels in commercial buildings. This affects:
- Employee productivity (drops 6% for every 10-point AQI increase)
- Sick leave (increases 15% in high-AQI environments)
- HVAC costs (filters clog faster, requiring more maintenance)

Mitigation Strategies:
1. Green roofs and walls to filter pollutants
2. Strategic tree planting around building perimeter
3. Enhanced HVAC filtration systems
4. Air quality monitoring and alerts

Sus10 AI tracks real-time AQI data for all analyzed buildings, helping you prioritize interventions.""",
            "excerpt": "Learn how Air Quality Index affects your building's occupants and what steps you can take to improve indoor air quality.",
            "featured_image_url": "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=compress&w=800",
            "category": "sustainability",
            "tags": ["aqi", "air-quality", "health", "indoor-environment"],
            "published": True,
            "published_at": now,
            "views_count": 189,
            "created_at": now
        },
        {
            "post_id": f"post_{uuid.uuid4().hex[:12]}",
            "title": "New Government Incentives for Green Buildings in 2026",
            "slug": "government-incentives-green-buildings-2026",
            "author_id": "user_provider_001",
            "content": """The Indian government has announced significant incentives for green building adoption in 2026. Here's what building owners need to know.

Key Announcements:

1. Tax Benefits:
- 30% accelerated depreciation for green roof installations
- GST exemption on eco-friendly building materials
- Property tax rebates of up to 20% for certified green buildings

2. Subsidies:
- ₹500/sqm subsidy for rooftop solar installations
- 50% subsidy on rainwater harvesting systems
- Interest rate subvention of 2% on green building loans

3. Certification Incentives:
- Fast-track approvals for IGBC/GRIHA certified projects
- Floor area ratio (FAR) bonuses for green buildings
- Priority in municipal tenders

Eligibility Criteria:
- Building must achieve minimum 3-star IGBC rating
- Installation must be done by certified contractors
- Annual audit required for continued benefits

How to Apply:
1. Get your building assessed on Sus10 AI
2. Implement recommended solutions
3. Apply for certification through IGBC/GRIHA
4. Submit documents to local municipal corporation

These incentives make 2026 the best time to invest in building sustainability.""",
            "excerpt": "Breaking down the new 2026 government incentives that make green building investments more attractive than ever.",
            "featured_image_url": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=compress&w=800",
            "category": "news",
            "tags": ["government", "incentives", "policy", "tax-benefits", "subsidies"],
            "published": True,
            "published_at": now,
            "views_count": 312,
            "created_at": now
        }
    ]
    
    await db.blog_posts.insert_many(blog_posts)
    
    # Enable blog feature flag
    await db.feature_flags.update_one(
        {"name": "blog"},
        {"$set": {"is_enabled": True, "updated_at": now}}
    )
    
    # Enable forum feature flag
    await db.feature_flags.update_one(
        {"name": "forum"},
        {"$set": {"is_enabled": True, "updated_at": now}}
    )
    
    return {"message": "Blog content seeded and features enabled", "posts_created": len(blog_posts)}

# ==================== GROUPS & CLUSTERS (Multi-building hierarchy) ====================
# Hierarchy: Group (developer/federation) -> Cluster (project/society, optional) -> Building
# Use cases: Embassy/Prestige portfolio rollup, RWA federations, BRSR/ESG reporting
from services.sustenance_calculator import (
    calculate_full_sustenance_potential,
    aggregate_group_potential,
    calculate_solar_potential,
    calculate_rainwater_potential,
    calculate_biogas_potential,
    calculate_plantation_potential,
)
from services.gemini_rooftop_analyzer import analyze_rooftop
from services.email_service import send_report_email, send_admin_notification

class GroupCreate(BaseModel):
    name: str
    type: str = "enterprise"  # developer | federation | enterprise | rwa | chain
    description: Optional[str] = None
    owner_org: Optional[str] = None
    primary_city: Optional[str] = None
    branding_color: Optional[str] = None
    logo_url: Optional[str] = None


@api_router.post("/groups")
async def create_group(request: Request, group: GroupCreate):
    """Create a new building group (developer/federation/chain). Requires auth."""
    user = await require_auth(request)
    now = datetime.now(timezone.utc)
    group_id = f"grp_{uuid.uuid4().hex[:12]}"
    doc = {
        "group_id": group_id,
        "name": group.name,
        "type": group.type,
        "description": group.description,
        "owner_org": group.owner_org,
        "primary_city": group.primary_city,
        "branding_color": group.branding_color,
        "logo_url": group.logo_url,
        "building_ids": [],
        "cluster_ids": [],
        "created_by": user.user_id,
        "created_at": now,
        "updated_at": now,
    }
    await db.groups.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/groups")
async def list_groups(request: Request, limit: int = Query(default=50, le=200)):
    """List all groups created by current user (or all if admin)."""
    user = await require_auth(request)
    query = {} if user.user_type == "admin" else {"created_by": user.user_id}
    groups = await db.groups.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return groups


@api_router.get("/groups/{group_id}")
async def get_group(group_id: str):
    """Get group details + linked buildings."""
    group = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    building_ids = group.get("building_ids", [])
    buildings = []
    if building_ids:
        buildings = await db.buildings.find(
            {"building_id": {"$in": building_ids}}, {"_id": 0}
        ).to_list(len(building_ids))
    group["buildings"] = buildings
    return group


@api_router.post("/groups/{group_id}/buildings")
async def add_buildings_to_group(group_id: str, request: Request):
    """Add one or more buildings to a group. Body: {building_ids: [...]}"""
    user = await require_auth(request)
    group = await db.groups.find_one({"group_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.get("created_by") != user.user_id and user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to modify this group")
    body = await request.json()
    new_ids = body.get("building_ids", [])
    if not isinstance(new_ids, list):
        raise HTTPException(status_code=400, detail="building_ids must be a list")
    existing = set(group.get("building_ids", []))
    existing.update(new_ids)
    await db.groups.update_one(
        {"group_id": group_id},
        {"$set": {"building_ids": list(existing), "updated_at": datetime.now(timezone.utc)}},
    )
    updated = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    return updated


@api_router.delete("/groups/{group_id}/buildings/{building_id}")
async def remove_building_from_group(group_id: str, building_id: str, request: Request):
    """Remove a building from a group."""
    user = await require_auth(request)
    group = await db.groups.find_one({"group_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.get("created_by") != user.user_id and user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.groups.update_one(
        {"group_id": group_id},
        {"$pull": {"building_ids": building_id}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True}


@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, request: Request):
    """Delete a group (does NOT delete buildings)."""
    user = await require_auth(request)
    group = await db.groups.find_one({"group_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.get("created_by") != user.user_id and user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.groups.delete_one({"group_id": group_id})
    return {"ok": True}


# ==================== SUSTENANCE POTENTIAL ENDPOINTS ====================
@api_router.get("/sustenance/building/{building_id}")
async def get_building_sustenance(
    building_id: str,
    plantation_type: str = "mixed",
    floors: int = 1,
    occupants: Optional[int] = None,
    families: Optional[int] = None,
    waste_kg_per_family_per_day: Optional[float] = None,
):
    """Compute 4-pillar sustenance potential for a single building (solar/plantation/biogas/rainwater).

    Optional adjustables (used by E1.2 Sustenance Potential page):
    - families × waste_kg_per_family_per_day → overrides biogas inputs.
    """
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    report = calculate_full_sustenance_potential(
        building=building,
        plantation_type=plantation_type,
        floors=floors,
        occupants_override=occupants,
        families=families,
        waste_kg_per_family_per_day=waste_kg_per_family_per_day,
    )
    return report


@api_router.get("/buildings/{building_id}/potential")
async def get_building_potential(
    building_id: str,
    plantation_type: str = "mixed",
    floors: int = 1,
    families: Optional[int] = None,
    waste_kg_per_family_per_day: Optional[float] = None,
):
    """E1.2 — Sustenance Potential at-a-glance.

    Same engine as /sustenance/building/{id} but also returns a lightweight
    summary block tailored for the 4-widget at-a-glance page (Solar, Biogas,
    Rainwater, Greening) along with the source building snapshot.
    """
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    # Sensible defaults for the biogas slider when no override is provided.
    btype = (building.get("building_type") or "").lower()
    if families is None:
        if btype in ("residential", "apartment", "housing_society"):
            # ~4 occupants per family; assume 80% of footprint × floors usable
            built_up = (building.get("building_footprint_area") or 0) * floors
            families = max(1, int(built_up * 0.0125))   # ~80 sqm per family
        else:
            families = None  # commercial/it_park/etc → keep occupancy heuristic
    if waste_kg_per_family_per_day is None:
        # CPCB norm midpoint (~0.4 kg/person/day × 4 = ~1.6, but kitchen-only ~0.5–1.0)
        waste_kg_per_family_per_day = 0.5

    report = calculate_full_sustenance_potential(
        building=building,
        plantation_type=plantation_type,
        floors=floors,
        families=families,
        waste_kg_per_family_per_day=waste_kg_per_family_per_day,
    )

    pillars = report.get("pillars", {})
    solar = pillars.get("solar", {})
    plantation = pillars.get("plantation", {})
    biogas = pillars.get("biogas", {})
    rain = pillars.get("rainwater", {})

    widgets = [
        {
            "key": "solar",
            "title": "Solar PV",
            "headline_value": solar.get("annual_generation_kwh"),
            "headline_unit": "kWh / year",
            "subheadings": [
                f"{solar.get('installed_capacity_kwp', 0)} kWp installable",
                f"~₹{solar.get('annual_savings_inr', 0):,} saved/year",
                f"{solar.get('co2_offset_kg_per_year', 0):,} kg CO₂ offset/year",
            ],
            "color": "#f59e0b",
            "drill_route": f"/buildings/{building_id}#solar",
        },
        {
            "key": "biogas",
            "title": "Biogas & Composting",
            "headline_value": biogas.get("biogas_m3_per_year"),
            "headline_unit": "m³ / year",
            "subheadings": [
                f"{biogas.get('daily_organic_waste_kg', 0)} kg waste diverted/day",
                f"~₹{biogas.get('annual_savings_inr', 0):,} LPG saved/year",
                biogas.get("recommended_plant_size", ""),
            ],
            "color": "#16a34a",
            "drill_route": f"/buildings/{building_id}#biogas",
            "adjustable": {
                "families": report.get("pillars", {}).get("biogas", {}).get("families_estimated"),
                "waste_kg_per_family_per_day": waste_kg_per_family_per_day,
            },
        },
        {
            "key": "rainwater",
            "title": "Rainwater Harvesting",
            "headline_value": rain.get("annual_yield_kiloliters"),
            "headline_unit": "kL / year",
            "subheadings": [
                f"{rain.get('catchment_area_sqm', 0):,} sqm catchment",
                f"~₹{rain.get('annual_savings_inr', 0):,} saved/year",
                f"{rain.get('households_served', 0)} households served",
            ],
            "color": "#0ea5e9",
            "drill_route": f"/buildings/{building_id}#rainwater",
        },
        {
            "key": "greening",
            "title": "Greening & Plantation",
            "headline_value": plantation.get("total_plants_count"),
            "headline_unit": "plants",
            "subheadings": [
                f"{plantation.get('annual_food_yield_kg', 0)} kg food/year",
                f"{plantation.get('co2_sequestered_kg_per_year', 0):,} kg CO₂ sequestered/year",
                f"{plantation.get('temp_reduction_c', 0)}°C cooling",
            ],
            "color": "#14b8a6",
            "drill_route": f"/buildings/{building_id}#plantation",
        },
    ]

    # Narrative hero — translates the numbers into human meaning.
    summary = report.get("summary") or {}
    annual_savings = int(summary.get("total_annual_savings_inr") or 0)
    co2_tonnes = float(summary.get("total_co2_offset_tonnes_per_year") or 0)
    solar_kwh = int(summary.get("solar_kwh_per_year") or 0)
    rainwater_kl = float(summary.get("rainwater_kl_per_year") or 0)
    # Avg Indian car ~4.6 tCO2/year (Petrol mid-size). Cars-equivalent for tangibility.
    cars_offset = int(round(co2_tonnes / 4.6)) if co2_tonnes else 0
    households_water = int(round((rainwater_kl * 1000) / (135 * 4 * 365))) if rainwater_kl else 0  # 135 L/person/day × 4

    def _fmt_inr(amount: int) -> str:
        if amount >= 10_000_000:
            return f"₹{amount/10_000_000:.1f} Cr"
        if amount >= 100_000:
            return f"₹{amount/100_000:.1f} L"
        if amount >= 1000:
            return f"₹{amount/1000:.0f}k"
        return f"₹{amount}"

    bname = building.get("name") or building.get("address") or "This building"
    bcity = building.get("city") or ""
    narrative_parts: List[str] = []
    if co2_tonnes and annual_savings:
        narrative_parts.append(
            f"If **{bname}** activated its full potential, it would offset **{co2_tonnes:,.0f} tonnes of CO₂** every year"
        )
        if cars_offset:
            narrative_parts.append(f"— the same as taking **{cars_offset:,} cars off {bcity}'s roads**" if bcity else f"— the same as taking **{cars_offset:,} cars off the road**")
        narrative_parts.append(f"— while saving **{_fmt_inr(annual_savings)}** for you.")
    elif annual_savings:
        narrative_parts.append(f"**{bname}** could save **{_fmt_inr(annual_savings)}** every year through integrated sustenance.")
    else:
        narrative_parts.append(f"Here's what **{bname}** can do across the 4 pillars of sustenance.")
    narrative_headline = " ".join(narrative_parts).strip()

    narrative_chips: List[Dict[str, str]] = []
    if solar_kwh:
        narrative_chips.append({"label": "Solar", "value": f"{solar_kwh:,} kWh/yr"})
    if rainwater_kl:
        narrative_chips.append({"label": "Rainwater", "value": f"{rainwater_kl:,.0f} kL/yr"})
        if households_water:
            narrative_chips.append({"label": "Households water", "value": f"~{households_water} for a year"})
    if co2_tonnes:
        narrative_chips.append({"label": "CO₂ offset", "value": f"{co2_tonnes:,.0f} t/yr"})

    return {
        "building": {
            "building_id": building.get("building_id"),
            "name": building.get("name") or building.get("address"),
            "address": building.get("address"),
            "city": building.get("city"),
            "building_type": building.get("building_type"),
            "footprint_area_sqm": building.get("building_footprint_area"),
            "usable_terrace_sqm": building.get("usable_terrace_area"),
            "image_url": building.get("primary_image_url"),
        },
        "widgets": widgets,
        "summary": summary,
        "pillars": pillars,
        "narrative": {
            "headline": narrative_headline,
            "chips": narrative_chips,
            "cars_offset_equivalent": cars_offset,
            "households_water_equivalent": households_water,
        },
        "inputs": {
            "families": families,
            "waste_kg_per_family_per_day": waste_kg_per_family_per_day,
            "floors": floors,
            "plantation_type": plantation_type,
        },
    }


# ==================== SERVER-SIDE PDF REPORT (E1.1) ====================
from fastapi.responses import Response as FastAPIResponse
from services.pdf_report import (
    PERSONAS as PDF_PERSONAS, build_report_context, render_report_pdf, parse_sections,
)


async def _build_pdf_for_building(
    *,
    building_id: str,
    persona: str,
    sections_raw: Optional[str],
    families: Optional[int],
    waste_kg_per_family_per_day: Optional[float],
    plantation_type: str = "mixed",
    floors: int = 1,
) -> tuple[bytes, str, Dict[str, Any]]:
    """Shared engine: fetches the building + matched data and renders the PDF."""
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    persona_key = persona if persona in PDF_PERSONAS else "citizen_owner"
    p_meta = PDF_PERSONAS[persona_key]
    sections = parse_sections(sections_raw, p_meta["default_sections"])

    sustenance = calculate_full_sustenance_potential(
        building=building, plantation_type=plantation_type,
        floors=floors,
        families=families if families else None,
        waste_kg_per_family_per_day=waste_kg_per_family_per_day if waste_kg_per_family_per_day else None,
    )

    # Subsidy match (best effort — never block the PDF)
    subsidies: List[Dict[str, Any]] = []
    if "subsidies" in sections:
        try:
            state = (building.get("state") or "").strip()
            or_clauses: List[Dict[str, Any]] = [{"geo_scope": "central"}]
            if state:
                or_clauses.append({"state": state})
            q = {"is_active": True, "$or": or_clauses}
            subsidies = await db.subsidies.find(q, {"_id": 0}).limit(8).to_list(8)
        except Exception as e:
            logger.warning(f"subsidy match failed for PDF: {e}")
            subsidies = []

    intel_notes = building.get("intel_notes") or []

    ctx = build_report_context(
        building=building, sustenance=sustenance, persona=persona_key,
        sections=sections, subsidies=subsidies, intel_notes=intel_notes,
    )
    pdf_bytes = render_report_pdf(ctx)
    filename = f"sus10-report-{building.get('building_id')}-{persona_key}.pdf"
    return pdf_bytes, filename, ctx


@api_router.get("/buildings/{building_id}/report.pdf")
async def get_building_report_pdf(
    building_id: str,
    persona: str = Query(default="citizen_owner"),
    sections: Optional[str] = Query(default=None, description="Comma-separated: summary,solar,plantation,biogas,rainwater,subsidies,methodology"),
    families: Optional[int] = None,
    waste_kg_per_family_per_day: Optional[float] = None,
    plantation_type: str = "mixed",
    floors: int = 1,
):
    """Server-side persona-tuned PDF feasibility report (E1.1, B1.2)."""
    pdf_bytes, filename, _ctx = await _build_pdf_for_building(
        building_id=building_id, persona=persona, sections_raw=sections,
        families=families, waste_kg_per_family_per_day=waste_kg_per_family_per_day,
        plantation_type=plantation_type, floors=floors,
    )
    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=\"{filename}\""},
    )


class ReportEmailRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    persona: str = "citizen_owner"
    sections: Optional[str] = None
    families: Optional[int] = None
    waste_kg_per_family_per_day: Optional[float] = None


@api_router.post("/buildings/{building_id}/report-email")
async def request_report_email(
    building_id: str, payload: ReportEmailRequest, request: Request,
):
    """N12 — "Email me this potential PDF" capture.

    Generates the persona-tuned PDF, stores it in GridFS, records the request
    in `pdf_email_requests`, and joins the email into beta_waitlist with
    persona='pdf-request' so we have a warm-lead segment to follow up.
    Email delivery is deferred to a separate worker / Resend integration; we
    return a download URL the user can grab immediately.
    """
    pdf_bytes, filename, _ctx = await _build_pdf_for_building(
        building_id=building_id, persona=payload.persona, sections_raw=payload.sections,
        families=payload.families, waste_kg_per_family_per_day=payload.waste_kg_per_family_per_day,
    )

    # Store the PDF inline in a Mongo collection (small file < 1 MB; matches
    # the existing cms_uploads pattern, no GridFS plumbing needed).
    upload_id = f"pdf_{uuid.uuid4().hex[:16]}"
    await db.pdf_uploads.insert_one({
        "upload_id": upload_id,
        "content_type": "application/pdf",
        "filename": filename,
        "size": len(pdf_bytes),
        "data": pdf_bytes,
        "building_id": building_id,
        "persona": payload.persona,
        "uploaded_at": datetime.now(timezone.utc),
    })
    download_url = f"/api/pdf-reports/{upload_id}"

    now = datetime.now(timezone.utc).isoformat()
    email = payload.email.strip().lower()
    record = {
        "request_id": f"pdfreq_{uuid.uuid4().hex[:12]}",
        "email": email,
        "name": payload.name,
        "building_id": building_id,
        "persona": payload.persona,
        "sections": payload.sections,
        "upload_id": upload_id,
        "filename": filename,
        "download_url": download_url,
        "delivered": False,
        "created_at": now,
        "ip": request.client.host if request.client else None,
    }
    await db.pdf_email_requests.insert_one(record)

    # Best-effort: add to beta_waitlist as a warm lead segment.
    try:
        existing = await db.beta_waitlist.find_one({"email": email}, {"_id": 0})
        if not existing:
            await db.beta_waitlist.insert_one({
                "waitlist_id": f"wl_{uuid.uuid4().hex[:12]}",
                "email": email,
                "name": payload.name,
                "persona": "pdf-request",
                "source": f"pdf:{payload.persona}",
                "created_at": now,
                "updated_at": now,
                "history": [{"persona": "pdf-request", "source": f"pdf:{payload.persona}", "at": now}],
            })
    except Exception as e:
        logger.warning(f"PDF-request waitlist join failed: {e}")

    record.pop("_id", None)
    return {
        "saved": True,
        "request_id": record["request_id"],
        "download_url": download_url,
        "filename": filename,
    }


@api_router.get("/pdf-reports/{upload_id}")
async def get_pdf_report(upload_id: str):
    """Serve a generated PDF report (public). Links produced by /report-email."""
    doc = await db.pdf_uploads.find_one({"upload_id": upload_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    return FastAPIResponse(
        content=doc["data"],
        media_type=doc.get("content_type", "application/pdf"),
        headers={
            "Content-Disposition": f"inline; filename=\"{doc.get('filename','report.pdf')}\"",
            "Cache-Control": "private, max-age=3600",
        },
    )


@api_router.get("/admin/pdf-email-requests")
async def admin_list_pdf_email_requests(
    request: Request,
    limit: int = Query(default=200, le=1000),
):
    """Admin: list all PDF-email requests (warm-lead funnel)."""
    await require_admin(request)
    items = await (
        db.pdf_email_requests.find({}, {"_id": 0})
        .sort("created_at", -1).limit(limit).to_list(limit)
    )
    total = await db.pdf_email_requests.count_documents({})
    return {"requests": items, "total": total, "limit": limit}


@api_router.get("/admin/pdf-funnel-stats")
async def admin_pdf_funnel_stats(request: Request, days: int = Query(default=30, ge=1, le=365)):
    """Admin Overview rollup: PDF generation funnel.

    Returns:
      - total_requests, total_unique_emails (lifetime)
      - last N days timeseries (daily buckets) for email-requested PDFs
      - top personas, top buildings by request count
    """
    await require_admin(request)
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=days)).isoformat()

    total_requests = await db.pdf_email_requests.count_documents({})
    pipeline_unique = [
        {"$group": {"_id": "$email"}},
        {"$count": "n"},
    ]
    unique_cur = db.pdf_email_requests.aggregate(pipeline_unique)
    unique_doc = await unique_cur.to_list(1)
    total_unique_emails = unique_doc[0]["n"] if unique_doc else 0

    # Daily timeseries — bucket by ISO date prefix (10 chars). Robust to mixed string/datetime.
    timeseries: List[Dict[str, Any]] = []
    daily_buckets: Dict[str, int] = {}
    cursor = db.pdf_email_requests.find(
        {"created_at": {"$gte": cutoff}},
        {"_id": 0, "created_at": 1},
    )
    async for doc in cursor:
        ts = doc.get("created_at")
        if isinstance(ts, datetime):
            day = ts.date().isoformat()
        else:
            day = str(ts)[:10]
        if len(day) == 10:
            daily_buckets[day] = daily_buckets.get(day, 0) + 1
    # Fill missing days with zero so the chart line is continuous.
    for i in range(days - 1, -1, -1):
        d = (now - timedelta(days=i)).date().isoformat()
        timeseries.append({"date": d, "count": daily_buckets.get(d, 0)})

    persona_pipe = [
        {"$group": {"_id": "$persona", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    persona_breakdown = [
        {"persona": doc.get("_id") or "unknown", "count": doc["count"]}
        async for doc in db.pdf_email_requests.aggregate(persona_pipe)
    ]

    building_pipe = [
        {"$group": {"_id": "$building_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_buildings_raw = [
        {"building_id": doc.get("_id"), "count": doc["count"]}
        async for doc in db.pdf_email_requests.aggregate(building_pipe)
    ]
    # Hydrate building names
    if top_buildings_raw:
        bids = [b["building_id"] for b in top_buildings_raw if b.get("building_id")]
        name_map = {
            b["building_id"]: (b.get("name") or b.get("address") or b["building_id"])
            async for b in db.buildings.find(
                {"building_id": {"$in": bids}},
                {"_id": 0, "building_id": 1, "name": 1, "address": 1},
            )
        }
        for b in top_buildings_raw:
            b["name"] = name_map.get(b.get("building_id"), b.get("building_id") or "—")

    last_window_count = sum(t["count"] for t in timeseries)
    return {
        "total_requests": total_requests,
        "total_unique_emails": total_unique_emails,
        "window_days": days,
        "window_total": last_window_count,
        "timeseries": timeseries,
        "by_persona": persona_breakdown,
        "top_buildings": top_buildings_raw,
    }


# ==================== ONE-CLICK CITY SEED (May 20, 2026) ====================
# Demo-grade convenience endpoint: discover + auto-approve in a single call.
# In-process insights cache invalidated as part of seeding.
_CITY_AGG_CACHE: Dict[tuple, Dict[str, Any]] = {}
_CITY_AGG_TTL_SEC = 600


class CitySeedRequest(BaseModel):
    city: str
    building_types: Optional[List[str]] = None  # if None, run a small "default mix"
    min_area: int = 1000
    limit_per_type: int = 20
    strict_type: bool = False
    auto_approve: bool = True


DEFAULT_SEED_MIX = ["commercial", "hospital", "college", "residential"]


@api_router.post("/admin/buildings/seed-city")
async def admin_seed_city(payload: CitySeedRequest, request: Request):
    """One-click background seed: discovers buildings across multiple types
    in a city, auto-approves them, invalidates insights cache.

    Returns immediately with `job_id`. The actual seeding runs in the
    background since Overpass + Google Places enrichment can take 2-5 min
    (far past the 60s gateway timeout). Poll `GET /api/admin/seed-jobs/{job_id}`
    for progress, or just open /insights/{city} after 1-2 min.
    """
    user = await require_admin(request)
    from building_discovery import discover_and_import_buildings, CITY_BOUNDS
    if payload.city not in CITY_BOUNDS:
        raise HTTPException(
            status_code=400,
            detail=f"City {payload.city} not supported. Supported: {sorted(CITY_BOUNDS.keys())}",
        )
    google_api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    types_to_run = payload.building_types or DEFAULT_SEED_MIX
    now_iso = datetime.now(timezone.utc).isoformat()
    job_id = f"seed_{uuid.uuid4().hex[:12]}"
    job_doc = {
        "job_id": job_id,
        "type": "city_seed",
        "city": payload.city,
        "types_to_run": types_to_run,
        "status": "running",
        "started_by": user.email,
        "started_at": now_iso,
        "totals": {"discovered": 0, "imported": 0, "skipped": 0, "skipped_type_mismatch": 0},
        "per_type": [],
        "auto_approved": 0,
        "auto_approve": payload.auto_approve,
        "insights_url": f"/insights/{payload.city}",
    }
    await db.seed_jobs.insert_one(job_doc)

    async def _run_seed():
        new_building_ids: List[str] = []
        per_type: List[Dict[str, Any]] = []
        totals = {"discovered": 0, "imported": 0, "skipped": 0, "skipped_type_mismatch": 0}
        for t in types_to_run:
            try:
                r = await discover_and_import_buildings(
                    city=payload.city,
                    building_type=t,
                    min_area=payload.min_area,
                    limit=payload.limit_per_type,
                    google_api_key=google_api_key,
                    db=db,
                    admin_user_id=user.user_id,
                    strict_type=payload.strict_type,
                )
                for k in totals:
                    totals[k] += r.get(k, 0) or 0
                for b in r.get("buildings", []) or []:
                    if b.get("building_id"):
                        new_building_ids.append(b["building_id"])
                per_type.append({"type": t, "imported": r.get("imported", 0), "discovered": r.get("discovered", 0)})
            except Exception as e:
                logger.error(f"seed-city {payload.city}/{t} failed: {e}")
                per_type.append({"type": t, "error": str(e)})
            # Live progress update so the UI can show partials.
            await db.seed_jobs.update_one(
                {"job_id": job_id},
                {"$set": {"totals": totals, "per_type": per_type, "updated_at": datetime.now(timezone.utc).isoformat()}},
            )

        approved = 0
        if payload.auto_approve and new_building_ids:
            iso = datetime.now(timezone.utc).isoformat()
            res = await db.buildings.update_many(
                {"building_id": {"$in": new_building_ids}},
                {"$set": {
                    "is_approved": True, "is_rejected": False,
                    "curated_by_admin_id": user.user_id, "updated_at": iso,
                }},
            )
            approved = res.modified_count

        # Clear insights cache for this city
        _CITY_AGG_CACHE.pop((payload.city.lower(), False), None)
        _CITY_AGG_CACHE.pop((payload.city.lower(), True), None)
        await db.seed_jobs.update_one(
            {"job_id": job_id},
            {"$set": {
                "status": "complete",
                "totals": totals,
                "per_type": per_type,
                "auto_approved": approved,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }},
        )

    asyncio.create_task(_run_seed())
    return {
        "job_id": job_id,
        "status": "running",
        "city": payload.city,
        "types_to_run": types_to_run,
        "poll_url": f"/api/admin/seed-jobs/{job_id}",
        "insights_url": f"/insights/{payload.city}",
        "message": f"Seeding {payload.city} in the background. Open the insights page in ~2 minutes, or poll the job to track progress.",
    }


@api_router.get("/admin/seed-jobs/{job_id}")
async def admin_get_seed_job(job_id: str, request: Request):
    await require_admin(request)
    doc = await db.seed_jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    return doc


# ==================== CITY/STATE AGGREGATE WHAT-IF (P2 May 20, 2026) ====================
# In-process TTL cache for city aggregates (defined above with seed-city).


@api_router.get("/insights/city/{city}")
async def aggregate_city_what_if(city: str, include_self_submitted: bool = False):
    """Aggregate 'what if every building in this city went green' rollup.

    Sums 4-pillar potential across all approved buildings (optionally including
    self-submitted from the homeowner calculator) in the named city. Returns
    totals, building-type breakdown, and a narrative tagline ready for the
    public Insights page.
    """
    cache_key = (city.lower(), bool(include_self_submitted))
    now_ts = datetime.now(timezone.utc).timestamp()
    cached = _CITY_AGG_CACHE.get(cache_key)
    if cached and now_ts - cached["_cached_at"] < _CITY_AGG_TTL_SEC:
        payload = {k: v for k, v in cached.items() if k != "_cached_at"}
        return payload

    query: Dict[str, Any] = {"city": {"$regex": f"^{re.escape(city)}$", "$options": "i"}}
    if not include_self_submitted:
        query["$or"] = [{"is_approved": True}, {"status": "approved"}]

    buildings_cursor = db.buildings.find(query, {"_id": 0})
    buildings = await buildings_cursor.to_list(2000)

    if not buildings:
        return {
            "city": city,
            "buildings_count": 0,
            "narrative": f"No curated buildings for {city} yet — be the first to add yours.",
            "totals": {},
            "by_type": [],
            "top_buildings": [],
        }

    totals = {
        "annual_savings_inr": 0,
        "co2_tonnes_per_year": 0.0,
        "solar_kwh_per_year": 0,
        "biogas_m3_per_year": 0,
        "rainwater_kl_per_year": 0.0,
        "plants_count": 0,
        "food_yield_kg_per_year": 0,
        "total_footprint_sqm": 0,
        "total_usable_terrace_sqm": 0,
    }
    by_type_acc: Dict[str, Dict[str, Any]] = {}
    per_building_savings: List[Dict[str, Any]] = []

    for b in buildings:
        try:
            report = calculate_full_sustenance_potential(building=b)
        except Exception as e:
            logger.warning(f"agg calc skipped for {b.get('building_id')}: {e}")
            continue
        summary = (report or {}).get("summary") or {}
        pillars = (report or {}).get("pillars") or {}
        savings = int(summary.get("total_annual_savings_inr") or 0)
        co2 = float(summary.get("total_co2_offset_tonnes_per_year") or 0)
        solar_kwh = int(summary.get("solar_kwh_per_year") or 0)
        biogas_m3 = int(summary.get("biogas_m3_per_year") or 0)
        rainwater_kl = float(summary.get("rainwater_kl_per_year") or 0)
        plants = int((pillars.get("plantation") or {}).get("total_plants_count") or 0)
        food_kg = int((pillars.get("plantation") or {}).get("annual_food_yield_kg") or 0)

        totals["annual_savings_inr"] += savings
        totals["co2_tonnes_per_year"] += co2
        totals["solar_kwh_per_year"] += solar_kwh
        totals["biogas_m3_per_year"] += biogas_m3
        totals["rainwater_kl_per_year"] += rainwater_kl
        totals["plants_count"] += plants
        totals["food_yield_kg_per_year"] += food_kg
        totals["total_footprint_sqm"] += int(b.get("building_footprint_area") or 0)
        totals["total_usable_terrace_sqm"] += int(b.get("usable_terrace_area") or 0)

        btype = b.get("building_type") or "unknown"
        bucket = by_type_acc.setdefault(btype, {"building_type": btype, "count": 0, "annual_savings_inr": 0, "co2_tonnes_per_year": 0.0})
        bucket["count"] += 1
        bucket["annual_savings_inr"] += savings
        bucket["co2_tonnes_per_year"] += co2

        per_building_savings.append({
            "building_id": b.get("building_id"),
            "name": b.get("name") or b.get("address") or b.get("building_id"),
            "annual_savings_inr": savings,
            "co2_tonnes_per_year": round(co2, 1),
        })

    by_type = sorted(by_type_acc.values(), key=lambda x: x["annual_savings_inr"], reverse=True)
    top_buildings = sorted(per_building_savings, key=lambda x: x["annual_savings_inr"], reverse=True)[:5]
    cars_offset = int(round(totals["co2_tonnes_per_year"] / 4.6))
    households_water = int(round((totals["rainwater_kl_per_year"] * 1000) / (135 * 4 * 365)))

    n_buildings = len(buildings)
    savings_disp = totals["annual_savings_inr"]
    if savings_disp >= 10_000_000:
        savings_str = f"₹{savings_disp/10_000_000:.1f} Cr"
    elif savings_disp >= 100_000:
        savings_str = f"₹{savings_disp/100_000:.1f} L"
    else:
        savings_str = f"₹{savings_disp:,}"

    narrative = (
        f"If every building we've mapped in **{city}** ({n_buildings} so far) activated its full potential, "
        f"the city would offset **{int(totals['co2_tonnes_per_year']):,} tonnes of CO₂** every year "
        f"— the same as taking **{cars_offset:,} cars off the road** — "
        f"while saving **{savings_str}** for building owners."
    )

    result = {
        "city": city,
        "buildings_count": n_buildings,
        "narrative": narrative,
        "narrative_chips": [
            {"label": "Cars offset equivalent", "value": f"~{cars_offset:,}"},
            {"label": "Households water/yr", "value": f"~{households_water:,}"},
            {"label": "Plants on rooftops", "value": f"~{totals['plants_count']:,}"},
        ],
        "totals": {
            **totals,
            "co2_tonnes_per_year": round(totals["co2_tonnes_per_year"], 1),
            "rainwater_kl_per_year": round(totals["rainwater_kl_per_year"], 1),
        },
        "by_type": by_type,
        "top_buildings": top_buildings,
    }
    _CITY_AGG_CACHE[cache_key] = {**result, "_cached_at": now_ts}
    return result


@api_router.get("/insights/cities")
async def list_aggregate_cities():
    """List cities that have at least one approved building (for the Insights nav)."""
    pipeline = [
        {"$match": {"$or": [{"is_approved": True}, {"status": "approved"}], "city": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 50},
    ]
    cities = [{"city": doc["_id"], "buildings_count": doc["count"]} async for doc in db.buildings.aggregate(pipeline)]
    return {"cities": cities}


# ==================== VENDOR ONE-PAGER PDF (P2 May 19, 2026) ====================
from services.vendor_offering_pdf import (
    build_vendor_offering_context, render_vendor_offering_pdf,
)


class VendorOfferingRequest(BaseModel):
    brand_name: str
    tagline: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    cities: Optional[str] = None  # comma-separated, free text
    years_experience: Optional[int] = None
    certifications: Optional[str] = None
    badges: Optional[List[str]] = None  # ["MNRE empanelled", "ISO 9001", …]
    accent_color: Optional[str] = "#0f3a3a"
    building_id: Optional[str] = None  # if set, sizes the brochure to a specific building


# Simple in-process rate-limit cache for unauthenticated PDF generation.
# IP -> deque[timestamp]. 6 requests / 5 minutes. Resets on process restart
# (acceptable; for a tighter SLA move to Redis later).
from collections import deque
_VENDOR_PDF_RATE: Dict[str, deque] = {}
_VENDOR_PDF_WINDOW_SEC = 300
_VENDOR_PDF_MAX = 6


@api_router.post("/vendor-offering/pdf")
async def generate_vendor_offering_pdf(payload: VendorOfferingRequest, request: Request):
    """Generate a 1-page co-brandable 'Integrated Sustenance Roof Offering' PDF.

    No auth — installers can mint their own brochure with their brand details.
    Rate-limited per IP (6/5min) since rendering is CPU-bound (~150-300ms).
    """
    ip = request.client.host if request.client else "unknown"
    now_ts = datetime.now(timezone.utc).timestamp()
    bucket = _VENDOR_PDF_RATE.setdefault(ip, deque())
    while bucket and now_ts - bucket[0] > _VENDOR_PDF_WINDOW_SEC:
        bucket.popleft()
    if len(bucket) >= _VENDOR_PDF_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Too many brochure requests. Limit {_VENDOR_PDF_MAX}/{_VENDOR_PDF_WINDOW_SEC//60}min. Try again shortly.",
        )
    bucket.append(now_ts)

    vendor = payload.model_dump()
    building = None
    sustenance = None
    if payload.building_id:
        building = await db.buildings.find_one({"building_id": payload.building_id}, {"_id": 0})
        if building:
            try:
                sustenance = calculate_full_sustenance_potential(building=building)
            except Exception as e:
                logger.warning(f"sustenance calc for vendor offering failed: {e}")
                sustenance = None

    context = build_vendor_offering_context(
        vendor=vendor, building=building, sustenance=sustenance,
    )
    pdf_bytes = render_vendor_offering_pdf(context)
    safe_brand = "".join(c for c in (payload.brand_name or "vendor") if c.isalnum() or c in ("-", "_"))[:32] or "vendor"
    filename = f"Sus10_{safe_brand}_Integrated_Roof_Offering.pdf"
    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@api_router.get("/sustenance/group/{group_id}")
async def get_group_sustenance(
    group_id: str,
    plantation_type: str = "mixed",
    floors: int = 1,
):
    """Compute aggregated 4-pillar sustenance potential for all buildings in a group (BRSR-style rollup)."""
    group = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    building_ids = group.get("building_ids", [])
    if not building_ids:
        return {"group": group, "buildings_count": 0, "buildings": [], "summary": {}}
    buildings = await db.buildings.find(
        {"building_id": {"$in": building_ids}}, {"_id": 0}
    ).to_list(len(building_ids))
    per_building_reports = [
        calculate_full_sustenance_potential(
            building=b, plantation_type=plantation_type, floors=floors,
        )
        for b in buildings
    ]
    rollup = aggregate_group_potential(per_building_reports)
    return {
        "group": group,
        "buildings": per_building_reports,
        "summary": rollup,
    }


# ==================== INCUBEX-STYLE SEARCH (POI-based) ====================
@api_router.get("/poi/search")
async def search_buildings_by_poi(
    poi_name: str = Query(..., description="POI/Brand name e.g. 'Incubex'"),
    city: Optional[str] = None,
    limit: int = Query(default=20, le=50),
):
    """
    Search buildings whose name or address contains the given POI (e.g., 'Incubex').
    Combines: 1) existing DB matches, 2) live Google Places Text Search for new POIs.
    """
    results = []

    # 1) DB matches
    query = {
        "$or": [
            {"address": {"$regex": poi_name, "$options": "i"}},
            {"name": {"$regex": poi_name, "$options": "i"}},
        ]
    }
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    db_results = await db.buildings.find(query, {"_id": 0}).limit(limit).to_list(limit)
    for b in db_results:
        b["source"] = "database"
    results.extend(db_results)

    # 2) Google Places Text Search (only if API key available)
    google_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if google_key and len(results) < limit:
        try:
            search_text = f"{poi_name} in {city}" if city else poi_name
            async with httpx.AsyncClient(timeout=10) as http:
                resp = await http.post(
                    "https://places.googleapis.com/v1/places:searchText",
                    headers={
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": google_key,
                        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.addressComponents",
                    },
                    json={"textQuery": search_text, "maxResultCount": limit - len(results)},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    existing_place_ids = {b.get("google_place_id") for b in results if b.get("google_place_id")}
                    for place in data.get("places", []):
                        pid = place.get("id")
                        if pid in existing_place_ids:
                            continue
                        loc = place.get("location", {})
                        # Extract city from addressComponents
                        place_city = city or ""
                        for comp in place.get("addressComponents", []):
                            types = comp.get("types", [])
                            if "locality" in types:
                                place_city = comp.get("longText") or place_city
                                break
                        results.append({
                            "building_id": None,
                            "google_place_id": pid,
                            "name": place.get("displayName", {}).get("text", poi_name),
                            "address": place.get("formattedAddress", ""),
                            "city": place_city,
                            "latitude": loc.get("latitude"),
                            "longitude": loc.get("longitude"),
                            "place_types": place.get("types", []),
                            "source": "google_places",
                            "is_imported": False,
                        })
        except Exception as e:
            logger.warning(f"Google Places search failed: {e}")

    return {"poi_name": poi_name, "city": city, "count": len(results), "results": results}


@api_router.post("/poi/import")
async def import_building_from_poi(request: Request):
    """
    Import a Google Places result into the buildings collection.
    Body: {google_place_id, name, address, city, latitude, longitude, building_type?}
    Uses building_discovery's geocoding logic to fetch footprint polygon.
    """
    user = await require_auth(request)
    body = await request.json()
    place_id = body.get("google_place_id")
    if not place_id:
        raise HTTPException(status_code=400, detail="google_place_id required")

    # Check if already imported
    existing = await db.buildings.find_one({"google_place_id": place_id}, {"_id": 0})
    if existing:
        return {"imported": False, "reason": "already_exists", "building": existing}

    lat = body.get("latitude")
    lng = body.get("longitude")
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="latitude/longitude required")

    # Try to fetch footprint polygon via Google Geocoding (existing pipeline)
    google_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    footprint_polygon = None
    footprint_area = None
    if google_key:
        try:
            from building_discovery import fetch_building_polygon_from_google
            poly_data = await fetch_building_polygon_from_google(
                place_id=place_id, api_key=google_key, lat=lat, lng=lng
            )
            if poly_data:
                footprint_polygon = poly_data.get("polygon")
                footprint_area = poly_data.get("area_sqm")
        except Exception as e:
            logger.warning(f"Polygon fetch failed: {e}")

    # Fallback: estimate 800 sqm if no polygon found
    if not footprint_area:
        footprint_area = 800.0

    building_id = f"bld_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    building_type = body.get("building_type", "commercial")
    doc = {
        "building_id": building_id,
        "name": body.get("name"),
        "address": body.get("address", ""),
        "city": body.get("city", ""),
        "pincode": body.get("pincode", ""),
        "latitude": lat,
        "longitude": lng,
        "building_type": building_type,
        "building_footprint_area": footprint_area,
        "usable_terrace_area": footprint_area * 0.7,
        "footprint_polygon": footprint_polygon,
        "google_place_id": place_id,
        "data_source": "google_places_poi_import",
        "data_quality_score": 0.85 if footprint_polygon else 0.65,
        "is_approved": True,
        "curated_by_admin_id": user.user_id,
        "created_at": now,
        "updated_at": now,
    }
    await db.buildings.insert_one(doc)
    doc.pop("_id", None)
    return {"imported": True, "building": doc}


@api_router.post("/sustenance/building/{building_id}/gemini-analyze")
async def gemini_analyze_rooftop(building_id: str, request: Request):
    """
    Use Gemini 2.5 Flash vision to analyze a building's rooftop satellite image.
    Returns structured JSON: obstructions, shadows, existing vegetation/solar,
    usable area percentages, recommended zones.

    Requires authentication. Cached for 24h to keep costs low.
    """
    await require_auth(request)

    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    # Check for cached result (24h validity)
    cached = building.get("gemini_rooftop_analysis")
    cached_at = building.get("gemini_rooftop_analyzed_at")
    if cached and cached_at:
        try:
            cached_dt = datetime.fromisoformat(cached_at) if isinstance(cached_at, str) else cached_at
            if cached_dt.tzinfo is None:
                cached_dt = cached_dt.replace(tzinfo=timezone.utc)
            age_hours = (datetime.now(timezone.utc) - cached_dt).total_seconds() / 3600
            if age_hours < 24:
                return {**cached, "cached": True, "cached_age_hours": round(age_hours, 1)}
        except Exception:
            pass

    result = await analyze_rooftop(building)

    if result.get("success"):
        await db.buildings.update_one(
            {"building_id": building_id},
            {"$set": {
                "gemini_rooftop_analysis": result,
                "gemini_rooftop_analyzed_at": datetime.now(timezone.utc).isoformat(),
            }},
        )

    return {**result, "cached": False}


# ==================== ADMIN AUDIT LOG ====================
async def record_audit(
    *,
    user,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    ip: Optional[str] = None,
) -> None:
    """Append a single audit event. Designed to be cheap, non-blocking and
    safe to call from any admin mutation handler. Failures must never block
    the actual operation — log + continue.
    """
    try:
        await db.admin_audit_log.insert_one({
            "audit_id": f"adt_{uuid.uuid4().hex[:12]}",
            "user_id": getattr(user, "user_id", None),
            "user_email": getattr(user, "email", None),
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "metadata": metadata or {},
            "ip": ip,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.warning(f"admin audit_log write failed: {e}")


@api_router.get("/admin/audit")
async def admin_list_audit(
    request: Request,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_email: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(default=200, le=1000),
    page: int = Query(default=1, ge=1),
):
    await require_admin(request)
    query: Dict[str, Any] = {}
    if action:
        query["action"] = action
    if resource_type:
        query["resource_type"] = resource_type
    if user_email:
        query["user_email"] = user_email
    if q:
        query["$or"] = [
            {"action": {"$regex": q, "$options": "i"}},
            {"resource_id": {"$regex": q, "$options": "i"}},
            {"user_email": {"$regex": q, "$options": "i"}},
        ]
    total = await db.admin_audit_log.count_documents(query)
    skip = (page - 1) * limit
    items = await (
        db.admin_audit_log.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip).limit(limit)
        .to_list(limit)
    )
    return {"entries": items, "total": total, "page": page, "limit": limit}


# ==================== BETA WAITLIST + ZOHO SURVEY WEBHOOK ====================
class BetaWaitlistEntry(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    persona: Optional[str] = None  # citizen | citizen-crisis | rwa | vendor
    city: Optional[str] = None
    source: Optional[str] = None   # which teaser / referrer
    note: Optional[str] = None


@api_router.post("/beta-waitlist")
async def join_beta_waitlist(entry: BetaWaitlistEntry, request: Request):
    """Public: collect early-access email signups from the persona teaser pages."""
    email = entry.email.strip().lower()
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.beta_waitlist.find_one({"email": email}, {"_id": 0})
    if existing:
        # Update with the latest persona/source/note (people may sign up twice
        # from different teasers — that's a useful signal, append it).
        history = existing.get("history", [])
        history.append({
            "persona": entry.persona, "source": entry.source,
            "note": entry.note, "at": now,
        })
        await db.beta_waitlist.update_one(
            {"email": email},
            {"$set": {
                "name": entry.name or existing.get("name"),
                "persona": entry.persona or existing.get("persona"),
                "city": entry.city or existing.get("city"),
                "source": entry.source or existing.get("source"),
                "note": entry.note or existing.get("note"),
                "updated_at": now,
                "history": history,
            }},
        )
        return {"saved": True, "duplicate": True, "email": email}

    client_host = request.client.host if request.client else None
    doc = {
        "waitlist_id": f"wl_{uuid.uuid4().hex[:12]}",
        "email": email,
        "name": entry.name,
        "persona": entry.persona,
        "city": entry.city,
        "source": entry.source,
        "note": entry.note,
        "ip": client_host,
        "user_agent": request.headers.get("user-agent"),
        "created_at": now,
        "updated_at": now,
        "history": [{
            "persona": entry.persona, "source": entry.source,
            "note": entry.note, "at": now,
        }],
    }
    await db.beta_waitlist.insert_one(doc)
    doc.pop("_id", None)
    return {"saved": True, "duplicate": False, "email": email, "waitlist_id": doc["waitlist_id"]}


@api_router.get("/admin/beta-waitlist")
async def admin_list_beta_waitlist(
    request: Request,
    persona: Optional[str] = None,
    limit: int = Query(default=500, le=2000),
):
    await require_admin(request)
    query: Dict[str, Any] = {}
    if persona:
        query["persona"] = persona
    total = await db.beta_waitlist.count_documents(query)
    entries = await (
        db.beta_waitlist.find(query, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
        .to_list(limit)
    )
    # Breakdown by persona for quick admin glance
    pipeline = [{"$group": {"_id": "$persona", "count": {"$sum": 1}}}]
    by_persona_raw = await db.beta_waitlist.aggregate(pipeline).to_list(50)
    by_persona = {(p["_id"] or "unspecified"): p["count"] for p in by_persona_raw}

    # Join assessments by email so the waitlist table can show "View Report" links
    emails = [e.get("email") for e in entries if e.get("email")]
    if emails:
        assessment_map: Dict[str, str] = {}
        async for a in db.assessments.find(
            {"answers.email": {"$in": emails}},
            {"_id": 0, "assessment_id": 1, "answers.email": 1},
        ):
            em = ((a.get("answers") or {}).get("email") or "").strip().lower()
            if em:
                assessment_map[em] = a.get("assessment_id", "")
        for e in entries:
            key = (e.get("email") or "").strip().lower()
            e["assessment_id"] = assessment_map.get(key)

    return {"entries": entries, "total": total, "by_persona": by_persona, "limit": limit}


@api_router.get("/admin/leads")
async def admin_list_assessment_leads(
    request: Request,
    limit: int = Query(default=1000, le=5000),
    tier: Optional[str] = None,
    city: Optional[str] = None,
    building_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    """Return calculator assessment submissions for the admin Leads table.
    Supports optional filters: tier, city, building_type, date_from, date_to."""
    await require_admin(request)

    query: Dict[str, Any] = {}
    if tier:
        query["readiness_tier"] = tier
    if city:
        query["answers.city"] = {"$regex": city, "$options": "i"}
    if building_type:
        query["answers.Q1"] = building_type
    if date_from or date_to:
        dt_filter: Dict[str, Any] = {}
        if date_from:
            try:
                dt_filter["$gte"] = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if date_to:
            try:
                dt_filter["$lte"] = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if dt_filter:
            query["created_at"] = dt_filter

    total = await db.assessments.count_documents(query)

    # Counts for summary strip
    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = today_start - timedelta(days=today_start.weekday())
    today_count = await db.assessments.count_documents({"created_at": {"$gte": today_start}})
    week_count  = await db.assessments.count_documents({"created_at": {"$gte": week_start}})

    docs = await (
        db.assessments.find(
            query,
            {"_id": 0, "assessment_id": 1, "answers": 1, "scores": 1,
             "readiness_tier": 1, "created_at": 1, "email_sent": 1},
        )
        .sort("created_at", -1)
        .limit(limit)
        .to_list(limit)
    )

    def _clean_phone(raw: str) -> str:
        digits = raw.replace(" ", "").replace("-", "").replace("+", "")
        if digits.startswith("91") and len(digits) > 10:
            digits = digits[2:]
        return digits

    rows = []
    for doc in docs:
        answers = doc.get("answers") or {}
        scores  = doc.get("scores")  or {}
        raw_phone = str(answers.get("phone") or "").strip()
        clean_digits = _clean_phone(raw_phone) if raw_phone else ""
        wa_number    = "91" + clean_digits if clean_digits else ""
        created = doc.get("created_at")
        rows.append({
            "assessment_id": doc.get("assessment_id") or "",
            "created_at":    created.isoformat() if isinstance(created, datetime) else (created or ""),
            "first_name":    answers.get("first_name") or "",
            "last_name":     answers.get("last_name")  or "",
            "email":         answers.get("email")      or "",
            "phone":         raw_phone,
            "wa_number":     wa_number,
            "city":          answers.get("city")       or "",
            "state":         answers.get("state")      or "",
            "building_type": answers.get("Q1")         or "",
            "terrace_sqft":  answers.get("terrace_area_sqft") or "",
            "overall_score": scores.get("overall"),
            "readiness_tier": doc.get("readiness_tier") or "",
            "email_sent":    bool(doc.get("email_sent")),
        })
    return {"leads": rows, "total": total,
            "today": today_count, "this_week": week_count}


@api_router.post("/webhooks/zoho-survey")
async def zoho_survey_webhook(request: Request):
    """Accept Zoho Survey response webhook (configurable in Zoho dashboard).

    Zoho Survey can POST a JSON body containing question/answer pairs after a
    submission. We don't constrain the shape — we store the entire payload plus
    headers + receipt metadata so the data team can analyse later. If the
    payload contains an 'email' field we also auto-add it to the beta waitlist.
    """
    try:
        payload = await request.json()
    except Exception:
        # Some webhook providers send form-encoded data; capture raw if so.
        raw = (await request.body()).decode("utf-8", errors="ignore")
        payload = {"_raw": raw}

    if not isinstance(payload, dict):
        payload = {"_value": payload}

    now = datetime.now(timezone.utc).isoformat()
    headers = {k: v for k, v in request.headers.items() if k.lower() in (
        "user-agent", "content-type", "referer", "x-forwarded-for",
        "x-zoho-survey-id", "x-zoho-event",
    )}

    doc = {
        "response_id": f"zsr_{uuid.uuid4().hex[:12]}",
        "received_at": now,
        "source": "zoho_survey",
        "ip": request.client.host if request.client else None,
        "headers": headers,
        "payload": payload,
    }
    await db.zoho_survey_responses.insert_one(doc)

    # Best-effort email extraction → beta waitlist auto-join.
    email = None
    persona_hint = None
    for key in ("email", "Email", "respondent_email", "user_email"):
        v = payload.get(key)
        if isinstance(v, str) and "@" in v:
            email = v.strip().lower()
            break
    # Also scan known Zoho structure: { responses: [{ question, answer }] }
    if not email and isinstance(payload.get("responses"), list):
        for item in payload["responses"]:
            ans = (item or {}).get("answer")
            if isinstance(ans, str) and "@" in ans and len(ans) < 120:
                email = ans.strip().lower(); break
    for key in ("persona", "audience", "survey_persona"):
        if isinstance(payload.get(key), str):
            persona_hint = payload[key]; break

    if email:
        try:
            existing = await db.beta_waitlist.find_one({"email": email}, {"_id": 0})
            if not existing:
                await db.beta_waitlist.insert_one({
                    "waitlist_id": f"wl_{uuid.uuid4().hex[:12]}",
                    "email": email,
                    "persona": persona_hint,
                    "source": "zoho_survey",
                    "created_at": now,
                    "updated_at": now,
                    "history": [{
                        "persona": persona_hint, "source": "zoho_survey", "at": now,
                    }],
                })
        except Exception as e:  # don't fail the webhook on side-effect errors
            logger.warning(f"Zoho webhook waitlist auto-join failed: {e}")

    doc.pop("_id", None)
    return {"received": True, "response_id": doc["response_id"], "email_captured": bool(email)}


@api_router.get("/admin/zoho-survey-responses")
async def admin_list_zoho_survey_responses(
    request: Request,
    limit: int = Query(default=200, le=1000),
):
    await require_admin(request)
    total = await db.zoho_survey_responses.count_documents({})
    items = await (
        db.zoho_survey_responses.find({}, {"_id": 0})
        .sort("received_at", -1)
        .limit(limit)
        .to_list(limit)
    )
    return {"responses": items, "total": total, "limit": limit}


# ==================== CMS PAGES (Landing + Blog + Resources, unified) ====================
class CmsPageCreate(BaseModel):
    slug: str
    type: str = "landing"  # landing | blog | resource
    title: str
    subtitle: Optional[str] = None
    hero_image_url: Optional[str] = None
    cover_color: Optional[str] = None  # hex
    badges: Optional[List[Dict[str, Any]]] = None  # [{label, icon}]
    intro_markdown: Optional[str] = None
    benefits: Optional[List[Dict[str, Any]]] = None  # [{title, body, icon}]
    carousel: Optional[List[Dict[str, Any]]] = None  # [{image_url, caption, link_url}]
    survey_url: Optional[str] = None
    body_markdown: Optional[str] = None
    footer_attribution: Optional[str] = None
    cta_url: Optional[str] = None
    cta_label: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    og_image: Optional[str] = None
    ga_tracking_id: Optional[str] = None
    ga_enabled: bool = True
    published: bool = False
    author: Optional[str] = None
    # Pre-launch / persona pages
    waitlist_persona: Optional[str] = None  # citizen | citizen-crisis | rwa | vendor (enables inline waitlist form)


@api_router.post("/admin/cms/pages")
async def create_cms_page(request: Request, page: CmsPageCreate):
    user = await require_auth(request)
    if user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    existing = await db.cms_pages.find_one({"slug": page.slug})
    if existing:
        raise HTTPException(status_code=409, detail=f"Slug '{page.slug}' already exists")
    now = datetime.now(timezone.utc)
    doc = page.dict()
    doc["page_id"] = f"cms_{uuid.uuid4().hex[:12]}"
    doc["view_count"] = 0
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["published_at"] = now if page.published else None
    doc["author"] = doc.get("author") or user.email
    await db.cms_pages.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/cms/pages/{page_id}")
async def update_cms_page(page_id: str, request: Request):
    user = await require_auth(request)
    if user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    body.pop("page_id", None)
    body.pop("_id", None)
    body.pop("created_at", None)
    body["updated_at"] = datetime.now(timezone.utc)
    if body.get("published") and not (await db.cms_pages.find_one({"page_id": page_id}, {"published_at": 1, "_id": 0})).get("published_at"):
        body["published_at"] = datetime.now(timezone.utc)
    result = await db.cms_pages.update_one({"page_id": page_id}, {"$set": body})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    page = await db.cms_pages.find_one({"page_id": page_id}, {"_id": 0})
    return page


@api_router.delete("/admin/cms/pages/{page_id}")
async def delete_cms_page(page_id: str, request: Request):
    user = await require_auth(request)
    if user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.cms_pages.delete_one({"page_id": page_id})
    return {"ok": True}


@api_router.get("/admin/cms/pages")
async def admin_list_cms_pages(request: Request):
    user = await require_auth(request)
    if user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    pages = await db.cms_pages.find({}, {"_id": 0, "body_markdown": 0}).sort("updated_at", -1).to_list(200)
    return pages


@api_router.get("/cms/pages")
async def public_list_cms_pages(type: Optional[str] = None, limit: int = Query(default=50, le=100)):
    query: Dict[str, Any] = {"published": True}
    if type:
        query["type"] = type
    pages = await db.cms_pages.find(query, {"_id": 0, "body_markdown": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    return pages


@api_router.get("/cms/pages/{slug}")
async def public_get_cms_page(slug: str):
    page = await db.cms_pages.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    await db.cms_pages.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    return page


@api_router.post("/admin/cms/seed-green-roof")
async def seed_green_roof_cms(request: Request):
    """Migrate the hardcoded /green-roof landing page into cms_pages."""
    user = await require_auth(request)
    if user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    existing = await db.cms_pages.find_one({"slug": "green-roof"})
    if existing:
        return {"already_exists": True, "page_id": existing.get("page_id")}
    now = datetime.now(timezone.utc)
    doc = {
        "page_id": f"cms_{uuid.uuid4().hex[:12]}",
        "slug": "green-roof",
        "type": "landing",
        "title": "Your roof could cool your home and your city.",
        "subtitle": "Help us understand why green roofs and terrace gardens haven't yet taken off in Indian cities.",
        "cover_color": "#1a3d2b",
        "badges": [
            {"label": "10-12 mins", "icon": "Clock"},
            {"label": "Anonymous", "icon": "Lock"},
            {"label": "Academic research", "icon": "GraduationCap"},
        ],
        "benefits": [
            {"title": "Beat the Heat", "body": "Rooftop vegetation can lower indoor temperatures by 2-5°C — cutting AC bills.", "icon": "Thermometer"},
            {"title": "Manage Rainwater", "body": "Soil + plants slow runoff and reduce urban flooding risk.", "icon": "Droplets"},
            {"title": "Cleaner Air", "body": "Plants sequester CO₂ and capture particulate matter from polluted air.", "icon": "Wind"},
            {"title": "Solar + Greenery", "body": "Combined PV-green roofs can boost solar efficiency by up to 15%.", "icon": "Sun"},
        ],
        "intro_markdown": (
            "We're studying why green roofs and terrace gardens haven't taken off in Indian cities. "
            "Your responses will shape policy briefs, builder partnerships and public awareness campaigns.\n\n"
            "**Your participation matters.** This is an academic research initiative — your responses remain anonymous."
        ),
        "survey_url": "https://survey.zohopublic.in/zs/CzaT82",
        "footer_attribution": "Research led by Shivani Thakur · IIT Roorkee · 2026",
        "meta_title": "Green Roof & Terrace Garden Survey | Urban Climate Adaptation India 2026",
        "meta_description": "Help us understand why green roofs and terrace gardens haven't yet taken off in Indian cities. 10-12 min anonymous academic survey.",
        "ga_enabled": True,
        "published": True,
        "published_at": now,
        "view_count": 0,
        "created_at": now,
        "updated_at": now,
        "author": user.email,
    }
    await db.cms_pages.insert_one(doc)
    doc.pop("_id", None)
    return {"seeded": True, "page": doc}


@api_router.post("/admin/cms/seed-persona-teasers")
async def seed_persona_teasers(request: Request):
    """Run the persona teaser seed script against the current DB.

    Idempotent — existing slugs are not clobbered. Surfaces a list of slugs
    inserted vs updated so the admin can verify.
    """
    user = await require_auth(request)
    if user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    import subprocess
    script_path = ROOT_DIR / "scripts" / "seed_persona_teasers.py"
    if not script_path.exists():
        raise HTTPException(status_code=500, detail=f"Seed script not found at {script_path}")
    try:
        proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True, text=True, timeout=60,
            cwd=str(ROOT_DIR),
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Seed script timed out")
    if proc.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Seed failed: {proc.stderr or proc.stdout}")
    # Confirm the 4 slugs are present
    slugs = ["for-homeowners", "for-homeowners-heat-action", "for-communities", "for-installers"]
    found = await db.cms_pages.find({"slug": {"$in": slugs}}, {"_id": 0, "slug": 1, "published": 1}).to_list(20)
    await record_audit(
        user=user, action="seed.persona_teasers", resource_type="cms_pages",
        resource_id="batch", metadata={"slugs": slugs},
        ip=request.client.host if request.client else None,
    )
    return {"seeded": True, "stdout": proc.stdout, "pages": found}


@api_router.post("/admin/subsidies/seed")
async def seed_subsidies_endpoint(request: Request):
    """Run the subsidies seed script against the current DB (idempotent upsert)."""
    user = await require_auth(request)
    if user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    import subprocess
    script_path = ROOT_DIR / "scripts" / "seed_subsidies.py"
    if not script_path.exists():
        raise HTTPException(status_code=500, detail=f"Seed script not found at {script_path}")
    try:
        proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True, text=True, timeout=60,
            cwd=str(ROOT_DIR),
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Seed script timed out")
    if proc.returncode != 0:
        raise HTTPException(status_code=500, detail=f"Seed failed: {proc.stderr or proc.stdout}")
    count = await db.subsidies.count_documents({"is_active": True})
    await record_audit(
        user=user, action="seed.subsidies", resource_type="subsidies",
        resource_id="batch", metadata={"active_count": count},
        ip=request.client.host if request.client else None,
    )
    return {"seeded": True, "stdout": proc.stdout, "active_subsidies": count}


# ==================== HOMEOWNER QUICK CALCULATOR (E6.1) ====================
class QuickCalcRequest(BaseModel):
    address: str
    city: str
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    roof_area_sqm: float = Field(..., gt=0, le=500_000)
    floors: int = Field(default=1, ge=1, le=60)
    monthly_electricity_bill_inr: Optional[float] = Field(default=None, ge=0)
    monthly_gas_bill_inr: Optional[float] = Field(default=None, ge=0)
    family_size: Optional[int] = Field(default=None, ge=1, le=200)
    families: Optional[int] = Field(default=None, ge=1, le=2000)
    building_type: Optional[str] = "residential"
    name: Optional[str] = None
    email: Optional[str] = None


@api_router.post("/calculate/quick-potential")
async def calculate_quick_potential(payload: QuickCalcRequest, request: Request):
    """E6.1 — Homeowner calculator-first flow.

    Creates a lightweight, unverified building from a few inputs and returns
    the building_id so the frontend can redirect straight to the at-a-glance
    Sustenance Potential page. No auth required — homeowners self-serve.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    building_id = f"bld_{uuid.uuid4().hex[:12]}"
    # Usable area fixed at 70% of total — standard assumption for
    # Indian rooftops accounting for water tanks, stairwell access,
    # AC units and unusable edges
    usable = round(payload.roof_area_sqm * 0.70, 2)
    # Determine families count for biogas estimation:
    # - explicit `families` (e.g. society admin) wins
    # - otherwise default to 1 (single home). Multi-family buildings should pass `families`.
    families = payload.families or 1
    if payload.building_type in ("apartment", "housing_society", "residential_complex") and payload.families:
        families = payload.families
    doc = {
        "building_id": building_id,
        "name": payload.name or payload.address.split(",")[0][:80],
        "address": payload.address,
        "city": payload.city,
        "state": payload.state,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "building_type": payload.building_type or "residential",
        "building_footprint_area": payload.roof_area_sqm,
        "usable_terrace_area": usable,
        "custom_terrace_area": usable,
        "floors_estimated": payload.floors,
        "monthly_electricity_bill_inr": payload.monthly_electricity_bill_inr,
        "monthly_gas_bill_inr": payload.monthly_gas_bill_inr,
        "family_size": payload.family_size,
        "families_estimated": families,
        "status": "self_submitted",
        "is_approved": False,
        "data_source": "homeowner_calculator",
        "submitted_email": payload.email,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.buildings.insert_one(doc)

    # If email provided, auto-join the waitlist as a warm lead.
    if payload.email:
        try:
            await db.beta_waitlist.update_one(
                {"email": payload.email.lower().strip()},
                {"$set": {
                    "email": payload.email.lower().strip(),
                    "name": payload.name,
                    "city": payload.city,
                    "persona": "calculator-homeowner",
                    "source": "homeowner_calculator",
                    "last_building_id": building_id,
                    "updated_at": now_iso,
                }, "$setOnInsert": {"created_at": now_iso}},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"calculator waitlist join failed: {e}")

    return {
        "building_id": building_id,
        "redirect_to": f"/buildings/{building_id}/potential",
    }


@api_router.post("/admin/cms/upload")
async def upload_cms_image(request: Request, file: UploadFile = File(...)):
    """Upload an image, store in MongoDB GridFS, return public URL."""
    user = await require_auth(request)
    if user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")
    contents = await file.read()
    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 8 MB)")

    upload_id = f"img_{uuid.uuid4().hex[:16]}"
    doc = {
        "upload_id": upload_id,
        "content_type": file.content_type,
        "filename": file.filename,
        "size": len(contents),
        "data": contents,  # bytes
        "uploaded_by": user.email,
        "uploaded_at": datetime.now(timezone.utc),
    }
    await db.cms_uploads.insert_one(doc)
    return {"upload_id": upload_id, "url": f"/api/cms/uploads/{upload_id}"}


@api_router.get("/cms/uploads/{upload_id}")
async def get_cms_upload(upload_id: str):
    """Serve uploaded image (public)."""
    doc = await db.cms_uploads.find_one({"upload_id": upload_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Image not found")
    from fastapi.responses import Response
    return Response(
        content=doc["data"],
        media_type=doc.get("content_type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@api_router.post("/admin/cms/migrate-blog-posts")
async def migrate_blog_posts(request: Request):
    """One-time migration of legacy blog_posts → cms_pages."""
    user = await require_auth(request)
    if user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    legacy = await db.blog_posts.find({}, {"_id": 0}).to_list(500)
    migrated, skipped = 0, 0
    for post in legacy:
        slug = post.get("slug")
        if not slug:
            skipped += 1
            continue
        existing = await db.cms_pages.find_one({"slug": slug})
        if existing:
            skipped += 1
            continue
        now = datetime.now(timezone.utc)
        published_at = post.get("published_at") or now
        if isinstance(published_at, str):
            try:
                published_at = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            except Exception:
                published_at = now
        doc = {
            "page_id": f"cms_{uuid.uuid4().hex[:12]}",
            "slug": slug,
            "type": "blog",
            "title": post.get("title", ""),
            "subtitle": post.get("excerpt") or post.get("summary"),
            "hero_image_url": post.get("featured_image") or post.get("cover_image") or post.get("hero_image"),
            "cover_color": post.get("cover_color") or "#1a3d2b",
            "body_markdown": post.get("content_markdown") or post.get("body") or post.get("content") or "",
            "meta_title": post.get("title"),
            "meta_description": post.get("excerpt") or post.get("summary"),
            "author": post.get("author") or post.get("author_name") or "Sus10 AI",
            "ga_enabled": True,
            "published": bool(post.get("published")),
            "published_at": published_at,
            "view_count": post.get("view_count", 0),
            "created_at": post.get("created_at") or now,
            "updated_at": now,
        }
        await db.cms_pages.insert_one(doc)
        migrated += 1
    return {"migrated": migrated, "skipped": skipped, "total_legacy": len(legacy)}


# ==================== ROOT ====================
@api_router.get("/")
async def root():
    return {"message": "Sus10 AI API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    # When CORS_ORIGINS is "*", use allow_origin_regex to echo the actual request origin
    # (browsers reject "Access-Control-Allow-Origin: *" with credentials: include).
    # Otherwise use explicit allow_origins from CORS_ORIGINS env var.
    **(
        {"allow_origin_regex": ".*"}
        if os.environ.get('CORS_ORIGINS', '*').strip() == '*'
        else {"allow_origins": os.environ.get('CORS_ORIGINS', '*').split(',')}
    ),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def ensure_critical_flags():
    """Idempotent: ensure `show_user_map` flag exists for existing installations.

    The map UI is hidden from public users by default (P1 May 19, 2026).
    Backend curation, OSM discovery and polygon edit endpoints remain live for admins.
    """
    now = datetime.now(timezone.utc).isoformat()
    await db.feature_flags.update_one(
        {"name": "show_user_map"},
        {"$setOnInsert": {
            "flag_id": f"flag_{uuid.uuid4().hex[:8]}",
            "name": "show_user_map",
            "is_enabled": False,
            "description": "Show interactive map block on Building Report to public users. Admins always see it.",
            "updated_at": now,
        }},
        upsert=True,
    )
    # Sprint A: seed calculator config
    await _seed_calculator_config()


# ==================== SPRINT A: CALCULATOR & REPORT ====================

CALCULATOR_CONFIG_V1 = {
    "config_id": "homeowner_v1",
    "pages": [
        {
            "page": 1,
            "title": "About Your Home",
            "questions": [
                {
                    "id": "D",
                    "type": "text_group",
                    "fields": ["first_name", "last_name", "phone", "email"],
                    "label": "Tell us about yourself",
                    "scored": False,
                    "stored": True,
                },
                {
                    "id": "address",
                    "type": "address_autocomplete",
                    "label": "Your building address",
                    "helper_text": "Select from the dropdown — we use this to calculate local solar and rainfall data for your area",
                    "scored": False,
                    "stored": True,
                    "validation": {"required": True},
                },
                {
                    "id": "D6",
                    "type": "single_select",
                    "label": "Your age group",
                    "scored": False,
                    "stored": True,
                    "options": ["18-25", "26-40", "41-55", "55+"],
                },
                {
                    "id": "Q1",
                    "type": "single_select",
                    "label": "Your residence / building type is:",
                    "dimension": "Capacity",
                    "scored": True,
                    "options": [
                        {"label": "Independent House", "score": 4},
                        {"label": "Row House", "score": 3},
                        {"label": "Mid/low-rise Apartment (1-4 floors)", "score": 2},
                        {"label": "High-rise apartment (5+ floors)", "score": 1},
                    ],
                    "conditional_trigger": "R01_R02",
                },
                # ── Track A: shown for Independent House / Row House ──────────
                {
                    "id": "terrace_area_sqft",
                    "type": "numeric_input",
                    "label": "Approximate terrace / rooftop area (sq ft)",
                    "helper_text": "Approximate is fine — check your building plan or measure later. Typical independent house terrace: 500–1,500 sq ft",
                    "scored": False,
                    "stored": True,
                    "track": "A",
                    "show_when": ["Independent House", "Row House"],
                    "validation": {"required": True, "min": 50, "max": 15000},
                },
                {
                    "id": "num_floors",
                    "type": "single_select",
                    "label": "Number of floors in your building",
                    "scored": False,
                    "stored": True,
                    "track": "A",
                    "show_when": ["Independent House", "Row House"],
                    "options": ["1", "2", "3", "4 or more"],
                    "validation": {"required": True},
                },
                {
                    "id": "household_size",
                    "type": "single_select",
                    "label": "Number of people in your household",
                    "scored": False,
                    "stored": True,
                    "track": "A",
                    "show_when": ["Independent House", "Row House"],
                    "options": ["1-2", "3-5", "6-10", "More than 10"],
                    "validation": {"required": True},
                },
                # ── Track B: shown for Apartment types ────────────────────────
                {
                    "id": "terrace_area_sqft",
                    "type": "numeric_input",
                    "label": "Approximate rooftop area of the entire building (sq ft)",
                    "helper_text": "This is the total roof area of your building, not your flat. Check with your Society or building management. Typical 20-flat building: 2,000–4,000 sq ft",
                    "scored": False,
                    "stored": True,
                    "track": "B",
                    "show_when": ["Mid/low-rise Apartment (1-4 floors)", "High-rise apartment (5+ floors)"],
                    "validation": {"required": True, "min": 200, "max": 100000},
                },
                {
                    "id": "num_apartments",
                    "type": "single_select",
                    "label": "Number of apartments in your building",
                    "scored": False,
                    "stored": True,
                    "track": "B",
                    "show_when": ["Mid/low-rise Apartment (1-4 floors)", "High-rise apartment (5+ floors)"],
                    "options": ["Less than 10", "10-25", "26-50", "51-100", "More than 100"],
                    "validation": {"required": True},
                },
                {
                    "id": "household_size",
                    "type": "single_select",
                    "label": "Number of people in your flat",
                    "scored": False,
                    "stored": True,
                    "track": "B",
                    "show_when": ["Mid/low-rise Apartment (1-4 floors)", "High-rise apartment (5+ floors)"],
                    "options": ["1-2", "3-5", "6 or more"],
                    "validation": {"required": True},
                },
                {
                    "id": "Q2",
                    "type": "single_select",
                    "label": "How old is your building?",
                    "dimension": "Capacity",
                    "scored": True,
                    "options": [
                        {"label": "1 to 5 years", "score": 1},
                        {"label": "6 to 15 years", "score": 3},
                        {"label": "16 to 30 years", "score": 4},
                        {"label": "31 to 50 years", "score": 3},
                        {"label": "50+ years", "score": 2},
                    ],
                },
                {
                    "id": "Q3",
                    "type": "single_select",
                    "label": "Your ownership status:",
                    "scored": False,
                    "stored": True,
                    "conditional_trigger": "R09",
                    "options": ["Owner", "Renter", "Other"],
                },
            ],
        },
        {
            "page": 2,
            "title": "Your Bills & Awareness",
            "questions": [
                {
                    "id": "Q4a",
                    "type": "single_select",
                    "label": "Monthly maintenance bill (INR)",
                    "scored": False,
                    "stored": True,
                    "options": ["Below Rs.1,000", "Rs.1,000-Rs.3,000", "Rs.3,000-Rs.7,000", "Above Rs.7,000"],
                },
                {
                    "id": "Q4b",
                    "type": "single_select",
                    "label": "Monthly electricity bill (INR)",
                    "dimension": "Motivation",
                    "scored": True,
                    "conditional_trigger": "R06",
                    "options": [
                        {"label": "Below Rs.1,000", "score": 1},
                        {"label": "Rs.1,000-Rs.3,000", "score": 2},
                        {"label": "Rs.3,000-Rs.7,000", "score": 3},
                        {"label": "Above Rs.7,000", "score": 4},
                    ],
                },
                {
                    "id": "Q4c",
                    "type": "single_select",
                    "label": "Monthly cooking gas bill (INR)",
                    "dimension": "Motivation",
                    "scored": True,
                    "conditional_trigger": "R07",
                    "options": [
                        {"label": "Below Rs.500", "score": 1},
                        {"label": "Rs.500-Rs.1,500", "score": 2},
                        {"label": "Rs.1,500-Rs.3,000", "score": 3},
                        {"label": "Above Rs.3,000", "score": 4},
                    ],
                },
                {
                    "id": "Q5",
                    "type": "multi_select",
                    "label": "Which of these technologies are you aware of? (Select all that apply)",
                    "dimension": "Interest",
                    "scored": True,
                    "cap": 3,
                    "conditional_trigger": "R10",
                    "options": [
                        {"label": "Rooftop gardening", "score": 1},
                        {"label": "Rooftop / Terrace farming", "score": 1},
                        {"label": "Solar panels", "score": 1},
                        {"label": "Biogas systems", "score": 1},
                        {"label": "Rain Water Harvesting", "score": 1},
                        {"label": "Composting", "score": 1},
                        {"label": "None of these", "score": 0},
                    ],
                },
                {
                    "id": "Q6",
                    "type": "single_select",
                    "label": "Do you currently segregate wet waste for compost or biogas?",
                    "dimension": "Capacity",
                    "scored": True,
                    "conditional_trigger": "R08",
                    "options": [
                        {"label": "Not at all", "score": 0},
                        {"label": "Rarely to never", "score": 1},
                        {"label": "Sometimes", "score": 2},
                        {"label": "Regularly", "score": 3},
                    ],
                },
            ],
        },
        {
            "page": 3,
            "title": "Your Beliefs & Readiness",
            "questions": [
                {
                    "id": "Q7",
                    "type": "single_select",
                    "label": "Would having a terrace garden make you healthier or happier?",
                    "dimension": "Motivation",
                    "scored": True,
                    "conditional_trigger": "R12",
                    "options": [
                        {"label": "No, I don't believe this", "score": 0},
                        {"label": "I'd believe this", "score": 2},
                    ],
                },
                {
                    "id": "Q8",
                    "type": "single_select",
                    "label": "Do you believe green roofs can reduce urban heat and improve air quality?",
                    "dimension": "Motivation",
                    "scored": True,
                    "conditional_trigger": "R11",
                    "options": [
                        {"label": "I don't believe it", "score": 0},
                        {"label": "I don't know", "score": 1},
                        {"label": "Yes, it's a strong solution", "score": 3},
                    ],
                },
                {
                    "id": "Q9",
                    "type": "single_select",
                    "label": "How interested are you in building a self-sustaining roof system?",
                    "dimension": "Interest",
                    "scored": True,
                    "conditional_trigger": "R03",
                    "options": [
                        {"label": "Not interested", "score": 0},
                        {"label": "I am not sure", "score": 1},
                        {"label": "Somewhat interested", "score": 2},
                        {"label": "Very interested", "score": 3},
                    ],
                },
                {
                    "id": "Q10",
                    "type": "single_select",
                    "label": "Do you currently have access to vendors, materials, or technology for rooftop projects?",
                    "dimension": "Capacity",
                    "scored": True,
                    "options": [
                        {"label": "No access", "score": 0},
                        {"label": "Limited access", "score": 1},
                        {"label": "Good access", "score": 3},
                        {"label": "Other", "score": 1},
                    ],
                },
                {
                    "id": "Q12",
                    "type": "multi_select",
                    "label": "What are your top motivators? (Pick up to 3)",
                    "dimension": "Motivation",
                    "scored": True,
                    "cap_selections": 3,
                    "options": [
                        {"label": "Environmental concern", "score": 3},
                        {"label": "Saving electricity costs", "score": 2},
                        {"label": "Reducing waste sustainably", "score": 2},
                        {"label": "Reduce bills / back to home", "score": 2},
                        {"label": "Growing organic pesticide-free food", "score": 1},
                        {"label": "Reduce cost of LPG/piped gas", "score": 1},
                        {"label": "Increasing property value", "score": 1},
                    ],
                },
                {
                    "id": "Q13",
                    "type": "single_select",
                    "label": "How is your water availability for green development?",
                    "dimension": "Capacity",
                    "scored": True,
                    "conditional_trigger": "R05",
                    "options": [
                        {"label": "Inadequate - need external supply", "score": 0},
                        {"label": "Somewhat adequate", "score": 1},
                        {"label": "Adequate - need minor top-up", "score": 3},
                        {"label": "Not sure", "score": 1},
                    ],
                },
                {
                    "id": "Q14",
                    "type": "single_select",
                    "label": "How affordable is a rooftop investment of Rs.800-1,500 per m2 for you?",
                    "dimension": "Barriers",
                    "scored": True,
                    "inverted": True,
                    "conditional_trigger": "R04",
                    "options": [
                        {"label": "Unaffordable", "score": 0},
                        {"label": "Somewhat affordable", "score": 2},
                        {"label": "Completely affordable", "score": 3},
                    ],
                },
                {
                    "id": "Q15",
                    "type": "multi_select",
                    "label": "What would help your Society or building management decide faster? (Select all that apply)",
                    "scored": False,
                    "stored": True,
                    "conditional_trigger": "R13",
                    "options": [
                        "Free Feasibility Report",
                        "Certified site visit",
                        "Expert meeting on guidelines",
                        "ROI/Subsidy success stories",
                    ],
                },
                {
                    "id": "Q16",
                    "type": "multi_select",
                    "label": "What support would make this easier for you? (Select all that apply)",
                    "scored": False,
                    "stored": True,
                    "conditional_trigger": "R14",
                    "options": [
                        "Subsidy or financial support",
                        "EMI / pay-as-you-earn",
                        "Free consultation",
                        "Professional installation",
                        "Maintenance support",
                        "Step-by-step guide",
                        "Vendor recommendation near me",
                    ],
                },
            ],
        },
    ],
}


@api_router.get("/calculator/config")
async def get_calculator_config():
    """Return the active homeowner_v1 calculator config."""
    doc = await db.calculator_config.find_one({"config_id": "homeowner_v1"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Config not found")
    return doc


def _score_for_answer(question: dict, answer) -> int:
    """Extract numeric score from a single_select or multi_select answer."""
    if not question.get("scored"):
        return 0
    q_type: str = question.get("type", "")
    opts: list = question.get("options", [])
    if q_type == "single_select":
        ans_str: str = answer if isinstance(answer, str) else ""
        for opt in opts:
            if isinstance(opt, dict) and opt.get("label") == ans_str:
                return int(opt.get("score", 0))
        return 0
    if q_type == "multi_select":
        if not isinstance(answer, list):
            return 0
        total: int = 0
        for sel in answer:
            for opt in opts:
                if isinstance(opt, dict) and opt.get("label") == sel:
                    total += int(opt.get("score", 0))
        return total
    return 0


# ── Submission validation ─────────────────────────────────────────────────────
_GIBBERISH_NAMES: set = {
    "test", "asdf", "qwerty", "abc", "xyz", "aaa", "bbb", "ccc",
    "foo", "bar", "demo", "sample", "dummy", "fake", "random",
    "user", "admin", "name", "hello", "hi", "na", "none", "null",
    "undefined", "string", "example", "xxx", "yyy", "zzz",
}


def _validate_submission(answers: dict) -> Optional[dict]:
    """Return None if valid, or dict with {error, field} if invalid."""
    first = (answers.get("first_name") or "").strip()
    last  = (answers.get("last_name")  or "").strip()
    email = (answers.get("email")      or "").strip()
    area  = answers.get("terrace_area_sqft")

    if len(first) < 2:
        return {"error": "Please check your details and try again.", "field": "first_name"}
    if len(last) < 2:
        return {"error": "Please check your details and try again.", "field": "last_name"}
    if first.lower() in _GIBBERISH_NAMES:
        return {"error": "Please check your details and try again.", "field": "first_name"}
    if last.lower() in _GIBBERISH_NAMES:
        return {"error": "Please check your details and try again.", "field": "last_name"}
    if first.lower() == last.lower():
        return {"error": "Please check your details and try again.", "field": "last_name"}
    if not ("@" in email and "." in email and len(email) > 6):
        return {"error": "Please enter a valid email address.", "field": "email"}
    if area is not None:
        try:
            v = float(area)
            if v < 50 or v > 50000:
                return {"error": "Please enter a valid terrace area between 50 and 50,000 sq ft.", "field": "terrace_area_sqft"}
        except (TypeError, ValueError):
            return {"error": "Please check your details and try again.", "field": "terrace_area_sqft"}
    return None  # valid


@api_router.post("/waitlist/international")
async def join_international_waitlist(request: Request):
    """Capture non-India visitors who try to use the calculator."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    email = (body.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Email required")
    doc = {
        "id": f"intl_{uuid.uuid4().hex[:12]}",
        "email": email,
        "display_address": body.get("display_address", ""),
        "country": body.get("country", ""),
        "created_at": datetime.now(timezone.utc),
    }
    await db.waitlist_international.insert_one(doc)
    return {"saved": True}


@api_router.post("/calculator/score")
async def calculator_score(request: Request):
    """Score a completed calculator submission and store the assessment."""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    logger.error(f"SCORE ENDPOINT HIT — payload keys: {list(payload.keys())}")

    answers = payload.get("answers", {})
    website_hp = payload.get("website", "")

    # Honeypot — silently pass (actual rejection is in /report/generate)
    # We still store a placeholder assessment so the ID is consistent
    honeypot_triggered = bool(website_hp)

    # Submission validation (skip for honeypot — we still want to record those)
    if not honeypot_triggered:
        _invalid = _validate_submission(answers)
        if _invalid:
            client_ip = request.client.host if request.client else "unknown"
            ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()
            await db.rejected_submissions.insert_one({
                "ip_hash": ip_hash,
                "answers_summary": {
                    "first_name": answers.get("first_name", "")[:30],
                    "last_name":  answers.get("last_name", "")[:30],
                    "email":      answers.get("email", "")[:60],
                },
                "reason": _invalid.get("field", "unknown"),
                "created_at": datetime.now(timezone.utc),
            })
            raise HTTPException(status_code=400, detail=_invalid["error"])

    # ---- Extract individual question answers ----
    q1_answer = answers.get("Q1", "")
    q2_answer = answers.get("Q2", "")
    q3_answer = answers.get("Q3", "")
    q4b_answer = answers.get("Q4b", "")
    q4c_answer = answers.get("Q4c", "")
    q5_answer = answers.get("Q5", [])  # list
    q6_answer = answers.get("Q6", "")
    q7_answer = answers.get("Q7", "")
    q8_answer = answers.get("Q8", "")
    q9_answer = answers.get("Q9", "")
    q10_answer = answers.get("Q10", "")
    q12_answer = answers.get("Q12", [])  # list
    q13_answer = answers.get("Q13", "")
    q14_answer = answers.get("Q14", "")
    q15_answer = answers.get("Q15", [])  # list
    q16_answer = answers.get("Q16", [])  # list

    # Load config to get score mappings
    cfg = await db.calculator_config.find_one({"config_id": "homeowner_v1"})
    if not cfg:
        cfg = CALCULATOR_CONFIG_V1

    # Build question lookup by id (guard against malformed config entries)
    q_map: dict = {}
    for page in cfg.get("pages", []):
        for q in page.get("questions", []):
            qid = q.get("id")
            if qid:
                q_map[qid] = q

    def score(qid: str, ans) -> int:
        return _score_for_answer(q_map.get(qid, {}), ans)

    q1_score = score("Q1", q1_answer)
    q2_score = score("Q2", q2_answer)
    q4b_score = score("Q4b", q4b_answer)
    q4c_score = score("Q4c", q4c_answer)
    q5_sum_raw = score("Q5", q5_answer)
    q5_sum = min(q5_sum_raw, 3)  # cap at 3
    q6_score = score("Q6", q6_answer)
    q7_score = score("Q7", q7_answer)
    q8_score = score("Q8", q8_answer)
    q9_score = score("Q9", q9_answer)
    q10_score = score("Q10", q10_answer)
    q12_total = score("Q12", q12_answer)
    q13_score = score("Q13", q13_answer)
    q14_score = score("Q14", q14_answer)

    # ---- Dimension raw scores ----
    capacity_raw = q1_score + q2_score + q6_score + q10_score + q13_score  # max 17
    motivation_raw = q4b_score + q4c_score + q7_score + q8_score + q12_total  # max 22
    interest_raw = q9_score + q5_sum  # max 6
    barriers_raw = q14_score  # max 3, inverted

    # ---- Normalise ----
    capacity_norm = round((capacity_raw / 17) * 100)
    motivation_norm = round((motivation_raw / 22) * 100)
    interest_norm = round((interest_raw / 6) * 100)
    barriers_norm = round(((3 - barriers_raw) / 3) * 100)

    # ---- Overall ----
    overall = round(
        (capacity_norm * 0.30)
        + (motivation_norm * 0.30)
        + (interest_norm * 0.25)
        + (barriers_norm * 0.15)
    )

    # ---- Tier ---- (initialised first so static analysers never see them as unbound)
    tier: str = "Explorer"
    tier_color: str = "#FF7070"
    if overall <= 25:
        tier, tier_color = "Explorer", "#FF7070"
    elif overall <= 50:
        tier, tier_color = "Getting Ready", "#F5A623"
    elif overall <= 75:
        tier, tier_color = "Action Ready", "#4ADE80"
    else:
        tier, tier_color = "Sustainability Champion", "#00C96E"

    # ---- Conditional flags ----
    r07 = q4c_score >= 3
    flags = {
        "R03": q9_score == 3,
        "R04": q14_score == 0,
        "R05": q13_score == 0,
        "R06": q4b_score >= 3,
        "R07": r07,
        "R08": q6_score == 3,
        "R09": q3_answer == "Renter",
        "R10": q5_sum_raw == 0,
        "R11": q8_score == 3,
        "R12": q7_score == 0,
        "R13": "ROI/Subsidy success stories" in (q15_answer if isinstance(q15_answer, list) else []),
        "R14": "EMI / pay-as-you-earn" in (q16_answer if isinstance(q16_answer, list) else []),
    }
    show_biogas = q1_answer in ("Independent House", "Row House") or r07

    # ---- IP hash ----
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()

    # ---- Store assessment ----
    now = datetime.now(timezone.utc)
    assessment_id = str(uuid.uuid4())
    assessment_doc = {
        "assessment_id": assessment_id,
        "answers": answers,
        "scores": {
            "capacity": capacity_norm,
            "motivation": motivation_norm,
            "interest": interest_norm,
            "barriers": barriers_norm,
            "overall": overall,
        },
        "readiness_tier": tier,
        "tier_color": tier_color,
        "show_biogas": show_biogas,
        "conditional_flags": flags,
        "ip_hash": ip_hash,
        "honeypot_triggered": honeypot_triggered,
        "created_at": now,
        "report_text": None,
        "report_generated_at": None,
        "tokens_used": None,
    }
    await db.assessments.insert_one(assessment_doc)

    return {
        "capacity_score": capacity_norm,
        "motivation_score": motivation_norm,
        "interest_score": interest_norm,
        "barriers_score": barriers_norm,
        "overall_score": overall,
        "readiness_tier": tier,
        "tier_color": tier_color,
        "show_biogas": show_biogas,
        "conditional_flags": flags,
        "assessment_id": assessment_id,
    }


BLOCKED_EMAIL_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "tempmail.com",
    "throwaway.email", "yopmail.com",
}

CLAUDE_SYSTEM_PROMPT = """You are Sus10 AI, an expert in climate-resilient homes, green roofs, rooftop farming, solar energy, rainwater harvesting, composting, and sustainable living in the Indian context.

GUARDRAILS (non-negotiable):
- Never promise specific Rs. savings or ROI timelines
- Always use cautious language: 'could', 'may', 'potentially', 'estimates suggest'
- Never recommend solutions the user's building type cannot support
- Keep total report between 700-1200 words
- No technical jargon — speak to a non-expert Indian homeowner
- Be encouraging, practical, and action-oriented
- Personalise every section to the actual answers provided
- Do not generate generic advice
- Always end with: 'Every roof has the potential to become a climate solution. Your journey toward a Self-Sustaining Roof starts with one small step.'

HOUSEHOLD INFERENCE RULE:
NEVER infer or estimate the number of people in the household. Use ONLY the household_size value provided in HOUSEHOLD DETAILS. Do not multiply num_apartments by any assumed family size to derive occupant count.

SOLAR ACCURACY RULES:
- Solar panels realistically cover 50-60% of total terrace area due to water tanks, stairwells, AC units, parapet walls, and shade from adjacent structures. Never assume the full terrace is available for panels.
- Residential solar in India is sized by household load: Independent house 3-7 kWp practical maximum, Row house 2-5 kWp, Apartment per-flat share 1-3 kWp.
- Always present solar savings as a range, not a single number. Use: 'could generate between X and Y units per month' and 'potential savings in the range of Rs.X to Rs.Y per year'.

ROADMAP FORMAT RULES:
- For the Sus10 Roadmap section, output plain text bullets only.
- No bold markers, no 'Action N:' prefixes, no asterisks anywhere.
- Format each bullet as: '- Short action phrase under 50 characters'
- WRONG: '**Action 1:** Start daily waste segregation for biogas readiness'
- RIGHT: '- Start daily wet waste segregation'

RECOMMENDATION PRIORITY ORDER (always follow this sequence):
1. Greening and terrace gardening — ALWAYS recommend first.
   Lowest barrier to entry. No approvals, no large investment,
   immediate visible results. This is the gateway to sustainability.
   Frame as: personal, emotional, food security, wellbeing.

2. Rainwater Harvesting — recommend second.
   One-time investment, high impact in Indian climate,
   no ongoing complexity after installation.

3. Solar — mention but do not strongly push.
   High impact but high complexity — significant investment,
   installer dependency, net metering approvals, society
   permissions for apartments. Present as a future aspiration
   or Phase 2 action, not an immediate recommendation.
   Frame as: 'When you are ready to invest further...'

4. Biogas — only when relevant (show_biogas flag is true).
   Present as complementary to greening, not standalone.

Never lead with solar savings as the primary hook.
The emotional hook is always food, green space, and wellbeing first."""


@api_router.post("/report/generate")
async def report_generate(request: Request, background_tasks: BackgroundTasks):
    """Run deterministic calculations, then call LLM to generate personalised report."""
    logger.error("REPORT ENDPOINT HIT — assessment_id incoming")

    # Guard: fail fast with a clear 500 if the Emergent LLM key is missing.
    _llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not _llm_key:
        logger.error("EMERGENT_LLM_KEY is not set — cannot generate report")
        raise HTTPException(
            status_code=500,
            detail="LLM service not configured on this server. Contact support.",
        )

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    assessment_id = payload.get("assessment_id", "")
    email = payload.get("email", "")
    website_hp = payload.get("website", "")

    # GUARDRAIL 3 — Honeypot: silently succeed without doing anything
    if website_hp:
        fake_id = str(uuid.uuid4())
        return {"assessment_id": fake_id, "status": "queued"}

    # GUARDRAIL 1 — Email domain blocklist
    email_domain = email.split("@")[-1].lower() if "@" in email else ""
    if email_domain in BLOCKED_EMAIL_DOMAINS:
        raise HTTPException(status_code=400, detail="Please use a valid email address.")

    # GUARDRAIL 2 — Rate limit (3/IP/hour)
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

    # Ensure TTL index exists (idempotent)
    await db.rate_limits.create_index("created_at", expireAfterSeconds=3600, background=True)

    recent_count = await db.rate_limits.count_documents(
        {"ip_hash": ip_hash, "created_at": {"$gte": one_hour_ago}}
    )
    if recent_count >= 3:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again in an hour.",
        )

    # GUARDRAIL 4 — Daily hard cap (100/day IST)
    # IST = UTC+5:30
    now_utc = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    now_ist = now_utc + ist_offset
    today_ist_midnight = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    today_utc_start = today_ist_midnight - ist_offset

    daily_count = await db.assessments.count_documents(
        {"created_at": {"$gte": today_utc_start}, "report_text": {"$ne": None}}
    )
    if daily_count >= 100:
        raise HTTPException(
            status_code=503,
            detail="We've reached our daily report limit. Please try again tomorrow or email hello@sus10.ai",
        )

    # ── STEP A: Fetch assessment ──────────────────────────────────────────────
    assessment = await db.assessments.find_one({"assessment_id": assessment_id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    answers = assessment.get("answers", {})
    scores = assessment.get("scores", {})
    flags = assessment.get("conditional_flags", {})
    show_biogas = assessment.get("show_biogas", True)

    def ans(key, default="Not provided"):
        v = answers.get(key)
        if v is None or v == "" or v == []:
            return default
        if isinstance(v, list):
            return ", ".join(str(i) for i in v) if v else default
        return str(v)

    # ── STEP B: Prepare inputs ────────────────────────────────────────────────
    q1_value = answers.get("Q1", "")
    _track_a = {"Independent House", "Row House"}
    _track_b = {"Mid/low-rise Apartment (1-4 floors)", "High-rise apartment (5+ floors)"}
    track = "A" if q1_value in _track_a else ("B" if q1_value in _track_b else "A")
    # Normalise city: lowercase + strip so it matches calculator lookup keys
    # (Google Places returns e.g. "Mumbai" with capitals; keys are lowercase)
    city = (str(answers.get("city") or "").strip().lower()) or "default"
    building_type = "residential"

    # ── STEP C: Map select answers to integers ────────────────────────────────
    _FLOOR_MAP = {"1": 1, "2": 2, "3": 3, "4 or more": 4}
    _HH_A = {"1-2": 2, "3-5": 4, "6-10": 8, "More than 10": 10}
    _HH_B = {"1-2": 2, "3-5": 4, "6 or more": 6}
    _APT = {"Less than 10": 5, "10-25": 17, "26-50": 38, "51-100": 75, "More than 100": 120}

    if track == "A":
        num_floors_int = _FLOOR_MAP.get(str(answers.get("num_floors", "")), 2)
        household_size_int = _HH_A.get(str(answers.get("household_size", "")), 4)
        num_apartments_int = 1
        families_for_biogas = 1
    else:
        # Track B has no num_floors field — derive from Q1
        num_floors_int = 7 if ("high-rise" in q1_value.lower() or "5+" in q1_value) else 3
        household_size_int = _HH_B.get(str(answers.get("household_size", "")), 4)
        num_apartments_int = _APT.get(str(answers.get("num_apartments", "")), 17)
        families_for_biogas = num_apartments_int

    # ── STEP D: Unit conversion (API boundary — one place only) ──────────────
    # Unit boundary: user inputs sqft, calculator uses sqm internally
    # Convert here and nowhere else
    terrace_area_sqft = float(answers.get("terrace_area_sqft") or 0)
    area_sqm = round(terrace_area_sqft * 0.0929, 2)

    # Solar: 50-60% of terrace (tanks, stairwells, AC units, parapet walls,
    # shade from adjacent structures). Use midpoint 55% for base calculation.
    # Plantation: 70% (containers fit around edges and unused corners).
    solar_usable_sqm      = round(area_sqm * 0.55, 2)
    plantation_usable_sqm = round(area_sqm * 0.70, 2)
    # Legacy alias kept for rainwater + biogas (catchment = full terrace)
    usable_area_sqm = solar_usable_sqm   # used only for solar calc below
    usable_area_sqft = round(solar_usable_sqm * 10.764)

    # ── STEP E: Call calculator functions (thread pool) ──────────────────────
    # Calculator functions are pure-Python sync. Running them via
    # run_in_executor frees the event loop so other requests are not blocked.
    def _run_calculations():
        solar = calculate_solar_potential(usable_area_sqm=solar_usable_sqm, city=city)
        rainwater = calculate_rainwater_potential(catchment_area_sqm=area_sqm, city=city)
        biogas = calculate_biogas_potential(
            building_footprint_sqm=area_sqm,
            building_type=building_type,
            floors=num_floors_int,
            families=families_for_biogas,
            waste_kg_per_family_per_day=0.5,
        )
        plantation = calculate_plantation_potential(usable_area_sqm=plantation_usable_sqm)
        return solar, rainwater, biogas, plantation

    loop = asyncio.get_event_loop()
    solar_result, rainwater_result, biogas_result, plantation_result = \
        await loop.run_in_executor(None, _run_calculations)

    # ── Solar kWp cap by building type ────────────────────────────────────────
    # PENDING-010: Migrate PlacesAddressField from deprecated
    # google.maps.places.Autocomplete to new
    # google.maps.places.PlaceAutocompleteElement
    # (Not breaking yet — at least 12 months notice given. Sprint B+2.)
    _SOLAR_KWP_CAPS = {
        "Independent House": 7.0,
        "Row House": 5.0,
        "Mid/low-rise Apartment (1-4 floors)": 3.0,
        "High-rise apartment (5+ floors)": 2.0,
    }
    try:
        _installed_kwp = float(solar_result.get("installed_capacity_kwp") or 0)
        _kwp_cap = _SOLAR_KWP_CAPS.get(q1_value, 5.0)
        # Guard: only cap when installed > 0 (avoids ZeroDivisionError)
        if _installed_kwp > 0 and _installed_kwp > _kwp_cap:
            _scale = _kwp_cap / _installed_kwp
            solar_result["installed_capacity_kwp"] = round(_kwp_cap, 2)
            for _k in ["annual_generation_kwh", "monthly_generation_kwh",
                       "annual_savings_inr", "co2_offset_kg_per_year"]:
                if _k in solar_result and solar_result[_k] is not None:
                    solar_result[_k] = round(float(solar_result[_k]) * _scale)
            solar_result["capped"] = True
            solar_result["cap_note"] = (
                f"Sized to {_kwp_cap} kWp — practical for "
                f"typical {q1_value} household load"
            )
    except Exception as _cap_exc:
        logger.error(
            f"Solar kWp cap failed — type={type(_cap_exc).__name__} err={_cap_exc}",
            exc_info=True,
        )

    # ── Solar low/high range (50–60% of terrace) ─────────────────────────────
    # These keys MUST be set before STEP G builds the f-string prompt.
    # Wrap in try/except with safe defaults so a crash here never causes 502.
    try:
        _scale_low  = 50.0 / 55.0   # ~0.909
        _scale_high = 60.0 / 55.0   # ~1.091
        _ann_kwh  = float(solar_result.get("annual_generation_kwh",  0) or 0)
        _mon_kwh  = float(solar_result.get("monthly_generation_kwh", 0) or 0)
        _ann_sav  = float(solar_result.get("annual_savings_inr",     0) or 0)
        solar_result["kwh_low"]          = round(_ann_kwh * _scale_low)
        solar_result["kwh_high"]         = round(_ann_kwh * _scale_high)
        solar_result["monthly_kwh_low"]  = round(_mon_kwh * _scale_low)
        solar_result["monthly_kwh_high"] = round(_mon_kwh * _scale_high)
        solar_result["savings_low_inr"]  = round(_ann_sav * _scale_low)
        solar_result["savings_high_inr"] = round(_ann_sav * _scale_high)
        solar_result["area_low_sqft"]    = round(area_sqm * 0.50 * 10.764)
        solar_result["area_high_sqft"]   = round(area_sqm * 0.60 * 10.764)
    except Exception as _range_exc:
        logger.error(
            f"Solar range calc failed — type={type(_range_exc).__name__} err={_range_exc}",
            exc_info=True,
        )
        # Safe defaults — prevent KeyError in STEP G f-string
        for _k in ["kwh_low", "kwh_high", "monthly_kwh_low", "monthly_kwh_high",
                   "savings_low_inr", "savings_high_inr", "area_low_sqft", "area_high_sqft"]:
            solar_result.setdefault(_k, 0)

    # Biogas suppression — suppress if flagged off or monthly output < 1 m³
    biogas_monthly_m3 = biogas_result["biogas_m3_per_day"] * 30
    if not show_biogas or biogas_monthly_m3 < 1.0:
        biogas_result = None

    # Area outputs back-converted to sqft for display only (non-area outputs unchanged)
    catchment_area_sqft  = round(area_sqm * 10.764)
    plantation_area_sqft = round(plantation_result["effective_area_sqm"] * 10.764)
    solar_area_sqft_mid  = round(solar_usable_sqm * 10.764)

    # Aggregate totals
    total_savings_inr = (
        solar_result["annual_savings_inr"] + rainwater_result["annual_savings_inr"]
    )
    total_co2_kg = (
        solar_result["co2_offset_kg_per_year"]
        + plantation_result["co2_sequestered_kg_per_year"]
    )
    if biogas_result:
        total_savings_inr += biogas_result["annual_savings_inr"]
        total_co2_kg += biogas_result["co2_offset_kg_per_year"]

    # ── STEP F: Store computed results in assessment ──────────────────────────
    await db.assessments.update_one(
        {"assessment_id": assessment_id},
        {"$set": {
            "calculated_solar": solar_result,
            "calculated_biogas": biogas_result,
            "calculated_rainwater": rainwater_result,
            "calculated_plantation": plantation_result,
            "calculation_inputs_sqft": {
                "terrace_area_sqft": terrace_area_sqft,
                "solar_area_sqft": usable_area_sqft,
                "usable_area_sqft": usable_area_sqft,
                "city": city,
                "floors": num_floors_int,
                "families": families_for_biogas,
                "track": track,
            },
        }},
    )

    # ── STEP G: Build Claude prompt with real computed numbers ────────────────
    _solar_trees = round(solar_result["co2_offset_kg_per_year"] / 21)
    _trees_total = round(total_co2_kg / 21)

    _biogas_block = ""
    if biogas_result:
        _biogas_block = (
            f"\nBIOGAS:\n"
            f"- Daily organic waste input: {biogas_result['daily_organic_waste_kg']} kg/day\n"
            f"- Monthly biogas output: {round(biogas_result['biogas_m3_per_day'] * 30, 1)} m³/month\n"
            f"- Annual LPG savings: Rs.{biogas_result['annual_savings_inr']:,}/year\n"
            f"- CO2 offset: {biogas_result['co2_offset_kg_per_year']:,} kg/year\n"
        )
    else:
        _biogas_block = "\nBIOGAS: Not applicable — waste volume insufficient for a viable plant.\n"

    _savings_label = "solar + rainwater" + (" + biogas" if biogas_result else "")

    if track == "A":
        _track_note = (
            "FRAMING: Track A (independent house / row house). "
            "Frame all recommendations as personal decisions this homeowner can take themselves."
        )
    else:
        _per_flat_kwp = round(solar_result["installed_capacity_kwp"] / max(num_apartments_int, 1), 2)
        _track_note = (
            f"FRAMING: Track B (apartment). Frame solar, biogas, and rainwater as building-level "
            f"projects requiring Society approval. Where relevant, state the per-flat share: "
            f"'Your building could install {solar_result['installed_capacity_kwp']} kWp — roughly "
            f"{_per_flat_kwp} kWp per flat.' "
            f"For greening, use community garden language: 'your building's shared terrace'."
        )

    user_prompt = f"""Generate a Sus10 AI Home Sustainability Readiness Report for:

NAME: {ans('first_name')} {ans('last_name')}
CITY: {ans('city')}, {ans('state')}
BUILDING TYPE: {ans('Q1')}
BUILDING AGE: {ans('Q2')}
OWNERSHIP: {ans('Q3')}
MONTHLY ELECTRICITY BILL: {ans('Q4b')}
MONTHLY GAS BILL: {ans('Q4c')}

SCORES:
- Capacity Score: {scores.get('capacity', 0)}/100
- Motivation Score: {scores.get('motivation', 0)}/100
- Interest Score: {scores.get('interest', 0)}/100
- Barriers Score: {scores.get('barriers', 0)}/100
- OVERALL READINESS: {scores.get('overall', 0)}/100
- READINESS TIER: {assessment.get('readiness_tier', '')}

KEY ANSWERS:
- Technologies aware of: {ans('Q5')}
- Waste segregation: {ans('Q6')}
- Believes in green roof health benefits: {ans('Q7')}
- Believes in environmental impact: {ans('Q8')}
- Interest level: {ans('Q9')}
- Vendor access: {ans('Q10')}
- Top motivators: {ans('Q12')}
- Water availability: {ans('Q13')}
- Affordability: {ans('Q14')}
- Support needed (Q15): {ans('Q15')}
- Support needed (Q16): {ans('Q16')}

BUILDING DETAILS:
- Terrace / rooftop area: {int(terrace_area_sqft) if terrace_area_sqft else 'Not provided'} sq ft
- Solar usable area: {solar_result['area_low_sqft']:,}–{solar_result['area_high_sqft']:,} sq ft (50-60% of terrace)
- Building type: {ans('Q1')}
- Floors: {num_floors_int}
- Households / families: {families_for_biogas}

HOUSEHOLD DETAILS:
- Household size (people in flat/house): {household_size_int}
- Number of apartments in building: {num_apartments_int if track == 'B' else 'N/A'}
- Building track: {'Apartment (Track B)' if track == 'B' else 'Independent / Row House (Track A)'}

CALCULATED SUSTENANCE POTENTIAL
(Deterministic calculations — use these exact numbers. Do not estimate or recalculate. Your role is to explain what these numbers mean in plain language for this homeowner.)

SOLAR:
- Panel area: {solar_result['area_low_sqft']:,}–{solar_result['area_high_sqft']:,} sq ft (50-60% of {int(terrace_area_sqft):,} sq ft terrace)
- Installable capacity: {solar_result['installed_capacity_kwp']} kWp{f" — Note: {solar_result['cap_note']}" if solar_result.get('capped') else ""}
- Monthly generation: {solar_result['monthly_kwh_low']}–{solar_result['monthly_kwh_high']} units/month (annual avg: {solar_result['monthly_generation_kwh']} units/month)
- Annual savings: Rs.{solar_result['savings_low_inr']:,}–Rs.{solar_result['savings_high_inr']:,} (avg: Rs.{solar_result['annual_savings_inr']:,})
- CO2 offset: {solar_result['co2_offset_kg_per_year']:,} kg/year
- Equivalent to: {_solar_trees} trees planted/year (21 kg CO2/tree/year)
{_biogas_block}
RAINWATER HARVESTING:
- Catchment area: {catchment_area_sqft:,} sq ft
- Water captured/year: {rainwater_result['annual_yield_kiloliters']} kL ({rainwater_result['annual_yield_liters']:,} litres)
- Annual savings: Rs.{rainwater_result['annual_savings_inr']:,}
- Household consumption basis: {families_for_biogas * 150} litres/day

PLANTATION / GREENING:
- Plantable area: {plantation_area_sqft:,} sq ft
- Approximate plant count: {plantation_result['total_plants_count']} plants
- Estimated food yield: {plantation_result['annual_food_yield_kg'] or 0} kg/year
- CO2 sequestered: {plantation_result['co2_sequestered_kg_per_year']:,} kg/year
- Water needed: {plantation_result['water_required_lpd']} litres/day

GREENING SECTION INSTRUCTIONS — READ CAREFULLY:
Do NOT recommend specific plants or suggest a planting plan. The platform does not yet have city-validated species data.
Write the greening section as follows:
1. State the approximate number of plants the terrace could support based on the calculated plantable area.
2. Mention 2-3 generic plant categories as illustrations only (e.g. "food plants such as leafy vegetables, herbs, or dwarf fruit trees"; "wellness plants such as medicinal herbs"). Do NOT name specific varieties.
3. State the aggregate numbers: {plantation_result['annual_food_yield_kg'] or 0} kg/year food yield, {plantation_result['co2_sequestered_kg_per_year']:,} kg/year CO2 sequestered.
4. Tell the user: "The right plant selection for your specific terrace depends on your city's climate, sun exposure, shade patterns, and structural loading. We recommend a site assessment or consultation with a qualified horticulturist before finalising your planting plan."
5. Keep this section to 3-4 sentences only.

TOTAL ANNUAL IMPACT SUMMARY:
- Total estimated savings: Rs.{total_savings_inr:,}/year ({_savings_label})
- Total CO2 offset: {total_co2_kg:,} kg/year
- Equivalent to approximately {_trees_total} trees planted/year

{_track_note}

Generate the report following this structure:
1. Respondent Profile (with sustainability opportunity interpretation)
2. Sus10 Readiness Score (tier: Explorer / Getting Ready / Action Ready / Sustainability Champion)
3. Strengths Identified (3-5 strengths with explanation)
4. Gap Analysis Matrix (6 dimensions: Motivation, Affordability, Technology Access, Waste Readiness, Water Availability, Community Readiness)
5. Personalized Recommendations (max 7, based on actual answers, suppress irrelevant solutions)
6. Potential Savings and Benefits — USE THE EXACT CALCULATED FIGURES ABOVE. Do not invent alternative numbers.
7. Suggested Sus10 Roadmap (Phase 1: 0-3 months / Phase 2: 3-12 months / Phase 3: 1-3 years)
8. Support Needed (based on Q15/Q16 answers)
9. Final Assessment (readiness level + biggest opportunity + biggest barrier + one action this month)

End with: 'Every roof has the potential to become a climate solution. Your journey toward a Self-Sustaining Roof starts with one small step.'"""

    # ── STEP H: Call LLM via Emergent integration ────────────────────────────
    from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage

    report_text: str = ""
    tokens_used: int = 0
    try:
        chat = LlmChat(
            api_key=_llm_key,
            session_id=f"sus10-report-{assessment_id}",
            system_message=CLAUDE_SYSTEM_PROMPT,
        ).with_model("claude", "claude-sonnet-4-5")

        logger.info("LlmChat created — calling claude-sonnet-4-5 via Emergent")
        msg = LlmUserMessage(text=user_prompt)

        # chat.send_message() uses synchronous HTTP internally — asyncio.wait_for()
        # cannot cancel a blocking call. Running it in a thread pool means the
        # event loop stays free and wait_for() CAN actually interrupt it.
        def _call_llm_sync():
            return chat.send_message(msg)

        try:
            report_text = await asyncio.wait_for(
                loop.run_in_executor(None, _call_llm_sync),
                timeout=20.0,
            )
        except asyncio.TimeoutError:
            logger.error("LLM call timed out after 20s")
            raise HTTPException(
                status_code=504,
                detail="Report generation timed out. Please try again.",
            )
        except Exception as e:
            logger.error(f"LLM call failed: {type(e).__name__} {e}")
            raise HTTPException(status_code=502, detail=str(e))

        tokens_used = 0  # emergentintegrations does not expose token counts
        logger.info("LLM call success")
    except HTTPException:
        raise  # re-raise 504/502 unchanged
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(
            f"LLM error — type={error_type}, message={error_msg}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=502,
            detail=f"{error_type}: {error_msg}",
        )

    # Record rate-limit entry
    await db.rate_limits.insert_one({"ip_hash": ip_hash, "created_at": now_utc})

    # ── STEP I: Store report_text and tokens_used ─────────────────────────────
    gen_time = datetime.now(timezone.utc)
    await db.assessments.update_one(
        {"assessment_id": assessment_id},
        {"$set": {
            "report_text": report_text,
            "report_generated_at": gen_time,
            "tokens_used": tokens_used,
        }},
    )

    # ── STEP J: Queue transactional emails in background ─────────────────────
    # Emails are dispatched AFTER the response is returned so they never add
    # to the user-visible latency. The background task runs in the same
    # event loop after FastAPI sends the HTTP response.
    _overall_score  = scores.get("overall", 0)
    _readiness_tier = assessment.get("readiness_tier") or ""
    _phone_raw      = str(answers.get("phone") or "").strip()
    _phone_digits   = re.sub(r"[^0-9]", "", _phone_raw).lstrip("91")

    async def _bg_send_emails() -> None:
        """Background: send report email to user + admin notification."""
        # User report email
        try:
            email_sent = await asyncio.to_thread(
                send_report_email,
                to_email=answers.get("email"),
                first_name=answers.get("first_name"),
                assessment_id=str(assessment_id),
                overall_score=_overall_score,
                readiness_tier=_readiness_tier,
                solar_kwh=solar_result.get("annual_generation_kwh", 0),
                rainwater_kl=rainwater_result.get("annual_yield_kiloliters", 0),
                food_kg=plantation_result.get("annual_food_yield_kg", 0),
                co2_tonnes=round(total_co2_kg / 1000, 1),
            )
        except Exception as _email_exc:
            logger.error(f"send_report_email raised unexpectedly: {_email_exc}", exc_info=True)
            email_sent = False

        await db.assessments.update_one(
            {"assessment_id": assessment_id},
            {"$set": {
                "email_sent":    email_sent,
                "email_sent_at": datetime.now(timezone.utc) if email_sent else None,
            }},
        )

        # Admin notification
        try:
            await asyncio.to_thread(
                send_admin_notification,
                first_name=answers.get("first_name"),
                last_name=answers.get("last_name"),
                email=answers.get("email"),
                phone=_phone_raw,
                phone_digits=_phone_digits,
                city=answers.get("city"),
                overall_score=_overall_score,
                readiness_tier=_readiness_tier,
                assessment_id=str(assessment_id),
            )
        except Exception as _notif_exc:
            logger.error(f"send_admin_notification raised unexpectedly: {_notif_exc}", exc_info=True)

    background_tasks.add_task(_bg_send_emails)

    # Return response immediately — emails fire in background
    return {
        "assessment_id": assessment_id,
        "report_text": report_text,
        "readiness_tier": assessment.get("readiness_tier"),
        "overall_score": scores.get("overall", 0),
    }


@api_router.get("/report/{assessment_id}")
async def get_report(assessment_id: str):
    """Fetch a stored assessment + report by assessment_id."""
    doc = await db.assessments.find_one({"assessment_id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    # Convert datetime objects to ISO strings for JSON serialisation
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


# Seed calculator config in startup
async def _seed_calculator_config():
    # replace_one ensures the config in MongoDB always matches the code —
    # $setOnInsert would leave an old config in place after updates.
    await db.calculator_config.replace_one(
        {"config_id": "homeowner_v1"},
        CALCULATOR_CONFIG_V1,
        upsert=True,
    )


# ==================== END SPRINT A ====================

# ── Diagnostic test endpoints ─────────────────────────────────────────────────

@api_router.get("/test/claude")
async def test_claude():
    """Minimal LLM smoke-test via Emergent integration. Isolates key presence and connectivity."""
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    key_present = bool(llm_key)
    logger.info(f"test/claude — EMERGENT_LLM_KEY present: {key_present}")
    if not llm_key:
        return {"status": "error", "detail": "EMERGENT_LLM_KEY is not set in environment", "key_present": False}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage as LlmUserMessage
        chat = LlmChat(
            api_key=llm_key,
            session_id="sus10-test-smoke",
            system_message="You are a test assistant.",
        ).with_model("claude", "claude-sonnet-4-5")
        response = await chat.send_message(LlmUserMessage(text="Say OK"))
        return {"status": "ok", "response": response, "key_present": True}
    except Exception as e:
        return {"status": "error", "detail": str(e), "key_present": key_present}


@api_router.get("/test/score")
async def test_score():
    """Smoke-test sustenance calculator with fixed dummy inputs."""
    try:
        result = calculate_solar_potential(usable_area_sqm=50, city="Bengaluru")
        return {"status": "ok", "result": result}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@api_router.get("/test/email")
async def test_email():
    """Return Gmail env-var presence (safe — never logs the password)."""
    sender   = os.environ.get("GMAIL_SENDER")
    password = os.environ.get("GMAIL_APP_PASSWORD")
    admin    = os.environ.get("GMAIL_ADMIN_EMAIL")
    return {
        "gmail_sender_set":   bool(sender),
        "gmail_password_set": bool(password),
        "gmail_admin_set":    bool(admin),
        "gmail_sender_value": sender,   # not a secret — safe to expose
        "gmail_admin_value":  admin,
    }


@api_router.get("/test/email-send")
async def test_email_send():
    """Test both email functions end-to-end with dummy data.
    Always returns JSON — never raises so nginx never sees a 502."""
    try:
        admin_result = await asyncio.to_thread(
            send_admin_notification,
            first_name="Test",
            last_name="User",
            email="test@test.com",
            phone="+919999999999",
            phone_digits="9999999999",
            city="Mumbai",
            overall_score=67,
            readiness_tier="Action Ready",
            assessment_id="test-assessment-123",
        )

        report_result = await asyncio.to_thread(
            send_report_email,
            to_email=os.environ.get("GMAIL_ADMIN_EMAIL"),
            first_name="Test",
            assessment_id="test-assessment-123",
            overall_score=67,
            readiness_tier="Action Ready",
            solar_kwh=12034,
            rainwater_kl=180,
            food_kg=653,
            co2_tonnes=7.1,
        )

        return {
            "admin_notification":  "sent" if admin_result  else "failed",
            "user_report_email":   "sent" if report_result else "failed",
        }
    except BaseException as e:
        logger.error(
            f"test/email-send — unhandled exception "
            f"type={type(e).__name__} message={e}",
            exc_info=True,
        )
        return {
            "status": "error",
            "type":   type(e).__name__,
            "detail": str(e),
        }


# IMPORTANT: This must remain the last line before shutdown handler in the file.
# All routes must be registered on api_router BEFORE this call.
# Moving this line earlier will silently drop all routes defined after it.
app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
