"""Plant DB extension — Part C: Woody trees (22) + Creepers (19) + Ornamental (29) + Butterfly (14)"""
from datetime import datetime, timezone
from typing import Dict, Any, List

_NOW = datetime.now(timezone.utc).isoformat()
_W  = ["hot-humid", "hot-dry", "composite"]
_A  = ["hot-humid", "hot-dry", "composite", "cold-dry"]
_CC = ["composite", "cold-dry"]
_HD = ["hot-dry", "composite"]
_HH = ["hot-humid", "composite"]

_CAT = {
    "woody_tree":           {"co2": 6.00, "esg": True,
        "m": {"grow_bag":True,"raised_bed":True,"nft_hydroponics":False,"dwc_hydroponics":False,"vertical_panel":False,"trellis":False}},
    "creeper_climber":      {"co2": 1.50, "esg": True,
        "m": {"grow_bag":False,"raised_bed":True,"nft_hydroponics":False,"dwc_hydroponics":False,"vertical_panel":False,"trellis":True}},
    "ornamental_ground":    {"co2": 2.00, "esg": True,
        "m": {"grow_bag":True,"raised_bed":True,"nft_hydroponics":False,"dwc_hydroponics":False,"vertical_panel":False,"trellis":False}},
    "butterfly_pollinator": {"co2": 2.50, "esg": True,
        "m": {"grow_bag":True,"raised_bed":True,"nft_hydroponics":False,"dwc_hydroponics":False,"vertical_panel":False,"trellis":False}},
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

WT  = "woody_tree"
CC  = "creeper_climber"
OG  = "ornamental_ground"
BP  = "butterfly_pollinator"
F   = "food"
ORN = "ornamental"
MED = "medicinal"
MIX = "mixed"
HI  = ["Horticulture India"]
IC  = ["ICAR 2022", "NHB India"]
WW  = ["WWF India Pollinator Guide", "Horticulture India"]

PART_C: List[Dict[str, Any]] = [

    # ── WOODY TREES (22 new) ──────────────────────────────────────────────────

    _p("plt_lemon_eureka_01", "Lemon Eureka / Eureka Nimbu", "Citrus limon (Eureka)", "Rutaceae", WT, F,
       {"hindi":"यूरेका नींबू","kannada":"ಯೂರೇಕ ನಿಂಬೆ","tamil":"யூரேகா எலுமிச்சை","telugu":"యూరేకా నిమ్మ","marathi":"युरेका लिंबू","bengali":"ইউরেকা লেবু"},
       4.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],0.90,0.80, 2.0,1.2,0.8, 5.0,55,"medium","high",7.0,8,True,30, _W,"hot-humid",IC),

    _p("plt_kaffir_lime_01", "Kaffir Lime / Makrut / Gondhoraj", "Citrus hystrix", "Rutaceae", WT, F,
       {"hindi":"माकरूत नींबू","kannada":"ಕಾಫಿರ್ ಲೈಮ್","tamil":"மக்ரூட் எலுமிச்சை","telugu":"మాక్రట్ నిమ్మ","marathi":"माकरूत लिंबू","bengali":"গন্ধরাজ লেবু"},
       2.0,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],0.85,0.78, 2.0,1.2,0.8, 5.0,50,"medium","high",6.0,8,True,25, _W,"hot-humid",IC),

    _p("plt_sweet_lime_01", "Sweet Lime / Mosambi (dwarf)", "Citrus limetta (dwarf)", "Rutaceae", WT, F,
       {"hindi":"मौसंबी (बौना)","kannada":"ಮೂಸಂಬಿ (ಕುಬ್ಜ)","tamil":"மொசம்பி (குட்டை)","telugu":"మొసంబి (పొట్టి)","marathi":"मोसंबी (बटू)","bengali":"মুসাম্বি (বামন)"},
       5.0,"high",[10,11,12,1,2],0.60,0.78, 2.5,1.5,1.0, 6.0,60,"medium","high",10.0,7,False,40, _W,"hot-dry",IC),

    _p("plt_custard_apple_dwarf_01", "Custard Apple Dwarf / Sitaphal (container)", "Annona squamosa (dwarf)", "Annonaceae", WT, F,
       {"hindi":"सीताफल (बौना)","kannada":"ಸೀತಾಫಲ (ಕುಬ್ಜ)","tamil":"சீத்தாப்பழம் (குட்டை)","telugu":"సీతాఫలం (పొట్టి)","marathi":"सीताफळ (बटू)","bengali":"আতাফল (বামন)"},
       4.0,"medium",[8,9,10,11],0.50,0.75, 2.5,1.5,1.0, 6.0,55,"medium","high",8.0,7,False,35, _W,"hot-dry",IC),

    _p("plt_jamun_dwarf_01", "Jamun Dwarf / Black Plum (container)", "Syzygium cumini (dwarf)", "Myrtaceae", WT, F,
       {"hindi":"जामुन (बौना)","kannada":"ನೇರಳೆ (ಕುಬ್ಜ)","tamil":"நாவல் (குட்டை)","telugu":"నేరేడు (పొట్టి)","marathi":"जांभूळ (बटू)","bengali":"জাম (বামন)"},
       5.0,"medium",[6,7,8],0.40,0.75, 2.5,1.5,1.0, 8.0,65,"medium","high",10.0,7,False,50, _W,"composite",IC),

    _p("plt_starfruit_dwarf_01", "Carambola / Star Fruit (dwarf)", "Averrhoa carambola (dwarf)", "Oxalidaceae", WT, F,
       {"hindi":"कमरख","kannada":"ಕಮರಕ","tamil":"தம்பட்டை","telugu":"అమ్బబళం","marathi":"कमरख","bengali":"কামরাঙা"},
       5.0,"medium",[8,9,10,11,12],0.55,0.78, 2.0,1.2,0.8, 6.0,55,"medium","high",7.0,8,True,35, ["hot-humid","composite"],"hot-humid",IC),

    _p("plt_bael_dwarf_01", "Bael Fruit Dwarf / Bel Phal", "Aegle marmelos (fruit dwarf)", "Rutaceae", WT, F,
       {"hindi":"बेल फल (बौना)","kannada":"ಬಿಲ್ವ ಫಲ (ಕುಬ್ಜ)","tamil":"வில்வ பழம் (குட்டை)","telugu":"బిల్వం పండు (పొట్టి)","marathi":"बेलफळ (बटू)","bengali":"বেল ফল (বামন)"},
       3.0,"medium",[5,6,7],0.35,0.75, 2.0,1.2,0.8, 8.0,60,"high","high",8.0,7,False,40, _W,"hot-dry",IC),

    _p("plt_mango_grafted_01", "Mango Grafted Dwarf / Aam (dwarf Alphonso)", "Mangifera indica (grafted dwarf)", "Anacardiaceae", WT, F,
       {"hindi":"आम (बौना)","kannada":"ಮಾವು (ಕುಬ್ಜ)","tamil":"மாம்பழம் (குட்டை)","telugu":"మామిడి (పొట్టి)","marathi":"आंबा (बटू)","bengali":"আম (বামন)"},
       6.0,"medium",[4,5,6],0.40,0.72, 3.0,1.8,1.2, 10.0,70,"medium","high",12.0,7,False,60, _W,"hot-dry",IC),

    _p("plt_jackfruit_dwarf_01", "Jackfruit Dwarf / Kathal (dwarf)", "Artocarpus heterophyllus (dwarf compact)", "Moraceae", WT, F,
       {"hindi":"कटहल (बौना)","kannada":"ಹಲಸು (ಕುಬ್ಜ)","tamil":"பலா (குட்டை)","telugu":"పనస (పొట్టి)","marathi":"फणस (बटू)","bengali":"কাঁঠাল (বামন)"},
       10.0,"low",[4,5,6,7],0.30,0.68, 3.0,1.8,1.2, 10.0,80,"low","high",20.0,5,False,80, ["hot-humid","composite"],"hot-humid",IC),

    _p("plt_sapota_dwarf_01", "Chikoo / Sapota (dwarf)", "Manilkara zapota (dwarf)", "Sapotaceae", WT, F,
       {"hindi":"चीकू (बौना)","kannada":"ಸಪೋಟ (ಕುಬ್ಜ)","tamil":"சப்போட்டா (குட்டை)","telugu":"సపోట (పొట్టి)","marathi":"चिकू (बटू)","bengali":"সফেদা (বামন)"},
       6.0,"medium",[4,5,6,7,11,12],0.55,0.78, 2.5,1.5,1.0, 8.0,65,"medium","high",10.0,7,False,50, _W,"hot-dry",IC),

    _p("plt_kokum_01", "Kokum / Garcinia", "Garcinia indica", "Clusiaceae", WT, F,
       {"hindi":"कोकम","kannada":"ಮುರುಗ","tamil":"கோகம்","telugu":"కొకం","marathi":"कोकम","bengali":"কোকম"},
       4.0,"low",[4,5,6],0.40,0.72, 2.5,1.5,1.0, 8.0,60,"low","high",8.0,6,False,40, ["hot-humid"],"hot-humid",IC),

    _p("plt_longan_dwarf_01", "Longan Dwarf / Supari Phal", "Dimocarpus longan (dwarf)", "Sapindaceae", WT, F,
       {"hindi":"सुपारी फल","kannada":"ಲಾಂಗನ್","tamil":"லாங்கன்","telugu":"లాంగన్","marathi":"लाँगन","bengali":"লংগান"},
       5.0,"low",[7,8,9],0.40,0.68, 3.0,1.8,1.2, 8.0,60,"medium","high",8.0,6,False,50, ["hot-humid"],"hot-humid",IC),

    _p("plt_lychee_dwarf_01", "Lychee Dwarf / Litchi (compact)", "Litchi chinensis (dwarf compact)", "Sapindaceae", WT, F,
       {"hindi":"लीची (बौना)","kannada":"ಲಿಚ್ಚಿ (ಕುಬ್ಜ)","tamil":"லிச்சி (குட்டை)","telugu":"లిచ్చి (పొట్టి)","marathi":"लिची (बटू)","bengali":"লিচু (বামন)"},
       5.0,"low",[5,6],0.35,0.68, 3.0,1.8,1.2, 10.0,70,"medium","high",10.0,6,False,60, ["composite","cold-dry"],"composite",IC),

    _p("plt_avocado_dwarf_01", "Avocado Dwarf / Makhanphal", "Persea americana (Simmonds dwarf)", "Lauraceae", WT, F,
       {"hindi":"मक्खनफल","kannada":"ಅವೋಕಾಡೊ","tamil":"வெண்ணெய் பழம்","telugu":"అవకాడో","marathi":"अवोकॅडो","bengali":"অ্যাভোকাডো"},
       5.0,"low",[10,11,12,1,2],0.40,0.68, 2.5,1.5,1.0, 8.0,65,"medium","medium",10.0,6,False,50, _W,"composite",IC),

    _p("plt_dragon_fruit_01", "Dragon Fruit / Pitaya (tree form)", "Selenicereus undatus", "Cactaceae", WT, F,
       {"hindi":"ड्रैगन फ्रूट","kannada":"ಡ್ರ್ಯಾಗನ್ ಫ್ರೂಟ್","tamil":"டிராகன் பழம்","telugu":"డ్రాగన్ ఫ్రూట్","marathi":"ड्रॅगन फ्रूट","bengali":"ড্রাগন ফল"},
       5.0,"high",[7,8,9,10,11],0.65,0.82, 1.5,0.9,0.6, 6.0,50,"high","high",8.0,8,True,40, _W,"hot-dry",IC,
       co2_kg_per_plant_yr=4.0),

    _p("plt_pineapple_guava_01", "Pineapple Guava / Feijoa", "Acca sellowiana", "Myrtaceae", WT, F,
       {"hindi":"अनानास अमरूद","kannada":"ಫೇಜೋಆ","tamil":"அன்னாசி கொய்யா","telugu":"ఫేజోవా","marathi":"फेइजोआ","bengali":"ফেইজোয়া"},
       3.0,"low",[5,6,7,8],0.45,0.70, 2.5,1.5,1.0, 6.0,55,"medium","medium",8.0,6,False,35, ["hot-dry","composite","cold-dry"],"composite",IC),

    _p("plt_ber_dwarf_01", "Ber / Indian Jujube (dwarf)", "Ziziphus mauritiana (dwarf)", "Rhamnaceae", WT, F,
       {"hindi":"बेर (बौना)","kannada":"ಬೊರೆ (ಕುಬ್ಜ)","tamil":"இலந்தை (குட்டை)","telugu":"రేగు (పొట్టి)","marathi":"बोर (बटू)","bengali":"কুল (বামন)"},
       4.0,"high",[11,12,1,2],0.55,0.82, 2.0,1.2,0.8, 6.0,55,"high","high",8.0,8,False,35, _W,"hot-dry",IC),

    _p("plt_tamarind_dwarf_01", "Tamarind Dwarf / Imli (grafted)", "Tamarindus indica (grafted dwarf)", "Fabaceae", WT, F,
       {"hindi":"इमली (बौना)","kannada":"ಹುಣಸೆ (ಕುಬ್ಜ)","tamil":"புளி (குட்டை)","telugu":"చింత (పొట్టి)","marathi":"चिंच (बटू)","bengali":"তেঁতুল (বামন)"},
       3.0,"low",[3,4,5,6],0.35,0.72, 2.0,1.2,0.8, 8.0,70,"medium","high",10.0,6,False,50, _W,"hot-dry",IC),

    _p("plt_wax_apple_01", "Wax Apple / Java Apple / Jamrul", "Syzygium samarangense", "Myrtaceae", WT, F,
       {"hindi":"जामरुल","kannada":"ರೋಸ್ ಆಪಲ್","tamil":"சம்பு","telugu":"జాంబు","marathi":"जांबूळ (लाल)","bengali":"জামরুল"},
       6.0,"medium",[5,6,7,8],0.50,0.75, 2.5,1.5,1.0, 8.0,60,"medium","high",8.0,7,False,40, ["hot-humid","composite"],"hot-humid",IC),

    _p("plt_curry_leaf_tree_01", "Curry Leaf Tree / Kadi Patta (large)", "Murraya koenigii (large)", "Rutaceae", WT, F,
       {"hindi":"कड़ी पत्ता (पेड़)","kannada":"ಕರಿಬೇವು (ಮರ)","tamil":"கறிவேப்பிலை மரம்","telugu":"కరివేపాకు చెట్టు","marathi":"कढीपत्ता झाड","bengali":"কারিপাতা গাছ"},
       1.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.85, 3.0,1.8,1.2, 8.0,70,"medium","high",8.0,8,False,50, _W,"hot-humid",IC),

    _p("plt_mulberry_black_01", "Black Mulberry / Kala Shahtoot", "Morus nigra", "Moraceae", WT, F,
       {"hindi":"काला शहतूत","kannada":"ಕಪ್ಪು ಹಿಪ್ಪುನೇರಳೆ","tamil":"கருப்பு மல்பெரி","telugu":"నల్ల మల్బెర్రీ","marathi":"काळी तूती","bengali":"কালো তুঁতফল"},
       4.0,"medium",[4,5,6],0.45,0.75, 2.5,1.5,1.0, 6.0,60,"medium","medium",8.0,7,False,40, _CC,"composite",IC),

    _p("plt_amla_tree_01", "Amla Tree / Indian Gooseberry", "Phyllanthus emblica (standard)", "Phyllanthaceae", WT, F,
       {"hindi":"आंवला","kannada":"ನೆಲ್ಲಿ ಮರ","tamil":"நெல்லி மரம்","telugu":"ఉసిరి మరం","marathi":"आवळा मोठा","bengali":"আমলা গাছ"},
       5.0,"high",[10,11,12,1],0.45,0.78, 2.5,1.5,1.0, 8.0,70,"medium","high",10.0,7,False,60, _W,"composite",IC),

    # ── CREEPER & CLIMBERS (19 new) ───────────────────────────────────────────

    _p("plt_passion_fruit_yellow_01", "Passion Fruit Yellow / Peela Krishna Phal", "Passiflora ligularis", "Passifloraceae", CC, F,
       {"hindi":"पीला कृष्ण फल","kannada":"ಹಳದಿ ಪ್ಯಾಶನ್ ಫ್ರೂಟ್","tamil":"மஞ்சள் பேஷன் ஃப்ரூட்","telugu":"పసుపు పాషన్ ఫ్రూట్","marathi":"पिवळे पॅशन फ्रूट","bengali":"হলুদ প্যাশন ফল"},
       5.0,"medium",[7,8,9,10,11],0.60,0.75, 3.5,2.0,1.3, 8.0,40,"medium","high",3.0,7,False,30, ["hot-humid","composite"],"hot-humid",IC),

    _p("plt_vanilla_01", "Vanilla / Vanilla Phal", "Vanilla planifolia", "Orchidaceae", CC, F,
       {"hindi":"वेनिला","kannada":"ವೆನಿಲ್ಲಾ","tamil":"வெனிலா","telugu":"వెనిల్లా","marathi":"व्हॅनिला","bengali":"ভ্যানিলা"},
       0.1,"low",[1,2,3,4,5],0.30,0.60, 2.0,1.2,0.8, 10.0,30,"low","medium",2.0,5,False,20, ["hot-humid"],"hot-humid",["NHB India"],
       notes="High-value spice; requires shade, support structure, and hand pollination"),

    _p("plt_black_pepper_01", "Black Pepper / Kali Mirch (vine)", "Piper nigrum", "Piperaceae", CC, F,
       {"hindi":"काली मिर्च बेल","kannada":"ಕರಿ ಮೆಣಸು ಬಳ್ಳಿ","tamil":"கருமிளகு கொடி","telugu":"నల్ల మిర్చి తీగ","marathi":"काळी मिरी वेल","bengali":"কালো মরিচ লতা"},
       0.5,"medium",[12,1,2,3],0.40,0.70, 3.0,1.8,1.2, 10.0,35,"low","high",3.0,6,False,30, ["hot-humid"],"hot-humid",IC),

    _p("plt_betel_leaf_01", "Betel Leaf / Paan", "Piper betle", "Piperaceae", CC, F,
       {"hindi":"पान","kannada":"ವೀಳ್ಯದ ಎಲೆ","tamil":"வெற்றிலை","telugu":"తమలపాకు","marathi":"विडा पान","bengali":"পান পাতা"},
       1.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.82, 2.0,1.2,0.8, 8.0,25,"low","high",2.0,7,False,20, ["hot-humid","composite"],"hot-humid",IC),

    _p("plt_bougainvillea_climber_01", "Bougainvillea Climber / Baganbahar (climbing form)", "Bougainvillea glabra", "Nyctaginaceae", CC, ORN,
       {"hindi":"बगनबहार (बेल)","kannada":"ಬೌಗನ್‌ ವಿಲ್ಲಿಯಾ (ಬಳ್ಳಿ)","tamil":"காகிதப்பூ (கொடி)","telugu":"బొగన్విల్లా (తీగ)","marathi":"बोगनवेल (वेल)","bengali":"বাগানবিলাস (লতা)"},
       0.0,"high",[1,2,3,4,11,12],0.75,0.90, 2.5,1.5,1.0, 20.0,60,"high","high",6.0,7,False,35, _W,"hot-dry",HI),

    _p("plt_thunbergia_blue_01", "Blue Sky Flower / Neela Thunbergia", "Thunbergia grandiflora", "Acanthaceae", CC, ORN,
       {"hindi":"नीला थुनबर्गिया","kannada":"ನೀಲಿ ಥುನ್ಬರ್ಗಿಯಾ","tamil":"நீல தும்பர்கியா","telugu":"నీలి థుంబర్జియా","marathi":"निळी थुनबर्जिया","bengali":"নীল থুনবার্গিয়া"},
       0.0,"high",[6,7,8,9,10,11],0.70,0.85, 3.0,1.8,1.2, 10.0,40,"medium","high",4.0,7,False,20, _HH,"hot-humid",HI),

    _p("plt_thunbergia_alata_01", "Black-eyed Susan Vine / Thunbergia", "Thunbergia alata", "Acanthaceae", CC, ORN,
       {"hindi":"काली आंख सुसान","kannada":"ಕಪ್ಪು ಕಣ್ಣಿನ ಸೂಸನ್","tamil":"கருப்பு கண் சூஸன்","telugu":"నల్లకన్ను సూసన్","marathi":"काळ्या डोळ्याची सुसन","bengali":"কালো চোখ সুসান"},
       0.0,"high",[10,11,12,1,2,3,4],0.65,0.85, 3.0,1.8,1.2, 8.0,35,"medium","high",3.0,7,False,15, _W,"composite",HI),

    _p("plt_antigonon_01", "Coral Vine / Chain of Love", "Antigonon leptopus", "Polygonaceae", CC, ORN,
       {"hindi":"कोरल बेल","kannada":"ಕೋರಲ್ ವೈನ್","tamil":"பவள கொடி","telugu":"పగడపు తీగ","marathi":"कोरल व्हाईन","bengali":"প্রবাল লতা"},
       0.0,"high",[8,9,10,11,12,1,2],0.70,0.88, 3.0,1.8,1.2, 10.0,40,"high","high",3.0,7,False,15, _W,"hot-dry",HI),

    _p("plt_morning_glory_01", "Morning Glory / Pratahkalin Pushpa", "Ipomoea cairica", "Convolvulaceae", CC, ORN,
       {"hindi":"प्रातःकालीन पुष्प","kannada":"ಮಾರ್ನಿಂಗ್ ಗ್ಲೋರಿ","tamil":"காலை மலர்","telugu":"ఉదయ మల్లె","marathi":"मॉर्निंग ग्लोरी","bengali":"মর্নিং গ্লোরি"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],0.80,0.88, 3.0,1.8,1.2, 10.0,30,"medium","high",2.0,7,False,12, _W,"hot-humid",HI),

    _p("plt_sweet_potato_vine_01", "Sweet Potato Vine / Ornamental Shakarkand", "Ipomoea batatas (ornamental)", "Convolvulaceae", CC, ORN,
       {"hindi":"शकरकंद बेल (सजावटी)","kannada":"ಅಲಂಕಾರಿಕ ಗೆಣಸು ಬಳ್ಳಿ","tamil":"அலங்கார சர்க்கரைவள்ளி","telugu":"అలంకార చిలగడ తీగ","marathi":"सजावटी रताळे वेल","bengali":"অলংকারিক মিষ্টি আলু লতা"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.90, 2.0,1.2,0.8, 6.0,25,"high","high",2.0,8,True,12, _W,"hot-humid",HI),

    _p("plt_honeysuckle_01", "Honeysuckle / Madhumalti (Japanese)", "Lonicera japonica", "Caprifoliaceae", CC, ORN,
       {"hindi":"मधुसूदनी","kannada":"ಹನಿಸಕ್ಲ್","tamil":"ஹனிசக்கில்","telugu":"హనీసకిల్","marathi":"हनीसकल","bengali":"হানিসাকল"},
       0.0,"high",[3,4,5,6,10,11],0.65,0.78, 3.0,1.8,1.2, 8.0,35,"medium","medium",3.0,6,False,20, _CC,"composite",HI),

    _p("plt_flame_vine_01", "Flame Vine / Pyrostegia", "Pyrostegia venusta", "Bignoniaceae", CC, ORN,
       {"hindi":"अग्नि बेल","kannada":"ಬೆಂಕಿ ಬಳ್ಳಿ","tamil":"தீ கொடி","telugu":"మంట తీగ","marathi":"अग्नी वेल","bengali":"আগুন লতা"},
       0.0,"high",[11,12,1,2,3],0.65,0.82, 4.0,2.5,1.5, 20.0,50,"medium","high",5.0,7,False,30, _W,"hot-dry",HI),

    _p("plt_petrea_01", "Purple Wreath / Petrea", "Petrea volubilis", "Verbenaceae", CC, ORN,
       {"hindi":"बैंगनी माला बेल","kannada":"ಪೆಟ್ರೇಯಾ","tamil":"பெட்ரியா","telugu":"పెట్రియా","marathi":"पेट्रिया","bengali":"পেট্রিয়া"},
       0.0,"high",[2,3,4,5,6],0.60,0.80, 3.0,1.8,1.2, 15.0,50,"medium","high",5.0,6,False,30, _W,"hot-dry",HI),

    _p("plt_wisteria_01", "Wisteria / Vilayati Champa Bel", "Wisteria sinensis", "Fabaceae", CC, ORN,
       {"hindi":"विस्टेरिया","kannada":"ವಿಸ್ಟೇರಿಯಾ","tamil":"விஸ்டேரியா","telugu":"విస్టీరియా","marathi":"विस्टेरिया","bengali":"উইস্টেরিয়া"},
       0.0,"medium",[3,4,5],0.45,0.65, 2.5,1.5,1.0, 20.0,60,"high","low",6.0,5,False,40, _CC,"composite",HI,
       notes="Cold/composite only; requires strong structural support — not suitable for unsupported terraces"),

    _p("plt_mucuna_01", "Velvet Bean / Kaunch", "Mucuna pruriens", "Fabaceae", CC, MED,
       {"hindi":"कौंच बीज","kannada":"ನಸುಗುನ್ನಿ","tamil":"பூனைக்காலி","telugu":"దూలగొండి","marathi":"कुहिली","bengali":"আলকুশি"},
       0.5,"medium",[10,11,12,1,2],0.50,0.78, 3.5,2.0,1.3, 10.0,40,"medium","high",4.0,6,False,25, _HH,"hot-humid",["ICAR Medicinal Plants"],
       notes="Handle with care — mature seed pods cause skin irritation; wear gloves when harvesting"),

    _p("plt_melon_trellis_01", "Melon Trellis / Kharbooja (trellis)", "Cucumis melo (trellis)", "Cucurbitaceae", CC, F,
       {"hindi":"खरबूजा (बेल)","kannada":"ಕರ್ಬೂಜ ಬಳ್ಳಿ","tamil":"முலாம் கொடி","telugu":"ఖర్బూజ తీగ","marathi":"खरबूज (वेल)","bengali":"খরমুজ লতা"},
       5.0,"medium",[4,5,6,7,8],0.50,0.72, 4.0,2.5,1.5, 10.0,40,"medium","high",5.0,6,False,35, _W,"hot-dry",IC),

    _p("plt_quisqualis_creeper_01", "Rangoon Creeper / Madhumalti", "Quisqualis indica (climber)", "Combretaceae", CC, ORN,
       {"hindi":"मधुमालती","kannada":"ರಂಗೂನ್ ಬಳ್ಳಿ","tamil":"ரங்கூன் கொடி","telugu":"రంగూన్ తీగ","marathi":"मधुमालती (वेल)","bengali":"মধুমালতী লতা"},
       0.0,"high",[4,5,6,7,8,9,10],0.75,0.85, 3.0,1.8,1.2, 15.0,45,"medium","high",5.0,7,False,25, _W,"hot-humid",HI),

    _p("plt_cissus_01", "Cissus / Grape Ivy / Harjori", "Cissus quadrangularis", "Vitaceae", CC, MED,
       {"hindi":"हड़जोड़","kannada":"ಮಂಗರ ಬಳ್ಳಿ","tamil":"பிரண்டை","telugu":"నల్లేరు","marathi":"चतुष्कोणी सीसस","bengali":"হাড়জোড়া"},
       0.0,"low",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.85, 1.5,0.9,0.6, 6.0,25,"high","high",2.0,7,True,15, _W,"hot-dry",["ICAR Medicinal Plants"]),

    # ── ORNAMENTAL GROUND COVER (29 new) ─────────────────────────────────────

    _p("plt_echeveria_elegans_01", "Echeveria Elegans / Moti Succulent", "Echeveria elegans", "Crassulaceae", OG, ORN,
       {"hindi":"एचेवेरिया","kannada":"ಎಚೆವೇರಿಯಾ","tamil":"எச்சவேரியா","telugu":"ఎచెవేరియా","marathi":"एचेवेरिया","bengali":"এচেভেরিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.3,0.2,0.1, 0.5,8,"high","high",0.2,10,True,3, _W,"hot-dry",HI),

    _p("plt_echeveria_secunda_01", "Echeveria Secunda / Neeli Succulent", "Echeveria secunda", "Crassulaceae", OG, ORN,
       {"hindi":"नीली एचेवेरिया","kannada":"ನೀಲಿ ಎಚೆವೇರಿಯಾ","tamil":"நீல எச்சவேரியா","telugu":"నీలి ఎచెవేరియా","marathi":"निळी एचेवेरिया","bengali":"নীল এচেভেরিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.3,0.2,0.1, 0.5,8,"high","high",0.2,10,True,3, _W,"hot-dry",HI),

    _p("plt_echeveria_agavoides_01", "Echeveria Agavoides / Lal Succulent", "Echeveria agavoides", "Crassulaceae", OG, ORN,
       {"hindi":"लाल एचेवेरिया","kannada":"ಕೆಂಪು ಎಚೆವೇರಿಯಾ","tamil":"சிவப்பு எச்சவேரியா","telugu":"ఎరుపు ఎచెవేరియా","marathi":"लाल एचेवेरिया","bengali":"লাল এচেভেরিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.3,0.2,0.1, 0.5,8,"high","high",0.2,10,True,3, _W,"hot-dry",HI),

    _p("plt_haworthia_01", "Haworthia / Zebra Plant", "Haworthia fasciata", "Asphodelaceae", OG, ORN,
       {"hindi":"हावोर्थिया","kannada":"ಹಾವರ್ತಿಯಾ","tamil":"ஹாவோர்தியா","telugu":"హావోర్థియా","marathi":"हावोर्थिया","bengali":"হাওর্থিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.2,0.1,0.1, 0.5,8,"high","high",0.2,10,True,3, _W,"hot-dry",HI),

    _p("plt_aloe_ornamental_01", "Aloe Ornamental / Aloe (decorative)", "Aloe vera (ornamental form)", "Asphodelaceae", OG, ORN,
       {"hindi":"एलोवेरा (सजावटी)","kannada":"ಅಲಂಕಾರಿಕ ಲೋಳೆ","tamil":"அலங்கார கற்றாழை","telugu":"అలంకార కలబంద","marathi":"अलंकारिक कोरफड","bengali":"অলংকারিক অ্যালোভেরা"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.4,0.2,0.1, 1.0,15,"high","high",1.0,10,True,5, _W,"hot-dry",HI),

    _p("plt_gasteria_01", "Gasteria / Ox Tongue", "Gasteria carinata", "Asphodelaceae", OG, ORN,
       {"hindi":"गास्टेरिया","kannada":"ಗ್ಯಾಸ್ಟೇರಿಯಾ","tamil":"காஸ்டேரியா","telugu":"గాస్టేరియా","marathi":"गॅस्टेरिया","bengali":"গ্যাস্টেরিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.2,0.1,0.1, 0.5,8,"high","high",0.2,10,True,3, _W,"hot-dry",HI),

    _p("plt_kalanchoe_blossfeldiana_01", "Kalanchoe Blossfeldiana / Chandni", "Kalanchoe blossfeldiana", "Crassulaceae", OG, ORN,
       {"hindi":"कलंचो","kannada":"ಕ್ಯಾಲಂಕೋ","tamil":"காலஞ்சோ","telugu":"కాలంచోయే","marathi":"कॅलंकोय","bengali":"কালাঞ্চো"},
       0.0,"high",[10,11,12,1,2,3,4],0.65,0.90, 0.5,0.3,0.2, 1.0,12,"medium","high",0.5,9,True,5, _W,"composite",HI),

    _p("plt_kalanchoe_tomentosa_01", "Panda Plant / Kalanchoe Tomentosa", "Kalanchoe tomentosa", "Crassulaceae", OG, ORN,
       {"hindi":"पांडा पौधा","kannada":"ಪಾಂಡಾ ಸಸ್ಯ","tamil":"பாண்டா செடி","telugu":"పాండా మొక్క","marathi":"पांडा वनस्पती","bengali":"পান্ডা প্লান্ট"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.3,0.2,0.1, 0.8,10,"high","high",0.3,10,True,3, _W,"hot-dry",HI),

    _p("plt_crassula_ovata_01", "Jade Plant / Crassula", "Crassula ovata", "Crassulaceae", OG, ORN,
       {"hindi":"जेड पौधा","kannada":"ಜೇಡ್ ಪ್ಲಾಂಟ್","tamil":"ஜேட் செடி","telugu":"జేడ్ మొక్క","marathi":"जेड झाड","bengali":"জেড প্লান্ট"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.5,0.3,0.2, 3.0,20,"high","high",1.5,10,True,8, _W,"hot-dry",HI),

    _p("plt_crassula_muscosa_01", "Watch Chain / Crassula Muscosa", "Crassula muscosa", "Crassulaceae", OG, ORN,
       {"hindi":"वॉच चेन सक्युलेंट","kannada":"ವಾಚ್ ಚೈನ್","tamil":"வாட்ச் சங்கிலி","telugu":"వాచ్ చెయిన్","marathi":"वॉच चेन","bengali":"ওয়াচ চেইন"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.2,0.1,0.1, 0.3,8,"high","high",0.1,10,True,2, _W,"hot-dry",HI),

    _p("plt_graptopetalum_01", "Ghost Plant / Graptopetalum", "Graptopetalum paraguayense", "Crassulaceae", OG, ORN,
       {"hindi":"घोस्ट प्लांट","kannada":"ಗ್ರ್ಯಾಪ್ಟೋಪೆಟಲಮ್","tamil":"கோஸ்ட் சக்யுலன்ட்","telugu":"గ్రాప్టోపెటలమ్","marathi":"घोस्ट प्लांट","bengali":"গ্রাপ্টোপেটালাম"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.3,0.2,0.1, 0.5,10,"high","high",0.2,10,True,3, _W,"hot-dry",HI),

    _p("plt_senecio_rowleyanus_01", "String of Pearls / Moti Mala", "Curio rowleyanus", "Asteraceae", OG, ORN,
       {"hindi":"मोती माला","kannada":"ಮುತ್ತಿನ ಸರ","tamil":"முத்து மாலை","telugu":"ముత్యాల దండ","marathi":"मोती माळ","bengali":"মুক্তার মালা"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 0.3,0.2,0.1, 0.3,10,"medium","high",0.1,9,True,3, _W,"hot-dry",HI),

    _p("plt_aptenia_01", "Baby Sun Rose / Aptenia", "Mesembryanthemum cordifolium", "Aizoaceae", OG, ORN,
       {"hindi":"बेबी सन रोज","kannada":"ಅಪ್ಟೇನಿಯಾ","tamil":"அப்டீனியா","telugu":"ఆప్టీనియా","marathi":"अॅप्टीनिया","bengali":"অ্যাপ্টেনিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.92, 0.4,0.2,0.1, 0.5,10,"high","high",0.3,9,True,3, _W,"hot-dry",HI),

    _p("plt_delosperma_01", "Ice Plant / Sheetali Paudha", "Delosperma cooperi", "Aizoaceae", OG, ORN,
       {"hindi":"आइस प्लांट","kannada":"ಐಸ್ ಪ್ಲಾಂಟ್","tamil":"ஐஸ் செடி","telugu":"ఐస్ మొక్క","marathi":"आइस प्लांट","bengali":"আইস প্লান্ট"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.90, 0.4,0.2,0.1, 0.3,8,"high","high",0.2,9,True,3, ["hot-dry","composite","cold-dry"],"hot-dry",HI),

    _p("plt_portulacaria_01", "Elephant Bush / Portulacaria", "Portulacaria afra", "Didiereaceae", OG, ORN,
       {"hindi":"हाथी झाड़ी","kannada":"ಪೋರ್ಚುಲಕೇರಿಯಾ","tamil":"போர்ட்யுலக்கேரியா","telugu":"పోర్ట్యులాకారియా","marathi":"पोर्चुलेकेरिया","bengali":"পোর্টুলাকারিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.5,0.3,0.2, 2.0,20,"high","high",1.5,10,True,8, _W,"hot-dry",HI),

    _p("plt_chlorophytum_01", "Spider Plant / Chlorophytum", "Chlorophytum comosum", "Asparagaceae", OG, ORN,
       {"hindi":"मकड़ी पौधा","kannada":"ಜೇಡ ಸಸ್ಯ","tamil":"சிலந்தி செடி","telugu":"సాలెగూడు మొక్క","marathi":"स्पायडर प्लांट","bengali":"স্পাইডার প্লান্ট"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.95, 0.8,0.5,0.3, 1.5,15,"medium","medium",0.5,9,True,5, _A,"composite",HI),

    _p("plt_rhoeo_01", "Moses in Cradle / Rhoeo", "Tradescantia spathacea", "Commelinaceae", OG, ORN,
       {"hindi":"पालना पौधा","kannada":"ರೋಯ್ಓ","tamil":"ரோஈயோ","telugu":"రోయో","marathi":"रोएओ","bengali":"রোয়িও"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.92, 0.8,0.5,0.3, 1.5,15,"medium","high",0.8,9,True,5, _W,"hot-humid",HI),

    _p("plt_caladium_bicolor_01", "Caladium Bicolor / Rang Patta", "Caladium bicolor", "Araceae", OG, ORN,
       {"hindi":"रंग पत्ता","kannada":"ಕ್ಯಾಲೇಡಿಯಮ್","tamil":"காலேடியம்","telugu":"కాలేడియమ్","marathi":"कॅलेडियम","bengali":"ক্যালেডিয়াম"},
       0.0,"high",[4,5,6,7,8,9,10,11],0.75,0.82, 1.5,0.9,0.6, 1.5,20,"low","medium",1.5,7,False,12, ["hot-humid"],"hot-humid",HI),

    _p("plt_caladium_humboldtii_01", "Caladium Humboldtii / Safed Rang Patta", "Caladium humboldtii", "Araceae", OG, ORN,
       {"hindi":"सफेद रंग पत्ता","kannada":"ಬಿಳಿ ಕ್ಯಾಲೇಡಿಯಮ್","tamil":"வெள்ளை காலேடியம்","telugu":"తెల్ల కాలేడియమ్","marathi":"पांढरे कॅलेडियम","bengali":"সাদা ক্যালেডিয়াম"},
       0.0,"high",[4,5,6,7,8,9,10,11],0.75,0.82, 1.2,0.7,0.5, 1.2,20,"low","medium",1.0,7,False,10, ["hot-humid"],"hot-humid",HI),

    _p("plt_begonia_rex_01", "Begonia Rex / Raj Begonia", "Begonia rex", "Begoniaceae", OG, ORN,
       {"hindi":"राज बेगोनिया","kannada":"ಬೆಗೋನಿಯಾ ರೇಕ್ಸ್","tamil":"ரெக்ஸ் பெகோனியா","telugu":"రెక్స్ బెగోనియా","marathi":"रेक्स बेगोनिया","bengali":"রেক্স বেগোনিয়া"},
       0.0,"high",[10,11,12,1,2,3,4,5],0.65,0.80, 1.5,0.9,0.6, 1.5,20,"low","medium",1.0,7,False,12, ["hot-humid","composite"],"hot-humid",HI),

    _p("plt_impatiens_01", "Busy Lizzie / Balsam / Gulmehndi", "Impatiens walleriana", "Balsaminaceae", OG, ORN,
       {"hindi":"गुलमेंहदी","kannada":"ಇಂಪೇಶಿಯನ್ಸ್","tamil":"குல்மேந்தி","telugu":"గుల్‌మెహందీ","marathi":"गुलमेंदी","bengali":"গুলমেহেন্দি"},
       0.0,"high",[10,11,12,1,2,3,4],0.65,0.85, 1.5,0.9,0.6, 1.5,15,"low","medium",0.8,8,True,8, ["hot-humid","composite"],"hot-humid",HI),

    _p("plt_gazania_01", "Gazania / Treasure Flower", "Gazania rigens", "Asteraceae", OG, ORN,
       {"hindi":"गज़ानिया","kannada":"ಗಜಾನಿಯಾ","tamil":"கஜானியா","telugu":"గజానియా","marathi":"गझानिया","bengali":"গাজানিয়া"},
       0.0,"high",[11,12,1,2,3,4],0.60,0.88, 1.0,0.6,0.4, 1.0,15,"high","high",0.5,9,True,5, ["hot-dry","composite"],"hot-dry",HI),

    _p("plt_torenia_01", "Wishbone Flower / Torenia", "Torenia fournieri", "Linderniaceae", OG, ORN,
       {"hindi":"तोरेनिया","kannada":"ಟೊರೆನಿಯಾ","tamil":"டோரேனியா","telugu":"టోరేనియా","marathi":"तोरेनिया","bengali":"টরেনিয়া"},
       0.0,"high",[10,11,12,1,2,3,4],0.60,0.85, 1.0,0.6,0.4, 1.0,15,"low","medium",0.5,8,True,5, ["hot-humid","composite"],"hot-humid",HI),

    _p("plt_gaillardia_01", "Blanket Flower / Gaillardia", "Gaillardia pulchella", "Asteraceae", OG, ORN,
       {"hindi":"गेलार्डिया","kannada":"ಗೈಲಾರ್ಡಿಯಾ","tamil":"கைலார்டியா","telugu":"గైలార్డియా","marathi":"गेलार्डिया","bengali":"গেইলার্ডিয়া"},
       0.0,"high",[10,11,12,1,2,3,4],0.60,0.88, 1.5,0.9,0.6, 1.5,15,"high","high",0.5,9,True,5, _A,"composite",HI),

    _p("plt_alternanthera_01", "Joseph's Coat / Lal Patta", "Alternanthera ficoidea", "Amaranthaceae", OG, ORN,
       {"hindi":"लाल पत्ता (जोसेफ)","kannada":"ಅಲ್ಟರ್ನಾಂಥೇರ","tamil":"ஜோசப் கோட்","telugu":"జోసెఫ్ కోట్","marathi":"जोसेफस कोट","bengali":"জোসেফস কোট"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.92, 0.8,0.5,0.3, 1.0,15,"medium","high",0.5,9,True,5, _W,"hot-humid",HI),

    _p("plt_ophiopogon_01", "Mondo Grass / Ophiopogon", "Ophiopogon japonicus", "Asparagaceae", OG, ORN,
       {"hindi":"मोंडो घास","kannada":"ಒಫಿಯೋಪೊಗೋನ್","tamil":"மோண்டோ கிராஸ்","telugu":"మోండో గ్రాస్","marathi":"मोंडो गवत","bengali":"মন্ডো গ্রাস"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.92, 0.8,0.5,0.3, 0.8,15,"medium","medium",0.5,8,True,5, _A,"composite",HI),

    _p("plt_liriope_01", "Lily Turf / Liriope", "Liriope muscari", "Asparagaceae", OG, ORN,
       {"hindi":"लिलटर्फ","kannada":"ಲಿರಿಯೋಪ","tamil":"லிரியோப்","telugu":"లిరియోప్","marathi":"लिरिओप","bengali":"লিরিওপ"},
       0.0,"high",[8,9,10,11],0.65,0.90, 1.0,0.6,0.4, 1.0,15,"medium","medium",0.5,8,True,5, _CC,"composite",HI),

    _p("plt_neoregelia_01", "Bromeliad Neoregelia / Neeli Guldaan", "Neoregelia carolinae", "Bromeliaceae", OG, ORN,
       {"hindi":"ब्रोमेलियड","kannada":"ನಿಯೋರೆಗೇಲಿಯಾ","tamil":"நியோரீஜீலியா","telugu":"నియోరెజెలియా","marathi":"नियोरेजेलिया","bengali":"নিওরেজেলিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 0.5,0.3,0.2, 1.5,10,"medium","high",0.5,8,True,5, ["hot-humid","composite"],"hot-humid",HI),

    _p("plt_tillandsia_01", "Air Plant / Tillandsia / Vayupaudha", "Tillandsia usneoides", "Bromeliaceae", OG, ORN,
       {"hindi":"वायु पौधा","kannada":"ಏರ್ ಪ್ಲಾಂಟ್","tamil":"காற்று செடி","telugu":"గాలి మొక్క","marathi":"एअर प्लांट","bengali":"এয়ার প্লান্ট"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 0.2,0.1,0.1, 0.5,0,"medium","medium",0.1,8,True,0, ["hot-humid","composite"],"hot-humid",HI,
       methods={"grow_bag":False,"raised_bed":False,"nft_hydroponics":False,"dwc_hydroponics":False,"vertical_panel":True,"trellis":False}),

    # ── BUTTERFLY & POLLINATOR (14 new) ──────────────────────────────────────

    _p("plt_porterweed_01", "Blue Porterweed / Neel Champa", "Stachytarpheta jamaicensis", "Verbenaceae", BP, ORN,
       {"hindi":"नील चंपा","kannada":"ಬ್ಲೂ ಪೋರ್ಟರ್ ವೀಡ್","tamil":"நீல பூ","telugu":"నీలి పువ్వు","marathi":"निळे पोर्टरविड","bengali":"নীল পোর্টারউইড"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.90, 1.5,0.9,0.6, 2.0,20,"medium","high",1.5,9,True,10, _W,"hot-humid",WW),

    _p("plt_heliotrope_01", "Heliotrope / Surajmukhi Bel", "Heliotropium arborescens", "Boraginaceae", BP, ORN,
       {"hindi":"हेलियोट्रोप","kannada":"ಹೀಲಿಯೋಟ್ರೋಪ್","tamil":"ஹீலியோட்ரோப்","telugu":"హీలియోట్రోప్","marathi":"हेलियोट्रोप","bengali":"হেলিওট্রোপ"},
       0.0,"high",[10,11,12,1,2,3,4],0.60,0.82, 1.5,0.9,0.6, 2.0,20,"medium","medium",1.0,7,True,10, _CC,"composite",WW),

    _p("plt_cosmos_01", "Cosmos / Cosmos Phool", "Cosmos bipinnatus", "Asteraceae", BP, ORN,
       {"hindi":"कॉसमॉस फूल","kannada":"ಕಾಸ್ಮೊಸ್","tamil":"காஸ்மாஸ்","telugu":"కోస్మోస్","marathi":"कॉसमॉस","bengali":"কসমস"},
       0.0,"high",[9,10,11,12,1,2,3],0.55,0.88, 3.0,1.8,1.2, 3.0,20,"medium","medium",1.5,8,True,10, _CC,"composite",WW),

    _p("plt_tithonia_01", "Mexican Sunflower / Tithonia", "Tithonia rotundifolia", "Asteraceae", BP, ORN,
       {"hindi":"मेक्सिकन सूरजमुखी","kannada":"ಟಿಥೋನಿಯಾ","tamil":"மெக்சிக்கன் சூரியகாந்தி","telugu":"మెక్సికన్ సన్‌ఫ్లవర్","marathi":"मेक्सिकन सूर्यफूल","bengali":"মেক্সিকান সূর্যমুখী"},
       0.0,"high",[8,9,10,11,12,1],0.55,0.85, 3.0,1.8,1.2, 5.0,30,"high","high",2.5,7,False,15, _W,"hot-dry",WW),

    _p("plt_salvia_red_01", "Red Sage / Lal Salvia", "Salvia splendens", "Lamiaceae", BP, ORN,
       {"hindi":"लाल साल्विया","kannada":"ಕೆಂಪು ಸಾಲ್ವಿಯಾ","tamil":"சிவப்பு சேல்வியா","telugu":"ఎరుపు సాల్వియా","marathi":"लाल साल्विया","bengali":"লাল সালভিয়া"},
       0.0,"high",[10,11,12,1,2,3,4],0.65,0.88, 1.5,0.9,0.6, 2.0,20,"medium","high",1.0,9,True,8, _W,"composite",WW),

    _p("plt_verbena_01", "Verbena / Verbena Phool", "Verbena bonariensis", "Verbenaceae", BP, ORN,
       {"hindi":"वर्बेना","kannada":"ವರ್ಬೇನಾ","tamil":"வெர்பினா","telugu":"వెర్బీనా","marathi":"व्हर्बेना","bengali":"ভার্বেনা"},
       0.0,"high",[10,11,12,1,2,3,4],0.60,0.85, 3.0,1.8,1.2, 3.0,20,"medium","medium",1.5,7,True,10, _CC,"composite",WW),

    _p("plt_agastache_01", "Anise Hyssop / Agastache", "Agastache foeniculum", "Lamiaceae", BP, MED,
       {"hindi":"अगास्टेश","kannada":"ಅಗಾಸ್ಟ್ಯಾಚ್","tamil":"அகாஸ்தாச்","telugu":"అగాస్టాచె","marathi":"अगास्टेश","bengali":"আগাস্তাচে"},
       0.0,"medium",[6,7,8,9,10],0.55,0.78, 2.0,1.2,0.8, 3.0,25,"medium","medium",1.0,7,True,10, _CC,"composite",WW),

    _p("plt_echinacea_01", "Coneflower / Echinacea", "Echinacea purpurea", "Asteraceae", BP, MED,
       {"hindi":"कोनफ्लावर","kannada":"ಎಕಿನೇಶಿಯಾ","tamil":"எக்கினேசியா","telugu":"ఎచినేసియా","marathi":"एकिनेशिया","bengali":"ইকিনেসিয়া"},
       0.0,"high",[6,7,8,9,10],0.55,0.78, 2.0,1.2,0.8, 3.0,30,"medium","medium",1.5,7,True,15, _CC,"composite",WW),

    _p("plt_calibrachoa_01", "Million Bells / Calibrachoa", "Calibrachoa x hybrida", "Solanaceae", BP, ORN,
       {"hindi":"मिलियन बेल्स","kannada":"ಕ್ಯಾಲಿಬ್ರ್ಯಾಕೋವಾ","tamil":"மில்லியன் பெல்ஸ்","telugu":"మిలియన్ బెల్స్","marathi":"मिलियन बेल्स","bengali":"মিলিয়ন বেলস"},
       0.0,"high",[10,11,12,1,2,3,4],0.65,0.85, 0.8,0.5,0.3, 1.0,12,"medium","medium",0.5,9,True,5, _CC,"composite",WW),

    _p("plt_gomphrena_01", "Globe Amaranth / Gomphrena", "Gomphrena globosa", "Amaranthaceae", BP, ORN,
       {"hindi":"गोम्फ्रेना","kannada":"ಗೊಂಫ್ರೇನ","tamil":"கோம்ப்ரீனா","telugu":"గోంఫ్రెనా","marathi":"गोम्फ्रेना","bengali":"গোম্ফ্রেনা"},
       0.0,"high",[10,11,12,1,2,3,4],0.65,0.88, 1.5,0.9,0.6, 2.0,15,"high","high",0.8,9,True,5, _A,"composite",WW),

    _p("plt_celosia_01", "Cockscomb / Celosia", "Celosia argentea", "Amaranthaceae", BP, ORN,
       {"hindi":"मुर्गकलंगी","kannada":"ಕೋಳಿ ಜುಟ್ಟು ಹೂ","tamil":"கோழி தலை பூ","telugu":"కోడి జుట్టు పువ్వు","marathi":"कोंबडा फूल","bengali":"মোরগের ঝুঁটি"},
       0.0,"high",[8,9,10,11,12,1],0.60,0.90, 1.5,0.9,0.6, 2.0,15,"high","high",0.8,9,True,5, _W,"composite",WW),

    _p("plt_french_marigold_01", "French Marigold / Chota Genda", "Tagetes patula", "Asteraceae", BP, ORN,
       {"hindi":"छोटा गेंदा","kannada":"ಚಿಕ್ಕ ಚೆಂಡು ಹೂ","tamil":"சிறு சாமந்தி","telugu":"చిన్న బంతి పువ్వు","marathi":"छोटा झेंडू","bengali":"ছোট গাঁদা"},
       0.0,"high",[10,11,12,1,2,3],0.55,0.92, 1.0,0.6,0.4, 2.0,15,"medium","high",1.0,9,True,5, _A,"composite",WW),

    _p("plt_rudbeckia_01", "Black-eyed Susan / Rudbeckia", "Rudbeckia hirta", "Asteraceae", BP, ORN,
       {"hindi":"रुडबेकिया","kannada":"ರುಡ್ಬೆಕಿಯಾ","tamil":"ருட்பெக்கியா","telugu":"రుడ్‌బెకియా","marathi":"रुडबेकिया","bengali":"রুডবেকিয়া"},
       0.0,"high",[6,7,8,9,10],0.55,0.82, 2.0,1.2,0.8, 2.5,20,"medium","medium",1.5,8,True,10, _CC,"composite",WW),

    _p("plt_salvia_blue_01", "Blue Salvia / Neeli Salvia", "Salvia farinacea", "Lamiaceae", BP, ORN,
       {"hindi":"नीली साल्विया","kannada":"ನೀಲಿ ಸಾಲ್ವಿಯಾ","tamil":"நீல சேல்வியா","telugu":"నీలి సాల్వియా","marathi":"निळी साल्विया","bengali":"নীল সালভিয়া"},
       0.0,"high",[10,11,12,1,2,3,4],0.65,0.85, 1.5,0.9,0.6, 2.0,20,"medium","medium",1.0,8,True,8, _CC,"composite",WW),
]
