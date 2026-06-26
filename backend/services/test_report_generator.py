"""
Test scenario runner: 10 terraces, 3 personas, CSV + HTML output.
REMEMBER: Each persona gets different output format.
"""

from typing import Dict, Any, List
from datetime import datetime
import csv
import io

TEST_SCENARIOS = [
    {"id": "S1",  "name": "Small kitchen (Mumbai)",              "area_sqm": 93,  "city": "Mumbai",    "type": "kitchen",    "solar": False},
    {"id": "S2",  "name": "Large kitchen (Mumbai)",              "area_sqm": 465, "city": "Mumbai",    "type": "kitchen",    "solar": False},
    {"id": "S3",  "name": "Ornamental (Bangalore)",              "area_sqm": 279, "city": "Bangalore", "type": "ornamental", "solar": False},
    {"id": "S4",  "name": "Mixed + Solar (Delhi)",               "area_sqm": 929, "city": "Delhi",     "type": "mixed",      "solar": True},
    {"id": "S5",  "name": "No solar (Pune)",                     "area_sqm": 186, "city": "Pune",      "type": "mixed",      "solar": False},
    {"id": "S6",  "name": "High-density (Hyderabad)",            "area_sqm": 232, "city": "Hyderabad", "type": "kitchen",    "solar": False},
    {"id": "S7",  "name": "Commercial ornamental (Bangalore)",   "area_sqm": 558, "city": "Bangalore", "type": "ornamental", "solar": True},
    {"id": "S8",  "name": "Minimal (Chennai)",                   "area_sqm": 46,  "city": "Chennai",   "type": "food",       "solar": False},
    {"id": "S9",  "name": "Large mixed (Kolkata)",               "area_sqm": 837, "city": "Kolkata",   "type": "mixed",      "solar": True},
    {"id": "S10", "name": "Vertical ornamental (Pune)",          "area_sqm": 140, "city": "Pune",      "type": "ornamental", "solar": False},
]

# "kitchen" is not a valid plantation_type for the v2 calc; treat it as "food"
_TYPE_MAP = {"kitchen": "food"}


async def run_test_scenarios(db, plantation_calc_v2) -> Dict[str, Any]:
    """
    Run 10 scenarios through v2.0 calculator.
    Generate CSV + HTML.
    """
    results = []

    for scenario in TEST_SCENARIOS:
        plantation_type = _TYPE_MAP.get(scenario["type"], scenario["type"])

        calc = await plantation_calc_v2(
            db=db,
            usable_area_sqm=scenario["area_sqm"],
            city=scenario["city"],
            plantation_type=plantation_type,
            growing_methods=["raised_bed", "nft_hydroponics"],
            area_utilization_factor=0.78,
            survival_rate=0.85,
        )

        results.append({
            "scenario_id": scenario["id"],
            "scenario_name": scenario["name"],
            "inputs": scenario,
            "calculation": calc,
        })

    csv_content = _generate_csv(results)
    html_content = _generate_html(results)

    return {
        "results": results,
        "csv_content": csv_content,
        "html_content": html_content,
        "generated_at": datetime.now().isoformat(),
    }


