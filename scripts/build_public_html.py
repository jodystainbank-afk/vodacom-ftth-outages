import re
from pathlib import Path

src_html = Path(r"C:\Users\Jody2\.gemini\antigravity\scratch\vodacom-ftth-outage-dashboard\index.html").read_text(encoding="utf-8")

# In fetchLiveOutageData(isManual):
# Add direct fetch for '/data/outages.json' as the primary modern web fetch method:
replacement_fetch = """    function fetchLiveOutageData(isManual = false) {
      const dot = document.getElementById("syncDot");
      const statusText = document.getElementById("syncStatusText");
      if (dot) dot.className = "pulse-dot loading";
      if (statusText) statusText.textContent = isManual ? "Syncing Live Outages..." : "Polling Live Feeds...";
      countdownRemaining = POLL_INTERVAL_SECONDS;

      // Method 1: Cloudflare Pages / Static Edge JSON API (Sub-50ms)
      fetch('./data/outages.json?_=' + Date.now())
        .then(res => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(data => {
          const rows = Array.isArray(data) ? data : (data && Array.isArray(data.rows) ? data.rows : []);
          if (rows.length > 0) {
            dataSourceMode = "CLOUDFLARE_EDGE_API";
            const syncTime = data.lastUpdated || new Date().toLocaleTimeString();
            applyIncomingSheetRows(rows, "Cloudflare Edge API (Updated " + syncTime + ")");
            if (data.vumaIncidents && Array.isArray(data.vumaIncidents) && data.vumaIncidents.length > 0) {
              window.VUMA_LIVE_FEEDER_DATA = data.vumaIncidents;
              renderVumaB2BView();
            }
            return;
          }
          throw new Error("Empty rows");
        })
        .catch(err => {
          // Method 2: Apps Script fallback if embedded
          if (typeof google !== "undefined" && google.script && google.script.run) {
            google.script.run
              .withSuccessHandler(function (res) {
                const rows = Array.isArray(res) ? res : (res && Array.isArray(res.rows) ? res.rows : []);
                if (rows.length > 0) {
                  dataSourceMode = "APPS_SCRIPT_LIVE";
                  applyIncomingSheetRows(rows, "Live Sheet (Apps Script)");
                } else {
                  fetchViaJsonp();
                }
              })
              .withFailureHandler(function () {
                fetchViaJsonp();
              })
              .getLiveSheetDataForWebApp();
            return;
          }
          // Method 3: JSONP fallback
          fetchViaJsonp();
        });
    }"""

pattern = r'function fetchLiveOutageData\(isManual = false\) \{[\s\S]*?fetchViaJsonp\(\);\s*\}'
new_html = re.sub(pattern, replacement_fetch, src_html)

# Also update title tag to include Cloudflare Edge
new_html = new_html.replace(
  "<title>Vodacom FTTH (082 1904) — National Outage Command Dashboard | Merchants CX</title>",
  "<title>Vodacom FTTH (082 1904) NOC — Live Outage Command Center | Merchants CX</title>"
)

# Update the topbar subtitle
new_html = new_html.replace(
  "<span>Merchants CX Wholesale FNO Feed</span>",
  "<span>Merchants CX Wholesale FNO & Vuma B2B Live Engine</span>"
)

dest = Path(r"C:\Users\Jody2\.gemini\antigravity\scratch\vodacom-ftth-outages\public\index.html")
dest.write_text(new_html, encoding="utf-8")
print(f"Wrote {dest} ({dest.stat().st_size} bytes)")
