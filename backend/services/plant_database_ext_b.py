"""Plant DB extension — Part B: Perennial shrubs (40) + Medicinal/aromatic (30)"""
from datetime import datetime, timezone
from typing import Dict, Any, List

_NOW = datetime.now(timezone.utc).isoformat()
_W  = ["hot-humid", "hot-dry", "composite"]
_A  = ["hot-humid", "hot-dry", "composite", "cold-dry"]
_CC = ["composite", "cold-dry"]
_HD = ["hot-dry", "composite"]
_HH = ["hot-humid", "composite"]

_CAT = {
    "perennial_shrub":    {"co2": 3.50, "esg": True,
        "m": {"grow_bag":True,"raised_bed":False,"nft_hydroponics":False,"dwc_hydroponics":False,"vertical_panel":False,"trellis":False}},
    "medicinal_aromatic": {"co2": 2.80, "esg": True,
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

PS  = "perennial_shrub"
MA  = "medicinal_aromatic"
ORN = "ornamental"
MED = "medicinal"
MIX = "mixed"
HI  = ["Horticulture India"]
AY  = ["AYUSH Ministry India", "ICAR Medicinal Plants"]
IC  = ["ICAR 2022"]

PART_B: List[Dict[str, Any]] = [

    # ── PERENNIAL SHRUBS (40 new) ────────────────────────────────────────────

    _p("plt_thunbergia_erecta_01", "Thunbergia Erecta / Bush Clock Vine", "Thunbergia erecta", "Acanthaceae", PS, ORN,
       {"hindi":"थुनबर्गिया","kannada":"ಥುನ್ಬರ್ಗಿಯಾ","tamil":"தும்பர்கியா","telugu":"థుంబర్జియా","marathi":"थुनबर्जिया","bengali":"থুনবার্গিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 2.0,1.2,0.8, 3.0,35,"medium","high",3.0,8,True,15, _HH,"hot-humid",HI),

    _p("plt_mussaenda_01", "Mussaenda / Mussaenda", "Mussaenda philippica", "Rubiaceae", PS, ORN,
       {"hindi":"मुसेंडा","kannada":"ಮುಸ್ಸೆಂಡ","tamil":"முஸ்சேண்டா","telugu":"ముసేండా","marathi":"मुसेंडा","bengali":"মুসেন্ডা"},
       0.0,"high",[3,4,5,6,7,8,9,10],0.70,0.85, 3.0,1.8,1.2, 6.0,50,"medium","high",6.0,7,False,25, _HH,"hot-humid",HI),

    _p("plt_nerium_01", "Oleander / Kaner", "Nerium oleander", "Apocynaceae", PS, ORN,
       {"hindi":"कनेर","kannada":"ಕಣಗಿಲೆ","tamil":"அரளி","telugu":"గన్నేరు","marathi":"कण्हेर","bengali":"করবী"},
       0.0,"high",[3,4,5,6,7,8,9,10],0.80,0.90, 2.0,1.2,0.8, 8.0,60,"high","high",6.0,8,True,20, _W,"hot-dry",["Horticulture India"],
       notes="TOXIC — all parts poisonous; do not plant near food crops or children"),

    _p("plt_vitex_01", "Vitex / Five-leaf Chaste Tree", "Vitex agnus-castus", "Lamiaceae", PS, MED,
       {"hindi":"संभालू","kannada":"ಲಕ್ಕಿ ಗಿಡ","tamil":"நொச்சி","telugu":"వావిలి","marathi":"निर्गुडी","bengali":"নিশিন্দা"},
       0.0,"medium",[6,7,8,9,10],0.65,0.80, 2.0,1.2,0.8, 8.0,60,"high","high",5.0,7,False,25, _W,"hot-dry",AY),

    _p("plt_calliandra_01", "Calliandra / Powder Puff", "Calliandra haematocephala", "Fabaceae", PS, ORN,
       {"hindi":"पाउडर पफ","kannada":"ಕ್ಯಾಲಿಯಾಂಡ್ರ","tamil":"பவுடர் பஃப்","telugu":"పౌడర్ పఫ్","marathi":"पावडर पफ","bengali":"পাউডার পাফ"},
       0.0,"high",[10,11,12,1,2,3],0.75,0.88, 3.0,1.8,1.2, 8.0,50,"medium","high",5.0,8,True,25, _HH,"hot-humid",HI),

    _p("plt_bauhinia_dwarf_01", "Bauhinia / Kachnar (dwarf)", "Bauhinia purpurea (dwarf)", "Fabaceae", PS, ORN,
       {"hindi":"कचनार","kannada":"ಮಂದಾರ","tamil":"மந்தாரை","telugu":"దేవకాంచనం","marathi":"कांचन","bengali":"কাঞ্চন"},
       0.0,"high",[1,2,3,4,11,12],0.70,0.82, 2.5,1.5,1.0, 6.0,50,"medium","high",5.0,7,False,25, _W,"composite",HI),

    _p("plt_hamelia_01", "Hamelia / Firebush", "Hamelia patens", "Rubiaceae", PS, ORN,
       {"hindi":"हैमेलिया","kannada":"ಹ್ಯಾಮೇಲಿಯಾ","tamil":"ஹேமேலியா","telugu":"హేమేలియా","marathi":"हॅमेलिया","bengali":"হামেলিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 2.0,1.2,0.8, 4.0,35,"medium","high",3.0,8,True,15, _HH,"hot-humid",HI),

    _p("plt_russelia_01", "Russelia / Firecracker Plant", "Russelia equisetiformis", "Plantaginaceae", PS, ORN,
       {"hindi":"रसेलिया","kannada":"ರಸ್ಸೇಲಿಯಾ","tamil":"ரஸ்ஸேலியா","telugu":"రస్సేలియా","marathi":"रसेलिया","bengali":"রাসেলিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.90, 1.5,0.9,0.6, 3.0,30,"high","high",2.0,9,True,12, _W,"hot-dry",HI),

    _p("plt_angelonia_01", "Angelonia / Summer Snapdragon", "Angelonia angustifolia", "Plantaginaceae", PS, ORN,
       {"hindi":"एंजेलोनिया","kannada":"ಅಂಜೆಲೋನಿಯಾ","tamil":"ஏஞ்சலோனியா","telugu":"ఏంజెలోనియా","marathi":"एंजेलोनिया","bengali":"এঞ্জেলোনিয়া"},
       0.0,"high",[10,11,12,1,2,3,4],0.65,0.85, 1.5,0.9,0.6, 2.0,20,"medium","high",1.5,8,True,10, _W,"composite",HI),

    _p("plt_cuphea_01", "Cuphea / Cigar Plant", "Cuphea ignea", "Lythraceae", PS, ORN,
       {"hindi":"क्यूफिया","kannada":"ಕ್ಯೂಫಿಯಾ","tamil":"கியூஃபியா","telugu":"క్యూఫియా","marathi":"क्यूफिया","bengali":"কিউফিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 1.5,0.9,0.6, 2.0,25,"medium","high",1.5,9,True,10, _W,"hot-humid",HI),

    _p("plt_asystasia_01", "Asystasia / Creeping Foxglove", "Asystasia gangetica", "Acanthaceae", PS, ORN,
       {"hindi":"असिस्टेशिया","kannada":"ಅಸಿಸ್ಟೇಸಿಯಾ","tamil":"காட்டுமல்லி","telugu":"అసిస్టాసియా","marathi":"असिस्टेशिया","bengali":"এসিস্টাসিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 1.5,0.9,0.6, 2.0,20,"medium","high",1.5,8,True,10, _HH,"hot-humid",HI),

    _p("plt_ruellia_01", "Ruellia / Mexican Petunia", "Ruellia brittoniana", "Acanthaceae", PS, ORN,
       {"hindi":"रुएलिया","kannada":"ರುಎಲ್ಲಿಯಾ","tamil":"ரூல்லியா","telugu":"రూయెల్లియా","marathi":"रुएलिया","bengali":"রুয়েলিয়া"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 2.0,1.2,0.8, 3.0,30,"medium","high",2.0,8,True,12, _W,"composite",HI),

    _p("plt_acalypha_01", "Acalypha / Copper Leaf / Lal Patta", "Acalypha wilkesiana", "Euphorbiaceae", PS, ORN,
       {"hindi":"लाल पत्ता","kannada":"ಅಕಾಲಿಫ","tamil":"அக்காலிஃபா","telugu":"అకాలిఫా","marathi":"ताम्रपत्र","bengali":"তামা পাতা"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 2.0,1.2,0.8, 5.0,40,"medium","high",4.0,8,True,15, _W,"hot-humid",HI),

    _p("plt_heliconia_01", "Heliconia / Lobster Claw (dwarf)", "Heliconia psittacorum", "Heliconiaceae", PS, ORN,
       {"hindi":"हेलिकोनिया","kannada":"ಹೆಲಿಕೋನಿಯಾ","tamil":"ஹெலிகோனியா","telugu":"హెలికోనియా","marathi":"हेलिकोनिया","bengali":"হেলিকোনিয়া"},
       0.0,"high",[4,5,6,7,8,9,10],0.70,0.80, 3.0,1.8,1.2, 5.0,50,"low","high",5.0,7,False,30, ["hot-humid"],"hot-humid",HI),

    _p("plt_strelitzia_01", "Bird of Paradise / Strelitzia", "Strelitzia reginae", "Strelitziaceae", PS, ORN,
       {"hindi":"स्ट्रेलित्जिया","kannada":"ಸ್ಟ್ರೆಲಿಟ್ಜಿಯಾ","tamil":"பறவை சொர்க்கம்","telugu":"స్ట్రెలిత్జియా","marathi":"स्ट्रेलित्झिया","bengali":"বার্ড অব প্যারাডাইস"},
       0.0,"high",[11,12,1,2,3,4,5],0.55,0.82, 2.5,1.5,1.0, 4.0,40,"medium","high",4.0,8,True,25, _W,"hot-dry",HI),

    _p("plt_eranthemum_01", "Eranthemum / Blue Sage", "Eranthemum pulchellum", "Acanthaceae", PS, ORN,
       {"hindi":"नीली सेज","kannada":"ಎರಾಂಥೆಮಮ್","tamil":"எரான்தேமம்","telugu":"ఎరాన్థెమం","marathi":"एरांथेमम","bengali":"এরান্থেমাম"},
       0.0,"high",[1,2,3,4,11,12],0.70,0.85, 2.0,1.2,0.8, 4.0,35,"medium","high",3.0,8,True,15, _HH,"hot-humid",HI),

    _p("plt_graptophyllum_01", "Graptophyllum / Caricature Plant", "Graptophyllum pictum", "Acanthaceae", PS, ORN,
       {"hindi":"ग्राफ्टोफिलम","kannada":"ಗ್ರಾಫ್ಟೋಫಿಲಮ್","tamil":"கிராஃப்டோஃபில்லம்","telugu":"గ్రాఫ్టోఫిల్లమ్","marathi":"ग्राफ्टोफिलम","bengali":"গ্রাফ্টোফিলাম"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.85, 2.0,1.2,0.8, 4.0,35,"medium","high",3.0,8,True,15, _HH,"hot-humid",HI),

    _p("plt_strobilanthes_01", "Persian Shield / Strobilanthes", "Strobilanthes dyerianus", "Acanthaceae", PS, ORN,
       {"hindi":"पर्शियन शील्ड","kannada":"ಸ್ಟ್ರೊಬಿಲಾಂಥಿಸ್","tamil":"பேர்சியன் ஷீல்டு","telugu":"పర్షియన్ షీల్డ్","marathi":"पर्शियन शील्ड","bengali":"পার্সিয়ান শিল্ড"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.85, 1.5,0.9,0.6, 2.5,25,"low","high",1.5,8,True,12, ["hot-humid"],"hot-humid",HI),

    _p("plt_justicia_01", "Justicia / Brazilian Plume", "Justicia carnea", "Acanthaceae", PS, ORN,
       {"hindi":"जस्टिशिया","kannada":"ಜಸ್ಟಿಸಿಯಾ","tamil":"ஜஸ்டிசியா","telugu":"జస్టీసియా","marathi":"जस्टिशिया","bengali":"জাস্টিসিয়া"},
       0.0,"high",[6,7,8,9,10,11],0.70,0.82, 3.0,1.8,1.2, 4.0,35,"low","high",3.0,7,False,20, ["hot-humid"],"hot-humid",HI),

    _p("plt_aphelandra_01", "Aphelandra / Zebra Plant", "Aphelandra squarrosa", "Acanthaceae", PS, ORN,
       {"hindi":"जेब्रा पौधा","kannada":"ಅಫೆಲಾಂಡ್ರ","tamil":"ஜீப்ரா பிளாண்ட்","telugu":"జీబ్రా ప్లాంట్","marathi":"झेब्रा वनस्पती","bengali":"জেব্রা প্লান্ট"},
       0.0,"high",[8,9,10,11],0.60,0.78, 2.0,1.2,0.8, 3.0,30,"low","medium",2.0,7,False,15, ["hot-humid"],"hot-humid",HI),

    _p("plt_pachystachys_01", "Golden Shrimp Plant / Pachystachys", "Pachystachys lutea", "Acanthaceae", PS, ORN,
       {"hindi":"गोल्डन श्रिम्प प्लांट","kannada":"ಪ್ಯಾಚಿಸ್ಟ್ಯಾಚಿಸ್","tamil":"பசிஸ்டாக்கிஸ்","telugu":"పాచిస్టాకిస్","marathi":"गोल्डन श्रिम्प","bengali":"গোল্ডেন শ্রিম্প প্লান্ট"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 2.0,1.2,0.8, 3.0,30,"medium","high",2.0,8,True,12, _HH,"hot-humid",HI),

    _p("plt_tibouchina_01", "Tibouchina / Princess Flower", "Tibouchina urvilleana", "Melastomataceae", PS, ORN,
       {"hindi":"टिबोकिना","kannada":"ಟಿಬೋಚಿನಾ","tamil":"டிபோச்சினா","telugu":"టిబోచినా","marathi":"टिबोचिना","bengali":"টিবোচিনা"},
       0.0,"high",[8,9,10,11,12,1],0.65,0.78, 3.0,1.8,1.2, 6.0,50,"medium","medium",4.0,7,False,25, _CC,"composite",HI),

    _p("plt_brunfelsia_01", "Brunfelsia / Yesterday Today Tomorrow", "Brunfelsia pauciflora", "Solanaceae", PS, ORN,
       {"hindi":"ब्रनफेल्शिया","kannada":"ಬ್ರನ್ಫೆಲ್ಸಿಯಾ","tamil":"பிரன்ஃபெல்சியா","telugu":"బ్రన్ఫెల్షియా","marathi":"ब्रुनफेल्शिया","bengali":"ব্রুনফেলসিয়া"},
       0.0,"high",[1,2,3,4,5,6],0.65,0.80, 2.5,1.5,1.0, 4.0,40,"medium","medium",3.0,7,False,20, ["hot-humid","composite"],"hot-humid",HI),

    _p("plt_holmskioldia_01", "Holmskioldia / Chinese Hat Plant", "Holmskioldia sanguinea", "Lamiaceae", PS, ORN,
       {"hindi":"चीनी टोपी पौधा","kannada":"ಹೋಮ್ಸ್ಕಿಯೋಲ್ಡಿಯಾ","tamil":"ஹோம்ஸ்கியோல்டியா","telugu":"హోమ్స్కియోల్డియా","marathi":"होम्स्किओल्डिया","bengali":"হোমস্কিওলডিয়া"},
       0.0,"high",[1,2,3,11,12],0.65,0.82, 3.0,1.8,1.2, 6.0,50,"medium","high",4.0,7,False,20, _W,"hot-dry",HI),

    _p("plt_wrightia_01", "Wrightia / Sweet Indrajao", "Wrightia antidysenterica", "Apocynaceae", PS, MED,
       {"hindi":"इन्द्रजौ","kannada":"ಕೊಡಸೆ","tamil":"குடசபாலை","telugu":"పాలగన్నేరు","marathi":"इंद्रजव","bengali":"ইন্দ্রজব"},
       0.0,"medium",[3,4,5,6],0.55,0.78, 2.5,1.5,1.0, 6.0,50,"medium","high",4.0,7,False,20, _W,"hot-dry",AY),

    _p("plt_tabernaemontana_01", "Crape Jasmine / Tagar", "Tabernaemontana divaricata", "Apocynaceae", PS, ORN,
       {"hindi":"तगर","kannada":"ನಂದಿಬಟ್ಟಲು","tamil":"நந்தியாவட்டை","telugu":"నందివర్థనం","marathi":"तगर","bengali":"তগর"},
       0.0,"high",[3,4,5,6,7,8,9,10],0.80,0.88, 2.0,1.2,0.8, 5.0,40,"medium","high",4.0,9,True,20, _W,"hot-humid",HI),

    _p("plt_murraya_paniculata_01", "Orange Jasmine / Kamini", "Murraya paniculata", "Rutaceae", PS, ORN,
       {"hindi":"कामिनी","kannada":"ಕಾಮಿನಿ","tamil":"முல்லைவேளை","telugu":"కామిని","marathi":"कामिनी","bengali":"কামিনী"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 2.0,1.2,0.8, 6.0,50,"medium","high",5.0,9,True,20, _W,"hot-humid",HI),

    _p("plt_cestrum_01", "Night Jasmine / Raat Ki Rani", "Cestrum nocturnum", "Solanaceae", PS, ORN,
       {"hindi":"रात की रानी","kannada":"ರಾತ್ರಿ ರಾಣಿ","tamil":"நிசி மல்லி","telugu":"రాత్రి పువ్వు","marathi":"रात राणी","bengali":"রাতের রানী"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 2.0,1.2,0.8, 5.0,45,"medium","high",4.0,8,True,20, _W,"hot-humid",HI,
       notes="Fragrant at night; plant away from bedrooms if scent sensitivity is a concern"),

    _p("plt_gardenia_01", "Gardenia / Gandharaj", "Gardenia jasminoides", "Rubiaceae", PS, ORN,
       {"hindi":"गंधराज","kannada":"ಗಾರ್ಡೇನಿಯಾ","tamil":"கார்டீனியா","telugu":"గార్డేనియా","marathi":"गार्डेनिया","bengali":"গার্ডেনিয়া"},
       0.0,"high",[4,5,6,7,8],0.65,0.82, 2.5,1.5,1.0, 5.0,45,"low","high",4.0,8,True,20, _HH,"hot-humid",HI),

    _p("plt_kopsia_01", "Kopsia / Pink Kopsia", "Kopsia fruticosa", "Apocynaceae", PS, ORN,
       {"hindi":"कोप्सिया","kannada":"ಕೊಪ್ಸಿಯಾ","tamil":"கொப்சியா","telugu":"కోప్సియా","marathi":"कोप्सिया","bengali":"কোপসিয়া"},
       0.0,"high",[3,4,5,6,7,8,9],0.65,0.78, 3.0,1.8,1.2, 5.0,45,"medium","high",4.0,7,False,20, ["hot-humid"],"hot-humid",HI),

    _p("plt_plumeria_obtusa_01", "Plumeria White / Safed Champa", "Plumeria obtusa", "Apocynaceae", PS, ORN,
       {"hindi":"सफेद चंपा","kannada":"ಬಿಳಿ ಚಂಪಾ","tamil":"வெள்ளை சம்பங்கி","telugu":"తెల్ల చంపా","marathi":"पांढरा चाफा","bengali":"সাদা চাঁপা"},
       0.0,"high",[3,4,5,6,7,8,9,10],0.75,0.88, 1.5,0.9,0.6, 10.0,55,"high","high",8.0,8,True,35, _W,"hot-dry",HI),

    _p("plt_euphorbia_mili_01", "Crown of Thorns / Sehund Phool", "Euphorbia milii", "Euphorbiaceae", PS, ORN,
       {"hindi":"सेहुंड फूल","kannada":"ಮುಳ್ಳಿನ ಕಿರೀಟ","tamil":"முள் மகுடம்","telugu":"ముళ్ళ కిరీటం","marathi":"काटेरी फूल","bengali":"কাঁটার মুকুট"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.92, 1.0,0.6,0.4, 2.5,25,"high","high",2.0,9,True,10, _W,"hot-dry",HI),

    _p("plt_barleria_01", "Barleria / Philippine Violet", "Barleria cristata", "Acanthaceae", PS, ORN,
       {"hindi":"पियाबासा","kannada":"ಬಾರ್ಲೇರಿಯಾ","tamil":"பார்லேரியா","telugu":"బార్లేరియా","marathi":"बार्लेरिया","bengali":"বার্লেরিয়া"},
       0.0,"high",[9,10,11,12,1,2],0.70,0.85, 1.5,0.9,0.6, 3.0,30,"medium","high",2.0,8,True,12, _W,"hot-humid",HI),

    _p("plt_pseuderanthemum_01", "Pseuderanthemum / Shooting Star", "Pseuderanthemum carruthersii", "Acanthaceae", PS, ORN,
       {"hindi":"स्यूडेरांथेमम","kannada":"ಸ್ಯೂಡೆರಾಂಥೆಮಮ್","tamil":"சூடோரான்தேமம்","telugu":"సూడోరాంథెమం","marathi":"स्यूडेरांथेमम","bengali":"সিউডোরান্থেমাম"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.85, 1.5,0.9,0.6, 3.0,30,"medium","high",2.0,8,True,12, _HH,"hot-humid",HI),

    _p("plt_millingtonia_dwarf_01", "Indian Cork Tree / Akash Neem (dwarf)", "Millingtonia hortensis (dwarf)", "Bignoniaceae", PS, ORN,
       {"hindi":"आकाश नीम (बौना)","kannada":"ಆಕಾಶ ನೀಮ್","tamil":"ஆகாச வேம்பு","telugu":"ఆకాశ నీమ్","marathi":"आकाश निम (बटू)","bengali":"আকাশ নিম (বামন)"},
       0.0,"low",[10,11,12,1],0.55,0.78, 2.0,1.2,0.8, 8.0,60,"medium","high",6.0,7,False,30, _W,"hot-dry",HI),

    _p("plt_quisqualis_shrub_01", "Rangoon Creeper Shrub / Madhumalti", "Quisqualis indica (shrub form)", "Combretaceae", PS, ORN,
       {"hindi":"मधुमालती (झाड़ी)","kannada":"ರಂಗೂನ್ ಬಳ್ಳಿ (ಗಿಡ)","tamil":"ரங்கூன் கொடி (செடி)","telugu":"రంగూన్ తీగ (మొక్క)","marathi":"मधुमालती (झुडूप)","bengali":"মধুমালতী (ঝোপ)"},
       0.0,"high",[3,4,5,6,7,8,9,10],0.75,0.85, 2.0,1.2,0.8, 6.0,45,"medium","high",4.0,8,True,20, _W,"hot-humid",HI),

    _p("plt_fagraea_01", "Fagraea / Tembusu", "Fagraea fragrans", "Gentianaceae", PS, ORN,
       {"hindi":"फेग्रेया","kannada":"ಫ್ಯಾಗ್ರೇಯಾ","tamil":"ஃபேக்ரியா","telugu":"ఫేగ్రియా","marathi":"फेग्रेया","bengali":"ফেগ্রিয়া"},
       0.0,"low",[5,6,7,8],0.50,0.75, 2.0,1.2,0.8, 6.0,50,"medium","high",5.0,6,False,25, ["hot-humid"],"hot-humid",HI),

    _p("plt_columnea_01", "Goldfish Plant / Machhli Paudha", "Columnea gloriosa", "Gesneriaceae", PS, ORN,
       {"hindi":"गोल्डफिश पौधा","kannada":"ಗೋಲ್ಡ್‌ಫಿಶ್ ಪ್ಲಾಂಟ್","tamil":"கோல்ட்ஃபிஷ் செடி","telugu":"గోల్డ్‌ఫిష్ మొక్క","marathi":"गोल्डफिश झाड","bengali":"গোল্ডফিশ প্লান্ট"},
       0.0,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.78, 1.5,0.9,0.6, 2.0,20,"low","medium",1.0,6,False,15, ["hot-humid"],"hot-humid",HI),

    _p("plt_crossandra_yellow_01", "Yellow Crossandra / Peela Kanakambaram", "Crossandra infundibuliformis (yellow)", "Acanthaceae", PS, ORN,
       {"hindi":"पीला कनकांबरम","kannada":"ಹಳದಿ ಕನಕಾಂಬರ","tamil":"மஞ்சள் கனகாம்பரம்","telugu":"పసుపు కనకాంబరాలు","marathi":"पिवळी अबोली","bengali":"হলুদ ক্রসান্দ্রা"},
       0.0,"high",[3,4,5,6,7,8,9,10,11],0.85,0.88, 1.8,1.0,0.7, 2.5,30,"medium","high",2.0,8,True,12, ["hot-humid"],"hot-humid",HI),

    _p("plt_spathiphyllum_01", "Peace Lily / Shanti Patta", "Spathiphyllum wallisii", "Araceae", PS, ORN,
       {"hindi":"शांति पत्ता","kannada":"ಸ್ಪ್ಯಾತಿಫಿಲ್ಲಮ್","tamil":"அமைதி லில்லி","telugu":"శాంతి లిల్లీ","marathi":"शांती लिली","bengali":"পিস লিলি"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.85, 1.5,0.9,0.6, 3.0,30,"low","medium",2.0,7,False,15, ["hot-humid"],"hot-humid",HI),

    _p("plt_anthurium_01", "Anthurium / Flamingo Flower", "Anthurium andraeanum", "Araceae", PS, ORN,
       {"hindi":"एंथुरियम","kannada":"ಆಂಥೂರಿಯಮ್","tamil":"ஆந்துரியம்","telugu":"ఆంథూరియం","marathi":"अँथुरियम","bengali":"অ্যান্থুরিয়াম"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.82, 2.0,1.2,0.8, 2.5,30,"low","medium",2.0,7,False,15, ["hot-humid"],"hot-humid",HI),

    # ── MEDICINAL & AROMATIC (30 new) ─────────────────────────────────────────

    _p("plt_peppermint_01", "Peppermint / Pepparmint", "Mentha x piperita", "Lamiaceae", MA, MED,
       {"hindi":"पेपरमिंट","kannada":"ಪೆಪ್ಪರ್ ಮಿಂಟ್","tamil":"பெப்பர்மிண்ட்","telugu":"పెప్పర్‌మింట్","marathi":"पेपरमिंट","bengali":"পেপারমিন্ট"},
       0.4,"high",[1,2,3,4,5,6,7,8,9,10,11,12],0.85,0.88, 1.0,0.6,0.4, 1.5,20,"medium","medium",0.5,9,True,5, _A,"composite",["AICRP Aromatic Plants"]),

    _p("plt_spearmint_01", "Spearmint / Pudina (Vilayati)", "Mentha spicata (spearmint)", "Lamiaceae", MA, MED,
       {"hindi":"विलायती पुदीना","kannada":"ಸ್ಪಿಯರ್ ಮಿಂಟ್","tamil":"ஸ்பியர்மிண்ட்","telugu":"స్పియర్‌మింట్","marathi":"स्पियरमिंट","bengali":"স্পিয়ারমিন্ট"},
       0.4,"high",[1,2,3,4,5,6,7,8,9,10,11,12],0.85,0.88, 1.0,0.6,0.4, 1.5,20,"medium","medium",0.5,9,True,5, _A,"composite",["AICRP Aromatic Plants"]),

    _p("plt_eucalyptus_dwarf_01", "Eucalyptus Dwarf / Neelgiri (container)", "Eucalyptus citriodora (dwarf)", "Myrtaceae", MA, MED,
       {"hindi":"नीलगिरी (बौना)","kannada":"ನೀಲಗಿರಿ (ಕುಬ್ಜ)","tamil":"நீலகிரி (குட்டை)","telugu":"నీలగిరి (పొట్టి)","marathi":"निलगिरी (बटू)","bengali":"নীলগিরি (বামন)"},
       0.0,"low",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.75, 2.0,1.2,0.8, 8.0,70,"high","high",7.0,6,False,35, _W,"hot-dry",["AICRP Aromatic Plants"]),

    _p("plt_vetiver_01", "Vetiver / Khus Khus", "Chrysopogon zizanioides", "Poaceae", MA, MED,
       {"hindi":"खस","kannada":"ವೆಟಿವರ್","tamil":"வெட்டிவேர்","telugu":"వేట్టివేర్","marathi":"वाळा","bengali":"খাস"},
       0.0,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.85, 2.5,1.5,1.0, 3.0,50,"high","high",3.0,8,True,20, _W,"hot-dry",["AICRP Aromatic Plants","ICAR Medicinal Plants"]),

    _p("plt_coleus_amboinicus_01", "Indian Borage / Doddapatre", "Plectranthus amboinicus", "Lamiaceae", MA, MED,
       {"hindi":"पत्थरचूर","kannada":"ದೊಡ್ಡಪತ್ರೆ","tamil":"கற்பூரவல்லி","telugu":"వాము ఆకు","marathi":"दोडका पान","bengali":"পাথরচুর"},
       0.3,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.90, 1.5,0.9,0.6, 1.5,20,"medium","high",1.0,9,True,10, _W,"hot-humid",AY),

    _p("plt_andrographis_01", "Andrographis / Kalmegh", "Andrographis paniculata", "Acanthaceae", MA, MED,
       {"hindi":"कालमेघ","kannada":"ಕಿರಾಯತ","tamil":"சிறுகாஞ்சோரி","telugu":"నేలవేము","marathi":"किरात","bengali":"কালমেঘ"},
       0.2,"medium",[8,9,10,11],0.55,0.82, 1.5,0.9,0.6, 2.0,20,"medium","high",1.0,7,True,10, _W,"hot-humid",AY),

    _p("plt_centella_01", "Gotu Kola / Brahmi (Centella)", "Centella asiatica", "Apiaceae", MA, MED,
       {"hindi":"मंडूकपर्णी","kannada":"ಒಂದೆಲಗ","tamil":"வல்லாரை","telugu":"మండూకపర్ణి","marathi":"मंडूकपर्णी","bengali":"থানকুনি"},
       0.2,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 1.5,0.9,0.6, 0.5,10,"medium","high",0.5,8,True,8, _HH,"hot-humid",AY),

    _p("plt_phyllanthus_01", "Bhumi Amla / Stone Breaker", "Phyllanthus niruri", "Phyllanthaceae", MA, MED,
       {"hindi":"भूम्यामलकी","kannada":"ಕಿರು ನೆಲ್ಲಿ","tamil":"கீழாநெல்லி","telugu":"నేలఉసిరి","marathi":"भूईआवळा","bengali":"হজার দানা"},
       0.0,"low",[7,8,9,10,11],0.50,0.78, 1.5,0.9,0.6, 1.5,15,"medium","high",0.5,6,True,10, _W,"hot-humid",AY),

    _p("plt_eclipta_01", "Bhringraj / False Daisy", "Eclipta alba", "Asteraceae", MA, MED,
       {"hindi":"भृंगराज","kannada":"ಗರಗದ ಸೊಪ್ಪು","tamil":"கரிசலாங்கண்ணி","telugu":"గుంటగలగర","marathi":"माका","bengali":"কেশুত"},
       0.2,"medium",[7,8,9,10,11],0.55,0.82, 1.5,0.9,0.6, 1.5,15,"medium","high",0.5,7,True,10, _W,"hot-humid",AY),

    _p("plt_vana_tulsi_01", "Vana Tulsi / Forest Basil", "Ocimum gratissimum", "Lamiaceae", MA, MED,
       {"hindi":"वन तुलसी","kannada":"ಕಾಡು ತುಳಸಿ","tamil":"கோல தக்கொளி","telugu":"అడవి తులసి","marathi":"रान तुळस","bengali":"বন তুলসী"},
       0.3,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 1.5,0.9,0.6, 2.5,25,"medium","high",1.5,9,True,10, _W,"hot-humid",AY),

    _p("plt_citronella_01", "Citronella / Gandha Ghaas", "Cymbopogon nardus", "Poaceae", MA, MED,
       {"hindi":"गंध घास","kannada":"ಸಿಟ್ರೋನೆಲ್ಲ","tamil":"சிட்ரோனெல்லா","telugu":"సిట్రోనెల్లా","marathi":"सिट्रोनेला","bengali":"সিট্রোনেলা"},
       0.5,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.88, 2.5,1.5,1.0, 3.0,35,"high","high",2.0,8,True,15, _W,"hot-dry",["AICRP Aromatic Plants"]),

    _p("plt_catharanthus_med_01", "Sadabahar Medicinal / Periwinkle", "Catharanthus roseus (medicinal)", "Apocynaceae", MA, MED,
       {"hindi":"सदाबहार (औषधीय)","kannada":"ನಿತ್ಯ ಕಲ್ಯಾಣಿ","tamil":"நித்தியகல்யாணி (மருத்துவ)","telugu":"బిల్లగన్నేరు (ఔషధ)","marathi":"सदाफुली (औषधी)","bengali":"নয়নতারা (ঔষধী)"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.90, 1.0,0.6,0.4, 2.0,20,"high","high",1.0,9,True,8, _A,"hot-dry",AY),

    _p("plt_solanum_torvum_01", "Turkey Berry / Sundakai", "Solanum torvum", "Solanaceae", MA, MED,
       {"hindi":"भटकटैया","kannada":"ಹಣಗಲ","tamil":"சுண்டைக்காய்","telugu":"వాకుడు","marathi":"भोकर","bengali":"ভাট"},
       1.0,"medium",[6,7,8,9,10,11],0.55,0.80, 2.5,1.5,1.0, 4.0,35,"medium","high",3.0,7,False,20, _W,"hot-humid",AY),

    _p("plt_aegle_dwarf_01", "Bael Dwarf / Bel (container)", "Aegle marmelos (dwarf)", "Rutaceae", MA, MED,
       {"hindi":"बेल (बौना)","kannada":"ಬಿಲ್ವ (ಕುಬ್ಜ)","tamil":"வில்வம் (குட்டை)","telugu":"బిల్వం (పొట్టి)","marathi":"बेल (बटू)","bengali":"বেল (বামন)"},
       2.0,"medium",[4,5,6],0.40,0.78, 2.5,1.5,1.0, 8.0,60,"medium","high",8.0,7,False,35, _W,"hot-dry",AY),

    _p("plt_amla_dwarf_01", "Amla Dwarf / Gooseberry (container)", "Phyllanthus emblica (dwarf)", "Phyllanthaceae", MA, MED,
       {"hindi":"आंवला (बौना)","kannada":"ನೆಲ್ಲಿ (ಕುಬ್ಜ)","tamil":"நெல்லி (குட்டை)","telugu":"ఉసిరి (పొట్టి)","marathi":"आवळा (बटू)","bengali":"আমলা (বামন)"},
       3.0,"high",[10,11,12,1],0.40,0.78, 2.0,1.2,0.8, 6.0,55,"medium","high",8.0,8,False,35, _W,"composite",AY),

    _p("plt_hibiscus_sabdariffa_01", "Roselle / Gongura", "Hibiscus sabdariffa", "Malvaceae", MA, MIX,
       {"hindi":"चुकुर","kannada":"ಗೊಂಗೂರ","tamil":"புளிச்சக்கீரை","telugu":"గోంగూర","marathi":"आंबाडा","bengali":"চুকোর"},
       1.5,"high",[10,11,12,1],0.60,0.85, 2.0,1.2,0.8, 3.0,30,"medium","high",2.0,8,True,15, _W,"hot-humid",["ICAR 2022","AICRP Aromatic Plants"]),

    _p("plt_canna_01", "Canna / Sarvajaya", "Canna indica", "Cannaceae", MA, MIX,
       {"hindi":"सर्वजया","kannada":"ಕೇನ ಗಿಡ","tamil":"கண்ணா","telugu":"కన్నా","marathi":"कर्णफूल","bengali":"কানা ফুল"},
       0.0,"high",[6,7,8,9,10,11],0.65,0.85, 3.0,1.8,1.2, 4.0,40,"medium","high",4.0,7,False,25, _W,"hot-humid",AY),

    _p("plt_morinda_01", "Noni Dwarf / Aal", "Morinda citrifolia (dwarf)", "Rubiaceae", MA, MED,
       {"hindi":"आल","kannada":"ನೋನಿ","tamil":"நோனி","telugu":"మడ్డి","marathi":"नोनी","bengali":"নোনি"},
       3.0,"low",[1,2,3,4,5,6,7,8,9,10,11,12],0.80,0.75, 2.0,1.2,0.8, 8.0,60,"medium","high",7.0,6,False,35, ["hot-humid"],"hot-humid",AY),

    _p("plt_annona_dwarf_01", "Soursop Dwarf / Hanuman Phal", "Annona muricata (dwarf)", "Annonaceae", MA, MED,
       {"hindi":"हनुमान फल (बौना)","kannada":"ಸೀಬೆ (ಕುಬ್ಜ)","tamil":"முள்ளாத்தா (குட்டை)","telugu":"అట (పొట్టి)","marathi":"रामफळ (बटू)","bengali":"শরিফা (বামন)"},
       4.0,"low",[1,2,3,4,5,6],0.50,0.72, 2.5,1.5,1.0, 8.0,65,"low","high",8.0,5,False,45, ["hot-humid"],"hot-humid",AY),

    _p("plt_camphor_dwarf_01", "Camphor Dwarf / Kapoor (container)", "Cinnamomum camphora (dwarf)", "Lauraceae", MA, MED,
       {"hindi":"कपूर (बौना)","kannada":"ಕರ್ಪೂರ (ಕುಬ್ಜ)","tamil":"கர்பூரம் (குட்டை)","telugu":"కర్పూరం (పొట్టి)","marathi":"कापूर (बटू)","bengali":"কর্পূর (বামন)"},
       0.0,"low",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.75, 2.0,1.2,0.8, 6.0,60,"medium","high",6.0,6,False,30, _W,"composite",AY),

    _p("plt_ocimum_basilicum_thyrsiflorum_01", "Thai Basil / Thai Tulsi", "Ocimum basilicum var. thyrsiflorum", "Lamiaceae", MA, MED,
       {"hindi":"थाई तुलसी","kannada":"ಥಾಯ್ ತುಳಸಿ","tamil":"தாய் துளசி","telugu":"థాయ్ తులసి","marathi":"थाई तुळस","bengali":"থাই তুলসী"},
       0.3,"high",[4,5,6,7,8,9,10,11],0.70,0.88, 1.2,0.7,0.5, 2.0,20,"medium","high",0.8,9,True,8, _W,"hot-humid",AY),

    _p("plt_kalanchoe_pinnata_01", "Patharchatta / Air Plant", "Kalanchoe pinnata", "Crassulaceae", MA, MED,
       {"hindi":"पत्थरचट्टा","kannada":"ಮಕ್ಕಳ ಸಸ್ಯ","tamil":"ரணகல்லி","telugu":"సీమ సంపెంగ","marathi":"पानफुटी","bengali":"পাথরকুচি"},
       0.0,"high",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.92, 0.8,0.5,0.3, 1.5,15,"medium","high",0.8,9,True,8, _W,"hot-dry",AY),

    _p("plt_sarpagandha_01", "Sarpagandha / Indian Snakeroot", "Rauvolfia serpentina", "Apocynaceae", MA, MED,
       {"hindi":"सर्पगंधा","kannada":"ಸರ್ಪಗಂಧ","tamil":"சர்ப்பகந்தி","telugu":"సర్పగంధ","marathi":"सर्पगंधा","bengali":"সর্পগন্ধা"},
       0.0,"low",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.72, 1.5,0.9,0.6, 2.0,20,"medium","high",1.5,5,True,15, ["hot-humid","composite"],"hot-humid",AY),

    _p("plt_adhatoda_01", "Adhatoda / Malabar Nut / Vasaka", "Adhatoda vasica", "Acanthaceae", MA, MED,
       {"hindi":"वासा","kannada":"ಅಡ್ಡಸರ","tamil":"ஆடாதொடை","telugu":"ఆడాపర్చ","marathi":"अडुळसा","bengali":"বাসক"},
       0.0,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.82, 1.5,0.9,0.6, 3.0,30,"medium","high",2.0,7,True,15, _W,"hot-humid",AY),

    _p("plt_stevia_large_01", "Stevia Large / Meetha Patta (perennial)", "Stevia rebaudiana (perennial form)", "Asteraceae", MA, MED,
       {"hindi":"मीठा पत्ता","kannada":"ಸ್ಟೀವಿಯಾ (ಬಹುವಾರ್ಷಿಕ)","tamil":"ஸ்டேவியா (பல்லாண்டு)","telugu":"స్టీవియా (పెరినియల్)","marathi":"स्टेव्हिया (बहुवार्षिक)","bengali":"স্টেভিয়া (বহুবর্ষজীবী)"},
       0.3,"medium",[1,2,3,4,5,6,7,8,9,10,11,12],1.0,0.80, 2.0,1.2,0.8, 3.0,25,"medium","high",1.5,7,True,12, _W,"composite",["AICRP Aromatic Plants"]),

    _p("plt_artemisia_01", "Artemisia / Nagdaona", "Artemisia nilagirica", "Asteraceae", MA, MED,
       {"hindi":"नागदौना","kannada":"ಮಾಜಿಗೆ ಸೊಪ್ಪು","tamil":"மாசிக்காய்","telugu":"నాగదమన","marathi":"दवणा","bengali":"নাগদানা"},
       0.2,"medium",[8,9,10,11],0.55,0.80, 1.5,0.9,0.6, 2.5,25,"high","high",1.0,7,True,10, _W,"composite",["AICRP Aromatic Plants"]),

    _p("plt_lippia_javanica_01", "Fever Tea / Lemon Bush", "Lippia javanica", "Verbenaceae", MA, MED,
       {"hindi":"फीवर चाय","kannada":"ಲಿಪ್ಪಿಯಾ","tamil":"லிப்பியா","telugu":"లిప్పియా","marathi":"लिपिया","bengali":"লিপিয়া"},
       0.2,"low",[6,7,8,9,10],0.45,0.75, 1.5,0.9,0.6, 2.0,20,"high","high",1.0,6,True,10, _HD,"hot-dry",["AICRP Aromatic Plants"]),

    _p("plt_punica_medicinal_01", "Pomegranate Medicinal / Anar (medicinal)", "Punica granatum (medicinal var)", "Lythraceae", MA, MED,
       {"hindi":"अनार (औषधीय)","kannada":"ದಾಳಿಂಬೆ (ಔಷಧ)","tamil":"மாதுளை (மருத்துவ)","telugu":"దానిమ్మ (ఔషధ)","marathi":"डाळिंब (औषधी)","bengali":"ডালিম (ঔষধী)"},
       3.0,"medium",[7,8,9,10,11],0.50,0.80, 2.5,1.5,1.0, 6.0,55,"high","high",8.0,7,False,30, _W,"hot-dry",AY),
]
