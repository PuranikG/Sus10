"""Plant DB extension — Part A: Annual vegetables (40) + Short-cycle herbs (30)"""
from datetime import datetime, timezone
from typing import Dict, Any, List

_NOW = datetime.now(timezone.utc).isoformat()
_W = ["hot-humid", "hot-dry", "composite"]
_A = ["hot-humid", "hot-dry", "composite", "cold-dry"]
_CC = ["composite", "cold-dry"]
_HD = ["hot-dry", "composite"]
_HH = ["hot-humid", "composite"]

_CAT = {
    "annual_vegetable":   {"co2": 0.30, "esg": False,
        "m": {"grow_bag":True,"raised_bed":True,"nft_hydroponics":True,"dwc_hydroponics":False,"vertical_panel":False,"trellis":False}},
    "short_cycle_herb":   {"co2": 0.10, "esg": False,
        "m": {"grow_bag":True,"raised_bed":True,"nft_hydroponics":True,"dwc_hydroponics":True,"vertical_panel":True,"trellis":False}},
}

def _p(pid, cn, sci, fam, cat, pt, ln, yld, yconf, hm, sea, sur,
       wm, wd, wmist, mhft, rdc, wt, ht, wkg, ss, hr, cl, cz, oc, ds, **ov):
    c = _CAT[cat]
    r = {
        "plant_id": pid, "common_name": cn, "local_names": ln,
        "scientific_name": sci, "family": fam,
        "plant_category": cat, "plant_type": pt,
        "yield_kg_per_plant_yr": yld, "yield_confidence": yconf,
        "harvest_months": hm, "seasonality_factor": sea,
        "survival_rate_urban_rooftop": sur,
        "co2_kg_per_plant_yr": c["co2"], "co2_for_esg_reporting": c["esg"],
        "water_lpd_manual": wm, "water_lpd_drip": wd, "water_lpd_mist": wmist,
        "max_height_ft": mhft, "root_depth_cm": rdc,
        "wind_tolerance": wt, "heat_tolerance": ht,
        "weight_kg_per_plant": wkg, "terrace_suitability_score": ss,
        "high_rise_suitable": hr, "container_minimum_litres": cl,
        "climate_zones": cz, "optimal_climate": oc,
        "methods": dict(c["m"]), "data_sources": ds,
        "shivani_validated": False, "active": True,
        "created_at": _NOW, "updated_at": _NOW,
    }
    r.update(ov)
    return r

# ── ANNUAL VEGETABLES (40 new) ──────────────────────────────────────────────

AV = "annual_vegetable"
F  = "food"
IC = ["ICAR 2022"]
IC2 = ["ICAR 2022", "NHB India"]

