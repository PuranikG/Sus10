# Sus10 AI — User Feedback & Bug Log

> Running log of user-reported feedback, bugs, and enhancement ideas. Items here are NOT yet prioritized; user will confirm priorities in a later message.

---

## Batch 1 — Feb 19, 2026 (post-deployment review)

### 🐛 Bugs

#### B1.3 — Building Type filter on /admin/discover not respected
- **Page:** `/admin/discover` (Building Discovery)
- **Reproduced from screenshot (Mumbai, Shopping Mall, min footprint 1,000 sqm):**
  - 27 buildings imported. Results include non-mall types:
    - `Vasant Vihar High School & Jr. College` → tagged **College / University**
    - `DLH Orchid` → tagged **Hotel / Resort**
  - Tagging itself looks correct (good), but the **filter is not constraining results to the selected type**.
- **Likely root cause:**
  - Discovery pipeline (`/app/backend/building_discovery.py`) may be running an OSM Overpass query that's too broad, and Google Places enrichment then re-classifies the building into another category — but we don't re-filter post-enrichment.
  - Or, the `building_type` param isn't translating to the right OSM `amenity`/`shop`/`landuse` tag.
- **Files to investigate:**
  - `/app/backend/building_discovery.py` — `discover_buildings(...)` function, OSM Overpass query, and post-enrichment filter step
  - `/app/backend/server.py` — `/api/admin/discover` route handler
