# Sus10 AI — Information Architecture, Monetization & Packaging Proposal (v2)
*Revised Feb 19, 2026 — incorporates user direction on business model, 4 audience teasers, garden-design module reuse, and subsidy/financing navigator.*

> **Status:** Draft awaiting sign-off. Supersedes v1.
> **Key direction from user:**
> 1. Not a traditional SaaS-with-seats. Model is **freemium core + pay-per-project deliverables + vendor partner program**.
> 2. **4 audience teasers** to validate demand before building (Citizens-Aspirational, Citizens-Crisis, RWAs, Vendors).
> 3. **The PDF report is the outcome**, not the product. We monetize iterations/designs on top of it.
> 4. **Razorpay** is the chosen payment processor (India + MSME friendly) — can come later.
> 5. **Import the garden design module** from previous iterations into "My Sustenance Roof" solution.
> 6. **Subsidies & financing navigator** is the last core piece. May reuse Initiatives infra.
> 7. With these in place ~60% of the universe is covered.

---

## 1. Audience map (from teaser pages)

We have **4 distinct teaser landing pages** authored by the user:

| Persona | Pain framing | Hook | Survey purpose |
|---|---|---|---|
| **Citizen — Aspirational** | "Your unused rooftop = power + food + water + cool home" | Optimistic, lifestyle, ROI | Validate willingness, top concerns, willingness-to-pay |
| **Citizen — Crisis** | "Your city is getting hotter. Your rooftop can fight back." | Heat, floods, AQI, El Niño — urgency | Test crisis-framing resonance vs aspirational |
| **RWA / Housing Society** | "Every rooftop in your colony = collective green power plant" | Community-scale action, common-area savings, vendor trust, compliance | Validate decision-making barriers, governance, consensus |
| **Vendor (Solar/Garden/Rain/Biogas)** | "Green infra market is taking off. Are you set up to win it?" | Lead-gen pain, credibility, subsidy paperwork, conversion tools | Validate which vendor tools to ship first; recruit early supply side |

**Implication for IA:** Landing experience must support a **persona-aware homepage**, not a single hero. We'll add 4 dedicated teaser routes that each link to their respective survey (Zoho or in-app).

Suggested routes:
- `/for-homeowners` (aspirational hero — default)
- `/for-homeowners/heat-action` (crisis variant for paid campaigns)
- `/for-communities` (RWA)
- `/for-installers` (Vendor)
- `/` → smart router: shows aspirational by default, with quick switcher to other personas (RWA / Vendor link in nav)

Plus the existing CMS landing pages (`/green-roof`, `/cool-roof-survey`) — these are surveys + need to be reachable from the persona pages where relevant.

> ⚠️ Brand note: the teaser HTMLs say **"suss10.ai"** (double-s). Confirm whether that's intentional or a typo before we publish — should match `sus10.ai`.

---

## 2. Feature map by persona (synthesized from teasers)

These are the **modules the teasers promise** — so we either have them, are building them, or must build them.

### 2.1 Citizen modules (both variants)
- [Exists] Building rooftop assessment (solar potential, water catchment, load capacity)
- [E1.2 — to build] **Sustenance Potential at-a-glance** (Solar + Biogas + Rainwater + Greening & Composting)
- [Partial] **Phased personalized action plan** matched to budget + building type + priorities
- [Exists] Verified vendor directory
- [Partial] **Impact tracking** (savings, water, CO₂ avoided) + community sharing
- [New] **Heat island temperature reduction** explainer (crisis variant)

### 2.2 RWA modules
- [Exists] Rooftop mapping for the whole colony (multi-building Projects already covers this)
- [Exists] Verified vendor directory
- [E1.1 — to extend] **Community action plans** with phased recommendations (per project)
- [**New, core**] **Subsidy Navigator** — central + state subsidies auto-matched
- [Partial] **Impact dashboard** for annual reports (BRSR-style but RWA-friendly)

### 2.3 Vendor modules
- [Exists] Public vendor profile (we have it; needs verified badge + reviews)
- [Exists] Lead inflow (we have Lead form; needs proper inbox)
- [New] **Proposal & scoping tools** (templates, quote generator)
- [**New**] **Subsidy & compliance navigator** (shared with RWA)
- [Future] Subcontractor/supplier marketplace

---

## 3. Monetization model (revised — not seats)

### 3.1 Freemium core + Pay-per-Deliverable

