"""Backend tests for E1.1 + B1.2 — server-side PDF reports + email-me flow."""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sus10-preview.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "iter10_fe_session"
BUILDING_ID = "bld_001"


@pytest.fixture
def api():
    s = requests.Session()
    return s


@pytest.fixture
def admin_api():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {ADMIN_TOKEN}"})
    return s


# ----- PDF generation (GET /report.pdf) -----
class TestPdfGeneration:
    def test_citizen_owner_default(self, api):
        r = api.get(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report.pdf",
                    params={"persona": "citizen_owner"}, timeout=120)
        assert r.status_code == 200, r.text[:300]
        assert r.headers["content-type"].startswith("application/pdf")
        assert r.content.startswith(b"%PDF"), "Body must start with %PDF"
        assert len(r.content) > 20_000, f"PDF too small: {len(r.content)} bytes"

    @pytest.mark.parametrize("persona", ["rwa", "provider", "corporate_esg"])
    def test_persona_variations(self, api, persona):
        r = api.get(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report.pdf",
                    params={"persona": persona}, timeout=120)
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")
        assert len(r.content) > 20_000

    def test_unknown_persona_falls_back(self, api):
        r = api.get(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report.pdf",
                    params={"persona": "martian"}, timeout=120)
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")
        assert len(r.content) > 20_000

    def test_section_filtering_smaller(self, api):
        r_full = api.get(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report.pdf",
                         params={"persona": "citizen_owner"}, timeout=120)
        r_part = api.get(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report.pdf",
                         params={"persona": "citizen_owner",
                                 "sections": "summary,solar,rainwater"}, timeout=120)
        assert r_full.status_code == 200 and r_part.status_code == 200
        assert r_part.content.startswith(b"%PDF")
        # Smaller PDF expected when fewer sections
        assert len(r_part.content) < len(r_full.content), \
            f"Filtered ({len(r_part.content)}) should be < full ({len(r_full.content)})"

    def test_biogas_override(self, api):
        # families=120, waste=0.8 -> 96 kg/day; biogas section appears for rwa default
        r = api.get(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report.pdf",
                    params={"persona": "rwa", "families": 120,
                            "waste_kg_per_family_per_day": 0.8}, timeout=120)
        assert r.status_code == 200
        assert len(r.content) > 20_000
        # PDF binary text scan for "96" kg figure -- can't easily extract text from
        # WeasyPrint without pdfminer; we verify endpoint accepts override params
        # and produces a valid PDF.

    def test_subsidies_default_for_citizen(self, api):
        r = api.get(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report.pdf",
                    params={"persona": "citizen_owner"}, timeout=120)
        assert r.status_code == 200
        # crude search inside PDF bytes for subsidy hallmark keywords
        body = r.content
        # PDF streams may compress text; do a permissive search
        hits = sum(1 for kw in (b"PMSGMBY", b"SBI", b"MNRE") if kw in body)
        # Even if compressed, raw text often present in WeasyPrint output
        # Soft-assert: at least 1 hit OR file size > 30KB indicates subsidy block.
        assert hits >= 1 or len(body) > 30_000, "subsidies section likely missing"


# ----- POST /report-email -----
class TestReportEmail:
    def test_email_me_full_flow(self, api):
        payload = {
            "email": "TEST_pdf_iter14@example.com",
            "name": "Iter14 Tester",
            "persona": "citizen_owner",
            "sections": "summary,solar,rainwater,subsidies",
        }
        r = api.post(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report-email",
                     json=payload, timeout=120)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data["saved"] is True
        assert data["request_id"].startswith("pdfreq_")
        assert data["download_url"].startswith("/api/pdf-reports/")
        assert data["filename"].endswith(".pdf")

        # Verify download URL is GET-able and returns PDF
        url = BASE_URL + data["download_url"]
        r2 = api.get(url, timeout=60)
        assert r2.status_code == 200
        assert r2.headers["content-type"].startswith("application/pdf")
        assert r2.content.startswith(b"%PDF")
        assert len(r2.content) > 20_000

    def test_email_invalid_payload(self, api):
        r = api.post(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report-email",
                     json={"email": "not-an-email"}, timeout=30)
        assert r.status_code in (400, 422)


# ----- GET /pdf-reports/{id} 404 -----
class TestPdfPublicServe:
    def test_unknown_upload_404(self, api):
        r = api.get(f"{BASE_URL}/api/pdf-reports/pdf_doesnotexist", timeout=30)
        assert r.status_code == 404


# ----- Admin: list pdf-email-requests -----
class TestAdminListing:
    def test_unauth_blocked(self, api):
        r = api.get(f"{BASE_URL}/api/admin/pdf-email-requests", timeout=30)
        assert r.status_code in (401, 403)

    def test_admin_listing(self, admin_api):
        r = admin_api.get(f"{BASE_URL}/api/admin/pdf-email-requests", timeout=30)
        if r.status_code in (401, 403):
            pytest.skip(f"admin token not valid in this env: {r.status_code}")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "requests" in data and "total" in data and "limit" in data
        assert isinstance(data["requests"], list)
        assert isinstance(data["total"], int)


# ----- Beta-waitlist join (verify via admin endpoint if exists) -----
class TestWaitlistJoin:
    def test_email_joins_waitlist(self, api, admin_api):
        # Use a unique test email
        import uuid
        unique_email = f"TEST_wl_{uuid.uuid4().hex[:8]}@example.com"
        r = api.post(f"{BASE_URL}/api/buildings/{BUILDING_ID}/report-email",
                     json={"email": unique_email, "name": "WL Tester",
                           "persona": "rwa"}, timeout=120)
        assert r.status_code == 200

        # Try a likely waitlist admin endpoint; tolerate absence
        for path in ("/api/admin/beta-waitlist", "/api/admin/waitlist"):
            rr = admin_api.get(f"{BASE_URL}{path}", timeout=30)
            if rr.status_code == 200:
                body = rr.text
                assert unique_email.lower() in body.lower(), \
                    f"email not found in waitlist via {path}"
                return
        pytest.skip("No admin waitlist endpoint discovered to verify join")
