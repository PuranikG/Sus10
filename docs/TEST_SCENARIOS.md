# Sus10 AI — Production Test Scenarios
**Last updated:** Feb 12, 2026
**Production URL:** `https://sus10.ai`
**Preview URL:** `https://sus10-preview.preview.emergentagent.com`

---

## ⚠️ Important: No LLM = No Hallucinations (Currently)
Sus10 AI **does not use any generative LLM** (GPT, Claude, Gemini) in production code. Every number, recommendation, and narrative comes from:
- **Deterministic formulas** (MNRE/IMD/CPCB-sourced constants)
- **Live REST APIs** (Open-Meteo AQI, Google Places, Google Geocoding, OpenStreetMap)
- **Static catalogs** (plant species list, plant growing methods)

This means **the numbers cannot hallucinate**. If they're wrong, it's a code bug — not an LLM going off-script. The "BRSR narrative" you see is **string interpolation** of computed values, not LLM-generated prose.

**Watch for in QA:**
1. ❌ Wrong unit (kWh vs MWh, m² vs sqft, kg vs tonnes)
2. ❌ Misplaced decimal (₹50L shown as ₹50Cr)
3. ❌ Data not persisting (refresh wipes state)
4. ❌ Polygon edits not saving
5. ❌ PDF generation breaking or showing wrong building
6. ❌ External API failure not gracefully handled (AQI down → blank page)

---

## 🧪 Test Scenario 1 — Authentication & Data Persistence

### 1.1 Login & Session Restore
- [ ] Visit `https://sus10.ai` → Click **Sign In** → Google OAuth flow → land on Dashboard
- [ ] Close browser, reopen `https://sus10.ai` → should still be logged in (cookie session)
- [ ] Refresh `/dashboard` → User info still visible, no flicker to logout

### 1.2 Logout
- [ ] Navbar → Logout → land back on Landing
- [ ] Try opening `/dashboard` directly → should redirect to `/` (protected route)

**Expected:** Session token cookie persists 30 days. Logout clears it server-side and client-side.

---

## 🧪 Test Scenario 2 — Building Search (Existing Data)

### 2.1 City Filter
- [ ] `/search` → Select **Gurugram** → expect 5–8 buildings with `is_approved: true`
- [ ] Switch to **Mumbai** → expect different list
- [ ] Switch to **Bangalore** → expect ≥3 Incubex buildings (from your import) + any pilot data

### 2.2 Google Places Autocomplete
- [ ] Type `DLF Cyber City` → see dropdown within 1s
- [ ] Type 2 characters → no API call (debounced to 3+ chars)
- [ ] Select a suggestion → city filter auto-updates to detected city
- [ ] Watch for "Powered by Google" branding (mandatory per Google ToS)

**Failure mode to catch:** Autocomplete returning generic non-India locations (API restriction broken).

---

## 🧪 Test Scenario 3 — Building Report Page (Per-Building Calculations)

Pick any building (e.g. **DLF Cyber City Tower A**). Open `/buildings/{id}`.

### 3.1 Overview Metrics — Sanity Check
- [ ] **Footprint area** displays in m² (not sqft)
- [ ] **Terrace area** ≈ 70% of footprint (default) unless user adjusted
- [ ] **Live AQI** card has pulsing "LIVE" indicator
- [ ] AQI value in expected range for Indian cities:
  - Good: 0–50
  - Moderate: 51–100
  - Unhealthy for sensitive: 101–150
  - Unhealthy: 151–200
  - Very unhealthy: 201–300
  - Hazardous: 301+
- [ ] **PM2.5** and **PM10** present, PM2.5 < PM10 (always true in nature)

**Hallucination check:** AQI level color matches numeric value. If AQI 250 shown with green "Good" badge → bug.

### 3.2 Map with Polygon
- [ ] Map loads centered on building
- [ ] Editable polygon visible (blue/green outline)
- [ ] Drag a vertex → area recalculates in the side panel
- [ ] Click **Save** → toast "Terrace area saved"
- [ ] **Refresh page** → polygon edits persist (DB write worked)

**Test the boundary case:** Drag polygon to 0 area → should reject or default safely.

### 3.3 CO₂ Speedometer & Terrace Planner
- [ ] CO₂ gauge needle moves when you adjust **plantable %** slider
- [ ] Temperature reduction (°C) updates with coverage
- [ ] Click **"How is this calculated?"** → modal opens with methodology
- [ ] Recommendations list shows plants for the **city you're in** (e.g., Bangalore should show different than Mumbai if data exists)

**Expected formula sanity (for ~3000 m² terrace):**
- CO₂ sequestration: 8,000–15,000 kg/year
- Temperature reduction: 1–4 °C at 70% coverage

