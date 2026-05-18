"""
Seed curated subsidies & financing options for Sus10 AI's N6 Subsidies Navigator.

Run:  python /app/backend/scripts/seed_subsidies.py

Idempotent — re-runs upsert by (scheme_code, authority) pair when present.

Source notes (verify dates before publishing publicly):
- PM Surya Ghar Muft Bijli Yojana CFA structure: MNRE Office Memorandum dated 28-Feb-2024
- State subsidies (MH/KA/TN/GJ): each state's renewable energy authority
- Bank loan products: gov.in financialAssistanceReport (Mar 2024 snapshot)
"""
import os
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(ROOT, ".env"))

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
now = datetime.now(timezone.utc).isoformat()


def upsert(s: dict):
    s = dict(s)
    s.setdefault("is_active", True)
    s.setdefault("created_at", now)
    s["updated_at"] = now
    s["last_verified_at"] = now
    key = {"scheme_code": s["scheme_code"], "authority": s["authority"]}
    existing = db.subsidies.find_one(key)
    if existing:
        db.subsidies.update_one(key, {"$set": s})
        print(f"updated:  {s['scheme_code']} ({s['authority']})")
    else:
        s["subsidy_id"] = f"sub_{uuid.uuid4().hex[:12]}"
        s["created_by"] = "seed_script"
        db.subsidies.insert_one(s)
        print(f"inserted: {s['scheme_code']} ({s['authority']})")


