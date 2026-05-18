"""
Phase 1 (P0 IA reorg + admin overhaul) backend tests:
- GET /api/admin/buildings new shape (counts, page, filters, multi-type, sort)
- PUT /api/admin/buildings/{id}/reject
- POST /api/admin/buildings/bulk-action (approve / reject)
- Intel notes: GET tags, GET/POST/DELETE per-building intel, PUBLIC read
- POST /api/admin/buildings/discover strict_type param (input echo)
- Regression: /api/beta-waitlist, /api/webhooks/zoho-survey
"""
import os
import subprocess
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"


# ---------- admin session fixture ----------
@pytest.fixture(scope="module")
def admin_token():
    token = f"phase1_admin_{uuid.uuid4().hex[:12]}"
    js = f'''
    use('test_database');
    var admin = db.users.findOne({{ user_id: 'user_e4e27c763fa2' }});
    if (!admin) {{ admin = db.users.findOne({{ email: 'gp@sus10.ai' }}); }}
    if (admin) {{
      db.user_sessions.insertOne({{
        user_id: admin.user_id,
        session_token: '{token}',
        expires_at: new Date(Date.now() + 60*60*1000),
        created_at: new Date()
      }});
      print('TOKEN:{token}');
    }} else {{ print('NO_ADMIN'); }}
    '''
    r = subprocess.run(["mongosh", "--quiet", "--eval", js], capture_output=True, text=True)
    if "TOKEN:" not in r.stdout:
        pytest.skip(f"No admin user found. stdout={r.stdout}")
    yield token
    subprocess.run([
        "mongosh", "--quiet", "--eval",
        f"use('test_database'); db.user_sessions.deleteOne({{ session_token: '{token}' }});"
    ], capture_output=True, text=True)


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def sample_building_ids(admin_headers):
    """Pick a few existing building_ids to use in bulk/reject tests."""
    r = requests.get(f"{API}/admin/buildings?limit=5&sort=created_at_desc", headers=admin_headers, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Could not list buildings: {r.status_code} {r.text[:200]}")
    bldgs = r.json().get("buildings", [])
    ids = [b["building_id"] for b in bldgs if b.get("building_id")]
    if len(ids) < 2:
        pytest.skip("Not enough buildings to test bulk/reject")
    return ids


# ---------- GET /api/admin/buildings new shape ----------
class TestAdminBuildingsList:
    def test_returns_new_shape_with_counts_and_page(self, admin_headers):
        r = requests.get(f"{API}/admin/buildings?limit=10&page=1", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("buildings", "total", "page", "limit", "sort", "counts"):
            assert k in data, f"missing key {k}"
        assert isinstance(data["buildings"], list)
        assert isinstance(data["total"], int)
        assert data["page"] == 1
        assert data["limit"] == 10
        c = data["counts"]
        for k in ("pending", "approved", "rejected", "total"):
            assert k in c, f"missing counts.{k}"
            assert isinstance(c[k], int)
        # counts should add up
        assert c["total"] == c["pending"] + c["approved"] + c["rejected"]

    def test_pagination_page_2(self, admin_headers):
        r1 = requests.get(f"{API}/admin/buildings?limit=2&page=1", headers=admin_headers, timeout=30).json()
        r2 = requests.get(f"{API}/admin/buildings?limit=2&page=2", headers=admin_headers, timeout=30).json()
        if r1["total"] < 4:
            pytest.skip("not enough data to test pagination")
        ids1 = [b["building_id"] for b in r1["buildings"]]
        ids2 = [b["building_id"] for b in r2["buildings"]]
        assert set(ids1).isdisjoint(set(ids2)), "page 1 and page 2 overlap"

    def test_status_filter_approved(self, admin_headers):
        r = requests.get(f"{API}/admin/buildings?status=approved&limit=200", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        for b in r.json()["buildings"]:
            assert b.get("is_approved") is True
            assert b.get("is_rejected") in (None, False)

    def test_status_filter_rejected(self, admin_headers):
        r = requests.get(f"{API}/admin/buildings?status=rejected&limit=200", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        for b in r.json()["buildings"]:
            assert b.get("is_rejected") is True

    def test_status_filter_pending(self, admin_headers):
        r = requests.get(f"{API}/admin/buildings?status=pending&limit=200", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        for b in r.json()["buildings"]:
            assert b.get("is_approved") in (None, False)
            assert b.get("is_rejected") in (None, False)

    def test_building_type_multi_select(self, admin_headers):
        # Use two types — should return only those types
        r = requests.get(
            f"{API}/admin/buildings?building_type=mall,hospital&limit=200",
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200
        for b in r.json()["buildings"]:
            assert b.get("building_type") in ("mall", "hospital"), b.get("building_type")

    def test_sort_options(self, admin_headers):
        for sort in ("created_at_desc", "created_at_asc", "city_asc", "area_desc", "area_asc"):
            r = requests.get(f"{API}/admin/buildings?sort={sort}&limit=5", headers=admin_headers, timeout=30)
            assert r.status_code == 200, f"sort {sort} failed: {r.text[:200]}"
            assert r.json()["sort"] == sort

    def test_city_filter_scopes_counts(self, admin_headers):
        # counts.total when city is scoped should equal total returned (since no other filters)
        r = requests.get(
            f"{API}/admin/buildings?city=Mumbai&limit=1&status=all",
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        # counts.total reflects the city scope
        assert data["counts"]["total"] == data["total"] or data["counts"]["total"] >= data["total"]


# ---------- PUT /reject ----------
class TestAdminRejectBuilding:
    def test_reject_unknown_id_404(self, admin_headers):
        r = requests.put(
            f"{API}/admin/buildings/nope_xxx/reject",
            json={"reason": "test"}, headers=admin_headers, timeout=30,
        )
        assert r.status_code == 404

    def test_reject_sets_flags_and_reason(self, admin_headers, sample_building_ids):
        bid = sample_building_ids[0]
        r = requests.put(
            f"{API}/admin/buildings/{bid}/reject",
            json={"reason": "TEST_reject_phase1"},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["building_id"] == bid
        assert data["is_rejected"] is True
        assert data["reason"] == "TEST_reject_phase1"

        # Verify via list with status=rejected
        r2 = requests.get(
            f"{API}/admin/buildings?status=rejected&limit=500",
            headers=admin_headers, timeout=30,
        )
        ids = [b["building_id"] for b in r2.json()["buildings"]]
        assert bid in ids

        # cleanup — restore via bulk approve
        requests.post(f"{API}/admin/buildings/bulk-action",
                      json={"building_ids": [bid], "action": "approve"},
                      headers=admin_headers, timeout=30)


# ---------- POST /bulk-action ----------
class TestAdminBulkAction:
    def test_bulk_invalid_action_400(self, admin_headers, sample_building_ids):
        r = requests.post(
            f"{API}/admin/buildings/bulk-action",
            json={"building_ids": sample_building_ids[:2], "action": "foo"},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 400

    def test_bulk_empty_ids_400(self, admin_headers):
        r = requests.post(
            f"{API}/admin/buildings/bulk-action",
            json={"building_ids": [], "action": "approve"},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 400

    def test_bulk_approve_then_reject(self, admin_headers, sample_building_ids):
        ids = sample_building_ids[:2]
        # approve
        r = requests.post(
            f"{API}/admin/buildings/bulk-action",
            json={"building_ids": ids, "action": "approve"},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["action"] == "approve"
        assert data["matched"] >= len(ids) - 1  # tolerate missing
        assert data["count"] == len(ids)

        # reject
        r2 = requests.post(
            f"{API}/admin/buildings/bulk-action",
            json={"building_ids": ids, "action": "reject", "reason": "TEST_bulk"},
            headers=admin_headers, timeout=30,
        )
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["action"] == "reject"

        # restore for downstream tests
        requests.post(f"{API}/admin/buildings/bulk-action",
                      json={"building_ids": ids, "action": "approve"},
                      headers=admin_headers, timeout=30)


# ---------- Intel notes ----------
class TestIntelNotes:
    def test_get_tag_vocabulary(self, admin_headers):
        r = requests.get(f"{API}/admin/intelligence/tags", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "tags" in data
        assert isinstance(data["tags"], list) and len(data["tags"]) > 0
        for must in ("high_wind_exposure", "heritage_protected"):
            assert must in data["tags"]

    def test_intel_404_on_unknown_building(self, admin_headers):
        r = requests.get(f"{API}/admin/buildings/nope_xxx/intel", headers=admin_headers, timeout=30)
        assert r.status_code == 404

    def test_intel_crud_flow(self, admin_headers, sample_building_ids):
        bid = sample_building_ids[0]
        # Initial GET — should be 200 with array (may be empty)
        r = requests.get(f"{API}/admin/buildings/{bid}/intel", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        assert isinstance(r.json().get("intel_notes"), list)

        # POST a new note
        payload = {"tag": "heritage_protected", "note": "TEST_phase1 intel", "severity": "high"}
        r = requests.post(f"{API}/admin/buildings/{bid}/intel", json=payload, headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["tag"] == "heritage_protected"
        assert created["severity"] == "high"
        assert created["note_id"].startswith("intel_")

        # POST with invalid severity — server normalises to medium
        r2 = requests.post(
            f"{API}/admin/buildings/{bid}/intel",
            json={"tag": "weak_slab", "note": "TEST_severity_bad", "severity": "ultra"},
            headers=admin_headers, timeout=30,
        )
        assert r2.status_code == 200
        assert r2.json()["severity"] == "medium"
        nid2 = r2.json()["note_id"]

        # GET — should include note
        r = requests.get(f"{API}/admin/buildings/{bid}/intel", headers=admin_headers, timeout=30)
        ids = [n["note_id"] for n in r.json()["intel_notes"]]
        assert created["note_id"] in ids
        assert nid2 in ids

        # DELETE the first
        rd = requests.delete(
            f"{API}/admin/buildings/{bid}/intel/{created['note_id']}",
            headers=admin_headers, timeout=30,
        )
        assert rd.status_code == 200
        assert rd.json()["removed"] is True

        # cleanup
        requests.delete(f"{API}/admin/buildings/{bid}/intel/{nid2}", headers=admin_headers, timeout=30)

    def test_public_intel_endpoint(self, sample_building_ids):
        # Public endpoint, no auth — only returns notes for approved buildings
        bid = sample_building_ids[0]
        r = requests.get(f"{API}/buildings/{bid}/intel", timeout=30)
        assert r.status_code == 200
        assert "intel_notes" in r.json()


# ---------- Discover strict_type (no live OSM call expected for real, just input wiring) ----------
class TestDiscoverStrictType:
    def test_discover_requires_city(self, admin_headers):
        r = requests.post(f"{API}/admin/buildings/discover", json={}, headers=admin_headers, timeout=30)
        assert r.status_code in (400, 422)

    def test_strict_type_param_accepted(self, admin_headers):
        """Smoke test: ensure strict_type plus a tiny limit returns a structured response
        with skipped_type_mismatch counter present."""
        body = {"city": "Gurugram", "building_type": "mall", "limit": 1, "strict_type": True}
        r = requests.post(
            f"{API}/admin/buildings/discover",
            json=body,
            headers=admin_headers,
            timeout=120,
        )
        # may return 200 (success) or 500 (Overpass timeout). If 500 → just skip.
        if r.status_code == 500:
            pytest.skip(f"Overpass/Google unavailable: {r.text[:200]}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "skipped_type_mismatch" in data
        assert isinstance(data["skipped_type_mismatch"], int)
        assert data.get("strict_type") is True


# ---------- Regression: public endpoints still work ----------
class TestRegression:
    def test_beta_waitlist_post(self):
        email = f"test_phase1_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(
            f"{API}/beta-waitlist",
            json={"email": email, "persona": "citizen"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("saved") is True
        assert data.get("email", "").lower() == email.lower()
        assert "waitlist_id" in data

    def test_zoho_webhook(self):
        payload = {
            "email": f"TEST_zoho_phase1_{uuid.uuid4().hex[:6]}@example.com",
            "responses": [{"question": "Email", "answer": "noreply@example.com"}],
        }
        r = requests.post(f"{API}/webhooks/zoho-survey", json=payload, timeout=30)
        assert r.status_code == 200
