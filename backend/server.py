from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
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
    
    # Enrich with solution type info
    for rec in recommendations:
        solution_type = await db.solution_types.find_one(
            {"solution_type_id": rec["solution_type_id"]}, {"_id": 0}
        )
        if solution_type:
            rec["solution_type"] = solution_type
    
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
    limit: int = Query(default=100, le=500)
):
    """Admin: List all buildings with filters"""
    await require_admin(request)
    
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if ward:
        query["ward"] = ward
    if is_approved is not None:
        query["is_approved"] = is_approved
    
    buildings = await db.buildings.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return buildings

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
    
    return {"building_id": building_id, "is_approved": True}

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
    
    google_api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    
    logger.info(f"Admin {user.email} starting building discovery for {city}")
    
    try:
        from building_discovery import discover_and_import_buildings
        
        results = await discover_and_import_buildings(
            city=city,
            building_type=building_type,
            min_area=min_area,
            limit=limit,
            google_api_key=google_api_key,
            db=db,
            admin_user_id=user.user_id
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
    
    if "_id" in pledge_doc: del pledge_doc["_id"]
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
    if "_id" in post_doc: del post_doc["_id"]
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
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
