"""
Iteration 16 backend tests — Sus10 AI

Covers (per /app/test_reports — review_request):
  (B) Public intel — GET /api/intel/tags, GET /api/buildings/{id}/intel
  (C) Admin PDF funnel rollup — GET /api/admin/pdf-funnel-stats
  (D) Admin intel CRUD regression — POST + DELETE /api/admin/buildings/{id}/intel
  (P2) Vendor one-pager PDF — POST /api/vendor-offering/pdf
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sus10-preview.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = os.getenv("ADMIN_TEST_TOKEN", "iter16_test_session")
TEST_BUILDING_WITH_INTEL = "bld_27a56274e04a"  # INCUBEX KRM1 (seeded 3 intel notes)


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin(api):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ADMIN_TOKEN}",
    })
    # Sanity — token must resolve to gp@sus10.ai admin
    r = s.get(f"{BASE_URL}/api/auth/me")
    if r.status_code != 200:
        pytest.skip(f"Admin session invalid — /api/auth/me {r.status_code}: {r.text[:200]}")
    body = r.json()
    assert body.get("email") == "gp@sus10.ai", body
    assert body.get("user_type") == "admin", body
    return s


# ---------------- (B) Public intel tag vocabulary ----------------
class TestPublicIntelTags:
    def test_get_intel_tags_no_auth(self, api):
        r = api.get(f"{BASE_URL}/api/intel/tags")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "tags" in body
        assert isinstance(body["tags"], list)
        assert len(body["tags"]) == 10, f"Expected 10 intel tags, got {len(body['tags'])}"


# ---------------- (B) Public intel notes for any building ----------------
class TestPublicBuildingIntel:
    def test_public_intel_seeded_building(self, api):
        r = api.get(f"{BASE_URL}/api/buildings/{TEST_BUILDING_WITH_INTEL}/intel")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "intel_notes" in body
        notes = body["intel_notes"]
        assert isinstance(notes, list)
        assert len(notes) >= 1, "Seeded building bld_27a56274e04a should have >=1 intel note"
        # Validate shape
        n = notes[0]
        for k in ("note_id", "tag", "note", "severity"):
            assert k in n, f"Missing key {k} in intel note: {n}"

    def test_public_intel_unknown_building_returns_empty(self, api):
        r = api.get(f"{BASE_URL}/api/buildings/bld_doesnotexist_xyz/intel")
        # Endpoint specifically returns empty list (not 404) for unknown buildings.
        assert r.status_code == 200, r.text
        assert r.json() == {"intel_notes": []}


# ---------------- (C) Admin PDF funnel stats ----------------
class TestAdminPdfFunnelStats:
    def test_funnel_stats_requires_admin(self, api):
        r = api.get(f"{BASE_URL}/api/admin/pdf-funnel-stats")
        # 401/403 — not authenticated
        assert r.status_code in (401, 403), r.status_code

    def test_funnel_stats_returns_expected_shape(self, admin):
        r = admin.get(f"{BASE_URL}/api/admin/pdf-funnel-stats?days=30")
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("total_requests", "total_unique_emails", "window_days",
                  "window_total", "timeseries", "by_persona", "top_buildings"):
            assert k in body, f"Missing key {k}"
        assert body["window_days"] == 30
        # timeseries must have exactly 30 entries
        assert isinstance(body["timeseries"], list)
        assert len(body["timeseries"]) == 30, f"Expected 30 daily buckets, got {len(body['timeseries'])}"
        for item in body["timeseries"]:
            assert "date" in item and "count" in item
            assert isinstance(item["count"], int)
            assert len(item["date"]) == 10  # YYYY-MM-DD
        # total_requests should reflect 4 seeded entries
        assert body["total_requests"] >= 4, body["total_requests"]
        # top_buildings must be hydrated with name
        assert isinstance(body["top_buildings"], list)
        for b in body["top_buildings"]:
            assert "building_id" in b
            assert "count" in b
            assert "name" in b, f"top_buildings entry missing hydrated name: {b}"
        # by_persona shape
        for p in body["by_persona"]:
            assert "persona" in p and "count" in p


# ---------------- (D) Admin intel CRUD regression ----------------
class TestAdminIntelCRUD:
    created_note_id = None

    def test_post_intel_adds_note(self, admin):
        payload = {"tag": "rwa_dispute", "severity": "high", "note": "TEST_ITER16 dispute note"}
        r = admin.post(
            f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_WITH_INTEL}/intel",
            json=payload,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("note_id", "tag", "severity", "note", "created_at"):
            assert k in body
        assert body["tag"] == "rwa_dispute"
        assert body["severity"] == "high"
        assert body["note"] == "TEST_ITER16 dispute note"
        TestAdminIntelCRUD.created_note_id = body["note_id"]

    def test_post_intel_invalid_severity_defaults_to_medium(self, admin):
        payload = {"tag": "permit_block", "severity": "catastrophic", "note": "TEST_ITER16 default sev"}
        r = admin.post(
            f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_WITH_INTEL}/intel",
            json=payload,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["severity"] == "medium", f"invalid severity should default to medium, got {body['severity']}"
        # Cleanup
        admin.delete(
            f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_WITH_INTEL}/intel/{body['note_id']}"
        )

    def test_delete_intel_removes_note(self, admin):
        nid = TestAdminIntelCRUD.created_note_id
        assert nid, "Previous create test should have set created_note_id"
        # Snapshot pre-count via admin endpoint
        pre = admin.get(
            f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_WITH_INTEL}/intel"
        ).json()["intel_notes"]
        pre_count = len(pre)
        r = admin.delete(
            f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_WITH_INTEL}/intel/{nid}"
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("removed") is True
        assert body.get("note_id") == nid
        post = admin.get(
            f"{BASE_URL}/api/admin/buildings/{TEST_BUILDING_WITH_INTEL}/intel"
        ).json()["intel_notes"]
        assert len(post) == pre_count - 1, f"Note count did not shrink: pre={pre_count} post={len(post)}"
        assert not any(n.get("note_id") == nid for n in post)


# ---------------- (P2) Vendor one-pager PDF ----------------
class TestVendorOfferingPDF:
    def test_vendor_pdf_full_payload(self, api):
        payload = {
            "brand_name": "TEST_ITER16 SolarCo",
            "tagline": "Roof to relief.",
            "contact_name": "Alex Rooftop",
            "phone": "+91-99999-00000",
            "email": "alex@solarco.test",
            "cities": "Mumbai, Pune, Bengaluru",
            "years_experience": 8,
            "badges": ["MNRE empanelled", "ISO 9001"],
        }
        r = api.post(f"{BASE_URL}/api/vendor-offering/pdf", json=payload)
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("Content-Type", "").startswith("application/pdf")
        assert r.content[:5] == b"%PDF-", f"Not a valid PDF, header={r.content[:8]!r}"
        # generic ~37KB per release notes — sanity bound, not strict
        assert len(r.content) > 5000, f"PDF too small: {len(r.content)}b"

    def test_vendor_pdf_with_building_id_sized(self, api):
        payload = {
            "brand_name": "TEST_ITER16 SizedVendor",
            "tagline": "Powered by the building",
            "building_id": TEST_BUILDING_WITH_INTEL,
        }
        r = api.post(f"{BASE_URL}/api/vendor-offering/pdf", json=payload)
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("Content-Type", "").startswith("application/pdf")
        assert r.content[:5] == b"%PDF-"
        assert len(r.content) > 5000

    def test_vendor_pdf_minimum_payload(self, api):
        r = api.post(f"{BASE_URL}/api/vendor-offering/pdf", json={"brand_name": "TEST_ITER16 Minimal"})
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("Content-Type", "").startswith("application/pdf")
        assert r.content[:5] == b"%PDF-"