SUBSIDIES = [
    # ============================================
    # CENTRAL — PM Surya Ghar Muft Bijli Yojana
    # ============================================
    {
        "name": "PM Surya Ghar Muft Bijli Yojana — Residential CFA",
        "scheme_code": "PMSGMBY",
        "authority": "MNRE (Govt. of India)",
        "type": "cfa",
        "category": ["solar"],
        "geo_scope": "central",
        "eligible_building_types": ["residential", "housing_society"],
        "benefit_summary": "Up to ₹78,000 central financial assistance for rooftop solar installation.",
        "benefit_details_markdown": (
            "**Slab structure (CFA per residential rooftop):**\n\n"
            "| System Size | CFA |\n|---|---|\n"
            "| 1 kW | ₹30,000 |\n"
            "| 2 kW | ₹60,000 |\n"
            "| 3 kW and above | ₹78,000 (cap) |\n\n"
            "Direct bank transfer post-commissioning via approved vendor. "
            "Free 300 units/month electricity for participating households "
            "(through net-metering + state DISCOM tie-up)."
        ),
        "max_amount_inr": 78000,
        "rate_or_percent": "Up to 60% of system cost (1–2 kW), 40% for 3 kW+",
        "application_url": "https://pmsuryaghar.gov.in",
        "documents_required": [
            "Latest electricity bill (consumer connection)",
            "Aadhaar of applicant",
            "Photograph of rooftop",
            "Bank account details for CFA disbursement",
        ],
        "notes_for_admin": "Verify CFA slabs at https://mnre.gov.in before publishing — last revision was OM dated 28-Feb-2024.",
    },
    {
        "name": "Group Housing Society / RWA — Common-area solar CFA",
        "scheme_code": "PMSGMBY_GHS",
        "authority": "MNRE (Govt. of India)",
        "type": "cfa",
        "category": ["solar"],
        "geo_scope": "central",
        "eligible_building_types": ["housing_society", "residential"],
        "benefit_summary": "₹18,000 per kW CFA for common-area solar at GHS / RWAs up to 500 kW.",
        "benefit_details_markdown": (
            "**Eligible:** Group Housing Societies, Resident Welfare Associations.\n\n"
            "- CFA: **₹18,000 / kW**\n"
            "- Cap: **500 kW** per society (max ₹90 lakh CFA)\n"
            "- For powering common services (lifts, lighting, water pumps)\n"
            "- Empanelled vendor installation mandatory"
        ),
        "max_amount_inr": 9000000,
        "rate_or_percent": "₹18,000 / kW (CFA)",
        "application_url": "https://pmsuryaghar.gov.in",
    },

    # ============================================
    # CENTRAL — Solar pump / SPIN / agriculture
    # ============================================
    {
        "name": "PM-KUSUM Component-B (Standalone Solar Pumps)",
        "scheme_code": "PM_KUSUM_B",
        "authority": "MNRE (Govt. of India)",
        "type": "subsidy",
        "category": ["solar"],
        "geo_scope": "central",
        "eligible_building_types": ["agricultural", "rural"],
        "benefit_summary": "30% central + 30% state subsidy for off-grid solar pumps (up to 7.5 HP).",
        "benefit_details_markdown": (
            "- **Central subsidy:** 30%\n"
            "- **State subsidy:** 30% (may vary by state)\n"
            "- **Farmer contribution:** 40% (loan-eligible)\n"
            "- For replacing diesel pumps in non-electrified farms.\n"
        ),
        "rate_or_percent": "60% subsidy (30% central + 30% state)",
        "application_url": "https://pmkusum.mnre.gov.in",
    },

    # ============================================
    # STATE — Maharashtra
    # ============================================
    {
        "name": "MahaUrja Rooftop Solar — Domestic top-up",
        "scheme_code": "MH_RTS_DOM",
        "authority": "MahaUrja (Maharashtra Energy Dev. Agency)",
        "type": "subsidy",
        "category": ["solar"],
        "geo_scope": "state",
        "state": "Maharashtra",
        "eligible_building_types": ["residential"],
        "benefit_summary": "Additional state top-up over PMSGMBY for Maharashtra residential consumers.",
        "benefit_details_markdown": (
            "Maharashtra residents installing rooftop solar via empanelled MahaUrja vendors get "
            "additional **state-level facilitation** plus standardised net-metering with MSEDCL. "
            "Refer to MahaUrja circulars for the current FY top-up if any.\n\n"
            "Verify at https://mahaurja.com"
        ),
        "application_url": "https://mahaurja.com",
        "notes_for_admin": "State top-up amount changes each fiscal — verify before publishing.",
    },

    # ============================================
    # STATE — Karnataka
    # ============================================
    {
        "name": "Karnataka Surya Raitha — Net-metering for residential",
        "scheme_code": "KA_NET_METER",
        "authority": "BESCOM / KREDL",
        "type": "net_metering",
        "category": ["solar"],
        "geo_scope": "state",
        "state": "Karnataka",
        "eligible_building_types": ["residential", "commercial"],
        "benefit_summary": "Standardised net-metering approval flow with BESCOM for rooftop solar.",
        "benefit_details_markdown": (
            "Net-metering enables export of excess solar power to the grid. BESCOM has a "
            "streamlined application + technical-feasibility flow for residential & commercial "
            "rooftop systems. Compulsory anti-islanding inverter + grid-tied design.\n\n"
            "Apply via your DISCOM at https://www.bescom.org"
        ),
        "application_url": "https://www.bescom.org",
    },

    # ============================================
    # STATE — Tamil Nadu
    # ============================================
    {
        "name": "TANGEDCO Rooftop Solar — Domestic feed-in",
        "scheme_code": "TN_RTS_DOM",
        "authority": "TANGEDCO / TEDA",
        "type": "subsidy",
        "category": ["solar"],
        "geo_scope": "state",
        "state": "Tamil Nadu",
        "eligible_building_types": ["residential"],
        "benefit_summary": "State-administered feed-in for Tamil Nadu rooftop solar, plus PMSGMBY stack.",
        "benefit_details_markdown": "Combine central PMSGMBY CFA with TANGEDCO's feed-in tariff and the state's TEDA empanelment.",
        "application_url": "https://www.teda.in",
    },

    # ============================================
    # CENTRAL — Rainwater Harvesting
    # ============================================
    {
        "name": "AMRUT 2.0 — Urban water management (RWH)",
        "scheme_code": "AMRUT_2_RWH",
        "authority": "Ministry of Housing & Urban Affairs",
        "type": "subsidy",
        "category": ["rainwater"],
        "geo_scope": "central",
        "eligible_building_types": ["residential", "housing_society", "commercial", "government"],
        "benefit_summary": "Mission-mode support for urban rainwater harvesting projects via ULBs.",
        "benefit_details_markdown": (
            "AMRUT 2.0 provides central funding to **Urban Local Bodies (ULBs)** for water-source "
            "augmentation including rainwater harvesting. RWAs and group housing societies can "
            "partner with their ULB for shared project funding under this mission.\n\n"
            "Reach out to your local Municipal Corporation's environment cell."
        ),
        "application_url": "https://amrut.mohua.gov.in",
    },

    # ============================================
    # STATE — Karnataka RWH
    # ============================================
    {
        "name": "BBMP RWH Compliance — Mandatory for plots ≥ 1200 sqft",
        "scheme_code": "KA_BBMP_RWH",
        "authority": "BBMP (Bengaluru)",
        "type": "subsidy",
        "category": ["rainwater"],
        "geo_scope": "city",
        "state": "Karnataka",
        "city": "Bengaluru",
        "eligible_building_types": ["residential", "commercial"],
        "benefit_summary": "BBMP mandates RWH for plots ≥ 1200 sqft — penalties + property-tax rebates apply.",
        "benefit_details_markdown": (
            "Bengaluru building bye-laws make rainwater harvesting **mandatory** for any plot "
            "≥ 1,200 sqft (60×40 ft). Non-compliance attracts higher water bills + penalties; "
            "compliance qualifies for property-tax rebate in some wards.\n\n"
            "Standard catchment + filter + recharge pit / sump combo accepted."
        ),
        "notes_for_admin": "Penalty structure has been revised — verify with BBMP latest notification.",
    },

    # ============================================
    # CENTRAL — Biogas
    # ============================================
    {
        "name": "Waste-to-Energy (Biogas) Programme — Central Financial Support",
        "scheme_code": "WTE_BIOGAS_CFA",
        "authority": "MNRE (Govt. of India)",
        "type": "cfa",
        "category": ["biogas"],
        "geo_scope": "central",
        "eligible_building_types": ["commercial", "housing_society", "industrial"],
        "benefit_summary": "Central financial assistance for medium/large biogas plants from organic waste.",
        "benefit_details_markdown": (
            "MNRE's Waste-to-Energy programme offers CFA at fixed rates (₹ / m³ biogas capacity) "
            "for plants converting municipal/agricultural/industrial organic waste. Designed for "
            "**community-scale** plants (5 m³ digester upwards).\n\n"
            "Subsidy slab varies by plant capacity — apply via your State Nodal Agency (SNA)."
        ),
        "application_url": "https://mnre.gov.in/bio-energy/biogas",
    },

    # ============================================
    # CENTRAL — Green Building Certification
    # ============================================
    {
        "name": "GRIHA / IGBC Certification — Property Tax Rebate",
        "scheme_code": "GRIHA_IGBC_REBATE",
        "authority": "Various ULBs (Pune, Hyderabad, Noida, Pimpri)",
        "type": "tax_credit",
        "category": ["greening", "solar", "rainwater"],
        "geo_scope": "city",
        "eligible_building_types": ["residential", "commercial"],
        "benefit_summary": "Several Indian cities offer 5–25% property-tax rebate for GRIHA/IGBC-rated buildings.",
        "benefit_details_markdown": (
            "Cities like **Pune, Pimpri-Chinchwad, Hyderabad, Noida** offer property-tax rebates "
            "for buildings achieving GRIHA / IGBC green-building ratings. Rebate ranges between "
            "**5%–25%** depending on rating tier (3-star / 4-star / 5-star).\n\n"
            "Combine with rooftop solar + RWH + on-site composting to qualify for higher tiers."
        ),
        "notes_for_admin": "Each ULB's exact rebate % differs — list specific cities in detail markdown.",
    },

    # ============================================
    # CENTRAL — Tax / Depreciation
    # ============================================
    {
        "name": "Accelerated Depreciation — Solar Assets (Commercial)",
        "scheme_code": "AD_SOLAR_COMM",
        "authority": "Income Tax Department (Govt. of India)",
        "type": "tax_credit",
        "category": ["solar"],
        "geo_scope": "central",
        "eligible_building_types": ["commercial", "industrial", "it_park", "hotel", "hospital"],
        "benefit_summary": "40% accelerated depreciation in year 1 on solar PV asset for businesses.",
        "benefit_details_markdown": (
            "Under Income Tax Rules, businesses installing rooftop solar PV qualify for "
            "**40% accelerated depreciation** in year 1 (instead of the usual 10–15%) on the "
            "solar asset value. Effective IRR improvement of 3–4 percentage points for "
            "commercial/industrial installations.\n\n"
            "Consult your tax advisor for the exact applicable rate in current FY."
        ),
        "rate_or_percent": "40% AD year 1",
    },

    # ============================================
    # FINANCING — Bank Loan Products (from gov.in financialAssistanceReport)
    # ============================================
    {
        "name": "SBI — Solar Roof Top Finance Scheme (Residential)",
        "scheme_code": "SBI_SRTFS",
        "authority": "State Bank of India",
        "type": "loan",
        "category": ["solar"],
        "geo_scope": "central",
        "eligible_building_types": ["residential"],
        "benefit_summary": "Up to ₹10 lakh / 5-year tenure / 9.65–10.65% reducing — CIBIL-based.",
        "benefit_details_markdown": (
            "**Maximum amount:** ₹10 lakh  \n"
            "**Tenure:** Up to 5 years  \n"
            "**Interest rate:** **9.65% – 10.65% (reducing)** based on CIBIL score  \n"
            "**Collateral:** Hypothecation of the solar system\n\n"
            "Apply at any SBI branch with electricity bill + KYC + system quotation from an empanelled vendor."
        ),
        "max_amount_inr": 1000000,
        "rate_or_percent": "9.65% – 10.65% p.a. (reducing)",
        "application_url": "https://sbi.co.in",
    },
    {
        "name": "Union Bank of India — Rooftop Solar Loan",
        "scheme_code": "UBI_RTS",
        "authority": "Union Bank of India",
        "type": "loan",
        "category": ["solar"],
        "geo_scope": "central",
        "eligible_building_types": ["residential", "commercial"],
        "benefit_summary": "Up to ₹15 lakh OR 80% of project cost / 84-month tenure / 8.95–10.25%.",
        "benefit_details_markdown": (
            "**Maximum amount:** ₹15 lakh or 80% of project cost (whichever is lower)  \n"
            "**Tenure:** Up to **84 EMIs (7 years)**  \n"
            "**Interest rate:** **8.95% – 10.25%** effective ROI (CIBIL-based)  \n"
            "**Type:** Residential / Composite\n\n"
            "Composite loan includes installation, battery (if any), and AMC."
        ),
        "max_amount_inr": 1500000,
        "rate_or_percent": "8.95% – 10.25% p.a.",
        "application_url": "https://www.unionbankofindia.co.in",
    },
    {
        "name": "Canara Bank — Surya Vikas Loan",
        "scheme_code": "CANARA_SURYA",
        "authority": "Canara Bank",
        "type": "loan",
        "category": ["solar"],
        "geo_scope": "central",
        "eligible_building_types": ["residential", "housing_society", "commercial"],
        "benefit_summary": "Up to ₹10 lakh residential / ₹2 crore commercial / 5–10 year tenure.",
        "benefit_details_markdown": (
            "**Residential:** Up to ₹10 lakh, 5 years.  \n"
            "**Commercial / RWA:** Up to ₹2 crore, 10 years.  \n"
            "**Interest rate:** Linked to RLLR — typically 9.5% – 11%.\n\n"
            "Available across all Canara Bank branches."
        ),
        "max_amount_inr": 20000000,
        "rate_or_percent": "RLLR-linked (~9.5% – 11% p.a.)",
        "application_url": "https://canarabank.com",
    },
    {
        "name": "PNB — Surya Shakti Solar Finance",
        "scheme_code": "PNB_SURYA_SHAKTI",
        "authority": "Punjab National Bank",
        "type": "loan",
        "category": ["solar"],
        "geo_scope": "central",
        "eligible_building_types": ["residential", "commercial", "housing_society"],
        "benefit_summary": "Project-cost-based financing for rooftop solar — collateral-free up to ₹10 lakh.",
        "benefit_details_markdown": (
            "PNB's Surya Shakti scheme offers rooftop-solar financing for individuals & housing "
            "societies. **Collateral-free up to ₹10 lakh** with margin contribution. Beyond this, "
            "hypothecation / property collateral applicable.\n\n"
            "Rates linked to bank's prevailing RLLR."
        ),
        "max_amount_inr": 1000000,
        "rate_or_percent": "RLLR-linked",
        "application_url": "https://www.pnbindia.in",
    },
]


def main():
    for s in SUBSIDIES:
        upsert(s)
    print(f"\n✅ Seeded {len(SUBSIDIES)} subsidies & financing options.")
    print("   Edit at /admin/subsidies once signed in.")


if __name__ == "__main__":
    main()
