# Sus10 AI - Product Requirements Document

## Overview
Sus10 AI is a hyperlocal climate action platform that analyzes buildings for green potential, connects to solution providers, and builds community initiatives.

## Target Users
1. **Homeowners (Citizens)** — individuals exploring their rooftop's full integrated potential.
2. **RWAs / Housing Societies** — coordinating multi-unit greening.
3. **Solution Providers (Installers)** — verified vendors taking warm leads.
4. **Corporate / CSR / ESG teams** — BRSR Principle-6 disclosure rollups.

## What's Been Implemented (Feb 19–May 19, 2026)

### Session May 19, 2026 — Homeowner Calculator-first MVP ✅
- **Homeowner journey reordered around `/calculate`** — landing → calculator → integrated potential → PDF + vendor consult.
- **New page `SustenanceCalculatorPage`** with intake form (address, city auto-detects state, building type, roof area, floors, family size, optional bills + name/email).
- **New backend `POST /api/calculate/quick-potential`** creates a lightweight self-submitted building (`status=self_submitted`, `data_source=homeowner_calculator`, `usable_terrace_area=roof_area×0.8`) and auto-joins email to beta_waitlist as `persona=calculator-homeowner` lead. Returns `{building_id, redirect_to}`.
- **Narrative hero on `/buildings/:id/potential`** — backend now emits a `narrative` object with markdown headline ("If X activated its full potential, it would offset 17t CO₂… same as taking 4 cars off Bengaluru's roads… while saving ₹1.5L"), chips, cars-equivalent (4.6 t/car), households-water-equivalent (135 L × 4 × 365).
- **Readability fixes** — silver/white KPI strip + biogas card on Potential page, and Subsidies hero, replaced with dark glass-morphism + high-contrast text.
- **Matched-subsidies strip on full Building Report** (Option A from quick-wins list) — calls `/api/subsidies/match/{id}`, surfaces 1-4 best matches with Up-to-₹X amounts, links to filtered `/subsidies`.
- **Admin production-seed buttons** in `/admin` — `POST /api/admin/cms/seed-persona-teasers` (4 landing pages) and `POST /api/admin/subsidies/seed` (~15 entries), idempotent subprocess calls with audit log + 403 for non-admin.
- **Sticky Discover & Import CTA** on `/admin/discover` (was hidden below the fold).
- **Navbar** — new highlighted "✨ Calculate" link as primary entry point.
- **LandingPage hero** — green "Calculate your roof potential" CTA next to address search.
- **Homeowner persona card** on home now points directly to `/calculate` instead of the survey.
- **Bugfix:** `subprocess.run(['python', …])` was crashing in container because `/usr/bin/python3.11` lacks pymongo. Switched to `sys.executable`. Also fixed `record_audit(details=…)` → `metadata=…` typo.
- **Testing:** iteration_15.json — 9/9 backend pytest pass, all frontend flows verified.

### Accumulated user feedback (FEEDBACK_LOG.md) deferred to next session
- P1: Polygon vertex clutter on Building Report map — read-only default + Edit-shape toggle + Douglas-Peucker simplification.
- P1: IA route swap — make `/buildings/:id` redirect to `/buildings/:id/potential` (currently both routes exist side by side).
- P1: Original Options B (intel badges), C (PDF funnel analytics), D (admin intel notes editor).
- P1: Resend wiring for actual PDF email delivery (currently MOCKED).
- P2: Proactive per-building subsidy eligibility engine (✅/⚠️/❌ per pillar) per Item #3c.
- P2: Monthly policy watchlist cron (~5 starter cities).
- P2: OpenSolar iframe handoff on Solar pillar detail (referral partner only — drop BOQ ambitions).
- P2: Vendor one-pager "Integrated Sustenance Roof Offering" PDF template.
- P3: `backend/server.py` modularization (now 3849 lines).

---
## Pre-existing implementation (Feb 19–20, 2026)


