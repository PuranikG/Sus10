"""
Seed 4 pre-launch teaser CMS pages (one per persona) for Sus10 AI.

Run:  python /app/backend/scripts/seed_persona_teasers.py

Slugs are intentionally simple placeholders — the user can rename them later
from /admin/cms once they decide final URLs.

Each page is upserted (idempotent). The text content is fully editable from
the CMS Admin UI after seeding.
"""
import os
import sys
import uuid
from datetime import datetime, timezone

from pymongo import MongoClient
from dotenv import load_dotenv

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(ROOT, ".env"))

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]

client = MongoClient(mongo_url)
db = client[db_name]
now = datetime.now(timezone.utc)


def upsert(page: dict):
    page = dict(page)
    page.setdefault("type", "landing")
    page.setdefault("published", True)
    page.setdefault("published_at", now)
    page.setdefault("ga_enabled", True)
    page.setdefault("author", "gp@sus10.ai")
    page.setdefault("view_count", 0)
    page["updated_at"] = now

    existing = db.cms_pages.find_one({"slug": page["slug"]})
    if existing:
        # Don't clobber a hand-edited body — only add missing fields.
        update = {k: v for k, v in page.items() if k not in existing or existing.get(k) in (None, "", [])}
        update["updated_at"] = now
        db.cms_pages.update_one({"slug": page["slug"]}, {"$set": update})
        print(f"updated:  {page['slug']}")
    else:
        page["page_id"] = f"cms_{uuid.uuid4().hex[:12]}"
        page["created_at"] = now
        db.cms_pages.insert_one(page)
        print(f"inserted: {page['slug']}")


