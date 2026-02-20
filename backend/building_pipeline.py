"""
Building Data Pipeline: Auto-enrichment from Open Buildings + Google Places
"""
import os
import json
import uuid
import asyncio
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "sustainability_db")

# Google Places API
GOOGLE_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

# Building type mapping from Google Places types
GOOGLE_TYPE_MAPPING = {
    # Malls
    "shopping_mall": "mall",
    "department_store": "mall",
    
    # Hospitals
    "hospital": "hospital",
    "doctor": "hospital",
    "health": "hospital",
    "medical_center": "hospital",
    
    # Education
    "university": "college",
    "school": "college",
    "secondary_school": "college",
    "primary_school": "college",
    
    # Government
    "local_government_office": "government",
    "city_hall": "government",
    "courthouse": "government",
    "post_office": "government",
    
    # Hotels
    "lodging": "hotel",
    "hotel": "hotel",
    "resort": "hotel",
    
    # IT Parks / Commercial
    "office": "commercial",
    "corporate_office": "it_park",
    "coworking_space": "it_park",
    
    # Industrial
    "factory": "industrial",
    "warehouse": "industrial",
    "industrial": "industrial",
    
    # Residential
    "apartment": "residential",
    "apartment_complex": "residential",
    "condominium": "residential",
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

# Default AQI by city (placeholder until real API integration)
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


async def reverse_geocode_and_enrich(lat: float, lng: float, api_key: str) -> Dict:
    """
    Use Google Places API to get building info from coordinates
    """
    result = {
        "name": None,
        "address": None,
        "building_type": "commercial",  # default
        "place_id": None,
        "google_types": [],
        "city": None,
        "pincode": None,
    }
    
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
                    "radius": 50.0  # 50 meters radius
                }
            },
            "maxResultCount": 5
        }
        
        try:
            response = await client.post(url, json=payload, headers=headers, timeout=10.0)
            data = response.json()
            
            if "places" in data and len(data["places"]) > 0:
                place = data["places"][0]
                
                result["name"] = place.get("displayName", {}).get("text", "Unknown Building")
                result["address"] = place.get("formattedAddress", "")
                result["place_id"] = place.get("id", "")
                result["google_types"] = place.get("types", [])
                
                # Extract city and pincode from address components
                for component in place.get("addressComponents", []):
                    types = component.get("types", [])
                    if "locality" in types:
                        result["city"] = component.get("longText", "")
                    elif "postal_code" in types:
                        result["pincode"] = component.get("longText", "")
                
                # Map Google types to our building type
                for gtype in result["google_types"]:
                    if gtype in GOOGLE_TYPE_MAPPING:
                        result["building_type"] = GOOGLE_TYPE_MAPPING[gtype]
                        break
                        
        except Exception as e:
            print(f"Places API error for ({lat}, {lng}): {e}")
    
    return result


def estimate_terrace_area(footprint_area: float, building_type: str) -> float:
    """
    Estimate usable terrace area based on building type
    """
    ratio = TERRACE_RATIOS.get(building_type, 0.25)
    return round(footprint_area * ratio, 2)


def detect_city_from_coords(lat: float, lng: float) -> str:
    """
    Detect city from coordinates using bounding boxes
    """
    city_bounds = {
        "Gurugram": {"lat_min": 28.38, "lat_max": 28.55, "lng_min": 76.95, "lng_max": 77.15},
        "Delhi": {"lat_min": 28.40, "lat_max": 28.88, "lng_min": 76.84, "lng_max": 77.35},
        "Noida": {"lat_min": 28.45, "lat_max": 28.65, "lng_min": 77.28, "lng_max": 77.55},
        "Faridabad": {"lat_min": 28.35, "lat_max": 28.52, "lng_min": 77.28, "lng_max": 77.38},
        "Ghaziabad": {"lat_min": 28.60, "lat_max": 28.75, "lng_min": 77.35, "lng_max": 77.55},
        "Mumbai": {"lat_min": 18.87, "lat_max": 19.27, "lng_min": 72.77, "lng_max": 72.98},
        "Navi Mumbai": {"lat_min": 18.92, "lat_max": 19.15, "lng_min": 72.98, "lng_max": 73.15},
        "Pune": {"lat_min": 18.40, "lat_max": 18.65, "lng_min": 73.72, "lng_max": 74.00},
        "Amravati": {"lat_min": 20.88, "lat_max": 21.00, "lng_min": 77.72, "lng_max": 77.82},
    }
    
    for city, bounds in city_bounds.items():
        if (bounds["lat_min"] <= lat <= bounds["lat_max"] and 
            bounds["lng_min"] <= lng <= bounds["lng_max"]):
            return city
    
    return "Unknown"


