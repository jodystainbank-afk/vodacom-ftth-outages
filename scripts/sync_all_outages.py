import os
import sys
import json
import re
import time
from datetime import datetime
from pathlib import Path

# External dependencies
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "public" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSON = DATA_DIR / "outages.json"

# Credentials from environment or defaults
VUMA_PORTAL_URL = os.environ.get("VUMA_PORTAL_URL", "https://isp-portal.vumatel.co.za/s/")
VUMA_USERNAME = os.environ.get("VUMA_USERNAME", "Jody.Stainbank@Merchantscx.com")
VUMA_PASSWORD = os.environ.get("VUMA_PASSWORD", "ProjectOctober2026#")

def detect_province(text):
    text = (text or "").lower()
    if any(k in text for k in ["cape town", "stellenbosch", "somerset west", "wynberg", "khayelitsha", "strand", "parow", "bellville", "durbanville", "milnerton", "western cape", "wc"]):
        return "Western Cape"
    if any(k in text for k in ["johannesburg", "sandton", "randburg", "midrand", "pretoria", "centurion", "soweto", "jabulani", "roodepoort", "kempton park", "benoni", "springs", "gauteng", "gp"]):
        return "Gauteng"
    if any(k in text for k in ["durban", "umhlanga", "ballito", "amanzimtoti", "pietermaritzburg", "pinetown", "kwazulu", "kzn"]):
        return "KwaZulu-Natal"
    if any(k in text for k in ["port elizabeth", "gqeberha", "east london", "eastern cape", "ec"]):
        return "Eastern Cape"
    if any(k in text for k in ["bloemfontein", "welkom", "free state", "fs"]):
        return "Free State"
    if any(k in text for k in ["nelspruit", "mbombela", "witbank", "emalahleni", "mpumalanga", "mp"]):
        return "Mpumalanga"
    if any(k in text for k in ["rustenburg", "potchefstroom", "hartbeespoort", "ifafi", "north west", "nw"]):
        return "North West"
    if any(k in text for k in ["polokwane", "limpopo", "lp"]):
        return "Limpopo"
    if any(k in text for k in ["kimberley", "upington", "northern cape", "nc"]):
        return "Northern Cape"
    return "National"

