# Sus10 AI - Product Requirements Document

## Overview
Sus10 AI is a hyperlocal climate action platform that analyzes buildings for green potential, connects to solution providers, and builds community initiatives.

## Target Users
1. **Commercial Building Managers** - IT parks, hospitals, colleges
2. **Solution Providers** - Landscapers, FMS companies, ESG consultants
3. **NGOs & Climate Advocates** - Community champions
4. **Corporate CSR/ESG Teams** - Sustainability officers

## Core Requirements (Static)
### 6 Active Modules
1. ✅ Building Search & Analysis
2. ✅ Green Potential Report (5-page template)
3. ✅ Provider Marketplace
4. ✅ Lead Generation
5. ✅ Community Initiatives
6. ✅ Admin Dashboard

### 3 Feature-Flagged Modules
7. 🚧 Blog/Resources Hub (flag: blog)
8. 🚧 Forum Discussions (flag: forum)
9. 🚧 Gamification/Leaderboards (flag: gamification)

## What's Been Implemented (Feb 19, 2026)

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