async def process_building(building_data: Dict, api_key: str, db) -> Dict:
    """
    Process a single building: enrich with Places API and prepare for DB
    """
    lat = building_data.get("latitude") or building_data.get("lat")
    lng = building_data.get("longitude") or building_data.get("lng")
    footprint_area = building_data.get("area_in_meters") or building_data.get("footprint_area", 1000)
    confidence = building_data.get("confidence", 0.8)
    
    # Detect city from coordinates
    detected_city = detect_city_from_coords(lat, lng)
    
    # Enrich with Google Places API
    enriched = await reverse_geocode_and_enrich(lat, lng, api_key)
    
    # Use detected city if Places API didn't return one
    city = enriched["city"] or detected_city
    
    # Estimate terrace area
    terrace_area = estimate_terrace_area(footprint_area, enriched["building_type"])
    
    # Get default AQI for city
    default_aqi = CITY_DEFAULT_AQI.get(city, 100)
    
    # Calculate data quality score based on confidence and enrichment
    data_quality = min(95, int(confidence * 100) + (10 if enriched["name"] else 0))
    
    # Create building document
    building_id = f"bld_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    building_doc = {
        "building_id": building_id,
        "address": enriched["name"] or f"Building at {lat:.4f}, {lng:.4f}",
        "city": city,
        "pincode": enriched["pincode"] or "000000",
        "latitude": lat,
        "longitude": lng,
        "building_type": enriched["building_type"],
        "building_footprint_area": footprint_area,
        "usable_terrace_area": terrace_area,
        "current_aqi": default_aqi,
        "data_quality_score": data_quality,
        "data_source": "google_open_buildings",
        "google_place_id": enriched["place_id"],
        "google_types": enriched["google_types"],
        "confidence": confidence,
        "is_approved": False,
        "created_at": now,
        "updated_at": now,
    }
    
    return building_doc


async def import_buildings_from_bigquery_export(
    buildings_data: List[Dict],
    api_key: str,
    batch_size: int = 5,
    delay_between_batches: float = 1.0
) -> Dict:
    """
    Import buildings from BigQuery export JSON
    Processes in batches to avoid rate limiting
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    results = {
        "total": len(buildings_data),
        "imported": 0,
        "failed": 0,
        "buildings": []
    }
    
    # Process in batches
    for i in range(0, len(buildings_data), batch_size):
        batch = buildings_data[i:i + batch_size]
        
        for building_data in batch:
            try:
                building_doc = await process_building(building_data, api_key, db)
                
                # Check if building already exists at this location
                existing = await db.buildings.find_one({
                    "latitude": building_doc["latitude"],
                    "longitude": building_doc["longitude"]
                })
                
                if existing:
                    print(f"Skipping duplicate at ({building_doc['latitude']}, {building_doc['longitude']})")
                    continue
                
                # Insert into database
                await db.buildings.insert_one(building_doc)
                del building_doc["_id"]  # Remove MongoDB _id for response
                
                results["imported"] += 1
                results["buildings"].append({
                    "building_id": building_doc["building_id"],
                    "name": building_doc["address"],
                    "type": building_doc["building_type"],
                    "city": building_doc["city"],
                    "footprint": building_doc["building_footprint_area"],
                    "terrace": building_doc["usable_terrace_area"],
                })
                
                print(f"Imported: {building_doc['address']} ({building_doc['building_type']})")
                
            except Exception as e:
                print(f"Failed to process building: {e}")
                results["failed"] += 1
        
        # Delay between batches to avoid rate limiting
        if i + batch_size < len(buildings_data):
            await asyncio.sleep(delay_between_batches)
    
    client.close()
    return results


# Sample data for pilot (Gurugram large buildings from Open Buildings)
PILOT_BUILDINGS_GURUGRAM = [
    {"latitude": 28.4595, "longitude": 77.0726, "area_in_meters": 15000, "confidence": 0.92},  # DLF Cyber City area
    {"latitude": 28.4673, "longitude": 77.0631, "area_in_meters": 12000, "confidence": 0.89},  # Near Cyber Hub
    {"latitude": 28.4502, "longitude": 77.0716, "area_in_meters": 8500, "confidence": 0.91},   # Sector 24
    {"latitude": 28.4815, "longitude": 77.0893, "area_in_meters": 6000, "confidence": 0.88},   # Sector 29
    {"latitude": 28.4432, "longitude": 77.0523, "area_in_meters": 11000, "confidence": 0.90},  # Near Medanta
]


if __name__ == "__main__":
    # Test the pipeline with pilot data
    import asyncio
    
    async def test_pipeline():
        api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
        if not api_key:
            print("Please set GOOGLE_PLACES_API_KEY environment variable")
            return
        
        results = await import_buildings_from_bigquery_export(
            PILOT_BUILDINGS_GURUGRAM,
            api_key
        )
        print(f"\nResults: {json.dumps(results, indent=2)}")
    
    asyncio.run(test_pipeline())
