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

## Feature Addition (Feb 20, 2026)

### Real-Time Air Quality API Integration ✅
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
