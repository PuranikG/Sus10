# Sus10 AI - Complete Requirements Document

## Executive Summary

**Sus10 AI** is a sustainability intelligence platform that helps building owners, facility managers, and urban planners assess and implement green solutions for commercial and residential buildings in India. The platform leverages Google Maps APIs, OpenStreetMap data, and real-time environmental APIs to provide actionable insights on terrace gardens, CO2 sequestration potential, and air quality impact.

---

## 1. Product Vision

### 1.1 Problem Statement
- India's urban areas face severe air pollution (AQI regularly exceeds 300+ in major cities)
- Building owners lack data-driven tools to assess green solution potential
- No centralized platform connects building owners with sustainability service providers
- Manual assessment of terrace/rooftop potential is time-consuming and expensive

### 1.2 Solution
An AI-powered platform that:
1. Automatically discovers and catalogs buildings using satellite/map data
2. Calculates green potential (terrace gardens, solar, rainwater harvesting)
3. Provides real-time environmental impact estimates
4. Connects building owners with verified sustainability service providers

### 1.3 Target Market
- **Primary**: Commercial buildings in Tier-1 Indian cities (Delhi NCR, Mumbai, Pune, Bangalore)
- **Secondary**: Residential complexes, educational institutions, hospitals
- **Future**: Expansion to Tier-2 cities and Southeast Asia

---

## 2. User Personas

### 2.1 Building Owner / Facility Manager
- **Goals**: Reduce operational costs, improve building sustainability rating, comply with regulations
- **Pain Points**: Lack of data, unclear ROI, finding reliable vendors
- **Key Features**: Building reports, cost-benefit analysis, provider connections

### 2.2 Sustainability Service Provider
- **Goals**: Find qualified leads, showcase portfolio, grow business
- **Pain Points**: Lead generation, proving credibility, reaching decision-makers
- **Key Features**: Lead management, portfolio display, certification showcase

### 2.3 Urban Planner / Government Official
- **Goals**: Track city-wide green cover, plan initiatives, measure impact
- **Pain Points**: Fragmented data, lack of real-time monitoring
- **Key Features**: City dashboards, initiative tracking, aggregate analytics

### 2.4 Platform Admin
- **Goals**: Curate building data, manage providers, ensure data quality
- **Pain Points**: Manual data entry, verification workload
- **Key Features**: Building discovery, bulk import, approval workflows

---

## 3. Core Features & Workflows

### 3.1 Building Discovery & Import (Admin)

#### Workflow
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Admin selects  │────►│ OSM Overpass │────►│ Building list   │
│  city + filters │     │ API query    │     │ with footprints │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                        ┌──────────────┐              │
                        │ Google Places│◄─────────────┘
                        │ API (names)  │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ Google Geocoding
                        │ API (polygons)│
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ MongoDB save │
                        │ + Admin review│
                        └──────────────┘
```

#### API Endpoints
- `POST /api/admin/buildings/discover` - Trigger discovery
- `PUT /api/admin/buildings/{id}/approve` - Approve building
- `PUT /api/admin/buildings/{id}` - Edit building details

#### Data Sources
| Source | Data Provided | Cost |
|--------|--------------|------|
| OpenStreetMap Overpass | Building locations, basic footprint | Free |
| Google Places API (New) | Building names, addresses, place IDs | 5K free/month |
| Google Geocoding API | Precise building polygons | 40K free/month |

---

### 3.2 Building Search & Discovery (End User)

#### Workflow
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ User enters     │────►│ Google Places│────►│ Address         │
│ address/city    │     │ Autocomplete │     │ suggestions     │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                        ┌──────────────┐              │
                        │ Backend      │◄─────────────┘
                        │ search API   │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ Results list │
                        │ or Map view  │
                        └──────────────┘
```

#### API Endpoints
- `GET /api/buildings/search` - Search with filters
- `GET /api/buildings/map` - Get buildings for map display
- `GET /api/buildings/{id}` - Get single building details

#### Filters
- City (dropdown with supported cities)
- Building type (IT Park, Hospital, Mall, etc.)
- Address (free text with autocomplete)

---

### 3.3 Building Report Page

#### Components

