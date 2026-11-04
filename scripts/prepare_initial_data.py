import re
import json
from pathlib import Path
from datetime import datetime

dash_file = Path(r"C:\Users\Jody2\Downloads\vodacom_ftth_0821904_outage_dashboard.html")
vuma_json_file = Path(r"C:\Users\Jody2\.gemini\antigravity\brain\7f127c7c-8272-4413-bc03-8c7d5f3c5c25\scratch\vuma_b2b_live_incidents.json")
out_file = Path(r"C:\Users\Jody2\.gemini\antigravity\scratch\vodacom-ftth-outages\public\data\outages.json")

content = dash_file.read_text(encoding="utf-8")
m = re.search(r'const FALLBACK_LIVE_ROWS\s*=\s*(\[[\s\S]*?\]);', content)
if not m:
    print("Could not find FALLBACK_LIVE_ROWS")
    exit(1)

raw_rows = json.loads(m.group(1))
print(f"Loaded {len(raw_rows)} rows from dashboard HTML")

vuma_incidents = []
if vuma_json_file.exists():
    try:
        vuma_data = json.loads(vuma_json_file.read_text(encoding="utf-8"))
        vuma_incidents = vuma_data.get("incidents", [])
    except Exception as e:
        print("Vuma json parse error:", e)

payload = {
    "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M:%S SAST"),
    "totalOutages": len(raw_rows),
    "rows": raw_rows,
    "vumaIncidents": vuma_incidents
}

out_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
print(f"Successfully wrote {out_file} ({out_file.stat().st_size} bytes)")
