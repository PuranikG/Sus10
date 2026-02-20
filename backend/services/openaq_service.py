"""
OpenAQ Air Quality Service
Fetches real-time air quality data from OpenAQ API
No API key required for basic usage (free tier)
"""
import httpx
import logging
import asyncio
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# OpenAQ API base URL (v3)
OPENAQ_BASE_URL = "https://api.openaq.org/v3"

# AQI Health levels based on PM2.5 (US EPA standard)
AQI_LEVELS = [
    {"max_pm25": 12, "level": "Good", "color": "#00e400", "aqi_max": 50},
    {"max_pm25": 35.4, "level": "Moderate", "color": "#ffff00", "aqi_max": 100},
    {"max_pm25": 55.4, "level": "Unhealthy for Sensitive Groups", "color": "#ff7e00", "aqi_max": 150},
    {"max_pm25": 150.4, "level": "Unhealthy", "color": "#ff0000", "aqi_max": 200},
    {"max_pm25": 250.4, "level": "Very Unhealthy", "color": "#8f3f97", "aqi_max": 300},
    {"max_pm25": 500, "level": "Hazardous", "color": "#7e0023", "aqi_max": 500},
]


def pm25_to_aqi(pm25: float) -> Tuple[int, str, str]:
    """
    Convert PM2.5 concentration to AQI value
    Returns: (aqi_value, level, color)
    """
    if pm25 <= 0:
        return (0, "Good", "#00e400")
    
    breakpoints = [
        (0, 12, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 500.4, 301, 500),
    ]
    
    for bp_lo, bp_hi, aqi_lo, aqi_hi in breakpoints:
        if pm25 <= bp_hi:
            aqi = ((aqi_hi - aqi_lo) / (bp_hi - bp_lo)) * (pm25 - bp_lo) + aqi_lo
            
            # Determine level and color
            for level_info in AQI_LEVELS:
                if aqi <= level_info["aqi_max"]:
                    return (round(aqi), level_info["level"], level_info["color"])
            
            return (round(aqi), "Hazardous", "#7e0023")
    
    return (500, "Hazardous", "#7e0023")


class OpenAQService:
    """Service for interacting with OpenAQ API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.base_url = OPENAQ_BASE_URL
        self.api_key = api_key
        self.timeout = httpx.Timeout(15.0, connect=10.0)
    
    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3
    ) -> Optional[Dict[str, Any]]:
        """Make async HTTP request to OpenAQ API"""
        headers = {
            "Accept": "application/json",
            "User-Agent": "Sus10AI/1.0"
        }
        
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, params=params, headers=headers)
                    
                    # Log rate limit info
                    remaining = response.headers.get("x-ratelimit-remaining")
                    if remaining:
                        logger.debug(f"OpenAQ API calls remaining: {remaining}")
                    
                    if response.status_code == 429:
                        # Rate limited - wait and retry
                        wait_time = 2 ** attempt
                        logger.warning(f"OpenAQ rate limited, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    if response.status_code == 200:
                        return response.json()
                    else:
                        logger.warning(f"OpenAQ API returned {response.status_code}: {response.text[:200]}")
                        return None
                        
            except httpx.TimeoutException:
                logger.warning(f"OpenAQ request timeout (attempt {attempt + 1}/{max_retries})")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"OpenAQ request error: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
        
        return None
    
    async def get_locations_near_coordinates(
        self,
        latitude: float,
        longitude: float,
        radius: int = 25000,  # meters, max 25km
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get air quality monitoring locations near coordinates
        """
        params = {
            "coordinates": f"{latitude},{longitude}",
            "radius": min(radius, 25000),
            "limit": limit,
            "order_by": "distance"
        }
        
        data = await self._make_request("/locations", params=params)
        
        if data and "results" in data:
            return data["results"]
        return []
    
    async def get_latest_measurements(
        self,
        latitude: float,
        longitude: float,
        radius: int = 25000
    ) -> Optional[Dict[str, Any]]:
        """
        Get the latest air quality measurements near a location
        Returns the closest station with PM2.5 data
        """
        # Get nearby locations
        locations = await self.get_locations_near_coordinates(
            latitude, longitude, radius
        )
        
        if not locations:
            logger.info(f"No OpenAQ stations found near {latitude}, {longitude}")
            return None
        
        # Find a location with PM2.5 measurements
        for location in locations:
            location_id = location.get("id")
            
            # Check if location has PM2.5
            parameters = location.get("parameters", [])
            has_pm25 = any(
                p.get("name", "").lower() in ["pm25", "pm2.5"] 
                for p in parameters
            )
            
            if not has_pm25:
                continue
            
            # Get latest measurements for this location
            latest_data = await self._make_request(f"/locations/{location_id}/latest")
            
            if latest_data and "results" in latest_data:
                results = latest_data["results"]
                
                # Find PM2.5 measurement
                for measurement in results:
                    param = measurement.get("parameter", {})
                    param_name = param.get("name", "").lower() if isinstance(param, dict) else str(param).lower()
                    
                    if "pm25" in param_name or "pm2.5" in param_name:
                        value = measurement.get("value")
                        if value is not None and value >= 0:
                            aqi, level, color = pm25_to_aqi(value)
                            
                            return {
                                "location_name": location.get("name", "Unknown"),
                                "location_id": location_id,
                                "latitude": location.get("coordinates", {}).get("latitude"),
                                "longitude": location.get("coordinates", {}).get("longitude"),
                                "distance_km": round(location.get("distance", 0) / 1000, 1),
                                "pm25_value": round(value, 1),
                                "aqi_value": aqi,
                                "aqi_level": level,
                                "aqi_color": color,
                                "measured_at": measurement.get("datetime", {}).get("utc"),
                                "data_source": "OpenAQ"
                            }
        
        logger.info(f"No PM2.5 data found near {latitude}, {longitude}")
        return None
    
    async def get_aqi_for_city(self, city: str) -> Optional[Dict[str, Any]]:
        """
        Get AQI for a city by name
        Uses city center coordinates
        """
        # City coordinates (center points)
        city_coords = {
            "Delhi": (28.6139, 77.2090),
            "Mumbai": (19.0760, 72.8777),
            "Bangalore": (12.9716, 77.5946),
            "Gurugram": (28.4595, 77.0266),
            "Noida": (28.5355, 77.3910),
            "Pune": (18.5204, 73.8567),
            "Hyderabad": (17.3850, 78.4867),
            "Chennai": (13.0827, 80.2707),
            "Kolkata": (22.5726, 88.3639),
            "Faridabad": (28.4089, 77.3178),
            "Ghaziabad": (28.6692, 77.4538),
            "Navi Mumbai": (19.0330, 73.0297),
            "Amravati": (20.9320, 77.7523),
        }
        
        # Normalize city name
        city_normalized = city.strip().title()
        
        if city_normalized not in city_coords:
            logger.warning(f"City {city} not in predefined list")
            return None
        
        lat, lng = city_coords[city_normalized]
        return await self.get_latest_measurements(lat, lng)


# Singleton instance
_openaq_service: Optional[OpenAQService] = None

def get_openaq_service(api_key: Optional[str] = None) -> OpenAQService:
    """Get or create OpenAQ service instance"""
    global _openaq_service
    if _openaq_service is None:
        _openaq_service = OpenAQService(api_key)
    return _openaq_service
