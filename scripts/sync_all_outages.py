import sqlite3
import os
import sys
import json
import re
import time
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# External dependencies
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "public" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSON = DATA_DIR / "outages.json"
OUT_DB = DATA_DIR / "outages.db"

# Credentials from environment or defaults
VUMA_PORTAL_URL = os.environ.get("VUMA_PORTAL_URL", "https://isp-portal.vumatel.co.za/s/")
VUMA_USERNAME = os.environ.get("VUMA_USERNAME", "")
VUMA_PASSWORD = os.environ.get("VUMA_PASSWORD", "")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
}

# 25-Wholesale FNO Recognition Dictionary
FNO_PAIRS = [
    ("vuma reach", "Vuma Reach"), ("vumatel reach", "Vuma Reach"), ("vuma villages", "Vumatel"),
    ("vumatel aerial", "Vumatel"), ("vumatel", "Vumatel"), ("vumtel", "Vumatel"), ("vuma", "Vumatel"),
    ("metrofibre", "MetroFibre"), ("mfbn", "MetroFibre"), ("mfibre", "MetroFibre"), ("mfn", "MetroFibre"),
    ("frogfoot", "Frogfoot"), ("openserve", "Openserve"), ("octotel", "Octotel"), ("evotel", "Evotel"),
    ("zoom fibre", "Zoom Fibre"), ("zoomfibre", "Zoom Fibre"), ("zoom ftth", "Zoom Fibre"), ("zoom", "Zoom Fibre"),
    ("vodacom", "Vodacom Fibre"), ("link africa", "Link Africa"), ("linkafrica", "Link Africa"),
    ("dfa", "DFA"), ("dark fibre", "DFA"), ("open fibre", "Open Fibre"), ("openfibre", "Open Fibre"),
    ("clear access", "Clear Access"), ("waterfall access", "Waterfall Access Networks"), ("wan", "Waterfall Access Networks"),
    ("century city", "Century City Connect"), ("sadv", "SADV"), ("tt connect", "TT Connect"),
    ("link layer", "Link Layer"), ("linklayer", "Link Layer"), ("netstream", "Netstream"),
    ("balwin", "Balwin Fibre"), ("fmas", "FMAS Networks"), ("lightstruck", "Lightstruck"),
    ("liquid telecom", "Liquid Telecom"), ("liquid", "Liquid Telecom"), ("mitsol", "Mitsol"),
    ("comtel", "Comtel"), ("cybersmart", "Cybersmart"), ("thinkspeed", "Thinkspeed"), ("purple forest", "Purple Forest"), ("unifybr", "Unifybr")
]

DEDUP_STOP_WORDS = {
    "vumatel", "vuma", "metrofibre", "frogfoot", "openserve", "octotel", "evotel",
    "dfa", "fibre", "fiber", "ftth", "fsh", "gpon", "zone", "zones", "suburb",
    "suburbs", "estate", "phase", "the", "and", "in", "of", "all", "park",
    "road", "street", "avenue", "ave", "drive", "close", "lane", "way", "crescent",
    "place", "boulevard", "blvd", "cr", "rd", "st", "houses", "standing", "free",
    "extension", "ext", "branch", "link", "node", "feeder", "circuit"
}

DEDUP_BROAD_REGIONS = {
    "johannesburg", "pretoria", "tshwane", "durban", "ethekwini", "cape", "town",
    "eastern", "western", "northern", "gauteng", "kwazulu", "natal", "freestate",
    "randburg", "roodepoort", "sandton", "midrand", "boksburg", "centurion",
    "east", "west", "north", "south", "central", "rand", "winelands", "overberg",
    "eden", "metropolitan", "metro", "region", "area", "valley", "country"
}

def detect_fno(text):
    l = (text or "").lower()
    for needle, fno in FNO_PAIRS:
        if needle in l:
            return fno
    return "FNO Partner"