**A. Overview Section**
- Building name, address, city, pincode
- Building type badge
- Footprint area (sqm)
- Usable terrace area (sqm)
- Data quality score (%)
- Live AQI with health indicator

**B. Interactive Map**
- Satellite view with building polygon overlay
- Editable polygon for custom terrace measurement
- Save button to persist custom area
- Google Maps JavaScript API integration

**C. CO2 Sequestration Gauge**
- Speedometer-style visualization
- Shows potential CO2 absorption (kg/year)
- Based on plantable area calculation

**D. Terrace Garden Planner**
- Slider: Adjust plantable area percentage (0-100%)
- Impact cards:
  - Plantable area (sqm)
  - CO2 absorption (kg/year)
  - Water usage (L/day)
  - "Get Quote" CTA
- Plant recommendations (city-specific, terrace-appropriate)

**E. Environmental Impact**
- Live AQI card with PM2.5, PM10 readings
- Temperature reduction estimate
- Heat island effect mitigation
- "How is this calculated?" modal with methodology

**F. Solutions Tab**
- Recommended green solutions
- Suitability scores
- Provider listings

#### API Endpoints
- `GET /api/buildings/{id}` - Full building data
- `GET /api/air-quality/building/{id}` - Live AQI
- `PATCH /api/buildings/{id}/terrace` - Save custom terrace
- `GET /api/plants/recommendations/{city}` - Plant suggestions

---

### 3.4 Air Quality Integration

#### Data Flow
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Building coords │────►│ Open-Meteo   │────►│ AQI + Pollutants│
│ (lat, lng)      │     │ Air Quality  │     │ PM2.5, PM10, etc│
└─────────────────┘     └──────────────┘     └─────────────────┘
```

#### API Endpoints
- `GET /api/air-quality/location?lat=X&lng=Y` - By coordinates
- `GET /api/air-quality/city/{city}` - By city name
- `GET /api/air-quality/building/{id}` - By building (updates DB)

#### Data Returned
```json
{
  "aqi_value": 156,
  "aqi_level": "Unhealthy",
  "aqi_color": "#ff0000",
  "pm25_value": 67.5,
  "pm10_value": 142.3,
  "health_implications": "Everyone may experience health effects",
  "pollutants": {
    "co": 450.2,
    "no2": 35.6,
    "so2": 12.1,
    "o3": 45.8
  },
  "data_source": "Open-Meteo"
}
```

---

### 3.5 Provider Management

#### Provider Onboarding Workflow
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Provider        │────►│ Application  │────►│ Admin review    │
│ registration    │     │ form submit  │     │ & approval      │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                        ┌──────────────┐              │
                        │ Profile      │◄─────────────┘
                        │ activation   │
                        └──────────────┘
```

#### Provider Data Model
```json
{
  "provider_id": "prov_xxx",
  "company_name": "GreenTech Solutions",
  "service_types": ["terrace_garden", "solar", "rainwater"],
  "cities_served": ["Delhi", "Gurugram", "Noida"],
  "certifications": [
    {"name": "ISO 14001", "issued_by": "Bureau Veritas"}
  ],
  "portfolio_projects": [],
  "rating": 4.5,
  "review_count": 23,
  "is_verified": true
}
```

---

### 3.6 Lead Management

#### Lead Flow
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ User requests   │────►│ Lead created │────►│ Provider        │
│ quote on report │     │ in database  │     │ notification    │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                        ┌──────────────┐              │
                        │ Provider     │◄─────────────┘
                        │ responds     │
                        └──────────────┘
