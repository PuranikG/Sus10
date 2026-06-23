#!/usr/bin/env python3
"""
Sus10 AI — Smoke test suite
Run against any deployed environment:
  python scripts/smoke_test.py https://sus10-preview.preview.emergentagent.com
"""
import sys
import json
import requests
from datetime import datetime

BASE_URL = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8001"
API = f"{BASE_URL}/api"

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"

results = []

def check(name, expr, detail=""):
    ok = bool(expr)
    tag = PASS if ok else FAIL
    line = f"  [{tag}] {name}" + (f" — {detail}" if detail else "")
    print(line)
    results.append((ok, name))
    return ok

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def post(path, payload):
    r = requests.post(f"{API}{path}", json=payload, timeout=30)
    return r.status_code, r.json() if r.content else {}

def get(path):
    r = requests.get(f"{API}{path}", timeout=30)
    return r.status_code, r.json() if r.content else {}


# ──────────────────────────────────────────────────────────────────────────────
# T01 — Health check
# ──────────────────────────────────────────────────────────────────────────────
section("T01 — Health")
status, body = get("/health")
check("GET /api/health returns 200", status == 200)
check("status field is ok", body.get("status") == "ok", body.get("status"))


# ──────────────────────────────────────────────────────────────────────────────
# T02 — Calculator config loads
# ──────────────────────────────────────────────────────────────────────────────
section("T02 — Calculator config")
status, body = get("/calculator/config")
check("GET /api/calculator/config returns 200", status == 200)
check("config has pages", isinstance(body.get("pages"), list) and len(body["pages"]) > 0)


# ──────────────────────────────────────────────────────────────────────────────
# T03 — Plant search
# ──────────────────────────────────────────────────────────────────────────────
section("T03 — Plant search (public)")
status, body = get("/plants/search?limit=50&offset=0")
check("GET /api/plants/search returns 200", status == 200)
check("total >= 290", body.get("total", 0) >= 290, f"got {body.get('total')}")
check("returns plants array", isinstance(body.get("plants"), list))
check("response includes offset + limit", "offset" in body and "limit" in body)

status, body = get("/plants/search?limit=25&offset=25")
check("pagination offset=25 works", status == 200)
check("returns up to 25 plants", len(body.get("plants", [])) <= 25)


# ──────────────────────────────────────────────────────────────────────────────
# T04 — Plant search filters
# ──────────────────────────────────────────────────────────────────────────────
section("T04 — Plant search filters")
status, body = get("/plants/search?category=annual_vegetable")
check("category filter works", status == 200)
check("all returned are annual_vegetable",
      all(p["plant_category"] == "annual_vegetable" for p in body.get("plants", [])))

status, body = get("/plants/search?high_rise=true")
check("high_rise filter works", status == 200)
check("all returned are high_rise_suitable",
      all(p.get("high_rise_suitable") for p in body.get("plants", [])))


# ──────────────────────────────────────────────────────────────────────────────
# T05 — Quick-potential: Mumbai residential (1000 sqft baseline)
#
# 1000 sqft = 92.9 sqm baseline — easy to verify calculations manually:
# Solar: 92.9 × 0.65 × 0.20 = 8.39 kWp (expected)
# Plants: 1000 × 0.49 = 490 plants (expected)
# Rainwater Mumbai: 92.9 × 2400 × 0.85 × 0.95 = 180,200L = 180 kL (expected)
# ──────────────────────────────────────────────────────────────────────────────
section("T05 — Quick-potential: Mumbai residential (Andheri East, 1000 sqft)")
status, body = post("/calculate/quick-potential", {
    "address":                      "Maheshwari Nagar, MIDC, Andheri East, Mumbai, Maharashtra, India",
    "city":                         "mumbai",
    "state":                        "maharashtra",
    "roof_area_sqm":                92.9,
    "floors":                       5,
    "families":                     20,
    "family_size":                  4,
    "building_type":                "residential",
    "monthly_electricity_bill_inr": 2000,
    "monthly_gas_bill_inr":         500,
    "name":                         "Gaurav Puranik",
    "email":                        "gp@sus10.ai",
})
check("POST /api/calculate/quick-potential returns 200", status == 200)
check("response has building_id", bool(body.get("building_id")))
check("response has redirect_to", bool(body.get("redirect_to")))
T05_BUILDING_ID = body.get("building_id", "")
check("building_id starts with bld_", T05_BUILDING_ID.startswith("bld_"), T05_BUILDING_ID)


