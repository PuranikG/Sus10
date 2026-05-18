"""
Phase 0 backend tests:
- Persona teaser CMS pages (public GETs)
- Beta-waitlist POST (public) + duplicate handling
- Zoho-survey webhook POST (public) — email auto-extraction
- Admin endpoints: beta-waitlist list, zoho-survey list, buildings list (new shape)
- B1.1: PATCH /api/buildings/{id}/terrace regenerates recommendations + audit
"""
import os
import subprocess
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

PERSONA_SLUGS = {
    "for-homeowners": "citizen",
    "for-homeowners-heat-action": "citizen-crisis",
    "for-communities": "rwa",
    "for-installers": "vendor",
}


# ---------- shared fixtures ----------
@pytest.fixture(scope="module")
def admin_token():
    """Create (or reuse) an admin session for gp@sus10.ai via direct Mongo write."""
    token = f"phase0_admin_{uuid.uuid4().hex[:12]}"
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
        pytest.skip(f"No admin user found in DB to create session. stdout={r.stdout}")
    yield token
    # cleanup
    subprocess.run([
        "mongosh", "--quiet", "--eval",
        f"use('test_database'); db.user_sessions.deleteOne({{ session_token: '{token}' }});"
    ], capture_output=True, text=True)


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- CMS persona teaser pages ----------
class TestCmsPersonaPages:
    def test_list_pages_contains_all_4_persona_slugs(self):
        r = requests.get(f"{API}/cms/pages", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # endpoint may return {pages:[...]} or [...]
        pages = data["pages"] if isinstance(data, dict) and "pages" in data else data
        assert isinstance(pages, list)
        by_slug = {p.get("slug"): p for p in pages}
        for slug, persona in PERSONA_SLUGS.items():
            assert slug in by_slug, f"Missing slug {slug}. Present: {list(by_slug)[:20]}"
            p = by_slug[slug]
            assert p.get("published") is True, f"{slug} not published"
            assert p.get("waitlist_persona") == persona, \
                f"{slug} waitlist_persona={p.get('waitlist_persona')} expected {persona}"

    @pytest.mark.parametrize("slug,persona", list(PERSONA_SLUGS.items()))
    def test_page_detail_fields(self, slug, persona):
        r = requests.get(f"{API}/cms/pages/{slug}", timeout=30)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["slug"] == slug
        assert p.get("waitlist_persona") == persona
        assert p.get("title")
        # benefits should be a list (spec asks for 4 items)
        benefits = p.get("benefits") or []
        assert isinstance(benefits, list) and len(benefits) >= 1, f"benefits empty for {slug}"
        # body_markdown / intro_markdown should exist
        assert p.get("intro_markdown") or p.get("body_markdown"), \
            f"no intro/body markdown for {slug}"

    def test_for_homeowners_exact_fields(self):
        r = requests.get(f"{API}/cms/pages/for-homeowners", timeout=30)
        assert r.status_code == 200
        p = r.json()
        assert p["waitlist_persona"] == "citizen"
        assert (p.get("benefits") and len(p["benefits"]) == 4), \
            f"benefits count for for-homeowners = {len(p.get('benefits') or [])}, expected 4"
        assert p.get("cover_color") == "#1a3d2b", f"cover_color = {p.get('cover_color')}"
        # badges present (array)
        assert isinstance(p.get("badges"), list) and len(p["badges"]) > 0


# ---------- Beta waitlist (public) ----------
class TestBetaWaitlist:
    test_email = f"phase0_test_{uuid.uuid4().hex[:8]}@example.com"

    def test_submit_valid_email_returns_saved_not_duplicate(self):
        body = {
            "email": self.test_email,
            "persona": "citizen",
            "city": "Bangalore",
            "source": "for-homeowners",
        }
        r = requests.post(f"{API}/beta-waitlist", json=body, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("saved") is True
        assert d.get("duplicate") is False
        assert d.get("waitlist_id", "").startswith("wl_")

    def test_resubmit_same_email_returns_duplicate_true(self):
        body = {"email": self.test_email, "persona": "rwa", "source": "for-communities"}
        r = requests.post(f"{API}/beta-waitlist", json=body, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("saved") is True
        assert d.get("duplicate") is True

    def test_invalid_email_returns_4xx(self):
        r = requests.post(f"{API}/beta-waitlist",
                          json={"email": "not-an-email", "persona": "citizen"}, timeout=10)
        assert 400 <= r.status_code < 500, f"Expected 4xx, got {r.status_code}: {r.text}"


# ---------- Zoho survey webhook (public) ----------
class TestZohoSurveyWebhook:
    def test_webhook_with_email_field_captures_to_waitlist(self):
        email = f"zoho_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"email": email, "persona": "rwa",
                   "responses": [{"question": "city", "answer": "Mumbai"}]}
        r = requests.post(f"{API}/webhooks/zoho-survey", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("received") is True
        assert d.get("response_id", "").startswith("zsr_")
        assert d.get("email_captured") is True

    def test_webhook_with_email_in_responses_answer(self):
        email = f"zoho_ans_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"responses": [
            {"question": "What's your email?", "answer": email},
            {"question": "city", "answer": "Delhi"},
        ]}
        r = requests.post(f"{API}/webhooks/zoho-survey", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["received"] is True
        assert d["email_captured"] is True

    def test_webhook_without_email_still_stores(self):
        payload = {"random": "data", "responses": [{"q": "x", "answer": "y"}]}
        r = requests.post(f"{API}/webhooks/zoho-survey", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["received"] is True
        assert d["email_captured"] is False
        assert d["response_id"].startswith("zsr_")


# ---------- Admin endpoints ----------
class TestAdminEndpoints:
    def test_admin_beta_waitlist_shape(self, admin_headers):
        r = requests.get(f"{API}/admin/beta-waitlist", headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert set(["entries", "total", "by_persona", "limit"]).issubset(d.keys())
        assert isinstance(d["entries"], list)
        assert isinstance(d["total"], int) and d["total"] >= 1
        assert isinstance(d["by_persona"], dict)

    def test_admin_zoho_survey_responses_shape(self, admin_headers):
        r = requests.get(f"{API}/admin/zoho-survey-responses",
                         headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert set(["responses", "total", "limit"]).issubset(d.keys())
        assert isinstance(d["responses"], list)
        assert d["total"] >= 1  # we created at least 3 above

    def test_admin_buildings_new_shape(self, admin_headers):
        r = requests.get(f"{API}/admin/buildings?limit=50",
                         headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # NEW shape
        assert isinstance(d, dict), f"Expected dict response, got {type(d)}"
        assert set(["buildings", "total", "limit", "sort"]).issubset(d.keys()), \
            f"Missing keys; got {list(d.keys())}"
        assert isinstance(d["buildings"], list)
        assert isinstance(d["total"], int)
        # Sort newest first
        if len(d["buildings"]) >= 2:
            a, b = d["buildings"][0], d["buildings"][1]
            ca, cb = a.get("created_at"), b.get("created_at")
            if ca and cb:
                assert ca >= cb, f"Buildings not sorted desc by created_at: {ca} < {cb}"

    def test_admin_buildings_limit_2000(self, admin_headers):
        r = requests.get(f"{API}/admin/buildings?limit=2000",
                         headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["limit"] == 2000
        assert len(d["buildings"]) <= 2000

    def test_admin_buildings_total_matches_count(self, admin_headers):
        r = requests.get(f"{API}/admin/buildings?limit=2000",
                         headers=admin_headers, timeout=30)
        d = r.json()
        # use mongo count for sanity
        out = subprocess.run([
            "mongosh", "--quiet", "--eval",
            "use('test_database'); print('COUNT:' + db.buildings.countDocuments({}));"
        ], capture_output=True, text=True)
        count = None
        for line in out.stdout.split("\n"):
            if "COUNT:" in line:
                count = int(line.split("COUNT:")[1].strip()); break
        if count is not None:
            assert d["total"] == count, f"total={d['total']} != mongo count={count}"


# ---------- B1.1 PATCH terrace regenerates recs ----------
class TestB11TerraceRegen:
    def _pick_building_id(self):
        out = subprocess.run([
            "mongosh", "--quiet", "--eval",
            ("use('test_database'); "
             "var b = db.buildings.findOne({usable_terrace_area: {$gt: 100}}); "
             "if (b) print('BID:' + b.building_id);")
        ], capture_output=True, text=True)
        for line in out.stdout.split("\n"):
            if "BID:" in line:
                return line.split("BID:")[1].strip()
        return None

    def test_patch_terrace_refreshes_recommendations(self):
        bid = self._pick_building_id()
        if not bid:
            pytest.skip("No building with terrace area found")
        new_area = 1234.0
        r = requests.patch(f"{API}/buildings/{bid}/terrace",
                           json={"custom_terrace_area": new_area}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["saved"] is True
        assert d["custom_terrace_area"] == new_area
        regen = d.get("recommendations_refreshed") or {}
        # Should NOT be skipped due to area / building
        assert regen.get("skipped") not in ("building_not_found", "no_area"), \
            f"regen skipped: {regen}"

        # Verify GET /api/buildings/{id}/solutions reflects new area
        time.sleep(1)
        rr = requests.get(f"{API}/buildings/{bid}/solutions", timeout=20)
        assert rr.status_code == 200, rr.text
        recs_payload = rr.json()
        recs = recs_payload if isinstance(recs_payload, list) else \
               recs_payload.get("recommendations", [])
        assert recs, "No recommendations returned"
        rec = recs[0]
        # required_area should reflect new area
        ra = rec.get("required_area")
        assert ra is not None
        assert abs(float(ra) - new_area) < 1.0, \
            f"required_area {ra} != new {new_area}"
        rec_id = rec.get("recommendation_id")
        assert rec_id

        # Explainability — calculation_steps should mention new area
        er = requests.get(f"{API}/recommendations/{rec_id}/explainability", timeout=20)
        assert er.status_code == 200, er.text
        ep = er.json()
        steps_str = str(ep.get("calculation_steps", "")) + str(ep)
        # Number may be comma-formatted ("1,234 sqm"); check raw or commas.
        formatted = f"{int(new_area):,}"
        assert (str(int(new_area)) in steps_str) or (formatted in steps_str), \
            f"new area {new_area} not found in explainability payload"
        # Also verify the derived value matches (co2 = area * 3.5)
        expected_co2 = int(round(new_area * 3.5, 0))
        fo = ep.get("final_output") or {}
        co2 = (fo.get("co2_sequestration") or {}).get("value")
        if co2 is not None:
            assert abs(float(co2) - expected_co2) < 1.0, \
                f"co2 {co2} != expected {expected_co2}"