### Phase 4 — Persona-tuned PDF report + "Email me this PDF" (Feb 19, 2026) ✅
- **Server-side PDF rendering** via Jinja2 + WeasyPrint (cleaner typography, exact CSS, no client-side jsPDF "abrupt text" issues).
- **Template** `/app/backend/templates/report.html` — cover (persona-tinted gradient), executive summary, KPI grid, 4-pillar cards (Solar, Plantation, Biogas, Rainwater), intel-notes callout, matched-subsidies block, persona-specific action checklist, methodology.
- **4 personas**: `citizen_owner` (monthly savings + next steps), `rwa` (committee AGM checklist + GHS CFA), `provider` (technical scoping + warm-lead context), `corporate_esg` (BRSR Principle-6 alignment).
- **Section toggles**: 7 toggleable sections (summary, solar, plantation, biogas, rainwater, subsidies, methodology) — each persona has sensible defaults.
- **Backend endpoints:**
  - `GET /api/buildings/{id}/report.pdf?persona=&sections=&families=&waste_kg_per_family_per_day=` — inline PDF stream.
  - `POST /api/buildings/{id}/report-email` — generates PDF, stores in `pdf_uploads`, returns download URL, auto-joins email to `beta_waitlist` with `persona='pdf-request'`.
  - `GET /api/pdf-reports/{upload_id}` — public PDF serve.
  - `GET /api/admin/pdf-email-requests` — admin warm-lead funnel.
- **Frontend** `ReportDownloadDialog` (shared, two modes: download + email):
  - Building Report `download-report-btn` → opens download mode.
  - Sustenance Potential `email-me-pdf-btn` → opens email mode with name/email fields → success state with direct download link.
- **Matched subsidies auto-attach** in the PDF for personas that include the section.
- **Testing:** iteration_14.json — 14/14 backend pytests + frontend flows verified via pdfminer text extraction.
- **NOTE:** Email delivery itself is MOCKED (no Resend integration yet) — the user gets a download URL in the success screen. Wire Resend in a later turn when ready.

### Phase 3 — Subsidies & Financing Navigator (Feb 19, 2026) ✅ (N6)
- **Public `/subsidies` page** with hero ("Money you might be leaving on the table"), 4-axis filter bar (search, category, type, state), 15 curated entries seeded from PMSGMBY + MNRE + state DISCOMs + 4 bank-loan products. Card click opens a markdown-rich dialog with "Apply on official portal" CTA.
- **Backend** `GET /api/subsidies`, `GET /api/subsidies/match/{building_id}` (state + type-eligible matching), full admin CRUD `/api/admin/subsidies` with audit-log entries (`subsidy.create/update/delete`).
- **Admin curation** at `/admin/subsidies` (sidebar nav under Data) — editor dialog with category chips, scope, max amount, rate, markdown details, documents required, active toggle.
- **Entry points** added: public Navbar "Subsidies" link · Building Report `view-subsidies-btn`.
- **Seeded** (verify before publishing): PMSGMBY CFA, PMSGMBY GHS/RWA, PM-KUSUM-B, MahaUrja, BESCOM net-metering, TANGEDCO, AMRUT 2.0 RWH, BBMP RWH compliance, MNRE Waste-to-Energy, GRIHA/IGBC rebates, Accelerated Depreciation, SBI/UBI/Canara/PNB rooftop solar loans.
- **Testing:** iteration_13.json — 12/12 backend pytests + frontend flows verified.

### Phase 2 — Audit Log + Sustenance Potential at-a-glance (Feb 19, 2026) ✅
- **`/admin/audit`** — Internal Console page tracking every admin mutation. Backend `admin_audit_log` collection + `record_audit()` helper wired into approve/reject/bulk-action/intel.add endpoints. Filterable list with pagination.
- **`/buildings/:id/potential`** — new top-level page (E1.2). 4 widget cards (Solar, Biogas, Rainwater Harvesting, Greening & Plantation), each clickable → solution detail. Headline strip shows total annual savings, CO₂ avoided, solar kWh, rainwater kL.
- **Adjustable biogas inputs** — sliders for families × kitchen-waste (kg/family/day). Default 10 families × 0.5 kg per CPCB norms. Widget updates live as user tweaks.
- Backend `GET /api/buildings/{id}/potential` returns `{building, widgets, summary, pillars, inputs}` shape. `calculate_biogas_potential` extended with `families` + `waste_kg_per_family_per_day` overrides.
- **`view-potential-btn`** added to Building Report so users can hop to the at-a-glance view.
- **Testing:** iteration_11.json + iteration_12.json — 16/16 backend, frontend slider live-updates verified.