# ──────────────────────────────────────────────────────────────────────────────
# T06 — Building potential for T05 building (solar_kwp and plants_count checks)
# ──────────────────────────────────────────────────────────────────────────────
section("T06 — Building potential assertions (1000 sqft Mumbai)")
if T05_BUILDING_ID:
    status, body = get(f"/buildings/{T05_BUILDING_ID}/potential")
    check("GET /api/buildings/{id}/potential returns 200", status == 200)
    check("response has widgets", isinstance(body.get("widgets"), list))
    check("response has pillars", isinstance(body.get("pillars"), dict))

    pillars  = body.get("pillars", {})
    solar    = pillars.get("solar", {})
    planting = pillars.get("plantation", {})

    solar_kwp    = solar.get("installed_capacity_kwp", 0)
    plants_count = planting.get("total_plants_count", 0)

    check(
        "solar_kwp is between 8.0 and 9.0 (expected ~8.39 for 1000 sqft Mumbai)",
        8.0 <= solar_kwp <= 9.0,
        f"got {solar_kwp} kWp",
    )
    check(
        "plants_count is between 450 and 530 (expected ~490 for 1000 sqft)",
        450 <= plants_count <= 530,
        f"got {plants_count} plants",
    )
else:
    check("T06 skipped — T05 building_id missing", False)


# ──────────────────────────────────────────────────────────────────────────────
# T07 — Quick-potential: Bangalore residential (Koramangala, 1000 sqft)
# ──────────────────────────────────────────────────────────────────────────────
section("T07 — Quick-potential: Bangalore residential (Koramangala, 1000 sqft)")
status, body = post("/calculate/quick-potential", {
    "address":                      "Maheshwari Nagar, Koramangala, Bangalore, Karnataka, India",
    "city":                         "bangalore",
    "state":                        "karnataka",
    "roof_area_sqm":                92.9,
    "floors":                       5,
    "families":                     20,
    "family_size":                  4,
    "building_type":                "residential",
    "monthly_electricity_bill_inr": 2000,
    "monthly_gas_bill_inr":         500,
    "name":                         "Gaurav Puranik",
    "email":                        "vgpuranik@gmail.com",
})
check("POST /api/calculate/quick-potential returns 200", status == 200)
check("response has building_id", bool(body.get("building_id")))
T07_BUILDING_ID = body.get("building_id", "")
check("building_id starts with bld_", T07_BUILDING_ID.startswith("bld_"), T07_BUILDING_ID)


# ──────────────────────────────────────────────────────────────────────────────
# T08 — Building potential for T07 (Bangalore city parameter used correctly)
# ──────────────────────────────────────────────────────────────────────────────
section("T08 — Building potential: Bangalore city check")
if T07_BUILDING_ID:
    status, body = get(f"/buildings/{T07_BUILDING_ID}/potential")
    check("GET /api/buildings/{id}/potential returns 200", status == 200)
    check("response has pillars", isinstance(body.get("pillars"), dict))
    check("building city is bangalore",
          (body.get("building") or {}).get("city", "").lower() == "bangalore",
          (body.get("building") or {}).get("city"))
else:
    check("T08 skipped — T07 building_id missing", False)


# ──────────────────────────────────────────────────────────────────────────────
# T09 — Quick-potential: Bangalore commercial (Whitefield, 1000 sqft)
# ──────────────────────────────────────────────────────────────────────────────
section("T09 — Quick-potential: Bangalore commercial (Whitefield, 1000 sqft)")
status, body = post("/calculate/quick-potential", {
    "address":                      "Maheshwari Nagar, Whitefield, Bangalore, Karnataka, India",
    "city":                         "bangalore",
    "state":                        "karnataka",
    "roof_area_sqm":                92.9,
    "floors":                       5,
    "families":                     0,
    "family_size":                  1,
    "building_type":                "commercial",
    "monthly_electricity_bill_inr": 15000,
    "monthly_gas_bill_inr":         0,
    "name":                         "Gaurav Puranik",
    "email":                        "gp@sus10.ai",
})
check("POST /api/calculate/quick-potential returns 200", status == 200)
check("response has building_id", bool(body.get("building_id")))
T09_BUILDING_ID = body.get("building_id", "")
check("building_id starts with bld_", T09_BUILDING_ID.startswith("bld_"), T09_BUILDING_ID)

if T09_BUILDING_ID:
    status, body = get(f"/buildings/{T09_BUILDING_ID}/potential")
    check("GET /api/buildings/{id}/potential returns 200", status == 200)
    check("response has pillars", isinstance(body.get("pillars"), dict))


# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────
section("Summary")
passed = sum(1 for ok, _ in results if ok)
failed = sum(1 for ok, _ in results if not ok)
total  = len(results)
print(f"\n  {passed}/{total} passed", end="")
if failed:
    print(f"  ({failed} failed)")
    print("\n  Failed checks:")
    for ok, name in results:
        if not ok:
            print(f"    • {name}")
else:
    print("  — all green")
print()

sys.exit(0 if failed == 0 else 1)
