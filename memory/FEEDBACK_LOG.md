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
- [ ] B1.1 — Home vs Explainability tab area mismatch  →  P?
- [ ] B1.2 — PDF report miscalculations & abrupt text  →  P?
- [ ] B1.3 — Building Type filter not respected on /admin/discover →  P?
- [ ] B1.4 — Filter UX expansion (multi-select, strict match, etc.) →  P?
- [ ] E1.1 — Report toggles by user type            →  P?
- [ ] E1.2 — Sustenance Potential at-a-glance screen →  P?
- [ ] E1.3 — Searchable city autocomplete on /admin/discover →  P?

---