- **Environment:** PRODUCTION (https://sus10.ai/admin/discover)

#### B1.4 — Filter UX needs an "expansion" / cleanup
- **What user said:** "the expansion of filters needs a nice fix"
- **Interpretation (to confirm with user):**
  - Allow **multi-select** building types (e.g., Mall + Hotel + IT Park in one query)?
  - Add a **"Strict type match"** toggle for cases where post-enrichment reclassification should still exclude the building?
  - Add **state / region** above city for multi-city sweeps?
  - Group filters with clearer headings (Location / Building / Sizing)?
- **Open: please confirm which of the above you want.**

#### B1.5 — Admin Buildings table: no Reject action, no top filters, infinite scroll
- **Page:** `/admin` → Buildings tab (Building Management)
- **Problems:**
  1. **Infinite scroll** through 27+ pending buildings — hard to triage.
  2. **No top filter bar** to narrow by City / Type / Area / Status before triaging.
  3. **No "Reject" action** in the row Actions column. Today there's only the green tick (Approve) and `>` (drill-down). User wants to reject (with optional reason) so the discovery pipeline doesn't keep resurfacing the same junk.
  4. Bulk-action support is missing — can't approve/reject many rows at once.
- **Asks:**
  - Add a **filter bar at the top** of the Buildings tab: City (search/typeahead), Type (multi-select), Area range, Status (Pending / Approved / Rejected).
  - Add **Reject** action per row + a **bulk approve / bulk reject** capability (checkbox selection + sticky action footer).
  - Paginate or virtualize the list (drop infinite scroll).
- **Files to investigate:**
  - `/app/frontend/src/pages/AdminPage.js` or the Buildings tab component
  - `/app/backend/server.py` — admin building list + add a `/api/admin/buildings/{id}/reject` endpoint with `{reason}` payload; ensure rejected IDs are excluded from re-discovery.

#### B1.6 — Capture building intelligence notes (e.g., skyscraper wind-load caveats)
- **Insight from user:** Very tall skyscrapers may not be ideal for plantation unless their roof is engineered for it — wind speeds at height are damaging.
- **Ask:** Provide a way to **record notes / qualifiers per building** and persist them as **backend intelligence** so they:
  - show up on the building report,
  - influence solution recommendations (e.g., downrank rooftop plantation for buildings tagged `high_wind_exposure`),
  - and accumulate as a knowledge base over time.
- **Suggested data model (to confirm):**
  - New field on `buildings`: `intel_notes: [{ tag: 'wind_exposure', note: 'High-rise > 30 floors; not ideal for plantation without parapet/windbreak', severity: 'medium', author: 'admin@…', created_at }]`
  - Optional curated tag dictionary: `high_wind_exposure`, `weak_slab`, `heritage_protected`, `gov_approval_required`, `flood_prone`, etc.
- **UX:** Add a "Notes / Intelligence" section on the admin building detail page + show as warning badges on the public Building Report.

#### B1.7 — Recently discovered buildings not appearing in Admin → Buildings (approval list)
- **Reproduction:** User ran `/admin/discover` for Mumbai shopping malls → 27 buildings imported (Evershine Mall, Hari Om Sarees, Croma Ghodbunder, DLH Orchid, Vasant Vihar, etc. visible on the Discover page). Switched to `/admin` → Buildings tab → **the newly imported malls are not visible** in the table.
- **Also observed on same screen:** No record count shown, no pagination — table appears to be a single long scroll.
- **Likely root causes (to confirm during fix):**
  - Default sort is not `created_at desc` → new records are pushed to the bottom of an already-long list and clipped by an implicit query limit.
  - Backend list endpoint has a hard limit (e.g., `.find().limit(50)`) so anything past N is silently dropped.
  - Discover writes to a different collection / different `status` filter than what the admin Buildings list reads from.
- **Files to investigate:**
  - `/app/backend/server.py` — list endpoint for admin buildings (likely `GET /api/admin/buildings`).
  - `/app/backend/building_discovery.py` — confirm `status` and `created_at` set on import.
  - Frontend admin Buildings tab component — confirm sort + how it requests results.
- **Asks (related to B1.5):**
  - Add **total record count** at the top of the table (e.g., "Showing 1–50 of 312 buildings").
  - Add **pagination** (server-side, 25/50/100 per page) — or virtualized scroll with proper batching.
  - Default sort: **newest first** (`created_at desc`), with column sort toggles.
- **Environment:** PRODUCTION (https://sus10.ai/admin)

#### B1.1 — Data mismatch between Home screen and Explainability tab
- **What works:** Home screen correctly updated the terrace measurement to **96 sqm** after the user drew the boundaries on the map.
- **What's broken:** The **Explainability tab** shows **10 sqft** and runs calculations against that stale/wrong value.
- **Likely root cause:** The Explainability tab is reading a different field (probably `usable_terrace_area` default or an un-synced `custom_terrace_area`) than the Home/Report header. Units may also be mismatched (sqft vs sqm).
- **Files to investigate:**
  - `/app/frontend/src/pages/BuildingReportPage.js` — Explainability tab, terrace area binding
  - `/app/backend/services/sustenance_calculator.py` — which area field is consumed
  - Polygon-edit `onSave` handler in `BuildingMap.js`
- **Environment reported on:** TBD (need to confirm preview vs production)

#### B1.2 — Downloaded PDF report has miscalculations and abrupt/garbled text
- **What's broken:**
  - Numerical calculations in the PDF don't match the on-screen values (likely same root cause as B1.1 — area mismatch propagating downstream).
  - Body text is "abrupt" — likely template/string truncation, missing variable interpolations, or markdown not rendering cleanly in the PDF renderer.
- **Action needed:**
  - Audit the PDF generator service (currently TBD — confirm if there's a working PDF endpoint or if this refers to the HTML-printed report).
  - Fix template text + ensure single source of truth for the terrace area used in calculations.

---

### ✨ Enhancement requests

#### E1.3 — Replace hardcoded city dropdown on /admin/discover with a searchable autocomplete
- **Page:** `/admin/discover` (Admin → Discover Buildings)
- **Problem:** City list is hardcoded with ~100+ entries. Scrolling through a long static list is a bad long-term UX.
- **Ask:** Replace with a **search/typeahead field** — type a city name, get filtered results, select one.
- **Decision (confirmed by user):** Option (a) — client-side searchable combobox over the existing static list.
- **Implementation notes:**
  - Frontend: swap the `<Select>` for a `Combobox` / `Command` pattern (Shadcn `command.jsx` already in repo).
  - Keep the same static city list; just make it filterable by typing.
- **Files to investigate:**
  - `/app/frontend/src/pages/AdminDiscoverPage.js` (or wherever the discover form lives)
  - Existing Shadcn `/app/frontend/src/components/ui/command.jsx`
- **Environment reported on:** PRODUCTION (https://sus10.ai/admin/discover)

#### E1.1 — Configurable PDF report structure with user-type toggles
- **Idea:** Add toggles in the report download dialog to include/exclude sections based on the user's audience.
- **Suggested user types (to confirm with user):**
  - **Building Owner / Resident Welfare Association (RWA)** → full feasibility + cost-payback
  - **Solution Provider** → leads-focused, technical specs
  - **Corporate ESG / CSR** → BRSR rollup, CO₂ sequestration, narrative
  - **Policy / NGO** → public-impact framing, no commercial costs
- **Suggested toggle sections:**
  - Cover page / executive summary
  - 4-pillar Sustenance summary (Solar, Plantation, Biogas, Rainwater)
  - Solar deep-dive (panel count, kWp, ROI)
  - Plantation / Green roof deep-dive
  - Biogas deep-dive
  - Rainwater harvesting
  - Gemini rooftop AI visual analysis (9-slide carousel)
  - Heat island / temperature reduction
  - AQI & co-benefits
  - Costs & ROI / payback
  - Provider recommendations / CTA
  - BRSR / ESG narrative (enterprise-only)
- **Implementation note:** Persist last-used toggle preset per user.

#### E1.2 — New "Sustenance Potential at a Glance" screen
- **What user wants:** A single consolidated screen where the building's sustenance potential is visible in one view (no clicking through tabs).
- **Confirmed contents (4 pillars, all included):**
  1. **Solar** — power generation potential based on usable area.
  2. **Biogas** — based on kitchen waste; **adjustable** with user input (avg kitchen waste in kg/family or kg/apartment per day).
  3. **Rainwater harvesting** — annual capture potential.
  4. **Greening + composting** — green-roof / terrace garden CO₂ sequestration + on-site composting throughput.
- **Confirmed UX:**
  - **Separate top-level page** (not a tab on the Building Report).
  - Each pillar is a **widget**; clicking a widget drills down into the corresponding **solution details / deep-dive**.
- **Open items (to confirm later):**
  - Default kitchen-waste assumption for biogas (0.5 vs 1.0 kg/family/day).
  - Aggregate "annual impact" headline strip (₹ saved, tonnes CO₂, MWh, kL water) — yes/no?
  - URL/route name (e.g., `/buildings/:id/potential` or `/potential/:id`).
  - Entry points (link from Building card, Report header, Dashboard?).

---

### 📋 Open questions for user (ask in next prioritization round)
1. **Environment**: Are B1.1 and B1.2 seen on PREVIEW or PRODUCTION (https://sus10.ai)?
2. **User types** for E1.1 — please confirm or expand the list above.
3. **Default kitchen-waste assumption** for E1.2 biogas — should we default to (a) 0.5 kg/family/day, (b) 1.0 kg/family/day, or (c) something else from CPCB norms?
4. For E1.2, where in the navigation should this new screen live? (e.g., a new tab on the Building Report page, or a top-level "Potential" page on the Building card?)

---

### Priority placeholders (user will confirm)
- [x] B1.1 — Home vs Explainability tab area mismatch  →  **P0 — ✅ FIXED**
- [x] B1.2 — PDF report miscalculations & abrupt text →  **✅ FIXED** (server-side WeasyPrint, persona-tuned)
- [x] E1.1 — Persona-tuned PDF report →  **✅ DONE** (4 personas × 7 section toggles)
- [x] N12 — "Email me this PDF" capture →  **✅ DONE** (Sustenance Potential page; emails join beta_waitlist)
- [ ] N12b — Wire Resend / SendGrid for actual email delivery →  P1 (currently MOCKED — user gets download URL)
- [x] B1.3 — Building Type filter not respected on /admin/discover →  **P0 — ✅ FIXED** (strict_type toggle, post-enrichment filter)
- [x] B1.4 — Filter UX expansion (multi-select, strict match, etc.) →  **P0 — ✅ DONE** (chip multi-select + strict-type)
- [x] B1.5 — Admin Buildings: top filters + Reject + bulk actions + pagination →  **P0 — ✅ DONE**
- [x] B1.6 — Building intelligence notes (wind, slab, heritage, etc.) →  **P1 — ✅ backend DONE** (admin per-building UI pending)
- [x] B1.7 — Discover imports not showing in Admin → Buildings list →  **P0 — ✅ FIXED**
- [x] B1.8 — Admin IA: Internal Console sidebar + CMS/Projects/Initiatives/Leads links →  **P0 — ✅ DONE**
- [x] E1.1 — Persona-tuned PDF report                →  **✅ DONE** (server-side WeasyPrint)
- [x] E1.2 — Sustenance Potential at-a-glance screen →  **P1 — ✅ DONE** (`/buildings/:id/potential`)
- [x] E1.3 — Searchable city autocomplete on /admin/discover →  **P0 — ✅ DONE**
- [x] N1  — 4 persona teaser landing pages (in CMS) →  **P0 — ✅ DONE**
- [ ] N2  — Persona-aware homepage / smart router →  partial (cards on `/`)
- [ ] N3  — "Design it for me" AI generator (paid) →  P1
- [ ] N4  — Material checklist / BOQ generator (paid) →  P2
- [ ] N5  — Import Garden Design module →  hold per user
- [x] N6  — Subsidies & Financing Navigator →  **✅ DONE** (15 entries seeded · public /subsidies · admin CRUD)
- [ ] N7  — Vendor proposal/scoping tools →  P2
- [ ] N8  — Razorpay integration →  post-validation
- [ ] N9  — Project-credit entitlement model →  P1
- [x] N10 — Pre-launch beta waitlist collector →  **P0 — ✅ DONE**
- [x] N11 — Admin Audit Log →  **✅ DONE** (`/admin/audit` + audit calls in approve/reject/bulk/intel)

> Phase 0 + P0 IA reorg test reports: iteration_8.json, iteration_9.json, iteration_10.json (all PASS).
> Phase 1–4 reports: iteration_11–14.json (audit log + sustenance potential + subsidies + persona PDF — all PASS).

---

## 🚀 Phase 5 — Production deploy + test (USER, Feb 19, 2026)
*User is taking the build to production and testing manually before next dev turn.*

### Backlog — enhancements queued for next dev turn (approved by user)
- [ ] **E2 — PDF funnel analytics rollup** — `GET /api/admin/pdf-funnel-stats` aggregating `pdf_email_requests` by persona × city × building_type × sections. Chart strip on `/admin` Overview. Surfaces highest-intent persona/geo combos for marketing focus.
- [ ] **N12b — Wire Resend (or SendGrid) for real email delivery** — Replace the MOCKED "we'll email it shortly" with actual delivery. ~30–60 lines + API key. Mark `delivered:true` + `delivered_at` in `pdf_email_requests`, retry on failure.
- [ ] **E3 — Verify matched-subsidies block in PDF** — Already in the template; confirm during deploy testing that production users see the right list per state/building type.

### Backlog — Priorities (refreshed)
- **P1 (next dev turn):** E2 · N12b · B1.6 admin UI for per-building intel notes
- **P2:** N9 project credits · N3 "Design it for me" AI · N4 BOQ checklist · public-beta guardrails (rate limits + cost ceilings + Cloudflare Turnstile)
- **P3:** N8 Razorpay · N5 Garden Design import (hold) · AQI forecast · drawing parser · provider dashboard

---