def detect_province(text):
    l = (text or "").lower()
    if re.search(r'\b(jhb|midrand|johannesburg|pretoria|centurion|gauteng|sandton|sandown|sunninghill|magaliessig|fourways|riverside view|malibongwe|randburg|soweto|jabulani|devland|turffontein|turfontein|florida|geluksdal|brakpan|benoni|springs|boksburg|roodepoort|ekurhuleni|tshwane|queenswood|krugersdorp|vosloorus|ennerdale|wierda|paulshof|parktown|rosebank|linden|vanderbijlpark|riverspray|menlo|lynnwood|rynfield|bracken|discovery|north riding|osprey|heidelberg|ratanda|linbro|randfontein|alberton|meyersdal|alrode|kempton|edenvale|bryanston|diepsloot|faerie glen|lenasia|germiston|nigel|buccleuch|ferndale|meyerton|henley|waverley|savoy|ebony park|vorna valley|chartwell|parkhurst|fountainebleau|robin hills|berario|jacanlee|westdene|sunnyridge|ormonde)\b', l):
        return "Gauteng"
    if re.search(r'\b(cpt|cape town|western cape|paarl|rondebosch|blue downs|khayelitsha|george|somerset west|durbanville|bellville|melkbos|parklands|kirstenhof|tokai|grassy park|beaufort west|plettenberg|plett|cape gate|kraaifontein|brackenfell|gugulethu|sea point|athlone|grabouw|bo-kaap|woodstock|observatory|salt river|strand|blouberg|mutual heights|langebaan|stellenbosch|winelands|overberg|mitchells plain|mowbray|de waterkant|foreshore|zonnebloem|wynberg|hout bay|durmonte|goedemoed)\b', l):
        return "Western Cape"
    if re.search(r'\b(dbn|durban|kzn|kwazulu|pietermaritzburg|msunduzi|ethekwini|umhlanga|la mercy|buffelsdale|mooi river|new germany|ladysmith|phoenix|inanda|chatsworth|ballito|hillary|cornubia|bluff|richards bay|tongaat|port shepstone|bonela|chesterville)\b', l):
        return "KwaZulu-Natal"
    if re.search(r'\b(parys|bloemfontein|free state|kroonstad|welkom|hillside)\b', l):
        return "Free State"
    if re.search(r'\b(lethlabile|brits|north west|rustenburg|hartebeespoort|hartbeespoort|ifafi|klerksdorp)\b', l):
        return "North West"
    if re.search(r'\b(eastern cape|kouga|jeffrey|gqeberha|port elizabeth|east london|mdantsane|wilsonia|humansdorp|zwelitsha|king william|nelson mandela bay|wavecrest)\b', l):
        return "Eastern Cape"
    if re.search(r'\b(nelspruit|mbombela|mpumalanga|witbank|duvha|kanonkop|middelburg|standerton|meyerville)\b', l):
        return "Mpumalanga"
    if re.search(r'\b(kimberley|northern cape|hillcrest|upington)\b', l):
        return "Northern Cape"
    if re.search(r'\b(limpopo|tzaneen|polokwane|thohoyandou|bela-bela|mokopane|seshego|mookgopong)\b', l):
        return "Limpopo"
    return "National"

def extract_ticket_id(title, extra, fno):
    m = re.search(r'\b(INC-\d{5,9}|CHG-\d{5,9}|FRG\d{6,9}|NN\d{6,9}|169\d{4}|168\d{4}|406\d{3}|356\d{4})\b', title + " " + extra, re.I)
    if m:
        return m.group(1).upper()
    sub = re.sub(r'[^a-zA-Z0-9]', '', title)[:18].upper()
    code = re.sub(r'[^a-zA-Z]', '', fno)[:3].upper() or "FNO"
    return f"{code}-{sub}"