def scrape_vuma_b2b():
    print("=" * 65)
    print("  [1/2] SCRAPING VUMATEL B2B ISP PORTAL (HEADLESS)")
    print("=" * 65)
    
    incidents = []
    sheet_rows = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
            viewport={"width": 1400, "height": 900}
        )
        page = ctx.new_page()
        
        try:
            print("  Navigating to Vuma B2B login...")
            page.goto(VUMA_PORTAL_URL, wait_until="networkidle", timeout=60000)
            
            # Fill login
            user_input = page.locator('input[type="text"], input[type="email"], input[id*="username"], input[name*="username"]').first
            pass_input = page.locator('input[type="password"], input[id*="password"], input[name*="password"]').first
            
            user_input.fill(VUMA_USERNAME)
            pass_input.fill(VUMA_PASSWORD)
            
            login_btn = page.locator('button:has-text("Log in"), input[value="Log in"], button[type="submit"]').first
            login_btn.click()
            
            print("  Submitted credentials, waiting for session to stabilize (8s)...")
            time.sleep(8)
            
            # Navigate to ticket history
            ticket_url = "https://isp-portal.vumatel.co.za/s/tickethistory"
            for attempt in range(3):
                try:
                    page.goto(ticket_url, wait_until="domcontentloaded", timeout=45000)
                    time.sleep(6)
                    break
                except Exception:
                    time.sleep(3)
                    
            # Switch to Open Incidents list view
            try:
                list_trigger = page.locator('button[title*="Select a List View"], a[title*="Select a List View"], button:has-text("Recently Viewed"), button:has-text("Open Incidents")').first
                if list_trigger.is_visible():
                    list_trigger.click()
                    time.sleep(1.5)
                    open_opt = page.locator('span:has-text("Open Incidents"), a:has-text("Open Incidents")').first
                    if open_opt.is_visible():
                        open_opt.click()
                        time.sleep(4)
            except Exception as e:
                print("  List view switch notice:", e)

            # Scrape rows
            rows = page.locator('tbody tr, table[role="grid"] tbody tr').all()
            print(f"  Scraped {len(rows)} raw customer ticket rows from Vuma B2B!")
            
            cases = []
            for r in rows:
                try:
                    cells = [c.inner_text().strip() for c in r.locator('th, td').all()]
                    if len(cells) >= 6:
                        cases.append({
                            "ticketId": cells[0],
                            "dateOpened": cells[1],
                            "nmsStatus": cells[2] if len(cells) > 2 else "",
                            "incidentStatus": cells[3] if len(cells) > 3 else "",
                            "aggregationZone": cells[4] if len(cells) > 4 else "",
                            "masterIncident": cells[5] if len(cells) > 5 else "",
                            "raw": " | ".join(cells)
                        })
                except Exception:
                    pass

            # Group by Master Feeder Incident
            grouped = {}
            for c in cases:
                m_ref = c["masterIncident"] or c["ticketId"]
                if m_ref not in grouped:
                    grouped[m_ref] = {
                        "incidentId": m_ref,
                        "cases": [],
                        "zones": set(),
                        "nms": set(),
                        "statuses": set(),
                        "dates": []
                    }
                grouped[m_ref]["cases"].append(c)
                if c["aggregationZone"]: grouped[m_ref]["zones"].add(c["aggregationZone"])
                if c["nmsStatus"]: grouped[m_ref]["nms"].add(c["nmsStatus"])
                if c["incidentStatus"]: grouped[m_ref]["statuses"].add(c["incidentStatus"])
                if c["dateOpened"]: grouped[m_ref]["dates"].append(c["dateOpened"])

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            for m_ref, d in grouped.items():
                zones_sorted = sorted(list(d["zones"]))
                nms_sorted = sorted(list(d["nms"]))
                status_str = ", ".join(d["statuses"]) or "Repair in progress"
                customer_count = len(d["cases"])
                
                # Derive location & province
                area_names = []
                for z in zones_sorted:
                    prefix = z.split("-")[0]
                    # Map common zone prefixes
                    zmap = {
                        "WNB": "Wynberg", "SJAB": "Jabulani Phase 1", "FYV": "Ferryvale", 
                        "VSP": "Visagie Park", "IFF": "Ifafi Suburb", "KHZ9": "Khayelitsha Zone 09", 
                        "KHZ16": "Khayelitsha Zone 16", "UMH": "Upper Umhlanga", "MMR": "Mount Moriah"
                    }
                    if prefix in zmap and zmap[prefix] not in area_names:
                        area_names.append(zmap[prefix])
                
                suburb_display = (", ".join(area_names) or "Vumatel Network Area")
                if zones_sorted:
                    suburb_display += f" (Zones: {', '.join(zones_sorted)})"
                
                prov = detect_province(suburb_display + " " + " ".join(area_names))
                bucket = "EXTENDED (>48h)" if any("repair" in s.lower() or "hold" in s.lower() for s in d["statuses"]) else "ACUTE (<24h)"
                
                detail_str = f"⚠️ Vuma B2B NOC: {status_str} | {customer_count} Vodacom Line(s) Down | NMS: {', '.join(nms_sorted)}"
                macro_str = f"[082 1904 OUTAGE] FNO: Vumatel | Ref: {m_ref} | Area: {suburb_display} ({prov}) | Status: {status_str} | ETA & Update: {detail_str} | Started: {now_str} | Action: Inform customer of FNO Ref & ETA. Link case to Master Ref — do NOT book tech callout."
                
                sheet_rows.append([
                    m_ref, "Vumatel", prov, suburb_display, bucket, status_str,
                    detail_str, now_str, now_str, macro_str, "Vuma B2B Portal (Verified)"
                ])
                
                incidents.append({
                    "incidentId": m_ref,
                    "affectedCustomersCount": customer_count,
                    "incidentStatus": status_str,
                    "aggregationZones": zones_sorted,
                    "nmsStatuses": nms_sorted,
                    "suburb": suburb_display,
                    "province": prov
                })

            print(f"  Mapped {len(cases)} lines into {len(sheet_rows)} verified Master Feeder Incidents!")
        except Exception as e:
            print("  Vuma scraper warning:", e)
        finally:
            browser.close()
            
    return incidents, sheet_rows