PAGES = [
    # ---------- 1. Citizen — Aspirational ----------
    {
        "slug": "for-homeowners",
        "title": "What if your rooftop paid for itself — and cooled your city too?",
        "subtitle": (
            "Thousands of Indian homeowners are discovering that their unused rooftop "
            "is the most valuable square footage they own. Power. Food. Water. A cooler "
            "home. It's all possible — today."
        ),
        "cover_color": "#1a3d2b",
        "waitlist_persona": "citizen",
        "badges": [
            {"label": "The smart rooftop movement", "icon": "Leaf"},
            {"label": "10–12 mins · Anonymous", "icon": "ShieldCheck"},
        ],
        "benefits": [
            {"title": "Generate your own solar power",
             "body": "Cut your electricity bill dramatically. Feed excess back to the grid and earn credits. 60–90% bill reduction.",
             "icon": "Sun"},
            {"title": "Eat what you grow — pesticide free",
             "body": "Tomatoes, chillies, spinach, curry leaves — organic, chemical-free, harvested steps from your kitchen. 100% organic. Zero food miles.",
             "icon": "Sprout"},
            {"title": "A living garden above the city",
             "body": "Flowering plants, fragrant herbs, shade canopies — a private green retreat that generates fresh oxygen, filters urban dust, and calms the mind.",
             "icon": "Flower2"},
            {"title": "Never depend on a tanker again",
             "body": "Capture, filter and store monsoon rainwater. A 1,000 sq ft roof captures 60,000+ litres per season.",
             "icon": "Droplets"},
        ],
        "intro_markdown": (
            "## Most Indian homeowners own the solution.\n"
            "### They just don't know how to start.\n\n"
            "**The way it is now:**\n\n"
            "- ✗ Paying high electricity bills every month while the sun blazes on your roof\n"
            "- ✗ Buying vegetables from the market grown with pesticides\n"
            "- ✗ Waiting for the water tanker every dry season\n"
            "- ✗ A hot, unused concrete slab that bakes the floor below\n"
            "- ✗ No idea who to trust to make any of this happen\n\n"
            "**What's possible:**\n\n"
            "- ✓ Solar panels generating power all day — electricity bill nearly gone\n"
            "- ✓ Fresh tomatoes, chillies, and herbs from your own terrace\n"
            "- ✓ A full water storage tank fed by the monsoon, year round\n"
            "- ✓ A green canopy that makes your top floor genuinely liveable\n"
            "- ✓ Verified local vendors who specialise in exactly this\n"
        ),
        "body_markdown": (
            "## How Sus10 AI helps\n\n"
            "We're building the platform that makes all of this simple.\n\n"
            "1. **Understand your rooftop** — solar potential, water catchment, load capacity in one view.\n"
            "2. **Get a personalised plan** — phased, matched to your budget, building type and priorities.\n"
            "3. **Find verified vendors** — trusted, rated installers in your city.\n"
            "4. **Track your impact** — savings, water harvested, carbon avoided — share with your community.\n\n"
            "### Your story shapes what we build\n\n"
            "We're listening to homeowners across Indian cities — apartments, row houses, independent homes — "
            "to understand what gets in the way and what would make it easy.\n"
        ),
        "survey_url": "https://survey.zohopublic.in/zs/CzaT82",  # placeholder — replace from Zoho
        "cta_url": "#waitlist",
        "cta_label": "Join the early community",
        "meta_title": "The Smart Rooftop Revolution | Sus10 AI",
        "meta_description": "Power. Food. Water. A cooler home. Sus10 AI helps Indian homeowners turn unused rooftops into the most valuable square footage they own.",
        "footer_attribution": "Sus10 AI · Citizen Research Series",
    },

    # ---------- 2. Citizen — Crisis ----------
    {
        "slug": "for-homeowners-heat-action",
        "title": "Your city is getting hotter. Your rooftop can fight back.",
        "subtitle": (
            "2026 is already the hottest year in recorded history — and El Niño is making it worse. "
            "Floods. Toxic air. Skyrocketing power bills. The roof above your head is unused land that "
            "could change all of this — for your home and your neighbourhood."
        ),
        "cover_color": "#7c2d12",
        "waitlist_persona": "citizen-crisis",
        "badges": [
            {"label": "Climate Emergency · Indian Cities", "icon": "AlertTriangle"},
            {"label": "10–12 mins · Anonymous", "icon": "ShieldCheck"},
        ],
        "benefits": [
            {"title": "3.5°C hotter than surrounding areas",
             "body": "The urban heat island effect makes our cities measurably hotter year after year.",
             "icon": "Thermometer"},
            {"title": "30% of household electricity",
             "body": "consumed by cooling alone — and rising every summer.",
             "icon": "Zap"},
            {"title": "85% of urban rooftops",
             "body": "in India lie completely unused. That's our biggest untapped climate asset.",
             "icon": "Building"},
            {"title": "May 2026 broke heat records",
             "body": "Scientists say this is the new baseline. Action can't wait.",
             "icon": "Flame"},
        ],
        "intro_markdown": (
            "> ⚠️ **This is not a future problem — it is happening right now.**\n\n"
            "May 2026 has already broken heat records across Indian cities. El Niño is intensifying the "
            "summer cycle, pushing temperatures to levels that are unsafe for outdoor activity. Scientists "
            "say this is the new baseline — not an anomaly. Every concrete rooftop that goes ungreened "
            "makes your neighbourhood hotter, your drains more vulnerable, and your air worse. We are "
            "researching what it would take to change this — and we need your voice.\n"
        ),
        "body_markdown": (
            "## What we hear from homeowners — the problems are real, the solutions exist.\n\n"
            "**🌡️ My top floor is unbearable.** Concrete roofs absorb and radiate heat all night. "
            "Residents on upper floors run ACs at full blast — and still suffer. A green roof or solar "
            "canopy can cut indoor temperatures by **3–5°C**.\n\n"
            "**💧 Waterlogging every monsoon.** Paved rooftops shed rainwater instantly, overwhelming drains. "
            "Rooftop gardens and harvesting systems absorb and store it.\n\n"
            "**⚡ Power bills keep climbing.** Rooftop solar can slash electricity bills by 60–90%.\n\n"
            "**🌫️ Air quality is worsening.** Urban greening at scale — thousands of terrace gardens — "
            "creates measurable improvement in local air.\n\n"
            "### A sustainable rooftop is more than one thing\n\n"
            "- **Rooftop Solar** — Generate your own power. Cut bills. Feed the grid.\n"
            "- **Terrace Gardens & Mini Farms** — Grow food. Cool your building. Clean the air.\n"
            "- **Rainwater Harvesting** — Capture the monsoon. Never depend on a tanker again.\n"
            "- **Biogas & Composting** — Turn kitchen waste into cooking fuel and soil.\n"
            "- **Waste & Wastewater Systems** — Close the loop on what your home produces.\n\n"
            "*\"The average Indian urban rooftop has enough space and sunlight to power the home below it, "
            "grow food for the family, and harvest enough rain to survive a dry summer.\"* — our research is "
            "building the evidence base for this claim."
        ),
        "survey_url": "https://survey.zohopublic.in/zs/CzaT82",  # placeholder
        "cta_url": "#waitlist",
        "cta_label": "Share your experience",
        "meta_title": "Your Rooftop Can Fight Back | Sus10 AI",
        "meta_description": "Heat. Floods. Toxic air. India's climate crisis is here. Sus10 AI is researching how rooftop solar, gardens, rainwater and biogas can change it — and we need your voice.",
        "footer_attribution": "Sus10 AI · Climate Action Research Series",
    },

    # ---------- 3. RWA / Communities ----------
    {
        "slug": "for-communities",
        "title": "Above every home in your colony is a green power plant waiting to be switched on.",
        "subtitle": (
            "The rooftops your community walks past every day hold the potential to generate clean energy, "
            "harvest monsoon water, grow food, and cool the streets below. We are building the platform that "
            "helps RWAs make it happen. We need your input to get it right."
        ),
        "cover_color": "#0f3a3a",
        "waitlist_persona": "rwa",
        "badges": [
            {"label": "Resident Welfare Associations · India", "icon": "Users"},
            {"label": "10–12 mins · Anonymous", "icon": "ShieldCheck"},
        ],
        "benefits": [
            {"title": "Shared rooftops, shared savings",
             "body": "Solar on common areas can power lifts, lighting, pumps and security. Bills your committee struggles to collect, quietly shrinking.",
             "icon": "Sun"},
            {"title": "From one champion to the whole colony",
             "body": "An RWA that endorses and coordinates gets 3x the uptake of individuals acting alone.",
             "icon": "Megaphone"},
            {"title": "Trusted vendors, not random contractors",
             "body": "The #1 barrier residents report is not knowing who to trust. Sus10 AI verifies and rates vendors.",
             "icon": "BadgeCheck"},
            {"title": "Approvals made navigable",
             "body": "Every city has its own electricity board, municipal body and subsidy authority. We map every approval path.",
             "icon": "Map"},
        ],
        "intro_markdown": (
            "**90%** of building terraces sit vacant — your colony's combined rooftop footprint is "
            "productive land going completely to waste.\n\n"
            "**40%** reduction in common-area electricity bills reported by early solar adopters.\n\n"
            "**200+** RWAs in our pilot. Not one had a structured rooftop plan in place.\n"
        ),
        "body_markdown": (
            "## A platform built for community-scale action\n\n"
            "Your survey responses directly shape which features we build first. Here's what's coming for RWAs:\n\n"
            "**🗺️ Rooftop mapping** — Visualise every rooftop in your colony: area, solar potential, "
            "load-bearing capacity. *(In development)*\n\n"
            "**🤝 Verified vendor directory** — Rated and verified installers for solar, gardens, "
            "rainwater, biogas — serving your city. *(In development)*\n\n"
            "**📋 Community action plans** — Customised phased plans for your colony: what to do, "
            "in what order, at what cost. *(Coming soon)*\n\n"
            "**🏛️ Subsidy navigator** — Every central and state subsidy, automatically matched to your "
            "colony's profile and location. *(Coming soon)*\n\n"
            "**📊 Impact dashboard** — Live tracking of energy generated, water harvested, carbon "
            "avoided. Ready for your RWA's annual report. *(Planned)*\n"
        ),
        "survey_url": "https://survey.zohopublic.in/zs/CzaT82",  # placeholder
        "cta_url": "#waitlist",
        "cta_label": "Help shape the platform",
        "meta_title": "Lead the Green Transition | Sus10 AI for RWAs",
        "meta_description": "Sus10 AI is building the platform that helps Indian Resident Welfare Associations turn vacant rooftops into solar, gardens, rainwater and biogas. Your input shapes what we build.",
        "footer_attribution": "Sus10 AI · RWA Research Series",
    },

    # ---------- 4. Vendor / Installer ----------
    {
        "slug": "for-installers",
        "title": "The green infrastructure market is taking off. Are you set up to win it?",
        "subtitle": (
            "Rooftop solar, terrace gardens, rainwater harvesting, biogas — demand from Indian cities is "
            "accelerating. We're researching what's actually holding vendors back, and building tools to fix it."
        ),
        "cover_color": "#1e3a8a",
        "waitlist_persona": "vendor",
        "badges": [
            {"label": "Vendor Research · India 2026", "icon": "Wrench"},
            {"label": "12–15 mins · Confidential", "icon": "ShieldCheck"},
        ],
        "benefits": [
            {"title": "₹2.8T projected market by 2030",
             "body": "Green infrastructure demand in India is accelerating faster than supply can keep up.",
             "icon": "TrendingUp"},
            {"title": "73% of SMB vendors",
             "body": "say lead generation is their #1 challenge. We're building tools to fix this.",
             "icon": "Target"},
            {"title": "1 in 3 qualified leads",
             "body": "are lost due to lack of follow-up tools or pipeline visibility.",
             "icon": "Inbox"},
            {"title": "Subsidy & compliance",
             "body": "DISCOM, MNRE, municipal NOCs — each one is time and money with no guarantee. We're mapping every path.",
             "icon": "FileCheck"},
        ],
        "intro_markdown": (
            "## Every stage of the customer journey has a pain point. Here are the biggest.\n\n"
            "- **Getting a consistent flow of leads** — most vendors rely on word-of-mouth. Great for trust, fragile as a growth engine.\n"
            "- **Customer trust & credibility** — first-time buyers need social proof. No reviews, no profile, no deal.\n"
            "- **Navigating subsidy & compliance paperwork** — DISCOM approvals, MNRE empanelment, municipal NOCs.\n"
            "- **Converting site visits to signed orders** — proposals are manual; follow-up is inconsistent. Competitors win on speed.\n"
            "- **Finding reliable subcontractors & suppliers** — volatile pricing and unreliable labour eat margins quietly.\n"
        ),
        "body_markdown": (
            "## Tools built for the green-infrastructure installer\n\n"
            "Your survey shapes which features ship first. Here's the roadmap as it stands.\n\n"
            "**📍 Verified vendor profile** — public, searchable profile with verified projects, "
            "certifications, and customer reviews — your digital shopfront. *(In development)*\n\n"
            "**🏘️ RWA & housing-society leads** — direct access to housing committees actively looking "
            "for vetted vendors in your category and city. *(In development)*\n\n"
            "**📝 Proposal & scoping tools** — structured site-survey templates and proposal generators "
            "so your team can quote faster with fewer errors. *(Coming soon)*\n\n"
            "**🏛️ Subsidy & compliance navigator** — step-by-step approval flows for DISCOM, MNRE, "
            "and municipal bodies — so you stop losing customers in the paperwork maze. *(Planned)*\n\n"
            "We will share aggregated findings with all participants. Vendors who complete this survey "
            "get priority listing on the Sus10 AI platform and first access to RWA leads when we launch."
        ),
        "survey_url": "https://survey.zohopublic.in/zs/CzaT82",  # placeholder
        "cta_url": "#waitlist",
        "cta_label": "Share your challenges",
        "meta_title": "Grow Your Green Infrastructure Business | Sus10 AI",
        "meta_description": "Sus10 AI is building tools for India's green-infrastructure installers: verified profiles, RWA leads, proposal tools, subsidy navigation. Help us prioritize what to ship first.",
        "footer_attribution": "Sus10 AI · Vendor Research Series",
    },
]


def main():
    for p in PAGES:
        upsert(p)
    print(f"\n✅ Seeded {len(PAGES)} persona teaser pages.")
    print("   Edit them at /admin/cms once signed in.")


if __name__ == "__main__":
    main()
