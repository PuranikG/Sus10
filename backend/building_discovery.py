"""
Building Discovery Service
Fetches buildings from OpenStreetMap Overpass API + enriches with Google Places
No authentication required - runs entirely server-side
"""
import os
import json
import uuid
import asyncio
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# City bounding boxes (south, west, north, east)
CITY_BOUNDS = {
    "Gurugram": (28.38, 76.95, 28.55, 77.15),
    "Delhi": (28.40, 76.84, 28.88, 77.35),
    "Noida": (28.45, 77.28, 28.65, 77.55),
    "Faridabad": (28.35, 77.28, 28.52, 77.38),
    "Ghaziabad": (28.60, 77.35, 28.75, 77.55),
    "Mumbai": (18.87, 72.77, 19.27, 72.98),
    "Navi Mumbai": (18.92, 72.98, 19.15, 73.15),
    "Pune": (18.40, 73.72, 18.65, 74.00),
    "Amravati": (20.88, 77.72, 21.00, 77.82),
}

# OSM building types to our types
OSM_TYPE_MAPPING = {
    "office": "commercial",
    "commercial": "commercial",
    "retail": "mall",
    "industrial": "industrial",
    "warehouse": "industrial",
    "hospital": "hospital",
    "university": "college",
    "college": "college",
    "school": "college",
    "government": "government",
    "civic": "government",
    "public": "government",
    "hotel": "hotel",
    "apartments": "residential",
    "residential": "residential",
}

# Terrace ratios by building type
TERRACE_RATIOS = {
    "mall": 0.15,
    "hospital": 0.25,
    "college": 0.30,
    "government": 0.40,
    "hotel": 0.20,
    "it_park": 0.35,
    "commercial": 0.30,
    "industrial": 0.45,
    "residential": 0.25,
}

# Default AQI by city
CITY_DEFAULT_AQI = {
    "Gurugram": 156,
    "Delhi": 189,
    "Noida": 145,
    "Mumbai": 98,
    "Pune": 78,
    "Faridabad": 167,
    "Ghaziabad": 178,
    "Navi Mumbai": 85,
    "Amravati": 65,
}


async def fetch_buildings_from_osm(
    city: str,
    building_type: Optional[str] = None,
    min_area: float = 1000,
    limit: int = 50
) -> List[Dict]:
    """
    Fetch buildings from OpenStreetMap Overpass API
    """
    if city not in CITY_BOUNDS:
        raise ValueError(f"City {city} not supported. Available: {list(CITY_BOUNDS.keys())}")
    
    bounds = CITY_BOUNDS[city]
    bbox = f"{bounds[0]},{bounds[1]},{bounds[2]},{bounds[3]}"
    
    # Build Overpass query
    # Query for large buildings with specific types
    type_filter = ""
    if building_type:
        osm_types = [k for k, v in OSM_TYPE_MAPPING.items() if v == building_type]
        if osm_types:
            type_filter = "".join([f'["building"="{t}"]' for t in osm_types[:3]])
    
    query = f"""
    [out:json][timeout:60];
    (
      way["building"]{type_filter}({bbox});
      relation["building"]{type_filter}({bbox});
    );
    out body;
    >;
    out skel qt;
    """
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
                timeout=60.0
            )
            data = response.json()
        except Exception as e:
            logger.error(f"Overpass API error: {e}")
            return []
    
    # Parse response - extract buildings with their nodes
    nodes = {}
    buildings = []
    
    for element in data.get("elements", []):
        if element["type"] == "node":
            nodes[element["id"]] = (element["lat"], element["lon"])
        elif element["type"] in ["way", "relation"] and "tags" in element:
            tags = element.get("tags", {})
            if "building" in tags:
                buildings.append({
                    "id": element["id"],
                    "type": element["type"],
                    "tags": tags,
                    "nodes": element.get("nodes", []),
                })
    
    # Calculate centroids and areas
    result = []
    for building in buildings:
        if not building["nodes"]:
            continue
        
        # Get coordinates of nodes
        coords = [nodes.get(n) for n in building["nodes"] if n in nodes]
        coords = [c for c in coords if c]
        
        if len(coords) < 3:
            continue
        
        # Calculate centroid
        lat = sum(c[0] for c in coords) / len(coords)
        lng = sum(c[1] for c in coords) / len(coords)
        
        # Estimate area using shoelace formula (approximate)
        area = calculate_polygon_area(coords)
        
        if area < min_area:
            continue
        
        # Determine building type from OSM tags
        osm_building_type = building["tags"].get("building", "yes")
        our_type = OSM_TYPE_MAPPING.get(osm_building_type, "commercial")
        
        # Also check amenity tag
        amenity = building["tags"].get("amenity", "")
        if amenity in ["hospital", "clinic"]:
            our_type = "hospital"
        elif amenity in ["university", "college", "school"]:
            our_type = "college"
        elif amenity == "townhall":
            our_type = "government"
        
        result.append({
            "osm_id": building["id"],
            "latitude": lat,
            "longitude": lng,
            "area_in_meters": round(area, 2),
            "building_type": our_type,
            "osm_tags": building["tags"],
            "name": building["tags"].get("name", ""),
        })
    
    # Sort by area descending and limit
    result.sort(key=lambda x: x["area_in_meters"], reverse=True)
    return result[:limit]


