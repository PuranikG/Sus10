"""
Iteration 11 — P1 batch part 1:
(a) Admin Audit Log: GET /api/admin/audit + audit writes from admin mutations
(b) Sustenance Potential at-a-glance: GET /api/buildings/{id}/potential + biogas override
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "iter10_fe_session"
TEST_BUILDING_ID = "bld_001"


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ADMIN_TOKEN}",
    })
    return s


@pytest.fixture(scope="module")
def public_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ==================== AUDIT LOG TESTS ====================

class TestAdminAuditList:
    def test_audit_endpoint_requires_admin(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/admin/audit")
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"

    def test_audit_list_basic_shape(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/audit?limit=10")
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("entries", "total", "page", "limit"):
            assert key in data, f"missing key {key} in {data.keys()}"
        assert isinstance(data["entries"], list)
        assert isinstance(data["total"], int)

    def test_audit_pagination_and_sort(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/audit?page=1&limit=5")
        assert r.status_code == 200
        d = r.json()
        assert d["page"] == 1
        assert d["limit"] == 5
        # if 2+ entries: must be sorted desc by created_at
        if len(d["entries"]) >= 2:
            a = d["entries"][0].get("created_at") or ""
            b = d["entries"][1].get("created_at") or ""
            assert a >= b, f"entries not sorted desc: {a} vs {b}"

    def test_audit_filters_action(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/audit?action=building.approve&limit=5")
        assert r.status_code == 200
        for e in r.json()["entries"]:
            assert e["action"] == "building.approve"


class TestAuditWritesFromMutations:
    """Verify each admin mutation appends an audit entry."""

    def _latest_action(self, client, action):
        r = client.get(f"{BASE_URL}/api/admin/audit?action={action}&limit=1")
        assert r.status_code == 200
        items = r.json()["entries"]
        return items[0] if items else None

    def test_approve_creates_audit(self, admin_client):
        before = self._latest_action(admin_client, "building.approve")
        before_ts = (before or {}).get("created_at", "")
        r = admin_client.put(f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_ID}/approve")
        assert r.status_code == 200, r.text
        after = self._latest_action(admin_client, "building.approve")
        assert after is not None, "no building.approve audit found"
        assert after.get("created_at", "") > before_ts or after.get("resource_id") == TEST_BUILDING_ID
        assert after.get("resource_type") == "building"
        assert after.get("user_email") == "gp@sus10.ai"
        assert after.get("resource_id") == TEST_BUILDING_ID

    def test_reject_creates_audit(self, admin_client):
        # Use a throwaway id (or another seeded one) - even if 404 backend should still NOT log
        # So we'll reject then re-approve bld_001 to verify the audit was written for reject
        before = self._latest_action(admin_client, "building.reject")
        before_ts = (before or {}).get("created_at", "")
        r = admin_client.put(
            f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_ID}/reject",
            json={"reason": "TEST_iteration_11 audit smoke"},
        )
        assert r.status_code == 200, r.text
        after = self._latest_action(admin_client, "building.reject")
        # Re-approve to leave bld_001 in approved state
        admin_client.put(f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_ID}/approve")

        assert after is not None, "no building.reject audit found"
        assert after.get("created_at", "") > before_ts, "reject endpoint did not write audit"
        assert after.get("resource_id") == TEST_BUILDING_ID
        assert after.get("user_email") == "gp@sus10.ai"

    def test_bulk_approve_creates_audit(self, admin_client):
        before = self._latest_action(admin_client, "building.bulk_approve")
        before_ts = (before or {}).get("created_at", "")
        r = admin_client.post(
            f"{BASE_URL}/api/admin/buildings/bulk-action",
            json={"building_ids": [TEST_BUILDING_ID], "action": "approve"},
        )
        assert r.status_code == 200, r.text
        after = self._latest_action(admin_client, "building.bulk_approve")
        assert after is not None
        assert after.get("created_at", "") > before_ts
        meta = after.get("metadata") or {}
        assert meta.get("count") == 1

    def test_bulk_reject_creates_audit(self, admin_client):
        before = self._latest_action(admin_client, "building.bulk_reject")
        before_ts = (before or {}).get("created_at", "")
        # Use a non-existent id so we don't soft-delete bld_001
        r = admin_client.post(
            f"{BASE_URL}/api/admin/buildings/bulk-action",
            json={"building_ids": ["bld_TEST_doesnotexist"], "action": "reject", "reason": "TEST_iter11"},
        )
        assert r.status_code == 200, r.text
        after = self._latest_action(admin_client, "building.bulk_reject")
        assert after is not None
        assert after.get("created_at", "") > before_ts

    def test_intel_add_creates_audit(self, admin_client):
        before = self._latest_action(admin_client, "intel.add")
        before_ts = (before or {}).get("created_at", "")
        r = admin_client.post(
            f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_ID}/intel",
            json={"tag": "heritage_protected", "note": "TEST_iter11 audit", "severity": "low"},
        )
        assert r.status_code in (200, 201), r.text
        after = self._latest_action(admin_client, "intel.add")
        assert after is not None, "intel.add audit not written"
        assert after.get("created_at", "") > before_ts
        assert after.get("resource_id") == TEST_BUILDING_ID


# ==================== SUSTENANCE POTENTIAL TESTS ====================

class TestBuildingPotential:
    def test_potential_basic_shape(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/buildings/{TEST_BUILDING_ID}/potential")
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("building", "widgets", "summary", "pillars", "inputs"):
            assert key in data, f"missing {key}"
        assert isinstance(data["widgets"], list)
        assert len(data["widgets"]) == 4
        keys = {w["key"] for w in data["widgets"]}
        assert keys == {"solar", "biogas", "rainwater", "greening"}, f"got {keys}"

    def test_widget_fields(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/buildings/{TEST_BUILDING_ID}/potential")
        d = r.json()
        for w in d["widgets"]:
            for f in ("key", "title", "headline_value", "headline_unit", "subheadings", "color", "drill_route"):
                assert f in w, f"widget {w.get('key')} missing field {f}"
            assert isinstance(w["subheadings"], list)
            assert w["drill_route"].startswith(f"/buildings/{TEST_BUILDING_ID}")

    def test_biogas_has_adjustable(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/buildings/{TEST_BUILDING_ID}/potential")
        biogas = next(w for w in r.json()["widgets"] if w["key"] == "biogas")
        assert "adjustable" in biogas, f"biogas widget missing 'adjustable': {biogas.keys()}"
        adj = biogas["adjustable"]
        assert "families" in adj
        assert "waste_kg_per_family_per_day" in adj

    def test_biogas_override_50_families_1kg(self, public_client):
        r = public_client.get(
            f"{BASE_URL}/api/buildings/{TEST_BUILDING_ID}/potential",
            params={"families": 50, "waste_kg_per_family_per_day": 1.0},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        biogas = data["pillars"]["biogas"]
        # 50 families * 1.0 kg => 50 kg daily waste
        daily = biogas.get("daily_organic_waste_kg")
        assert daily is not None
        assert 48 <= float(daily) <= 52, f"daily_organic_waste_kg={daily}, expected ~50"
        # biogas m3/day ~ 4
        m3_day = biogas.get("biogas_m3_per_day")
        assert m3_day is not None
        assert 3.5 <= float(m3_day) <= 4.5, f"biogas_m3_per_day={m3_day}, expected ~4"
        # inputs echo
        assert data["inputs"]["families"] == 50
        assert float(data["inputs"]["waste_kg_per_family_per_day"]) == 1.0

    def test_potential_404_for_unknown(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/buildings/bld_TEST_doesnotexist_xyz/potential")
        assert r.status_code == 404


class TestSustenanceRegression:
    """Ensure GET /sustenance/building/{id} still works with optional new params."""

    def test_without_overrides(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/sustenance/building/{TEST_BUILDING_ID}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "pillars" in data
        assert "biogas" in data["pillars"]

    def test_with_optional_params(self, public_client):
        r = public_client.get(
            f"{BASE_URL}/api/sustenance/building/{TEST_BUILDING_ID}",
            params={"families": 50, "waste_kg_per_family_per_day": 1.0},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        biogas = d["pillars"]["biogas"]
        # 50 * 1 = 50 kg/day
        assert 48 <= float(biogas.get("daily_organic_waste_kg", 0)) <= 52
