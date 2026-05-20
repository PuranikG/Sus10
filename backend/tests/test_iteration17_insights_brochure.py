"""Iteration 17 — City Insights + Vendor Brochure backend regression tests.

Coverage:
- GET /api/insights/cities (public)
- GET /api/insights/city/{city} (public, case-insensitive, ?include_self_submitted)
- GET /api/insights/city/{unknown} (graceful no-data response, no 500)
- POST /api/vendor-offering/pdf (public, regression)
"""

import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---------- /api/insights/cities ----------
class TestInsightsCities:
    def test_cities_list_public(self, s):
        r = s.get(f"{API}/insights/cities", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "cities" in data
        assert isinstance(data["cities"], list)
        # Bengaluru should be present (>=1 approved building per problem statement)
        cities = {c["city"]: c["buildings_count"] for c in data["cities"]}
        assert "Bengaluru" in cities, f"Bengaluru missing from cities list: {list(cities.keys())}"
        assert cities["Bengaluru"] >= 1, f"Bengaluru should have >=1 buildings, got {cities['Bengaluru']}"


# ---------- /api/insights/city/{city} ----------
class TestInsightsCityBengaluru:
    def test_bengaluru_aggregate_shape(self, s):
        r = s.get(f"{API}/insights/city/Bengaluru", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["city"] == "Bengaluru"
        assert d["buildings_count"] >= 1
        # narrative is a markdown-like string containing **bold** markers
        assert isinstance(d.get("narrative"), str) and len(d["narrative"]) > 20
        assert "**" in d["narrative"], "narrative must contain **bold** markers"
        # narrative_chips
        assert isinstance(d.get("narrative_chips"), list) and len(d["narrative_chips"]) >= 1
        for chip in d["narrative_chips"]:
            assert "label" in chip and "value" in chip
        # totals object
        t = d["totals"]
        for key in [
            "annual_savings_inr", "co2_tonnes_per_year", "solar_kwh_per_year",
            "biogas_m3_per_year", "rainwater_kl_per_year", "plants_count",
            "food_yield_kg_per_year", "total_footprint_sqm", "total_usable_terrace_sqm",
        ]:
            assert key in t, f"missing totals key: {key}"
        # at least the solar number should be > 0 for a real city with approved buildings
        assert t["annual_savings_inr"] > 0, "annual_savings_inr should be > 0 for Bengaluru"
        assert t["solar_kwh_per_year"] > 0, "solar_kwh_per_year should be > 0 for Bengaluru"
        # by_type
        assert isinstance(d["by_type"], list)
        # top_buildings: up to 5
        assert isinstance(d["top_buildings"], list)
        assert len(d["top_buildings"]) <= 5

    def test_case_insensitive_lowercase(self, s):
        r = s.get(f"{API}/insights/city/bengaluru", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["buildings_count"] >= 1, "lowercase 'bengaluru' should match"

    def test_case_insensitive_uppercase(self, s):
        r = s.get(f"{API}/insights/city/BENGALURU", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["buildings_count"] >= 1, "UPPERCASE 'BENGALURU' should match"

    def test_nonexistent_city_no_500(self, s):
        r = s.get(f"{API}/insights/city/NonExistentCityXYZ", timeout=30)
        assert r.status_code == 200, f"Should not 500: {r.status_code} {r.text}"
        d = r.json()
        assert d["buildings_count"] == 0
        assert "narrative" in d
        assert isinstance(d["narrative"], str) and len(d["narrative"]) > 0

    def test_include_self_submitted_param(self, s):
        # baseline (approved only)
        r1 = s.get(f"{API}/insights/city/Bengaluru", timeout=60)
        # with self-submitted
        r2 = s.get(f"{API}/insights/city/Bengaluru?include_self_submitted=true", timeout=60)
        assert r1.status_code == 200 and r2.status_code == 200
        c1 = r1.json()["buildings_count"]
        c2 = r2.json()["buildings_count"]
        assert c2 >= c1, f"include_self_submitted=true ({c2}) should be >= baseline ({c1})"


# ---------- vendor-offering PDF regression ----------
class TestVendorOfferingPDF:
    def test_pdf_minimal_payload(self, s):
        r = s.post(
            f"{API}/vendor-offering/pdf",
            json={"brand_name": "TEST_GreenScape"},
            timeout=60,
        )
        assert r.status_code == 200, f"PDF gen failed: {r.status_code} {r.text[:300]}"
        ct = r.headers.get("content-type", "")
        assert "application/pdf" in ct, f"Bad content-type: {ct}"
        body = r.content
        assert body.startswith(b"%PDF"), "Body must start with %PDF magic bytes"
        assert len(body) > 5000, f"PDF suspiciously small: {len(body)} bytes"

    def test_pdf_full_payload(self, s):
        r = s.post(
            f"{API}/vendor-offering/pdf",
            json={
                "brand_name": "TEST_GreenScape Solutions",
                "tagline": "Integrated rooftop solutions",
                "contact_name": "Ramesh K",
                "phone": "+91-90000-00000",
                "email": "test@example.in",
                "website": "greenscape.in",
                "cities": "Bengaluru, Mysuru",
                "years_experience": 8,
                "certifications": "MNRE empanelled, ISO 9001",
                "badges": ["MNRE empanelled", "ISO 9001", "IGBC accredited"],
            },
            timeout=60,
        )
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")
        assert r.content.startswith(b"%PDF")
