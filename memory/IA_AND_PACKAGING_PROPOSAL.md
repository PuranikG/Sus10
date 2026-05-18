# Sus10 AI — Information Architecture, RBAC & Packaging Proposal
*Draft — Feb 19, 2026. Awaiting user sign-off before implementation.*

> Context: User flagged that the Admin UI is missing access to existing modules (e.g., CMS, Projects, Initiatives) and asked for a world-class SaaS-grade reorganization plus a packaging overlay (Starter / Growth / Scale) and guardrails for opening to the public.

---

## 1. Current State (Audit)

### 1.1 What exists today (pages & routes)

| Route | Page | Today's status |
|---|---|---|
| `/` | Landing | Public, CMS overlay possible |
| `/search` | Building Search | Public |
| `/buildings/:id` | Building Report (1700+ lines) | Public read, edit gated |
| `/providers` | Provider Marketplace | Public |
| `/providers/:id` | Provider Detail | Public |
| `/initiatives` | Initiatives | Public |
| `/initiatives/:id` | Initiative Detail | Public |
| `/resources`, `/blog` | Resources/Blog Index | Public |
| `/blog/:slug` | Blog post (CMS) | Public |
| `/:slug` | CMS Landing page (e.g. `/green-roof`) | Public |
| `/dashboard` | User Dashboard | Auth required |
| `/projects`, `/projects/:id` | Multi-building portfolios (BRSR) | Auth required, **no admin link** |
| `/leads/new` | Lead form | Auth required |
| `/profile` | (alias of Dashboard) | Auth required |
| `/admin` | Admin Panel — **3 tabs only**: Feature Flags / Buildings / Providers | Admin gated |
| `/admin/discover` | Building Discovery | Admin gated |
| `/admin/cms`, `/admin/cms/new`, `/admin/cms/:id/edit` | CMS Admin & Editor | Admin gated, **but not linked from /admin** |

### 1.2 Gaps & orphans (the actual problem)

- **CMS is orphaned.** No link from `/admin` to `/admin/cms`. You have to know the URL.
- **Projects / Portfolios** have no admin presence — admins can't see "all projects across all users".
- **Initiatives & Leads** have no admin tab.
- **Tax / Intelligence layer** (B1.6 — wind/slab/heritage notes per building) has no UI home yet.
- **Discovery (`/admin/discover`)** isn't visible from `/admin` either — it's reached only by typing the URL.
- **No total record counts, no pagination, no filters** on admin tables (B1.5 / B1.7).
- **No clear separation** between the *Customer App* (what end users do) and the *Internal Console* (what your team does).

---

## 2. Proposed Information Architecture

### 2.1 Two distinct shells

We split the product into two clearly-branded shells:

