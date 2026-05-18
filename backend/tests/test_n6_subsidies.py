"""N6: Subsidies & Financing Navigator — backend tests.

Covers:
  - Public GET /api/subsidies (filters: category, type, state, q)
  - GET /api/subsidies/match/{building_id} for seeded bld_001
  - Admin CRUD: list / create / update / delete with audit log entries
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sus10-preview.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "iter10_fe_session"


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ADMIN_TOKEN}",
    })
    # sanity
    r = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin auth failed: {r.status_code} {r.text[:120]}")
    return s


@pytest.fixture(scope="module")
def public_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --------------- Public listing ---------------
class TestPublicSubsidies:
    def test_list_all_returns_15(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/subsidies", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "subsidies" in data and "total" in data
        assert data["total"] == 15, f"expected 15 seeded subsidies, got {data['total']}"
        assert len(data["subsidies"]) == 15
        # Spot-check shape
        first = data["subsidies"][0]
        for key in ("name", "authority", "type", "category", "geo_scope", "benefit_summary"):
            assert key in first, f"missing {key} in subsidy record"
        # No mongo _id leaks
        assert "_id" not in first

    def test_filter_category_solar_reduces(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/subsidies?category=solar", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert 0 < data["total"] < 15
        for s in data["subsidies"]:
            assert "solar" in (s.get("category") or [])

    def test_filter_type_loan_returns_4_bank_loans(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/subsidies?type=loan", timeout=15)
        assert r.status_code == 200
        data = r.json()
        codes = sorted([s.get("scheme_code") for s in data["subsidies"]])
        expected = sorted(["SBI_SRTFS", "UBI_RTS", "CANARA_SURYA", "PNB_SURYA_SHAKTI"])
        assert codes == expected, f"loan scheme codes mismatch: {codes}"
        assert data["total"] == 4

    def test_filter_q_sbi(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/subsidies?q=SBI", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        codes = [s.get("scheme_code") for s in data["subsidies"]]
        assert "SBI_SRTFS" in codes

    def test_filter_state_maharashtra(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/subsidies?state=Maharashtra", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        # Should include MH-specific + central entries
        scopes = {s.get("geo_scope") for s in data["subsidies"]}
        states = {s.get("state") for s in data["subsidies"] if s.get("state")}
        assert "central" in scopes, "central subsidies should be included with state filter"
        assert "Maharashtra" in states, "Maharashtra-specific subsidy missing"


# --------------- Match endpoint ---------------
class TestSubsidyMatch:
    def test_match_bld_001(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/subsidies/match/bld_001", timeout=15)
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert data["building_id"] == "bld_001"
        assert data["building_type"] == "it_park"
        assert isinstance(data["subsidies"], list)
        assert len(data["subsidies"]) >= 1
        # Each result should be active and either central or matching state
        state = data.get("state")
        for s in data["subsidies"]:
            assert s.get("is_active", True) is True
            scope_ok = s.get("geo_scope") == "central" or s.get("state") == state
            assert scope_ok, f"non-matching geo: {s.get('scheme_code')} scope={s.get('geo_scope')} state={s.get('state')}"

    def test_match_unknown_building_404(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/subsidies/match/bld_DOES_NOT_EXIST", timeout=15)
        assert r.status_code == 404


# --------------- Admin CRUD + audit ---------------
class TestAdminSubsidies:
    def test_admin_list_15(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/subsidies", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 15  # may grow if previous tests left records

    def test_admin_requires_auth(self, public_client):
        r = public_client.get(f"{BASE_URL}/api/admin/subsidies", timeout=15)
        assert r.status_code in (401, 403)

    def test_full_crud_with_audit(self, admin_client):
        payload = {
            "name": "TEST_N6 Pytest Subsidy",
            "scheme_code": "TEST_N6_PYTEST",
            "authority": "Pytest Authority",
            "type": "subsidy",
            "category": ["solar"],
            "geo_scope": "central",
            "eligible_building_types": ["commercial", "it_park"],
            "benefit_summary": "Pytest seeded TEST_ entry",
            "benefit_details_markdown": "# Pytest\n- foo",
            "application_url": "https://example.com/apply",
            "is_active": True,
        }

        # CREATE
        r = admin_client.post(f"{BASE_URL}/api/admin/subsidies", json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text[:300]
        created = r.json()
        sid = created.get("subsidy_id")
        assert sid and sid.startswith("sub_")
        assert created["name"] == payload["name"]
        assert created["scheme_code"] == "TEST_N6_PYTEST"

        # GET via list to confirm persistence
        r = admin_client.get(f"{BASE_URL}/api/admin/subsidies", timeout=15)
        assert r.status_code == 200
        ids = [s.get("subsidy_id") for s in r.json()["subsidies"]]
        assert sid in ids

        # UPDATE
        update_payload = {**payload, "name": "TEST_N6 Pytest Subsidy (updated)", "rate_or_percent": "40% CFA"}
        r = admin_client.put(f"{BASE_URL}/api/admin/subsidies/{sid}", json=update_payload, timeout=15)
        assert r.status_code == 200, r.text[:300]
        assert r.json().get("updated") is True

        # Verify persistence of update
        r = admin_client.get(f"{BASE_URL}/api/admin/subsidies", timeout=15)
        match = next((s for s in r.json()["subsidies"] if s.get("subsidy_id") == sid), None)
        assert match is not None
        assert match["name"].endswith("(updated)")
        assert match.get("rate_or_percent") == "40% CFA"

        # Audit log entries
        time.sleep(0.5)
        r = admin_client.get(f"{BASE_URL}/api/admin/audit?action=subsidy.create&limit=50", timeout=15)
        assert r.status_code == 200
        audit = r.json()
        entries = audit.get("entries") or audit.get("audit") or audit.get("items") or []
        create_hit = any(e.get("resource_id") == sid for e in entries)
        assert create_hit, f"subsidy.create audit missing for {sid}"

        r = admin_client.get(f"{BASE_URL}/api/admin/audit?action=subsidy.update&limit=50", timeout=15)
        entries = r.json().get("entries") or r.json().get("audit") or r.json().get("items") or []
        assert any(e.get("resource_id") == sid for e in entries), "subsidy.update audit missing"

        # DELETE
        r = admin_client.delete(f"{BASE_URL}/api/admin/subsidies/{sid}", timeout=15)
        assert r.status_code == 200, r.text[:300]
        assert r.json().get("deleted") is True

        # Verify removed
        r = admin_client.get(f"{BASE_URL}/api/admin/subsidies", timeout=15)
        ids = [s.get("subsidy_id") for s in r.json()["subsidies"]]
        assert sid not in ids

        # Audit delete
        r = admin_client.get(f"{BASE_URL}/api/admin/audit?action=subsidy.delete&limit=50", timeout=15)
        entries = r.json().get("entries") or r.json().get("audit") or r.json().get("items") or []
        assert any(e.get("resource_id") == sid for e in entries), "subsidy.delete audit missing"

    def test_update_nonexistent_returns_404(self, admin_client):
        payload = {
            "name": "x", "authority": "x", "type": "subsidy",
            "benefit_summary": "x", "benefit_details_markdown": "x",
        }
        r = admin_client.put(f"{BASE_URL}/api/admin/subsidies/sub_NOTFOUND", json=payload, timeout=15)
        assert r.status_code == 404

    def test_delete_nonexistent_returns_404(self, admin_client):
        r = admin_client.delete(f"{BASE_URL}/api/admin/subsidies/sub_NOTFOUND", timeout=15)
        assert r.status_code == 404