| Tier | What you get | Pricing model |
|---|---|---|
| **🟢 Free — Discover** | • Building search & report (view-only)<br>• Sustenance Potential at-a-glance (read-only, no slider tweaks)<br>• Public vendor directory<br>• Read CMS resources/blogs | Free, forever |
| **🟡 Assess — Free with sign-up** | • Save buildings (up to 5)<br>• Edit rooftop polygon<br>• Adjust biogas inputs (kitchen waste slider)<br>• See subsidy matches for your project (read-only)<br>• Follow Initiatives | Free, email-verified |
| **🟠 Design — Pay-per-Project** | • AI-generated rooftop **design** (garden layout, panel layout, RWH sizing)<br>• N design iterations per project (e.g., 3 included)<br>• Generated PDF Feasibility Report (with persona-tuned template)<br>• Material checklist / BOQ<br>• Vendor RFQ outreach | **₹X / project (one-time)**<br>e.g. ₹999 — ₹2,499 / project |
| **🔴 Execute — Pay-per-Project Plus** | • Above +<br>• Multi-iteration design refinement (up to 10)<br>• White-label PDF for RWA/builder branding<br>• Procurement assistance / formal RFQ to vetted vendors<br>• Subsidy filing assistance (concierge) | **₹Y / project**<br>e.g. ₹4,999 — ₹9,999 |

### 3.2 Vendor / Partner model (revenue stream B)

| Tier | What vendor gets | Price |
|---|---|---|
| **Listed** | Public profile, 3 leads/mo, city geo | Free |
| **Verified** | Verified badge, customer reviews, 25 leads/mo, proposal tools | ₹2,499 / mo (or ₹24,999/yr) |
| **Featured** | Top placement, unlimited leads, featured slots on RWA pages | ₹9,999 / mo |
| **Lead per conversion** *(alt model)* | Pay only when a lead converts to RFQ | ₹X per lead (TBD via survey) |

We'll pick **subscription vs pay-per-lead** based on vendor survey results.

### 3.3 Add-ons / one-time
- White-label PDF brand kit: **₹2,500** one-time per project
- Extra design iteration beyond plan cap: **₹299/iteration**
- Bulk RWA pilot (>10 buildings): **₹9,999** one-time
- BRSR consulting session (Enterprise): **₹14,999/session**

### 3.4 Enterprise / Corporate ESG (revenue stream C)
- Per-portfolio annual contract (not per-seat)
- BRSR-grade rollup + custom branding + dedicated CSM
- Pricing: **Talk-to-us** (anchor ~ ₹5L–25L / yr)

### 3.5 What we do NOT charge for (core acquisition strategy)
- Basic assessment & potential numbers → **always free** (drives top-of-funnel SEO + trust)
- Browsing verified vendors → **free** (network effect)
- Reading subsidy info → **free** (gov data is public)

---

## 4. Roles (simplified from v1)

Collapsing v1's 8 roles into **4 + special** as the user implied this is not seat-based:

| Role | Customer App | Internal Console |
|---|---|---|
| `guest` | Public pages + read-only reports | None |
| `user` | Free + Assess + can pay per project | None |
| `vendor` | Vendor profile + leads inbox + proposal tools | None |
| `admin` | Customer App + everything | Internal Console — full |

Optional `staff` for limited internal access (CMS-only, support-only) added when team grows.

---

## 5. Modules to build / import / fix (consolidated)

> Includes everything in `FEEDBACK_LOG.md` + new asks from this message.

### 5.1 Existing bugs (in priority order — proposed)

| ID | Issue | Suggested Priority |
|---|---|---|
| B1.1 | Terrace area mismatch (Home 96 sqm vs Explainability 10 sqft) — single source of truth + unit fix | **P0** |
| B1.2 | PDF report miscalculations + abrupt text | **P0** (bundled with E1.1 rebuild) |
| B1.3 | Building Type filter not respected on /admin/discover (post-enrichment reclassification leaks) | **P0** |
| B1.7 | Discover imports not showing in /admin → Buildings (likely limit/sort bug) | **P0** |
| B1.5 | Admin Buildings: filter bar + Reject + bulk + pagination + total count | **P1** |
| B1.4 | Filter UX expansion (multi-select types, strict-match toggle) | **P1** (bundled with B1.3) |
| B1.6 | Building Intelligence notes (wind / slab / heritage / flood) | **P1** |

### 5.2 Existing enhancements

| ID | Enhancement | Priority |
|---|---|---|
| B1.8 / Admin IA | Internal Console sidebar + add CMS / Projects / Initiatives / Leads / Discover links | **P0** |
| E1.3 | Searchable city autocomplete on /admin/discover | **P0** (tiny, ships with B1.3) |
| E1.2 | Sustenance Potential at-a-glance top-level page (4 widgets → solution details) | **P1** |
| E1.1 | Configurable PDF report by user-type/persona | **P1** (bundled with B1.2) |

### 5.3 New asks from this message

