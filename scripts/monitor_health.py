import urllib.request
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

LOG_FILE = Path(__file__).resolve().parent.parent / "health_monitor.log"

CF_URL = "https://vodacom-ftth-outages.pages.dev/data/outages.json"
CF_DB_URL = "https://vodacom-ftth-outages.pages.dev/data/outages.db"
GH_API_URL = "https://api.github.com/repos/jodystainbank-afk/vodacom-ftth-outages/actions/runs?per_page=3"
GH_TOKEN = os.environ.get("GH_TOKEN", "")

APPSCRIPT_WEBAPP_URL = "https://script.google.com/a/macros/merchantscx.co.za/s/AKfycbzQqI-fdpxpIJ45ElmYuGv6IaaSRRxNXr6omcamFWg-IvYqf4bYOylwWQN-Bv9FbUjl/exec"
SHEET_ID = "16o_KHfB3SqxLamlpWTjWOlGhDfXPLZgBNZBOhJV-CLw"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def check():
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S SAST")
    status = {
        "timestamp": now_str,
        "cloudflare_ok": False,
        "github_actions_ok": False,
        "appscript_ok": False
    }
    
    # 1. Check Cloudflare Pages
    try:
        t0 = time.time()
        req = urllib.request.Request(CF_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                status["cloudflare_ok"] = True
                status["total_outages"] = data.get("totalOutages")
                status["active_count"] = data.get("activeCount")
                status["last_synced"] = data.get("lastUpdated")
                status["vuma_count"] = len(data.get("vumaIncidents", []))
                status["cf_latency_ms"] = int((time.time() - t0) * 1000)
    except Exception as e:
        status["cloudflare_error"] = str(e)
        
    # 2. Check GitHub Actions
    try:
        req = urllib.request.Request(
            GH_API_URL,
            headers={
                "Authorization": f"Bearer {GH_TOKEN}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Vodacom-Health-Monitor"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            runs = json.loads(resp.read().decode("utf-8")).get("workflow_runs", [])
            if runs:
                latest = runs[0]
                status["github_actions_ok"] = (latest.get("conclusion") == "success" or latest.get("status") == "in_progress")
                status["latest_run_num"] = latest.get("run_number")
                status["latest_run_status"] = latest.get("status")
                status["latest_run_conclusion"] = latest.get("conclusion")
                status["latest_run_time"] = latest.get("updated_at")
    except Exception as e:
        status["github_actions_error"] = str(e)
        
    # 3. Check Google Apps Script Dashboard Web App
    try:
        t0 = time.time()
        opener = urllib.request.build_opener(NoRedirect)
        req = urllib.request.Request(APPSCRIPT_WEBAPP_URL, headers={"User-Agent": "Mozilla/5.0"})
        try:
            resp = opener.open(req, timeout=12)
            code = resp.status
            loc = resp.headers.get("Location", "")
        except urllib.error.HTTPError as he:
            code = he.code
            loc = he.headers.get("Location", "")
        
        status["as_latency_ms"] = int((time.time() - t0) * 1000)
        # Google Apps Script Web Apps restricted to organization return 302 redirecting to domain login or 200
        if code in [200, 302] and ("AKfycbzQqI" in loc or code == 200):
            status["appscript_ok"] = True
            status["appscript_version"] = "v13"
            status["appscript_endpoint"] = "AKfycbzQqI (Live Production)"
        else:
            status["appscript_error"] = f"Unexpected HTTP status {code}: {loc}"
    except Exception as e:
        status["appscript_error"] = str(e)

    log_line = (
        f"[{now_str}] "
        f"CF: {'OK' if status['cloudflare_ok'] else 'FAIL'} (Outages: {status.get('total_outages')}, Synced: {status.get('last_synced')}) | "
        f"GH Actions: {'OK' if status['github_actions_ok'] else 'FAIL'} (Run #{status.get('latest_run_num')}: {status.get('latest_run_conclusion') or status.get('latest_run_status')}) | "
        f"Apps Script: {'OK' if status['appscript_ok'] else 'FAIL'} ({status.get('appscript_version', 'v13')} Active, {status.get('as_latency_ms', 0)}ms)\n"
    )
    
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(log_line)
        
    print(log_line.strip())
    return status

if __name__ == "__main__":
    check()
