"""Iteration 15 backend tests.

Covers:
- POST /api/calculate/quick-potential (E6.1 homeowner calculator)
- GET  /api/buildings/{id}/potential narrative payload
- GET  /api/subsidies/match/{building_id} shape
- POST /api/admin/cms/seed-persona-teasers (admin-gated)
- POST /api/admin/subsidies/seed (admin-gated)
- Non-admin / unauth 401/403 protection on the two seed endpoints
"""

import os
import re
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sus10-preview.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = os.getenv("ADMIN_TEST_TOKEN", "iter15_test_session")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def admin_api():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ADMIN_TOKEN}",
    })
    return s


_test_building_ids: list[str] = []


@pytest.fixture(scope="session", autouse=True)
def _cleanup_test_buildings():
    yield
    if _test_building_ids:
        client = MongoClient(MONGO_URL)[DB_NAME]
        client.buildings.delete_many({"building_id": {"$in": _test_building_ids}})
        client.beta_waitlist.delete_many({"email": {"$regex": "^test_iter15_"}})


# --------- Module 1: POST /api/calculate/quick-potential ---------
class TestQuickCalc:
    def test_minimal_payload_creates_building(self, api, db):
        payload = {
            "address": "TEST_ITER15 12 Test Lane, Indiranagar",
            "city": "Bengaluru",
            "building_type": "residential",
            "roof_area_sqm": 120.0,
            "floors": 2,
            "family_size": 4,
        }
        r = api.post(f"{BASE_URL}/api/calculate/quick-potential", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "building_id" in data and data["building_id"].startswith("bld_")
        assert data["redirect_to"] == f"/buildings/{data['building_id']}/potential"
        bid = data["building_id"]
        _test_building_ids.append(bid)

        # Confirm DB persistence
        doc = db.buildings.find_one({"building_id": bid}, {"_id": 0})
        assert doc is not None
        assert doc["status"] == "self_submitted"
        assert doc["is_approved"] is False
        assert doc["data_source"] == "homeowner_calculator"
        assert doc["usable_terrace_area"] == pytest.approx(120.0 * 0.8, abs=0.5)
        assert doc["city"] == "Bengaluru"
        assert doc["building_type"] == "residential"
        assert doc["floors_estimated"] == 2

    def test_with_email_and_bills_upserts_waitlist(self, api, db):
        email = f"test_iter15_{uuid.uuid4().hex[:6]}@example.com"
        payload = {
            "address": "TEST_ITER15 99 Whitefield Main Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "building_type": "residential",
            "roof_area_sqm": 200.0,
            "floors": 3,
            "family_size": 5,
            "email": email,
            "name": "Test Iter15 Owner",
            "monthly_electricity_bill_inr": 4500,
            "monthly_gas_bill_inr": 900,
        }
        r = api.post(f"{BASE_URL}/api/calculate/quick-potential", json=payload)
        assert r.status_code == 200, r.text
        bid = r.json()["building_id"]
        _test_building_ids.append(bid)

        doc = db.buildings.find_one({"building_id": bid}, {"_id": 0})
        assert doc["submitted_email"] == email
        assert doc["monthly_electricity_bill_inr"] == 4500

        wl = db.beta_waitlist.find_one({"email": email.lower()}, {"_id": 0})
        assert wl is not None
        assert wl["persona"] == "calculator-homeowner"
        assert wl["source"] == "homeowner_calculator"
        assert wl["last_building_id"] == bid

    def test_invalid_roof_area_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/calculate/quick-potential", json={
            "address": "x", "city": "y", "roof_area_sqm": 0, "floors": 1
        })
        assert r.status_code == 422