def calculate_polygon_area(coords: List[tuple]) -> float:
    """
    Calculate approximate area of a polygon in square meters
    Using the Shoelace formula with lat/lng to meters conversion
    """
    if len(coords) < 3:
        return 0
    
    # Approximate meters per degree at Indian latitudes (~20-28°N)
    meters_per_deg_lat = 111000
    meters_per_deg_lng = 100000  # Approximate for Indian longitudes
    
    # Convert to approximate meters
    coords_m = [(c[0] * meters_per_deg_lat, c[1] * meters_per_deg_lng) for c in coords]
    
    # Shoelace formula
    n = len(coords_m)
    area = 0
    for i in range(n):
        j = (i + 1) % n
        area += coords_m[i][0] * coords_m[j][1]
        area -= coords_m[j][0] * coords_m[i][1]
    
    return abs(area) / 2


async def enrich_with_google_places(
    lat: float, 
    lng: float, 
    api_key: str,
    osm_name: str = ""
) -> Dict:
    """
    Enrich building data with Google Places API
    """
    result = {
        "name": osm_name or None,
        "address": None,
        "place_id": None,
        "google_types": [],
        "city": None,
        "pincode": None,
    }
    
    if not api_key:
        return result
    
    async with httpx.AsyncClient() as client:
        # Use Places Nearby Search
        url = "https://places.googleapis.com/v1/places:searchNearby"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.types,places.id,places.addressComponents"
        }
        payload = {
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": 100.0
                }
            },
            "maxResultCount": 5
        }
        
        try:
            response = await client.post(url, json=payload, headers=headers, timeout=10.0)
            data = response.json()
            
            if "places" in data and len(data["places"]) > 0:
                # Find best match (prefer named places)
                place = data["places"][0]
                for p in data["places"]:
                    if p.get("displayName", {}).get("text"):
                        place = p
                        break
                
                result["name"] = place.get("displayName", {}).get("text") or osm_name
                result["address"] = place.get("formattedAddress", "")
                result["place_id"] = place.get("id", "")
                result["google_types"] = place.get("types", [])
                
                # Extract city and pincode
                for component in place.get("addressComponents", []):
                    types = component.get("types", [])
                    if "locality" in types:
                        result["city"] = component.get("longText", "")
                    elif "postal_code" in types:
                        result["pincode"] = component.get("longText", "")
                        
        except Exception as e:
            logger.error(f"Google Places API error: {e}")
    
    return result


async def discover_and_import_buildings(
    city: str,
    building_type: Optional[str] = None,
    min_area: float = 1000,
    limit: int = 20,
    google_api_key: str = "",
    db = None,
    admin_user_id: str = None
) -> Dict:
    """
    Full pipeline: Discover from OSM → Enrich with Google → Import to DB
    """
    results = {
        "city": city,
        "building_type": building_type,
        "discovered": 0,
        "imported": 0,
        "skipped": 0,
        "failed": 0,
        "buildings": []
    }
    
    # Step 1: Fetch from OpenStreetMap
    logger.info(f"Fetching buildings from OSM for {city}...")
    osm_buildings = await fetch_buildings_from_osm(city, building_type, min_area, limit)
    results["discovered"] = len(osm_buildings)
    
    if not osm_buildings:
        return results
    
    # Step 2: Enrich each building with Google Places
    for osm_building in osm_buildings:
        try:
            # Enrich with Google Places
            enriched = await enrich_with_google_places(
                osm_building["latitude"],
                osm_building["longitude"],
                google_api_key,
                osm_building.get("name", "")
            )
            
            # Determine final building type
            final_type = osm_building["building_type"]
            
            # Google types can override OSM type
            google_type_mapping = {
                "shopping_mall": "mall",
                "hospital": "hospital",
                "university": "college",
                "school": "college",
                "local_government_office": "government",
                "lodging": "hotel",
            }
            for gtype in enriched.get("google_types", []):
                if gtype in google_type_mapping:
                    final_type = google_type_mapping[gtype]
                    break
            
            # Calculate terrace area
            footprint = osm_building["area_in_meters"]
            terrace_ratio = TERRACE_RATIOS.get(final_type, 0.25)
            terrace_area = round(footprint * terrace_ratio, 2)
            
            # Get city (prefer detected, fallback to input)
            detected_city = enriched.get("city") or city
            
            # Create building document
            building_id = f"bld_{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc).isoformat()
            
            building_doc = {
                "building_id": building_id,
                "address": enriched.get("name") or f"Building at {osm_building['latitude']:.4f}, {osm_building['longitude']:.4f}",
                "city": detected_city,
                "pincode": enriched.get("pincode") or "000000",
                "latitude": osm_building["latitude"],
                "longitude": osm_building["longitude"],
                "building_type": final_type,
                "building_footprint_area": footprint,
                "usable_terrace_area": terrace_area,
                "current_aqi": CITY_DEFAULT_AQI.get(detected_city, 100),
                "data_quality_score": 75 if enriched.get("name") else 60,
                "data_source": "openstreetmap",
                "osm_id": osm_building.get("osm_id"),
                "google_place_id": enriched.get("place_id"),
                "google_types": enriched.get("google_types", []),
                "is_approved": False,
                "curated_by_admin_id": admin_user_id,
                "created_at": now,
                "updated_at": now,
            }
            
            # Check for duplicates
            if db is not None:
                existing = await db.buildings.find_one({
                    "$or": [
                        {"osm_id": osm_building.get("osm_id")},
                        {
                            "latitude": {"$gte": osm_building["latitude"] - 0.0001, "$lte": osm_building["latitude"] + 0.0001},
                            "longitude": {"$gte": osm_building["longitude"] - 0.0001, "$lte": osm_building["longitude"] + 0.0001}
                        }
                    ]
                })
                
                if existing:
                    results["skipped"] += 1
                    continue
                
                # Insert into database
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
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.5)
            
        except Exception as e:
            logger.error(f"Error processing building: {e}")
            results["failed"] += 1
    
    return results