### Phase 1 — P0 IA reorg + admin buildings overhaul (Feb 19, 2026) ✅
- **Internal Console** with collapsible sidebar (`/app/frontend/src/components/layout/AdminShell.js`) — sections Overview / Data / Engagement / Content / Customers / Settings.
- New admin routes: `/admin` (overview with stat cards + persona-waitlist breakdown), `/admin/buildings`, `/admin/waitlist`, `/admin/zoho-surveys`, `/admin/feature-flags`, `/admin/projects`, `/admin/initiatives`, `/admin/leads`, `/admin/intelligence`. Old `/admin` moved to `/admin/legacy`.
- **B1.5** Buildings overhaul: status tabs (Pending/Approved/Rejected/All) with counts, type-chip multi-select, address/city search, sort options, per-row Approve + Reject, bulk Approve + bulk Reject via checkboxes + sticky action bar, server-side pagination.
- **B1.3 + B1.4** Discover overhaul: multi-select Type chips (runs discovery once per type and combines), `strict_type` toggle (default ON) that excludes buildings re-classified by Google Places, and `skipped_type_mismatch` counter in response.
- **E1.3** Searchable city combobox on /admin/discover with 33 Indian cities (Shadcn `command` + `popover`).
- **B1.6** (backend done): `intel_notes` array on buildings, curated tag vocabulary (`high_wind_exposure`, `weak_slab`, `heritage_protected`…), admin CRUD endpoints + public read.
- New backend endpoints: `PUT /api/admin/buildings/{id}/reject`, `POST /api/admin/buildings/bulk-action`, intel CRUD, `GET /api/admin/buildings` now returns `{buildings, total, page, limit, sort, counts}`.
- **Testing:** iteration_9.json + iteration_10.json — 21/21 backend pass, all frontend acceptance criteria met.

### Phase 0 — Pre-launch teasers + critical bug fixes (Feb 19, 2026) ✅
- **4 persona teaser CMS pages** seeded into `cms_pages` (editable from /admin/cms):
  - `/for-homeowners` (citizen-aspirational)
  - `/for-homeowners-heat-action` (citizen-crisis)
  - `/for-communities` (RWA)
  - `/for-installers` (vendor)
  - Each has hero, badges, 4 benefit cards, intro markdown, body markdown, Zoho survey iframe, and inline `WaitlistForm`.
- **Inline `WaitlistForm` component** (`/app/frontend/src/components/cms/WaitlistForm.js`) — persona-aware copy, success state, captures name/email/city/source.
- **CMS schema** extended with optional `waitlist_persona` field. `CmsPage.js` auto-renders the form when set.
- **Persona switcher cards** on `/` (`data-testid="persona-switcher"`) — 4 entry points to the teasers.
- **Backend `/api/beta-waitlist`** (public POST) + **`/api/admin/beta-waitlist`** (admin GET with by-persona breakdown).
- **Backend `/api/webhooks/zoho-survey`** (public POST) accepts any Zoho payload; auto-extracts email and joins to waitlist. `/api/admin/zoho-survey-responses` to read all.
- **B1.1 FIX** — `PATCH /api/buildings/{id}/terrace` now calls new `regenerate_recommendations_for_building` helper. Solution recs + audit logs reflect the latest polygon area (Explainability tab no longer stale).
- **B1.7 FIX** — `GET /api/admin/buildings` now returns `{buildings, total, limit, sort}`; default sort `created_at_desc`; limit up to 2000. Admin UI shows `Showing X of Y buildings (newest first)`.
- **Testing:** `/app/test_reports/iteration_8.json` → 18/18 backend + frontend criteria passed, 0 issues.

### Private Beta Allowlist (Feb 19, 2026) ✅
- Added env-driven sign-in allowlist for production beta:
  - `AUTH_ALLOWLIST_ENABLED=true`
  - `AUTH_ALLOWLIST_EMAILS=gp@sus10.ai,vgpuranik@gmail.com,urjacity@gmail.com,shivani@sus10.ai,gaurav.a.puranik@gmail.com`
  - `AUTH_CONTACT_EMAIL=hello@sus10.ai`