PART_A: List[Dict[str, Any]] = [

    _p("plt_capsicum_red_02", "Red Capsicum / Lal Shimla Mirch", "Capsicum annuum (red)", "Solanaceae", AV, F,
       {"hindi":"लाल शिमला मिर्च","kannada":"ಕೆಂಪು ದೊಡ್ಡ ಮೆಣಸಿನಕಾಯಿ","tamil":"சிவப்பு குடைமிளகாய்","telugu":"ఎరుపు క్యాప్సికమ్","marathi":"लाल सिमला मिरची","bengali":"লাল ক্যাপসিকাম"},
       2.0,"high",[11,12,1,2,3],0.65,0.80, 2.0,1.2,0.8, 2.0,30,"medium","high",2.0,8,True,15, _W,"composite",IC),

    _p("plt_capsicum_yellow_02", "Yellow Capsicum / Peeli Shimla Mirch", "Capsicum annuum (yellow)", "Solanaceae", AV, F,
       {"hindi":"पीली शिमला मिर्च","kannada":"ಹಳದಿ ದೊಡ್ಡ ಮೆಣಸಿನಕಾಯಿ","tamil":"மஞ்சள் குடைமிளகாய்","telugu":"పసుపు క్యాప్సికమ్","marathi":"पिवळी सिमला मिरची","bengali":"হলুদ ক্যাপসিকাম"},
       2.0,"high",[11,12,1,2,3],0.65,0.80, 2.0,1.2,0.8, 2.0,30,"medium","high",2.0,8,True,15, _W,"composite",IC),

    _p("plt_cluster_beans_01", "Cluster Beans / Guar Phali", "Cyamopsis tetragonoloba", "Fabaceae", AV, F,
       {"hindi":"ग्वार फली","kannada":"ಗೋರಿಕಾಯಿ","tamil":"கொத்தவரை","telugu":"గోరుచిక్కుడు","marathi":"गवार शेंग","bengali":"গোয়ার শিম"},
       2.5,"high",[6,7,8,9,10],0.65,0.85, 1.5,0.9,0.6, 2.5,25,"high","high",1.5,8,True,12, _W,"hot-dry",IC),

    _p("plt_ash_gourd_01", "Ash Gourd / Petha", "Benincasa hispida", "Cucurbitaceae", AV, F,
       {"hindi":"पेठा","kannada":"ಬೂದು ಕುಂಬಳ","tamil":"வெண்பூசணி","telugu":"బూడిద గుమ్మడి","marathi":"कोहळा","bengali":"চালকুমড়া"},
       8.0,"medium",[7,8,9,10],0.55,0.75, 3.0,1.8,1.2, 5.0,45,"low","high",5.0,6,False,45, _W,"hot-humid",IC),

    _p("plt_potato_mini_01", "Mini Potato / Aloo (container)", "Solanum tuberosum", "Solanaceae", AV, F,
       {"hindi":"आलू","kannada":"ಆಲೂಗೆಡ್ಡೆ","tamil":"உருளைக்கிழங்கு","telugu":"బంగాళాదుంప","marathi":"बटाटा","bengali":"আলু"},
       1.5,"medium",[12,1,2,3],0.40,0.80, 2.0,1.2,0.8, 2.0,30,"medium","medium",2.5,7,True,20, _CC,"composite",IC),

    _p("plt_sweet_potato_01", "Sweet Potato / Shakarkand", "Ipomoea batatas", "Convolvulaceae", AV, F,
       {"hindi":"शकरकंद","kannada":"ಗೆಣಸು","tamil":"சர்க்கரைவள்ளி","telugu":"చిలగడదుంప","marathi":"रताळे","bengali":"মিষ্টি আলু"},
       2.0,"medium",[9,10,11,12],0.50,0.82, 2.5,1.5,1.0, 2.0,30,"high","high",2.0,7,True,20, _W,"hot-dry",IC),

    _p("plt_beetroot_01", "Beetroot / Chukandar", "Beta vulgaris", "Amaranthaceae", AV, F,
       {"hindi":"चुकंदर","kannada":"ಬೀಟ್ರೂಟ್","tamil":"பீட்ரூட்","telugu":"బీట్‌రూట్","marathi":"बीटरूट","bengali":"বিটরুট"},
       1.0,"high",[10,11,12,1,2,3],0.50,0.85, 1.5,0.9,0.6, 1.5,25,"medium","medium",1.5,8,True,15, _CC,"composite",IC),

    _p("plt_carrot_01", "Carrot Nantes / Gajar", "Daucus carota (Nantes)", "Apiaceae", AV, F,
       {"hindi":"गाजर","kannada":"ಗಾಜರ","tamil":"கேரட்","telugu":"క్యారెట్","marathi":"गाजर","bengali":"গাজর"},
       1.2,"high",[10,11,12,1,2],0.45,0.85, 1.5,0.9,0.6, 1.5,30,"medium","medium",1.0,9,True,12, _CC,"composite",IC),

    _p("plt_turnip_01", "Turnip / Shalgam", "Brassica rapa subsp. rapa", "Brassicaceae", AV, F,
       {"hindi":"शलजम","kannada":"ಟರ್ನಿಪ್","tamil":"டர்னிப்","telugu":"టర్నిప్","marathi":"सलगम","bengali":"শালগম"},
       0.8,"medium",[10,11,12,1,2],0.40,0.82, 1.5,0.9,0.6, 1.2,20,"medium","medium",0.8,8,True,10, _CC,"composite",IC),

    _p("plt_kohlrabi_01", "Kohlrabi / Ganth Gobhi", "Brassica oleracea var. gongylodes", "Brassicaceae", AV, F,
       {"hindi":"गांठगोभी","kannada":"ನಾಲ್ ಕೋಲ್","tamil":"நோல்கோல்","telugu":"కోల్‌రాబీ","marathi":"नवलकोल","bengali":"ওলকপি"},
       0.8,"medium",[10,11,12,1,2],0.40,0.80, 1.5,0.9,0.6, 1.5,20,"medium","medium",1.0,8,True,12, _CC,"composite",IC),

    _p("plt_broccoli_01", "Broccoli / Hari Gobhi", "Brassica oleracea var. italica", "Brassicaceae", AV, F,
       {"hindi":"ब्रोकोली","kannada":"ಬ್ರೊಕೊಲಿ","tamil":"பிரோக்கோலி","telugu":"బ్రోకలీ","marathi":"ब्रोकोली","bengali":"ব্রকোলি"},
       0.8,"high",[11,12,1,2],0.40,0.80, 2.0,1.2,0.8, 2.0,30,"medium","medium",2.5,7,True,20, _CC,"composite",["ICAR 2022","IARI Vegetable Production"]),

    _p("plt_lettuce_01", "Lettuce Green Romaine / Salad Patta", "Lactuca sativa (Romaine)", "Asteraceae", AV, F,
       {"hindi":"सलाद पत्ता","kannada":"ಲೆಟಿಸ್","tamil":"கீரை வகை","telugu":"లెట్యూస్","marathi":"लेट्यूस","bengali":"লেটুস"},
       0.5,"high",[10,11,12,1,2,3],0.55,0.88, 1.0,0.6,0.4, 1.0,15,"medium","medium",0.5,9,True,8, _CC,"composite",IC),

    _p("plt_lettuce_02", "Lettuce Butterhead / Makkhan Salad", "Lactuca sativa (Butterhead)", "Asteraceae", AV, F,
       {"hindi":"मक्खन सलाद","kannada":"ಬಟರ್ ಲೆಟಿಸ್","tamil":"வெண்ணெய் கீரை","telugu":"బటర్ లెట్యూస్","marathi":"बटर लेट्यूस","bengali":"বাটার লেটুস"},
       0.4,"high",[10,11,12,1,2,3],0.55,0.88, 1.0,0.6,0.4, 1.0,15,"medium","medium",0.4,9,True,8, _CC,"composite",IC),

    _p("plt_lettuce_03", "Lettuce Lollo Rossa / Lal Salad", "Lactuca sativa (Lollo Rossa)", "Asteraceae", AV, F,
       {"hindi":"लाल सलाद","kannada":"ಕೆಂಪು ಲೆಟಿಸ್","tamil":"சிவப்பு கீரை","telugu":"ఎరుపు లెట్యూస్","marathi":"लाल लेट्यूस","bengali":"লাল লেটুস"},
       0.4,"high",[10,11,12,1,2,3],0.55,0.88, 1.0,0.6,0.4, 1.0,15,"medium","medium",0.4,9,True,8, _CC,"composite",IC),

    _p("plt_hyacinth_bean_01", "Hyacinth Bean / Sem / Val", "Lablab purpureus", "Fabaceae", AV, F,
       {"hindi":"वाल सेम","kannada":"ಅವರೆ","tamil":"அவரை","telugu":"చిక్కుడు","marathi":"वाल","bengali":"শিম"},
       2.5,"high",[10,11,12,1,2],0.55,0.82, 2.5,1.5,1.0, 3.5,30,"medium","high",2.5,7,True,20, _W,"composite",IC),

    _p("plt_peas_01", "Garden Peas / Matar", "Pisum sativum", "Fabaceae", AV, F,
       {"hindi":"मटर","kannada":"ಬಟಾಣಿ","tamil":"பட்டாணி","telugu":"బఠాయి","marathi":"वाटाणे","bengali":"মটরশুঁটি"},
       1.0,"high",[11,12,1,2],0.45,0.82, 1.5,0.9,0.6, 2.0,25,"medium","medium",1.5,8,True,15, _CC,"composite",IC),

    _p("plt_tinda_01", "Tinda / Apple Gourd", "Praecitrullus fistulosus", "Cucurbitaceae", AV, F,
       {"hindi":"टिंडा","kannada":"ಟಿಂಡಾ","tamil":"டிண்டா","telugu":"టిండా","marathi":"टिंडा","bengali":"টিন্ডা"},
       3.0,"medium",[5,6,7,8,9],0.55,0.80, 2.5,1.5,1.0, 3.0,30,"medium","high",2.5,7,True,20, _W,"hot-dry",IC),

    _p("plt_parwal_01", "Pointed Gourd / Parwal", "Trichosanthes dioica", "Cucurbitaceae", AV, F,
       {"hindi":"परवल","kannada":"ಪಡವಲ (ಅಕರ)","tamil":"பறவல்","telugu":"పొట్లకాయ (అకర)","marathi":"पडवळ (वार्षिक)","bengali":"পটোল"},
       4.0,"medium",[5,6,7,8,9,10],0.55,0.78, 3.0,1.8,1.2, 4.0,35,"medium","high",3.0,7,False,25, _HH,"hot-humid",IC),

    _p("plt_baby_corn_01", "Baby Corn / Baby Bhutta", "Zea mays (baby corn)", "Poaceae", AV, F,
       {"hindi":"बेबी कॉर्न","kannada":"ಬೇಬಿ ಕಾರ್ನ್","tamil":"பேபி கார்ன்","telugu":"బేబీ కార్న్","marathi":"बेबी कॉर्न","bengali":"বেবি কর্ন"},
       0.3,"high",[6,7,8,9],0.50,0.78, 3.0,1.8,1.2, 4.5,40,"medium","high",2.0,6,False,20, _W,"composite",IC),

    _p("plt_colocasia_01", "Colocasia / Arbi / Taro", "Colocasia esculenta", "Araceae", AV, F,
       {"hindi":"अरबी","kannada":"ಕೇಸವ","tamil":"சேப்பங்கிழங்கு","telugu":"చేమడుంప","marathi":"अळू","bengali":"কচু"},
       2.5,"medium",[8,9,10,11],0.50,0.82, 3.5,2.0,1.3, 4.0,40,"low","high",4.0,7,False,35, _HH,"hot-humid",IC),

    _p("plt_mizuna_01", "Mizuna / Japanese Mustard", "Brassica rapa var. nipposinica", "Brassicaceae", AV, F,
       {"hindi":"मिजुना","kannada":"ಮಿಜುನಾ","tamil":"மிசுனா","telugu":"మిజూనా","marathi":"मिझुना","bengali":"মিজুনা"},
       0.5,"medium",[10,11,12,1,2,3],0.55,0.85, 1.0,0.6,0.4, 1.0,15,"medium","medium",0.3,9,True,8, _CC,"composite",IC),

    _p("plt_pak_choi_01", "Pak Choi / Pak Choy", "Brassica rapa subsp. chinensis", "Brassicaceae", AV, F,
       {"hindi":"पाक चोय","kannada":"ಪಾಕ್ ಚೋಯ್","tamil":"பாக்சாய்","telugu":"పాక్ చాయ్","marathi":"पाक चोय","bengali":"পাক চয়"},
       0.6,"high",[10,11,12,1,2,3],0.55,0.88, 1.0,0.6,0.4, 1.0,15,"medium","medium",0.5,9,True,8, _CC,"composite",IC),

    _p("plt_kale_01", "Kale / Hari Gobhi Patta", "Brassica oleracea var. acephala", "Brassicaceae", AV, F,
       {"hindi":"केल","kannada":"ಕೇಲ್","tamil":"கேல்","telugu":"కేల్","marathi":"केल","bengali":"কেল"},
       0.8,"high",[10,11,12,1,2,3],0.50,0.85, 2.0,1.2,0.8, 1.5,20,"medium","medium",1.0,8,True,12, _CC,"composite",["ICAR 2022","Urban Farming India"]),

    _p("plt_spring_onion_01", "Spring Onion / Hara Pyaaz", "Allium fistulosum", "Amaryllidaceae", AV, F,
       {"hindi":"हरा प्याज","kannada":"ಹಸಿ ಉಳ್ಳಾಗಡ್ಡೆ","tamil":"வெங்காயத்தாள்","telugu":"పచ్చి ఉల్లిపాయ","marathi":"हिरवा कांदा","bengali":"পেঁয়াজকলি"},
       0.5,"high",[1,2,3,4,5,10,11,12],0.70,0.90, 1.0,0.6,0.4, 1.0,15,"medium","medium",0.3,9,True,5, _A,"composite",IC),

    _p("plt_celery_01", "Celery / Shalari", "Apium graveolens", "Apiaceae", AV, F,
       {"hindi":"सेलरी","kannada":"ಸೆಲರಿ","tamil":"செலரி","telugu":"సెలెరీ","marathi":"सेलेरी","bengali":"সেলারি"},
       0.5,"medium",[10,11,12,1,2,3],0.50,0.80, 2.0,1.2,0.8, 1.5,20,"medium","medium",0.8,7,True,12, _CC,"composite",IC),

    _p("plt_leek_01", "Leek / Vilayati Pyaaz", "Allium ampeloprasum", "Amaryllidaceae", AV, F,
       {"hindi":"लीक","kannada":"ಲೀಕ್","tamil":"லீக்","telugu":"లీక్","marathi":"लीक","bengali":"লিক"},
       0.4,"medium",[10,11,12,1,2],0.40,0.80, 1.5,0.9,0.6, 1.5,20,"medium","medium",0.6,7,True,10, _CC,"composite",IC),

    _p("plt_bok_choy_01", "Bok Choy / Baby Pak Choi", "Brassica rapa subsp. chinensis (dwarf)", "Brassicaceae", AV, F,
       {"hindi":"बोक चोय","kannada":"ಬಾಕ್ ಚೋಯ್","tamil":"பாப்பி பாக்சாய்","telugu":"బాక్ చాయ్","marathi":"बोक चोय","bengali":"বোক চয়"},
       0.5,"high",[10,11,12,1,2,3],0.55,0.88, 1.0,0.6,0.4, 0.8,12,"medium","medium",0.4,9,True,6, _CC,"composite",IC),

    _p("plt_swiss_chard_01", "Swiss Chard / Chukander Saag", "Beta vulgaris subsp. vulgaris", "Amaranthaceae", AV, F,
       {"hindi":"स्विस चार्ड","kannada":"ಸ್ವಿಸ್ ಚಾರ್ಡ್","tamil":"சுவிஸ் சார்ட்","telugu":"స్విస్ చార్డ్","marathi":"स्विस चार्ड","bengali":"সুইস চার্ড"},
       0.8,"high",[10,11,12,1,2,3,4,5],0.70,0.88, 1.5,0.9,0.6, 1.5,20,"medium","medium",0.8,9,True,8, _CC,"composite",IC),

    _p("plt_collard_greens_01", "Collard Greens / Kolard Saag", "Brassica oleracea (Acephala group)", "Brassicaceae", AV, F,
       {"hindi":"कोलार्ड साग","kannada":"ಕೊಲಾರ್ಡ್","tamil":"கோலார்ட்","telugu":"కొల్లార్డ్","marathi":"कोलार्ड","bengali":"কলার্ড শাক"},
       1.0,"medium",[10,11,12,1,2,3],0.50,0.82, 2.0,1.2,0.8, 1.5,20,"medium","medium",1.0,8,True,12, _CC,"composite",IC),

    _p("plt_garlic_greens_01", "Garlic Greens / Hara Lahsun", "Allium sativum (green stage)", "Amaryllidaceae", AV, F,
       {"hindi":"हरा लहसुन","kannada":"ಹಸಿ ಬೆಳ್ಳುಳ್ಳಿ","tamil":"பச்சை பூண்டு","telugu":"ఆకుపచ్చ వెల్లుల్లి","marathi":"हिरवा लसूण","bengali":"কাঁচা রসুন"},
       0.3,"high",[10,11,12,1,2,3],0.60,0.88, 1.0,0.6,0.4, 0.8,15,"medium","medium",0.3,9,True,5, _A,"composite",IC),

    _p("plt_chives_01", "Chives / Chhoti Pyaaz Patta", "Allium schoenoprasum", "Amaryllidaceae", AV, F,
       {"hindi":"चाइव्स","kannada":"ಚೈವ್ಸ್","tamil":"சைவ்ஸ்","telugu":"చైవ్స్","marathi":"चाइव्स","bengali":"চাইভস"},
       0.3,"high",[1,2,3,4,5,6,7,8,9,10,11,12],0.80,0.90, 0.8,0.5,0.3, 0.8,12,"medium","medium",0.2,9,True,5, _A,"composite",IC),

    _p("plt_lal_saag_01", "Red Amaranth / Lal Saag", "Amaranthus tricolor (red)", "Amaranthaceae", AV, F,
       {"hindi":"लाल साग","kannada":"ಕೆಂಪು ಹರಿವೆ","tamil":"சிவப்பு முளைக்கீரை","telugu":"ఎరుపు తోటకూర","marathi":"लाल माठ","bengali":"লাল শাক"},
       1.2,"high",[6,7,8,9,10,11],0.65,0.90, 1.5,0.9,0.6, 2.0,20,"high","high",0.8,9,True,8, _W,"hot-humid",IC),

    _p("plt_malabar_spinach_01", "Malabar Spinach / Poi Saag", "Basella alba", "Basellaceae", AV, F,
       {"hindi":"पोई साग","kannada":"ಬಸಳೆ","tamil":"பசலைக்கீரை","telugu":"బచ్చలి కూర","marathi":"मायाळू","bengali":"পুঁইশাক"},
       2.0,"high",[5,6,7,8,9,10,11],0.75,0.90, 2.0,1.2,0.8, 3.0,25,"medium","high",1.5,9,True,10, _W,"hot-humid",IC),

    _p("plt_purslane_01", "Purslane / Kulfa Saag", "Portulaca oleracea", "Portulacaceae", AV, F,
       {"hindi":"कुलफा","kannada":"ದೊಡ್ಡಪತ್ರೆ","tamil":"குழிப்பொடி கீரை","telugu":"పాయల కూర","marathi":"घोळ","bengali":"নুনিয়া শাক"},
       0.5,"high",[6,7,8,9,10,11],0.65,0.90, 1.0,0.6,0.4, 0.8,10,"high","high",0.3,9,True,5, _W,"hot-dry",IC),

    _p("plt_water_spinach_01", "Water Spinach / Kalmi Saag", "Ipomoea aquatica", "Convolvulaceae", AV, F,
       {"hindi":"कलमी साग","kannada":"ನೀರು ಹರಿವೆ","tamil":"வாட்டர் ஸ்பினாச்","telugu":"నీటి పాలకూర","marathi":"कालमी","bengali":"কলমি শাক"},
       2.5,"high",[6,7,8,9,10],0.70,0.88, 2.5,1.5,1.0, 2.0,20,"medium","high",1.0,8,True,10, ["hot-humid"],"hot-humid",IC),

    _p("plt_winged_bean_01", "Winged Bean / Chatoi", "Psophocarpus tetragonolobus", "Fabaceae", AV, F,
       {"hindi":"चपटी सेम","kannada":"ಅಕ್ಕಿ ಅವರೆ","tamil":"பறவை பீன்ஸ்","telugu":"రెక్కల బీన్స్","marathi":"पंखी सेम","bengali":"পাখনাশিম"},
       2.5,"medium",[8,9,10,11],0.55,0.78, 3.0,1.8,1.2, 5.0,35,"medium","high",3.0,7,False,25, ["hot-humid","composite"],"hot-humid",IC),

    _p("plt_yardlong_bean_bush_01", "Yardlong Bean Bush / Bora (bush)", "Vigna unguiculata subsp. sesquipedalis (bush)", "Fabaceae", AV, F,
       {"hindi":"बरबटी झाड़ी","kannada":"ಅಲಸಂದೆ ಗಿಡ","tamil":"தட்டைப்பயறு செடி","telugu":"అలసంద చెట్టు","marathi":"चवळी झुडूप","bengali":"বরবটি (ঝোপ)"},
       2.0,"high",[6,7,8,9,10],0.60,0.85, 2.5,1.5,1.0, 3.5,25,"high","high",1.5,8,True,15, _W,"hot-humid",IC),

    _p("plt_mustard_greens_01", "Mustard Greens / Sarson Saag", "Brassica juncea (leaf)", "Brassicaceae", AV, F,
       {"hindi":"सरसों साग","kannada":"ಸಾಸಿವೆ ಸೊಪ್ಪು","tamil":"கடுகு கீரை","telugu":"ఆవాలు ఆకు","marathi":"मोहरीची पाने","bengali":"সরিষা শাক"},
       1.0,"high",[10,11,12,1,2,3],0.60,0.88, 1.5,0.9,0.6, 1.5,15,"medium","medium",0.5,9,True,8, _A,"composite",IC),

    _p("plt_garden_cress_01", "Garden Cress / Halim", "Lepidium sativum", "Brassicaceae", AV, F,
       {"hindi":"हलीम","kannada":"ಗಾರ್ಡನ್ ಕ್ರೆಸ್","tamil":"காளான் கீரை","telugu":"అలీవ్ ఆకు","marathi":"हळीव","bengali":"হালিম শাক"},
       0.3,"high",[10,11,12,1,2,3],0.60,0.90, 0.8,0.5,0.3, 0.8,12,"medium","medium",0.2,9,True,5, _A,"composite",IC),

    _p("plt_onion_01", "Onion / Pyaaz (container)", "Allium cepa", "Amaryllidaceae", AV, F,
       {"hindi":"प्याज","kannada":"ಉಳ್ಳಾಗಡ್ಡೆ","tamil":"வெங்காயம்","telugu":"ఉల్లిపాయ","marathi":"कांदा","bengali":"পেঁয়াজ"},
       0.4,"high",[11,12,1,2,3],0.50,0.82, 1.0,0.6,0.4, 1.5,20,"medium","medium",0.5,8,True,8, _CC,"composite",IC),

    _p("plt_garlic_01", "Garlic / Lahsun (container)", "Allium sativum", "Amaryllidaceae", AV, F,
       {"hindi":"लहसुन","kannada":"ಬೆಳ್ಳುಳ್ಳಿ","tamil":"பூண்டு","telugu":"వెల్లుల్లి","marathi":"लसूण","bengali":"রসুন"},
       0.3,"high",[12,1,2,3,4],0.50,0.82, 0.8,0.5,0.3, 1.2,15,"medium","medium",0.3,8,True,8, _CC,"composite",IC),

    # ── SHORT CYCLE HERBS (30 new) ────────────────────────────────────────────

    _p("plt_fennel_01", "Fennel / Saunf", "Foeniculum vulgare", "Apiaceae", "short_cycle_herb", F,
       {"hindi":"सौंफ","kannada":"ಸೋಂಪು","tamil":"சோம்பு","telugu":"సోంపు","marathi":"बडीशेप","bengali":"মৌরি"},
       0.2,"medium",[10,11,12,1,2,3],0.55,0.82, 1.5,0.9,0.6, 3.0,20,"medium","medium",0.5,7,True,10, _CC,"composite",IC),

    _p("plt_ajwain_01", "Carom / Ajwain", "Trachyspermum ammi", "Apiaceae", "short_cycle_herb", F,
       {"hindi":"अजवाइन","kannada":"ಓಮ","tamil":"ஓமம்","telugu":"వాము","marathi":"ओवा","bengali":"যোয়ান"},
       0.15,"high",[10,11,12,1,2,3],0.60,0.88, 1.0,0.6,0.4, 1.5,15,"medium","high",0.3,9,True,5, _W,"hot-dry",IC),

    _p("plt_turmeric_01", "Turmeric / Haldi (container)", "Curcuma longa", "Zingiberaceae", "short_cycle_herb", F,
       {"hindi":"हल्दी","kannada":"ಅರಿಶಿನ","tamil":"மஞ்சள்","telugu":"పసుపు","marathi":"हळद","bengali":"হলুদ"},
       0.5,"high",[9,10,11,12],0.60,0.85, 2.0,1.2,0.8, 3.0,30,"medium","high",2.5,8,True,20, _W,"hot-humid",["ICAR 2022","AICRP Aromatic Plants"]),

    _p("plt_ginger_01", "Ginger / Adrak (container)", "Zingiber officinale", "Zingiberaceae", "short_cycle_herb", F,
       {"hindi":"अदरक","kannada":"ಶುಂಠಿ","tamil":"இஞ்சி","telugu":"అల్లం","marathi":"आले","bengali":"আদা"},
       0.4,"high",[9,10,11],0.55,0.85, 2.0,1.2,0.8, 3.0,30,"medium","high",2.0,8,True,20, _HH,"hot-humid",IC),

    _p("plt_stevia_01", "Stevia / Meethi Patti", "Stevia rebaudiana", "Asteraceae", "short_cycle_herb", "medicinal",
       {"hindi":"मीठी पत्ती","kannada":"ಸ್ಟೀವಿಯಾ","tamil":"ஸ்டேவியா","telugu":"స్టీవియా","marathi":"स्टेव्हिया","bengali":"স্টেভিয়া"},
       0.2,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.82, 1.5,0.9,0.6, 2.0,20,"medium","high",0.5,8,True,8, _W,"composite",["ICAR 2022","AICRP Aromatic Plants"]),

    _p("plt_lemon_balm_01", "Lemon Balm / Nimbu Tulsi", "Melissa officinalis", "Lamiaceae", "short_cycle_herb", "medicinal",
       {"hindi":"नींबू तुलसी","kannada":"ಲೆಮನ್ ಬಾಮ್","tamil":"எலுமிச்சை பாம்","telugu":"నిమ్మ బామ్","marathi":"लेमन बाम","bengali":"লেবু বাম"},
       0.3,"medium",[3,4,5,6,7,8,9,10],0.60,0.80, 1.5,0.9,0.6, 2.0,20,"medium","medium",0.5,7,True,8, _CC,"composite",["AICRP Aromatic Plants"]),

    _p("plt_sorrel_01", "Sorrel / Ambat Chukka", "Rumex acetosa", "Polygonaceae", "short_cycle_herb", F,
       {"hindi":"अम्लपर्ण","kannada":"ಅಂಬಟ್ ಸೊಪ್ಪು","tamil":"அம்ல கீரை","telugu":"అంబట చుక్క","marathi":"चुका","bengali":"অম্লশাক"},
       0.4,"medium",[10,11,12,1,2,3,4],0.55,0.80, 1.5,0.9,0.6, 1.5,20,"medium","medium",0.5,8,True,8, _CC,"composite",IC),

    _p("plt_vietnamese_coriander_01", "Vietnamese Coriander / Laksa Leaf", "Persicaria odorata", "Polygonaceae", "short_cycle_herb", F,
       {"hindi":"वियतनामी धनिया","kannada":"ವಿಯೆಟ್ನಾಮೀಸ್ ಕೊತ್ತಂಬರಿ","tamil":"வியட்நாமிய கொத்தமல்லி","telugu":"వియత్నాం కొత్తిమీర","marathi":"व्हिएतनामी कोथिंबीर","bengali":"ভিয়েতনামি ধনে"},
       0.4,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],0.85,0.85, 1.5,0.9,0.6, 1.5,15,"medium","high",0.4,8,True,5, _HH,"hot-humid",["Urban Farming India"]),

    _p("plt_sawtooth_coriander_01", "Sawtooth Coriander / Bhandhania", "Eryngium foetidum", "Apiaceae", "short_cycle_herb", F,
       {"hindi":"बंधानिया","kannada":"ದೊಡ್ಡ ಕೊತ್ತಂಬರಿ","tamil":"கோலகசி","telugu":"బంధానియా","marathi":"विलायती धने","bengali":"বন ধনে"},
       0.5,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],0.80,0.85, 1.0,0.6,0.4, 1.5,15,"medium","high",0.3,8,True,5, _HH,"hot-humid",IC),

    _p("plt_perilla_01", "Perilla / Shiso / Bhanjir", "Perilla frutescens", "Lamiaceae", "short_cycle_herb", F,
       {"hindi":"भंजीर","kannada":"ಪೆರಿಲ್ಲ","tamil":"பெரில்லா","telugu":"పెరిల్లా","marathi":"पेरिला","bengali":"পেরিলা"},
       0.3,"medium",[6,7,8,9,10],0.50,0.80, 1.5,0.9,0.6, 1.5,20,"medium","medium",0.4,7,True,8, _W,"composite",IC),

    _p("plt_pandan_01", "Pandan Leaf / Sugandha Patta", "Pandanus amaryllifolius", "Pandanaceae", "short_cycle_herb", F,
       {"hindi":"सुगंध पत्ता","kannada":"ಪಂಡನ್ ಪತ್ರ","tamil":"பாண்டன் இலை","telugu":"పాండన్ ఆకు","marathi":"पंडन पान","bengali":"পান্ডান পাতা"},
       0.3,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.82, 2.0,1.2,0.8, 2.0,20,"medium","high",1.5,7,True,12, _HH,"hot-humid",IC),

    _p("plt_watercress_01", "Watercress / Jal Kress", "Nasturtium officinale", "Brassicaceae", "short_cycle_herb", F,
       {"hindi":"जल कैस","kannada":"ವಾಟರ್ ಕ್ರೆಸ್","tamil":"தண்ணீர் கீரை","telugu":"వాటర్ క్రెస్","marathi":"वॉटरक्रेस","bengali":"ওয়াটারক্রেস"},
       0.3,"medium",[10,11,12,1,2,3,4],0.55,0.82, 1.0,0.6,0.4, 0.5,10,"medium","medium",0.2,8,True,8, _CC,"composite",["Urban Farming India","Hydroponics Association India"],
       methods={"grow_bag":False,"raised_bed":False,"nft_hydroponics":True,"dwc_hydroponics":True,"vertical_panel":False,"trellis":False}),

    _p("plt_wheatgrass_01", "Wheatgrass / Gehun Ghaas", "Triticum aestivum (young shoot)", "Poaceae", "short_cycle_herb", F,
       {"hindi":"गेहूं घास","kannada":"ಗೋಧಿ ಹುಲ್ಲು","tamil":"கோதுமை புல்","telugu":"గోధుమ గడ్డి","marathi":"गव्हाचे अंकुर","bengali":"গমের ঘাস"},
       0.1,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.5,0.3,0.2, 0.3,5,"medium","medium",0.1,10,True,2, _A,"composite",["Urban Farming India","Hydroponics Association India"]),

    _p("plt_pea_microgreens_01", "Pea Microgreens / Matar Ankur", "Pisum sativum (microgreen)", "Fabaceae", "short_cycle_herb", F,
       {"hindi":"मटर अंकुर","kannada":"ಬಟಾಣಿ ಮೈಕ್ರೋಗ್ರೀನ್ಸ್","tamil":"பட்டாணி முளை","telugu":"బఠాయి మైక్రోగ్రీన్స్","marathi":"वाटाणा मायक्रोग्रीन्स","bengali":"মটরশুঁটি মাইক্রোগ্রিন"},
       0.1,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.5,0.3,0.2, 0.3,5,"medium","medium",0.1,10,True,2, _A,"composite",["Urban Farming India","Hydroponics Association India"]),

    _p("plt_nasturtium_01", "Nasturtium / Nasturchium", "Tropaeolum majus", "Tropaeolaceae", "short_cycle_herb", "mixed",
       {"hindi":"नास्टर्टियम","kannada":"ನ್ಯಾಸ್ಟರ್ಷಿಯಮ್","tamil":"நாஸ்டர்சியம்","telugu":"నాస్టర్టియం","marathi":"नास्टर्शियम","bengali":"ন্যাস্টার্শিয়াম"},
       0.1,"medium",[10,11,12,1,2,3,4],0.60,0.82, 1.0,0.6,0.4, 1.0,15,"medium","medium",0.3,8,True,8, _CC,"composite",["Urban Farming India"]),

    _p("plt_borage_01", "Borage / Boraj", "Borago officinalis", "Boraginaceae", "short_cycle_herb", "mixed",
       {"hindi":"बोराज","kannada":"ಬೊರೇಜ್","tamil":"போரேஜ்","telugu":"బోరేజ్","marathi":"बोरेज","bengali":"বোরেজ"},
       0.1,"medium",[10,11,12,1,2,3],0.55,0.80, 2.0,1.2,0.8, 2.0,20,"medium","medium",0.5,7,True,10, _CC,"composite",["Urban Farming India"]),

    _p("plt_lemon_verbena_01", "Lemon Verbena / Nimbu Patta", "Aloysia citrodora", "Verbenaceae", "short_cycle_herb", "medicinal",
       {"hindi":"नींबू पत्ता","kannada":"ಲೆಮನ್ ವರ್ಬೆನಾ","tamil":"எலுமிச்சை வெர்பினா","telugu":"నిమ్మ వెర్బీనా","marathi":"लेमन व्हर्बेना","bengali":"লেবু ভার্বেনা"},
       0.2,"medium",[4,5,6,7,8,9,10,11],0.65,0.80, 3.0,1.8,1.2, 2.0,25,"medium","high",0.8,7,True,10, _W,"hot-dry",["AICRP Aromatic Plants"]),

    _p("plt_lavender_01", "Lavender / Lavender", "Lavandula angustifolia", "Lamiaceae", "short_cycle_herb", "medicinal",
       {"hindi":"लैवेंडर","kannada":"ಲ್ಯಾವೆಂಡರ್","tamil":"லாவெண்டர்","telugu":"లావెండర్","marathi":"लॅव्हेंडर","bengali":"ল্যাভেন্ডার"},
       0.15,"medium",[3,4,5,6,7,8],0.45,0.75, 1.5,0.9,0.6, 2.0,25,"high","medium",0.5,6,True,10, ["hot-dry","cold-dry"],"hot-dry",["AICRP Aromatic Plants"]),

    _p("plt_rosemary_01", "Rosemary / Rusmari", "Salvia rosmarinus", "Lamiaceae", "short_cycle_herb", "medicinal",
       {"hindi":"रोज़मेरी","kannada":"ರೋಸ್ಮೇರಿ","tamil":"ரோஸ்மேரி","telugu":"రోజ్‌మేరీ","marathi":"रोझमेरी","bengali":"রোজমেরি"},
       0.2,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],0.75,0.78, 3.0,1.8,1.2, 2.5,25,"high","medium",0.8,7,True,12, ["hot-dry","composite"],"hot-dry",["AICRP Aromatic Plants"]),

    _p("plt_thyme_01", "Thyme / Ajwain Patta", "Thymus vulgaris", "Lamiaceae", "short_cycle_herb", "medicinal",
       {"hindi":"थाइम","kannada":"ಥೈಮ್","tamil":"தைம்","telugu":"థైమ్","marathi":"थाईम","bengali":"থাইম"},
       0.1,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],0.80,0.82, 1.0,0.6,0.4, 1.0,15,"high","medium",0.3,8,True,5, ["hot-dry","composite","cold-dry"],"hot-dry",["AICRP Aromatic Plants"]),

    _p("plt_oregano_01", "Oregano / Marwa", "Origanum vulgare", "Lamiaceae", "short_cycle_herb", "medicinal",
       {"hindi":"मार्वा","kannada":"ಒರೆಗಾನೊ","tamil":"ஒரிகனோ","telugu":"ఒరిగానో","marathi":"ओरेगानो","bengali":"অরেগানো"},
       0.1,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],0.80,0.82, 1.0,0.6,0.4, 1.5,15,"high","medium",0.3,8,True,5, ["hot-dry","composite","cold-dry"],"hot-dry",["AICRP Aromatic Plants"]),

    _p("plt_sage_01", "Sage / Salvia", "Salvia officinalis", "Lamiaceae", "short_cycle_herb", "medicinal",
       {"hindi":"साल्विया","kannada":"ಸೇಜ್","tamil":"சேஜ்","telugu":"సేజ్","marathi":"साल्विया","bengali":"সেজ"},
       0.1,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],0.70,0.78, 1.5,0.9,0.6, 2.0,20,"high","medium",0.4,7,True,8, ["hot-dry","composite","cold-dry"],"hot-dry",["AICRP Aromatic Plants"]),

    _p("plt_moringa_microgreens_01", "Moringa Microgreens / Sahjan Ankur", "Moringa oleifera (microgreen)", "Moringaceae", "short_cycle_herb", F,
       {"hindi":"सहजन अंकुर","kannada":"ನುಗ್ಗೆ ಮೈಕ್ರೋಗ್ರೀನ್ಸ್","tamil":"முருங்கை முளை","telugu":"మునగ మైక్రోగ్రీన్స్","marathi":"शेवगा मायक्रोग्रीन्स","bengali":"সজনে মাইক্রোগ্রিন"},
       0.1,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.90, 0.5,0.3,0.2, 0.4,5,"medium","high",0.1,10,True,2, _W,"hot-dry",["Urban Farming India"]),

    _p("plt_marjoram_01", "Sweet Marjoram / Marua", "Origanum majorana", "Lamiaceae", "short_cycle_herb", "medicinal",
       {"hindi":"मरुआ","kannada":"ಮರ್ಜೊರಮ್","tamil":"மர்ஜோரம்","telugu":"మర్జోరమ్","marathi":"मार्जोरम","bengali":"মারজোরাম"},
       0.1,"medium",[10,11,12,1,2,3],0.60,0.80, 1.0,0.6,0.4, 1.5,15,"medium","medium",0.3,8,True,5, ["hot-dry","composite"],"composite",["AICRP Aromatic Plants"]),

    _p("plt_chervil_01", "Chervil / French Parsley", "Anthriscus cerefolium", "Apiaceae", "short_cycle_herb", F,
       {"hindi":"चर्विल","kannada":"ಚರ್ವಿಲ್","tamil":"செர்விள்","telugu":"చెర్విల్","marathi":"चेर्विल","bengali":"চেরভিল"},
       0.2,"medium",[10,11,12,1,2,3],0.50,0.80, 1.0,0.6,0.4, 0.8,15,"medium","medium",0.2,8,True,5, _CC,"composite",IC),

    _p("plt_fenugreek_microgreens_01", "Fenugreek Microgreens / Methi Ankur", "Trigonella foenum-graecum (microgreen)", "Fabaceae", "short_cycle_herb", F,
       {"hindi":"मेथी अंकुर","kannada":"ಮೆಂತ್ಯ ಮೈಕ್ರೋಗ್ರೀನ್ಸ್","tamil":"வெந்தய முளை","telugu":"మేంతి మైక్రోగ్రీన్స్","marathi":"मेथी मायक्रोग्रीन्स","bengali":"মেথি মাইক্রোগ্রিন"},
       0.1,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.4,0.2,0.1, 0.3,5,"medium","medium",0.1,10,True,2, _A,"composite",["Urban Farming India","Hydroponics Association India"]),

    _p("plt_dill_02", "Dill Large-leaf / Shepu", "Anethum graveolens (Indian)", "Apiaceae", "short_cycle_herb", F,
       {"hindi":"सोया साग","kannada":"ಸಬ್ಬಸಿಗೆ","tamil":"சதகுப்பி","telugu":"சதకుప்ப","marathi":"शेपू (मोठा)","bengali":"সোয়া পাতা"},
       0.3,"high",[10,11,12,1,2,3,4],0.55,0.85, 1.5,0.9,0.6, 1.5,12,"medium","medium",0.3,9,True,5, _A,"composite",IC),

    _p("plt_cress_microgreens_01", "Cress Microgreens / Halim Ankur", "Lepidium sativum (microgreen)", "Brassicaceae", "short_cycle_herb", F,
       {"hindi":"हलीम अंकुर","kannada":"ಹಲೀಮ್ ಮೈಕ್ರೋಗ್ರೀನ್ಸ್","tamil":"ஹலீம் முளை","telugu":"హలీమ్ మైక్రోగ్రీన్స్","marathi":"हळीव मायक्रोग्रीन्स","bengali":"হালিম মাইক্রোগ্রিন"},
       0.1,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.4,0.2,0.1, 0.3,5,"medium","medium",0.1,10,True,2, _A,"composite",["Urban Farming India"]),
]