def _generate_csv(results: List[Dict]) -> str:
    """Generate CSV with pagination header."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Scenario", "Area (sqft)", "City", "Type", "Solar",
        "Total Plants", "Adjusted Plants", "Yield (kg/yr)",
        "CO2 Total (kg/yr)", "CO2 ESG (kg/yr)", "Water (L/yr)"
    ])

    for result in results:
        inp = result["inputs"]
        calc = result["calculation"]

        writer.writerow([
            result["scenario_id"],
            round(inp["area_sqm"] * 10.764),
            inp["city"],
            inp["type"],
            "Yes" if inp["solar"] else "No",
            calc.get("total_plants_count", ""),
            calc.get("adjusted_plants_count", ""),
            calc.get("annual_food_yield_kg", ""),
            calc.get("co2_sequestered_kg_per_year_total", ""),
            calc.get("co2_sequestered_kg_per_year_esg_eligible", ""),
            calc.get("water_required_annual_litres", ""),
        ])

    return output.getvalue()


def _generate_html(results: List[Dict]) -> str:
    """Generate HTML with per-scenario formulas + comment boxes."""
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sus10 Plant DB v2.0 Test Report</title>
    <style>
        body {{ font-family: Arial; margin: 20px; background: #f5f5f5; }}
        .header {{ background: #1a5d1a; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
        .scenario {{ background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #1a5d1a; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }}
        th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background: #f0f0f0; font-weight: bold; }}
        .formula {{ background: #f9f9f9; padding: 10px; border-left: 3px solid #ff9800; margin: 10px 0; font-family: monospace; font-size: 12px; }}
        .comment-box {{ background: #fffde7; border: 2px solid #fbc02d; padding: 10px; margin-top: 10px; border-radius: 4px; min-height: 60px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Sus10 Plant DB v2.0 - 10 Scenario Test Report</h1>
        <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        <p>Status: SHADOW/TEST - Not yet live</p>
    </div>
"""

    for result in results:
        inp = result["inputs"]
        calc = result["calculation"]

        html += f"""
    <div class="scenario">
        <h2>{result["scenario_id"]}: {result["scenario_name"]}</h2>

        <h3>Inputs</h3>
        <table>
            <tr><th>Parameter</th><th>Value</th></tr>
            <tr><td>Area</td><td>{round(inp["area_sqm"] * 10.764):,} sqft</td></tr>
            <tr><td>City</td><td>{inp["city"]}</td></tr>
            <tr><td>Garden Type</td><td>{inp["type"]}</td></tr>
            <tr><td>Solar</td><td>{"Yes" if inp["solar"] else "No"}</td></tr>
        </table>

        <h3>Formulas</h3>
        <div class="formula">Net area = {inp["area_sqm"]} sqm × 0.78 (k_infra) = {round(inp["area_sqm"] * 0.78)} sqm</div>
        <div class="formula">Total plants = net area × planting density | Adjusted = total × 0.85 (survival rate)</div>

        <h3>Outputs</h3>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Plants</td><td>{calc.get("total_plants_count", 0)}</td></tr>
            <tr><td>Adjusted (survival)</td><td>{calc.get("adjusted_plants_count", 0)}</td></tr>
            <tr><td>Food Yield</td><td>{calc.get("annual_food_yield_kg", 0)} kg/yr</td></tr>
            <tr><td>CO2 Total</td><td>{calc.get("co2_sequestered_kg_per_year_total", 0)} kg/yr</td></tr>
            <tr><td>CO2 ESG-Eligible</td><td>{calc.get("co2_sequestered_kg_per_year_esg_eligible", 0)} kg/yr</td></tr>
            <tr><td>Water</td><td>{calc.get("water_required_annual_litres", 0):,} L/yr</td></tr>
        </table>

        <h3>Plant Mix</h3>
        <table>
            <tr><th>Plant</th><th>Category</th><th>Count</th><th>Yield</th><th>CO2</th><th>ESG?</th></tr>
"""

        for plant in calc.get("plant_mix", []):
            esg = "✓" if plant.get("co2_for_esg_reporting") else "—"
            html += f"""            <tr>
                <td>{plant.get("common_name", "?")}</td>
                <td>{plant.get("plant_category", "?")}</td>
                <td>{plant.get("count", 0)}</td>
                <td>{plant.get("yield_kg_yr", 0)}</td>
                <td>{plant.get("co2_kg_yr", 0)}</td>
                <td>{esg}</td>
            </tr>
"""

        html += f"""        </table>

        <div class="comment-box">
            <strong>Shivani's Review:</strong><br>
            <em>(Add comments here)</em>
        </div>
    </div>
"""

    html += f"""
    <div style="background: #2c3e50; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-top: 30px; font-size: 12px;">
        <p>Test Report | Shadow Deployment | v2.0 in parallel to v1.0</p>
        <p>Generated: {datetime.now().isoformat()}</p>
    </div>
</body>
</html>
"""

    return html