**A. Customer App** (the public + signed-in user product)
**B. Internal Console** (the Sus10 team's operational backstage — like Stripe Dashboard / Vercel Admin)

This is the same database, same backend, but two different navigations and two different "feels". This is exactly how mature SaaS products (Stripe, Linear, Vercel, Notion) reduce cognitive load for both audiences.

### 2.2 Customer App navigation (top nav)

```
[Logo Sus10] ── Explore ── Solutions ── Projects ── Resources ── [Profile]
                  │           │            │           │
                  │           │            │           ├─ Blog
                  │           │            │           ├─ Guides
                  │           │            │           └─ Case Studies
                  │           │            │
                  │           │            ├─ My Projects (portfolios)
                  │           │            └─ Initiatives I follow
                  │           │
                  │           ├─ Solar
                  │           ├─ Green Roof / Plantation
                  │           ├─ Rainwater Harvesting
                  │           ├─ Biogas & Composting
                  │           └─ Sustenance Potential at a glance (E1.2)
                  │
                  ├─ Search by Building
                  ├─ Search by City / Locality
                  └─ Discover by Type (Mall, IT Park, Hospital, …)
```

User Account dropdown: My Dashboard, My Buildings, My Reports, Billing, Settings, Sign out.

### 2.3 Internal Console navigation (left sidebar, /admin/...)

A proper sidebar (collapsible) — not 3 tabs. Sections grouped by job-to-be-done:

```
─ Overview          /admin                 (KPIs, health, recent activity)
─ Data
   ├─ Discover      /admin/discover        (B1.3, B1.4 — searchable city, multi-select types)
   ├─ Buildings     /admin/buildings       (B1.5 — filters, pagination, reject, bulk)
   ├─ Intelligence  /admin/intelligence    (B1.6 — building notes, tag dictionary)
   └─ Imports       /admin/imports         (Pilot import jobs, OSM batches, run history)
─ Engagement
   ├─ Projects      /admin/projects        (all user portfolios)
   ├─ Initiatives   /admin/initiatives
   ├─ Leads         /admin/leads
   └─ Providers     /admin/providers
─ Content
   ├─ Pages         /admin/cms             (landing pages)
   ├─ Blog          /admin/cms?type=blog
   └─ Media Library /admin/cms/media       (GridFS browser)
─ Customers
   ├─ Users         /admin/users
   ├─ Organizations /admin/orgs            (multi-seat tenancy — future)
   └─ Billing       /admin/billing         (subscriptions, plan changes — future)
─ Settings
   ├─ Feature Flags /admin/feature-flags
   ├─ API Keys      /admin/api-keys
   ├─ Allowlist     /admin/allowlist       (private beta gate config)
   └─ Audit Log     /admin/audit
```

---

## 3. Roles & RBAC

| Role | Who | Customer App access | Internal Console access |
|---|---|---|---|
| `guest` | Not signed-in | Explore, Solutions overview, Resources, public CMS pages, single Building Report (read-only, watermarked) | None |
| `viewer` | Free signed-in | Above + save up to 1 building, follow initiatives | None |
| `member` | Paid (Starter+) | Full Customer App per tier | None |
| `org_admin` | Paid org admin | Above + manage org seats & projects | None |
| `provider` | Verified solution provider | Provider profile + leads inbox | None |
| `staff` | Sus10 internal | Customer App | Internal Console — Data, Engagement, Content (no Customers/Settings) |
| `admin` | Sus10 internal lead | Customer App | Internal Console — full |
| `superadmin` | Founders | Everything | Everything + Feature Flags + Allowlist + Billing |

---

## 4. Packaging — Starter / Growth / Scale

> Numbers below are placeholder anchors. Final pricing TBD with you.

### 4.1 Pricing tiers

| Capability | **Free / Guest** | **Starter** | **Growth** | **Scale** | **Enterprise** |
|---|---|---|---|---|---|
| Price (₹/mo) | ₹0 | ₹999 | ₹4,999 | ₹14,999 | Talk to us |
| Saved buildings | 1 | 5 | 50 | 500 | Unlimited |
| Building Reports | View only (watermark) | 5/mo full | 50/mo full | Unlimited | Unlimited |
| Editable rooftop polygon | ❌ | ✅ | ✅ | ✅ | ✅ |
| Sustenance Potential page (E1.2) | Read-only with paywall on biogas slider | ✅ | ✅ | ✅ | ✅ |
| Gemini AI Rooftop visual analysis | ❌ | 1/mo | 10/mo | 100/mo | Custom |
| Heat island / AQI deep-dive | Locked | Locked | ✅ | ✅ | ✅ |
| Multi-building Projects / Portfolios | — | 1 project, 3 bldgs | 5 projects, 25 bldgs | Unlimited | Unlimited |
| BRSR / ESG rollup narrative | — | — | ✅ | ✅ | ✅ + custom export |
| PDF Feasibility Report (E1.1) | Watermarked sample | Standard template | + user-type toggles | + brand white-label | + co-branded |
| Provider leads (inbound) | — | — | — | — | Provider-only addon |
| Team seats | 1 | 1 | 3 | 10 | Custom |
| API access | ❌ | ❌ | Read-only | Read/write | Read/write + SLA |
| Support | Community | Email | Email + chat | Priority + CSM | Dedicated CSM |

### 4.2 Provider plans (separate vertical)

| | Listed | Verified | Featured |
|---|---|---|---|
| Provider profile | ✅ | ✅ Verified badge | ✅ Verified + Featured slot |
| Leads/month | 3 | 25 | Unlimited |
| Geo-targeting | City | City + State | National |
| Price (₹/mo) | ₹0 | ₹2,499 | ₹9,999 |

### 4.3 Add-ons
- White-label PDF brand: ₹2,500 one-time
- Extra Gemini AI analyses: ₹49/analysis
- Bulk CSV import (>50 buildings): ₹4,999 one-time
- BRSR consulting session: ₹14,999/session

---

## 5. Guardrails for opening to public testing

Before flipping the allowlist off, ship these:

### 5.1 Abuse & rate-limit guardrails
- **Per-IP / per-user rate limit** on `/api/buildings/{id}/analyze-rooftop` (Gemini calls cost money). E.g. 2/day for `guest`, 5/day for `viewer`.
- **Per-IP rate limit** on `/api/admin/discover` triggers (it spends Google Places quota).
- **CAPTCHA** (or Cloudflare Turnstile) on Lead form + Sign-up if we open it.
- **Per-user soft quota**: count Building Reports / Gemini analyses / project creates per month against the plan above; show progress + upgrade CTA.

### 5.2 Cost / quota guardrails
- **Daily ceiling** on Gemini calls (e.g., ₹500/day). If exceeded → AI Visual tab shows "Try again tomorrow / Upgrade".
- **Daily ceiling** on Google Places calls in Discovery (10 cities/day across all admins).
- **Email alert** to `gp@sus10.ai` when 80% of either ceiling is hit.

### 5.3 Content & data integrity
- All public-facing AI text (BRSR narrative, plant recommendations) carries a small **"AI-generated — verify before action"** badge.
- Block public submissions of new buildings; route them through a **"Suggest a building"** form that lands in `/admin/buildings?status=suggested`.
- Profanity / PII filter on Lead form free-text fields.

### 5.4 Auth & access
- Keep the **allowlist** infra (already shipped) but switch the default mode to:
  - **Public:** Sign-ups open, but new accounts are auto-assigned `viewer` role with a feature-flagged sub-tier `public_beta_v1`.
  - **Allowlist still hot:** Only allowlisted emails can access `/admin/*` (becomes the staff gate, not the sign-in gate).
- **Email verification required** before saving > 1 building.
- Sticky **"Public Beta"** ribbon on every page until we exit beta.

### 5.5 Legal / trust
- Add `/terms`, `/privacy`, `/data-sources` CMS pages before opening.
- Add a footer **"Data sources & methodology"** link explaining OSM + Google Places + Open-Meteo + Esri.
- Show a clear **"Estimates only, not engineering advice"** disclaimer on the Sustenance Potential page and PDF report.

### 5.6 Observability
- Server log for every Gemini call with cost-estimate.
- A `/admin/audit` log: signup, sign-in, building create/approve/reject, gemini-run, plan-change.
- Sentry (or similar) for frontend & backend errors before public open.

---

## 6. Recommended phased rollout

**Phase 1 — IA reorganization + admin holes (1 week)**
- Add CMS / Projects / Initiatives / Leads links to `/admin`.
- Implement sidebar Internal Console shell.
- Fix B1.5 + B1.7 (filters, pagination, total counts, reject, bulk).
- Fix B1.3 (Type filter respected after enrichment).
- Fix B1.1 (terrace area mismatch — single source of truth).

**Phase 2 — Customer value & packaging skeleton (1–2 weeks)**
- Ship Sustenance Potential at-a-glance (E1.2).
- Ship configurable PDF report (E1.1).
- Add the plan/role enforcement middleware (no real billing yet — only quotas + role gates).
- Building Intelligence notes (B1.6) usable from admin and surfaced on report.

**Phase 3 — Public beta enablement (1 week)**
- Rate limiters + Cloudflare Turnstile.
- Cost ceilings + email alerts.
- Disclaimers, Terms/Privacy, Data Sources pages.
- Sentry / audit log.
- Flip allowlist → staff-only.

**Phase 4 — Monetization (later)**
- Stripe / Razorpay integration.
- Plan upgrade flows.
- Provider plans.

---

## 7. Open questions for sign-off

1. **Customer App top nav** — confirm the 4 groups (Explore, Solutions, Projects, Resources). Anything to add/drop?
2. **Internal Console sidebar groups** — confirm: Data / Engagement / Content / Customers / Settings.
3. **Role names** — does `guest / viewer / member / org_admin / provider / staff / admin / superadmin` work? Or do you want fewer? (We can collapse to 4: guest, user, provider, admin.)
4. **Pricing anchors** — are ₹999 / ₹4,999 / ₹14,999 reasonable as starting points? Or do you want me to research India-market SaaS-for-ESG comparables?
5. **Guardrails for public open** — confirm we should ship Phase 1 + Phase 3 before flipping the allowlist off.
6. **Stripe vs Razorpay** — for India-first SaaS, Razorpay is usually a better fit (UPI, GST handling, INR-native). Confirm.
7. **Provider plans** — should we monetize providers separately as proposed, or keep them free during beta and monetize only the customer side first?

---
