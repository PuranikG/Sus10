# Sus10 AI — User Feedback & Bug Log

> Running log of user-reported feedback, bugs, and enhancement ideas. Items here are NOT yet prioritized; user will confirm priorities in a later message.

---

## Batch 1 — Feb 19, 2026 (post-deployment review)

### 🐛 Bugs

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
- [ ] E1.1 — Report toggles by user type            →  P?
- [ ] E1.2 — Sustenance Potential at-a-glance screen →  P?

---