### 3.4 4-Pillar Sustenance (NEW)
**Test via API directly** (since this is freshly built):
```bash
curl https://sus10.ai/api/sustenance/building/{building_id}?plantation_type=mixed&floors=4
```
Expected ranges for a 1000 m² footprint commercial building in Bangalore:
- `solar.installed_capacity_kwp`: 80–120 kWp
- `solar.annual_generation_kwh`: 120,000–180,000 kWh/yr
- `solar.optimal_tilt_degrees`: ~13° (Bangalore latitude)
- `solar.panel_orientation`: "South-facing (azimuth 180°)"
- `plantation.total_plants_count`: 4,000–6,000 plants
- `biogas.biogas_m3_per_year`: 1,500–3,500 m³/yr
- `rainwater.annual_yield_kiloliters`: 600–900 kL/yr (Bangalore has ~970mm rainfall)

If Mumbai → rainwater jumps to 1,800–2,200 kL/yr (2400mm rainfall). **This city-sensitivity check catches stale GHI/rainfall lookup tables.**

### 3.5 PDF Generation
- [ ] Click **Download PDF** → file downloads with name `Sus10_Report_{building_id}_{date}.pdf`
- [ ] Open PDF → 5 pages: Cover / Solutions / Impact / Methodology / Providers
- [ ] All numbers in PDF match the on-screen values (no drift)
- [ ] Building name and address are not blank/placeholders
- [ ] AQI in PDF matches on-screen AQI at time of generation

**Common bugs:**
- PDF shows ₹NaN or `undefined kWh` — frontend passed wrong value
- PDF page count varies — content overflow
- Polygon image missing on page 1

### 3.6 Share Dropdown
- [ ] WhatsApp share → opens `wa.me/?text=...` with pre-filled message
- [ ] Email share → opens mailto with subject + body
- [ ] **Copy link** in HTTPS (`sus10.ai`) → toast confirms copy. In HTTP preview → button may fail (browser security restriction — not a bug)

---

## 🧪 Test Scenario 4 — Admin Building Discovery

### 4.1 Discovery Workflow (requires admin: gp@sus10.ai)
- [ ] `/admin/discover` → select **Bangalore** → click **Discover**
- [ ] Loading state ~10–30s (OSM + Google enrichment)
- [ ] Results show: name, address, footprint area, polygon preview
- [ ] **Polygon source** badge: "Google" (high accuracy) or "OSM" (fallback)
- [ ] Footprint area > 200 m² (config filter)

### 4.2 Bulk Approve
- [ ] Select 3 discovered buildings → Approve → toast confirms
- [ ] Visit `/search` → those buildings now appear in public listing

**Hallucination check:** Names should be REAL business names (Google Places enrichment), not OSM's `way_12345`. If you see `building` or `null` as name → enrichment broke.

---

## 🧪 Test Scenario 5 — Incubex Workflow (NEW Feature) ⭐

This is the **primary new feature** for ESG/BRSR rollups.

### 5.1 Create Project
- [ ] `/projects` → **New Project**
- [ ] Name: `Incubex Bangalore`
- [ ] Type: **Enterprise / Brand Chain**
- [ ] City: **Bangalore**
- [ ] Description: anything
- [ ] Create → redirects to `/projects/{groupId}`

### 5.2 Add Buildings via POI Search
- [ ] **Add Buildings** → search `Incubex` in Bangalore
- [ ] Expect **15–20 results** from Google Places (all Incubex locations)
- [ ] Each result shows: name, address, "Google Places" or "✓ In DB" badge
- [ ] Select **3 buildings** → click Add
- [ ] Wait for import (auto-fetches polygons via Geocoding) — ~10s per building
- [ ] Modal closes, **building_count badge** updates to 3
- [ ] Buildings tab shows the 3 imported with addresses + commercial badge

### 5.3 Sustenance Potential Tab
- [ ] Click **Sustenance Potential** tab
- [ ] Each building shows 4 pillar cards: Solar / Plantation / Biogas / Rainwater
- [ ] Solar setup callout: `20° tilt, South-facing (azimuth 180°). GHI: 5.5 kWh/m²/day (MNRE)`
- [ ] CO₂ tonnes and ₹ savings show realistic numbers (not ₹0 or `NaN`)
- [ ] **Click View detailed report** → navigates to building report page

### 5.4 Group Rollup (BRSR) Tab
- [ ] Click **Group Rollup (BRSR)** tab
- [ ] BRSR Narrative card shows: `"Across N buildings (X m² built-up), the group's untapped rooftop sustainability potential..."`
- [ ] 8 stat cards: Buildings / Solar / Plants / Biogas / Rainwater / CO₂ / Savings / Footprint
- [ ] Per-Building Breakdown table — sum of rows ≈ totals in stat cards (rounding tolerance ±2%)