- Backend `/api/auth/session` rejects non-allowlisted emails with HTTP 403 + `{code: "private_beta", message, contact_email}`.
- Frontend `AuthCallback.js` renders a friendly Private Beta screen with a `Contact us for access` mailto button + Back to Home.
- Verified `/green-roof` CMS landing page is published and renders correctly (was never missing, present in `cms_pages` collection).

### Backend (FastAPI + MongoDB)
- ✅ User authentication via Emergent Google OAuth
- ✅ Buildings CRUD with search/filtering
- ✅ Solution recommendations engine
- ✅ Provider management & verification
- ✅ Lead creation & tracking
- ✅ Initiatives & pledges system
- ✅ Feature flags management
- ✅ Admin endpoints for data curation
- ✅ Stats/metrics API

### Frontend (React + Tailwind + Shadcn)
- ✅ Landing page with hero, search, stats
- ✅ Building search with city/type filters
- ✅ Building report with tabs (Overview, Solutions, Explainability, Providers)
- ✅ Provider listing with search/filters
- ✅ Provider detail with portfolio/certifications
- ✅ Initiatives listing with funding progress
- ✅ Initiative detail with pledges/milestones
- ✅ Dashboard (protected)
- ✅ Admin panel with feature flags (protected)
- ✅ Lead form (protected)
- ✅ Dark/Light mode toggle

### Seed Data
- 8 commercial buildings (Delhi NCR, Mumbai, Pune)
- 3 solution types (Terrace Greening, Rooftop Solar, Rainwater Harvesting)
- 1 verified provider (GreenScape Solutions)
- 1 community initiative (Green Gurugram 2025)
- 6 feature flags

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [x] Google Places API integration (Address Autocomplete) ✅ Feb 20, 2026
- [ ] Google Air Quality API integration (Real-time AQI)
- [ ] Google Maps JavaScript API (Map view for search results)
- [x] PDF report generation ✅

### P1 - High Priority
- [ ] Provider onboarding wizard
- [ ] Initiative creation wizard
- [ ] Email notifications for leads
- [ ] Provider review system

### P2 - Medium Priority
- [ ] Enable Blog module
- [ ] Enable Forum module
- [ ] Enable Gamification module
- [ ] Mobile responsiveness polish
- [ ] SEO optimization

### P3 - Nice to Have
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Integration with CSR platforms

## Technical Stack
- **Frontend**: React 18, Tailwind CSS, Shadcn/UI, Framer Motion, Recharts
- **Backend**: FastAPI, Motor (MongoDB async)
- **Database**: MongoDB
- **Auth**: Emergent Google OAuth
- **Hosting**: Emergent Platform

## Key URLs
- Frontend: https://sus10-preview.preview.emergentagent.com
- Backend API: https://sus10-preview.preview.emergentagent.com/api

## Recent Updates (Feb 19, 2026 - Feature Addition)

### WhatsApp & Email Sharing ✅
- Added share dropdown to Building Reports with:
  - WhatsApp sharing (opens wa.me with pre-formatted message)
  - Email sharing (mailto: with subject and body)
  - Copy Link functionality
- Added share dropdown to Initiative Detail pages
- Share messages include:
  - Building: Green potential score, location, AQI, CO2 impact
  - Initiative: Funding progress, impact goal, call to action

### Share Message Format
**Building Report:**
```
🌿 DLF Cyber City, Tower A has 75.5% green potential!
📍 Location: Gurugram
🏢 Type: IT Park
🌱 Terrace Area: 3,500 sqm
💨 Current AQI: 156
🌳 Potential CO2 Sequestration: 12,250 kg/year

Check out the full report on Sus10 AI: [URL]
```

**Initiative:**
```
🌿 Join "Green Gurugram 2025" - a community initiative for climate action!
📍 Area: Gurugram
💰 Progress: ₹12,50,000 raised (25% of goal)
🎯 Goal: 100 rooftops_greened

Every pledge counts! Join us on Sus10 AI: [URL]
```

## Feature Addition (Feb 19, 2026)

### PDF Report Generation ✅
- Professional 5-page PDF reports using jsPDF + jspdf-autotable
- Pages: Cover/Overview → Solutions → Impact Projections → Explainability → Providers
- Features:
  - Building metrics (footprint, terrace area, AQI, data quality)
  - Green potential score visualization
  - Solution recommendations with suitability scores
  - Impact projections table with confidence levels
  - Full calculation methodology breakdown
  - Provider recommendations with ratings