| ID | Module | Priority |
|---|---|---|
| **N1** | **4 persona teaser landing pages** (`/for-homeowners`, `/for-homeowners/heat-action`, `/for-communities`, `/for-installers`) — port from supplied HTMLs into CMS/landing layout. Each links to its survey + signup-for-beta. | **P0** — pre-launch teaser |
| **N2** | **Persona-aware homepage** — smart router or persona switcher on `/`. | P1 |
| **N3** | **"Design it for me" AI generator** (paid) — generate rooftop design from polygon: panel layout, garden layout, RWH sizing. Use Gemini for narrative + structured output. Iteration limit per project. | **P1** |
| **N4** | **Material checklist / BOQ generator** (paid) — per project, downloadable, linked to vendor RFQ. | **P2** |
| **N5** | **Import the Garden Design module** from previous iterations. *(User to provide source/repo location or describe the module so we can lift it cleanly.)* | **P1** — blocker on user input |
| **N6** | **Subsidies & Financing Navigator** — searchable directory of central + state subsidies for rooftop solar (PM Surya Ghar Muft Bijli Yojana), RWH, green building (GRIHA/IGBC incentives), urban farming subsidies, MNRE programs, etc. + match-to-project. Reuse Initiatives infra where possible. | **P1 — core** |
| **N7** | **Vendor proposal / scoping tools** — site survey templates + quote generator. | P2 |
| **N8** | **Razorpay integration** — once monetization model is validated. | P2 (post-validation) |
| **N9** | **Project-based billing model** — replace seat-based plan logic with project entitlements (e.g., "user has 1 paid 'Design' project credit"). | P1 (after model validation) |
| **N10** | **Pre-launch beta waitlist** — collect emails from teaser pages, store in DB, integrate with marketing email later. | **P0** |

### 5.4 Guardrails for opening to public (unchanged from v1, summarized)
- Rate limits on Gemini & Discovery
- Daily ₹ cost ceilings + 80% email alerts
- Captcha on lead/signup
- Email verification before saving >1 building
- `/terms`, `/privacy`, `/data-sources` CMS pages
- "Estimates only — verify before action" disclaimers
- Allowlist switches role from "sign-in gate" → "staff gate"
- Sentry + audit log

---

## 6. Recommended phased plan (revised)

### **Phase 0 — Teaser launch (this week)**
*Goal: validate audience demand. No new functional features.*
- N1 — port the 4 teaser pages into the app (CMS or hard-coded routes).
- N10 — beta waitlist collector + thank-you screen.
- Fix B1.1 (visible to all signed-in users on the report).
- Fix B1.7 (so admins can actually triage incoming discoveries).
- Light visual polish on existing public report so the teaser-driven traffic doesn't bounce.
- *Tooling:* keep Zoho Survey link if surveys are already running there; or wire in-app forms.

### **Phase 1 — Admin reorg + core data integrity (1 week)**
- B1.8 — Internal Console sidebar + link all orphaned modules.
- B1.5 + B1.3 + B1.4 + E1.3 — Admin Buildings/Discover full overhaul (filter bar, reject, bulk, pagination, searchable city, strict-type match).
- B1.6 — Building Intelligence notes (DB model + admin UI + warning badges on public report).

### **Phase 2 — Customer-facing depth (1–2 weeks)**
- E1.2 — Sustenance Potential at-a-glance.
- N6 — Subsidies & Financing Navigator (free read).
- E1.1 + B1.2 — Persona-tuned PDF report (free baseline + paid premium template).
- N5 — Import Garden Design module *(needs user input on source)*.

### **Phase 3 — Monetization scaffolding (1–2 weeks)**
- N9 — Project-credit entitlement model in DB & API.
- N3 — "Design it for me" AI generator (Gemini-powered).
- N4 — Material checklist / BOQ.
- Guardrails (rate limits, captcha, cost ceilings).

### **Phase 4 — Public beta on**
- Flip allowlist → staff-only.
- Sentry + audit log.
- Public-beta banner.
- Disclaimer / Terms / Privacy.

### **Phase 5 — Charging**
- N8 — Razorpay integration.
- Vendor subscription plans.
- Plan-upgrade & checkout flows.

---

## 7. Open questions for sign-off

1. **Brand name** — teasers say `suss10.ai` (double-s). Domain is `sus10.ai`. Which is the official brand?
2. **Teaser routes** — confirm `/for-homeowners`, `/for-homeowners/heat-action`, `/for-communities`, `/for-installers`? Or different slugs?
3. **Surveys** — are they currently Zoho-hosted, or do you want them in-app from day 1?
4. **Garden Design module (N5)** — where does this module live? GitHub repo / old preview / commercial product? Need source or detailed spec to port.
5. **Subsidy data source (N6)** — do you want us to curate a starter list manually (PM Surya Ghar, MNRE, state DISCOMs, GRIHA, etc.), scrape gov sources, or partner with a data provider?
6. **Pricing anchors** — are ₹999 / ₹2,499 / ₹4,999 / ₹9,999 the right project anchors, or should we leave it open until WTP survey results?
7. **Vendor monetization** — subscription (₹2,499/mo Verified) or pay-per-lead — which is your gut preference for the initial test?
8. **Persona switcher on `/`** — single smart router (cookies / geo / referrer) or four hard-segmented domains/subdomains?
9. **Confirm phase order** — Phase 0 (teaser + critical bugs) first, then Phase 1 (admin reorg)?

---
