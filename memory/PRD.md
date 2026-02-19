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
- [ ] Google APIs integration (Places autocomplete, Air Quality, Open Buildings)
- [ ] PDF report generation
- [ ] Real-time AQI data fetching

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
- Frontend: https://eco-rebuild.preview.emergentagent.com
- Backend API: https://eco-rebuild.preview.emergentagent.com/api