- Download filename: `Sus10_Report_{building_id}_{date}.pdf`

### Blog/Resources Module ✅ (Feature Flag: blog)
- Sustainability Knowledge Hub with 4 seeded articles
- Categories: Guides, Case Studies, News, Sustainability
- Features:
  - Search and category filtering
  - Featured images with lazy loading
  - View counts and publish dates
  - WhatsApp/Email sharing per article
  - SEO-friendly slugs

### Seeded Blog Content:
1. "Complete Guide to Rooftop Greening in Indian Cities" (Guide)
2. "Case Study: How DLF Cyber Hub Achieved 40% Energy Savings" (Case Study)
3. "Understanding AQI: What Building Managers Need to Know" (Sustainability)
4. "New Government Incentives for Green Buildings in 2026" (News)

### Forum Module ✅ (Feature Flag: forum)
- Initiative-specific discussion forums
- Enabled but requires authenticated users to post

## Feature Addition (Feb 20, 2026)

### Google Places API Address Autocomplete ✅
- Integrated new Google Places API (AutocompleteSuggestion.fetchAutocompleteSuggestions)
- Features:
  - Real-time address suggestions as user types (3+ characters)
  - Results restricted to India
  - Auto-detects city from selected address and updates filter
  - "Powered by Google" branding displayed
  - Debounced API calls (300ms) for performance
  - Smooth dropdown animation with Framer Motion
- Implementation notes:
  - Uses new Places API (legacy AutocompleteService deprecated for new customers as of March 2025)
  - Custom React hook `usePlacesAutocompleteNew()` in BuildingSearchPage.js
  - API key loaded via script tag in index.html

### Admin Building Discovery ✅ (Feb 20, 2026)
- **P0 Bug Fixed**: Admin building discovery feature now works
- **Root Cause**: Motor/PyMongo database objects don't implement `__bool__()`, causing error with `if db:` check
- **Fix Applied**: Changed `if db:` to `if db is not None:` in building_discovery.py
- **Features**:
  - Discovers buildings from OpenStreetMap Overpass API
  - Auto-enriches with Google Places API (name, address, place_id)
  - Calculates terrace area based on building type ratios
  - Deduplicates by OSM ID and lat/lng proximity
  - Supported cities: Gurugram, Delhi, Noida, Faridabad, Ghaziabad, Mumbai, Navi Mumbai, Pune, Amravati

### Building Report Page Enhancements ✅ (Feb 20, 2026)
- **Interactive Map with Polygon**: Shows building footprint as editable polygon (not just a pin)
- **CO₂ Speedometer Gauge**: Recharts-based visualization of CO₂ sequestration potential
- **Terrace Garden Planner**: 
  - Slider to adjust plantable area percentage
  - Dynamic impact cards (CO₂, water usage, cost estimates)
  - City-specific, terrace-appropriate plant recommendations (small trees/shrubs only)
- **Temperature Reduction Model**: 
  - Calculated based on plant coverage (not hardcoded)
  - "How is this calculated?" modal with scientific methodology

## Research Notes

### Google Solar API - India Coverage (Feb 20, 2026)
- **Finding**: Google Solar API does NOT currently have data for Indian cities
- **Test Results**: All major Indian cities return 404 NOT_FOUND (Delhi, Mumbai, Bangalore, Gurugram, Hyderabad, Pune, Chennai, Noida)
- **Confirmed Working**: US locations (e.g., San Francisco) return full building insights data
- **Status**: Despite Google's announcement of Global South expansion (including India), Solar API data appears to be experimental/limited rollout only
- **Recommendation**: Continue using OpenStreetMap + Google Places for building data. Monitor Solar API coverage expansion for future integration

## Prioritized Backlog (Updated Feb 20, 2026)

### P0 - Critical
- [x] Admin Building Discovery Bug Fix ✅
- [x] Google Places API integration ✅
- [x] Live Air Quality API integration ✅ (Open-Meteo API)

### P1 - High Priority
- [ ] Editable map polygon for custom terrace area measurements
- [ ] Provider onboarding wizard
- [ ] Email notifications for leads