```

#### API Endpoints
- `POST /api/leads` - Create lead
- `GET /api/leads/my` - User's submitted leads
- `GET /api/providers/{id}/leads` - Provider's received leads
- `PUT /api/leads/{id}/status` - Update lead status

---

## 4. Technical Architecture

### 4.1 System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React 18 + Tailwind CSS + Shadcn/UI + Framer Motion            │
│  @react-google-maps/api + Recharts                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼───────────────────────────────────┐
│                      API GATEWAY (Nginx)                         │
│                   /api/* → Backend:8001                          │
│                   /* → Frontend:3000                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                         BACKEND                                  │
│  FastAPI + Motor (async MongoDB) + httpx                        │
│  Python 3.11+                                                   │
└───────────┬─────────────────┬─────────────────┬─────────────────┘
            │                 │                 │
┌───────────▼───┐   ┌─────────▼─────┐   ┌───────▼───────┐
│   MongoDB     │   │ Google APIs   │   │ Open-Meteo    │
│   Database    │   │ Maps/Places/  │   │ Air Quality   │
│               │   │ Geocoding     │   │ API           │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 4.2 Database Schema

#### Collections

**buildings**
```javascript
{
  building_id: "bld_xxx",
  address: "DLF Cyber City, Tower A",
  city: "Gurugram",
  pincode: "122002",
  latitude: 28.4595,
  longitude: 77.0726,
  building_type: "it_park",
  building_footprint_area: 5000,  // sqm
  usable_terrace_area: 1500,      // sqm
  custom_terrace_area: null,      // user-edited
  custom_terrace_polygon: null,   // user-edited GeoJSON
  footprint_polygon: {            // Google Geocoding GeoJSON
    type: "Polygon",
    coordinates: [[[lng, lat], ...]]
  },
  current_aqi: 156,
  data_quality_score: 85,
  data_source: "google_geocoding",
  osm_id: 123456789,
  google_place_id: "ChIJxxx",
  is_approved: true,
  curated_by_admin_id: "user_xxx",
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z"
}
```

**users**
```javascript
{
  user_id: "user_xxx",
  email: "user@example.com",
  name: "John Doe",
  role: "user",  // user | admin | provider
  google_id: "google_xxx",
  profile_picture: "https://...",
  created_at: "2026-05-01T00:00:00Z"
}
```

**providers**
```javascript
{
  provider_id: "prov_xxx",
  user_id: "user_xxx",
  company_name: "GreenTech Solutions",
  service_types: ["terrace_garden", "solar"],
  cities_served: ["Delhi", "Gurugram"],
  certifications: [],
  portfolio_projects: [],
  rating: 4.5,
  review_count: 23,
  is_verified: true,
  created_at: "2026-05-01T00:00:00Z"
}
```

**leads**
```javascript
{
  lead_id: "lead_xxx",
  building_id: "bld_xxx",
  user_id: "user_xxx",
  provider_id: "prov_xxx",
  solution_type: "terrace_garden",
  message: "Interested in terrace garden for our IT park",
  status: "pending",  // pending | contacted | quoted | converted | closed
  created_at: "2026-05-01T00:00:00Z"
}
```

**plants**
```javascript
{
  plant_id: "plant_xxx",
  name: "Money Plant",
  botanical_name: "Epipremnum aureum",
  type: "climber",  // tree | shrub | climber | herb
  max_height_ft: 6,
  co2_absorption_kg_per_year: 4.5,
  water_need: "low",  // low | medium | high
  native_to_cities: ["Delhi", "Mumbai", "Gurugram"],
  suitable_for_terrace: true,
  image_url: "https://..."
}
```

---

## 5. Google Cloud Integration

### 5.1 Required APIs

| API | Purpose | Free Tier | Estimated Usage |
|-----|---------|-----------|-----------------|
| Maps JavaScript API | Map display, polygons | 28,000 loads/mo | ~5,000/mo |
| Places API (New) | Address autocomplete, building names | 5,000 req/mo | ~3,000/mo |
| Geocoding API | Building polygon extraction | 40,000 req/mo | ~5,000/mo |
| Maps Embed API | Static map embeds | Unlimited | As needed |

### 5.2 API Key Configuration

**Recommended Setup:**
1. **Frontend Key** - Restricted to HTTP referrers (your domains)
   - Maps JavaScript API
   - Places API (New)
   
2. **Backend Key** - Restricted to IP addresses (server IPs)
   - Geocoding API
   - Places API (New)

### 5.3 Google Cloud Project Setup

```bash
# Enable required APIs
gcloud services enable maps-backend.googleapis.com
gcloud services enable places-backend.googleapis.com
gcloud services enable geocoding-backend.googleapis.com

# Create API keys
gcloud alpha services api-keys create --display-name="Sus10 Frontend"
gcloud alpha services api-keys create --display-name="Sus10 Backend"
```

---

## 6. External API Dependencies

### 6.1 OpenStreetMap Overpass API
- **Purpose**: Building footprint discovery
- **Cost**: Free
- **Rate Limits**: ~10,000 requests/day (shared)
- **Fallback Endpoints**:
  - Primary: `https://overpass.kumi.systems/api/interpreter`
  - Secondary: `https://overpass-api.de/api/interpreter`