def derive_turnaround_time(started_at, bucket, text):
    t = text or ""
    if bucket == "RESOLVED" or re.search(r'\b(resolved|restored|completed successfully|outage was resolved)\b', t, re.I):
        return "✅ Restored (Advise 2-min ONT Reboot)"
    
    m_explicit = re.search(r'\b(?:ETR|MMTR|ETA)\s*(?:for complete restoration)?\s*[:\-]?\s*([+\-\/~±]*\s*\d+(?:\.\d+)?\s*(?:hours?|hrs?|mins?|minutes?)|\d{2}:\d{2})', t, re.I)
    if m_explicit:
        return f"🟢 Confirmed FNO ETR: {m_explicit.group(1).strip()}"
        
    m_win = re.search(r'from\s+(\d{2}:\d{2}(?:\s+on\s+\d{2}/\d{2}/\d{4})?)\s+(?:to|until)\s+(\d{2}:\d{2}(?:\s+on\s+\d{2}/\d{2}/\d{4})?|\d{2}/\d{2}/\d{4}\s+between\s+\d{2}:\d{2}\s+and\s+\d{2}:\d{2})', t, re.I)
    if m_win:
        return f"🟢 Confirmed Window: {m_win.group(1)} → {m_win.group(2)} SAST"
        
    m_end = re.search(r'Planned End(?: Date/Time)?:\s*(\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}|\d{2}:\d{2})', t, re.I)
    if m_end:
        return f"🟢 Confirmed End ETA: {m_end.group(1).strip()} SAST"

    is_fibre_break = bool(re.search(r'\b(fibre break|fibre cut|cable theft|vandalism|splicing|replacement fibre|construction|trench)\b', t, re.I))
    
    try:
        clean_date = started_at.strip().replace(" ", "T")
        if len(clean_date) == 10:
            clean_date += "T08:00:00"
        elif len(clean_date) == 16:
            clean_date += ":00"
        dt = datetime.fromisoformat(clean_date)
        elapsed_hrs = max(0, (time.time() - dt.timestamp()) / 3600)
    except Exception:
        return "🟠 Derived ETA: 8–12h Fibre Break Splice SLA" if is_fibre_break else "🟡 Derived ETA: 4–6h Standard FNO SLA"

    if bucket == "MAINTENANCE":
        return "🛠️ Est. Complete ~5h Maint SLA"

    if elapsed_hrs <= 4 and not is_fibre_break:
        rem_hrs = max(0.5, 5 - elapsed_hrs)
        return f"🟡 Derived ETA: ~{round(rem_hrs, 1)}h left (4–6h Node SLA)"
    elif elapsed_hrs <= 12:
        rem_hrs = max(1.0, 10 - elapsed_hrs)
        return f"🟠 Derived ETA: ~{round(rem_hrs, 1)}h left (8–12h Fibre Splice SLA)"
    elif elapsed_hrs <= 24:
        return f"🚧 Derived ETA: within 24h ({int(elapsed_hrs)}h elapsed | Civil Rebuild SLA)"
    else:
        days = round(elapsed_hrs / 24, 1)
        return f"🔴 SLA Breached ({days}d elapsed) — Civil/Wayleave Fault"

def parse_html_to_lines(html):
    soup = BeautifulSoup(html, "html.parser")
    for s in soup(["script", "style"]):
        s.decompose()
    text = soup.get_text(separator="\n")
    lines = [re.sub(r'\s+', ' ', l).strip() for l in text.split("\n")]
    return [l for l in lines if l]

def extract_suburb_tokens(text):
    if not text:
        return []
    t = re.sub(r'\b(INC|CHG|FRG|MET|VUM|DFA|EVO|FNO|OCT)[-\s]?\w+\b', '', text, flags=re.I)
    t = re.sub(r'\(zones?:.*?\)', '', t, flags=re.I)
    t = re.sub(r'\(.*?\)', '', t)
    t = re.sub(r'[^a-zA-Z0-9\s]', ' ', t).lower()
    tokens = []
    for w in t.split():
        w = w.strip()
        if len(w) >= 4 and not w.isdigit() and w not in DEDUP_STOP_WORDS and w not in DEDUP_BROAD_REGIONS:
            if w not in tokens:
                tokens.append(w)
    return tokens

# -------------------------------------------------------------
# 1. SCRAPER: VUMATEL B2B ISP PORTAL (HEADLESS PLAYWRIGHT)
# -------------------------------------------------------------