### P2 - Medium Priority
- [ ] Google Solar API integration (when India coverage available)
- [ ] PDF/DWG file parsing for building footprints
- [ ] Crowdsourcing model for user-submitted buildings
- [ ] Provider Dashboard for lead management
- [ ] Gamification features

### Technical Debt
- [ ] Refactor server.py monolith into /routes, /models, /services structure
- [ ] Fix Babel plugin workaround in frontend/config-overrides.js

## Feature Update (Feb 12, 2026 — evening)

### 🎨 Multi-Slide PPT-Style Visual Report (REDESIGNED) ✅
Replaced single dense annotated image with **PPT-style multi-slide carousel**:
- **9 categorical slides per building** (Overview, Water Tanks, AC Chillers, Vent Stacks, Solar Panels, Stairwells, Antennas, Shadows, Recommended Zones)
- Slides automatically skipped when count = 0
- **Thin colored borders only** — no text labels covering the image
- **Numbered circle markers** (1, 2, 3...) for each detected object
- **PPT chrome**: title strip · description · count badge · summary · scale bar
- **Carousel UI**: tab strip + arrow buttons + "Download Slide" / "Download All" buttons
- Each slide is download-ready as a publication-grade JPEG (~150 KB)
- Use case: engineers can flip through slides during site reviews, embed individual slides in feasibility reports

**Backend:** `services/rooftop_image_annotator.py` rewritten with `annotate_rooftop_slides()` returning `List[Dict]` of {id, title, description, image_b64, count, summary_lines}
**Frontend:** `GeminiAnalysisDialog` redesigned with carousel state, tab strip, prev/next buttons

### 🧠 Gemini Vision Rooftop Analysis (NEW) ✅
- **Service**: `/app/backend/services/gemini_rooftop_analyzer.py`
- **Model**: Gemini 2.5 Flash via Emergent LLM key (~$0.002/analysis)
- **Imagery source**: Esri World Imagery (XYZ tiles stitched at zoom 19, ~0.3 m/pixel) — chosen because Google Static Maps API requires separate activation. Graceful fallback to Google Static Maps if/when enabled.
- **Endpoint**: `POST /api/sustenance/building/{building_id}/gemini-analyze` (auth required, 24h cache)
- **Returns**: structured JSON with `detected_objects`, `building_boundary_box`, `shadow_regions`, `usable_for_solar_pct`, `usable_for_plantation_pct`, `recommended_zones`, `confidence_score`
- **Tested on 3 Incubex buildings** with realistic diversified outputs (HSROHQ: 7 objects, Manyata: 39 objects, KRM1: 6 objects + 3 tree shadows)

### 🎨 Visual Rooftop Annotator (NEW) ✅
- **Service**: `/app/backend/services/rooftop_image_annotator.py`
- **Outputs publication-grade annotated JPEG** with:
  - **Blue building footprint outline** (from actual Google geocoding polygon — pixel-accurate via lat/lng→pixel projection)
  - **Color-coded bounding boxes** per obstruction type (water tank cyan, AC red, vent orange, solar purple, antenna yellow, stairwell gray)
  - **Real-world measurements in meters** (computed from Web Mercator m/px at zoom 19, latitude-corrected)
  - **Semi-transparent shadow overlays** with source label ("adjacent taller building" / "trees" / "self_shadow")
  - **Title strip** with model name + usable solar/plantation/confidence
  - **Bottom legend** with color key, detected counts, scale bar (10m)
  - **Label de-overlap heuristic** (try above → below → inside) for dense rooftops
- **Frontend integration**: Image displayed in Gemini dialog with Download button (JPEG export)

### 🐞 Bug Fixes
- **Terrace area sync**: Custom polygon edits now propagate to `usable_terrace_area` field (was stale at 70% of footprint). Frontend now initializes `customTerraceArea` from saved value on load.
- **Smart back button**: `BuildingReportPage` now uses browser history (`navigate(-1)`) to return to referrer (e.g., `/projects/{id}`) instead of always `/search`.
- **Map layer toggle**: Added Map/Satellite/Hybrid/High-Res Aerial (Esri) options on building report map for sharper imagery in Indian cities.
- **Default hybrid view + zoom 19** (was satellite + zoom 18) for better building detail.

