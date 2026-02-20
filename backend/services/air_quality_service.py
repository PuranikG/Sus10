"""
Air Quality Service using Open-Meteo API
Free, no API key required, global coverage including India
"""
import httpx
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Open-Meteo Air Quality API
OPEN_METEO_AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

# AQI Health levels based on US AQI standard
AQI_LEVELS = [
    {"max_aqi": 50, "level": "Good", "color": "#00e400", "health_implications": "Air quality is satisfactory"},
    {"max_aqi": 100, "level": "Moderate", "color": "#ffff00", "health_implications": "Acceptable, sensitive groups may be affected"},
    {"max_aqi": 150, "level": "Unhealthy for Sensitive Groups", "color": "#ff7e00", "health_implications": "Sensitive groups may experience health effects"},
    {"max_aqi": 200, "level": "Unhealthy", "color": "#ff0000", "health_implications": "Everyone may begin to experience health effects"},
    {"max_aqi": 300, "level": "Very Unhealthy", "color": "#8f3f97", "health_implications": "Health alert: risk for everyone"},
    {"max_aqi": 500, "level": "Hazardous", "color": "#7e0023", "health_implications": "Health warning of emergency conditions"},
]


def get_aqi_level(aqi: int) -> Dict[str, Any]:
    """Get AQI level information from AQI value"""
    for level_info in AQI_LEVELS:
        if aqi <= level_info["max_aqi"]:
            return {
                "level": level_info["level"],
                "color": level_info["color"],
                "health_implications": level_info["health_implications"]
            }
    return {
        "level": "Hazardous",
        "color": "#7e0023",
        "health_implications": "Health warning of emergency conditions"
    }


class AirQualityService:
    """Service for fetching air quality data from Open-Meteo API"""
    
    def __init__(self):
        self.timeout = httpx.Timeout(10.0, connect=5.0)
    
    async def get_air_quality(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """
        Get current air quality data for a location
        Uses Open-Meteo API (free, no key required)
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "pm10,pm2_5,us_aqi,us_aqi_pm2_5,us_aqi_pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
            "timezone": "auto"
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(OPEN_METEO_AQ_URL, params=params)
                
                if response.status_code != 200:
                    logger.warning(f"Open-Meteo API returned {response.status_code}")
                    return None
                
                data = response.json()
                current = data.get("current", {})
                
                if not current:
                    return None
                
                # Get main AQI value (US AQI)
                aqi_value = current.get("us_aqi")
                pm25_value = current.get("pm2_5")
                pm10_value = current.get("pm10")
                
                if aqi_value is None:
                    return None
                
                # Get AQI level info
                level_info = get_aqi_level(int(aqi_value))
                
                return {
                    "aqi_value": int(aqi_value),
                    "aqi_level": level_info["level"],
                    "aqi_color": level_info["color"],
                    "health_implications": level_info["health_implications"],
                    "pm25_value": round(pm25_value, 1) if pm25_value else None,
                    "pm10_value": round(pm10_value, 1) if pm10_value else None,
                    "pollutants": {
                        "pm2_5": round(pm25_value, 1) if pm25_value else None,
                        "pm10": round(pm10_value, 1) if pm10_value else None,
                        "co": round(current.get("carbon_monoxide", 0), 1) if current.get("carbon_monoxide") else None,
                        "no2": round(current.get("nitrogen_dioxide", 0), 1) if current.get("nitrogen_dioxide") else None,
                        "so2": round(current.get("sulphur_dioxide", 0), 1) if current.get("sulphur_dioxide") else None,
                        "o3": round(current.get("ozone", 0), 1) if current.get("ozone") else None,
                    },
                    "measured_at": current.get("time"),
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                    "timezone": data.get("timezone"),
                    "data_source": "Open-Meteo"
                }
                
        except httpx.TimeoutException:
            logger.warning("Open-Meteo API timeout")
            return None
        except Exception as e:
            logger.error(f"Error fetching air quality: {e}")
            return None
    
    async def get_air_quality_for_city(self, city: str) -> Optional[Dict[str, Any]]:
        """
        Get air quality for a city by name
        Uses predefined city center coordinates
        """
        # City coordinates (center points)
        city_coords = {
            "Delhi": (28.6139, 77.2090),
            "Mumbai": (19.0760, 72.8777),
            "Bangalore": (12.9716, 77.5946),
            "Bengaluru": (12.9716, 77.5946),
            "Gurugram": (28.4595, 77.0266),
            "Gurgaon": (28.4595, 77.0266),
            "Noida": (28.5355, 77.3910),
            "Pune": (18.5204, 73.8567),
            "Hyderabad": (17.3850, 78.4867),
            "Chennai": (13.0827, 80.2707),
            "Kolkata": (22.5726, 88.3639),
            "Faridabad": (28.4089, 77.3178),
            "Ghaziabad": (28.6692, 77.4538),
            "Navi Mumbai": (19.0330, 73.0297),
            "Amravati": (20.9320, 77.7523),
            "Jaipur": (26.9124, 75.7873),
            "Lucknow": (26.8467, 80.9462),
            "Ahmedabad": (23.0225, 72.5714),
        }
        
        # Normalize city name
        city_normalized = city.strip().title()
        
        coords = city_coords.get(city_normalized)
        if not coords:
            logger.warning(f"City {city} not in predefined list")
            return None
        
        result = await self.get_air_quality(coords[0], coords[1])
        if result:
            result["city"] = city_normalized
        return result


# Singleton instance
_air_quality_service: Optional[AirQualityService] = None

def get_air_quality_service() -> AirQualityService:
    """Get or create air quality service instance"""
    global _air_quality_service
    if _air_quality_service is None:
        _air_quality_service = AirQualityService()
    return _air_quality_service