def scrape_vuma_b2b():
    print("=" * 65)
    print("  [1/5] SCRAPING VUMATEL B2B ISP PORTAL (HEADLESS)")
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
                    open_opt = page.locator('span:has-text("OPEN incident"), a:has-text("OPEN incident"), span:has-text("Open Incidents")').first
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
                    zmap = {
                        "WNB": "Wynberg", "SJAB": "Jabulani Phase 1", "FYV": "Ferryvale", 
                        "VSP": "Visagie Park", "IFF": "Ifafi Suburb", "KHZ9": "Khayelitsha Zone 09", 
                        "KHZ16": "Khayelitsha Zone 16", "UMH": "Upper Umhlanga", "MMR": "Mount Moriah", "SMNXT": "Mofolo Extension", "NGL": "Nigel SP"
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

# -------------------------------------------------------------
# 2. SCRAPER: COOL IDEAS OUTAGES & TAG FEEDS + DEEP ENRICHMENT
# -------------------------------------------------------------

def scrape_cool_ideas():
    print("=" * 65)
    print("  [2/5] SCRAPING COOL IDEAS FEEDS & ENRICHING ARTICLES (HTTP)")
    print("=" * 65)
    
    feeds = [
        ("https://help.coolideas.co.za/announcements/category/fibre-outages", "Cool Ideas Outages", "", False),
        ("https://help.coolideas.co.za/announcements/category/fibre-outages?page=2", "Cool Ideas Outages P2", "", False),
        ("https://help.coolideas.co.za/announcements/category/fibre-maintenance", "Cool Ideas Maint", "", False),
        ("https://help.coolideas.co.za/announcements/category/fibre-current", "Cool Ideas Current", "", False),
        ("https://help.coolideas.co.za/announcements/tag/vumatel", "Cool Ideas (Vumatel)", "Vumatel", True),
        ("https://help.coolideas.co.za/announcements/tag/octotel", "Cool Ideas (Octotel)", "Octotel", True),
        ("https://help.coolideas.co.za/announcements/tag/zoom", "Cool Ideas (Zoom Fibre)", "Zoom Fibre", True),
        ("https://help.coolideas.co.za/announcements/tag/openserve", "Cool Ideas (Openserve)", "Openserve", True),
        ("https://help.coolideas.co.za/announcements/tag/frogfoot", "Cool Ideas (Frogfoot)", "Frogfoot", True),
        ("https://help.coolideas.co.za/announcements/tag/evotel", "Cool Ideas (Evotel)", "Evotel", True),
        ("https://help.coolideas.co.za/announcements/tag/link-africa", "Cool Ideas (Link Africa)", "Link Africa", True),
        ("https://help.coolideas.co.za/announcements/tag/dfa", "Cool Ideas (DFA)", "DFA", True),
        ("https://help.coolideas.co.za/announcements/tag/clear-access", "Cool Ideas (Clear Access)", "Clear Access", True),
        ("https://help.coolideas.co.za/announcements/tag/waterfall-access", "Cool Ideas (Waterfall)", "Waterfall Access Networks", True),
    ]

    results = []
    article_links = {}

    def fetch_feed(item):
        url, name, default_fno, is_tag = item
        try:
            r = requests.get(url, headers=HEADERS, timeout=12)
            if r.status_code == 200:
                return item, r.text
        except Exception:
            pass
        return item, None

    with ThreadPoolExecutor(max_workers=8) as ex:
        feed_responses = list(ex.map(fetch_feed, feeds))

    for (url, name, default_fno, is_tag), html in feed_responses:
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            if "/announcements/article/" in a["href"]:
                t = a.get_text(strip=True)
                if t:
                    article_links[t.lower()] = a["href"]

        lines = parse_html_to_lines(html)
        for i in range(len(lines)):
            m = re.search(r'\b(202\d[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2})\b', lines[i])
            if not m:
                continue
            started_at = m.group(1).replace("/", "-")
            before = lines[i][:m.start()].strip()
            title = before if len(before) > 2 else (lines[i-1] if i > 0 else "")
            if not title or title == "Articles" or len(title) < 3:
                continue

            tag_lines = []
            for j in range(i+1, min(len(lines), i+6)):
                if re.search(r'\b202\d[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}\b', lines[j]):
                    break
                if re.search(r'^(«|Previous|Next|RSS Feed|Categories)', lines[j], re.I):
                    break
                tag_lines.append(lines[j])
            
            meta = " ".join(tag_lines)
            combined = f"{title} {meta}"
            fno = detect_fno(combined)
            if fno == "FNO Partner" and default_fno:
                fno = default_fno
            ticket_id = extract_ticket_id(title, meta, fno)

            bucket = "ACUTE (<24h)"
            detail = "Current Outage"
            if re.search(r'\b(resolved|restored|completed|closed)\b', combined, re.I):
                bucket = "RESOLVED"
                detail = "Resolved — Reboot CPE"
            elif re.search(r'maintenance', combined, re.I) or "Maint" in name or ticket_id.startswith("CHG-"):
                bucket = "MAINTENANCE"
                detail = "Planned Maintenance"

            etr = derive_turnaround_time(started_at, bucket, combined)
            suburb = title[:140]
            prov = detect_province(f"{combined} {fno}")
            art_url = article_links.get(title.lower(), "")

            results.append({
                "id": ticket_id,
                "fno": fno,
                "province": prov,
                "suburb": suburb,
                "bucket": bucket,
                "statusDetail": detail,
                "impact": f"{etr} | Live FNO notice ({fno})",
                "startedAt": started_at,
                "source": name,
                "articleUrl": art_url
            })

    print(f"  Parsed {len(results)} notices from Cool Ideas. Enriching top active articles...")
    active_targets = [r for r in results if r["bucket"] != "RESOLVED" and r["articleUrl"]][:15]
    if active_targets:
        def fetch_article(t):
            try:
                r = requests.get(t["articleUrl"], headers=HEADERS, timeout=10)
                if r.status_code == 200:
                    return t, r.text
            except Exception:
                pass
            return t, None

        with ThreadPoolExecutor(max_workers=6) as ex:
            art_responses = list(ex.map(fetch_article, active_targets))

        for t, art_html in art_responses:
            if not art_html:
                continue
            body_text = " ".join(parse_html_to_lines(art_html))
            if re.search(r'\b(outage was resolved|has been resolved|issue is resolved)\b', body_text, re.I):
                t["bucket"] = "RESOLVED"
                t["statusDetail"] = "Resolved — Reboot CPE"

            m_upd = re.search(r'Update\s*(?:\([^)]+\)|[:\-])\s*([^.]+(?:\.[^.]+)?)(?:\s|$)', body_text, re.I)
            latest_upd = m_upd.group(0)[:160].strip() if m_upd else ""
            if not latest_upd:
                m_cause = re.search(r'[^.]*\b(?:fibre break|splicing|assessing the damage|commenced with the fibre)[^.]*', body_text, re.I)
                if m_cause:
                    latest_upd = m_cause.group(0).strip()

            etr = derive_turnaround_time(t["startedAt"], t["bucket"], body_text)
            cause = latest_upd if latest_upd else f"Live FNO notice ({t['fno']})"
            t["impact"] = f"{etr} | {cause}"

    return results

# -------------------------------------------------------------
# 3. SCRAPER: VOX NATIONAL OUTAGES & MAINTENANCE TABLE (HTTP)
# -------------------------------------------------------------

def scrape_vox():
    url = "https://portal.vox.co.za/vox/portal/public/outages/view.jsp"
    print("=" * 65)
    print("  [3/5] SCRAPING VOX NATIONAL NOC TABLE (HTTP)")
    print("=" * 65)
    results = []
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            rows = soup.find_all("tr")
            for tr in rows:
                cells = [re.sub(r'\s+', ' ', td.get_text(strip=True)) for td in tr.find_all("td")]
                if len(cells) < 8:
                    continue
                title, desc, update_desc, prov_raw, region, start_date, classification, status = cells[:8]
                if re.search(r'Web Hosting|WordPress|PHP', title + " " + desc, re.I):
                    continue

                combined = f"{title} {desc} {update_desc} {region}"
                fno = detect_fno(combined)
                if fno == "FNO Partner" and "Comsol" in title:
                    continue

                started_at = f"{start_date} 08:00"
                m_time = re.search(r'from\s+(\d{2}:\d{2})', update_desc, re.I)
                if m_time and re.match(r'^\d{4}-\d{2}-\d{2}$', start_date):
                    started_at = f"{start_date} {m_time.group(1)}"

                # Expiration check
                is_expired = False
                m_end = re.search(r'(?:to|until)\s+(?:\d{2}:\d{2}\s+on\s+)?(\d{2})/(\d{2})/(\d{4})', update_desc, re.I)
                if m_end:
                    try:
                        end_iso = f"{m_end.group(3)}-{m_end.group(2)}-{m_end.group(1)}T23:59:00"
                        if datetime.fromisoformat(end_iso).timestamp() < time.time():
                            is_expired = True
                    except Exception:
                        pass

                ticket_id = extract_ticket_id(f"{title} {region}", update_desc, fno)
                bucket = "MAINTENANCE" if "maintenance" in classification.lower() else "ACUTE (<24h)"
                detail = "Planned Maintenance" if bucket == "MAINTENANCE" else "Current Outage"
                if is_expired or re.search(r'Resolved|Completed', status, re.I):
                    bucket = "RESOLVED"
                    detail = "Resolved — Reboot CPE"

                prov = prov_raw if prov_raw in ["Gauteng", "Western Cape", "Eastern Cape", "Free State", "North West", "Mpumalanga", "Limpopo", "Northern Cape", "KwaZulu-Natal"] else detect_province(combined)
                suburb = f"{region} ({title})" if region and region != "National" else title
                etr = derive_turnaround_time(started_at, bucket, f"{update_desc} {desc}")
                clean_upd = (update_desc or desc or "FNO engineers attending")[:170]

                results.append({
                    "id": ticket_id,
                    "fno": fno,
                    "province": prov,
                    "suburb": suburb[:140],
                    "bucket": bucket,
                    "statusDetail": detail,
                    "impact": f"{etr} | {clean_upd}",
                    "startedAt": started_at,
                    "source": "Vox National NOC Table"
                })
    except Exception as e:
        print("  Vox scraper warning:", e)

    print(f"  Scraped {len(results)} notices from Vox National NOC Table.")
    return results

# -------------------------------------------------------------
# 4. SCRAPER: AFRIHOST & OCTOTEL NOC FEEDS (HTTP)
# -------------------------------------------------------------

def scrape_afrihost_and_octotel():
    print("=" * 65)
    print("  [4/5] SCRAPING AFRIHOST STATUS & OCTOTEL NOC (HTTP)")
    print("=" * 65)
    results = []
    
    # 4A. Afrihost
    try:
        url = "https://www.afrihost.com/status?product=fibre-broadband"
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 200:
            lines = parse_html_to_lines(r.text)
            mos = {"jan":"01","feb":"02","mar":"03","apr":"04","may":"05","jun":"06","jul":"07","aug":"08","sep":"09","oct":"10","nov":"11","dec":"12"}
            for i in range(1, len(lines)):
                if re.match(r'^UPDATE\s*[•·\-]', lines[i], re.I):
                    continue
                m = re.search(r'\b(\d{2}:\d{2})\s*[•·\-]\s*(\d{1,2})\s+([A-Za-z]{3})\s+(202\d)\b', lines[i], re.I)
                if not m:
                    continue
                started_at = f"{m.group(4)}-{mos.get(m.group(3).lower(), '10')}-{int(m.group(2)):02d} {m.group(1)}"

                header = lines[i-1] if i > 0 else ""
                update_note = ""
                for k in range(i-1, max(0, i-5), -1):
                    if "|" in lines[k] or re.search(r'Impact\s*[•·]', lines[k], re.I):
                        header = lines[k]
                        if k < i-1 and not re.match(r'^UPDATE', lines[i-1], re.I) and len(lines[i-1]) > 25:
                            update_note = lines[i-1]
                        break

                desc = update_note or (lines[i+1] if i+1 < len(lines) else "")
                combined = f"{header} {lines[i-1] if i>0 else ''} {desc}"
                fno = detect_fno(combined)
                parts = header.split("|")
                clean_sub = parts[-1].strip() if len(parts) > 1 else header
                ticket_id = extract_ticket_id(clean_sub, desc, fno)

                bucket = "ACUTE (<24h)"
                detail = "Medium Impact Outage"
                if re.search(r'\b(resolved|restored|completed)\b', combined, re.I):
                    bucket = "RESOLVED"
                    detail = "Resolved — Reboot CPE"
                elif re.search(r'High Impact', header, re.I):
                    detail = "High Impact Outage"

                etr = derive_turnaround_time(started_at, bucket, combined)
                results.append({
                    "id": ticket_id,
                    "fno": fno,
                    "province": detect_province(combined),
                    "suburb": clean_sub[:140],
                    "bucket": bucket,
                    "statusDetail": detail,
                    "impact": f"{etr} | {desc[:170]}",
                    "startedAt": started_at,
                    "source": "Afrihost Status (Live)"
                })
        print(f"  Scraped {len(results)} notices from Afrihost Status.")
    except Exception as e:
        print("  Afrihost scraper warning:", e)

    # 4B. Octotel
    octo_count = 0
    try:
        url = "https://status.octotel.co.za/"
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 200:
            lines = parse_html_to_lines(r.text)
            for i in range(len(lines)):
                if not re.search(r'Octotel Network Notice|Emergency.*Maintenance', lines[i], re.I):
                    continue
                title = lines[i].strip()
                block = " ".join(lines[i:min(len(lines), i+18)])
                
                started_at = datetime.now().strftime("%Y-%m-%d %H:%M")
                m_start = re.search(r'Planned Start Date/Time:\s*(\d{2})/(\d{2})/(\d{4})\s+(\d{2}:\d{2})', block, re.I)
                if m_start:
                    started_at = f"{m_start.group(3)}-{m_start.group(2)}-{m_start.group(1)} {m_start.group(4)}"

                is_completed = bool(re.search(r'\b(Completed|Maintenance has completed successfully)\b', block, re.I))
                bucket = "RESOLVED" if is_completed else ("MAINTENANCE" if "maintenance" in title.lower() else "ACUTE (<24h)")
                detail = "Resolved — Reboot CPE" if is_completed else ("Planned Maintenance" if bucket == "MAINTENANCE" else "Current Outage")

                parts = [s.strip() for s in title.split("|")]
                suburb = parts[2] if len(parts) >= 3 else title
                ticket_id = extract_ticket_id(suburb, block, "Octotel")
                etr = derive_turnaround_time(started_at, bucket, block)

                results.append({
                    "id": ticket_id,
                    "fno": "Octotel",
                    "province": detect_province(f"{suburb} Western Cape"),
                    "suburb": suburb[:140],
                    "bucket": bucket,
                    "statusDetail": detail,
                    "impact": f"{etr} | Octotel NOC Notice ({suburb})",
                    "startedAt": started_at,
                    "source": "Octotel Official NOC"
                })
                octo_count += 1
        print(f"  Scraped {octo_count} notices from Octotel Official NOC.")
    except Exception as e:
        print("  Octotel scraper warning:", e)

    return results

# -------------------------------------------------------------
# 5. DEDUPLICATION & MULTI-FEED CONSOLIDATION
# -------------------------------------------------------------

def consolidate_tickets(all_tickets):
    print("=" * 65)
    print("  [5/5] CONSOLIDATING DUPLICATES ACROSS ALL WHOLESALE FEEDS")
    print("=" * 65)
    
    result = []
    merged = set()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    for i in range(len(all_tickets)):
        if i in merged:
            continue
        t1 = dict(all_tickets[i])
        id1 = (t1.get("id") or "").lower().strip()
        fno1 = (t1.get("fno") or "").lower().strip()
        sub1 = (t1.get("suburb") or "").lower().strip()
        tok1 = extract_suburb_tokens(t1.get("suburb"))

        for j in range(i + 1, len(all_tickets)):
            if j in merged:
                continue
            t2 = all_tickets[j]
            id2 = (t2.get("id") or "").lower().strip()
            fno2 = (t2.get("fno") or "").lower().strip()
            sub2 = (t2.get("suburb") or "").lower().strip()
            tok2 = extract_suburb_tokens(t2.get("suburb"))

            same_id = bool(id1 and id2 and id1 == id2 and len(id1) > 3)
            id_in_sub = bool((len(id1) >= 8 and id1 in sub2) or (len(id2) >= 8 and id2 in sub1))
            
            has_suburb_match = False
            if fno1 and fno2 and fno1 == fno2 and tok1 and tok2:
                if any(tk in tok2 for tk in tok1):
                    has_suburb_match = True

            if same_id or id_in_sub or has_suburb_match:
                merged.add(j)

                # 1. Prefer official incident ID over generic prefix
                if t2.get("id", "").startswith("INC-") and not t1.get("id", "").startswith("INC-"):
                    t1["id"] = t2["id"]

                # 2. Keep the most detailed Suburb description
                if len(t2.get("suburb", "")) > len(t1.get("suburb", "")) or "zones:" in t2.get("suburb", "").lower():
                    t1["suburb"] = t2["suburb"]

                # 3. Keep specific province over National
                if t1.get("province") == "National" and t2.get("province") != "National":
                    t1["province"] = t2["province"]

                # 4. Status Bucket priority: Acute > Extended > Maintenance > Resolved
                bucket_order = {"ACUTE (<24H)": 4, "EXTENDED (>48H)": 3, "MAINTENANCE": 2, "RESOLVED": 1}
                b1 = t1.get("bucket", "").upper()
                b2 = t2.get("bucket", "").upper()
                if bucket_order.get(b2, 0) > bucket_order.get(b1, 0):
                    t1["bucket"] = t2["bucket"]
                    t1["statusDetail"] = t2["statusDetail"]

                # 5. Keep the most informative Customer Impact / Technician ETA
                if len(t2.get("impact", "")) > len(t1.get("impact", "")) or "line(s) down" in t2.get("impact", "").lower():
                    t1["impact"] = t2["impact"]

                # 6. Combine Feed Sources
                src2 = t2.get("source", "")
                if src2 and src2 not in t1.get("source", ""):
                    t1["source"] = f"{t1.get('source', '')} + {src2}"

        result.append(t1)

    print(f"  Consolidated {len(all_tickets)} raw notices down to {len(result)} unique master outages!")
    
    # Format into standard 11-column rows for Dashboard, SQLite, and Google Sheets
    final_rows = []
    for t in result:
        m_id = t["id"]
        fno = t["fno"]
        prov = t["province"]
        suburb = t["suburb"]
        bucket = t["bucket"]
        detail = t["statusDetail"]
        impact = t["impact"]
        started = t["startedAt"]
        source = t["source"]
        
        act = "Advise customer to power-cycle ONT and Router for 2 mins." if bucket == "RESOLVED" else f"Inform customer of FNO Ref & ETA ({impact}). Link case to Master Ref — do NOT book tech callout."
        macro = f"[082 1904 OUTAGE] FNO: {fno} | Ref: {m_id} | Area: {suburb} ({prov}) | Status: {detail} | ETA & Update: {impact} | Started: {started} | Action: {act}"
        
        final_rows.append([
            m_id, fno, prov, suburb, bucket, detail, impact, started, now_str, macro, source
        ])

    return final_rows

# -------------------------------------------------------------
# MAIN ORCHESTRATOR & DATABASE BUILDER
# -------------------------------------------------------------

def main():
    start_time = time.time()
    
    # 1. Scrape Vuma B2B
    vuma_incidents, vuma_rows = scrape_vuma_b2b()
    vuma_dict_tickets = []
    for r in vuma_rows:
        vuma_dict_tickets.append({
            "id": r[0], "fno": r[1], "province": r[2], "suburb": r[3], "bucket": r[4],
            "statusDetail": r[5], "impact": r[6], "startedAt": r[7], "source": r[10]
        })

    # 2. Scrape Public Wholesale FNO Portals
    cool_tickets = scrape_cool_ideas()
    vox_tickets = scrape_vox()
    afri_octo_tickets = scrape_afrihost_and_octotel()

    # Prioritize Vuma B2B first, then public feeds
    raw_combined = vuma_dict_tickets + cool_tickets + vox_tickets + afri_octo_tickets
    
    # 3. Deduplicate
    all_rows = consolidate_tickets(raw_combined)

    # 4. Save to JSON
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S SAST")
    payload = {
        "lastUpdated": now_str,
        "totalOutages": len(all_rows),
        "activeCount": len([r for r in all_rows if "RESOLVED" not in str(r[4]).upper()]),
        "vumaIncidents": vuma_incidents,
        "rows": all_rows
    }
    
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[DONE] Saved {len(all_rows)} live outages to {OUT_JSON} ({OUT_JSON.stat().st_size} bytes)")

    # 5. Save to Persistent SQLite Database
    try:
        conn = sqlite3.connect(str(OUT_DB))
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS outages (
            id TEXT PRIMARY KEY,
            fno TEXT,
            province TEXT,
            suburb TEXT,
            bucket TEXT,
            status_detail TEXT,
            impact TEXT,
            started_at TEXT,
            polled_at TEXT,
            macro_flag TEXT,
            source TEXT
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )''')
        c.execute("INSERT OR REPLACE INTO metadata VALUES ('last_updated', ?)", (now_str,))
        c.execute("INSERT OR REPLACE INTO metadata VALUES ('total_outages', ?)", (str(len(all_rows)),))
        c.execute("INSERT OR REPLACE INTO metadata VALUES ('active_count', ?)", (str(payload['activeCount']),))
        
        # Clear previous records to match exact fresh consolidated state
        c.execute("DELETE FROM outages")
        for r in all_rows:
            if len(r) >= 11:
                c.execute('''INSERT OR REPLACE INTO outages VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
                    r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10]
                ))
        conn.commit()
        conn.close()
        print(f"[DONE] Saved persistent SQLite Edge DB to {OUT_DB} ({OUT_DB.stat().st_size} bytes)")
    except Exception as dbe:
        print(f"[Notice] SQLite Edge DB save notice: {dbe}")

    print(f"\nElapsed execution time: {round(time.time() - start_time, 2)}s\n")

if __name__ == "__main__":
    main()