## Prioritized Backlog (Updated Feb 12, 2026 afternoon)

### P0
- [x] Gemini vision annotations on rooftop ✅

### P1
- [ ] **Monetization**: Pricing plans (per-building report, project design pack, XL with quantity estimates) — user signaled intent
- [ ] **Per-layer image variants**: Generate separate "solar zone map", "plantation zone map", "shadow map" for human-readable use in feasibility report (user request: "multiple images but scaled for human readability")
- [ ] **Embed annotated image in PDF Feasibility Report** (currently only on screen)
- [ ] **Private share token** (`sus10.ai/share/{token}` — for Incubex demos, no login required)
- [ ] **Public sample link** (`sus10.ai/sample/{ward-slug}` — for blog/SEO)
- [ ] Refactor server.py monolith into /routes, /models, /services

### P2
- [ ] **Cluster** intermediate level (Group → Cluster → Building) for Embassy/Prestige-style hierarchies
- [ ] PDF export of group BRSR rollup report
- [ ] Polygon editing UX in project detail page
- [ ] Provider onboarding wizard
- [ ] Email notifications for leads
- [ ] Outdoor/roadside tree plantation (separate future module)
- [ ] Cost-per-sqft revival with vendor-specific quoting


### 🏗️ Projects/Portfolios (Group Hierarchy) ✅
- **3-level hierarchy**: Group (developer/federation/chain) → Cluster (optional) → Building
- **Use cases**: Embassy/Prestige portfolio rollup, Incubex/WeWork chain analysis, RWA federations, BRSR/ESG reporting
- **New models**: `groups` collection with `building_ids[]`
- **New endpoints**:
  - `POST /api/groups` — create project
  - `GET /api/groups` — list user's projects
  - `GET /api/groups/{group_id}` — get with linked buildings
  - `POST /api/groups/{group_id}/buildings` — add buildings
  - `DELETE /api/groups/{group_id}/buildings/{building_id}` — remove
  - `DELETE /api/groups/{group_id}` — delete project
- **Frontend**: `/projects` and `/projects/{groupId}` routes; 3-tab project view (Buildings / Sustenance / BRSR Rollup)

### 🌱 4-Pillar Sustenance Calculator ✅
- **New service**: `/app/backend/services/sustenance_calculator.py`
- **Pillar 1 — Solar PV**: MNRE GHI lookup for 20+ Indian cities, 20° tilt (general) + latitude-optimal tilt, south-facing orientation, kWh/year + ₹ savings + grid CO₂ offset (CEA factor 0.82 kg/kWh)
- **Pillar 2 — Rooftop Plantation**: Container/grow-bag/NFT only, all species ≤ 7 ft height, food + ornamental modes, 16 species catalog with yields
- **Pillar 3 — Biogas**: Occupancy-based organic waste estimation, IS 16190:2014 yield 0.08 m³/kg, LPG equivalent + landfill methane offset
- **Pillar 4 — Rainwater**: Catchment × IMD rainfall × CPCB runoff coefficient (0.85), households supported metric
- **Group aggregation**: `aggregate_group_potential()` rolls up multiple buildings with auto-generated BRSR narrative
- **New endpoints**:
  - `GET /api/sustenance/building/{building_id}` — single building 4-pillar
  - `GET /api/sustenance/group/{group_id}` — group rollup with BRSR narrative

### 🔎 POI-Based Building Search & Import ✅
- **New endpoint** `GET /api/poi/search?poi_name=X&city=Y` — combines DB matches + live Google Places Text Search
- **New endpoint** `POST /api/poi/import` — imports a Google Place into buildings collection, auto-fetches footprint polygon via Geocoding API
- **Use case**: "Find all Incubex / WeWork locations in Bangalore and analyze"
- **Tested**: 20 Incubex locations discovered in Bangalore, 3 imported with real polygons (214 m², 3816 m², 376 m²)

### ✅ End-to-End Test Verified
- Test scenario: "Incubex Bangalore" portfolio
- 3 buildings imported with Google polygons → grouped → analyzed
- Result: 401 kWp solar (604 MWh/yr), 17,270 plants, 2,569 m³/yr biogas, 3,452 kL/yr rainwater
- **560.62 tCO₂e/yr offset, ₹50.1L annual savings**
- BRSR narrative auto-generated for SEBI Section A.6 disclosure

