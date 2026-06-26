"""
Plant database bulk update operations with pagination and audit logging.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase


class PlantBulkAction:

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def list_plants(
        self,
        category: str = None,
        plant_type: str = None,
        climate_zone: str = None,
        active: bool = None,
        limit: int = 25,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        List plants with filters and pagination.

        IMPORTANT: limit=25 default (per page)
        Returns current_page, total_pages for UI pagination
        """
        query = {}

        if category:
            query["plant_category"] = category
        if plant_type:
            query["plant_type"] = plant_type
        if climate_zone:
            query["climate_zones"] = climate_zone
        if active is not None:
            query["active"] = active

        total = await self.db.plants.count_documents(query)

        cursor = (
            self.db.plants.find(query, {"_id": 0})
            .sort([("plant_category", 1), ("terrace_suitability_score", -1)])
            .skip(offset)
            .limit(limit)
        )
        plants = await cursor.to_list(limit)

        total_pages = (total + limit - 1) // limit

        return {
            "plants": plants,
            "total": total,
            "limit": limit,
            "offset": offset,
            "current_page": (offset // limit) + 1,
            "total_pages": total_pages,
        }

    async def bulk_update(
        self,
        filter_query: Dict[str, Any],
        field_to_update: str,
        new_value: Any,
        updated_by: str,
    ) -> Dict[str, Any]:
        """
        Bulk update field for all plants matching filter.
        """
        forbidden = ["plant_id", "_id", "created_at"]
        if field_to_update in forbidden:
            raise ValueError(f"Cannot bulk update {field_to_update}")

        result = await self.db.plants.update_many(
            filter_query,
            {
                "$set": {
                    field_to_update: new_value,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            }
        )

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "bulk_update",
            "filter": filter_query,
            "field": field_to_update,
            "value": new_value,
            "count": result.modified_count,
            "updated_by": updated_by,
        }

        await self.db.plant_bulk_logs.insert_one(log_entry)

        return {
            "updated_count": result.modified_count,
            "timestamp": log_entry["timestamp"],
            "filter": filter_query,
            "field": field_to_update,
            "value": new_value,
            "updated_by": updated_by,
        }

    async def get_bulk_logs(self, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get audit trail with pagination."""
        total = await self.db.plant_bulk_logs.count_documents({})

        cursor = (
            self.db.plant_bulk_logs.find({}, {"_id": 0})
            .sort("timestamp", -1)
            .skip(offset)
            .limit(limit)
        )
        logs = await cursor.to_list(limit)

        total_pages = (total + limit - 1) // limit

        return {
            "logs": logs,
            "total": total,
            "limit": limit,
            "offset": offset,
            "current_page": (offset // limit) + 1,
            "total_pages": total_pages,
        }