**Critical sanity checks:**
- Total CO₂ tonnes = sum of per-building CO₂ tonnes (audit math!)
- Total kWp = sum of per-building kWp
- Annual savings in ₹ Lakhs/Crores formatting is human-readable

### 5.5 Remove Building from Project
- [ ] Buildings tab → click ❌ on one card → toast confirms
- [ ] Counts update across all 3 tabs
- [ ] Refresh page → removal persisted

### 5.6 Delete Project
- [ ] Top-right red trash icon → confirm modal → **Delete**
- [ ] Redirects to `/projects` list
- [ ] **Buildings still exist** in `/search` (only project link deleted, not the buildings)

---

## 🧪 Test Scenario 6 — Air Quality Edge Cases

### 6.1 City Lookup
```bash
curl "https://sus10.ai/api/air-quality/city/Bangalore"
```
- [ ] Returns `aqi_us`, `level`, `pm25`, `pm10`, `timestamp`
- [ ] Try a small city `Amravati` — should still work (lat/lng fallback)
- [ ] Try `XYZNonExistent` — should return 404, not 500

### 6.2 Building-bound AQI
- [ ] Open any building report → AQI card populated
- [ ] If Open-Meteo API is rate-limited, frontend should show "AQI unavailable" gracefully (not crash)

---

## 🧪 Test Scenario 7 — Green Roof Survey Landing

### 7.1 Public Access
- [ ] `https://sus10.ai/green-roof` (no login)
- [ ] Hero, benefits grid, Zoho iframe, footer all render
- [ ] Submit a test response in the iframe → confirm it lands in your Zoho dashboard
- [ ] Mobile view at 390px width → no horizontal scroll, iframe scrolls internally

---

## 🧪 Test Scenario 8 — Initiatives & Providers

### 8.1 Initiatives
- [ ] `/initiatives` → list page loads
- [ ] Click Green Gurugram 2025 → detail page with progress bar
- [ ] If logged in: **Pledge** button works → adds entry → progress bar updates

### 8.2 Providers
- [ ] `/providers` → list with filters
- [ ] Click GreenScape Solutions → detail with portfolio, certifications, ratings

---

## 🧪 Test Scenario 9 — Lead Form

### 9.1 Submit Lead (requires login)
- [ ] From a building report → **Get Quote** / **Request Provider** → lead form
- [ ] Submit with valid data → toast confirms
- [ ] `/dashboard` → "My Leads" section shows the new lead
- [ ] Lead status defaults to **new**

---

## 🧪 Test Scenario 10 — Data Persistence Audit

This is the most important one for confidence before deployment.

### 10.1 Full lifecycle test
1. Create project "QA Test 1"
2. Import 2 buildings via POI search
3. Adjust polygon on building 1
4. Add a lead for building 1
5. Pledge to an initiative
6. **Close browser completely**
7. Reopen `https://sus10.ai` and login again
8. Verify:
   - [ ] Project "QA Test 1" still exists with 2 buildings
   - [ ] Polygon edits on building 1 are retained
   - [ ] Lead shows in dashboard
   - [ ] Initiative shows pledge

**If any of these fail → MongoDB write issue or session detachment bug.**

---

## 🚨 Failure Patterns to Watch For

| Pattern | Likely Cause | Severity |
|---|---|---|
| AQI shows "—" or 0 | Open-Meteo API rate limit or down | LOW (free tier) |
| BRSR narrative shows "undefined" | Backend rollup didn't compute | HIGH |
| PDF page 4 blank | jsPDF autotable race condition | MEDIUM |
| Polygon won't save | Auth token expired or PATCH endpoint broken | HIGH |
| POI search returns 0 results | Google Places API key invalid/exhausted | HIGH |
| Discover takes >2 min | Overpass API rate-limited (free tier) | MEDIUM |
| Login loops on `/dashboard` | session cookie domain mismatch | HIGH (deploy issue) |

---

## ✅ Pre-Deploy Sign-Off Checklist

Before clicking **Deploy** to production:

- [ ] Scenario 5 (Incubex) ends-to-end works in preview
- [ ] PDF download works in preview
- [ ] Polygon edits persist in preview
- [ ] AQI displays valid values for Bangalore + Mumbai + Delhi
- [ ] No console errors on `/projects/{groupId}` page
- [ ] No 401/403 errors after login (auth flow stable)

---

## 📝 Optional: Sample Public Link (Backlog)
Per your request, **two new shareable URL types** to be added after current testing pass:

1. **Public sample**: `sus10.ai/sample/{ward-or-portfolio-slug}` — accessible without login, indexed for SEO, paired with a blog article about the ward
2. **Private share token**: `sus10.ai/share/{token}` — Incubex-style, no login required but only those with the link see it (UUID gating, optional expiry)

I'll build these once you green-light the deploy.

---

**Once you've run through this list and are happy, click Deploy. I'll be on standby to fix anything that breaks. 🚀**