## Architecture Decisions (Feb 12, 2026)

### Plantation: Container-Only on Rooftops
- All rooftop plantation logic limited to ≤ 7 ft height plants
- Growing methods: grow bags, NFT hydroponics, raised planters, ornamental containers
- Outdoor tree/roadside plantation = separate FUTURE module (NOT in current scope)
- Food vs ornamental = same biophysics, different SKUs (single flag toggle)

### Gemini Architecture Review — Adopted vs Skipped
**Adopted from Gemini's recommendations:**
- 4-pillar `calculate_sustenance_potential()` deterministic formulas
- MNRE GHI data for solar
- BRSR-aligned group rollups
- Batch processing for project-level analysis

**Skipped (over-engineering for current stage):**
- SAM 2 / Roboflow annotation (manual polygon edit suffices)
- Switching from Google Maps → Leaflet.js (already invested)
- Google Earth Engine / Sentinel-2 (Google API path equivalent for B2B)
- Wind energy potential (Gemini itself called it optional)
- Web scraping B2B contacts (privacy/ToS risk)

## Prioritized Backlog (Updated Feb 12, 2026)

### P0 - Critical
- [x] 4-pillar sustenance calculator ✅
- [x] Multi-building Project/Group hierarchy ✅
- [x] POI-based building discovery (Incubex demo) ✅

### P1 - High Priority
- [ ] Cluster (intermediate level: society/IT-park) for true 3-level hierarchy
- [ ] PDF export of group BRSR rollup report
- [ ] Polygon editing UX in project detail page (currently only on building report)
- [ ] Refactor server.py monolith into /routes, /models, /services
- [ ] Provider onboarding wizard
- [ ] Email notifications for leads

### P2 - Medium Priority
- [ ] Outdoor / roadside tree plantation module (separate from rooftop)
- [ ] Gemini Vision for rooftop obstruction detection (water tanks, existing solar)
- [ ] Crowdsourcing model for user-submitted buildings
- [ ] Provider Dashboard for lead management
- [ ] PDF/DWG file parsing for building footprints
- [ ] Open Graph meta tags for `/green-roof` (social share previews)

- **Provider**: Open-Meteo Air Quality API (free, no API key required)
- **Why Open-Meteo over OpenAQ**: OpenAQ v3 has no stations near Indian cities; Open-Meteo provides CAMS-based forecast data globally
- **Endpoints Added**:
  - `GET /api/air-quality/location?latitude=XX&longitude=YY` - Get AQI by coordinates
  - `GET /api/air-quality/city/{city}` - Get AQI for predefined Indian cities
  - `GET /api/air-quality/building/{building_id}` - Get & update AQI for a building
- **Data Returned**:
  - US AQI value and level (Good/Moderate/Unhealthy/etc.)
  - PM2.5, PM10 concentrations
  - Other pollutants: CO, NO2, SO2, O3
  - Health implications
  - Timezone-aware timestamps
- **Supported Cities**: Delhi, Mumbai, Bangalore, Gurugram, Noida, Pune, Hyderabad, Chennai, Kolkata, Jaipur, Lucknow, Ahmedabad, etc.

### Live AQI Display on Building Report Page ✅
- **LiveAQICard Component**: New card component with pulsing "LIVE" indicator
- **Features**:
  - Color-coded card background based on AQI level (green/yellow/orange/red)
  - Displays AQI value, level (Good/Moderate/Unhealthy/etc.)
  - Shows PM2.5 and PM10 concentrations
  - Health implications message
  - Auto-refreshes every 10 minutes
- **Integration Points**:
  - Overview metrics section (replaces static AQI card)
  - Environmental Impact section in Terrace Garden tab

### Solutions Tab Cost Display Hidden ✅ (Feb 20, 2026)
- **Removed**: Hardcoded cost estimates from Solutions tab
- **Reason**: Cost varies by solution type, materials, vendor - should be provider-quoted
- **Changes**:
  - SolutionCard: Removed cost_estimate display
  - Impact Cards: Replaced "Est. Setup Cost" with "Get Quote - From providers"
- **Future**: Will revive with solution-specific depth when provider quoting is implemented

