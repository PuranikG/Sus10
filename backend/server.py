from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File
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
    """Public read of intel notes so the Building Report can show warning badges."""
    bld = await db.buildings.find_one(
        {"building_id": building_id, "is_approved": True},
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
)
from services.gemini_rooftop_analyzer import analyze_rooftop

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
        narrative_parts.append(f"— while saving **{_fmt_inr(annual_savings)}** for the building owner.")
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
    return {"entries": entries, "total": total, "by_persona": by_persona, "limit": limit}


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
    # Estimate usable terrace as 80% of footprint (conservative)
    usable = round(payload.roof_area_sqm * 0.8, 2)
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

# Include router and CORS
app.include_router(api_router)

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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