### 6.2 Open-Meteo Air Quality API
- **Purpose**: Real-time AQI data
- **Cost**: Free (no API key required)
- **Rate Limits**: 10,000 requests/day
- **Endpoint**: `https://air-quality-api.open-meteo.com/v1/air-quality`

---

## 7. Security Requirements

### 7.1 Authentication
- **Method**: Google OAuth 2.0 (Emergent-managed)
- **Session**: HTTP-only cookies with secure flag
- **Token Expiry**: 24 hours (configurable)

### 7.2 Authorization
- **Roles**: user, admin, provider
- **Admin Functions**: Building approval, user management, provider verification
- **Provider Functions**: Lead management, profile editing

### 7.3 Data Security
- **XSS Prevention**: DOMPurify for all user-generated content
- **CSRF**: SameSite cookies
- **API Keys**: Environment variables only, never in code
- **Database**: MongoDB with authentication enabled

---

## 8. Testing Requirements

### 8.1 Unit Tests
- Building discovery functions
- Area calculation algorithms
- AQI level determination
- Plant recommendation logic

### 8.2 Integration Tests
- Google APIs integration
- Database CRUD operations
- Authentication flow
- Lead creation workflow

### 8.3 End-to-End Tests
- Building search and filter
- Building report page load
- Polygon editing and save
- Provider listing and contact

### 8.4 Performance Tests
- Page load time < 3 seconds
- API response time < 500ms
- Map rendering < 2 seconds
- Concurrent user load testing

---

## 9. Deployment Architecture

### 9.1 Recommended Infrastructure (Google Cloud)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                         │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Cloud Run    │    │ Cloud Run    │    │ MongoDB Atlas│       │
│  │ (Frontend)   │    │ (Backend)    │    │ or Cloud     │       │
│  │              │    │              │    │ Firestore    │       │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘       │
│         │                   │                                    │
│  ┌──────▼───────────────────▼───────┐                           │
│  │         Cloud Load Balancer       │                           │
│  │         + Cloud CDN               │                           │
│  └──────────────────┬────────────────┘                           │
│                     │                                            │
│  ┌──────────────────▼────────────────┐                           │
│  │      Cloud Armor (WAF)            │                           │
│  └───────────────────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Environment Variables

**Backend (.env)**
```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net
DB_NAME=sus10_production
GOOGLE_PLACES_API_KEY=AIzaSy...
CORS_ORIGINS=https://sus10.ai,https://www.sus10.ai
```

**Frontend (.env)**
```
REACT_APP_BACKEND_URL=https://api.sus10.ai
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSy...
```

### 9.3 CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend && pip install -r requirements.txt && pytest
          cd frontend && yarn && yarn test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v1
```

---

## 10. Roadmap

### Phase 1: MVP (Current)
- [x] Building discovery from OSM
- [x] Google Places/Geocoding integration
- [x] Building report with polygon
- [x] Live AQI display
- [x] Terrace garden planner
- [x] Admin approval workflow

### Phase 2: Provider Marketplace
- [ ] Provider onboarding wizard
- [ ] Lead generation system
- [ ] Quote request workflow
- [ ] Provider dashboard
- [ ] Review & rating system

### Phase 3: Advanced Analytics
- [ ] City-wide sustainability dashboard
- [ ] Historical AQI trends
- [ ] Carbon credit estimation
- [ ] ROI calculator for green solutions

### Phase 4: Scale & Expand
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Tier-2 city expansion
- [ ] B2B API for real estate platforms

---

## 11. Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| Buildings catalogued | 10,000+ |
| Monthly active users | 5,000+ |
| Provider sign-ups | 100+ |
| Leads generated | 500+/month |
| Page load time | < 2 seconds |
| API uptime | 99.9% |

---

## 12. Support & Contacts

- **Technical Lead**: [Your Name]
- **Google Cloud Support**: [Google Contact]
- **Repository**: [GitHub URL]
- **Documentation**: [Docs URL]

---

*Document Version: 1.0*
*Last Updated: May 2026*
*Status: Ready for Review*
