"""
Sus10 AI — Plant Database
Species data for climate-aware rooftop plantation recommendations.
Sprint 7A: Data layer only. Calculator integration comes in Sprint 7B.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List

NOW = datetime.now(timezone.utc).isoformat()

# ---------------------------------------------------------------------------
# Category defaults
# ---------------------------------------------------------------------------
CATEGORY_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "annual_vegetable":     {"co2_kg_per_plant_yr": 0.30, "co2_for_esg_reporting": False,
                             "methods": {"grow_bag": True,  "raised_bed": True,  "nft_hydroponics": True,  "dwc_hydroponics": False, "vertical_panel": False, "trellis": False}},
    "short_cycle_herb":     {"co2_kg_per_plant_yr": 0.10, "co2_for_esg_reporting": False,
                             "methods": {"grow_bag": True,  "raised_bed": True,  "nft_hydroponics": True,  "dwc_hydroponics": True,  "vertical_panel": True,  "trellis": False}},
    "perennial_shrub":      {"co2_kg_per_plant_yr": 3.50, "co2_for_esg_reporting": True,
                             "methods": {"grow_bag": True,  "raised_bed": False, "nft_hydroponics": False, "dwc_hydroponics": False, "vertical_panel": False, "trellis": False}},
    "medicinal_aromatic":   {"co2_kg_per_plant_yr": 2.80, "co2_for_esg_reporting": True,
                             "methods": {"grow_bag": True,  "raised_bed": True,  "nft_hydroponics": False, "dwc_hydroponics": False, "vertical_panel": False, "trellis": False}},
    "woody_tree":           {"co2_kg_per_plant_yr": 6.00, "co2_for_esg_reporting": True,
                             "methods": {"grow_bag": True,  "raised_bed": True,  "nft_hydroponics": False, "dwc_hydroponics": False, "vertical_panel": False, "trellis": False}},
    "creeper_climber":      {"co2_kg_per_plant_yr": 1.50, "co2_for_esg_reporting": True,
                             "methods": {"grow_bag": False, "raised_bed": True,  "nft_hydroponics": False, "dwc_hydroponics": False, "vertical_panel": False, "trellis": True}},
    "ornamental_ground":    {"co2_kg_per_plant_yr": 2.00, "co2_for_esg_reporting": True,
                             "methods": {"grow_bag": True,  "raised_bed": True,  "nft_hydroponics": False, "dwc_hydroponics": False, "vertical_panel": False, "trellis": False}},
    "butterfly_pollinator": {"co2_kg_per_plant_yr": 2.50, "co2_for_esg_reporting": True,
                             "methods": {"grow_bag": True,  "raised_bed": True,  "nft_hydroponics": False, "dwc_hydroponics": False, "vertical_panel": False, "trellis": False}},
}

ALL_ZONES = ["hot-humid", "hot-dry", "composite", "cold-dry"]
WARM_ZONES = ["hot-humid", "hot-dry", "composite"]
HUMID_COMPOSITE = ["hot-humid", "composite"]


def _p(plant_id, common_name, scientific_name, family, plant_category, plant_type,
        local_names, yield_kg, yield_conf, harvest_months, seasonality,
        survival, water_manual, water_drip, water_mist,
        max_height_ft, root_depth_cm, wind_tol, heat_tol,
        weight_kg, suit_score, high_rise, container_l,
        climate_zones, optimal_climate, data_sources, **overrides) -> Dict[str, Any]:
    """Build a plant record dict with category defaults applied."""
    cat = CATEGORY_DEFAULTS[plant_category]
    rec = {
        "plant_id": plant_id,
        "common_name": common_name,
        "local_names": local_names,
        "scientific_name": scientific_name,
        "family": family,
        "plant_category": plant_category,
        "plant_type": plant_type,
        "yield_kg_per_plant_yr": yield_kg,
        "yield_confidence": yield_conf,
        "harvest_months": harvest_months,
        "seasonality_factor": seasonality,
        "survival_rate_urban_rooftop": survival,
        "co2_kg_per_plant_yr": cat["co2_kg_per_plant_yr"],
        "co2_for_esg_reporting": cat["co2_for_esg_reporting"],
        "water_lpd_manual": water_manual,
        "water_lpd_drip": water_drip,
        "water_lpd_mist": water_mist,
        "max_height_ft": max_height_ft,
        "root_depth_cm": root_depth_cm,
        "wind_tolerance": wind_tol,
        "heat_tolerance": heat_tol,
        "weight_kg_per_plant": weight_kg,
        "terrace_suitability_score": suit_score,
        "high_rise_suitable": high_rise,
        "container_minimum_litres": container_l,
        "climate_zones": climate_zones,
        "optimal_climate": optimal_climate,
        "methods": dict(cat["methods"]),
        "data_sources": data_sources,
        "shivani_validated": False,
        "active": True,
        "created_at": NOW,
        "updated_at": NOW,
    }
    rec.update(overrides)
    return rec


# ---------------------------------------------------------------------------
# SEED DATA — 76+ species
# ---------------------------------------------------------------------------

PLANT_SEED_DATA: List[Dict[str, Any]] = [

    # ════════════════════════════════════════════════════════════════════════
    # ANNUAL VEGETABLES (20 species)
    # ════════════════════════════════════════════════════════════════════════

    _p("plt_tomato_01", "Tomato", "Solanum lycopersicum", "Solanaceae",
       "annual_vegetable", "food",
       {"hindi": "टमाटर", "kannada": "ಟೊಮ್ಯಾಟೊ", "tamil": "தக்காளி", "telugu": "టమోటా", "marathi": "टोमॅटो", "bengali": "টমেটো"},
       3.5, "high", [11,12,1,2,3,10], 0.7, 0.85,
       2.0, 1.2, 0.8, 4.0, 30, "medium", "high", 2.5, 9, True, 15,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022", "KVK Rooftop Farming Manual"]),

    _p("plt_brinjal_01", "Brinjal / Baingan", "Solanum melongena", "Solanaceae",
       "annual_vegetable", "food",
       {"hindi": "बैंगन", "kannada": "ಬದನೆ", "tamil": "கத்திரிக்காய்", "telugu": "వంకాయ", "marathi": "वांगे", "bengali": "বেগুন"},
       4.0, "high", [10,11,12,1,2,3], 0.75, 0.88,
       2.5, 1.5, 1.0, 3.5, 35, "medium", "high", 3.0, 9, True, 20,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022", "IARI Vegetable Production"]),

    _p("plt_capsicum_01", "Capsicum / Green Pepper", "Capsicum annuum", "Solanaceae",
       "annual_vegetable", "food",
       {"hindi": "शिमला मिर्च", "kannada": "ದೊಡ್ಡ ಮೆಣಸಿನಕಾಯಿ", "tamil": "குடைமிளகாய்", "telugu": "క్యాప్సికమ్", "marathi": "सिमला मिरची", "bengali": "ক্যাপসিকাম"},
       2.5, "high", [11,12,1,2,3], 0.65, 0.82,
       2.0, 1.2, 0.8, 3.0, 30, "medium", "high", 2.0, 8, True, 15,
       WARM_ZONES, "composite",
       ["ICAR 2022", "NHB India"]),

    _p("plt_chilli_01", "Chilli / Mirchi", "Capsicum frutescens", "Solanaceae",
       "annual_vegetable", "food",
       {"hindi": "मिर्च", "kannada": "ಮೆಣಸಿನಕಾಯಿ", "tamil": "மிளகாய்", "telugu": "మిర్చి", "marathi": "मिरची", "bengali": "মরিচ"},
       1.5, "high", [10,11,12,1,2,3,4], 0.8, 0.90,
       1.5, 0.8, 0.5, 2.5, 25, "medium", "high", 1.5, 8, True, 10,
       WARM_ZONES, "hot-dry",
       ["ICAR 2022", "KVK Rooftop Farming Manual"]),

    _p("plt_okra_01", "Okra / Bhindi", "Abelmoschus esculentus", "Malvaceae",
       "annual_vegetable", "food",
       {"hindi": "भिंडी", "kannada": "ಬೆಂಡೆ", "tamil": "வெண்டை", "telugu": "బెండకాయ", "marathi": "भेंडी", "bengali": "ঢেঁড়স"},
       3.0, "high", [3,4,5,6,7,8,9], 0.7, 0.85,
       3.0, 1.8, 1.2, 5.0, 30, "high", "high", 2.5, 8, True, 15,
       ALL_ZONES, "hot-dry",
       ["ICAR 2022"]),

    _p("plt_bottle_gourd_01", "Bottle Gourd / Lauki", "Lagenaria siceraria", "Cucurbitaceae",
       "annual_vegetable", "food",
       {"hindi": "लौकी", "kannada": "ಸೋರೆಕಾಯಿ", "tamil": "சுரைக்காய்", "telugu": "సొర", "marathi": "दुधी भोपळा", "bengali": "লাউ"},
       8.0, "high", [6,7,8,9,10,11], 0.65, 0.80,
       4.0, 2.5, 1.5, 8.0, 40, "low", "high", 4.0, 7, False, 40,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022", "NHB India"]),

    _p("plt_ridge_gourd_01", "Ridge Gourd / Turai", "Luffa acutangula", "Cucurbitaceae",
       "annual_vegetable", "food",
       {"hindi": "तुरई", "kannada": "ಹೀರೆಕಾಯಿ", "tamil": "பீர்க்கங்காய்", "telugu": "బీర", "marathi": "दोडका", "bengali": "ঝিঙে"},
       6.0, "high", [6,7,8,9,10], 0.60, 0.78,
       4.0, 2.5, 1.5, 10.0, 40, "low", "high", 4.0, 7, False, 40,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    _p("plt_bitter_gourd_01", "Bitter Gourd / Karela (bush)", "Momordica charantia", "Cucurbitaceae",
       "annual_vegetable", "food",
       {"hindi": "करेला", "kannada": "ಹಾಗಲಕಾಯಿ", "tamil": "பாவக்காய்", "telugu": "కాకర", "marathi": "कारले", "bengali": "করলা"},
       3.5, "high", [6,7,8,9,10], 0.60, 0.78,
       3.5, 2.0, 1.2, 8.0, 35, "medium", "high", 3.5, 7, False, 30,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    _p("plt_cucumber_01", "Cucumber / Kheera", "Cucumis sativus", "Cucurbitaceae",
       "annual_vegetable", "food",
       {"hindi": "खीरा", "kannada": "ಸೌತೆಕಾಯಿ", "tamil": "வெள்ளரிக்காய்", "telugu": "దోసకాయ", "marathi": "काकडी", "bengali": "শসা"},
       5.0, "high", [3,4,5,6,9,10,11], 0.65, 0.83,
       3.5, 2.0, 1.2, 5.0, 35, "medium", "high", 3.0, 8, True, 20,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022", "KVK Rooftop Farming Manual"]),

    _p("plt_cherry_tomato_01", "Cherry Tomato", "Solanum lycopersicum var. cerasiforme", "Solanaceae",
       "annual_vegetable", "food",
       {"hindi": "चेरी टमाटर", "kannada": "ಚೆರ್ರಿ ಟೊಮ್ಯಾಟೊ", "tamil": "செர்ரி தக்காளி", "telugu": "చెర్రీ టమోటా", "marathi": "चेरी टोमॅटो", "bengali": "চেরি টমেটো"},
       2.5, "high", [11,12,1,2,3], 0.65, 0.88,
       1.5, 0.9, 0.6, 3.0, 25, "medium", "high", 1.5, 9, True, 12,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    _p("plt_pumpkin_01", "Pumpkin / Kaddu", "Cucurbita moschata", "Cucurbitaceae",
       "annual_vegetable", "food",
       {"hindi": "कद्दू", "kannada": "಼ದ್ದು", "tamil": "பூசணிக்காய்", "telugu": "గుమ్మడి", "marathi": "भोपळा", "bengali": "কুমড়া"},
       10.0, "medium", [8,9,10,11], 0.55, 0.75,
       4.5, 2.8, 1.8, 6.0, 45, "low", "high", 5.0, 6, False, 50,
       WARM_ZONES, "hot-dry",
       ["ICAR 2022"]),

    _p("plt_snake_gourd_01", "Snake Gourd / Chichinda", "Trichosanthes cucumerina", "Cucurbitaceae",
       "annual_vegetable", "food",
       {"hindi": "चिचिंडा", "kannada": "ಪಡವಲಕಾಯಿ", "tamil": "புடலங்காய்", "telugu": "పొట్లకాయ", "marathi": "पडवळ", "bengali": "চিচিঙ্গা"},
       5.0, "medium", [7,8,9,10], 0.55, 0.75,
       4.0, 2.5, 1.5, 8.0, 40, "low", "high", 4.0, 7, False, 35,
       ["hot-humid", "hot-dry"], "hot-humid",
       ["ICAR 2022"]),

    _p("plt_cauliflower_01", "Cauliflower / Phool Gobhi", "Brassica oleracea var. botrytis", "Brassicaceae",
       "annual_vegetable", "food",
       {"hindi": "फूल गोभी", "kannada": "ಹೂಕೋಸು", "tamil": "காலிஃப்ளவர்", "telugu": "కాలిఫ్లవర్", "marathi": "फ्लॉवर", "bengali": "ফুলকপি"},
       1.2, "high", [11,12,1,2], 0.40, 0.78,
       2.5, 1.5, 1.0, 2.5, 30, "medium", "medium", 3.0, 7, True, 20,
       ["composite", "cold-dry"], "composite",
       ["ICAR 2022", "IARI Vegetable Production"]),

    _p("plt_cabbage_01", "Cabbage / Patta Gobhi", "Brassica oleracea var. capitata", "Brassicaceae",
       "annual_vegetable", "food",
       {"hindi": "पत्ता गोभी", "kannada": "ಎಲೆಕೋಸು", "tamil": "முட்டைக்கோஸ்", "telugu": "క్యాబేజ్", "marathi": "कोबी", "bengali": "বাঁধাকপি"},
       1.5, "high", [11,12,1,2], 0.40, 0.80,
       2.5, 1.5, 1.0, 2.0, 30, "medium", "medium", 3.5, 7, True, 20,
       ["composite", "cold-dry"], "composite",
       ["ICAR 2022"]),

    _p("plt_spinach_01", "Spinach / Palak", "Spinacia oleracea", "Amaranthaceae",
       "annual_vegetable", "food",
       {"hindi": "पालक", "kannada": "ಪಾಲಕ್", "tamil": "பாலக்", "telugu": "పాలకూర", "marathi": "पालक", "bengali": "পালং"},
       1.0, "high", [10,11,12,1,2,3], 0.55, 0.88,
       1.5, 0.8, 0.5, 1.5, 20, "medium", "medium", 1.0, 9, True, 8,
       ALL_ZONES, "composite",
       ["ICAR 2022", "KVK Rooftop Farming Manual"]),

    _p("plt_amaranth_01", "Amaranth / Chaulai", "Amaranthus tricolor", "Amaranthaceae",
       "annual_vegetable", "food",
       {"hindi": "चौलाई", "kannada": "ಹರಿವೆ", "tamil": "முளைக்கீரை", "telugu": "తోటకూర", "marathi": "माठ", "bengali": "শাকশবজি"},
       1.5, "high", [6,7,8,9,10,11], 0.65, 0.90,
       2.0, 1.0, 0.7, 3.0, 25, "high", "high", 1.0, 9, True, 8,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    _p("plt_french_beans_01", "French Beans / Sem", "Phaseolus vulgaris", "Fabaceae",
       "annual_vegetable", "food",
       {"hindi": "सेम", "kannada": "ಹುರಳಿಕಾಯಿ", "tamil": "பீன்ஸ்", "telugu": "బీన్స్", "marathi": "घेवडा", "bengali": "শিম"},
       2.0, "high", [10,11,12,1,2,3], 0.55, 0.82,
       2.0, 1.2, 0.8, 3.0, 30, "medium", "medium", 2.0, 8, True, 15,
       ALL_ZONES, "composite",
       ["ICAR 2022"]),

    _p("plt_cowpea_01", "Cowpea / Lobia", "Vigna unguiculata", "Fabaceae",
       "annual_vegetable", "food",
       {"hindi": "लोबिया", "kannada": "ಅಲಸಂದೆ", "tamil": "தட்டைப்பயறு", "telugu": "బొబ్బర", "marathi": "चवळी", "bengali": "বরবটি"},
       1.8, "high", [6,7,8,9,10], 0.60, 0.85,
       2.5, 1.5, 1.0, 4.0, 30, "high", "high", 2.0, 8, True, 15,
       WARM_ZONES, "hot-dry",
       ["ICAR 2022"]),

    _p("plt_sweet_corn_01", "Sweet Corn / Bhutta", "Zea mays var. saccharata", "Poaceae",
       "annual_vegetable", "food",
       {"hindi": "भुट्टा", "kannada": "ಜೋಳ", "tamil": "சோளம்", "telugu": "మొక్కజొన్న", "marathi": "मका", "bengali": "ভুট্টা"},
       1.5, "medium", [7,8,9], 0.35, 0.75,
       3.5, 2.0, 1.3, 6.0, 50, "medium", "high", 3.0, 7, False, 25,
       WARM_ZONES, "composite",
       ["ICAR 2022"]),

    _p("plt_radish_01", "Radish / Mooli", "Raphanus sativus", "Brassicaceae",
       "annual_vegetable", "food",
       {"hindi": "मूली", "kannada": "ಮೂಲಂಗಿ", "tamil": "முள்ளங்கி", "telugu": "మూలంగి", "marathi": "मुळा", "bengali": "মূলো"},
       1.0, "high", [10,11,12,1,2], 0.45, 0.90,
       1.5, 0.8, 0.5, 1.5, 20, "medium", "medium", 1.0, 9, True, 8,
       ALL_ZONES, "composite",
       ["ICAR 2022", "KVK Rooftop Farming Manual"]),

    # ════════════════════════════════════════════════════════════════════════
    # SHORT CYCLE HERBS (10 species)
    # ════════════════════════════════════════════════════════════════════════

    _p("plt_coriander_01", "Coriander / Dhania", "Coriandrum sativum", "Apiaceae",
       "short_cycle_herb", "food",
       {"hindi": "धनिया", "kannada": "ಕೊತ್ತಂಬರಿ", "tamil": "கொத்தமல்லி", "telugu": "కొత్తిమీర", "marathi": "कोथिंबीर", "bengali": "ধনেপাতা"},
       0.3, "high", [10,11,12,1,2,3,4], 0.60, 0.88,
       1.0, 0.5, 0.3, 1.0, 15, "medium", "medium", 0.3, 10, True, 5,
       ALL_ZONES, "composite",
       ["ICAR 2022", "KVK Rooftop Farming Manual"]),

    _p("plt_fenugreek_01", "Fenugreek / Methi", "Trigonella foenum-graecum", "Fabaceae",
       "short_cycle_herb", "food",
       {"hindi": "मेथी", "kannada": "ಮೆಂತ್ಯ", "tamil": "வெந்தயம்", "telugu": "మేంతులు", "marathi": "मेथी", "bengali": "মেথি"},
       0.4, "high", [10,11,12,1,2,3], 0.55, 0.90,
       1.0, 0.5, 0.3, 0.8, 15, "medium", "medium", 0.3, 9, True, 5,
       ALL_ZONES, "composite",
       ["ICAR 2022"]),

    _p("plt_dill_01", "Dill / Suwa", "Anethum graveolens", "Apiaceae",
       "short_cycle_herb", "food",
       {"hindi": "सुआ", "kannada": "ಸಬ್ಬಸ್ಸಿಗೆ", "tamil": "சோம்பு", "telugu": "సోపు", "marathi": "शेपू", "bengali": "শুলফা"},
       0.2, "medium", [10,11,12,1,2,3], 0.50, 0.85,
       0.8, 0.4, 0.3, 1.5, 12, "medium", "medium", 0.2, 9, True, 5,
       ALL_ZONES, "composite",
       ["ICAR 2022"]),

    _p("plt_radish_microgreens_01", "Radish Microgreens", "Raphanus sativus", "Brassicaceae",
       "short_cycle_herb", "food",
       {"hindi": "मूली माइक्रोग्रीन्स", "kannada": "ಮೂಲಂಗಿ ಮೈಕ್ರೋಗ್ರೀನ್ಸ್", "tamil": "முளை வெள்ளரி", "telugu": "మైక్రోగ్రీన్స్", "marathi": "मुळा मायक्रोग्रीन्स", "bengali": "মূলো মাইক্রোগ্রিন"},
       0.1, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.95,
       0.5, 0.3, 0.2, 0.3, 5, "medium", "high", 0.1, 10, True, 2,
       ALL_ZONES, "composite",
       ["Urban Farming India", "Hydroponics Association India"]),

    _p("plt_mustard_microgreens_01", "Mustard Microgreens", "Brassica juncea", "Brassicaceae",
       "short_cycle_herb", "food",
       {"hindi": "सरसों माइक्रोग्रीन्स", "kannada": "ಸಾಸಿವೆ ಮೈಕ್ರೋಗ್ರೀನ್ಸ್", "tamil": "கடுகு முளை", "telugu": "ఆవాలు మైక్రోగ్రీన్స్", "marathi": "मोहरी मायक्रोग्रीन्स", "bengali": "সরিষা মাইক্রোগ্রিন"},
       0.1, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.95,
       0.5, 0.3, 0.2, 0.3, 5, "medium", "high", 0.1, 10, True, 2,
       ALL_ZONES, "composite",
       ["Urban Farming India"]),

    _p("plt_sunflower_microgreens_01", "Sunflower Microgreens", "Helianthus annuus", "Asteraceae",
       "short_cycle_herb", "food",
       {"hindi": "सूरजमुखी माइक्रोग्रीन्स", "kannada": "ಸೂರ್ಯಕಾಂತಿ ಮೈಕ್ರೋಗ್ರೀನ್ಸ್", "tamil": "சூரியகாந்தி முளை", "telugu": "పొద్దుతిరుగుడు మైక్రోగ్రీన్స్", "marathi": "सूर्यफूल मायक्रोग्रीन्स", "bengali": "সূর্যমুখী মাইক্রোগ্রিন"},
       0.12, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.95,
       0.5, 0.3, 0.2, 0.3, 5, "medium", "high", 0.1, 10, True, 2,
       ALL_ZONES, "composite",
       ["Urban Farming India"]),

    _p("plt_mint_01", "Mint / Pudina", "Mentha spicata", "Lamiaceae",
       "short_cycle_herb", "food",
       {"hindi": "पुदीना", "kannada": "ಪುದೀನ", "tamil": "புதினா", "telugu": "పుదీనా", "marathi": "पुदिना", "bengali": "পুদিনা"},
       0.5, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 0.85, 0.88,
       1.2, 0.7, 0.4, 1.0, 20, "medium", "medium", 0.5, 10, True, 5,
       ALL_ZONES, "hot-humid",
       ["ICAR 2022", "KVK Rooftop Farming Manual"]),

    _p("plt_basil_01", "Basil / Tulsi Sabji", "Ocimum basilicum", "Lamiaceae",
       "short_cycle_herb", "food",
       {"hindi": "तुलसी (सब्जी)", "kannada": "ಬೇಸಿಲ್", "tamil": "திருநீற்றுப்பச்சை", "telugu": "బేసిల్", "marathi": "बेसिल", "bengali": "তুলসি"},
       0.4, "high", [4,5,6,7,8,9,10,11], 0.70, 0.88,
       1.0, 0.6, 0.4, 1.5, 20, "low", "high", 0.5, 9, True, 5,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    _p("plt_parsley_01", "Parsley", "Petroselinum crispum", "Apiaceae",
       "short_cycle_herb", "food",
       {"hindi": "अजमोद", "kannada": "ಪಾರ್ಸ್ಲೇ", "tamil": "பார்ஸ்லி", "telugu": "పార్స్లీ", "marathi": "पार्सले", "bengali": "পার্সলে"},
       0.3, "medium", [10,11,12,1,2,3,4], 0.60, 0.82,
       1.0, 0.6, 0.4, 1.0, 15, "medium", "medium", 0.3, 8, True, 5,
       ALL_ZONES, "composite",
       ["ICAR 2022"]),

    _p("plt_arugula_01", "Arugula / Rocket", "Eruca vesicaria", "Brassicaceae",
       "short_cycle_herb", "food",
       {"hindi": "रॉकेट सलाद", "kannada": "ಅರುಗುಲಾ", "tamil": "ரோக்கெட் கீரை", "telugu": "అరుగులా", "marathi": "अरुगुला", "bengali": "আরুগুলা"},
       0.3, "medium", [10,11,12,1,2,3], 0.55, 0.80,
       1.0, 0.5, 0.3, 0.8, 15, "medium", "medium", 0.2, 8, True, 5,
       ["composite", "cold-dry"], "composite",
       ["Urban Farming India"]),

    # ════════════════════════════════════════════════════════════════════════
    # PERENNIAL SHRUBS (10 species)
    # ════════════════════════════════════════════════════════════════════════

    _p("plt_hibiscus_01", "Hibiscus / China Rose", "Hibiscus rosa-sinensis", "Malvaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "गुड़हल", "kannada": "ದಾಸವಾಳ", "tamil": "செம்பருத்தி", "telugu": "దాసవాళి", "marathi": "जास्वंद", "bengali": "জবা"},
       0.0, "high", [], 1.0, 0.90,
       2.5, 1.5, 1.0, 5.0, 50, "medium", "high", 4.0, 8, True, 20,
       WARM_ZONES, "hot-humid",
       ["Horticulture India", "NBB India"]),

    _p("plt_jasmine_01", "Jasmine / Mogra", "Jasminum sambac", "Oleaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "मोगरा", "kannada": "ಮಲ್ಲಿಗೆ", "tamil": "மல்லிகை", "telugu": "మల్లె", "marathi": "मोगरा", "bengali": "মালতী"},
       0.0, "high", [3,4,5,6,7,8,9,10], 0.85, 0.88,
       2.0, 1.2, 0.8, 4.0, 40, "medium", "high", 3.0, 9, True, 15,
       WARM_ZONES, "hot-humid",
       ["Horticulture India"]),

    _p("plt_crossandra_01", "Crossandra / Kanakambaram", "Crossandra infundibuliformis", "Acanthaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "अबोली", "kannada": "ಕನಕಾಂಬರ", "tamil": "கனகாம்பரம்", "telugu": "కనకాంబరాలు", "marathi": "अबोली", "bengali": "ক্রসান্দ্রা"},
       0.0, "high", [3,4,5,6,7,8,9,10,11], 0.85, 0.88,
       1.8, 1.0, 0.7, 2.5, 30, "medium", "high", 2.0, 8, True, 12,
       ["hot-humid"], "hot-humid",
       ["Horticulture India", "NBB India"]),

    _p("plt_bougainvillea_01", "Bougainvillea", "Bougainvillea spectabilis", "Nyctaginaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "बोगेनविलिया", "kannada": "ಬೌಗೈನ್ವಿಲ್ಲಿಯಾ", "tamil": "காகிதப்பூ", "telugu": "బొగన్విల్లా", "marathi": "बोगनवेल", "bengali": "বাগানবিলাস"},
       0.0, "high", [1,2,3,4,11,12], 0.75, 0.92,
       1.5, 0.8, 0.5, 15.0, 60, "high", "high", 5.0, 9, True, 25,
       WARM_ZONES, "hot-dry",
       ["Horticulture India"]),

    _p("plt_ixora_01", "Ixora", "Ixora coccinea", "Rubiaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "रुख्मणी", "kannada": "ಇಕ್ಸೋರಾ", "tamil": "ஈக்ஸோரா", "telugu": "ఇక్సోరా", "marathi": "रुख्मिणी", "bengali": "রঙন"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.88,
       2.0, 1.2, 0.8, 4.0, 40, "medium", "high", 3.0, 8, True, 15,
       WARM_ZONES, "hot-humid",
       ["Horticulture India"]),

    _p("plt_plumbago_01", "Plumbago / Chitrak", "Plumbago auriculata", "Plumbaginaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "चित्रक", "kannada": "ಚಿತ್ರಕ", "tamil": "வெண்காடம்", "telugu": "చిత్రమూలం", "marathi": "चित्रमूळ", "bengali": "চিত্রক"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.90,
       1.5, 0.8, 0.5, 4.0, 40, "high", "high", 2.5, 9, True, 12,
       WARM_ZONES, "hot-dry",
       ["Horticulture India"]),

    _p("plt_tecoma_01", "Tecoma / Yellow Elder", "Tecoma stans", "Bignoniaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "तेकोमा", "kannada": "ಟೆಕೋಮ", "tamil": "தேக்கோமா", "telugu": "టెకోమా", "marathi": "तेकोमा", "bengali": "তেকোমা"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.90,
       2.0, 1.2, 0.8, 8.0, 50, "high", "high", 5.0, 8, True, 20,
       WARM_ZONES, "hot-dry",
       ["Horticulture India"]),

    _p("plt_pentas_01", "Pentas / Star Flower", "Pentas lanceolata", "Rubiaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "पेंटास", "kannada": "ಪೆಂಟಾಸ್", "tamil": "ஐந்தில் மலர்", "telugu": "పెంటాస్", "marathi": "पेंटास", "bengali": "পেন্টাস"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.88,
       1.8, 1.0, 0.7, 3.0, 35, "medium", "high", 2.0, 9, True, 10,
       WARM_ZONES, "hot-humid",
       ["Horticulture India"]),

    _p("plt_duranta_01", "Duranta / Golden Dewdrop", "Duranta erecta", "Verbenaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "नीली बेरी", "kannada": "ದುರಾಂಟ", "tamil": "துரன்டா", "telugu": "దురంటా", "marathi": "दुरांटा", "bengali": "দুরান্তা"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.90,
       1.5, 0.8, 0.5, 6.0, 45, "high", "high", 4.0, 8, True, 15,
       WARM_ZONES, "hot-dry",
       ["Horticulture India"]),

    _p("plt_clerodendrum_01", "Clerodendrum / Bleeding Heart Vine", "Clerodendrum thomsoniae", "Lamiaceae",
       "perennial_shrub", "ornamental",
       {"hindi": "रक्त चमेली", "kannada": "ಕ್ಲಿರೋಡೆಂಡ್ರಮ್", "tamil": "கிளீரோடெண்ட்ரம்", "telugu": "క్లెరోడెండ్రమ్", "marathi": "क्लिरोडेंड्रम", "bengali": "ক্লেরোডেনড্রাম"},
       0.0, "medium", [2,3,4,5,6,7,8,9,10,11], 0.85, 0.85,
       2.0, 1.2, 0.8, 6.0, 40, "low", "high", 3.0, 7, False, 15,
       ["hot-humid"], "hot-humid",
       ["Horticulture India"]),

    # ════════════════════════════════════════════════════════════════════════
    # MEDICINAL & AROMATIC (10 species)
    # ════════════════════════════════════════════════════════════════════════

    _p("plt_tulsi_01", "Tulsi / Holy Basil", "Ocimum tenuiflorum", "Lamiaceae",
       "medicinal_aromatic", "medicinal",
       {"hindi": "तुलसी", "kannada": "ತುಳಸಿ", "tamil": "துளசி", "telugu": "తులసి", "marathi": "तुळस", "bengali": "তুলসী"},
       0.3, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.92,
       1.0, 0.6, 0.4, 2.5, 30, "medium", "high", 1.0, 10, True, 5,
       WARM_ZONES, "hot-humid",
       ["AYUSH Ministry India", "ICAR 2022"]),

    _p("plt_curry_leaf_01", "Curry Leaf / Kadi Patta", "Murraya koenigii", "Rutaceae",
       "medicinal_aromatic", "food",
       {"hindi": "कड़ी पत्ता", "kannada": "ಕರಿಬೇವು", "tamil": "கறிவேப்பிலை", "telugu": "కరివేపాకు", "marathi": "कढीपत्ता", "bengali": "কারিপাতা"},
       0.5, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.88,
       1.5, 0.9, 0.6, 6.0, 50, "medium", "high", 3.0, 10, True, 15,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022", "KVK Rooftop Farming Manual"]),

    _p("plt_lemongrass_01", "Lemongrass / Nimbu Ghaas", "Cymbopogon citratus", "Poaceae",
       "medicinal_aromatic", "mixed",
       {"hindi": "नींबू घास", "kannada": "ಲೆಮನ್ ಗ್ರಾಸ್", "tamil": "எலுமிச்சை புல்", "telugu": "నిమ్మ గడ్డి", "marathi": "लिंबू गवत", "bengali": "লেমনগ্রাস"},
       1.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.90,
       2.0, 1.2, 0.8, 4.0, 40, "high", "high", 2.0, 9, True, 15,
       WARM_ZONES, "hot-dry",
       ["ICAR 2022", "AICRP Aromatic Plants"]),

    _p("plt_aloe_vera_01", "Aloe Vera", "Aloe vera", "Asphodelaceae",
       "medicinal_aromatic", "medicinal",
       {"hindi": "घृतकुमारी", "kannada": "ಲೋಳೆಸರ", "tamil": "கற்றாழை", "telugu": "కలబంద", "marathi": "कोरफड", "bengali": "অ্যালোভেরা"},
       0.5, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.95,
       0.5, 0.3, 0.2, 2.0, 20, "high", "high", 1.5, 10, True, 8,
       ALL_ZONES, "hot-dry",
       ["AYUSH Ministry India", "ICAR 2022"]),

    _p("plt_ashwagandha_01", "Ashwagandha / Winter Cherry", "Withania somnifera", "Solanaceae",
       "medicinal_aromatic", "medicinal",
       {"hindi": "अश्वगंधा", "kannada": "ಅಶ್ವಗಂಧ", "tamil": "அமுக்கரா", "telugu": "అశ్వగంధ", "marathi": "अश्वगंधा", "bengali": "অশ্বগন্ধা"},
       0.3, "medium", [10,11,12,1,2], 0.50, 0.82,
       1.0, 0.6, 0.4, 3.0, 35, "high", "high", 2.0, 8, True, 12,
       ["hot-dry", "composite"], "hot-dry",
       ["AYUSH Ministry India", "ICAR Medicinal Plants"]),

    _p("plt_brahmi_01", "Brahmi / Water Hyssop", "Bacopa monnieri", "Plantaginaceae",
       "medicinal_aromatic", "medicinal",
       {"hindi": "ब्राह्मी", "kannada": "ಬ್ರಾಹ್ಮಿ", "tamil": "வல்லாரை", "telugu": "బ్రాహ్మి", "marathi": "ब्राह्मी", "bengali": "ব্রাহ্মি"},
       0.2, "medium", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.85,
       2.0, 1.2, 0.8, 0.5, 10, "low", "high", 0.5, 8, True, 5,
       ["hot-humid"], "hot-humid",
       ["AYUSH Ministry India"]),

    _p("plt_giloy_01", "Giloy / Guduchi", "Tinospora cordifolia", "Menispermaceae",
       "medicinal_aromatic", "medicinal",
       {"hindi": "गिलोय", "kannada": "ಅಮೃತಬಳ್ಳಿ", "tamil": "சீந்தில்", "telugu": "తిప్పతీగ", "marathi": "गुळवेल", "bengali": "গুলঞ্চ"},
       0.0, "low", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.85,
       1.5, 0.9, 0.6, 10.0, 30, "medium", "high", 2.0, 7, False, 15,
       WARM_ZONES, "hot-humid",
       ["AYUSH Ministry India"],
       methods={"grow_bag": False, "raised_bed": True, "nft_hydroponics": False, "dwc_hydroponics": False, "vertical_panel": False, "trellis": True}),

    _p("plt_neem_dwarf_01", "Neem (Dwarf) / Nim", "Azadirachta indica (dwarf)", "Meliaceae",
       "medicinal_aromatic", "medicinal",
       {"hindi": "नीम (बौना)", "kannada": "ಬೇವಿನ ಗಿಡ", "tamil": "வேப்பிளை (குட்டை)", "telugu": "వేప (పొట్టి)", "marathi": "कडुलिंब (बटू)", "bengali": "নিম (বামন)"},
       0.0, "low", [], 1.0, 0.80,
       1.0, 0.6, 0.4, 8.0, 60, "high", "high", 6.0, 7, False, 30,
       WARM_ZONES, "hot-dry",
       ["ICAR Medicinal Plants"]),

    _p("plt_guava_dwarf_med_01", "Guava (Dwarf) / Amrood", "Psidium guajava (dwarf)", "Myrtaceae",
       "medicinal_aromatic", "food",
       {"hindi": "अमरूद (बौना)", "kannada": "ಪೇರಲ (ಕುಬ್ಜ)", "tamil": "கொய்யா (குட்டை)", "telugu": "జామ (పొట్టి)", "marathi": "पेरू (बटू)", "bengali": "পেয়ারা (বামন)"},
       4.0, "high", [7,8,9,10,11,12,1,2], 0.70, 0.82,
       2.5, 1.5, 1.0, 10.0, 60, "medium", "high", 8.0, 8, False, 40,
       WARM_ZONES, "hot-dry",
       ["ICAR 2022", "NHB India"]),

    _p("plt_lemon_dwarf_01", "Lemon (Dwarf) / Nimbu", "Citrus limon (dwarf)", "Rutaceae",
       "medicinal_aromatic", "food",
       {"hindi": "नींबू (बौना)", "kannada": "ನಿಂಬೆ (ಕುಬ್ಜ)", "tamil": "எலுமிச்சை (குட்டை)", "telugu": "నిమ్మ (పొట్టి)", "marathi": "लिंबू (बटू)", "bengali": "লেবু (বামন)"},
       3.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 0.90, 0.80,
       2.0, 1.2, 0.8, 6.0, 60, "medium", "high", 8.0, 8, True, 35,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022", "NHB India"]),

    # ════════════════════════════════════════════════════════════════════════
    # WOODY TREES (8 species)
    # ════════════════════════════════════════════════════════════════════════

    _p("plt_moringa_01", "Moringa / Drumstick", "Moringa oleifera", "Moringaceae",
       "woody_tree", "food",
       {"hindi": "सहजन", "kannada": "ನುಗ್ಗೆ", "tamil": "முருங்கை", "telugu": "మునగ", "marathi": "शेवगा", "bengali": "সজনে"},
       5.0, "high", [2,3,4,5,6,7,8,9,10,11], 0.80, 0.85,
       3.0, 1.8, 1.2, 20.0, 80, "high", "high", 10.0, 9, False, 50,
       WARM_ZONES, "hot-dry",
       ["FAO Moringa Report 2021", "ICAR 2022"]),

    _p("plt_papaya_dwarf_01", "Papaya (Dwarf) / Papita", "Carica papaya (dwarf)", "Caricaceae",
       "woody_tree", "food",
       {"hindi": "पपीता (बौना)", "kannada": "ಪಪ್ಪಾಯಿ (ಕುಬ್ಜ)", "tamil": "பப்பாளி (குட்டை)", "telugu": "బొప్పాయి (పొట్టి)", "marathi": "पपई (बटू)", "bengali": "পেঁপে (বামন)"},
       15.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 0.85, 0.78,
       5.0, 3.0, 2.0, 12.0, 80, "low", "high", 12.0, 8, False, 60,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022", "NHB India"]),

    _p("plt_banana_dwarf_01", "Banana (Dwarf Cavendish)", "Musa acuminata (Dwarf Cavendish)", "Musaceae",
       "woody_tree", "food",
       {"hindi": "केला (बौना कैवेंडिश)", "kannada": "ಬಾಳೆ (ಕುಬ್ಜ ಕ್ಯಾವೆಂಡಿಷ್)", "tamil": "வாழை (குட்டை)", "telugu": "అరటి (పొట్టి)", "marathi": "केळी (बटू)", "bengali": "কলা (বামন)"},
       12.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 0.75, 0.75,
       6.0, 4.0, 2.5, 10.0, 90, "low", "high", 20.0, 7, False, 80,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022", "NHB India"]),

    _p("plt_guava_l49_01", "Guava L-49 Compact / Amrood", "Psidium guajava (L-49)", "Myrtaceae",
       "woody_tree", "food",
       {"hindi": "अमरूद L-49", "kannada": "ಪೇರಲ L-49", "tamil": "கொய்யா L-49", "telugu": "జామ L-49", "marathi": "पेरू L-49", "bengali": "পেয়ারা L-49"},
       8.0, "high", [7,8,9,10,11,12], 0.65, 0.80,
       3.0, 1.8, 1.2, 12.0, 70, "medium", "high", 15.0, 8, False, 60,
       WARM_ZONES, "hot-dry",
       ["ICAR 2022", "NHB India"]),

    _p("plt_pomegranate_01", "Pomegranate / Anar", "Punica granatum (Bhagwa)", "Lythraceae",
       "woody_tree", "food",
       {"hindi": "अनार", "kannada": "ದಾಳಿಂಬೆ", "tamil": "மாதுளை", "telugu": "దానిమ్మ", "marathi": "डाळिंब", "bengali": "ডালিম"},
       5.0, "high", [7,8,9,10,11], 0.60, 0.82,
       2.5, 1.5, 1.0, 10.0, 60, "high", "high", 12.0, 9, False, 50,
       WARM_ZONES, "hot-dry",
       ["ICAR 2022", "NHB India"]),

    _p("plt_plumeria_01", "Plumeria / Champa / Frangipani", "Plumeria rubra", "Apocynaceae",
       "woody_tree", "ornamental",
       {"hindi": "चंपा", "kannada": "ಚಂಪಾ", "tamil": "சம்பங்கி", "telugu": "ముత్యాలమూగ", "marathi": "चाफा", "bengali": "চাঁপা"},
       0.0, "high", [3,4,5,6,7,8,9,10], 0.75, 0.88,
       1.5, 0.9, 0.6, 15.0, 60, "high", "high", 10.0, 9, True, 40,
       WARM_ZONES, "hot-dry",
       ["Horticulture India"]),

    _p("plt_fig_01", "Fig / Anjeer (Brown Turkey)", "Ficus carica (Brown Turkey)", "Moraceae",
       "woody_tree", "food",
       {"hindi": "अंजीर", "kannada": "ಅಂಜೂರ", "tamil": "அத்தி", "telugu": "అంజూర", "marathi": "अंजीर", "bengali": "ডুমুর"},
       4.0, "medium", [6,7,8,9,11,12], 0.60, 0.80,
       2.5, 1.5, 1.0, 10.0, 70, "medium", "high", 12.0, 8, False, 50,
       WARM_ZONES, "hot-dry",
       ["ICAR 2022", "NHB India"]),

    _p("plt_mulberry_dwarf_01", "Mulberry (Dwarf) / Shahtoot", "Morus alba (dwarf)", "Moraceae",
       "woody_tree", "food",
       {"hindi": "शहतूत (बौना)", "kannada": "ಹಿಪ್ಪುನೇರಳೆ (ಕುಬ್ಜ)", "tamil": "மல்பெரி (குட்டை)", "telugu": "మల్బెర్రీ (పొట్టి)", "marathi": "तूती (बटू)", "bengali": "তুঁতফল (বামন)"},
       3.0, "medium", [2,3,4,5,6], 0.50, 0.78,
       3.0, 1.8, 1.2, 8.0, 70, "medium", "medium", 10.0, 7, False, 40,
       ["composite", "cold-dry"], "composite",
       ["ICAR 2022"]),

    # ════════════════════════════════════════════════════════════════════════
    # CREEPERS & CLIMBERS (6 species)
    # ════════════════════════════════════════════════════════════════════════

    _p("plt_bitter_gourd_trellis_01", "Bitter Gourd Trellis / Karela", "Momordica charantia", "Cucurbitaceae",
       "creeper_climber", "food",
       {"hindi": "करेला (बेल)", "kannada": "ಹಾಗಲ ಬಳ್ಳಿ", "tamil": "பாவக்காய் கொடி", "telugu": "కాకర తీగ", "marathi": "कारले (वेल)", "bengali": "করলা লতা"},
       5.0, "high", [6,7,8,9,10], 0.55, 0.78,
       4.0, 2.5, 1.5, 12.0, 35, "medium", "high", 4.0, 7, False, 30,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    _p("plt_ridge_gourd_trellis_01", "Ridge Gourd Trellis / Turai", "Luffa acutangula", "Cucurbitaceae",
       "creeper_climber", "food",
       {"hindi": "तुरई (बेल)", "kannada": "ಹೀರೆ ಬಳ್ಳಿ", "tamil": "பீர்க்கன் கொடி", "telugu": "బీర తీగ", "marathi": "दोडका (वेल)", "bengali": "ঝিঙে লতা"},
       7.0, "high", [6,7,8,9,10], 0.55, 0.78,
       4.5, 2.8, 1.8, 12.0, 40, "low", "high", 4.5, 7, False, 35,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    _p("plt_bottle_gourd_trellis_01", "Bottle Gourd Trellis / Lauki", "Lagenaria siceraria", "Cucurbitaceae",
       "creeper_climber", "food",
       {"hindi": "लौकी (बेल)", "kannada": "ಸೋರೆ ಬಳ್ಳಿ", "tamil": "சுரை கொடி", "telugu": "సొర తీగ", "marathi": "दुधी (वेल)", "bengali": "লাউ লতা"},
       10.0, "high", [6,7,8,9,10,11], 0.60, 0.78,
       5.0, 3.0, 2.0, 10.0, 40, "low", "high", 4.0, 7, False, 35,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    _p("plt_passion_fruit_01", "Passion Fruit / Krishna Phal", "Passiflora edulis", "Passifloraceae",
       "creeper_climber", "food",
       {"hindi": "कृष्ण फल", "kannada": "ಪ್ಯಾಶನ್ ಫ್ರೂಟ್", "tamil": "பேஷன் ஃப்ரூட்", "telugu": "పాషన్ ఫ్రూట్", "marathi": "पॅशन फ्रूट", "bengali": "প্যাশন ফল"},
       6.0, "medium", [7,8,9,10,11], 0.60, 0.75,
       3.5, 2.0, 1.3, 8.0, 40, "medium", "high", 3.0, 7, False, 30,
       ["hot-humid", "composite"], "hot-humid",
       ["ICAR 2022", "NHB India"]),

    _p("plt_yardlong_bean_01", "Yardlong Bean / Bora / Bodi", "Vigna unguiculata subsp. sesquipedalis", "Fabaceae",
       "creeper_climber", "food",
       {"hindi": "बोडा", "kannada": "ಬೋಡ", "tamil": "தட்டைப்பயறு கொடி", "telugu": "అలసంద తీగ", "marathi": "चवळी (वेल)", "bengali": "বরবটি লতা"},
       3.0, "high", [6,7,8,9,10], 0.60, 0.83,
       3.0, 1.8, 1.2, 8.0, 30, "medium", "high", 2.5, 8, False, 20,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    _p("plt_ivy_gourd_01", "Ivy Gourd / Kundru / Tindora", "Coccinia grandis", "Cucurbitaceae",
       "creeper_climber", "food",
       {"hindi": "कुंदरू", "kannada": "ತೊಂಡೆ", "tamil": "கோவக்காய்", "telugu": "దొండకాయ", "marathi": "तोंडली", "bengali": "তেলাকুচা"},
       4.0, "high", [7,8,9,10,11], 0.65, 0.85,
       3.0, 1.8, 1.2, 6.0, 30, "medium", "high", 3.0, 8, False, 20,
       WARM_ZONES, "hot-humid",
       ["ICAR 2022"]),

    # ════════════════════════════════════════════════════════════════════════
    # ORNAMENTAL GROUND (6 species)
    # ════════════════════════════════════════════════════════════════════════

    _p("plt_portulaca_01", "Portulaca / Sun Rose / 9 O'Clock", "Portulaca grandiflora", "Portulacaceae",
       "ornamental_ground", "ornamental",
       {"hindi": "पोर्चुलाका", "kannada": "ಪೋರ್ಚುಲಾಕ", "tamil": "போர்ட்யுலாக்கா", "telugu": "పోర్ట్యులాకా", "marathi": "पोर्चुलाका", "bengali": "পোর্চুলাকা"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.92,
       0.5, 0.3, 0.2, 0.5, 10, "high", "high", 0.5, 10, True, 3,
       WARM_ZONES, "hot-dry",
       ["Horticulture India"]),

    _p("plt_sedum_01", "Sedum Morganianum / Burro's Tail", "Sedum morganianum", "Crassulaceae",
       "ornamental_ground", "ornamental",
       {"hindi": "सेडम", "kannada": "ಸೆಡಂ", "tamil": "செடம்", "telugu": "సీడం", "marathi": "सेडम", "bengali": "সেডাম"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.95,
       0.3, 0.2, 0.1, 0.5, 10, "high", "high", 0.3, 10, True, 3,
       WARM_ZONES, "hot-dry",
       ["Horticulture India"]),

    _p("plt_tradescantia_01", "Tradescantia / Wandering Jew", "Tradescantia zebrina", "Commelinaceae",
       "ornamental_ground", "ornamental",
       {"hindi": "ट्रेडस्कैंशिया", "kannada": "ಟ್ರೇಡ್ಸ್ಕ್ಯಾಂಶಿಯಾ", "tamil": "ட்ரேட்ஸ்கான்ஷியா", "telugu": "ట్రాడెస్కాన్షియా", "marathi": "ट्रेडस्कॅंशिया", "bengali": "ট্রেডেস্কান্টিয়া"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.92,
       0.8, 0.5, 0.3, 0.5, 10, "medium", "high", 0.3, 9, True, 3,
       WARM_ZONES, "hot-humid",
       ["Horticulture India"]),

    _p("plt_coleus_01", "Coleus / Painted Leaf", "Plectranthus scutellarioides", "Lamiaceae",
       "ornamental_ground", "ornamental",
       {"hindi": "कोलियस", "kannada": "ಕೊಲಿಯಸ್", "tamil": "கோலியஸ்", "telugu": "కోలియస్", "marathi": "कोलियस", "bengali": "কোলিউস"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.90,
       1.5, 0.9, 0.6, 2.0, 20, "low", "high", 0.8, 8, True, 8,
       WARM_ZONES, "hot-humid",
       ["Horticulture India"]),

    _p("plt_vinca_01", "Vinca / Periwinkle / Sadabahar", "Catharanthus roseus", "Apocynaceae",
       "ornamental_ground", "ornamental",
       {"hindi": "सदाबहार", "kannada": "ಸದಾಬಹಾರ", "tamil": "நித்தியகல்யாணி", "telugu": "బిల్లగన్నేరు", "marathi": "सदाफुली", "bengali": "নয়নতারা"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.92,
       1.0, 0.6, 0.4, 2.0, 20, "high", "high", 1.0, 9, True, 8,
       ALL_ZONES, "hot-dry",
       ["Horticulture India"]),

    _p("plt_begonia_01", "Begonia", "Begonia semperflorens", "Begoniaceae",
       "ornamental_ground", "ornamental",
       {"hindi": "बेगोनिया", "kannada": "ಬೆಗೋನಿಯಾ", "tamil": "பெகோனியா", "telugu": "బెగోనియా", "marathi": "बेगोनिया", "bengali": "বেগোনিয়া"},
       0.0, "high", [10,11,12,1,2,3,4], 0.60, 0.85,
       1.5, 0.9, 0.6, 1.5, 20, "low", "medium", 0.8, 8, True, 8,
       HUMID_COMPOSITE, "hot-humid",
       ["Horticulture India"]),

    # ════════════════════════════════════════════════════════════════════════
    # BUTTERFLY & POLLINATOR (6 species)
    # ════════════════════════════════════════════════════════════════════════

    _p("plt_lantana_01", "Lantana / Raimuniya", "Lantana camara", "Verbenaceae",
       "butterfly_pollinator", "ornamental",
       {"hindi": "राईमुनिया", "kannada": "ಲ್ಯಾಂಟಾನ", "tamil": "லாண்டனா", "telugu": "లాంటానా", "marathi": "घाणेरी", "bengali": "লান্টানা"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.92,
       1.5, 0.8, 0.5, 4.0, 35, "high", "high", 2.5, 9, True, 10,
       WARM_ZONES, "hot-dry",
       ["WWF India Pollinator Guide", "Horticulture India"]),

    _p("plt_plumbago_butterfly_01", "Plumbago (Butterfly Variety)", "Plumbago auriculata", "Plumbaginaceae",
       "butterfly_pollinator", "ornamental",
       {"hindi": "चित्रक (तितली)", "kannada": "ಚಿತ್ರಕ (ಚಿಟ್ಟೆ)", "tamil": "வெண்காடம் (வண்ணத்திபூச்சி)", "telugu": "చిత్రమూలం (సీతాకోకచిలుక)", "marathi": "चित्रमूळ (फुलपाखरू)", "bengali": "চিত্রক (প্রজাপতি)"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.90,
       1.5, 0.8, 0.5, 4.0, 40, "high", "high", 2.5, 9, True, 12,
       WARM_ZONES, "hot-dry",
       ["WWF India Pollinator Guide"]),

    _p("plt_ixora_pollinator_01", "Ixora (Pollinator Variety)", "Ixora coccinea", "Rubiaceae",
       "butterfly_pollinator", "ornamental",
       {"hindi": "रुख्मणी (परागण)", "kannada": "ಇಕ್ಸೋರಾ (ಪರಾಗ)", "tamil": "ஈக்ஸோரா (மகரந்தம்)", "telugu": "ఇక్సోరా (పరాగ)", "marathi": "रुख्मिणी (परागण)", "bengali": "রঙন (পরাগায়ন)"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.88,
       2.0, 1.2, 0.8, 4.0, 40, "medium", "high", 3.0, 8, True, 15,
       WARM_ZONES, "hot-humid",
       ["WWF India Pollinator Guide"]),

    _p("plt_marigold_01", "Marigold / Genda", "Tagetes erecta", "Asteraceae",
       "butterfly_pollinator", "ornamental",
       {"hindi": "गेंदा", "kannada": "ಚೆಂಡು ಹೂ", "tamil": "சாமந்தி", "telugu": "బంతి పువ్వు", "marathi": "झेंडू", "bengali": "গাঁদা"},
       0.0, "high", [10,11,12,1,2,3], 0.55, 0.92,
       1.5, 0.8, 0.5, 2.5, 20, "medium", "high", 1.5, 9, True, 8,
       ALL_ZONES, "composite",
       ["WWF India Pollinator Guide", "Horticulture India"]),

    _p("plt_zinnia_01", "Zinnia", "Zinnia elegans", "Asteraceae",
       "butterfly_pollinator", "ornamental",
       {"hindi": "जीनिया", "kannada": "ಜಿನ್ನಿಯಾ", "tamil": "ஜின்னியா", "telugu": "జిన్నియా", "marathi": "झिनिया", "bengali": "জিনিয়া"},
       0.0, "high", [10,11,12,1,2,3,4], 0.60, 0.90,
       1.5, 0.8, 0.5, 2.5, 20, "medium", "high", 1.5, 9, True, 8,
       ALL_ZONES, "composite",
       ["WWF India Pollinator Guide"]),

    _p("plt_pentas_pollinator_01", "Pentas (Pollinator)", "Pentas lanceolata", "Rubiaceae",
       "butterfly_pollinator", "ornamental",
       {"hindi": "पेंटास (परागण)", "kannada": "ಪೆಂಟಾಸ್ (ಪರಾಗ)", "tamil": "பெண்டாஸ் (மகரந்தம்)", "telugu": "పెంటాస్ (పరాగ)", "marathi": "पेंटास (परागण)", "bengali": "পেন্টাস (পরাগায়ন)"},
       0.0, "high", [1,2,3,4,5,6,7,8,9,10,11,12], 1.0, 0.88,
       1.8, 1.0, 0.7, 3.0, 35, "medium", "high", 2.0, 9, True, 10,
       WARM_ZONES, "hot-humid",
       ["WWF India Pollinator Guide"]),
]


# ---------------------------------------------------------------------------
# Seed function
# ---------------------------------------------------------------------------

async def seed_plants(db) -> int:
    """Upsert all plant records. Safe to call multiple times — idempotent."""
    ops = 0
    for plant in PLANT_SEED_DATA:
        await db.plants.update_one(
            {"plant_id": plant["plant_id"]},
            {"$setOnInsert": plant},
            upsert=True,
        )
        ops += 1
    return ops
