# Sus10 AI — Roadmap & Backlog

Last updated: May 20, 2026.

---

## 🚀 Active deployment context

User is seeding 3-4 projects across **Delhi NCR · Bangalore · Pune · Mumbai · Ahmedabad** and going live for demo conversations.

---

## 📋 City seeding playbook (for live demo prep)

### Recommended building mix per city — 5-10 buildings each
For a balanced `/insights/{city}` narrative, aim for spread across types:
- 2-3 residential / apartments
- 1-2 housing societies (30-60 families — drives biogas numbers)
- 1-2 commercial / IT parks (big footprint → big solar number)
- 1 institution (school / hospital / college) — community story angle

### Two seeding paths

**Option A — Admin Discover (fastest, default)**
1. `/admin/discover` → pick city + type → "Discover & Import"
2. OSM polygon + lat/lng + Google Places enrichment auto-runs
3. Bulk approve in `/admin/buildings`
4. ⚠️ Self-submitted buildings from `/calculate` are NOT counted in `/insights/{city}` by default. Use `?include_self_submitted=true` on the URL to include them.

**Option B — Self-serve via `/calculate`**
- Walk `/calculate` as a homeowner 5-10 times per city → each creates a `data_source=homeowner_calculator` building
- Then visit `/insights/{city}?include_self_submitted=true`

### ⚡ Cache gotcha
- City insights endpoint caches per `(city, include_self_submitted)` for **600 seconds (10 min)**.
- After adding buildings, the demo page will show stale numbers for up to 10 min.
- **Force refresh:** `sudo supervisorctl restart backend` (cache is in-process, restart clears it).
- Alternative: ship a `?nocache=1` bypass query param (queued in P3 backlog below).

---

## 🟢 P1 backlog (next session candidates)

- **Wire Resend** for real PDF email delivery (`POST /api/buildings/{id}/report-email` currently MOCKED). Playbook ready; needs user-supplied `RESEND_API_KEY` + sender-domain choice (resend.dev quick-start vs sus10.ai with DNS SPF/DKIM). ~15 min wiring once key arrives.
- **`include_self_submitted=true` as the Insights page default** — once calculator usage picks up post-launch, more homeowners' buildings will exist than admin-approved ones. Decide if homeowner submissions should count in the public narrative.
- **City hero strip on home page** — "Live in Delhi NCR · Bangalore · Pune · Mumbai · Ahmedabad" with click-through to `/insights/{city}`. Adds geographic credibility on first impression. Pulls from `GET /api/insights/cities`. ~30 min build.
- **City rank ordering** — "Pune saves most per building" / "Bangalore has the most solar potential" headline call-outs on the Insights page. Falls naturally out of existing totals data. ~20 min build.

## 🟡 P2 backlog

- **Workforce registration module** — separate model for Mali / electrician / plumber / civil contractor signups (distinct from solution-provider companies). Needs new collection, form, admin moderation queue. ~half-day sprint.
- **OpenSolar iframe handoff** on Solar pillar detail page. Referral partner only (Sus10 kept out of BOQ/component-library ERP territory per May 19 strategic decision).
- **Vendor brochure customization** — accent color picker, optional logo upload (sized to fit header). Currently brand_name is enough but pretty visual upgrade.
- **Ward / city-level "what-if" rollups** at sub-city granularity using the curated polygon dataset — e.g. "if every building in HSR Layout went green, X". Already enabled in principle by `/api/insights/city/{city}`; needs a ward field on the building doc + admin UI to assign it.
- **Sustainability partners "Send Enquiry" card design overhaul** — the rich card grid mocked in the May 20 UI/UX brief. `/providers` already exists; this is a separate polish sprint, not blocking demos.

## 🟣 P3 backlog

- **Modularize `backend/server.py`** (now ~4200 lines) → `routes/auth.py`, `routes/admin.py`, `routes/buildings.py`, `routes/calculator.py`, `routes/insights.py`, `routes/vendor_offering.py`, `routes/intel.py`, `routes/cms.py`, `services/*`. Pair with the code-review-flagged complexity refactors (`fetch_buildings_from_osm` complexity 30, `discover_and_import_buildings` complexity 21).
- **City insights cache bypass** — add `?nocache=1` query param so admins can force-refresh during demo prep without restarting backend.
- **Frontend large-component splits** — `BuildingReportPage` (1462 lines), `LandingPage` (490), `AdminBuildingDiscoveryPage` (414), `CmsEditorPage` (408), `InitiativeDetailPage` (357). Need careful prop-drilling extraction; needs own sprint.
- **Polygon vertex clutter / Edit-shape toggle / Douglas-Peucker simplification** — only relevant if the map UI is unhidden for public users (currently behind `show_user_map=false` feature flag).
- **Per-building proactive subsidy eligibility engine** (✅/⚠️/❌ per pillar with rough ₹ numbers) — bigger than the current matched-subsidies strip. Foundation already in `/api/subsidies/match/{building_id}`; needs eligibility predicates per scheme + UI redesign.
- **Monthly policy watchlist cron** — fetches ~5 starter cities' policy pages, diffs content, flags changes to admin.
- **N5 Garden Design module** (paused — keep code available but don't build until asked).
- **N8 Razorpay payments** (post-validation).
- **N9 project-credit entitlement DB model mapping.**
- **Code review tech debt** — hook deps in older pages (ProjectsPage, BuildingSearchPage etc.), index-as-key in long-tail components.

---

## 🔴 Known mocked / partial flows

| Surface | Status |
|---|---|
| `POST /api/buildings/{id}/report-email` | **MOCKED** — returns download URL only, no email sent. Resend wiring pending user's API key + domain. |
| Public map UI on Building Report | **Hidden behind feature flag** `show_user_map=false`. Backend curation + admin paths fully working. Will be revived as a "passive killer feature" (ward rollups) once the workflow is right. |

## 🎯 Strategic decisions locked in (so they survive future sessions)

- **Sus10 = discovery + multi-pillar narrative + portfolio rollup layer.** Hands off to specialist tools (OpenSolar for solar design, vendors for execution) once users are convinced. Competes on breadth across pillars + city/policy context + portfolio aggregation — NOT depth in any single execution toolchain.
- **No proposal generation module** — deferred until paying vendors demand it. Vendor brochure is the substitute (1-pager, co-brandable, free).
- **No component library / BOQ** — solved problem dominated by ERP-grade incumbents. Don't fight that war.
- **Map = backend data curation engine, not a user toy.** All map code preserved. Future ward-level "what-if" rollups will use the curated polygon dataset.