def scrape_public_fnos():
    print("=" * 65)
    print("  [2/2] SCRAPING PUBLIC WHOLESALE FNO FEEDS (HTTP)")
    print("=" * 65)
    
    rows = []
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # 1. Cool Ideas Announcements
    feeds = [
        ("https://help.coolideas.co.za/announcements/category/fibre-outages", "Cool Ideas Outages"),
        ("https://help.coolideas.co.za/announcements/category/fibre-maintenance", "Cool Ideas Maint"),
        ("https://status.octotel.co.za/", "Octotel Official NOC")
    ]
    
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    for url, name in feeds:
        try:
            resp = requests.get(url, headers=headers, timeout=12)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                # Parse announcement cards
                cards = soup.select(".card, article, .announcement-item, tr, .component")
                for c in cards[:15]:
                    title = c.get_text(separator=" ", strip=True)
                    if len(title) > 20 and any(k in title.lower() for k in ["outage", "fault", "down", "break", "offline", "degraded", "maintenance"]):
                        prov = detect_province(title)
                        ref = "FNO-" + re.sub(r'[^A-Za-z0-9]', '', title[:18]).upper()
                        fno = "FNO Partner"
                        for f in ["Vumatel", "Openserve", "MetroFibre", "Frogfoot", "Octotel", "Zoom Fibre", "Evotel", "Link Africa", "DFA", "Clear Access"]:
                            if f.lower() in title.lower():
                                fno = f
                                break
                        bucket = "MAINTENANCE" if "maint" in title.lower() else "ACUTE (<24h)"
                        macro = f"[082 1904 OUTAGE] FNO: {fno} | Ref: {ref} | Status: Live Feed Notice | Action: Advise customer FNO is attending."
                        rows.append([ref, fno, prov, title[:90], bucket, "Active Outage", title[:150], now_str, now_str, macro, name])
                print(f"  Scraped {url} ({name}) successfully.")
        except Exception as e:
            print(f"  Feed warning ({name}):", e)
            
    return rows

def main():
    start_time = time.time()
    vuma_incidents, vuma_rows = scrape_vuma_b2b()
    public_rows = scrape_public_fnos()
    
    # Merge and prioritize: Vuma verified on top, then public rows
    all_rows = vuma_rows + public_rows
    
    # If scraper returned fewer than fallback, load existing dataset to avoid dropping verified baseline
    if OUT_JSON.exists():
        try:
            existing = json.loads(OUT_JSON.read_text(encoding="utf-8"))
            ex_rows = existing.get("rows", [])
            existing_ids = {r[0] for r in all_rows}
            for r in ex_rows:
                if r[0] not in existing_ids and not any(v in r[0] for v in ["INC-000036246", "INC-000036250", "INC-000036243"]):
                    all_rows.append(r)
        except Exception:
            pass

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S SAST")
    payload = {
        "lastUpdated": now_str,
        "totalOutages": len(all_rows),
        "activeCount": len([r for r in all_rows if "RESOLVED" not in str(r[4]).upper()]),
        "vumaIncidents": vuma_incidents,
        "rows": all_rows
    }
    
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"\n[DONE] Saved {len(all_rows)} live outages to {OUT_JSON} ({OUT_JSON.stat().st_size} bytes)")
    print(f"Elapsed: {round(time.time() - start_time, 2)}s\n")

if __name__ == "__main__":
    main()