# --------- Module 2: narrative field on potential ---------
class TestPotentialNarrative:
    def test_narrative_present_and_shape(self, api, db):
        # Create a fresh test building
        r = api.post(f"{BASE_URL}/api/calculate/quick-potential", json={
            "address": "TEST_ITER15 Narrative House, Indiranagar",
            "city": "Bengaluru",
            "state": "Karnataka",
            "building_type": "residential",
            "roof_area_sqm": 180.0,
            "floors": 2,
            "family_size": 4,
        })
        assert r.status_code == 200
        bid = r.json()["building_id"]
        _test_building_ids.append(bid)

        r2 = api.get(f"{BASE_URL}/api/buildings/{bid}/potential")
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert "narrative" in data
        nar = data["narrative"]
        # Headline must be non-empty string
        assert isinstance(nar["headline"], str) and len(nar["headline"]) > 10
        # Headline should contain markdown ** wrappers
        assert "**" in nar["headline"], f"Expected markdown ** in headline: {nar['headline']}"
        # Chips: array with at least one entry when summary non-zero
        summary = data.get("summary") or {}
        if any([summary.get("solar_kwh_per_year"), summary.get("rainwater_kl_per_year"),
                summary.get("total_co2_offset_tonnes_per_year")]):
            assert isinstance(nar["chips"], list) and len(nar["chips"]) >= 1
            for chip in nar["chips"]:
                assert "label" in chip and "value" in chip
        # Integer fields
        assert isinstance(nar["cars_offset_equivalent"], int)
        assert isinstance(nar["households_water_equivalent"], int)


# --------- Module 3: subsidies match shape ---------
class TestSubsidiesMatch:
    def test_match_returns_object(self, api, admin_api, db):
        # Ensure subsidies are seeded (idempotent)
        admin_api.post(f"{BASE_URL}/api/admin/subsidies/seed")
        # Find/create a Bengaluru building
        bld = db.buildings.find_one({"city": {"$regex": "^bengaluru$", "$options": "i"}}, {"_id": 0, "building_id": 1})
        if not bld:
            r = api.post(f"{BASE_URL}/api/calculate/quick-potential", json={
                "address": "TEST_ITER15 Subsidies House",
                "city": "Bengaluru",
                "state": "Karnataka",
                "building_type": "residential",
                "roof_area_sqm": 150,
                "floors": 2,
                "family_size": 4,
            })
            bid = r.json()["building_id"]
            _test_building_ids.append(bid)
        else:
            bid = bld["building_id"]

        r = api.get(f"{BASE_URL}/api/subsidies/match/{bid}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, dict)
        # Common shape: should have at least 'matches' or 'subsidies' key
        assert any(k in data for k in ("matches", "subsidies", "items", "results")), \
            f"Unexpected subsidies-match shape keys: {list(data.keys())}"


# --------- Module 4: admin-only seed endpoints ---------
class TestAdminSeed:
    def test_seed_persona_teasers(self, admin_api, db):
        r = admin_api.post(f"{BASE_URL}/api/admin/cms/seed-persona-teasers")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["seeded"] is True
        slugs_required = {"for-homeowners", "for-homeowners-heat-action", "for-communities", "for-installers"}
        present = {p["slug"] for p in data.get("pages", [])}
        assert slugs_required.issubset(present), f"Missing slugs in response: {slugs_required - present}"
        # Confirm in DB
        db_slugs = {d["slug"] for d in db.cms_pages.find({"slug": {"$in": list(slugs_required)}}, {"_id": 0, "slug": 1})}
        assert slugs_required.issubset(db_slugs)

    def test_seed_subsidies(self, admin_api, db):
        r = admin_api.post(f"{BASE_URL}/api/admin/subsidies/seed")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["seeded"] is True
        assert data["active_subsidies"] >= 10
        # Confirm DB count
        assert db.subsidies.count_documents({"is_active": True}) >= 10

    def test_seed_persona_teasers_unauth(self, api):
        r = api.post(f"{BASE_URL}/api/admin/cms/seed-persona-teasers")
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}: {r.text}"

    def test_seed_subsidies_unauth(self, api):
        r = api.post(f"{BASE_URL}/api/admin/subsidies/seed")
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}: {r.text}"
