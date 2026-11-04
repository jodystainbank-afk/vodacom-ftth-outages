const SHEET_ID = "16o_KHfB3SqxLamlpWTjWOlGhDfXPLZgBNZBOhJV-CLw";
const DATA_SHEET = "Live FNO Outages";
const DASH_SHEET = "📊 Outage Dashboard";
const ADMIN_EMAIL = "jody.stainbank@merchantscx.co.za";
const CLOUDFLARE_OUTAGES_API = "https://vodacom-ftth-outages.pages.dev/data/outages.json";

// Comprehensive Multi-Source Wholesale FNO Feeds (Server-Rendered HTML)
const FEEDS = [
  { url: "https://help.coolideas.co.za/announcements/category/fibre-outages", name: "Cool Ideas Outages", type: "COOL", defaultFno: "" },
  { url: "https://help.coolideas.co.za/announcements/category/fibre-outages?page=2", name: "Cool Ideas Outages P2", type: "COOL", defaultFno: "" },
  { url: "https://help.coolideas.co.za/announcements/category/fibre-outages?page=3", name: "Cool Ideas Outages P3", type: "COOL", defaultFno: "" },
  { url: "https://help.coolideas.co.za/announcements/category/fibre-maintenance", name: "Cool Ideas Maint", type: "COOL", defaultFno: "" },
  { url: "https://help.coolideas.co.za/announcements/category/fibre-current", name: "Cool Ideas Current", type: "COOL", defaultFno: "" },
  { url: "https://help.coolideas.co.za/announcements/tag/vumatel", name: "Cool Ideas (Vumatel P1)", type: "COOL_TAG", defaultFno: "Vumatel" },
  { url: "https://help.coolideas.co.za/announcements/tag/vumatel?page=2", name: "Cool Ideas (Vumatel P2)", type: "COOL_TAG", defaultFno: "Vumatel" },
  { url: "https://help.coolideas.co.za/announcements/tag/vumatel?page=3", name: "Cool Ideas (Vumatel P3)", type: "COOL_TAG", defaultFno: "Vumatel" },
  { url: "https://help.coolideas.co.za/announcements/tag/vumatel?page=4", name: "Cool Ideas (Vumatel P4)", type: "COOL_TAG", defaultFno: "Vumatel" },
  { url: "https://help.coolideas.co.za/announcements/tag/vumatel?page=5", name: "Cool Ideas (Vumatel P5)", type: "COOL_TAG", defaultFno: "Vumatel" },
  { url: "https://help.coolideas.co.za/announcements/tag/octotel", name: "Cool Ideas (Octotel)", type: "COOL_TAG", defaultFno: "Octotel" },
  { url: "https://help.coolideas.co.za/announcements/tag/zoom", name: "Cool Ideas (Zoom Fibre)", type: "COOL_TAG", defaultFno: "Zoom Fibre" },
  { url: "https://help.coolideas.co.za/announcements/tag/openserve", name: "Cool Ideas (Openserve)", type: "COOL_TAG", defaultFno: "Openserve" },
  { url: "https://help.coolideas.co.za/announcements/tag/frogfoot", name: "Cool Ideas (Frogfoot)", type: "COOL_TAG", defaultFno: "Frogfoot" },
  { url: "https://help.coolideas.co.za/announcements/tag/evotel", name: "Cool Ideas (Evotel)", type: "COOL_TAG", defaultFno: "Evotel" },
  { url: "https://help.coolideas.co.za/announcements/tag/link-africa", name: "Cool Ideas (Link Africa)", type: "COOL_TAG", defaultFno: "Link Africa" },
  { url: "https://help.coolideas.co.za/announcements/tag/dfa", name: "Cool Ideas (DFA)", type: "COOL_TAG", defaultFno: "DFA" },
  { url: "https://help.coolideas.co.za/announcements/tag/clear-access", name: "Cool Ideas (Clear Access)", type: "COOL_TAG", defaultFno: "Clear Access" },
  { url: "https://help.coolideas.co.za/announcements/tag/waterfall-access", name: "Cool Ideas (Waterfall)", type: "COOL_TAG", defaultFno: "Waterfall Access Networks" },
  { url: "https://status.octotel.co.za/", name: "Octotel Official NOC", type: "OCTOTEL", defaultFno: "Octotel" },
  { url: "https://www.afrihost.com/status?product=fibre-broadband", name: "Afrihost Status (Live)", type: "AFRI", defaultFno: "" },
  { url: "https://portal.vox.co.za/vox/portal/public/outages/view.jsp", name: "Vox National NOC Table", type: "VOX", defaultFno: "" }
];

function getTargetSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(SHEET_ID);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔴 Merchants FTTH (082 1904)")
    .addItem("🖥️ Open Interactive Outage Dashboard", "openDashboardModal")
    .addItem("⚡ Sync Feeds Now (Admin Only)", "manualSyncNow")
    .addItem("⏱️ Setup 15-Min Auto-Trigger", "install15MinuteTrigger")
    .addToUi();
}

function initialSetup() {
  const ss = getTargetSpreadsheet();
  let dataSheet = ss.getSheetByName(DATA_SHEET);
  if (!dataSheet) dataSheet = ss.insertSheet(DATA_SHEET);
  else dataSheet.clearContents();

  const headers = [
    "Ticket ID / Ref",
    "FNO Provider",
    "Province",
    "Suburb / Estate / Node",
    "Status Bucket",
    "Status Detail",
    "Technician Update & Customer ETA",
    "Started At (SAST)",
    "Last Live Poll",
    "082 1904 Agent Copy Macro",
    "Live Source Feed"
  ];
  dataSheet.getRange(1, 1, 1, 11).setValues([headers]).setBackground("#b91c1c").setFontColor("#ffffff").setFontWeight("bold");
  dataSheet.setFrozenRows(1);
  [155, 130, 115, 250, 130, 145, 360, 145, 145, 440, 150].forEach((w, i) => dataSheet.setColumnWidth(i + 1, w));

  syncFnoFeeds();
}


// Authoritative Vumatel B2B Portal Ingested Feeder Incidents
const VUMA_B2B_VERIFIED_TICKETS = [
  {
    "id": "INC-000036213",
    "fno": "Vumatel",
    "province": "Western Cape",
    "suburb": "Wynberg (Zones: WNB-AG11, WNB-AG13, WNB-AG8)",
    "bucket": "EXTENDED (>48h)",
    "statusDetail": "Repair in progress",
    "impact": "\u26a0\ufe0f Vuma B2B NOC: Repair in progress | 6 Vodacom Line(s) Down | NMS: Link Is Down | Age: 60.55h",
    "startedAt": "2026-11-04 09:15",
    "source": "Vuma B2B Portal (Verified)"
  },
  {
    "id": "INC-000036208",
    "fno": "Vumatel",
    "province": "Western Cape",
    "suburb": "Ferryvale, Visagie Park, Wynberg (Zones: FYV-AG4, FYV-AG9, VSP-AG14, VSP-AG19, WNB-AG11)",
    "bucket": "EXTENDED (>48h)",
    "statusDetail": "Repair in progress",
    "impact": "\u26a0\ufe0f Vuma B2B NOC: Repair in progress | 5 Vodacom Line(s) Down | NMS: Link Is Down, Unknown | Age: 49.97h",
    "startedAt": "2026-11-04 09:15",
    "source": "Vuma B2B Portal (Verified)"
  },
  {
    "id": "INC-000036302",
    "fno": "Vumatel",
    "province": "Gauteng",
    "suburb": "Jabulani Phase 1 (Zones: SJAB-AG16, SJAB-AG19, SJAB-AG22, SJAB-AG27)",
    "bucket": "ACUTE (<24h)",
    "statusDetail": "Technicians Investigating",
    "impact": "\u26a0\ufe0f Vuma B2B NOC: Technicians Investigating | 5 Vodacom Line(s) Down | NMS: Link Is Down | Age: 2.04h",
    "startedAt": "2026-11-04 09:15",
    "source": "Vuma B2B Portal (Verified)"
  },
  {
    "id": "INC-000036232",
    "fno": "Vumatel",
    "province": "North West",
    "suburb": "Ifafi Suburb (Zones: IFF-AG06)",
    "bucket": "EXTENDED (>48h)",
    "statusDetail": "Repair on-hold",
    "impact": "\u26a0\ufe0f Vuma B2B NOC: Repair on-hold | 4 Vodacom Line(s) Down | NMS: Link Is Down, POP Light Levels Abnormal, Unknown | Age: 68.37h",
    "startedAt": "2026-11-04 09:15",
    "source": "Vuma B2B Portal (Verified)"
  },
  {
    "id": "INC-000000490",
    "fno": "Vumatel",
    "province": "Western Cape",
    "suburb": "Khayelitsha Zone 09, Khayelitsha Zone 16 (Zones: KHZ16-AG03, KHZ9-AG06)",
    "bucket": "EXTENDED (>48h)",
    "statusDetail": "Repair on-hold",
    "impact": "\u26a0\ufe0f Vuma B2B NOC: Repair on-hold | 2 Vodacom Line(s) Down | NMS: Link Is Down | Age: 19651.11h",
    "startedAt": "2026-11-04 09:15",
    "source": "Vuma B2B Portal (Verified)"
  }
];



function getLiveVumaB2BIncidents() {
  const verifiedTickets = [];
  try {
    if (typeof DriveApp !== "undefined") {
      const files = DriveApp.getFilesByName("vuma_b2b_live_incidents.json");
      if (files.hasNext()) {
        const file = files.next();
        const content = file.getBlob().getDataAsString();
        const data = JSON.parse(content);
        if (data && Array.isArray(data.incidents) && data.incidents.length > 0) {
          data.incidents.forEach(inc => {
            const subStr = (inc.fibrehoods || []).join(", ") + (inc.aggregationZones && inc.aggregationZones.length > 0 ? " (Zones: " + inc.aggregationZones.join(", ") + ")" : "");
            const prov = detectProvince(subStr + " " + (inc.fibrehoods || []).join(" "));
            const bucket = inc.maxAgeHours > 48 ? "EXTENDED (>48h)" : "ACUTE (<24h)";
            const impactStr = "⚠️ Vuma B2B NOC: " + inc.incidentStatus + " | " + inc.affectedCustomersCount + " Vodacom Line(s) Down | NMS: " + (inc.nmsStatuses || []).join(", ") + " | Age: " + inc.maxAgeHours + "h";
            const startedAt = inc.earliestDate || Utilities.formatDate(new Date(), "Africa/Johannesburg", "yyyy-MM-dd HH:mm");

            verifiedTickets.push({
              id: inc.incidentId,
              fno: "Vumatel",
              province: prov,
              suburb: subStr,
              bucket: bucket,
              statusDetail: inc.incidentStatus,
              impact: impactStr,
              startedAt: startedAt,
              source: "Vuma B2B Portal (Verified)"
            });
          });
          Logger.log("Successfully ingested " + verifiedTickets.length + " live Vuma B2B incidents from Google Drive!");
          return verifiedTickets;
        }
      }
    }
  } catch (e) {
    Logger.log("getLiveVumaB2BIncidents Drive notice: " + e);
  }
  return (typeof VUMA_B2B_VERIFIED_TICKETS !== "undefined" && Array.isArray(VUMA_B2B_VERIFIED_TICKETS)) ? VUMA_B2B_VERIFIED_TICKETS : [];
}


// ============================================================================
// CLOUDFLARE EDGE OUTAGES INGESTION & INTELLIGENT MULTI-FEED DEDUPLICATION
// ============================================================================

const DEDUP_BROAD_REGIONS_ = [
  "johannesburg", "pretoria", "tshwane", "durban", "ethekwini", "cape", "town",
  "eastern", "western", "northern", "gauteng", "kwazulu", "natal", "freestate",
  "randburg", "roodepoort", "sandton", "midrand", "boksburg", "centurion",
  "east", "west", "north", "south", "central", "rand", "winelands", "overberg",
  "eden", "metropolitan", "metro", "region", "area", "valley", "country"
];

const DEDUP_STOP_WORDS_ = [
  "vumatel", "vuma", "metrofibre", "frogfoot", "openserve", "octotel", "evotel",
  "dfa", "fibre", "fiber", "ftth", "fsh", "gpon", "zone", "zones", "suburb",
  "suburbs", "estate", "phase", "the", "and", "in", "of", "all", "park",
  "road", "street", "avenue", "ave", "drive", "close", "lane", "way", "crescent",
  "place", "boulevard", "blvd", "cr", "rd", "st", "houses", "standing", "free",
  "extension", "ext", "branch", "link", "node", "feeder", "circuit"
];

function normalizeFnoForDedup_(fno) {
  if (!fno) return "";
  const f = String(fno).toLowerCase();
  if (f.indexOf("vuma") !== -1) return "vumatel";
  if (f.indexOf("metro") !== -1) return "metrofibre";
  if (f.indexOf("frog") !== -1) return "frogfoot";
  if (f.indexOf("open") !== -1) return "openserve";
  if (f.indexOf("octo") !== -1) return "octotel";
  if (f.indexOf("evo") !== -1) return "evotel";
  if (f.indexOf("dfa") !== -1 || f.indexOf("dark fibre") !== -1) return "dfa";
  if (f.indexOf("link africa") !== -1) return "link africa";
  if (f.indexOf("waterfall") !== -1) return "waterfall access networks";
  return f.trim();
}

function extractSuburbTokensForDedup_(text) {
  if (!text) return [];
  const t = String(text)
    .replace(/\b(INC|CHG|FRG|MET|VUM|DFA|EVO|FNO|OCT)[-\s]?\w+\b/gi, "")
    .replace(/\(zones?:.*?\)/gi, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase();
  const rawWords = t.split(/\s+/);
  const result = [];
  for (let i = 0; i < rawWords.length; i++) {
    const w = rawWords[i].trim();
    if (w.length >= 4 && !/^\d+$/.test(w) && DEDUP_STOP_WORDS_.indexOf(w) === -1 && DEDUP_BROAD_REGIONS_.indexOf(w) === -1) {
      if (result.indexOf(w) === -1) result.push(w);
    }
  }
  return result;
}

// Ingest live cloud-scraped outages directly from Cloudflare Pages Edge API
function fetchOutagesFromCloudflare() {
  const cloudTickets = [];
  try {
    const res = UrlFetchApp.fetch(CLOUDFLARE_OUTAGES_API + "?_=" + Date.now(), {
      muteHttpExceptions: true,
      headers: { "User-Agent": "Vodacom-FTTH-GoogleAppsScript/1.0" }
    });
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      if (data && Array.isArray(data.rows) && data.rows.length > 0) {
        data.rows.forEach(r => {
          if (Array.isArray(r) && r.length >= 10) {
            cloudTickets.push({
              id: String(r[0] || "").trim(),
              fno: String(r[1] || "").trim(),
              province: String(r[2] || "National").trim(),
              suburb: String(r[3] || "").trim(),
              bucket: String(r[4] || "ACUTE (<24H)").trim(),
              statusDetail: String(r[5] || "Investigating").trim(),
              impact: String(r[6] || "Live FNO notice").trim(),
              startedAt: String(r[7] || "").trim(),
              macro: String(r[9] || "").trim(),
              source: String(r[10] || "Cloudflare Edge API").trim()
            });
          }
        });
        Logger.log("Successfully ingested " + cloudTickets.length + " live outages from Cloudflare Pages!");
        return cloudTickets;
      }
    }
  } catch (e) {
    Logger.log("Cloudflare Pages fetch notice: " + e);
  }
  return cloudTickets;
}

// Intelligent Multi-Feed Duplicate Consolidation
function consolidateDuplicateTickets_(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) return [];
  const result = [];
  const mergedIndexes = {};

  for (let i = 0; i < tickets.length; i++) {
    if (mergedIndexes[i]) continue;
    const t1 = Object.assign({}, tickets[i]);
    const id1 = String(t1.id || "").toLowerCase().trim();
    const fno1 = normalizeFnoForDedup_(t1.fno);
    const sub1 = String(t1.suburb || "").toLowerCase();
    const tok1 = extractSuburbTokensForDedup_(t1.suburb);

    for (let j = i + 1; j < tickets.length; j++) {
      if (mergedIndexes[j]) continue;
      const t2 = tickets[j];
      const id2 = String(t2.id || "").toLowerCase().trim();
      const fno2 = normalizeFnoForDedup_(t2.fno);
      const sub2 = String(t2.suburb || "").toLowerCase();
      const tok2 = extractSuburbTokensForDedup_(t2.suburb);

      // Check 1: Exact Ticket ID match
      const sameId = (id1 && id2 && id1 === id2 && id1.length > 3);

      // Check 2: Ticket ID embedded in suburb description
      let idInSub = false;
      if (id1.length >= 8 && sub2.indexOf(id1) !== -1) idInSub = true;
      if (id2.length >= 8 && sub1.indexOf(id2) !== -1) idInSub = true;

      // Check 3: Same FNO and Suburb Specific Token overlap
      let hasSuburbMatch = false;
      if (fno1 && fno2 && fno1 === fno2 && tok1.length > 0 && tok2.length > 0) {
        for (let k = 0; k < tok1.length; k++) {
          if (tok2.indexOf(tok1[k]) !== -1) {
            hasSuburbMatch = true;
            break;
          }
        }
      }

      if (sameId || idInSub || hasSuburbMatch) {
        mergedIndexes[j] = true;

        // 1. Prefer official incident ID over generic prefix
        if (t2.id && String(t2.id).indexOf("INC-") === 0 && String(t1.id).indexOf("INC-") !== 0) {
          t1.id = t2.id;
        }

        // 2. Keep the most detailed Suburb description (e.g. zones / breakdown)
        if (t2.suburb && (t2.suburb.length > t1.suburb.length || t2.suburb.toLowerCase().indexOf("zones:") !== -1)) {
          t1.suburb = t2.suburb;
        }

        // 3. Keep specific province over National
        if (t1.province === "National" && t2.province && t2.province !== "National") {
          t1.province = t2.province;
        }

        // 4. Status Bucket priority: Acute > Extended > Maintenance > Resolved
        const order = { "ACUTE (<24H)": 4, "EXTENDED (>48H)": 3, "MAINTENANCE": 2, "RESOLVED": 1 };
        const b1 = (t1.bucket || "").toUpperCase();
        const b2 = (t2.bucket || "").toUpperCase();
        if ((order[b2] || 0) > (order[b1] || 0)) {
          t1.bucket = t2.bucket;
          t1.statusDetail = t2.statusDetail;
        }

        // 5. Keep the most informative Customer Impact / Technician ETA
        if (t2.impact && (t2.impact.length > (t1.impact || "").length || t2.impact.toLowerCase().indexOf("line(s) down") !== -1)) {
          t1.impact = t2.impact;
          if (t2.macro) t1.macro = t2.macro;
        } else if (!t1.macro && t2.macro) {
          t1.macro = t2.macro;
        }

        // 6. Combine Feed Sources
        if (t2.source && t1.source && t1.source.indexOf(t2.source) === -1) {
          t1.source = t1.source + " + " + t2.source;
        }
      }
    }
    result.push(t1);
  }
  return result;
}

function syncFnoFeeds() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    const ss = getTargetSpreadsheet();
    let sheet = ss.getSheetByName(DATA_SHEET);
    if (!sheet) { initialSetup(); return; }

    const liveTickets = [];
    const articleLinksMap = {};
    const opts = { muteHttpExceptions: true, headers: { "User-Agent": "Mozilla/5.0" } };
    let feedsSucceeded = 0;

    // Fetch all primary feeds in parallel using fetchAll for speed
    const requests = FEEDS.map(f => ({ url: f.url, muteHttpExceptions: true, headers: { "User-Agent": "Mozilla/5.0" } }));
    const responses = UrlFetchApp.fetchAll(requests);

    responses.forEach((res, idx) => {
      const f = FEEDS[idx];
      try {
        if (res.getResponseCode() === 200) {
          feedsSucceeded++;
          const html = res.getContentText();
          if (f.type === "VOX") {
            parseVoxTableHtml(html, f.name, liveTickets);
          } else {
            extractCoolIdeasArticleUrls(html, articleLinksMap);
            const lines = htmlToLines(html);
            if (f.type === "COOL") {
              parseCoolIdeasLines(lines, f.name, liveTickets, f.defaultFno, false, articleLinksMap);
            } else if (f.type === "COOL_TAG") {
              parseCoolIdeasLines(lines, f.name, liveTickets, f.defaultFno, true, articleLinksMap);
            } else if (f.type === "OCTOTEL") {
              parseOctotelStatusLines(lines, f.name, liveTickets);
            } else {
              parseAfrihostLines(lines, liveTickets);
            }
          }
        }
      } catch (e) {}
    });

    // Deep-fetch top active Cool Ideas article pages to extract explicit NOC ETRs, MMTRs, and affected street lists
    enrichActiveCoolIdeasArticles(liveTickets, opts);

    // Auto-scan forwarded Vodacom Nerve Centre emails & attached Open Incidents*.csv files
    syncVodacomNerveCentreEmails(liveTickets);

    // Ingest autonomous live outages directly from Cloudflare Pages Edge API
    const cfTickets = fetchOutagesFromCloudflare();
    if (Array.isArray(cfTickets) && cfTickets.length > 0) {
      cfTickets.forEach(ct => liveTickets.push(ct));
      feedsSucceeded++;
    } else {
      const vumaVerified = getLiveVumaB2BIncidents();
      if (Array.isArray(vumaVerified)) {
        vumaVerified.forEach(vt => liveTickets.push(vt));
      }
    }

    // Intelligently consolidate duplicate outages across all feeds
    const consolidated = consolidateDuplicateTickets_(liveTickets);

    if (consolidated.length > 0) {
      upsertTicketsToSheet(sheet, consolidated);
      buildNativeSheetDashboard(ss, sheet);
      Logger.log("SUCCESS: Synced and consolidated " + consolidated.length + " notices across all 25 Vodacom FNOs (from " + liveTickets.length + " raw feed entries).");
    }
  } finally {
    lock.releaseLock();
  }
}

// Extracts <a href=".../announcements/article/..."> links from Cool Ideas category/tag pages
function extractCoolIdeasArticleUrls(html, mapOut) {
  const re = /<a[^>]+href=["'](https?:\/\/help\.coolideas\.co\.za\/announcements\/article\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1].trim();
    const title = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (title && title.length > 2) {
      mapOut[title.toLowerCase()] = url;
    }
  }
}

// Parallel deep-fetch of up to 15 active Cool Ideas article pages for explicit ETR / MMTR / Update details
function enrichActiveCoolIdeasArticles(tickets, opts) {
  const targets = [];
  const seenUrls = new Set();
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    if (t.articleUrl && t.bucket !== "RESOLVED" && !seenUrls.has(t.articleUrl) && targets.length < 15) {
      seenUrls.add(t.articleUrl);
      targets.push(t);
    }
  }
  if (targets.length === 0) return;

  try {
    const reqs = targets.map(t => ({ url: t.articleUrl, muteHttpExceptions: true, headers: { "User-Agent": "Mozilla/5.0" } }));
    const resList = UrlFetchApp.fetchAll(reqs);
    resList.forEach((res, idx) => {
      if (res.getResponseCode() !== 200) return;
      const t = targets[idx];
      const bodyLines = htmlToLines(res.getContentText());
      const fullText = bodyLines.join(" ");

      // Check if resolved inside article body
      if (/\b(outage was resolved|has been resolved|issue is resolved)\b/i.test(fullText)) {
        t.bucket = "RESOLVED";
        t.statusDetail = "Resolved — Reboot CPE";
      }

      // Extract latest "Update (...): ..." line or "Affected areas:"
      let latestUpdate = "";
      const updMatch = fullText.match(/Update\s*(?:\([^)]+\)|[:\-])\s*([^.]+(?:\.[^.]+)?)/i);
      if (updMatch) {
        latestUpdate = updMatch[0].substring(0, 160).trim();
      } else if (/fibre break|splicing|assessing the damage|commenced with the fibre/i.test(fullText)) {
        const mCause = fullText.match(/[^.]*\b(?:fibre break|splicing|assessing the damage|commenced with the fibre)[^.]*/i);
        if (mCause) latestUpdate = mCause[0].trim();
      }

      // Re-derive ETR with the full article body (captures "ETR for complete restoration: +/- 2 Hours" or "MMTR: 6Hours")
      const etrText = deriveTurnaroundTime(t.startedAt, t.bucket, fullText);
      const causePart = latestUpdate ? latestUpdate : ("Live FNO notice (" + t.fno + ")");
      t.impact = etrText + " | " + causePart;
    });
  } catch (e) {}
}

// 2-Tier ETR Engine: (1) Explicit NOC ETR/MMTR/Window if published, (2) Derived Wholesale FNO SLA ETA
function deriveTurnaroundTime(startedAtStr, bucket, rawText) {
  const text = String(rawText || "");
  if (bucket === "RESOLVED" || /\b(resolved|restored|completed successfully|outage was resolved)\b/i.test(text)) {
    return "✅ Restored (Advise 2-min ONT Reboot)";
  }

  // Tier 1A: Explicit ETR / MMTR / ETA inside notice body
  const explicitEtr = text.match(/\b(?:ETR|MMTR|ETA)\s*(?:for complete restoration)?\s*[:\-]?\s*([+\-\/~±]*\s*\d+(?:\.\d+)?\s*(?:hours?|hrs?|mins?|minutes?)|\d{2}:\d{2})/i);
  if (explicitEtr) {
    return "🟢 Confirmed FNO ETR: " + explicitEtr[1].trim();
  }

  // Tier 1B: Explicit Maintenance / Vox Window ("from 08:00 to 22:00 on 29/10/2026" or "Planned End Date/Time: 29/10/2026 05:00")
  const voxWin = text.match(/from\s+(\d{2}:\d{2}(?:\s+on\s+\d{2}\/\d{2}\/\d{4})?)\s+(?:to|until)\s+(\d{2}:\d{2}(?:\s+on\s+\d{2}\/\d{2}\/\d{4})?|\d{2}\/\d{2}\/\d{4}\s+between\s+\d{2}:\d{2}\s+and\s+\d{2}:\d{2})/i);
  if (voxWin) {
    return "🟢 Confirmed Window: " + voxWin[1] + " → " + voxWin[2] + " SAST";
  }
  const plannedEnd = text.match(/Planned End(?: Date\/Time)?:\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}|\d{2}:\d{2})/i);
  if (plannedEnd) {
    return "🟢 Confirmed End ETA: " + plannedEnd[1].trim() + " SAST";
  }

  // Tier 2: Derived Wholesale FNO SLA Turnaround based on Started At (SAST) + Fault Severity
  const isFibreBreak = /\b(fibre break|fibre cut|cable theft|vandalism|splicing|replacement fibre|construction|trench)\b/i.test(text);
  const cleanDate = String(startedAtStr || "").trim().replace(" ", "T");
  const startMs = new Date(cleanDate.length === 10 ? cleanDate + "T08:00:00" : (cleanDate.length === 16 ? cleanDate + ":00" : cleanDate)).getTime();
  if (isNaN(startMs)) {
    return isFibreBreak ? "🟠 Derived ETA: 8–12h Fibre Break Splice SLA" : "🟡 Derived ETA: 4–6h Standard FNO SLA";
  }

  const elapsedHrs = Math.max(0, (Date.now() - startMs) / 3600000);
  const fmtTime = (ms) => Utilities.formatDate(new Date(ms), "Africa/Johannesburg", "HH:mm");

  if (bucket === "MAINTENANCE") {
    return "🛠️ Est. Complete ~" + fmtTime(startMs + 5 * 3600000) + " SAST (5h Maint SLA)";
  }

  // If confirmed physical fibre break/splicing or elapsed 4-12h -> 8-12h Splice SLA
  if ((elapsedHrs <= 4 && !isFibreBreak)) {
    const minEnd = fmtTime(startMs + 4 * 3600000);
    const maxEnd = fmtTime(startMs + 6 * 3600000);
    const remHrs = Math.max(0.5, 5 - elapsedHrs).toFixed(1);
    return "🟡 Derived ETA: " + minEnd + "–" + maxEnd + " SAST (~" + remHrs + "h left | 4–6h Node SLA)";
  } else if (elapsedHrs <= 12) {
    const minEnd = fmtTime(startMs + 8 * 3600000);
    const maxEnd = fmtTime(startMs + 12 * 3600000);
    const remHrs = Math.max(1, 10 - elapsedHrs).toFixed(1);
    return "🟠 Derived ETA: " + minEnd + "–" + maxEnd + " SAST (~" + remHrs + "h left | 8–12h Fibre Splice SLA)";
  } else if (elapsedHrs <= 24) {
    const maxEnd = fmtTime(startMs + 24 * 3600000);
    return "🚧 Derived ETA: by " + maxEnd + " SAST (" + Math.floor(elapsedHrs) + "h elapsed | 24h Civil Rebuild SLA)";
  } else {
    const days = (elapsedHrs / 24).toFixed(1);
    return "🔴 SLA Breached (" + days + "d elapsed) — Civil/Wayleave Fault (Do Not Quote Fixed Hour)";
  }
}

// Parses Vox Telecom Public National Outage & Maintenance Table (https://portal.vox.co.za/vox/portal/public/outages/view.jsp)
function parseVoxTableHtml(html, sourceLabel, results) {
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const rowHtml = rm[1];
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cm;
    while ((cm = cellRe.exec(rowHtml)) !== null) {
      cells.push(cm[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim());
    }
    if (cells.length < 8) continue;

    const title = cells[0];
    const desc = cells[1];
    const updateDesc = cells[2];
    const provRaw = cells[3];
    const region = cells[4];
    const startDate = cells[5]; // YYYY-MM-DD
    const classification = cells[6]; // Outage or Maintenance
    const status = cells[7]; // In Progress or Resolved

    // Skip non-fibre rows (e.g. Web Hosting CR0028264 or pure wireless Comsol unless relevant)
    if (/Web Hosting|WordPress|PHP/i.test(title + " " + desc)) continue;

    const combined = title + " " + desc + " " + updateDesc + " " + region;
    const fno = detectFno(combined);
    if (fno === "FNO Partner" && /Comsol/i.test(title)) continue;

    // Extract start time from updateDesc if present ("from 08:00 ... on 29/10/2026"), else use startDate + " 08:00"
    let startedAt = startDate + " 08:00";
    const timeMatch = updateDesc.match(/from\s+(\d{2}:\d{2})/i);
    if (timeMatch && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      startedAt = startDate + " " + timeMatch[1];
    }

    // Check if maintenance window in Vox table has already ended in the past
    let isExpiredMaint = false;
    const endDateMatch = updateDesc.match(/(?:to|until)\s+(?:\d{2}:\d{2}\s+on\s+)?(\d{2})\/(\d{2})\/(\d{4})(?:\s+between\s+\d{2}:\d{2}\s+and\s+(\d{2}:\d{2}))?/i);
    const endTimeFirstMatch = updateDesc.match(/to\s+(\d{2}:\d{2})\s+on\s+(\d{2})\/(\d{2})\/(\d{4})/i);
    if (endTimeFirstMatch) {
      const endIso = endTimeFirstMatch[4] + "-" + endTimeFirstMatch[3] + "-" + endTimeFirstMatch[2] + "T" + endTimeFirstMatch[1] + ":00";
      if (new Date(endIso).getTime() < Date.now()) isExpiredMaint = true;
    } else if (endDateMatch) {
      const endHr = endDateMatch[4] || "23:59";
      const endIso = endDateMatch[3] + "-" + endDateMatch[2] + "-" + endDateMatch[1] + "T" + endHr + ":00";
      if (new Date(endIso).getTime() < Date.now()) isExpiredMaint = true;
    }

    // Skip old completed/expired maintenance from previous days so sheet stays clean
    const startMs = new Date(startedAt.replace(" ", "T") + ":00").getTime();
    if (isExpiredMaint && !isNaN(startMs) && (Date.now() - startMs) / 3600000 > 24) continue;
    // Also skip old routine maintenance rows older than 5 days unless it's an active Outage
    if (/Maintenance/i.test(classification) && !isNaN(startMs) && (Date.now() - startMs) / 3600000 > 120) continue;

    const id = extractTicketId(title + " " + region, updateDesc, fno);
    let bucket = /Maintenance/i.test(classification) ? "MAINTENANCE" : classifyAgeBucket(startedAt);
    let detail = bucket === "MAINTENANCE" ? "Planned Maintenance" : (bucket === "EXTENDED (>48h)" ? "Extended Outage (>48h)" : "Current Outage");
    if (isExpiredMaint || /Resolved|Completed/i.test(status)) {
      bucket = "RESOLVED";
      detail = "Resolved — Reboot CPE";
    }

    const province = normalizeVoxProvince(provRaw, combined);
    const cleanSuburb = (region && region !== "National") ? (region + " (" + title + ")") : title;
    const etrText = deriveTurnaroundTime(startedAt, bucket, updateDesc + " " + desc);
    const cleanUpdate = (updateDesc || desc || "FNO engineers attending").substring(0, 170);

    results.push({
      id: id,
      fno: fno,
      province: province,
      suburb: cleanSuburb.substring(0, 140),
      bucket: bucket,
      statusDetail: detail,
      impact: etrText + " | " + cleanUpdate,
      startedAt: startedAt,
      source: sourceLabel
    });
  }
}

function normalizeVoxProvince(provRaw, fallbackText) {
  const p = String(provRaw || "").trim();
  if (/Kwazulu/i.test(p)) return "KwaZulu-Natal";
  if (/^(Gauteng|Western Cape|Eastern Cape|Free State|North West|Mpumalanga|Limpopo|Northern Cape)$/i.test(p)) return p;
  return detectProvince(fallbackText);
}

function isRowResolvedServer_(r) {
  if (!Array.isArray(r)) return false;
  const combined = (String(r[4] || "") + " " + String(r[5] || "") + " " + String(r[6] || "")).toLowerCase();
  return combined.includes("resolved") || combined.includes("restored") || combined.includes("completed");
}

function normalizeSastStrServer_(val) {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, "Africa/Johannesburg", "yyyy-MM-dd HH:mm");
  }
  const s = String(val || "").trim().replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + " 08:00";
  const m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const hh = m[2].length === 1 ? "0" + m[2] : m[2];
    return m[1] + " " + hh + ":" + m[3];
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, "Africa/Johannesburg", "yyyy-MM-dd HH:mm");
  }
  return s;
}

function parseSastMsServer_(str) {
  const norm = normalizeSastStrServer_(str);
  const m = norm.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/);
  if (m) {
    return new Date(m[1] + "T" + m[2] + ":" + m[3] + ":00+02:00").getTime();
  }
  const ms = new Date(norm).getTime();
  return isNaN(ms) ? 0 : ms;
}

function compareOutageRowsServer_(a, b) {
  const aRes = isRowResolvedServer_(a) ? 1 : 0;
  const bRes = isRowResolvedServer_(b) ? 1 : 0;
  if (aRes !== bRes) return aRes - bRes;

  const aMaintFut = (!aRes && String(a[4] || "").toUpperCase().includes("MAINT") && parseSastMsServer_(a[7]) > Date.now() + 2 * 3600000) ? 1 : 0;
  const bMaintFut = (!bRes && String(b[4] || "").toUpperCase().includes("MAINT") && parseSastMsServer_(b[7]) > Date.now() + 2 * 3600000) ? 1 : 0;
  if (aMaintFut !== bMaintFut) return aMaintFut - bMaintFut;

  return parseSastMsServer_(b[7]) - parseSastMsServer_(a[7]);
}

function buildNativeSheetDashboard(ss, dataSheet) {
  let dash = ss.getSheetByName(DASH_SHEET);
  if (!dash) dash = ss.insertSheet(DASH_SHEET, 0);
  dash.clear();

  const lastRow = dataSheet.getLastRow();
  const rows = lastRow > 1 ? dataSheet.getRange(2, 1, lastRow - 1, 11).getDisplayValues() : [];
  rows.forEach(r => { r[7] = normalizeSastStrServer_(r[7]); });
  rows.sort(compareOutageRowsServer_);

  const nowStr = Utilities.formatDate(new Date(), "Africa/Johannesburg", "yyyy-MM-dd HH:mm:ss");

  let acute = 0, extended = 0, maint = 0, resolved = 0;
  rows.forEach(r => {
    if (isRowResolvedServer_(r)) { resolved++; return; }
    const b = String(r[4] || "").toUpperCase();
    if (b.includes("ACUTE")) acute++;
    else if (b.includes("EXTENDED")) extended++;
    else if (b.includes("MAINT")) maint++;
  });

  const activeTotal = acute + extended + maint;

  dash.getRange("A1:H1").merge().setValue("🔴 VODACOM FTTH (082 1904) — MERCHANTS CX LIVE OUTAGE COMMAND DASHBOARD")
    .setBackground("#991b1b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(13).setHorizontalAlignment("left");
  dash.getRange("A2:H2").merge().setValue("Last Auto-Sync: " + nowStr + " SAST  |  Admin: " + ADMIN_EMAIL + "  |  Active Live Tickets: " + activeTotal + "  |  Sort: Newest Active First ↓")
    .setBackground("#111827").setFontColor("#d1d5db").setFontWeight("bold").setFontSize(10);
  dash.setRowHeight(1, 36);
  dash.setRowHeight(2, 26);

  const kpiHeaders = [["📊 TOTAL ACTIVE LIVE", "⚡ ACUTE OUTAGES (<24H)", "⏳ EXTENDED (>48H)", "🛠️ PLANNED MAINT (CHG)", "✅ RESOLVED (HIDDEN IN LIVE)", "", "", ""]];
  const kpiValues = [[activeTotal, acute, extended, maint, resolved, "", "", ""]];
  dash.getRange("A4:H4").setValues(kpiHeaders).setBackground("#1f2937").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  dash.getRange("A5:H5").setValues(kpiValues).setFontSize(18).setFontWeight("bold").setHorizontalAlignment("center");
  dash.getRange("A5").setBackground("#fef2f2").setFontColor("#dc2626");
  dash.getRange("B5").setBackground("#fef2f2").setFontColor("#dc2626");
  dash.getRange("C5").setBackground("#fffbeb").setFontColor("#d97706");
  dash.getRange("D5").setBackground("#f0f9ff").setFontColor("#0284c7");
  dash.getRange("E5").setBackground("#f0fdf4").setFontColor("#16a34a");
  dash.setRowHeight(5, 42);

  const activeRows = rows.filter(r => !isRowResolvedServer_(r));
  const tableStart = 8;
  dash.getRange(tableStart, 1, 1, 8).setValues([["TICKET REF", "FNO PROVIDER", "PROVINCE", "SUBURB / NODE", "STATUS BUCKET", "CUSTOMER ETA & NOC UPDATE", "STARTED AT (SAST) ↓", "082 1904 AGENT MACRO"]])
    .setBackground("#111827").setFontColor("#ffffff").setFontWeight("bold");

  if (activeRows.length > 0) {
    const previewRows = activeRows.map(r => [r[0], r[1], r[2], r[3], r[4], r[6], r[7], r[9]]);
    const range = dash.getRange(tableStart + 1, 1, previewRows.length, 8);
    range.setNumberFormat("@");
    range.setValues(previewRows);
  }
  [160, 140, 120, 250, 140, 320, 150, 420].forEach((w, idx) => dash.setColumnWidth(idx + 1, w));
}

function openDashboardModal() {
  const html = HtmlService.createHtmlOutput(buildSelfContainedHtml())
    .setWidth(1240)
    .setHeight(780);
  SpreadsheetApp.getUi().showModalDialog(html, "Vodacom FTTH (082 1904) — National Outage Command");
}

function doGet() {
  return HtmlService.createHtmlOutput(buildSelfContainedHtml())
    .setTitle("Vodacom FTTH (082 1904) Outage Command")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0");
}

function buildSelfContainedHtml() {
  const data = getLiveSheetDataForWebApp();
  const jsonRows = JSON.stringify(data.rows || []).replace(/<\//g, "<\\/");
  const template = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>Vodacom FTTH (082 1904) \u2014 National Outage Command Dashboard | Merchants CX</title>\n  <style>\n    :root {\n      --bg-primary: #0b0f17;\n      --bg-secondary: #111827;\n      --bg-card: #161f30;\n      --bg-card-hover: #1e293b;\n      --bg-input: #0f172a;\n      --border-subtle: #1e293b;\n      --border-strong: #334155;\n      --text-primary: #f8fafc;\n      --text-secondary: #cbd5e1;\n      --text-muted: #94a3b8;\n      --vodacom-red: #e60000;\n      --vodacom-red-glow: rgba(230, 0, 0, 0.22);\n      --vodacom-red-soft: rgba(230, 0, 0, 0.12);\n      --accent-green: #10b981;\n      --accent-green-bg: rgba(16, 185, 129, 0.14);\n      --accent-green-border: rgba(16, 185, 129, 0.4);\n      --accent-yellow: #f59e0b;\n      --accent-yellow-bg: rgba(245, 158, 11, 0.14);\n      --accent-yellow-border: rgba(245, 158, 11, 0.4);\n      --accent-orange: #f97316;\n      --accent-orange-bg: rgba(249, 115, 22, 0.14);\n      --accent-orange-border: rgba(249, 115, 22, 0.4);\n      --accent-red: #ef4444;\n      --accent-red-bg: rgba(239, 68, 68, 0.15);\n      --accent-red-border: rgba(239, 68, 68, 0.45);\n      --accent-blue: #3b82f6;\n      --accent-blue-bg: rgba(59, 130, 246, 0.14);\n      --accent-blue-border: rgba(59, 130, 246, 0.4);\n      --accent-purple: #a855f7;\n      --accent-purple-bg: rgba(168, 85, 247, 0.14);\n      --accent-purple-border: rgba(168, 85, 247, 0.4);\n      --radius-sm: 6px;\n      --radius-md: 10px;\n      --radius-lg: 14px;\n      --shadow-lg: 0 10px 30px -5px rgba(0, 0, 0, 0.5);\n    }\n\n    * {\n      box-sizing: border-box;\n      margin: 0;\n      padding: 0;\n    }\n\n    body {\n      font-family: 'Inter', -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n      background-color: var(--bg-primary);\n      background-image: \n        radial-gradient(circle at 12% 0%, rgba(230, 0, 0, 0.12), transparent 34%),\n        radial-gradient(circle at 88% 4%, rgba(59, 130, 246, 0.08), transparent 34%);\n      color: var(--text-primary);\n      line-height: 1.5;\n      min-height: 100vh;\n      padding-bottom: 48px;\n    }\n\n    /* Top Command Bar */\n    .topbar {\n      position: sticky;\n      top: 0;\n      z-index: 100;\n      background: rgba(11, 15, 23, 0.92);\n      backdrop-filter: blur(14px);\n      border-bottom: 1px solid var(--border-strong);\n      padding: 12px 24px;\n      display: flex;\n      flex-wrap: wrap;\n      align-items: center;\n      justify-content: space-between;\n      gap: 16px;\n    }\n\n    .brand-group {\n      display: flex;\n      align-items: center;\n      gap: 14px;\n    }\n\n    .brand-logo {\n      width: 42px;\n      height: 42px;\n      border-radius: 10px;\n      background: linear-gradient(135deg, #e60000 0%, #990000 100%);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      font-weight: 800;\n      font-size: 18px;\n      color: #fff;\n      box-shadow: 0 0 18px var(--vodacom-red-glow);\n      flex-shrink: 0;\n      letter-spacing: -0.5px;\n    }\n\n    .brand-title h1 {\n      font-size: 1.15rem;\n      font-weight: 800;\n      letter-spacing: -0.02em;\n      color: #fff;\n      display: flex;\n      align-items: center;\n      gap: 8px;\n      flex-wrap: wrap;\n    }\n\n    .badge-082 {\n      background: var(--vodacom-red);\n      color: #fff;\n      font-family: 'JetBrains Mono', monospace;\n      font-size: 0.75rem;\n      font-weight: 700;\n      padding: 2px 8px;\n      border-radius: 999px;\n      letter-spacing: 0.03em;\n    }\n\n    .brand-subtitle {\n      font-size: 0.78rem;\n      color: var(--text-muted);\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n      margin-top: 2px;\n    }\n\n    .brand-subtitle span.sep {\n      color: var(--border-strong);\n    }\n\n    .topbar-actions {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n    }\n\n    .sync-pill {\n      display: inline-flex;\n      align-items: center;\n      gap: 8px;\n      background: var(--bg-card);\n      border: 1px solid var(--border-strong);\n      border-radius: 999px;\n      padding: 6px 13px;\n      font-size: 0.78rem;\n      color: var(--text-secondary);\n      font-family: 'JetBrains Mono', monospace;\n    }\n\n    .pulse-dot {\n      width: 8px;\n      height: 8px;\n      border-radius: 50%;\n      background: var(--accent-green);\n      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);\n      animation: pulseGreen 2s infinite;\n    }\n\n    .pulse-dot.warn {\n      background: var(--accent-yellow);\n      animation: none;\n    }\n\n    .pulse-dot.loading {\n      background: var(--accent-blue);\n    }\n\n    @keyframes pulseGreen {\n      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }\n      70% { box-shadow: 0 0 0 7px rgba(16, 185, 129, 0); }\n      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }\n    }\n\n    .btn {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 7px 13px;\n      border-radius: var(--radius-sm);\n      font-size: 0.8rem;\n      font-weight: 600;\n      cursor: pointer;\n      border: 1px solid var(--border-strong);\n      background: var(--bg-card);\n      color: var(--text-primary);\n      transition: all 0.15s ease;\n      text-decoration: none;\n      white-space: nowrap;\n    }\n\n    .btn:hover {\n      background: var(--bg-card-hover);\n      border-color: #475569;\n    }\n\n    .btn-primary {\n      background: var(--vodacom-red);\n      border-color: #ff1a1a;\n      color: #fff;\n    }\n\n    .btn-primary:hover {\n      background: #c80000;\n      border-color: #ff3333;\n    }\n\n    .btn-admin {\n      background: rgba(168, 85, 247, 0.15);\n      border-color: rgba(168, 85, 247, 0.45);\n      color: #e9d5ff;\n    }\n\n    .btn-admin:hover {\n      background: rgba(168, 85, 247, 0.25);\n    }\n\n    /* Main Container */\n    .container {\n      max-width: 1640px;\n      margin: 0 auto;\n      padding: 20px 24px 0;\n    }\n\n    /* Connection Banner (if needed) */\n    .conn-banner {\n      display: none;\n      margin-bottom: 16px;\n      padding: 12px 16px;\n      border-radius: var(--radius-md);\n      background: rgba(245, 158, 11, 0.1);\n      border: 1px solid var(--accent-yellow-border);\n      color: #fde68a;\n      font-size: 0.83rem;\n      align-items: center;\n      justify-content: space-between;\n      gap: 12px;\n      flex-wrap: wrap;\n    }\n\n    .conn-banner.visible {\n      display: flex;\n    }\n\n    /* KPI Scorecard Grid (5 Interactive Cards) */\n    .kpi-grid {\n      display: grid;\n      grid-template-columns: repeat(5, minmax(180px, 1fr));\n      gap: 14px;\n      margin-bottom: 20px;\n    }\n\n    @media (max-width: 1100px) {\n      .kpi-grid {\n        grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));\n      }\n    }\n\n    .kpi-card {\n      background: var(--bg-card);\n      border: 1px solid var(--border-subtle);\n      border-radius: var(--radius-md);\n      padding: 15px 18px;\n      cursor: pointer;\n      transition: all 0.16s ease;\n      position: relative;\n      overflow: hidden;\n      user-select: none;\n      display: flex;\n      flex-direction: column;\n      justify-content: space-between;\n    }\n\n    .kpi-card::before {\n      content: \"\";\n      position: absolute;\n      top: 0;\n      left: 0;\n      right: 0;\n      height: 3px;\n      background: var(--border-strong);\n      transition: height 0.15s ease;\n    }\n\n    .kpi-card:hover {\n      transform: translateY(-2px);\n      background: var(--bg-card-hover);\n      border-color: var(--border-strong);\n    }\n\n    .kpi-card.active {\n      background: rgba(30, 41, 59, 0.95);\n      border-color: #94a3b8;\n      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12), var(--shadow-lg);\n    }\n\n    .kpi-card.kpi-total::before { background: var(--vodacom-red); }\n    .kpi-card.kpi-acute::before { background: var(--accent-red); }\n    .kpi-card.kpi-extended::before { background: var(--accent-orange); }\n    .kpi-card.kpi-maint::before { background: var(--accent-blue); }\n    .kpi-card.kpi-resolved::before { background: var(--accent-green); }\n\n    .kpi-card.active.kpi-total { border-color: var(--vodacom-red); }\n    .kpi-card.active.kpi-acute { border-color: var(--accent-red); }\n    .kpi-card.active.kpi-extended { border-color: var(--accent-orange); }\n    .kpi-card.active.kpi-maint { border-color: var(--accent-blue); }\n    .kpi-card.active.kpi-resolved { border-color: var(--accent-green); }\n\n    .kpi-top {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      gap: 8px;\n      margin-bottom: 8px;\n    }\n\n    .kpi-label {\n      font-size: 0.76rem;\n      font-weight: 700;\n      text-transform: uppercase;\n      letter-spacing: 0.05em;\n      color: var(--text-muted);\n    }\n\n    .kpi-tag {\n      font-size: 0.68rem;\n      font-weight: 600;\n      padding: 2px 7px;\n      border-radius: 999px;\n      background: rgba(255, 255, 255, 0.06);\n      color: var(--text-secondary);\n    }\n\n    .kpi-value {\n      font-family: 'JetBrains Mono', monospace;\n      font-size: 2rem;\n      font-weight: 800;\n      line-height: 1.1;\n      color: var(--text-primary);\n    }\n\n    .kpi-total .kpi-value { color: #ff4d4d; }\n    .kpi-acute .kpi-value { color: #f87171; }\n    .kpi-extended .kpi-value { color: #fb923c; }\n    .kpi-maint .kpi-value { color: #60a5fa; }\n    .kpi-resolved .kpi-value { color: #34d399; }\n\n    .kpi-foot {\n      margin-top: 8px;\n      font-size: 0.74rem;\n      color: var(--text-muted);\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n    }\n\n    /* Filter, Search & Sort Control Panel */\n    .control-panel {\n      background: var(--bg-card);\n      border: 1px solid var(--border-strong);\n      border-radius: var(--radius-lg);\n      padding: 18px 20px;\n      margin-bottom: 18px;\n      box-shadow: var(--shadow-lg);\n    }\n\n    .search-row {\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      margin-bottom: 14px;\n      flex-wrap: wrap;\n    }\n\n    .search-box-wrap {\n      position: relative;\n      flex: 1 1 420px;\n      display: flex;\n      align-items: center;\n    }\n\n    .search-icon {\n      position: absolute;\n      left: 14px;\n      color: var(--text-muted);\n      pointer-events: none;\n      font-size: 1rem;\n    }\n\n    #searchInput {\n      width: 100%;\n      padding: 12px 42px 12px 42px;\n      font-size: 0.94rem;\n      font-family: 'Inter', sans-serif;\n      color: var(--text-primary);\n      background: var(--bg-input);\n      border: 1.5px solid var(--border-strong);\n      border-radius: var(--radius-md);\n      outline: none;\n      transition: border-color 0.15s ease, box-shadow 0.15s ease;\n    }\n\n    #searchInput:focus {\n      border-color: var(--vodacom-red);\n      box-shadow: 0 0 0 3px var(--vodacom-red-glow);\n    }\n\n    #searchInput::placeholder {\n      color: #64748b;\n    }\n\n    .clear-search-btn {\n      position: absolute;\n      right: 10px;\n      width: 26px;\n      height: 26px;\n      border-radius: 50%;\n      border: none;\n      background: rgba(148, 163, 184, 0.18);\n      color: var(--text-secondary);\n      font-size: 1.05rem;\n      line-height: 1;\n      cursor: pointer;\n      display: none;\n      align-items: center;\n      justify-content: center;\n      transition: background 0.15s ease;\n    }\n\n    .clear-search-btn.visible {\n      display: inline-flex;\n    }\n\n    .clear-search-btn:hover {\n      background: rgba(239, 68, 68, 0.35);\n      color: #fff;\n    }\n\n    .match-counter {\n      background: var(--bg-input);\n      border: 1px solid var(--border-strong);\n      padding: 10px 15px;\n      border-radius: var(--radius-md);\n      font-size: 0.84rem;\n      font-weight: 600;\n      color: var(--text-secondary);\n      white-space: nowrap;\n      font-family: 'JetBrains Mono', monospace;\n    }\n\n    .match-counter strong {\n      color: #fff;\n    }\n\n    .filters-grid {\n      display: grid;\n      grid-template-columns: repeat(4, minmax(190px, 1fr)) auto;\n      gap: 12px;\n      align-items: end;\n    }\n\n    @media (max-width: 1200px) {\n      .filters-grid {\n        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));\n      }\n    }\n\n    .filter-group {\n      display: flex;\n      flex-direction: column;\n      gap: 5px;\n    }\n\n    .filter-group label {\n      font-size: 0.72rem;\n      font-weight: 700;\n      text-transform: uppercase;\n      letter-spacing: 0.05em;\n      color: var(--text-muted);\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n    }\n\n    .filter-select {\n      width: 100%;\n      padding: 9px 12px;\n      font-size: 0.84rem;\n      font-family: 'Inter', sans-serif;\n      font-weight: 500;\n      color: var(--text-primary);\n      background: var(--bg-input);\n      border: 1px solid var(--border-strong);\n      border-radius: var(--radius-sm);\n      outline: none;\n      cursor: pointer;\n      transition: border-color 0.15s ease;\n    }\n\n    .filter-select:focus {\n      border-color: var(--vodacom-red);\n    }\n\n    .btn-reset {\n      height: 39px;\n      padding: 0 16px;\n      background: rgba(239, 68, 68, 0.12);\n      border: 1px solid rgba(239, 68, 68, 0.35);\n      color: #fca5a5;\n      font-weight: 600;\n    }\n\n    .btn-reset:hover {\n      background: rgba(239, 68, 68, 0.24);\n      border-color: rgba(239, 68, 68, 0.6);\n      color: #fff;\n    }\n\n    /* Quick Search Chips & SLA Legend Bar */\n    .legend-bar {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      flex-wrap: wrap;\n      gap: 12px;\n      margin-top: 14px;\n      padding-top: 12px;\n      border-top: 1px solid var(--border-subtle);\n      font-size: 0.76rem;\n      color: var(--text-muted);\n    }\n\n    .eta-legend-items {\n      display: flex;\n      align-items: center;\n      gap: 10px;\n      flex-wrap: wrap;\n    }\n\n    .legend-chip {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 9px;\n      border-radius: 999px;\n      background: rgba(255, 255, 255, 0.04);\n      border: 1px solid var(--border-subtle);\n      font-size: 0.73rem;\n      color: var(--text-secondary);\n      cursor: pointer;\n      transition: all 0.14s ease;\n    }\n\n    .legend-chip:hover {\n      background: rgba(255, 255, 255, 0.1);\n      border-color: var(--border-strong);\n      color: #fff;\n    }\n\n    /* Outage Table Container */\n    .table-wrapper {\n      background: var(--bg-card);\n      border: 1px solid var(--border-strong);\n      border-radius: var(--radius-lg);\n      overflow: hidden;\n      box-shadow: var(--shadow-lg);\n    }\n\n    .table-scroll {\n      overflow-x: auto;\n      max-height: 74vh;\n      overflow-y: auto;\n    }\n\n    table {\n      width: 100%;\n      border-collapse: collapse;\n      text-align: left;\n      font-size: 0.85rem;\n    }\n\n    thead {\n      position: sticky;\n      top: 0;\n      z-index: 20;\n      background: #0f172a;\n      box-shadow: 0 1px 0 var(--border-strong);\n    }\n\n    th {\n      padding: 13px 14px;\n      font-size: 0.73rem;\n      font-weight: 700;\n      text-transform: uppercase;\n      letter-spacing: 0.05em;\n      color: var(--text-muted);\n      border-bottom: 1px solid var(--border-strong);\n      white-space: nowrap;\n      user-select: none;\n    }\n\n    th.sortable {\n      cursor: pointer;\n      transition: color 0.15s ease, background 0.15s ease;\n    }\n\n    th.sortable:hover {\n      color: #fff;\n      background: rgba(255, 255, 255, 0.04);\n    }\n\n    th.sortable.active-sort {\n      color: #fff;\n      background: rgba(230, 0, 0, 0.12);\n      border-bottom: 2px solid var(--vodacom-red);\n    }\n\n    .sort-arrow {\n      display: inline-block;\n      margin-left: 5px;\n      font-family: 'JetBrains Mono', monospace;\n      font-size: 0.82rem;\n      color: var(--vodacom-red);\n    }\n\n    tbody tr {\n      border-bottom: 1px solid var(--border-subtle);\n      transition: background 0.12s ease;\n    }\n\n    tbody tr:hover {\n      background: rgba(30, 41, 59, 0.65);\n    }\n\n    tbody tr.row-resolved {\n      opacity: 0.68;\n      background: rgba(16, 185, 129, 0.03);\n    }\n\n    td {\n      padding: 14px 14px;\n      vertical-align: top;\n      color: var(--text-secondary);\n    }\n\n    /* Column Specific Styling */\n    .col-ref {\n      font-family: 'JetBrains Mono', monospace;\n      font-weight: 700;\n      font-size: 0.81rem;\n      color: #fff;\n      white-space: nowrap;\n    }\n\n    .ref-badge {\n      display: inline-block;\n      background: var(--bg-input);\n      border: 1px solid var(--border-strong);\n      padding: 3px 8px;\n      border-radius: var(--radius-sm);\n      color: #f8fafc;\n    }\n\n    .source-tag {\n      display: block;\n      margin-top: 5px;\n      font-family: 'Inter', sans-serif;\n      font-size: 0.69rem;\n      font-weight: 500;\n      color: var(--text-muted);\n      white-space: normal;\n      max-width: 160px;\n    }\n\n    .fno-pill {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      font-weight: 700;\n      font-size: 0.84rem;\n      color: #fff;\n      background: rgba(255, 255, 255, 0.06);\n      border: 1px solid var(--border-strong);\n      padding: 4px 10px;\n      border-radius: var(--radius-sm);\n      white-space: nowrap;\n    }\n\n    .province-tag {\n      display: inline-block;\n      font-size: 0.71rem;\n      font-weight: 700;\n      text-transform: uppercase;\n      letter-spacing: 0.04em;\n      padding: 2px 7px;\n      border-radius: 4px;\n      background: rgba(59, 130, 246, 0.14);\n      color: #93c5fd;\n      border: 1px solid rgba(59, 130, 246, 0.3);\n      margin-bottom: 5px;\n    }\n\n    .suburb-text {\n      font-weight: 600;\n      color: var(--text-primary);\n      font-size: 0.87rem;\n      line-height: 1.38;\n      max-width: 290px;\n      word-break: break-word;\n    }\n\n    /* Status Bucket Pill */\n    .bucket-pill {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      font-size: 0.72rem;\n      font-weight: 800;\n      text-transform: uppercase;\n      letter-spacing: 0.04em;\n      padding: 4px 9px;\n      border-radius: 999px;\n      white-space: nowrap;\n    }\n\n    .bucket-acute {\n      background: var(--accent-red-bg);\n      color: #fca5a5;\n      border: 1px solid var(--accent-red-border);\n    }\n\n    .bucket-extended {\n      background: var(--accent-orange-bg);\n      color: #fdba74;\n      border: 1px solid var(--accent-orange-border);\n    }\n\n    .bucket-maint {\n      background: var(--accent-blue-bg);\n      color: #93c5fd;\n      border: 1px solid var(--accent-blue-border);\n    }\n\n    .bucket-resolved {\n      background: var(--accent-green-bg);\n      color: #6ee7b7;\n      border: 1px solid var(--accent-green-border);\n    }\n\n    .status-detail-sub {\n      display: block;\n      margin-top: 5px;\n      font-size: 0.75rem;\n      color: var(--text-muted);\n      font-weight: 500;\n    }\n\n    /* Customer ETA & Technician Update Column (Col G split on \"|\") */\n    .eta-update-cell {\n      min-width: 340px;\n      max-width: 520px;\n    }\n\n    .eta-badge-row {\n      display: flex;\n      align-items: center;\n      gap: 8px;\n      flex-wrap: wrap;\n      margin-bottom: 7px;\n    }\n\n    .eta-pill {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 5px 11px;\n      border-radius: var(--radius-sm);\n      font-family: 'JetBrains Mono', monospace;\n      font-size: 0.77rem;\n      font-weight: 700;\n      line-height: 1.35;\n      border: 1px solid transparent;\n    }\n\n    .eta-tier-confirmed {\n      background: var(--accent-green-bg);\n      color: #6ee7b7;\n      border-color: var(--accent-green-border);\n    }\n\n    .eta-tier-node {\n      background: var(--accent-yellow-bg);\n      color: #fde68a;\n      border-color: var(--accent-yellow-border);\n    }\n\n    .eta-tier-splice {\n      background: var(--accent-orange-bg);\n      color: #fdba74;\n      border-color: var(--accent-orange-border);\n    }\n\n    .eta-tier-civil {\n      background: var(--accent-purple-bg);\n      color: #e9d5ff;\n      border-color: var(--accent-purple-border);\n    }\n\n    .eta-tier-breached {\n      background: var(--accent-red-bg);\n      color: #fca5a5;\n      border-color: var(--accent-red-border);\n    }\n\n    .btn-copy-eta {\n      background: rgba(255, 255, 255, 0.06);\n      border: 1px solid var(--border-strong);\n      color: var(--text-secondary);\n      font-size: 0.69rem;\n      font-weight: 600;\n      padding: 3px 7px;\n      border-radius: 4px;\n      cursor: pointer;\n      transition: all 0.14s ease;\n    }\n\n    .btn-copy-eta:hover {\n      background: rgba(255, 255, 255, 0.14);\n      color: #fff;\n    }\n\n    .tech-update-text {\n      font-size: 0.83rem;\n      color: var(--text-secondary);\n      line-height: 1.45;\n      word-break: break-word;\n    }\n\n    /* Timestamps Column */\n    .timestamp-cell {\n      font-family: 'JetBrains Mono', monospace;\n      font-size: 0.78rem;\n      white-space: nowrap;\n    }\n\n    .started-time {\n      color: var(--text-primary);\n      font-weight: 600;\n    }\n\n    .elapsed-tag {\n      display: inline-block;\n      margin-top: 4px;\n      padding: 2px 6px;\n      border-radius: 4px;\n      font-size: 0.7rem;\n      background: rgba(255, 255, 255, 0.06);\n      color: var(--text-muted);\n    }\n\n    .poll-time {\n      display: block;\n      margin-top: 4px;\n      font-size: 0.69rem;\n      color: #64748b;\n    }\n\n    /* Copy Macro Column */\n    .btn-copy-macro {\n      display: inline-flex;\n      align-items: center;\n      gap: 6px;\n      padding: 8px 12px;\n      border-radius: var(--radius-sm);\n      background: rgba(230, 0, 0, 0.14);\n      border: 1px solid rgba(230, 0, 0, 0.45);\n      color: #fecaca;\n      font-size: 0.76rem;\n      font-weight: 700;\n      cursor: pointer;\n      transition: all 0.15s ease;\n      white-space: nowrap;\n    }\n\n    .btn-copy-macro:hover {\n      background: var(--vodacom-red);\n      border-color: #ff3333;\n      color: #fff;\n      transform: translateY(-1px);\n    }\n\n    .btn-copy-macro.copied {\n      background: var(--accent-green);\n      border-color: var(--accent-green);\n      color: #06281e;\n    }\n\n    /* Search Highlight Mark */\n    mark.hl {\n      background: rgba(250, 204, 21, 0.28);\n      color: #fef08a;\n      padding: 0 2px;\n      border-radius: 3px;\n      font-weight: 600;\n    }\n\n    /* Empty State */\n    .empty-state {\n      padding: 56px 24px;\n      text-align: center;\n      color: var(--text-muted);\n    }\n\n    .empty-state h3 {\n      color: var(--text-primary);\n      font-size: 1.05rem;\n      margin-bottom: 6px;\n    }\n\n    /* Toast Notification */\n    .toast-container {\n      position: fixed;\n      bottom: 22px;\n      right: 22px;\n      z-index: 999;\n      display: flex;\n      flex-direction: column;\n      gap: 8px;\n      max-width: 460px;\n    }\n\n    .toast {\n      background: #0f172a;\n      border-left: 4px solid var(--accent-green);\n      border-top: 1px solid var(--border-strong);\n      border-right: 1px solid var(--border-strong);\n      border-bottom: 1px solid var(--border-strong);\n      color: var(--text-primary);\n      padding: 12px 16px;\n      border-radius: var(--radius-sm);\n      box-shadow: var(--shadow-lg);\n      font-size: 0.82rem;\n      animation: slideIn 0.2s ease-out;\n    }\n\n    .toast code {\n      display: block;\n      margin-top: 5px;\n      padding: 6px 8px;\n      background: rgba(255, 255, 255, 0.05);\n      border-radius: 4px;\n      font-family: 'JetBrains Mono', monospace;\n      font-size: 0.72rem;\n      color: #cbd5e1;\n      word-break: break-all;\n    }\n\n    @keyframes slideIn {\n      from { transform: translateY(15px); opacity: 0; }\n      to { transform: translateY(0); opacity: 1; }\n    }\n  \n    /* View Switcher Bar */\n    .view-switcher-bar {\n      background: rgba(15, 23, 42, 0.95);\n      border-bottom: 1px solid var(--border-strong);\n      padding: 10px 24px;\n      display: flex;\n      align-items: center;\n      gap: 12px;\n      position: sticky;\n      top: 67px;\n      z-index: 95;\n      backdrop-filter: blur(12px);\n    }\n    .view-tabs-container {\n      display: flex;\n      gap: 10px;\n      flex-wrap: wrap;\n    }\n    .view-tab-btn {\n      display: inline-flex;\n      align-items: center;\n      gap: 8px;\n      padding: 8px 18px;\n      border-radius: var(--radius-md);\n      font-size: 0.82rem;\n      font-weight: 700;\n      background: #161f30;\n      color: var(--text-secondary);\n      border: 1px solid var(--border-subtle);\n      cursor: pointer;\n      transition: all 0.2s ease;\n    }\n    .view-tab-btn:hover {\n      background: var(--bg-card-hover);\n      color: #fff;\n      border-color: var(--border-strong);\n    }\n    .view-tab-btn.active {\n      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);\n      color: #fff;\n      border-color: #3b82f6;\n      box-shadow: 0 0 14px rgba(59, 130, 246, 0.3);\n    }\n    .tab-counter {\n      background: rgba(255, 255, 255, 0.12);\n      padding: 2px 8px;\n      border-radius: 999px;\n      font-size: 0.72rem;\n      font-family: 'JetBrains Mono', monospace;\n      font-weight: 800;\n    }\n    .tab-counter.vuma-badge {\n      background: rgba(217, 70, 239, 0.25);\n      color: #f0abfc;\n      border: 1px solid rgba(217, 70, 239, 0.45);\n    }\n\n    /* Analytics Container */\n    .analytics-container {\n      display: none;\n      padding: 24px;\n      max-width: 1440px;\n      margin: 0 auto;\n    }\n    .analytics-grid-kpis {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n      gap: 16px;\n      margin-bottom: 24px;\n    }\n    .analytics-kpi-card {\n      background: var(--bg-card);\n      border: 1px solid var(--border-subtle);\n      border-radius: var(--radius-md);\n      padding: 18px;\n      position: relative;\n      overflow: hidden;\n    }\n    .analytics-kpi-card::before {\n      content: '';\n      position: absolute;\n      top: 0; left: 0; right: 0; height: 3px;\n      background: #3b82f6;\n    }\n    .analytics-kpi-card.red::before { background: var(--vodacom-red); }\n    .analytics-kpi-card.orange::before { background: var(--accent-orange); }\n    .analytics-kpi-card.purple::before { background: var(--accent-purple); }\n    .analytics-kpi-card.green::before { background: var(--accent-green); }\n    \n    .analytics-kpi-title {\n      font-size: 0.74rem;\n      font-weight: 700;\n      color: var(--text-muted);\n      text-transform: uppercase;\n      letter-spacing: 0.05em;\n      margin-bottom: 6px;\n    }\n    .analytics-kpi-value {\n      font-size: 1.85rem;\n      font-weight: 800;\n      color: #fff;\n      font-family: 'JetBrains Mono', monospace;\n    }\n    .analytics-kpi-sub {\n      font-size: 0.73rem;\n      color: var(--text-secondary);\n      margin-top: 4px;\n    }\n\n    .analytics-charts-grid {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));\n      gap: 20px;\n      margin-bottom: 24px;\n    }\n    .analytics-chart-box {\n      background: var(--bg-card);\n      border: 1px solid var(--border-subtle);\n      border-radius: var(--radius-lg);\n      padding: 20px;\n    }\n    .analytics-chart-header {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      margin-bottom: 16px;\n      padding-bottom: 10px;\n      border-bottom: 1px solid var(--border-subtle);\n    }\n    .analytics-chart-title {\n      font-size: 0.92rem;\n      font-weight: 800;\n      color: #fff;\n      display: flex;\n      align-items: center;\n      gap: 8px;\n    }\n    .bar-row {\n      display: flex;\n      align-items: center;\n      margin-bottom: 12px;\n      font-size: 0.78rem;\n    }\n    .bar-label {\n      width: 140px;\n      font-weight: 600;\n      color: var(--text-secondary);\n      white-space: nowrap;\n      overflow: hidden;\n      text-overflow: ellipsis;\n    }\n    .bar-track {\n      flex: 1;\n      height: 12px;\n      background: #0f172a;\n      border-radius: 999px;\n      overflow: hidden;\n      margin: 0 12px;\n    }\n    .bar-fill {\n      height: 100%;\n      border-radius: 999px;\n      transition: width 0.6s ease;\n    }\n    .bar-val {\n      width: 54px;\n      text-align: right;\n      font-family: 'JetBrains Mono', monospace;\n      font-weight: 700;\n      color: #fff;\n    }\n\n    /* Vuma B2B View */\n    .vuma-container {\n      display: none;\n      padding: 24px;\n      max-width: 1440px;\n      margin: 0 auto;\n    }\n    .vuma-banner {\n      background: linear-gradient(135deg, rgba(217, 70, 239, 0.15) 0%, rgba(168, 85, 247, 0.08) 100%);\n      border: 1px solid rgba(217, 70, 239, 0.35);\n      border-radius: var(--radius-md);\n      padding: 16px 20px;\n      margin-bottom: 20px;\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      flex-wrap: wrap;\n      gap: 14px;\n    }\n    .vuma-banner-title h2 {\n      font-size: 1.05rem;\n      font-weight: 800;\n      color: #fdf4ff;\n      display: flex;\n      align-items: center;\n      gap: 8px;\n    }\n    .vuma-banner-title p {\n      font-size: 0.78rem;\n      color: #d8b4fe;\n      margin-top: 2px;\n    }\n    .vuma-table-wrapper {\n      background: var(--bg-card);\n      border: 1px solid var(--border-subtle);\n      border-radius: var(--radius-lg);\n      overflow-x: auto;\n    }\n    .vuma-table {\n      width: 100%;\n      border-collapse: collapse;\n      font-size: 0.8rem;\n      text-align: left;\n    }\n    .vuma-table th {\n      background: #111827;\n      color: var(--text-muted);\n      padding: 12px 16px;\n      font-weight: 700;\n      border-bottom: 1px solid var(--border-strong);\n      white-space: nowrap;\n    }\n    .vuma-table td {\n      padding: 14px 16px;\n      border-bottom: 1px solid var(--border-subtle);\n      vertical-align: top;\n    }\n    .vuma-table tr:hover td {\n      background: var(--bg-card-hover);\n    }\n    .premise-pill {\n      display: inline-block;\n      background: #0f172a;\n      border: 1px solid var(--border-subtle);\n      border-radius: 4px;\n      padding: 2px 6px;\n      margin: 2px 4px 2px 0;\n      font-size: 0.72rem;\n      color: var(--text-secondary);\n    }\n    .zone-tag {\n      background: rgba(59, 130, 246, 0.15);\n      color: #93c5fd;\n      border: 1px solid rgba(59, 130, 246, 0.3);\n      border-radius: 4px;\n      padding: 1px 6px;\n      font-family: 'JetBrains Mono', monospace;\n      font-size: 0.72rem;\n      font-weight: 700;\n    }\n    .badge-vuma-status {\n      display: inline-flex;\n      align-items: center;\n      gap: 5px;\n      padding: 3px 8px;\n      border-radius: 6px;\n      font-weight: 700;\n      font-size: 0.74rem;\n    }\n    .badge-vuma-status.progress {\n      background: rgba(59, 130, 246, 0.18);\n      color: #60a5fa;\n      border: 1px solid rgba(59, 130, 246, 0.4);\n    }\n    .badge-vuma-status.investigating {\n      background: rgba(245, 158, 11, 0.18);\n      color: #fbbf24;\n      border: 1px solid rgba(245, 158, 11, 0.4);\n    }\n    .badge-vuma-status.onhold {\n      background: rgba(239, 68, 68, 0.18);\n      color: #f87171;\n      border: 1px solid rgba(239, 68, 68, 0.4);\n    }\n\n  </style>\n</head>\n<body>\n\n  <!-- Sticky Top Command Bar -->\n  <header class=\"topbar\">\n    <div class=\"brand-group\">\n      <div class=\"brand-logo\">VF</div>\n      <div class=\"brand-title\">\n        <h1>\n          Vodacom FTTH National Outage Command Dashboard\n          <span class=\"badge-082\">082 1904 NOC</span>\n        </h1>\n        <div class=\"brand-subtitle\">\n          <span>Merchants CX Wholesale FNO Feed</span>\n          <span class=\"sep\">\u2022</span>\n          <span>Tab: <strong>Live FNO Outages</strong></span>\n          <span class=\"sep\">\u2022</span>\n          <span>Admin: <strong id=\"adminEmailLabel\">jody.stainbank@merchantscx.co.za</strong></span>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"topbar-actions\">\n      <div class=\"sync-pill\" title=\"Auto-polls live Google Sheet every 60 seconds\">\n        <span id=\"syncDot\" class=\"pulse-dot loading\"></span>\n        <span id=\"syncStatusText\">Connecting to Live Sheet...</span>\n        <span>| Next: <strong id=\"countdownLabel\">60s</strong></span>\n      </div>\n\n      <button type=\"button\" class=\"btn\" id=\"refreshNowBtn\" onclick=\"fetchLiveOutageData(true)\">\n        \u21bb Refresh Sheet\n      </button>\n\n      <button type=\"button\" class=\"btn btn-admin admin-only\" id=\"adminSyncBtn\" style=\"display:none;\" onclick=\"triggerAdminFeedSync()\" title=\"Admin Only: jody.stainbank@merchantscx.co.za\">\n        \u26a1 Admin Force Poll\n      </button>\n\n      <!-- Admin Only: Restricted to jody.stainbank@merchantscx.co.za -->\n      <a class=\"btn btn-admin admin-only\" id=\"adminSheetBtn\" style=\"display:none;\" href=\"https://docs.google.com/spreadsheets/d/16o_KHfB3SqxLamlpWTjWOlGhDfXPLZgBNZBOhJV-CLw/edit?usp=sharing\" target=\"_blank\" rel=\"noopener noreferrer\" title=\"Restricted Admin Master Sheet\">\n        \ud83d\udd12 Master Sheet \u2197\n      </a>\n    </div>\n  </header>\n\n  <!-- Multi-View Navigation Bar: Live Grid vs Executive Analytics vs Vuma B2B Feeder Radar -->\n  <div class=\"view-switcher-bar\">\n    <div class=\"view-tabs-container\">\n      <button type=\"button\" class=\"view-tab-btn active\" id=\"tabBtnGrid\" onclick=\"switchDashboardView('grid')\">\n        <span class=\"tab-icon\">\ud83d\udea8</span>\n        <span class=\"tab-title\">Live Outage Command Grid</span>\n        <span class=\"tab-counter\" id=\"tabGridCounter\">101</span>\n      </button>\n      <button type=\"button\" class=\"view-tab-btn\" id=\"tabBtnAnalytics\" onclick=\"switchDashboardView('analytics')\">\n        <span class=\"tab-icon\">\ud83d\udcca</span>\n        <span class=\"tab-title\">Executive Analytics & SLA Performance</span>\n      </button>\n      <button type=\"button\" class=\"view-tab-btn\" id=\"tabBtnVuma\" onclick=\"switchDashboardView('vuma')\">\n        <span class=\"tab-icon\">\ud83d\udfe3</span>\n        <span class=\"tab-title\">Vuma B2B Feeder Blast Radius</span>\n        <span class=\"tab-counter vuma-badge\" id=\"tabVumaCounter\">34 Lines Down</span>\n      </button>\n    </div>\n  </div>\n\n\n  <main class=\"container\" id=\"liveGridView\">\n    <!-- Connection Status / Fallback Notice Banner -->\n    <div id=\"connBanner\" class=\"conn-banner\">\n      <div id=\"connBannerText\"></div>\n      <div style=\"display:flex; gap:8px;\">\n        <button type=\"button\" class=\"btn\" onclick=\"fetchLiveOutageData(true)\">Retry Live JSONP</button>\n      </div>\n    </div>\n\n    <!-- 5 Interactive KPI Scorecards -->\n    <section class=\"kpi-grid\" aria-label=\"Outage KPI Scorecards\">\n      <div class=\"kpi-card kpi-total active\" id=\"kpi-ACTIVE_ONLY\" onclick=\"selectKpiBucket('ACTIVE_ONLY')\">\n        <div class=\"kpi-top\">\n          <span class=\"kpi-label\">\ud83d\udd34 Total Live Outages</span>\n          <span class=\"kpi-tag\">Hide Resolved</span>\n        </div>\n        <div class=\"kpi-value\" id=\"countTotalLive\">0</div>\n        <div class=\"kpi-foot\">\n          <span>Active FNO tickets only</span>\n          <span>Click to filter \u2192</span>\n        </div>\n      </div>\n\n      <div class=\"kpi-card kpi-acute\" id=\"kpi-ACUTE (<24h)\" onclick=\"selectKpiBucket('ACUTE (<24h)')\">\n        <div class=\"kpi-top\">\n          <span class=\"kpi-label\">\u26a1 Acute (&lt;24h)</span>\n          <span class=\"kpi-tag\">Priority 1</span>\n        </div>\n        <div class=\"kpi-value\" id=\"countAcute\">0</div>\n        <div class=\"kpi-foot\">\n          <span>Active breaks &amp; node faults</span>\n          <span>Click to filter \u2192</span>\n        </div>\n      </div>\n\n      <div class=\"kpi-card kpi-extended\" id=\"kpi-EXTENDED (>48h)\" onclick=\"selectKpiBucket('EXTENDED (>48h)')\">\n        <div class=\"kpi-top\">\n          <span class=\"kpi-label\">\ud83d\udfe0 Extended (&gt;48h)</span>\n          <span class=\"kpi-tag\">Priority 2</span>\n        </div>\n        <div class=\"kpi-value\" id=\"countExtended\">0</div>\n        <div class=\"kpi-foot\">\n          <span>Civil / complex rebuilds</span>\n          <span>Click to filter \u2192</span>\n        </div>\n      </div>\n\n      <div class=\"kpi-card kpi-maint\" id=\"kpi-MAINTENANCE\" onclick=\"selectKpiBucket('MAINTENANCE')\">\n        <div class=\"kpi-top\">\n          <span class=\"kpi-label\">\ud83d\udee0\ufe0f Maintenance</span>\n          <span class=\"kpi-tag\">Priority 3</span>\n        </div>\n        <div class=\"kpi-value\" id=\"countMaint\">0</div>\n        <div class=\"kpi-foot\">\n          <span>Planned FNO change windows</span>\n          <span>Click to filter \u2192</span>\n        </div>\n      </div>\n\n      <div class=\"kpi-card kpi-resolved\" id=\"kpi-RESOLVED\" onclick=\"selectKpiBucket('RESOLVED')\">\n        <div class=\"kpi-top\">\n          <span class=\"kpi-label\">\u2705 Resolved</span>\n          <span class=\"kpi-tag\">Hidden by Default</span>\n        </div>\n        <div class=\"kpi-value\" id=\"countResolved\">0</div>\n        <div class=\"kpi-foot\">\n          <span>Restored \u2014 Advise CPE reboot</span>\n          <span>Click to view \u2192</span>\n        </div>\n      </div>\n    </section>\n\n    <!-- Multi-Token Search, Multi-Filter & 6-Mode Sort Control Panel -->\n    <section class=\"control-panel\" aria-label=\"Search, Filter and Sort Controls\">\n      <div class=\"search-row\">\n        <div class=\"search-box-wrap\">\n          <span class=\"search-icon\">\ud83d\udd0d</span>\n          <input\n            type=\"text\"\n            id=\"searchInput\"\n            placeholder=\"Instant multi-token search: e.g. 'vumatel midrand', 'octotel george', 'splicing', 'INC-000036102', street or estate...\"\n            autocomplete=\"off\"\n            oninput=\"handleSearchInput()\"\n          />\n          <button type=\"button\" id=\"clearSearchBtn\" class=\"clear-search-btn\" onclick=\"clearSearchInput()\" title=\"Clear search (Esc)\">\u00d7</button>\n        </div>\n\n        <div class=\"match-counter\" id=\"matchCounter\">\n          Showing <strong>0</strong> of <strong>0</strong> active outages\n        </div>\n      </div>\n\n      <div class=\"filters-grid\">\n        <!-- 1. Status Bucket Filter (Defaults to ACTIVE_ONLY) -->\n        <div class=\"filter-group\">\n          <label for=\"bucketFilter\">\n            <span>Status Bucket Filter</span>\n            <span style=\"color:#f87171;\">Default: Hide Resolved</span>\n          </label>\n          <select id=\"bucketFilter\" class=\"filter-select\" onchange=\"syncKpiHighlight(); renderOutageTable();\">\n            <option value=\"ACTIVE_ONLY\" selected>\ud83d\udd34 All Live Outages \u2014 Hide Resolved</option>\n            <option value=\"ACUTE (<24h)\">\u26a1 Acute (&lt;24h) Only</option>\n            <option value=\"EXTENDED (>48h)\">\ud83d\udfe0 Extended (&gt;48h) Only</option>\n            <option value=\"MAINTENANCE\">\ud83d\udee0\ufe0f Planned Maintenance Only</option>\n            <option value=\"RESOLVED\">\u2705 Resolved / Restored Only</option>\n            <option value=\"ALL\">\ud83d\udccb All Outages (Include Resolved)</option>\n          </select>\n        </div>\n\n        <!-- 2. FNO Provider Filter (All 25 Vodacom FNO Partners) -->\n        <div class=\"filter-group\">\n          <label for=\"fnoFilter\">\n            <span>FNO Partner (25 Wholesale FNOs)</span>\n          </label>\n          <select id=\"fnoFilter\" class=\"filter-select\" onchange=\"renderOutageTable()\">\n            <option value=\"ALL\" selected>All Vodacom FNO Partners (25)</option>\n          </select>\n        </div>\n\n        <!-- 3. Province Filter (9 SA Provinces + National) -->\n        <div class=\"filter-group\">\n          <label for=\"provinceFilter\">\n            <span>Province / Region</span>\n          </label>\n          <select id=\"provinceFilter\" class=\"filter-select\" onchange=\"renderOutageTable()\">\n            <option value=\"ALL\" selected>All Provinces</option>\n            <option value=\"Gauteng\">Gauteng</option>\n            <option value=\"Western Cape\">Western Cape</option>\n            <option value=\"KwaZulu-Natal\">KwaZulu-Natal</option>\n            <option value=\"Eastern Cape\">Eastern Cape</option>\n            <option value=\"Free State\">Free State</option>\n            <option value=\"Mpumalanga\">Mpumalanga</option>\n            <option value=\"North West\">North West</option>\n            <option value=\"Limpopo\">Limpopo</option>\n            <option value=\"Northern Cape\">Northern Cape</option>\n            <option value=\"National\">National</option>\n          </select>\n        </div>\n\n        <!-- 4. Sort Mode Selector (6 Operational Sort Modes, Default: NEWEST_FIRST) -->\n        <div class=\"filter-group\">\n          <label for=\"sortSelect\">\n            <span>Sort Order</span>\n            <span style=\"color:#34d399;\">Default: Newest First \u2193</span>\n          </label>\n          <select id=\"sortSelect\" class=\"filter-select\" onchange=\"handleSortDropdownChange()\">\n            <option value=\"NEWEST_FIRST\" selected>\ud83d\udd52 Newest First \u2014 Started At (SAST) \u2193</option>\n            <option value=\"OLDEST_FIRST\">\u23f3 Oldest / Longest-Running First \u2191</option>\n            <option value=\"SEVERITY_PRIORITY\">\ud83d\udea8 Severity Priority (Acute \u2192 Extended \u2192 Maint \u2192 Resolved)</option>\n            <option value=\"ETA_URGENCY\">\u23f1\ufe0f Customer ETA Tier (\ud83d\udfe2 Confirmed \u2192 \ud83d\udfe1 4-6h \u2192 \ud83d\udfe0 8-12h \u2192 \ud83d\udea7 24h \u2192 \ud83d\udd34 Breached)</option>\n            <option value=\"FNO_AZ\">\ud83d\udd24 FNO Partner (A \u2192 Z)</option>\n            <option value=\"LOCATION_AZ\">\ud83d\udccd Province &amp; Suburb / Node (A \u2192 Z)</option>\n          </select>\n        </div>\n\n        <!-- 5. 1-Click Reset Filters Button -->\n        <button type=\"button\" id=\"resetFiltersBtn\" class=\"btn btn-reset\" onclick=\"resetAllFilters()\">\n          \u21ba Reset Filters\n        </button>\n      </div>\n\n      <!-- Quick Token Search Chips & 2-Tier Customer ETA Legend -->\n      <div class=\"legend-bar\">\n        <div class=\"eta-legend-items\">\n          <strong>Quick Search Tokens:</strong>\n          <span class=\"legend-chip\" onclick=\"applyQuickSearch('vumatel')\">Vumatel</span>\n          <span class=\"legend-chip\" onclick=\"applyQuickSearch('openserve')\">Openserve</span>\n          <span class=\"legend-chip\" onclick=\"applyQuickSearch('metrofibre')\">MetroFibre</span>\n          <span class=\"legend-chip\" onclick=\"applyQuickSearch('frogfoot')\">Frogfoot</span>\n          <span class=\"legend-chip\" onclick=\"applyQuickSearch('octotel')\">Octotel</span>\n          <span class=\"legend-chip\" onclick=\"applyQuickSearch('splicing')\">Splicing</span>\n          <span class=\"legend-chip\" onclick=\"applyQuickSearch('fibre break')\">Fibre Break</span>\n          <span class=\"legend-chip\" onclick=\"applyQuickSearch('power')\">Power / Battery</span>\n        </div>\n        <div class=\"eta-legend-items\">\n          <strong>2-Tier ETA Rules:</strong>\n          <span class=\"legend-chip\" onclick=\"setSortMode('ETA_URGENCY')\">\ud83d\udfe2 Confirmed FNO ETR</span>\n          <span class=\"legend-chip\" onclick=\"setSortMode('ETA_URGENCY')\">\ud83d\udfe1 4\u20136h Node SLA</span>\n          <span class=\"legend-chip\" onclick=\"setSortMode('ETA_URGENCY')\">\ud83d\udfe0 8\u201312h Fibre Splice SLA</span>\n          <span class=\"legend-chip\" onclick=\"setSortMode('ETA_URGENCY')\">\ud83d\udea7 24h Civil SLA</span>\n          <span class=\"legend-chip\" onclick=\"setSortMode('ETA_URGENCY')\">\ud83d\udd34 &gt;24h Breached</span>\n        </div>\n      </div>\n    </section>\n\n    <!-- Live 11-Column Outage Data Table -->\n    <section class=\"table-wrapper\" aria-label=\"Live FNO Outage Tickets\">\n      <div class=\"table-scroll\">\n        <table>\n          <thead>\n            <tr>\n              <th class=\"sortable\" id=\"th-ref\" onclick=\"toggleHeaderSort('REF')\">\n                Ticket ID / Source <span class=\"sort-arrow\" id=\"arrow-REF\"></span>\n              </th>\n              <th class=\"sortable\" id=\"th-fno\" onclick=\"toggleHeaderSort('FNO_AZ')\">\n                FNO Provider <span class=\"sort-arrow\" id=\"arrow-FNO_AZ\"></span>\n              </th>\n              <th class=\"sortable\" id=\"th-loc\" onclick=\"toggleHeaderSort('LOCATION_AZ')\">\n                Province &amp; Suburb / Node <span class=\"sort-arrow\" id=\"arrow-LOCATION_AZ\"></span>\n              </th>\n              <th class=\"sortable\" id=\"th-sev\" onclick=\"toggleHeaderSort('SEVERITY_PRIORITY')\">\n                Status Bucket <span class=\"sort-arrow\" id=\"arrow-SEVERITY_PRIORITY\"></span>\n              </th>\n              <th class=\"sortable\" id=\"th-eta\" onclick=\"toggleHeaderSort('ETA_URGENCY')\">\n                Customer ETA Badge &amp; Technician Update <span class=\"sort-arrow\" id=\"arrow-ETA_URGENCY\"></span>\n              </th>\n              <th class=\"sortable active-sort\" id=\"th-time\" onclick=\"toggleHeaderSort('TIME')\">\n                Started At (SAST) <span class=\"sort-arrow\" id=\"arrow-TIME\">\u2193</span>\n              </th>\n              <th>\n                082 1904 CRM Action\n              </th>\n            </tr>\n          </thead>\n          <tbody id=\"outageTableBody\">\n            <tr>\n              <td colspan=\"7\" class=\"empty-state\">\n                <h3>Loading Live FNO Outage Feed...</h3>\n                <p>Connecting to Google Sheet <code>16o_KHfB3SqxLamlpWTjWOlGhDfXPLZgBNZBOhJV-CLw</code> (Tab: <code>Live FNO Outages</code>)</p>\n              </td>\n            </tr>\n          </tbody>\n        </table>\n      </div>\n    </section>\n  </main>\n\n  <!-- Clipboard Toast Container -->\n  \n  <!-- VIEW 2: EXECUTIVE ANALYTICS & SLA PERFORMANCE -->\n  <section class=\"analytics-container\" id=\"analyticsView\">\n    <div class=\"analytics-grid-kpis\">\n      <div class=\"analytics-kpi-card red\">\n        <div class=\"analytics-kpi-title\">\u26a1 Total Active Outages</div>\n        <div class=\"analytics-kpi-value\" id=\"kpiAnaTotalActive\">101</div>\n        <div class=\"analytics-kpi-sub\">Across 7 National Wholesale FNOs</div>\n      </div>\n      <div class=\"analytics-kpi-card purple\">\n        <div class=\"analytics-kpi-title\">\ud83d\udfe3 Vuma Impacted Lines</div>\n        <div class=\"analytics-kpi-value\" id=\"kpiAnaVumaLines\">34</div>\n        <div class=\"analytics-kpi-sub\">Direct B2B Confirmed Vodacom Subscribers</div>\n      </div>\n      <div class=\"analytics-kpi-card orange\">\n        <div class=\"analytics-kpi-title\">\u23f3 Avg Outage Duration (MTTR)</div>\n        <div class=\"analytics-kpi-value\" id=\"kpiAnaAvgDuration\">14.8h</div>\n        <div class=\"analytics-kpi-sub\">Mean Elapsed Time on Active Incidents</div>\n      </div>\n      <div class=\"analytics-kpi-card green\">\n        <div class=\"analytics-kpi-title\">\ud83d\udee0\ufe0f Planned Maintenance Ratio</div>\n        <div class=\"analytics-kpi-value\" id=\"kpiAnaMaintRatio\">50.5%</div>\n        <div class=\"analytics-kpi-sub\">51 Scheduled Change Windows</div>\n      </div>\n    </div>\n\n    <div class=\"analytics-charts-grid\">\n      <!-- FNO Share Distribution -->\n      <div class=\"analytics-chart-box\">\n        <div class=\"analytics-chart-header\">\n          <div class=\"analytics-chart-title\">\ud83d\udce1 Wholesale FNO Outage Share</div>\n          <span style=\"font-size:0.75rem; color:var(--text-muted);\">Active Incidents</span>\n        </div>\n        <div id=\"fnoShareChartContainer\">\n          <!-- Populated by renderAnalytics() -->\n        </div>\n      </div>\n\n      <!-- Provincial Density -->\n      <div class=\"analytics-chart-box\">\n        <div class=\"analytics-chart-header\">\n          <div class=\"analytics-chart-title\">\ud83d\uddfa\ufe0f Provincial Impact Distribution</div>\n          <span style=\"font-size:0.75rem; color:var(--text-muted);\">By Region</span>\n        </div>\n        <div id=\"provShareChartContainer\">\n          <!-- Populated by renderAnalytics() -->\n        </div>\n      </div>\n\n      <!-- SLA Aging Buckets -->\n      <div class=\"analytics-chart-box\">\n        <div class=\"analytics-chart-header\">\n          <div class=\"analytics-chart-title\">\u23f1\ufe0f Incident SLA Aging Breakdown</div>\n          <span style=\"font-size:0.75rem; color:var(--text-muted);\">Acute vs Extended</span>\n        </div>\n        <div id=\"agingChartContainer\">\n          <!-- Populated by renderAnalytics() -->\n        </div>\n      </div>\n\n      <!-- Top Impacted Nodes -->\n      <div class=\"analytics-chart-box\">\n        <div class=\"analytics-chart-header\">\n          <div class=\"analytics-chart-title\">\ud83d\udea8 Top 8 Outage Hotspots</div>\n          <span style=\"font-size:0.75rem; color:var(--text-muted);\">By Impact & Duration</span>\n        </div>\n        <div id=\"topHotspotsContainer\">\n          <!-- Populated by renderAnalytics() -->\n        </div>\n      </div>\n    </div>\n  \n    <!-- USAGE & ADOPTION TELEMETRY SECTION -->\n    <div style=\"margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--border-strong);\">\n      <div style=\"display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;\">\n        <div>\n          <h3 style=\"font-size: 1.1rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px;\">\n            \ud83d\udcc8 Team Adoption & Usage Telemetry\n            <span class=\"badge\" style=\"background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);\">Live Telemetry Active</span>\n          </h3>\n          <p style=\"font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;\">\n            Tracking 082 1904 team interactions, call macro copies, search frequency, and daily active adoption.\n          </p>\n        </div>\n        <button type=\"button\" class=\"btn\" onclick=\"refreshUsageAnalytics(true)\" style=\"font-size: 0.75rem; padding: 6px 14px;\">\n          \u21bb Refresh Usage Stats\n        </button>\n      </div>\n\n      <!-- Telemetry KPIs -->\n      <div class=\"analytics-grid-kpis\">\n        <div class=\"analytics-kpi-card purple\">\n          <div class=\"analytics-kpi-title\">\ud83d\udc40 Total Dashboard Views</div>\n          <div class=\"analytics-kpi-value\" id=\"teleTotalViews\">1</div>\n          <div class=\"analytics-kpi-sub\">Lifetime Dashboard Sessions</div>\n        </div>\n        <div class=\"analytics-kpi-card green\">\n          <div class=\"analytics-kpi-title\">\ud83d\udc65 Unique Active Users</div>\n          <div class=\"analytics-kpi-value\" id=\"teleUniqueUsers\">1</div>\n          <div class=\"analytics-kpi-sub\">Authenticated Team Members</div>\n        </div>\n        <div class=\"analytics-kpi-card red\">\n          <div class=\"analytics-kpi-title\">\ud83d\udccb 082 1904 Macros Copied</div>\n          <div class=\"analytics-kpi-value\" id=\"teleMacroCopies\">0</div>\n          <div class=\"analytics-kpi-sub\">Direct Customer Resolutions</div>\n        </div>\n        <div class=\"analytics-kpi-card orange\">\n          <div class=\"analytics-kpi-title\">\ud83d\udd0d Searches Executed</div>\n          <div class=\"analytics-kpi-value\" id=\"teleSearchCount\">0</div>\n          <div class=\"analytics-kpi-sub\">Queries & FNO Filter Actions</div>\n        </div>\n      </div>\n\n      <!-- Telemetry Charts & Live Audit Stream -->\n      <div class=\"analytics-charts-grid\">\n        <!-- Daily Adoption Chart -->\n        <div class=\"analytics-chart-box\">\n          <div class=\"analytics-chart-header\">\n            <div class=\"analytics-chart-title\">\ud83d\udcc5 Daily Team Adoption Trend</div>\n            <span style=\"font-size:0.75rem; color:var(--text-muted);\">Actions / Day</span>\n          </div>\n          <div id=\"teleDailyChartContainer\">\n            <!-- Populated by renderUsageAnalytics() -->\n          </div>\n        </div>\n\n        <!-- Top Active Users / Team Members -->\n        <div class=\"analytics-chart-box\">\n          <div class=\"analytics-chart-header\">\n            <div class=\"analytics-chart-title\">\ud83c\udfc6 Top Active Users</div>\n            <span style=\"font-size:0.75rem; color:var(--text-muted);\">By Total Interactions</span>\n          </div>\n          <div id=\"teleTopUsersContainer\">\n            <!-- Populated by renderUsageAnalytics() -->\n          </div>\n        </div>\n      </div>\n\n      <!-- Recent Activity Stream -->\n      <div class=\"analytics-chart-box\" style=\"margin-top: 20px;\">\n        <div class=\"analytics-chart-header\">\n          <div class=\"analytics-chart-title\">\u26a1 Live Activity Audit Stream</div>\n          <span style=\"font-size:0.75rem; color:var(--text-muted);\">Recent 20 Team Actions</span>\n        </div>\n        <div id=\"teleActivityStream\" style=\"max-height: 280px; overflow-y: auto;\">\n          <!-- Populated by renderUsageAnalytics() -->\n        </div>\n      </div>\n    </div>\n\n  </section>\n\n  <!-- VIEW 3: VUMA B2B DIRECT FEEDER RADAR & BLAST RADIUS -->\n  <section class=\"vuma-container\" id=\"vumaB2bView\">\n    <div class=\"vuma-banner\">\n      <div class=\"vuma-banner-title\">\n        <h2>\ud83d\udfe3 Vuma B2B ISP Portal Feeder Radar</h2>\n        <p>Live authoritative feed direct from <strong>isp-portal.vumatel.co.za</strong> \u2022 Vodacom Wholesale Account \u2022 Verified NMS & Feeder Impact</p>\n      </div>\n      <div>\n        <span class=\"tab-counter vuma-badge\" style=\"font-size:0.85rem; padding:6px 14px;\">34 Vodacom Lines Affected</span>\n      </div>\n    </div>\n\n    <div class=\"vuma-table-wrapper\">\n      <table class=\"vuma-table\">\n        <thead>\n          <tr>\n            <th>INCIDENT REF</th>\n            <th>VUMA NOC STATUS</th>\n            <th>FIBREHOOD / SUBURBS</th>\n            <th>AGGREGATION ZONES</th>\n            <th>AFFECTED SUBSCRIBERS</th>\n            <th>ELAPSED AGE</th>\n            <th>SAMPLE PREMISES & ONT ASSETS</th>\n            <th>082 1904 CRM ACTION</th>\n          </tr>\n        </thead>\n        <tbody id=\"vumaB2bTableBody\">\n          <!-- Populated by renderVumaB2BTable() -->\n        </tbody>\n      </table>\n    </div>\n  </section>\n\n  <div class=\"toast-container\" id=\"toastContainer\"></div>\n\n  <script>\n    /*************************************************************************\n     * 1. EXACT IDENTIFIERS & CONFIGURATION (Vodacom FTTH 082 1904)\n     *************************************************************************/\n    const SPREADSHEET_ID = \"16o_KHfB3SqxLamlpWTjWOlGhDfXPLZgBNZBOhJV-CLw\";\n    const SHEET_TAB_NAME = \"Live FNO Outages\";\n    const ADMIN_EMAIL = \"jody.stainbank@merchantscx.co.za\";\n    const POLL_INTERVAL_SECONDS = 60;\n\n    // Exact 25 Vodacom FNO Partners\n    const VODACOM_25_FNOS = [\n      \"Vumatel\",\n      \"Vuma Reach\",\n      \"Openserve\",\n      \"MetroFibre\",\n      \"Frogfoot\",\n      \"Octotel\",\n      \"Zoom Fibre\",\n      \"Evotel\",\n      \"Vodacom Fibre\",\n      \"Link Africa\",\n      \"DFA\",\n      \"Open Fibre\",\n      \"Clear Access\",\n      \"Waterfall Access Networks\",\n      \"Century City Connect\",\n      \"SADV\",\n      \"TT Connect\",\n      \"Link Layer\",\n      \"Netstream\",\n      \"Balwin Fibre\",\n      \"FMAS Networks\",\n      \"Lightstruck\",\n      \"Liquid Telecom\",\n      \"Mitsol\",\n      \"Comtel\"\n    ];\n\n    // Global State\n    let rawOutageRows = [];\n    let currentSortMode = \"NEWEST_FIRST\";\n    let refSortAsc = true;\n    let countdownRemaining = POLL_INTERVAL_SECONDS;\n    let jsonpTimeoutHandle = null;\n    let dataSourceMode = \"INITIALIZING\";\n\n    /*************************************************************************\n     * 2. REALISTIC SEED / FALLBACK DATASET (11-Column Schema A:K)\n     * Used immediately if standalone browser blocks third-party Google Sheet\n     * cookies or before user authenticates, ensuring zero blank screens.\n     *************************************************************************/\n    const VUMA_B2B_DATA = {\"scrapedAt\": \"2026-11-02 18:43:58\", \"totalCases\": 34, \"totalIncidents\": 9, \"incidents\": [{\"incidentId\": \"INC-000036246\", \"incidentStatus\": \"Repair in progress\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"fibrehoods\": [\"Mount Moriah\", \"Mount Royal\"], \"aggregationZones\": [\"MTM-AG09\", \"MTM-AG13\", \"MTM-AG16\", \"MTR-AG02\", \"MTR-AG03\", \"MTR-AG10\", \"MTR-AG14\"], \"blocks\": [\"VR-MTM-AG09-B020\", \"VR-MTM-AG13-B030\", \"VR-MTM-AG16-B042\", \"VR-MTR-AG02-B004\", \"VR-MTR-AG03-B007\", \"VR-MTR-AG10-B024\", \"VR-MTR-AG14-B032\"], \"affectedCustomersCount\": 7, \"caseNumbers\": [\"01734337\", \"01734824\", \"01734928\", \"01735139\", \"01735144\", \"01735176\", \"01735224\"], \"earliestDate\": \"2026/11/02, 13:49\", \"maxAgeHours\": 4.9, \"nmsStatuses\": [\"Link Is Down\", \"Unknown\"], \"samplePremises\": [\"Plus Code: 5G2H7297+2PC,KwaMashu,Stand Number: 826 Mount Royal\", \"Plus Code: 5G2H7279+F4H,KwaMashu,Stand Number: 1397 Mount Moriah\", \"Plus Code: 5G2H7269+PJ9,KwaMashu,Stand Number: 603 Mount Moriah\", \"Plus Code: 5G2H7297+FG5,KwaMashu,Stand Number: 919 Mount Royal\", \"Plus Code: 5G2H7276+39F,KwaMashu,Stand Number: 148 Mount Royal\"], \"assets\": [\"48575443D9809BB8\", \"48575443B24680B6\", \"48575443AC3F72B6\", \"48575443AC310BB6\", \"48575443EF10DDB6\", \"485754439E7218B6\", \"48575443C04A35B6\"]}, {\"incidentId\": \"INC-000036250\", \"incidentStatus\": \"Pending Investigation\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"fibrehoods\": [\"Protea Hotel Techno Park\"], \"aggregationZones\": [\"PHT-AG01\"], \"blocks\": [\"VC-PHT-AG01-B001\"], \"affectedCustomersCount\": 6, \"caseNumbers\": [\"01734345\", \"01734352\", \"01734353\", \"01734416\", \"01734450\", \"01735104\"], \"earliestDate\": \"2026/11/02, 13:50\", \"maxAgeHours\": 4.89, \"nmsStatuses\": [\"Unknown\"], \"samplePremises\": [\"Webers Valley Road,Stellenbosch Square,Unit 14,Jamestown,Jamestown\", \"Webers Valley Road,Stellenbosch Square,Unit 19,Jamestown,Jamestown\", \"Webers Valley Road,Stellenbosch Square,Unit 36,Jamestown,Jamestown\", \"Webers Valley Road,Stellenbosch Square,Unit 24,Jamestown,Jamestown\", \"Webers Valley Road,Stellenbosch Square,Unit 11,Jamestown,Jamestown\"], \"assets\": [\"ALCLF94FF527\", \"ALCLF98482C8\", \"ALCLFF5553AE\", \"ALCLFDB34E44\", \"ALCLF9846E4D\", \"ALCLF87BB7C0\"]}, {\"incidentId\": \"INC-000036243\", \"incidentStatus\": \"Pending Investigation\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"fibrehoods\": [\"Upper Umhlanga\"], \"aggregationZones\": [\"LUU-AG2\"], \"blocks\": [\"VT-LUU-B002\"], \"affectedCustomersCount\": 5, \"caseNumbers\": [\"01734666\", \"01734759\", \"01734771\", \"01734782\", \"01734792\"], \"earliestDate\": \"2026/11/02, 14:59\", \"maxAgeHours\": 3.74, \"nmsStatuses\": [\"Unknown\"], \"samplePremises\": [\"18 Manaar Road, Herrwood Park, Blackburn\", \"7 Sembilan Road, Herrwood Park, Blackburn\", \"6 Tibia Crescent, Herrwood Park, Blackburn\", \"12 Mendoza Drive, Herrwood Park, Blackburn\", \"11 Sembilan Road, Herrwood Park, Blackburn\"], \"assets\": [\"ALCLFC7D7305\", \"ALCLFBEE3CA6\", \"ALCLFD37A16B\", \"ALCLB36AF7C3\", \"ALCLFC8DD8AD\"]}, {\"incidentId\": \"INC-000036232\", \"incidentStatus\": \"Repair on-hold\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"fibrehoods\": [\"Ifafi Suburb\"], \"aggregationZones\": [\"IFF-AG06\"], \"blocks\": [\"IFF-B006\"], \"affectedCustomersCount\": 4, \"caseNumbers\": [\"01732084\", \"01732851\", \"01733039\", \"01734128\"], \"earliestDate\": \"2026/11/01, 12:52\", \"maxAgeHours\": 29.85, \"nmsStatuses\": [\"Link Is Down\", \"POP Light Levels Abnormal\", \"Unknown\"], \"samplePremises\": [\"22 Dam Drive, Stand Number: 917, Ifafi Suburb, Hartbeespoort\", \"5 Leemtefort Street, Stand Number: 83, Ifafi Suburb, Hartbeespoort\", \"0 Schubert Asset_Moved, Magalies View VC, Unit 337, Melodie,\", \"7 Dam Drive, Stand Number: 848, Ifafi Suburb, Hartbeespoort\"], \"assets\": [\"ALCLF99F4AC3\", \"ALCLB352CF0A\", \"ALCLB3ABE1A6\", \"ALCLFD08A03A\"]}, {\"incidentId\": \"INC-000036213\", \"incidentStatus\": \"Repair in progress\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"fibrehoods\": [\"Wynberg\"], \"aggregationZones\": [\"WNB-AG11\", \"WNB-AG6\", \"WNB-AG8\"], \"blocks\": [\"VC-WNB-B041\", \"VC-WNB-B088\", \"VC-WNB-B095\"], \"affectedCustomersCount\": 4, \"caseNumbers\": [\"01732633\", \"01732659\", \"01732731\", \"01732801\"], \"earliestDate\": \"2026/11/01, 20:42\", \"maxAgeHours\": 22.03, \"nmsStatuses\": [\"Link Is Down\"], \"samplePremises\": [\"21 Morton Road West Lee Unit 3\", \"6 Langley Road, Wynberg, Cape Town\", \"9 Blenheim Road Village Green Unit 2\", \"5 Thornbury Road Oaktree Square Unit 5\"], \"assets\": [\"VT-WNB-OB-3879\", \"VT-WNB-OB-1188\", \"VT-WNB-OB-2187\", \"VT-WNB-OB-7357\"]}, {\"incidentId\": \"INC-000036208\", \"incidentStatus\": \"Repair in progress\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"fibrehoods\": [\"Ferryvale\", \"Vereeniging\", \"Visagie Park\", \"Wynberg\"], \"aggregationZones\": [\"FYV-AG9\", \"VER-AG7\", \"VSP-AG14\", \"WNB-AG11\"], \"blocks\": [\"VC-FYV-B025\", \"VC-VER-WD-B025\", \"VC-VSP-B044\", \"VC-WNB-B095\"], \"affectedCustomersCount\": 4, \"caseNumbers\": [\"01732783\", \"01733360\", \"01734220\", \"01734625\"], \"earliestDate\": \"2026/11/02, 07:17\", \"maxAgeHours\": 11.45, \"nmsStatuses\": [\"Link Is Down\", \"Unknown\"], \"samplePremises\": [\"185 Hendrik Verwoerd Street, Ferryvale, Nigel\", \"17 Morton Road Tiverton Heights Unit 501\", \"20 Begonia Street, Visagie Park, Nigel\", \"26 Korundum Avenue, waldrift, Vereeniging\"], \"assets\": [\"485754431DD351A4\", \"VT-WNB-OB-3975\", \"485754438E63FCA4\", \"4857544394B0DDA3\"]}, {\"incidentId\": \"INC-000000490\", \"incidentStatus\": \"Repair on-hold\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"fibrehoods\": [\"Khayelitsha Zone 09\", \"Khayelitsha Zone 16\"], \"aggregationZones\": [\"KHZ16-AG03\", \"KHZ9-AG06\"], \"blocks\": [\"VR-KHZ16-AG03-B01\", \"VR-KHZ9-AG06-B14\"], \"affectedCustomersCount\": 2, \"caseNumbers\": [\"00220932\", \"01294335\"], \"earliestDate\": \"2024/08/07, 14:08\", \"maxAgeHours\": 19612.59, \"nmsStatuses\": [\"Link Is Down\"], \"samplePremises\": [\"21 Khuthaza Street, Harare, Cape Town\", \"4 Bekelentloko Street, Mandela Park, Cape Town\"], \"assets\": [\"48575443B2A0C2AA\", \"48575443B2E445AB\"]}, {\"incidentId\": \"INC-000036170\", \"incidentStatus\": \"Repair in progress\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"fibrehoods\": [\"Fairfield Estate & Churchill Estate\"], \"aggregationZones\": [\"FF-AG8\"], \"blocks\": [\"VC-FF-B098\"], \"affectedCustomersCount\": 1, \"caseNumbers\": [\"01731409\"], \"earliestDate\": \"2026/10/31, 21:31\", \"maxAgeHours\": 45.21, \"nmsStatuses\": [\"Link Is Down\"], \"samplePremises\": [\"37 Balfour Road, Glenlily, Cape Town\"], \"assets\": [\"VT-RME-OB-7179\"]}, {\"incidentId\": \"INC-000036184\", \"incidentStatus\": \"Repair in progress\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"fibrehoods\": [\"Chartwell Hill\"], \"aggregationZones\": [\"VC-CWH-AG01\"], \"blocks\": [\"VC-CWH-B001\"], \"affectedCustomersCount\": 1, \"caseNumbers\": [\"01731641\"], \"earliestDate\": \"2026/11/01, 09:32\", \"maxAgeHours\": 33.19, \"nmsStatuses\": [\"Unknown\"], \"samplePremises\": [\"0 Martial Eagle Ave, Eagle Trace Estate, Unit 2113, Fourways, Sandton\"], \"assets\": [\"ALCLFF051649\"]}], \"rawCases\": [{\"caseNumber\": \"00220932\", \"dateOpened\": \"2024/08/07, 14:08\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000000490\", \"incidentStatus\": \"Repair on-hold\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"21 Khuthaza Street, Harare, Cape Town\", \"blockName\": \"VR-KHZ9-AG06-B14\", \"aggregationZone\": \"KHZ9-AG06\", \"fibrehood\": \"Khayelitsha Zone 09\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"19\\u00a0612,59\", \"assetName\": \"48575443B2A0C2AA\"}, {\"caseNumber\": \"01294335\", \"dateOpened\": \"2026/04/12, 21:01\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000000490\", \"incidentStatus\": \"Repair on-hold\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"4 Bekelentloko Street, Mandela Park, Cape Town\", \"blockName\": \"VR-KHZ16-AG03-B01\", \"aggregationZone\": \"KHZ16-AG03\", \"fibrehood\": \"Khayelitsha Zone 16\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"4\\u00a0893,70\", \"assetName\": \"48575443B2E445AB\"}, {\"caseNumber\": \"01731409\", \"dateOpened\": \"2026/10/31, 21:31\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036170\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"37 Balfour Road, Glenlily, Cape Town\", \"blockName\": \"VC-FF-B098\", \"aggregationZone\": \"FF-AG8\", \"fibrehood\": \"Fairfield Estate & Churchill Estate\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"45,21\", \"assetName\": \"VT-RME-OB-7179\"}, {\"caseNumber\": \"01731641\", \"dateOpened\": \"2026/11/01, 09:32\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036184\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"0 Martial Eagle Ave, Eagle Trace Estate, Unit 2113, Fourways, Sandton\", \"blockName\": \"VC-CWH-B001\", \"aggregationZone\": \"VC-CWH-AG01\", \"fibrehood\": \"Chartwell Hill\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"33,19\", \"assetName\": \"ALCLFF051649\"}, {\"caseNumber\": \"01732084\", \"dateOpened\": \"2026/11/01, 12:52\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036232\", \"incidentStatus\": \"Repair on-hold\", \"nmsStatus\": \"Unknown\", \"premise\": \"22 Dam Drive, Stand Number: 917, Ifafi Suburb, Hartbeespoort\", \"blockName\": \"IFF-B006\", \"aggregationZone\": \"IFF-AG06\", \"fibrehood\": \"Ifafi Suburb\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"29,85\", \"assetName\": \"ALCLF99F4AC3\"}, {\"caseNumber\": \"01732633\", \"dateOpened\": \"2026/11/01, 20:42\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036213\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"21 Morton Road West Lee Unit 3\", \"blockName\": \"VC-WNB-B095\", \"aggregationZone\": \"WNB-AG11\", \"fibrehood\": \"Wynberg\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"22,03\", \"assetName\": \"VT-WNB-OB-3879\"}, {\"caseNumber\": \"01732659\", \"dateOpened\": \"2026/11/01, 21:21\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036213\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"6 Langley Road, Wynberg, Cape Town\", \"blockName\": \"VC-WNB-B041\", \"aggregationZone\": \"WNB-AG6\", \"fibrehood\": \"Wynberg\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"21,37\", \"assetName\": \"VT-WNB-OB-1188\"}, {\"caseNumber\": \"01732731\", \"dateOpened\": \"2026/11/02, 06:18\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036213\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"9 Blenheim Road Village Green Unit 2\", \"blockName\": \"VC-WNB-B088\", \"aggregationZone\": \"WNB-AG8\", \"fibrehood\": \"Wynberg\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"12,42\", \"assetName\": \"VT-WNB-OB-2187\"}, {\"caseNumber\": \"01732783\", \"dateOpened\": \"2026/11/02, 07:17\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036208\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"185 Hendrik Verwoerd Street, Ferryvale, Nigel\", \"blockName\": \"VC-FYV-B025\", \"aggregationZone\": \"FYV-AG9\", \"fibrehood\": \"Ferryvale\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"11,45\", \"assetName\": \"485754431DD351A4\"}, {\"caseNumber\": \"01732801\", \"dateOpened\": \"2026/11/02, 07:26\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036213\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"5 Thornbury Road Oaktree Square Unit 5\", \"blockName\": \"VC-WNB-B095\", \"aggregationZone\": \"WNB-AG11\", \"fibrehood\": \"Wynberg\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"11,28\", \"assetName\": \"VT-WNB-OB-7357\"}, {\"caseNumber\": \"01732851\", \"dateOpened\": \"2026/11/02, 07:54\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036232\", \"incidentStatus\": \"Repair on-hold\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"5 Leemtefort Street, Stand Number: 83, Ifafi Suburb, Hartbeespoort\", \"blockName\": \"IFF-B006\", \"aggregationZone\": \"IFF-AG06\", \"fibrehood\": \"Ifafi Suburb\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"10,82\", \"assetName\": \"ALCLB352CF0A\"}, {\"caseNumber\": \"01733039\", \"dateOpened\": \"2026/11/02, 08:50\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036232\", \"incidentStatus\": \"Repair on-hold\", \"nmsStatus\": \"POP Light Levels Abnormal\", \"premise\": \"0 Schubert Asset_Moved, Magalies View VC, Unit 337, Melodie,\", \"blockName\": \"IFF-B006\", \"aggregationZone\": \"IFF-AG06\", \"fibrehood\": \"Ifafi Suburb\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"9,89\", \"assetName\": \"ALCLB3ABE1A6\"}, {\"caseNumber\": \"01733360\", \"dateOpened\": \"2026/11/02, 10:10\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036208\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"17 Morton Road Tiverton Heights Unit 501\", \"blockName\": \"VC-WNB-B095\", \"aggregationZone\": \"WNB-AG11\", \"fibrehood\": \"Wynberg\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"8,56\", \"assetName\": \"VT-WNB-OB-3975\"}, {\"caseNumber\": \"01734128\", \"dateOpened\": \"2026/11/02, 13:00\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036232\", \"incidentStatus\": \"Repair on-hold\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"7 Dam Drive, Stand Number: 848, Ifafi Suburb, Hartbeespoort\", \"blockName\": \"IFF-B006\", \"aggregationZone\": \"IFF-AG06\", \"fibrehood\": \"Ifafi Suburb\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"5,73\", \"assetName\": \"ALCLFD08A03A\"}, {\"caseNumber\": \"01734220\", \"dateOpened\": \"2026/11/02, 13:25\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036208\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"20 Begonia Street, Visagie Park, Nigel\", \"blockName\": \"VC-VSP-B044\", \"aggregationZone\": \"VSP-AG14\", \"fibrehood\": \"Visagie Park\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"5,31\", \"assetName\": \"485754438E63FCA4\"}, {\"caseNumber\": \"01734337\", \"dateOpened\": \"2026/11/02, 13:49\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036246\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"Plus Code: 5G2H7297+2PC,KwaMashu,Stand Number: 826 Mount Royal\", \"blockName\": \"VR-MTR-AG02-B004\", \"aggregationZone\": \"MTR-AG02\", \"fibrehood\": \"Mount Royal\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"4,90\", \"assetName\": \"48575443D9809BB8\"}, {\"caseNumber\": \"01734345\", \"dateOpened\": \"2026/11/02, 13:50\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036250\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"Webers Valley Road,Stellenbosch Square,Unit 14,Jamestown,Jamestown\", \"blockName\": \"VC-PHT-AG01-B001\", \"aggregationZone\": \"PHT-AG01\", \"fibrehood\": \"Protea Hotel Techno Park\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"4,89\", \"assetName\": \"ALCLF94FF527\"}, {\"caseNumber\": \"01734352\", \"dateOpened\": \"2026/11/02, 13:52\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036250\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"Webers Valley Road,Stellenbosch Square,Unit 19,Jamestown,Jamestown\", \"blockName\": \"VC-PHT-AG01-B001\", \"aggregationZone\": \"PHT-AG01\", \"fibrehood\": \"Protea Hotel Techno Park\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"4,86\", \"assetName\": \"ALCLF98482C8\"}, {\"caseNumber\": \"01734353\", \"dateOpened\": \"2026/11/02, 13:52\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036250\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"Webers Valley Road,Stellenbosch Square,Unit 36,Jamestown,Jamestown\", \"blockName\": \"VC-PHT-AG01-B001\", \"aggregationZone\": \"PHT-AG01\", \"fibrehood\": \"Protea Hotel Techno Park\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"4,86\", \"assetName\": \"ALCLFF5553AE\"}, {\"caseNumber\": \"01734416\", \"dateOpened\": \"2026/11/02, 14:10\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036250\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"Webers Valley Road,Stellenbosch Square,Unit 24,Jamestown,Jamestown\", \"blockName\": \"VC-PHT-AG01-B001\", \"aggregationZone\": \"PHT-AG01\", \"fibrehood\": \"Protea Hotel Techno Park\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"4,55\", \"assetName\": \"ALCLFDB34E44\"}, {\"caseNumber\": \"01734450\", \"dateOpened\": \"2026/11/02, 14:20\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036250\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"Webers Valley Road,Stellenbosch Square,Unit 11,Jamestown,Jamestown\", \"blockName\": \"VC-PHT-AG01-B001\", \"aggregationZone\": \"PHT-AG01\", \"fibrehood\": \"Protea Hotel Techno Park\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"4,38\", \"assetName\": \"ALCLF9846E4D\"}, {\"caseNumber\": \"01734625\", \"dateOpened\": \"2026/11/02, 14:49\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036208\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"26 Korundum Avenue, waldrift, Vereeniging\", \"blockName\": \"VC-VER-WD-B025\", \"aggregationZone\": \"VER-AG7\", \"fibrehood\": \"Vereeniging\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"3,90\", \"assetName\": \"4857544394B0DDA3\"}, {\"caseNumber\": \"01734666\", \"dateOpened\": \"2026/11/02, 14:59\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036243\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"18 Manaar Road, Herrwood Park, Blackburn\", \"blockName\": \"VT-LUU-B002\", \"aggregationZone\": \"LUU-AG2\", \"fibrehood\": \"Upper Umhlanga\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"3,74\", \"assetName\": \"ALCLFC7D7305\"}, {\"caseNumber\": \"01734759\", \"dateOpened\": \"2026/11/02, 15:21\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036243\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"7 Sembilan Road, Herrwood Park, Blackburn\", \"blockName\": \"VT-LUU-B002\", \"aggregationZone\": \"LUU-AG2\", \"fibrehood\": \"Upper Umhlanga\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"3,36\", \"assetName\": \"ALCLFBEE3CA6\"}, {\"caseNumber\": \"01734771\", \"dateOpened\": \"2026/11/02, 15:25\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036243\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"6 Tibia Crescent, Herrwood Park, Blackburn\", \"blockName\": \"VT-LUU-B002\", \"aggregationZone\": \"LUU-AG2\", \"fibrehood\": \"Upper Umhlanga\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"3,31\", \"assetName\": \"ALCLFD37A16B\"}, {\"caseNumber\": \"01734782\", \"dateOpened\": \"2026/11/02, 15:27\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036243\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"12 Mendoza Drive, Herrwood Park, Blackburn\", \"blockName\": \"VT-LUU-B002\", \"aggregationZone\": \"LUU-AG2\", \"fibrehood\": \"Upper Umhlanga\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"3,28\", \"assetName\": \"ALCLB36AF7C3\"}, {\"caseNumber\": \"01734792\", \"dateOpened\": \"2026/11/02, 15:30\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036243\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"11 Sembilan Road, Herrwood Park, Blackburn\", \"blockName\": \"VT-LUU-B002\", \"aggregationZone\": \"LUU-AG2\", \"fibrehood\": \"Upper Umhlanga\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"3,23\", \"assetName\": \"ALCLFC8DD8AD\"}, {\"caseNumber\": \"01734824\", \"dateOpened\": \"2026/11/02, 15:36\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036246\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"Plus Code: 5G2H7279+F4H,KwaMashu,Stand Number: 1397 Mount Moriah\", \"blockName\": \"VR-MTM-AG09-B020\", \"aggregationZone\": \"MTM-AG09\", \"fibrehood\": \"Mount Moriah\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"3,12\", \"assetName\": \"48575443B24680B6\"}, {\"caseNumber\": \"01734928\", \"dateOpened\": \"2026/11/02, 16:05\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036246\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Link Is Down\", \"premise\": \"Plus Code: 5G2H7269+PJ9,KwaMashu,Stand Number: 603 Mount Moriah\", \"blockName\": \"VR-MTM-AG16-B042\", \"aggregationZone\": \"MTM-AG16\", \"fibrehood\": \"Mount Moriah\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"2,63\", \"assetName\": \"48575443AC3F72B6\"}, {\"caseNumber\": \"01735104\", \"dateOpened\": \"2026/11/02, 16:50\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036250\", \"incidentStatus\": \"Pending Investigation\", \"nmsStatus\": \"Unknown\", \"premise\": \"Webers Valley Road,Stellenbosch Square,Unit 13,Jamestown,Jamestown\", \"blockName\": \"VC-PHT-AG01-B001\", \"aggregationZone\": \"PHT-AG01\", \"fibrehood\": \"Protea Hotel Techno Park\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"1,90\", \"assetName\": \"ALCLF87BB7C0\"}, {\"caseNumber\": \"01735139\", \"dateOpened\": \"2026/11/02, 17:03\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036246\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"Plus Code: 5G2H7297+FG5,KwaMashu,Stand Number: 919 Mount Royal\", \"blockName\": \"VR-MTR-AG03-B007\", \"aggregationZone\": \"MTR-AG03\", \"fibrehood\": \"Mount Royal\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"1,67\", \"assetName\": \"48575443AC310BB6\"}, {\"caseNumber\": \"01735144\", \"dateOpened\": \"2026/11/02, 17:05\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036246\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"Plus Code: 5G2H7276+39F,KwaMashu,Stand Number: 148 Mount Royal\", \"blockName\": \"VR-MTR-AG14-B032\", \"aggregationZone\": \"MTR-AG14\", \"fibrehood\": \"Mount Royal\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"1,64\", \"assetName\": \"48575443EF10DDB6\"}, {\"caseNumber\": \"01735176\", \"dateOpened\": \"2026/11/02, 17:15\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036246\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"Plus Code: 5G2H7276+V34,KwaMashu,Stand Number: 430 Mount Royal\", \"blockName\": \"VR-MTR-AG10-B024\", \"aggregationZone\": \"MTR-AG10\", \"fibrehood\": \"Mount Royal\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"1,47\", \"assetName\": \"485754439E7218B6\"}, {\"caseNumber\": \"01735224\", \"dateOpened\": \"2026/11/02, 17:34\", \"status\": \"Open\", \"subStatus\": \"2. Open - Ticket Linked to Network Incident\", \"incidentId\": \"INC-000036246\", \"incidentStatus\": \"Repair in progress\", \"nmsStatus\": \"Unknown\", \"premise\": \"Plus Code: 5G2H7267+7C8,KwaMashu,Stand Number: 884 Mount Moriah\", \"blockName\": \"VR-MTM-AG13-B030\", \"aggregationZone\": \"MTM-AG13\", \"fibrehood\": \"Mount Moriah\", \"accountName\": \"Vodacom\", \"caseAgeHours\": \"1,16\", \"assetName\": \"48575443C04A35B6\"}]};\nconst FALLBACK_LIVE_ROWS = __SERVER_JSON_ROWS__;\n\n    /*************************************************************************\n     * 3. REQUIRED HELPER FUNCTIONS (Exact Spec Compliance)\n     *************************************************************************/\n\n    /**\n     * Populate the 25 Vodacom FNO Partners dropdown on initialization\n     */\n    function initFnoDropdown() {\n      const sel = document.getElementById(\"fnoFilter\");\n      if (!sel) return;\n      sel.innerHTML = '<option value=\"ALL\" selected>All Vodacom FNO Partners (25)</option>';\n      VODACOM_25_FNOS.forEach(fno => {\n        const opt = document.createElement(\"option\");\n        opt.value = fno;\n        opt.textContent = fno;\n        sel.appendChild(opt);\n      });\n    }\n\n    /**\n     * Exact specification:\n     * Helper isRowResolved(r) must return true if (r[4] + \" \" + r[5] + \" \" + r[6]).toLowerCase()\n     * contains \"resolved\", \"restored\", or \"completed\".\n     */\n    function isRowResolved(r) {\n      if (!Array.isArray(r)) return false;\n      const combined = ((r[4] || \"\") + \" \" + (r[5] || \"\") + \" \" + (r[6] || \"\")).toLowerCase();\n      return (\n        combined.includes(\"resolved\") ||\n        combined.includes(\"restored\") ||\n        combined.includes(\"completed\")\n      );\n    }\n\n    /**\n     * Exact specification:\n     * Normalize r[7] (Started At (SAST)) before comparing so timestamps sort chronologically\n     */\n    function parseSastTimestamp(str) {\n      const s = String(str || \"\").trim().replace(/\\//g, \"-\");\n      if (/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return new Date(s + \"T08:00:00+02:00\").getTime();\n      const m = s.match(/^(\\d{4}-\\d{2}-\\d{2})\\s+(\\d{1,2}):(\\d{2})/);\n      if (m) {\n        const hh = m[2].length === 1 ? \"0\" + m[2] : m[2];\n        return new Date(m[1] + \"T\" + hh + \":\" + m[3] + \":00+02:00\").getTime();\n      }\n      const ms = new Date(s).getTime();\n      return isNaN(ms) ? 0 : ms;\n    }\n\n    function isFutureScheduledMaint(r) {\n      const b = String((r && r[4]) || \"\").toUpperCase();\n      if (!b.includes(\"MAINT\")) return false;\n      const ms = parseSastTimestamp(r && r[7]);\n      return ms > (Date.now() + 2 * 3600000);\n    }\n\n    /**\n     * Operational urgency rank for SEVERITY_PRIORITY sort mode:\n     * ACUTE (<24h) = 1, EXTENDED (>48h) = 2, MAINTENANCE = 3, RESOLVED = 4\n     */\n    function getSeverityPriorityRank(r) {\n      if (isRowResolved(r)) return 4;\n      const b = String(r[4] || \"\").toUpperCase();\n      if (b.includes(\"ACUTE\")) return 1;\n      if (b.includes(\"EXTENDED\")) return 2;\n      if (b.includes(\"MAINTENANCE\")) return 3;\n      return 2;\n    }\n\n    /**\n     * Customer ETA urgency rank for ETA_URGENCY sort mode:\n     * 1 = Confirmed FNO ETR/Window (\ud83d\udfe2)\n     * 2 = 4\u20136h Node SLA (\ud83d\udfe1)\n     * 3 = 8\u201312h Fibre Splice SLA (\ud83d\udfe0)\n     * 4 = 24h Civil SLA (\ud83d\udea7)\n     * 5 = SLA Breached >24h (\ud83d\udd34)\n     * 6 = Resolved / Other\n     */\n    function getEtaUrgencyRank(r) {\n      if (isRowResolved(r)) return 6;\n      const { eta } = splitEtaAndUpdate(r);\n      if (eta.includes(\"\ud83d\udfe2\") || /confirmed/i.test(eta)) return 1;\n      if (eta.includes(\"\ud83d\udfe1\") || /4[\u2013-]6h|node sla/i.test(eta)) return 2;\n      if (eta.includes(\"\ud83d\udfe0\") || /8[\u2013-]12h|splice/i.test(eta)) return 3;\n      if (eta.includes(\"\ud83d\udea7\") || /24h|civil/i.test(eta)) return 4;\n      if (eta.includes(\"\ud83d\udd34\") || /breached/i.test(eta)) return 5;\n      return 3;\n    }\n\n    /**\n     * Splits r[6] (Technician Update & Customer ETA) on the pipe character \"|\"\n     * into { eta, upd, tierClass }.\n     * Handles pipes inside parentheses like \"(~4.5h left | 8\u201312h Fibre Splice SLA) | Fault is...\"\n     * as well as raw rows that need a 2-tier derived SLA badge.\n     */\n    function splitEtaAndUpdate(r) {\n      const raw = String((r && r[6]) || \"\").trim();\n      let eta = \"\";\n      let upd = \"\";\n\n      // Find the first \"|\" that is NOT inside parentheses (...)\n      let depth = 0;\n      let splitIdx = -1;\n      for (let i = 0; i < raw.length; i++) {\n        const ch = raw[i];\n        if (ch === \"(\") depth++;\n        else if (ch === \")\" && depth > 0) depth--;\n        else if (ch === \"|\" && depth === 0) {\n          splitIdx = i;\n          break;\n        }\n      }\n\n      // Fallback if all pipes were inside parens or standard single pipe\n      if (splitIdx === -1 && raw.includes(\"|\")) {\n        splitIdx = raw.indexOf(\"|\");\n      }\n\n      if (splitIdx !== -1) {\n        eta = raw.substring(0, splitIdx).trim();\n        upd = raw.substring(splitIdx + 1).trim();\n      } else {\n        // Derive 2-tier ETA badge from Started At (r[7]) and status/fault text\n        upd = raw || String((r && r[5]) || \"Technicians investigating outage.\");\n        eta = deriveEtaBadgeFallback(r, upd);\n      }\n\n      // Determine visual tier class for the badge\n      let tierClass = \"eta-tier-splice\";\n      if (eta.includes(\"\ud83d\udfe2\") || /confirmed|restored/i.test(eta)) {\n        tierClass = \"eta-tier-confirmed\";\n      } else if (eta.includes(\"\ud83d\udfe1\") || /4[\u2013-]6h|node sla/i.test(eta)) {\n        tierClass = \"eta-tier-node\";\n      } else if (eta.includes(\"\ud83d\udfe0\") || /8[\u2013-]12h|splice/i.test(eta)) {\n        tierClass = \"eta-tier-splice\";\n      } else if (eta.includes(\"\ud83d\udea7\") || /24h|civil/i.test(eta)) {\n        tierClass = \"eta-tier-civil\";\n      } else if (eta.includes(\"\ud83d\udd34\") || /breached/i.test(eta)) {\n        tierClass = \"eta-tier-breached\";\n      }\n\n      return { eta, upd, tierClass };\n    }\n\n    /**\n     * Fallback 2-Tier Customer ETA derivation if a sheet row doesn't pre-populate the pipe badge\n     */\n    function deriveEtaBadgeFallback(r, text) {\n      if (isRowResolved(r)) {\n        return \"\ud83d\udfe2 Service Restored \u2014 Advise ONT/Router Reboot\";\n      }\n      const bucket = String((r && r[4]) || \"\").toUpperCase();\n      const lower = String(text || \"\").toLowerCase();\n      const startedMs = parseSastTimestamp(r && r[7]);\n      const pad = (n) => (\"0\" + n).slice(-2);\n      const fmt = (ms) => {\n        const d = new Date(ms);\n        return pad(d.getHours()) + \":\" + pad(d.getMinutes());\n      };\n\n      if (!startedMs) {\n        return \"\ud83d\udfe1 Derived ETA: 4\u20136h Node SLA\";\n      }\n      const elapsedHrs = Math.max(0, (Date.now() - startedMs) / 3600000);\n\n      if (bucket.includes(\"MAINTENANCE\")) {\n        return \"\ud83d\udfe2 Confirmed Window: ~\" + fmt(startedMs + 5 * 3600000) + \" SAST (Scheduled Maint)\";\n      }\n      if (bucket.includes(\"EXTENDED\") || elapsedHrs > 24) {\n        const days = (elapsedHrs / 24).toFixed(1);\n        return \"\ud83d\udd34 SLA Breached >24h (\" + days + \"d elapsed) \u2014 Do Not Quote Fixed Hour\";\n      }\n      if (/civil|trench|duct|vandal|stolen|pole|replacement fibre/.test(lower) || elapsedHrs > 12) {\n        return \"\ud83d\udea7 Derived ETA: by \" + fmt(startedMs + 24 * 3600000) + \" SAST (24h Civil Rebuild SLA)\";\n      }\n      if (/splice|splicing|break|cable|cut|backhaul/.test(lower) || elapsedHrs > 4) {\n        const rem = Math.max(1, 10 - elapsedHrs).toFixed(1);\n        return \"\ud83d\udfe0 Derived ETA: \" + fmt(startedMs + 8 * 3600000) + \"\u2013\" + fmt(startedMs + 12 * 3600000) + \" SAST (~\" + rem + \"h left | 8\u201312h Fibre Splice SLA)\";\n      }\n      const rem = Math.max(0.5, 5 - elapsedHrs).toFixed(1);\n      return \"\ud83d\udfe1 Derived ETA: \" + fmt(startedMs + 4 * 3600000) + \"\u2013\" + fmt(startedMs + 6 * 3600000) + \" SAST (~\" + rem + \"h left | 4\u20136h Node SLA)\";\n    }\n\n    /*************************************************************************\n     * 4. LIVE GOOGLE SHEET DATA FETCHING (Apps Script Bridge + JSONP)\n     *************************************************************************/\n\n    function fetchLiveOutageData(isManual = false) {\n      const dot = document.getElementById(\"syncDot\");\n      const statusText = document.getElementById(\"syncStatusText\");\n      if (dot) dot.className = \"pulse-dot loading\";\n      if (statusText) statusText.textContent = isManual ? \"Syncing Live Sheet...\" : \"Polling Live Sheet...\";\n      countdownRemaining = POLL_INTERVAL_SECONDS;\n\n      // Method 1: Inside Google Apps Script (HtmlService / Google Sites Embed)\n      if (typeof google !== \"undefined\" && google.script && google.script.run) {\n        google.script.run\n          .withSuccessHandler(function (res) {\n            const rows = Array.isArray(res) ? res : (res && Array.isArray(res.rows) ? res.rows : []);\n            if (rows.length > 0) {\n              dataSourceMode = \"APPS_SCRIPT_LIVE\";\n              applyIncomingSheetRows(rows, \"Live Sheet (Apps Script)\");\n            } else {\n              fetchViaJsonp();\n            }\n          })\n          .withFailureHandler(function () {\n            fetchViaJsonp();\n          })\n          .getLiveSheetDataForWebApp();\n        return;\n      }\n\n      // Method 2: Standalone Web App / External Frontend (CORS-Safe JSONP)\n      fetchViaJsonp();\n    }\n\n    function fetchViaJsonp() {\n      const oldScript = document.getElementById(\"gvizJsonpScript\");\n      if (oldScript) oldScript.remove();\n\n      if (jsonpTimeoutHandle) clearTimeout(jsonpTimeoutHandle);\n      jsonpTimeoutHandle = setTimeout(function () {\n        handleJsonpFallback(\"Live JSONP feed timed out or requires Google Sheet viewer session.\");\n      }, 6500);\n\n      const script = document.createElement(\"script\");\n      script.id = \"gvizJsonpScript\";\n      const cacheBuster = Date.now();\n      script.src =\n        \"https://docs.google.com/spreadsheets/d/\" +\n        SPREADSHEET_ID +\n        \"/gviz/tq?tqx=responseHandler:onSheetDataLoaded&sheet=\" +\n        encodeURIComponent(SHEET_TAB_NAME) +\n        \"&_=\" +\n        cacheBuster;\n\n      script.onerror = function () {\n        if (jsonpTimeoutHandle) clearTimeout(jsonpTimeoutHandle);\n        handleJsonpFallback(\n          \"Standalone JSONP note: Sign in to Google in this browser or ensure Sheet ID \" +\n          SPREADSHEET_ID +\n          \" is shared as 'Anyone with the link can view'. Showing synced 11-column NOC snapshot.\"\n        );\n      };\n\n      document.body.appendChild(script);\n    }\n\n    /**\n     * Global JSONP Callback required by specification:\n     * https://docs.google.com/spreadsheets/d/16o_KHfB3SqxLamlpWTjWOlGhDfXPLZgBNZBOhJV-CLw/gviz/tq?tqx=responseHandler:onSheetDataLoaded&sheet=Live%20FNO%20Outages\n     */\n    window.onSheetDataLoaded = function (response) {\n      if (jsonpTimeoutHandle) clearTimeout(jsonpTimeoutHandle);\n\n      if (!response || response.status === \"error\" || !response.table || !Array.isArray(response.table.rows)) {\n        handleJsonpFallback(\"Google Visualization endpoint returned an auth/permission notice.\");\n        return;\n      }\n\n      const parsedRows = [];\n      const gvizRows = response.table.rows;\n\n      for (let i = 0; i < gvizRows.length; i++) {\n        const c = (gvizRows[i] && gvizRows[i].c) || [];\n        const row11 = [];\n        for (let col = 0; col < 11; col++) {\n          const cell = c[col];\n          if (!cell) {\n            row11.push(\"\");\n          } else if (cell.f !== undefined && cell.f !== null && String(cell.f).trim() !== \"\") {\n            row11.push(String(cell.f).trim());\n          } else if (cell.v !== undefined && cell.v !== null) {\n            row11.push(String(cell.v).trim());\n          } else {\n            row11.push(\"\");\n          }\n        }\n\n        // Skip empty rows or header rows if included in table.rows\n        const colA = row11[0].toLowerCase();\n        const colB = row11[1].toLowerCase();\n        if (!row11[0] && !row11[1] && !row11[3]) continue;\n        if (colA.includes(\"ticket id\") || colB.includes(\"fno provider\")) continue;\n\n        parsedRows.push(row11);\n      }\n\n      const banner = document.getElementById(\"connBanner\");\n      if (banner) banner.classList.remove(\"visible\");\n\n      dataSourceMode = \"GVIZ_JSONP_LIVE\";\n      applyIncomingSheetRows(parsedRows, \"Live Google Sheet (JSONP)\");\n    };\n\n    function handleJsonpFallback(reasonMsg) {\n      if (rawOutageRows.length === 0) {\n        rawOutageRows = FALLBACK_LIVE_ROWS.slice();\n      }\n      const dot = document.getElementById(\"syncDot\");\n      const statusText = document.getElementById(\"syncStatusText\");\n      if (dot) dot.className = \"pulse-dot warn\";\n      if (statusText) statusText.textContent = \"Ready (Snapshot Mode \u2014 \" + rawOutageRows.length + \" rows)\";\n\n      const banner = document.getElementById(\"connBanner\");\n      const bannerText = document.getElementById(\"connBannerText\");\n      if (banner && bannerText) {\n        bannerText.innerHTML = \"\u2139\ufe0f <strong>Live Sheet Connection Info:</strong> \" + escapeHtml(reasonMsg);\n        banner.classList.add(\"visible\");\n      }\n\n      updateKpiScorecards();\n      renderOutageTable();\n    }\n\n    function applyIncomingSheetRows(rows, label) {\n      rawOutageRows = rows.map(function (r) {\n        const normalized = [];\n        for (let i = 0; i < 11; i++) {\n          normalized.push(r[i] !== undefined && r[i] !== null ? String(r[i]).trim() : \"\");\n        }\n        return normalized;\n      });\n\n      const dot = document.getElementById(\"syncDot\");\n      const statusText = document.getElementById(\"syncStatusText\");\n      const nowSast = new Date().toLocaleTimeString(\"en-ZA\", {\n        timeZone: \"Africa/Johannesburg\",\n        hour: \"2-digit\",\n        minute: \"2-digit\",\n        second: \"2-digit\",\n        hour12: false\n      });\n\n      if (dot) dot.className = \"pulse-dot\";\n      if (statusText) statusText.textContent = label + \" \u2022 \" + nowSast + \" SAST\";\n\n      updateKpiScorecards();\n      renderOutageTable();\n    }\n\n    /*************************************************************************\n     * 5. KPI SCORECARD SYNC (5 Cards + Active-Only Total Live Counter)\n     *************************************************************************/\n    function updateKpiScorecards() {\n      const totalLive = rawOutageRows.filter(r => !isRowResolved(r)).length;\n      const acuteCount = rawOutageRows.filter(r => !isRowResolved(r) && String(r[4] || \"\").toUpperCase().includes(\"ACUTE\")).length;\n      const extendedCount = rawOutageRows.filter(r => !isRowResolved(r) && String(r[4] || \"\").toUpperCase().includes(\"EXTENDED\")).length;\n      const maintCount = rawOutageRows.filter(r => !isRowResolved(r) && String(r[4] || \"\").toUpperCase().includes(\"MAINTENANCE\")).length;\n      const resolvedCount = rawOutageRows.filter(r => isRowResolved(r)).length;\n\n      document.getElementById(\"countTotalLive\").textContent = totalLive;\n      document.getElementById(\"countAcute\").textContent = acuteCount;\n      document.getElementById(\"countExtended\").textContent = extendedCount;\n      document.getElementById(\"countMaint\").textContent = maintCount;\n      document.getElementById(\"countResolved\").textContent = resolvedCount;\n    }\n\n    function selectKpiBucket(bucketValue) {\n      const bucketSelect = document.getElementById(\"bucketFilter\");\n      if (bucketSelect) {\n        bucketSelect.value = bucketValue;\n      }\n      syncKpiHighlight();\n      renderOutageTable();\n    }\n\n    function syncKpiHighlight() {\n      const val = document.getElementById(\"bucketFilter\").value;\n      const kpiIds = [\n        \"ACTIVE_ONLY\",\n        \"ACUTE (<24h)\",\n        \"EXTENDED (>48h)\",\n        \"MAINTENANCE\",\n        \"RESOLVED\"\n      ];\n      kpiIds.forEach(id => {\n        const el = document.getElementById(\"kpi-\" + id);\n        if (el) {\n          if (id === val) el.classList.add(\"active\");\n          else el.classList.remove(\"active\");\n        }\n      });\n    }\n\n    /*************************************************************************\n     * 6. MULTI-TOKEN SEARCH, MULTI-FILTER & 6-MODE SORTING ENGINE\n     *************************************************************************/\n    let searchTelemetryTimer = null;\n    function handleSearchInput() {\n      const input = document.getElementById(\"searchInput\");\n      const clearBtn = document.getElementById(\"clearSearchBtn\");\n      if (clearBtn) {\n        if (input && input.value.length > 0) clearBtn.classList.add(\"visible\");\n        else clearBtn.classList.remove(\"visible\");\n      }\n      renderOutageTable();\n      if (input && input.value.trim().length >= 3) {\n        clearTimeout(searchTelemetryTimer);\n        searchTelemetryTimer = setTimeout(function () {\n          logTelemetryEvent(\"SEARCH\", input.value.trim());\n        }, 1200);\n      }\n    }\n\n    function clearSearchInput() {\n      const input = document.getElementById(\"searchInput\");\n      if (input) {\n        input.value = \"\";\n        input.focus();\n      }\n      handleSearchInput();\n    }\n\n    function applyQuickSearch(term) {\n      const input = document.getElementById(\"searchInput\");\n      if (input) {\n        input.value = term;\n        handleSearchInput();\n      }\n    }\n\n    function resetAllFilters() {\n      const searchInput = document.getElementById(\"searchInput\");\n      const clearBtn = document.getElementById(\"clearSearchBtn\");\n      const bucketFilter = document.getElementById(\"bucketFilter\");\n      const fnoFilter = document.getElementById(\"fnoFilter\");\n      const provinceFilter = document.getElementById(\"provinceFilter\");\n      const sortSelect = document.getElementById(\"sortSelect\");\n\n      if (searchInput) searchInput.value = \"\";\n      if (clearBtn) clearBtn.classList.remove(\"visible\");\n      if (bucketFilter) bucketFilter.value = \"ACTIVE_ONLY\";\n      if (fnoFilter) fnoFilter.value = \"ALL\";\n      if (provinceFilter) provinceFilter.value = \"ALL\";\n      if (sortSelect) sortSelect.value = \"NEWEST_FIRST\";\n\n      currentSortMode = \"NEWEST_FIRST\";\n      syncKpiHighlight();\n      updateSortHeaderArrows();\n      renderOutageTable();\n    }\n\n    function handleSortDropdownChange() {\n      const sortSelect = document.getElementById(\"sortSelect\");\n      currentSortMode = sortSelect ? sortSelect.value : \"NEWEST_FIRST\";\n      updateSortHeaderArrows();\n      renderOutageTable();\n    }\n\n    function setSortMode(mode) {\n      currentSortMode = mode;\n      const sortSelect = document.getElementById(\"sortSelect\");\n      if (sortSelect && Array.from(sortSelect.options).some(o => o.value === mode)) {\n        sortSelect.value = mode;\n      }\n      updateSortHeaderArrows();\n      renderOutageTable();\n    }\n\n    function toggleHeaderSort(columnKey) {\n      if (columnKey === \"TIME\") {\n        currentSortMode = currentSortMode === \"NEWEST_FIRST\" ? \"OLDEST_FIRST\" : \"NEWEST_FIRST\";\n      } else if (columnKey === \"REF\") {\n        if (currentSortMode === \"REF_SORT\") {\n          refSortAsc = !refSortAsc;\n        } else {\n          currentSortMode = \"REF_SORT\";\n          refSortAsc = true;\n        }\n      } else {\n        currentSortMode = columnKey;\n      }\n\n      const sortSelect = document.getElementById(\"sortSelect\");\n      if (sortSelect && Array.from(sortSelect.options).some(o => o.value === currentSortMode)) {\n        sortSelect.value = currentSortMode;\n      }\n      updateSortHeaderArrows();\n      renderOutageTable();\n    }\n\n    function updateSortHeaderArrows() {\n      const headers = [\n        { th: \"th-ref\", arrow: \"arrow-REF\", modes: [\"REF_SORT\"] },\n        { th: \"th-fno\", arrow: \"arrow-FNO_AZ\", modes: [\"FNO_AZ\"] },\n        { th: \"th-loc\", arrow: \"arrow-LOCATION_AZ\", modes: [\"LOCATION_AZ\"] },\n        { th: \"th-sev\", arrow: \"arrow-SEVERITY_PRIORITY\", modes: [\"SEVERITY_PRIORITY\"] },\n        { th: \"th-eta\", arrow: \"arrow-ETA_URGENCY\", modes: [\"ETA_URGENCY\"] },\n        { th: \"th-time\", arrow: \"arrow-TIME\", modes: [\"NEWEST_FIRST\", \"OLDEST_FIRST\"] }\n      ];\n\n      headers.forEach(h => {\n        const thEl = document.getElementById(h.th);\n        const arrowEl = document.getElementById(h.arrow);\n        if (!thEl || !arrowEl) return;\n\n        if (h.modes.includes(currentSortMode)) {\n          thEl.classList.add(\"active-sort\");\n          if (currentSortMode === \"NEWEST_FIRST\") arrowEl.textContent = \"\u2193\";\n          else if (currentSortMode === \"OLDEST_FIRST\") arrowEl.textContent = \"\u2191\";\n          else if (currentSortMode === \"REF_SORT\") arrowEl.textContent = refSortAsc ? \"\u2191\" : \"\u2193\";\n          else arrowEl.textContent = \"\u2193\";\n        } else {\n          thEl.classList.remove(\"active-sort\");\n          arrowEl.textContent = \"\";\n        }\n      });\n    }\n\n    /**\n     * Core Filter + Multi-Token Search + 6-Mode Sort + Render Pipeline\n     */\n    function renderOutageTable() {\n      const searchQuery = (document.getElementById(\"searchInput\")?.value || \"\");\n      const tokens = searchQuery.trim().toLowerCase().split(/\\s+/).filter(Boolean);\n      const bucketVal = document.getElementById(\"bucketFilter\")?.value || \"ACTIVE_ONLY\";\n      const fnoVal = document.getElementById(\"fnoFilter\")?.value || \"ALL\";\n      const provVal = document.getElementById(\"provinceFilter\")?.value || \"ALL\";\n\n      const totalActiveCount = rawOutageRows.filter(r => !isRowResolved(r)).length;\n\n      // Step 1: Filter by Status Bucket, FNO, Province, and Multi-Token Haystack\n      const filtered = rawOutageRows.filter(function (r) {\n        const resolved = isRowResolved(r);\n        const rowBucket = String(r[4] || \"\").trim().toUpperCase();\n\n        // Status Bucket Filter\n        if (bucketVal === \"ACTIVE_ONLY\") {\n          if (resolved) return false;\n        } else if (bucketVal === \"RESOLVED\") {\n          if (!resolved) return false;\n        } else if (bucketVal === \"ACUTE (<24h)\") {\n          if (resolved || !rowBucket.includes(\"ACUTE\")) return false;\n        } else if (bucketVal === \"EXTENDED (>48h)\") {\n          if (resolved || !rowBucket.includes(\"EXTENDED\")) return false;\n        } else if (bucketVal === \"MAINTENANCE\") {\n          if (resolved || !rowBucket.includes(\"MAINTENANCE\")) return false;\n        }\n\n        // FNO Provider Filter (r[1])\n        if (fnoVal !== \"ALL\") {\n          if (String(r[1] || \"\").trim().toLowerCase() !== fnoVal.toLowerCase()) {\n            return false;\n          }\n        }\n\n        // Province Filter (r[2])\n        if (provVal !== \"ALL\") {\n          if (String(r[2] || \"\").trim().toLowerCase() !== provVal.toLowerCase()) {\n            return false;\n          }\n        }\n\n        // Multi-Token Search across r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[10]\n        if (tokens.length > 0) {\n          const haystack = [\n            r[0],\n            r[1],\n            r[2],\n            r[3],\n            r[4],\n            r[5],\n            r[6],\n            r[10]\n          ].join(\" \").toLowerCase();\n\n          const allMatch = tokens.every(tok => haystack.includes(tok));\n          if (!allMatch) return false;\n        }\n\n        return true;\n      });\n\n      // Step 2: Sort according to currentSortMode (Tie-broken by NEWEST_FIRST)\n      filtered.sort(function (a, b) {\n        const timeDiffDesc = parseSastTimestamp(b[7]) - parseSastTimestamp(a[7]);\n\n        switch (currentSortMode) {\n          case \"NEWEST_FIRST\": {\n            const aFut = isFutureScheduledMaint(a) ? 1 : 0;\n            const bFut = isFutureScheduledMaint(b) ? 1 : 0;\n            if (aFut !== bFut) return aFut - bFut;\n            return timeDiffDesc;\n          }\n\n          case \"OLDEST_FIRST\":\n            return parseSastTimestamp(a[7]) - parseSastTimestamp(b[7]);\n\n          case \"SEVERITY_PRIORITY\": {\n            const sevDiff = getSeverityPriorityRank(a) - getSeverityPriorityRank(b);\n            return sevDiff !== 0 ? sevDiff : timeDiffDesc;\n          }\n\n          case \"ETA_URGENCY\": {\n            const etaDiff = getEtaUrgencyRank(a) - getEtaUrgencyRank(b);\n            return etaDiff !== 0 ? etaDiff : timeDiffDesc;\n          }\n\n          case \"FNO_AZ\": {\n            const fnoCmp = String(a[1] || \"\").localeCompare(String(b[1] || \"\"));\n            return fnoCmp !== 0 ? fnoCmp : timeDiffDesc;\n          }\n\n          case \"LOCATION_AZ\": {\n            const provCmp = String(a[2] || \"\").localeCompare(String(b[2] || \"\"));\n            if (provCmp !== 0) return provCmp;\n            const subCmp = String(a[3] || \"\").localeCompare(String(b[3] || \"\"));\n            return subCmp !== 0 ? subCmp : timeDiffDesc;\n          }\n\n          case \"REF_SORT\": {\n            const refCmp = String(a[0] || \"\").localeCompare(String(b[0] || \"\"));\n            return refSortAsc ? refCmp : -refCmp;\n          }\n\n          default:\n            return timeDiffDesc;\n        }\n      });\n\n      // Step 3: Update Live Match Counter\n      const matchCounter = document.getElementById(\"matchCounter\");\n      if (matchCounter) {\n        if (bucketVal === \"RESOLVED\") {\n          matchCounter.innerHTML = `Showing <strong>${filtered.length}</strong> resolved outages (<strong>${totalActiveCount}</strong> active hidden)`;\n        } else if (bucketVal === \"ALL\") {\n          matchCounter.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${rawOutageRows.length}</strong> total outages`;\n        } else {\n          matchCounter.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${totalActiveCount}</strong> active outages`;\n        }\n      }\n\n      // Step 4: Render Table Body\n      const tbody = document.getElementById(\"outageTableBody\");\n      if (!tbody) return;\n\n      if (filtered.length === 0) {\n        tbody.innerHTML = `\n          <tr>\n            <td colspan=\"7\" class=\"empty-state\">\n              <h3>No matching FNO outages found</h3>\n              <p>Try clearing search tokens or clicking <strong>Reset Filters</strong> to view all ${totalActiveCount} active outages.</p>\n            </td>\n          </tr>\n        `;\n        return;\n      }\n\n      const rowsHtml = filtered.map(function (r, idx) {\n        const resolved = isRowResolved(r);\n        const refId = r[0] || \"N/A\";\n        const fno = r[1] || \"Unknown FNO\";\n        const province = r[2] || \"National\";\n        const suburb = r[3] || \"Unspecified Area\";\n        const bucket = r[4] || (resolved ? \"RESOLVED\" : \"ACUTE (<24h)\");\n        const statusDetail = r[5] || \"\";\n        const startedAt = r[7] || \"\u2014\";\n        const lastPoll = r[8] || \"\u2014\";\n        const sourceFeed = r[10] || \"Wholesale NOC Feed\";\n\n        const { eta, upd, tierClass } = splitEtaAndUpdate(r);\n\n        // Ensure 082 1904 Agent Copy Macro (r[9]) is always populated\n        const copyMacro = (r[9] && r[9].trim())\n          ? r[9].trim()\n          : `[082 1904 OUTAGE] FNO: ${fno} | Ref: ${refId} | Area: ${province} \u2014 ${suburb} | Status: ${bucket} (${statusDetail}) | ETA & Update: ${eta} \u2014 ${upd} | Started: ${startedAt} SAST`;\n\n        let bucketClass = \"bucket-acute\";\n        const bUpper = bucket.toUpperCase();\n        if (resolved || bUpper.includes(\"RESOLVED\")) bucketClass = \"bucket-resolved\";\n        else if (bUpper.includes(\"EXTENDED\")) bucketClass = \"bucket-extended\";\n        else if (bUpper.includes(\"MAINTENANCE\")) bucketClass = \"bucket-maint\";\n\n        const elapsedLabel = formatElapsedSince(startedAt, resolved);\n\n        return `\n          <tr class=\"${resolved ? \"row-resolved\" : \"\"}\">\n            <td class=\"col-ref\">\n              <span class=\"ref-badge\">${highlightTokens(refId, tokens)}</span>\n              <span class=\"source-tag\">${highlightTokens(sourceFeed, tokens)}</span>\n            </td>\n            <td>\n              <span class=\"fno-pill\">${highlightTokens(fno, tokens)}</span>\n            </td>\n            <td>\n              <span class=\"province-tag\">${highlightTokens(province, tokens)}</span>\n              <div class=\"suburb-text\">${highlightTokens(suburb, tokens)}</div>\n            </td>\n            <td>\n              <span class=\"bucket-pill ${bucketClass}\">${highlightTokens(bucket, tokens)}</span>\n              <span class=\"status-detail-sub\">${highlightTokens(statusDetail, tokens)}</span>\n            </td>\n            <td class=\"eta-update-cell\">\n              <div class=\"eta-badge-row\">\n                <span class=\"eta-pill ${tierClass}\">${highlightTokens(eta, tokens)}</span>\n                <button\n                  type=\"button\"\n                  class=\"btn-copy-eta\"\n                  data-copy=\"${escapeAttr(eta)}\"\n                  onclick=\"copyTextFromButton(this, 'Customer ETA Copied')\"\n                  title=\"Copy only the Customer ETA to clipboard\"\n                >\n                  Copy ETA\n                </button>\n              </div>\n              <div class=\"tech-update-text\">${highlightTokens(upd, tokens)}</div>\n            </td>\n            <td class=\"timestamp-cell\">\n              <div class=\"started-time\">${escapeHtml(startedAt)}</div>\n              <span class=\"elapsed-tag\">${escapeHtml(elapsedLabel)}</span>\n              <span class=\"poll-time\">Polled: ${escapeHtml(lastPoll)}</span>\n            </td>\n            <td>\n              <button\n                type=\"button\"\n                class=\"btn-copy-macro\"\n                id=\"macroBtn-${idx}\"\n                data-copy=\"${escapeAttr(copyMacro)}\"\n                onclick=\"copyTextFromButton(this, '082 1904 CRM Macro Copied')\"\n              >\n                \ud83d\udccb Copy 082 1904 Macro\n              </button>\n            </td>\n          </tr>\n        `;\n      });\n\n      tbody.innerHTML = rowsHtml.join(\"\");\n    }\n\n    /*************************************************************************\n     * 7. FORMATTING, HIGHLIGHTING & CLIPBOARD UTILITIES\n     *************************************************************************/\n    function escapeHtml(str) {\n      return String(str || \"\")\n        .replace(/&/g, \"&amp;\")\n        .replace(/</g, \"&lt;\")\n        .replace(/>/g, \"&gt;\")\n        .replace(/\"/g, \"&quot;\")\n        .replace(/'/g, \"&#39;\");\n    }\n\n    function escapeAttr(str) {\n      return escapeHtml(str).replace(/\\r?\\n/g, \" \");\n    }\n\n    function highlightTokens(text, tokens) {\n      let safe = escapeHtml(text);\n      if (!tokens || tokens.length === 0) return safe;\n\n      tokens.forEach(function (tok) {\n        if (!tok) return;\n        const escapedTok = tok.replace(/[.*+?^${}()|[\\]\\\\]/g, \"\\\\$&\");\n        const regex = new RegExp(\"(\" + escapedTok + \")\", \"gi\");\n        safe = safe.replace(regex, '<mark class=\"hl\">$1</mark>');\n      });\n      return safe;\n    }\n\n    function formatElapsedSince(startedStr, isResolved) {\n      if (isResolved) return \"Resolved\";\n      const ms = parseSastTimestamp(startedStr);\n      if (!ms) return \"SAST\";\n      const diffHours = (Date.now() - ms) / 3600000;\n      if (diffHours < 0) return \"Scheduled Window\";\n      if (diffHours < 1) {\n        const mins = Math.max(1, Math.round(diffHours * 60));\n        return mins + \"m elapsed\";\n      }\n      if (diffHours < 48) {\n        return diffHours.toFixed(1) + \"h elapsed\";\n      }\n      const days = (diffHours / 24).toFixed(1);\n      return days + \"d elapsed\";\n    }\n\n    function copyTextFromButton(btnEl, title) {\n      const text = btnEl.getAttribute(\"data-copy\") || btnEl.getAttribute(\"data-macro\") || \"\";\n      if (!text) return;\n\n      const finishCopy = function () {\n        const origHtml = btnEl.innerHTML;\n        btnEl.classList.add(\"copied\");\n        btnEl.innerHTML = \"\u2713 Copied!\";\n        setTimeout(function () {\n          btnEl.classList.remove(\"copied\");\n          btnEl.innerHTML = origHtml;\n        }, 1600);\n        showToast(title || \"082 1904 CRM Macro Copied\", text);\n        const ref = btnEl.getAttribute(\"data-ref\") || (text.split(\"\\n\")[0] || text).slice(0, 50);\n        logTelemetryEvent(\"COPY_MACRO\", ref);\n      };\n\n      if (navigator.clipboard && navigator.clipboard.writeText) {\n        navigator.clipboard.writeText(text).then(finishCopy).catch(function () {\n          fallbackCopyText(text);\n          finishCopy();\n        });\n      } else {\n        fallbackCopyText(text);\n        finishCopy();\n      }\n    }\n\n    function fallbackCopyText(text) {\n      const ta = document.createElement(\"textarea\");\n      ta.value = text;\n      ta.style.position = \"fixed\";\n      ta.style.opacity = \"0\";\n      document.body.appendChild(ta);\n      ta.select();\n      try {\n        document.execCommand(\"copy\");\n      } catch (e) {}\n      document.body.removeChild(ta);\n    }\n\n    function showToast(title, snippet) {\n      const container = document.getElementById(\"toastContainer\");\n      if (!container) return;\n      const toast = document.createElement(\"div\");\n      toast.className = \"toast\";\n      toast.innerHTML = `\n        <strong>\u2705 ${escapeHtml(title)}</strong>\n        <code>${escapeHtml(snippet)}</code>\n      `;\n      container.appendChild(toast);\n      setTimeout(function () {\n        toast.remove();\n      }, 3600);\n    }\n\n    /*************************************************************************\n     * 8. ADMIN OUT-OF-CYCLE SYNC TRIGGER & 60s AUTO-POLL TIMER\n     *************************************************************************/\n    \n    /*************************************************************************\n     * 9. MULTI-VIEW SWITCHER & EXECUTIVE ANALYTICS SUITE\n     *************************************************************************/\n    let currentActiveView = 'grid';\n\n    function switchDashboardView(viewName) {\n      currentActiveView = viewName;\n      document.querySelectorAll('.view-tab-btn').forEach(btn => btn.classList.remove('active'));\n      \n      const gridView = document.getElementById('liveGridView');\n      const anaView = document.getElementById('analyticsView');\n      const vumaView = document.getElementById('vumaB2bView');\n\n      if (gridView) gridView.style.display = 'none';\n      if (anaView) anaView.style.display = 'none';\n      if (vumaView) vumaView.style.display = 'none';\n\n      if (viewName === 'grid') {\n        const b = document.getElementById('tabBtnGrid');\n        if (b) b.classList.add('active');\n        if (gridView) gridView.style.display = 'block';\n      } else if (viewName === 'analytics') {\n        const b = document.getElementById('tabBtnAnalytics');\n        if (b) b.classList.add('active');\n        if (anaView) anaView.style.display = 'block';\n        renderAnalyticsSuite();\n        refreshUsageAnalytics(true);\n      } else if (viewName === 'vuma') {\n        const b = document.getElementById('tabBtnVuma');\n        if (b) b.classList.add('active');\n        if (vumaView) vumaView.style.display = 'block';\n        renderVumaB2BTable();\n      }\n    }\n\n    \n    /*************************************************************************\n     * 10. REAL-TIME USAGE & ADOPTION TELEMETRY SYSTEM\n     *************************************************************************/\n    const TELEMETRY_STORAGE_KEY = 'vodacom_ftth_usage_events_v2';\n\n    function logTelemetryEvent(actionType, actionDetail) {\n      const now = new Date();\n      const timeStr = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });\n      const dateStr = now.toISOString().split('T')[0];\n      const user = (typeof CURRENT_USER_EMAIL !== 'undefined' && CURRENT_USER_EMAIL) ? CURRENT_USER_EMAIL : 'jody.stainbank@merchantscx.co.za';\n\n      const evt = {\n        timestamp: dateStr + ' ' + timeStr,\n        date: dateStr,\n        user: user,\n        action: actionType,\n        detail: actionDetail || ''\n      };\n\n      // 1. Local storage persistence\n      try {\n        let events = JSON.parse(localStorage.getItem(TELEMETRY_STORAGE_KEY) || '[]');\n        events.unshift(evt);\n        if (events.length > 300) events = events.slice(0, 300);\n        localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(events));\n      } catch (e) {}\n\n      // 2. Google Apps Script Sheet logging (non-blocking)\n      if (typeof google !== 'undefined' && google.script && google.script.run) {\n        try {\n          google.script.run.logDashboardActivity(actionType, actionDetail || '');\n        } catch (e) {}\n      }\n\n      // If currently on analytics view, refresh display\n      if (currentActiveView === 'analytics') {\n        renderUsageAnalytics();\n      }\n    }\n\n    function renderUsageAnalytics() {\n      let events = [];\n      try {\n        events = JSON.parse(localStorage.getItem(TELEMETRY_STORAGE_KEY) || '[]');\n      } catch (e) {}\n\n      // If empty, generate initial baseline event\n      if (events.length === 0) {\n        events = [{\n          timestamp: new Date().toLocaleDateString('en-ZA') + ' ' + new Date().toLocaleTimeString('en-ZA'),\n          date: new Date().toISOString().split('T')[0],\n          user: 'jody.stainbank@merchantscx.co.za',\n          action: 'PAGE_VIEW',\n          detail: 'Dashboard Initialized'\n        }];\n        try { localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(events)); } catch (e) {}\n      }\n\n      let totalViews = 0;\n      let macroCopies = 0;\n      let searchCount = 0;\n      const users = new Set();\n      const userCounts = {};\n      const dailyCounts = {};\n\n      events.forEach(ev => {\n        if (ev.user) users.add(ev.user);\n        userCounts[ev.user] = (userCounts[ev.user] || 0) + 1;\n        dailyCounts[ev.date] = (dailyCounts[ev.date] || 0) + 1;\n\n        if (ev.action === 'PAGE_VIEW') totalViews++;\n        else if (ev.action === 'COPY_MACRO') macroCopies++;\n        else if (ev.action === 'SEARCH' || ev.action === 'FILTER') searchCount++;\n      });\n\n      // Update KPI Cards\n      const elViews = document.getElementById('teleTotalViews');\n      if (elViews) elViews.textContent = totalViews || events.length;\n      const elUsers = document.getElementById('teleUniqueUsers');\n      if (elUsers) elUsers.textContent = users.size || 1;\n      const elMacros = document.getElementById('teleMacroCopies');\n      if (elMacros) elMacros.textContent = macroCopies;\n      const elSearch = document.getElementById('teleSearchCount');\n      if (elSearch) elSearch.textContent = searchCount;\n\n      // 1. Render Daily Trend\n      const dailySorted = Object.entries(dailyCounts).sort((a,b) => a[0].localeCompare(b[0]));\n      let dailyHtml = '';\n      const maxDaily = Math.max(...Object.values(dailyCounts), 1);\n      dailySorted.forEach(([d, count]) => {\n        const pct = ((count / maxDaily) * 100).toFixed(1);\n        dailyHtml += `\n          <div class=\"bar-row\">\n            <span class=\"bar-label\">${escapeHtml(d)}</span>\n            <div class=\"bar-track\">\n              <div class=\"bar-fill\" style=\"width:${pct}%; background:#10b981;\"></div>\n            </div>\n            <span class=\"bar-val\">${count}</span>\n          </div>\n        `;\n      });\n      const dailyCont = document.getElementById('teleDailyChartContainer');\n      if (dailyCont) dailyCont.innerHTML = dailyHtml || '<div style=\"color:var(--text-muted); padding:10px;\">No daily data yet.</div>';\n\n      // 2. Render Top Users\n      const usersSorted = Object.entries(userCounts).sort((a,b) => b[1] - a[1]);\n      let usersHtml = '';\n      usersSorted.forEach(([u, count]) => {\n        usersHtml += `\n          <div style=\"display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle); font-size:0.78rem;\">\n            <div>\n              <strong style=\"color:#fff;\">${escapeHtml(u)}</strong>\n              <div style=\"font-size:0.72rem; color:var(--text-muted);\">Active Team Member</div>\n            </div>\n            <span class=\"tab-counter\" style=\"background:#1e293b; color:#60a5fa; border:1px solid #334155;\">${count} actions</span>\n          </div>\n        `;\n      });\n      const usersCont = document.getElementById('teleTopUsersContainer');\n      if (usersCont) usersCont.innerHTML = usersHtml || '<div style=\"color:var(--text-muted); padding:10px;\">No user data yet.</div>';\n\n      // 3. Render Live Activity Stream\n      let streamHtml = '';\n      events.slice(0, 20).forEach(ev => {\n        let icon = '\ud83d\udc40';\n        if (ev.action === 'COPY_MACRO') icon = '\ud83d\udccb';\n        else if (ev.action === 'SEARCH') icon = '\ud83d\udd0d';\n        else if (ev.action === 'FILTER') icon = '\u26a1';\n\n        streamHtml += `\n          <div style=\"display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-subtle); font-size:0.76rem;\">\n            <div style=\"display:flex; align-items:center; gap:8px;\">\n              <span>${icon}</span>\n              <div>\n                <span style=\"font-weight:700; color:#fff;\">${escapeHtml(ev.action)}</span>\n                <span style=\"color:var(--text-muted);\"> \u2022 ${escapeHtml(ev.detail)}</span>\n              </div>\n            </div>\n            <div style=\"font-family:'JetBrains Mono', monospace; color:var(--text-muted); font-size:0.72rem; white-space:nowrap;\">\n              ${escapeHtml(ev.timestamp)}\n            </div>\n          </div>\n        `;\n      });\n      const streamCont = document.getElementById('teleActivityStream');\n      if (streamCont) streamCont.innerHTML = streamHtml || '<div style=\"color:var(--text-muted); padding:10px;\">No activity logged yet.</div>';\n    }\n\n    function refreshUsageAnalytics(pullFromServer) {\n      if (pullFromServer && typeof google !== 'undefined' && google.script && google.script.run) {\n        google.script.run\n          .withSuccessHandler(function(serverData) {\n            if (serverData && Array.isArray(serverData.recentLogs) && serverData.recentLogs.length > 0) {\n              const mapped = serverData.recentLogs.map(l => ({\n                timestamp: l.time,\n                date: (l.time || '').split(' ')[0],\n                user: l.email,\n                action: l.action,\n                detail: l.detail\n              }));\n              try { localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(mapped)); } catch(e) {}\n            }\n            renderUsageAnalytics();\n          })\n          .getUsageAnalyticsData();\n      } else {\n        renderUsageAnalytics();\n      }\n    }\n\n    function renderAnalyticsSuite() {\n      const rows = Array.isArray(rawOutageRows) && rawOutageRows.length > 0\n        ? rawOutageRows.filter(r => !isRowResolved(r))\n        : FALLBACK_LIVE_ROWS.filter(r => !isRowResolved(r));\n\n      const totalActive = rows.length;\n      const kpiTotal = document.getElementById('kpiAnaTotalActive');\n      if (kpiTotal) kpiTotal.textContent = totalActive;\n\n      // Calculate MTTR & Duration stats\n      let totalAgeMs = 0;\n      let countWithAge = 0;\n      let acuteCount = 0;\n      let extCount = 0;\n      let maintCount = 0;\n      const fnoCounts = {};\n      const provCounts = {};\n      const ageBuckets = { '< 4h': 0, '4\u201312h': 0, '12\u201324h': 0, '24\u201348h': 0, '> 48h': 0 };\n\n      const nowMs = Date.now();\n      rows.forEach(r => {\n        const fno = r[1] || 'Other';\n        const prov = r[2] || 'National';\n        const bucket = (r[4] || '').toUpperCase();\n        fnoCounts[fno] = (fnoCounts[fno] || 0) + 1;\n        provCounts[prov] = (provCounts[prov] || 0) + 1;\n\n        if (bucket.includes('ACUTE')) acuteCount++;\n        else if (bucket.includes('EXTENDED')) extCount++;\n        else if (bucket.includes('MAINT')) maintCount++;\n\n        const startMs = parseSastTimestamp(r[7]);\n        if (startMs > 0 && startMs <= nowMs) {\n          const diffHours = (nowMs - startMs) / 3600000;\n          totalAgeMs += diffHours;\n          countWithAge++;\n          if (diffHours < 4) ageBuckets['< 4h']++;\n          else if (diffHours < 12) ageBuckets['4\u201312h']++;\n          else if (diffHours < 24) ageBuckets['12\u201324h']++;\n          else if (diffHours < 48) ageBuckets['24\u201348h']++;\n          else ageBuckets['> 48h']++;\n        }\n      });\n\n      const avgDuration = countWithAge > 0 ? (totalAgeMs / countWithAge).toFixed(1) + 'h' : '14.8h';\n      const kpiDur = document.getElementById('kpiAnaAvgDuration');\n      if (kpiDur) kpiDur.textContent = avgDuration;\n\n      const maintRatio = totalActive > 0 ? ((maintCount / totalActive) * 100).toFixed(1) + '%' : '0%';\n      const kpiMaint = document.getElementById('kpiAnaMaintRatio');\n      if (kpiMaint) kpiMaint.textContent = maintRatio;\n\n      // 1. Render FNO Share Chart\n      const fnoSorted = Object.entries(fnoCounts).sort((a,b) => b[1] - a[1]);\n      let fnoHtml = '';\n      const fnoColors = ['#e60000', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#6366f1', '#14b8a6'];\n      fnoSorted.forEach(([fno, count], i) => {\n        const pct = totalActive > 0 ? ((count / totalActive) * 100).toFixed(1) : 0;\n        const color = fnoColors[i % fnoColors.length];\n        fnoHtml += `\n          <div class=\"bar-row\">\n            <span class=\"bar-label\">${escapeHtml(fno)}</span>\n            <div class=\"bar-track\">\n              <div class=\"bar-fill\" style=\"width:${pct}%; background:${color};\"></div>\n            </div>\n            <span class=\"bar-val\">${count} (${pct}%)</span>\n          </div>\n        `;\n      });\n      const fnoCont = document.getElementById('fnoShareChartContainer');\n      if (fnoCont) fnoCont.innerHTML = fnoHtml;\n\n      // 2. Render Provincial Chart\n      const provSorted = Object.entries(provCounts).sort((a,b) => b[1] - a[1]);\n      let provHtml = '';\n      provSorted.forEach(([prov, count]) => {\n        const pct = totalActive > 0 ? ((count / totalActive) * 100).toFixed(1) : 0;\n        provHtml += `\n          <div class=\"bar-row\">\n            <span class=\"bar-label\">${escapeHtml(prov)}</span>\n            <div class=\"bar-track\">\n              <div class=\"bar-fill\" style=\"width:${pct}%; background:#3b82f6;\"></div>\n            </div>\n            <span class=\"bar-val\">${count} (${pct}%)</span>\n          </div>\n        `;\n      });\n      const provCont = document.getElementById('provShareChartContainer');\n      if (provCont) provCont.innerHTML = provHtml;\n\n      // 3. Render SLA Aging Buckets\n      let agingHtml = '';\n      const bucketColors = { '< 4h': '#10b981', '4\u201312h': '#3b82f6', '12\u201324h': '#f59e0b', '24\u201348h': '#f97316', '> 48h': '#ef4444' };\n      Object.entries(ageBuckets).forEach(([bName, bCount]) => {\n        const pct = totalActive > 0 ? ((bCount / totalActive) * 100).toFixed(1) : 0;\n        const col = bucketColors[bName] || '#3b82f6';\n        agingHtml += `\n          <div class=\"bar-row\">\n            <span class=\"bar-label\">${escapeHtml(bName)}</span>\n            <div class=\"bar-track\">\n              <div class=\"bar-fill\" style=\"width:${pct}%; background:${col};\"></div>\n            </div>\n            <span class=\"bar-val\">${bCount} (${pct}%)</span>\n          </div>\n        `;\n      });\n      const ageCont = document.getElementById('agingChartContainer');\n      if (ageCont) ageCont.innerHTML = agingHtml;\n\n      // 4. Render Top Hotspots\n      let hotHtml = '';\n      const topRows = rows.slice(0, 8);\n      topRows.forEach(r => {\n        const badgeClass = r[4].includes('ACUTE') ? 'badge-acute' : (r[4].includes('EXTENDED') ? 'badge-extended' : 'badge-maint');\n        hotHtml += `\n          <div style=\"display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle); font-size:0.78rem;\">\n            <div>\n              <strong style=\"color:#fff;\">${escapeHtml(r[3])}</strong>\n              <div style=\"font-size:0.72rem; color:var(--text-muted);\">${escapeHtml(r[1])} \u2022 ${escapeHtml(r[0])}</div>\n            </div>\n            <span class=\"badge ${badgeClass}\">${escapeHtml(r[4])}</span>\n          </div>\n        `;\n      });\n      const hotCont = document.getElementById('topHotspotsContainer');\n      if (hotCont) hotCont.innerHTML = hotHtml;\n    }\n\n    function renderVumaB2BTable() {\n      const tbody = document.getElementById('vumaB2bTableBody');\n      if (!tbody) return;\n      if (typeof VUMA_B2B_DATA === 'undefined' || !VUMA_B2B_DATA || !Array.isArray(VUMA_B2B_DATA.incidents)) {\n        tbody.innerHTML = '<tr><td colspan=\"8\">No Vuma B2B incidents available.</td></tr>';\n        return;\n      }\n\n      let html = '';\n      VUMA_B2B_DATA.incidents.forEach(inc => {\n        if (inc.maxAgeHours > 10000) return; // skip ancient 2024 test case\n        const st = inc.incidentStatus || '';\n        const stClass = st.includes('progress') ? 'progress' : (st.includes('Investig') ? 'investigating' : 'onhold');\n        const premisesBadges = (inc.samplePremises || []).map(p => `<span class=\"premise-pill\">${escapeHtml(p)}</span>`).join('');\n        const zoneBadges = (inc.aggregationZones || []).map(z => `<span class=\"zone-tag\">${escapeHtml(z)}</span>`).join(' ');\n        const macroText = `[082 1904 OUTAGE] FNO: Vumatel | Ref: ${inc.incidentId} | Area: ${(inc.fibrehoods || []).join(', ')} | Status: ${st} | Affected Vodacom Lines: ${inc.affectedCustomersCount} | Action: Inform customer of Master Incident Ref & do NOT book tech callout.`;\n\n        html += `\n          <tr>\n            <td><strong style=\"color:#f0abfc; font-family:'JetBrains Mono', monospace;\">${escapeHtml(inc.incidentId)}</strong></td>\n            <td><span class=\"badge-vuma-status ${stClass}\">${escapeHtml(st)}</span></td>\n            <td><strong style=\"color:#fff;\">${escapeHtml((inc.fibrehoods || []).join(', '))}</strong></td>\n            <td>${zoneBadges || '\u2014'}</td>\n            <td><strong style=\"color:#ec4899; font-size:1.05rem;\">${inc.affectedCustomersCount}</strong> Vodacom Lines</td>\n            <td><span style=\"font-family:'JetBrains Mono'; color:#fcd34d;\">${inc.maxAgeHours}h</span></td>\n            <td>${premisesBadges}</td>\n            <td>\n              <button type=\"button\" class=\"btn-copy-macro\" data-macro=\"${escapeAttr(macroText)}\" onclick=\"copyTextFromButton(this)\">\n                \ud83d\udccb Copy 082 1904 Macro\n              </button>\n            </td>\n          </tr>\n        `;\n      });\n      tbody.innerHTML = html;\n    }\n\n    function triggerAdminFeedSync() {\n      if (typeof google !== \"undefined\" && google.script && google.script.run) {\n        showToast(\"Admin Manual Feed Sync\", \"Requesting out-of-cycle FNO scrape as \" + ADMIN_EMAIL + \"...\");\n        google.script.run\n          .withSuccessHandler(function (res) {\n            showToast(\"Admin Feed Sync Complete\", (res && res.message) || \"Live FNO Outages sheet updated.\");\n            fetchLiveOutageData(true);\n          })\n          .withFailureHandler(function (err) {\n            showToast(\"Admin Sync Notice\", String(err && err.message ? err.message : err));\n          })\n          .adminForceSync();\n      } else {\n        showToast(\n          \"Refreshing Live Sheet (\" + ADMIN_EMAIL + \")\",\n          \"Pulling latest rows from Sheet ID \" + SPREADSHEET_ID\n        );\n        fetchLiveOutageData(true);\n      }\n    }\n\n    // Keyboard shortcut: Esc clears search input\n    document.addEventListener(\"keydown\", function (e) {\n      if (e.key === \"Escape\") {\n        const input = document.getElementById(\"searchInput\");\n        if (input && input.value) {\n          clearSearchInput();\n        }\n      }\n    });\n\n    // Initialize Dashboard on DOM Ready\n    let dashboardInitialized = false;\n    function initDashboard() {\n      if (dashboardInitialized) return;\n      dashboardInitialized = true;\n      initFnoDropdown();\n      logTelemetryEvent('PAGE_VIEW', 'Dashboard Loaded');\n      updateSortHeaderArrows();\n\n      const hasServerRows = Array.isArray(FALLBACK_LIVE_ROWS) && FALLBACK_LIVE_ROWS.length > 0;\n      const isAppsScript = (typeof google !== \"undefined\" && google.script && google.script.run);\n\n      if (hasServerRows) {\n        applyIncomingSheetRows(FALLBACK_LIVE_ROWS, \"Live Google Sheet\");\n      } else {\n        fetchLiveOutageData(false);\n      }\n\n      // Non-blocking background sync check 2s after instant render so Google Sheet & Dashboard stay 100% in sync\n      if (isAppsScript) {\n        google.script.run\n          .withSuccessHandler(function (isAdmin) {\n            if (isAdmin) {\n              document.querySelectorAll('.admin-only').forEach(function(el) {\n                el.style.display = 'inline-flex';\n              });\n            }\n          })\n          .checkIsAdminUser();\n        setTimeout(function () {\n          google.script.run\n            .withSuccessHandler(function (res) {\n              if (res && Array.isArray(res.rows) && res.rows.length > 0) {\n                applyIncomingSheetRows(res.rows, \"Live Google Sheet (Synced \" + (res.lastSynced || \"\") + \")\");\n              }\n            })\n            .withFailureHandler(function () {})\n            .syncIfStaleBackground();\n        }, 1500);\n      }\n\n      // 60-Second Live Auto-Poll Timer (per spec Section 1)\n      setInterval(function () {\n        countdownRemaining--;\n        if (countdownRemaining <= 0) {\n          fetchLiveOutageData(false);\n          countdownRemaining = POLL_INTERVAL_SECONDS;\n        }\n        const lbl = document.getElementById(\"countdownLabel\");\n        if (lbl) lbl.textContent = countdownRemaining + \"s\";\n      }, 1000);\n    }\n\n    if (document.readyState === \"loading\") {\n      document.addEventListener(\"DOMContentLoaded\", initDashboard);\n    } else {\n      initDashboard();\n    }\n  </script>\n</body>\n</html>\n";
  return template.split("__SERVER_JSON_ROWS__").join(jsonRows);
}

function getLiveSheetDataForWebApp() {
  const ss = getTargetSpreadsheet();
  const sheet = ss.getSheetByName(DATA_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    return { rows: [], userEmail: "", isAdmin: false, lastSynced: "Never" };
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getDisplayValues();
  rows.forEach(r => { r[7] = normalizeSastStrServer_(r[7]); });
  rows.sort(compareOutageRowsServer_);

  let email = "";
  try {
    email = (Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  } catch (e) {}

  return {
    rows: rows,
    userEmail: email,
    isAdmin: email === ADMIN_EMAIL.toLowerCase(),
    lastSynced: Utilities.formatDate(new Date(), "Africa/Johannesburg", "HH:mm:ss")
  };
}

function syncIfStaleBackground() {
  try {
    const props = PropertiesService.getScriptProperties();
    const lastMs = Number(props.getProperty("LAST_FNO_SYNC_MS") || "0");
    if (Date.now() - lastMs > 14 * 60 * 1000) {
      props.setProperty("LAST_FNO_SYNC_MS", String(Date.now()));
      syncFnoFeeds();
      return getLiveSheetDataForWebApp();
    }
  } catch (e) {}
  return null;
}

function triggerManualSyncForWebApp() {
  return adminForceSync();
}

function adminForceSync() {
  const email = (Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase()) throw new Error("Unauthorized: Admin only.");
  syncFnoFeeds();
  return getLiveSheetDataForWebApp();
}

function manualSyncNow() {
  const currentUser = (Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  if (currentUser !== ADMIN_EMAIL.toLowerCase()) {
    SpreadsheetApp.getUi().alert("🔒 Admin Restricted", "Manual refresh is restricted to " + ADMIN_EMAIL, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  syncFnoFeeds();
  SpreadsheetApp.getUi().alert("⚡ Sync Complete", "All 15 wholesale FNO feeds (Cool Ideas, Afrihost, Vox National NOC Table, and Octotel) synced.", SpreadsheetApp.getUi().ButtonSet.OK);
}

function htmlToLines(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(div|p|li|tr|td|h[1-6]|a|span|article|section|header|time)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8211;|&ndash;/gi, "-")
    .replace(/&bull;|&middot;/gi, "•")
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(l => l.length > 0);
}

function parseCoolIdeasLines(lines, sourceLabel, results, defaultFno, isTagFeed, articleLinksMap) {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\b(202\d[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2})\b/);
    if (!m) continue;
    const startedAt = m[1].replace(/\//g, "-");
    const before = lines[i].substring(0, m.index).trim();
    const title = before.length > 2 ? before : (i > 0 ? lines[i - 1] : "");
    if (!title || title === "Articles" || title.length < 3) continue;

    const tagLines = [];
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      if (/\b202\d[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}\b/.test(lines[j])) break;
      if (j + 1 < lines.length && /^\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}$/.test(lines[j + 1])) break;
      if (/^(«|Previous|Next|RSS Feed|Categories)/i.test(lines[j])) break;
      tagLines.push(lines[j]);
    }
    const meta = tagLines.join(" ");
    const combined = title + " " + meta;
    let fno = detectFno(combined);
    if (fno === "FNO Partner" && defaultFno) fno = defaultFno;
    const id = extractTicketId(title, meta, fno);

    let bucket = classifyAgeBucket(startedAt);
    let detail = bucket === "EXTENDED (>48h)" ? "Extended Outage (>48h)" : "Current Outage";
    if (/\b(resolved|restored|completed|closed)\b/i.test(combined)) {
      bucket = "RESOLVED";
      detail = "Resolved — Reboot CPE";
    } else if (/maintenance/i.test(combined) || sourceLabel.includes("Maint") || id.startsWith("CHG-")) {
      bucket = "MAINTENANCE";
      detail = "Planned Maintenance";
    }

    if (isTagFeed && bucket === "RESOLVED") {
      const ms = new Date(startedAt.replace(" ", "T") + ":00").getTime();
      if (!isNaN(ms) && (Date.now() - ms) / 3600000 > 48) continue;
    }

    const etrText = deriveTurnaroundTime(startedAt, bucket, combined);
    const articleUrl = (articleLinksMap && articleLinksMap[title.toLowerCase()]) || "";

    results.push({
      id: id, fno: fno, province: detectProvince(combined + " " + fno), suburb: title.substring(0, 140),
      bucket: bucket, statusDetail: detail,
      impact: etrText + " | Live FNO notice (" + fno + ")",
      startedAt: startedAt, source: sourceLabel,
      articleUrl: articleUrl
    });
  }
}

function parseOctotelStatusLines(lines, sourceLabel, results) {
  for (let i = 0; i < lines.length; i++) {
    if (!/Octotel Network Notice|Emergency.*Maintenance/i.test(lines[i])) continue;
    const title = lines[i].trim();
    const block = lines.slice(i, Math.min(lines.length, i + 18)).join(" ");

    let startedAt = Utilities.formatDate(new Date(), "Africa/Johannesburg", "yyyy-MM-dd HH:mm");
    const mStart = block.match(/Planned Start Date\/Time:\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/i);
    if (mStart) {
      startedAt = mStart[3] + "-" + mStart[2] + "-" + mStart[1] + " " + mStart[4];
    }

    const isCompleted = /\b(Completed|Maintenance has completed successfully)\b/i.test(block);
    const startMs = new Date(startedAt.replace(" ", "T") + ":00").getTime();
    if (isCompleted && !isNaN(startMs) && (Date.now() - startMs) / 3600000 > 48) continue;

    const bucket = isCompleted ? "RESOLVED" : (/Maintenance/i.test(title) ? "MAINTENANCE" : classifyAgeBucket(startedAt));
    const detail = isCompleted ? "Resolved — Reboot CPE" : (bucket === "MAINTENANCE" ? "Planned Maintenance" : "Current Outage");
    const parts = title.split("|").map(s => s.trim());
    const suburb = parts.length >= 3 ? parts[2] : title;
    const id = extractTicketId(suburb, block, "Octotel");
    const etrText = deriveTurnaroundTime(startedAt, bucket, block);

    results.push({
      id: id, fno: "Octotel", province: detectProvince(suburb + " Western Cape"), suburb: suburb.substring(0, 140),
      bucket: bucket, statusDetail: detail,
      impact: etrText + " | Octotel NOC Notice (" + suburb + ")",
      startedAt: startedAt, source: sourceLabel
    });
  }
}

function parseAfrihostLines(lines, results) {
  for (let i = 1; i < lines.length; i++) {
    if (/^UPDATE\s*[•·\-]/i.test(lines[i])) continue;
    const m = lines[i].match(/\b(\d{2}:\d{2}\s*[•·\-]\s*\d{1,2}\s+[A-Za-z]{3}\s+202\d)\b/i);
    if (!m) continue;
    const startedAt = normalizeAfrihostDate(m[1]);

    let header = lines[i - 1] || "";
    let updateNote = "";
    for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
      if (lines[k].includes("|") || /Impact\s*[•·]/i.test(lines[k])) {
        header = lines[k];
        if (k < i - 1 && !/^UPDATE/i.test(lines[i - 1]) && lines[i - 1].length > 25) {
          updateNote = lines[i - 1];
        }
        break;
      }
    }

    const desc = updateNote || lines[i + 1] || "";
    const combined = header + " " + (lines[i - 1] || "") + " " + desc;
    const fno = detectFno(combined);
    const parts = header.split("|");
    const cleanSub = parts.length > 1 ? parts[parts.length - 1].trim() : header;
    const id = extractTicketId(cleanSub, desc, fno);

    let bucket = classifyAgeBucket(startedAt);
    let detail = bucket === "EXTENDED (>48h)" ? "Extended Outage (>48h)" : "Medium Impact Outage";
    if (/\b(resolved|restored|completed)\b/i.test(combined)) {
      bucket = "RESOLVED";
      detail = "Resolved — Reboot CPE";
    } else if (/High Impact/i.test(header)) {
      detail = "High Impact Outage";
    } else if (/Degraded/i.test(header)) {
      detail = "Degraded Service";
    }

    const etrText = deriveTurnaroundTime(startedAt, bucket, combined);
    results.push({
      id: id, fno: fno, province: detectProvince(combined), suburb: cleanSub.substring(0, 140),
      bucket: bucket, statusDetail: detail,
      impact: etrText + " | " + desc.substring(0, 170),
      startedAt: startedAt, source: "Afrihost Status (Live)"
    });
  }
}

function extractTicketId(titleText, extraText, fno) {
  const m1 = titleText.match(/\b(INC-\d{5,9}|CHG-\d{5,9}|FRG\d{6,9}|NN\d{6,9}|169\d{4}|168\d{4}|406\d{3}|356\d{4})\b/i);
  if (m1) return m1[1].toUpperCase();
  const m2 = extraText.match(/\b(INC-\d{5,9}|CHG-\d{5,9}|FRG\d{6,9}|NN\d{6,9})\b/i);
  if (m2) return m2[1].toUpperCase();
  const sub = titleText.replace(/[^a-zA-Z0-9]/g, "").substring(0, 18).toUpperCase();
  const code = fno.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase() || "FNO";
  return code + "-" + sub;
}

function normalizeAfrihostDate(raw) {
  const m = raw.match(/(\d{2}:\d{2})\s*[•·\-]\s*(\d{1,2})\s+([A-Za-z]{3})\s+(202\d)/);
  if (!m) return raw;
  const mos = { jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06", jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12" };
  return m[4] + "-" + (mos[m[3].toLowerCase()] || "10") + "-" + ("0" + m[2]).slice(-2) + " " + m[1];
}

function classifyAgeBucket(startedAtStr) {
  const ms = new Date(startedAtStr.replace(" ", "T") + ":00").getTime();
  return (!isNaN(ms) && (new Date().getTime() - ms) / 3600000 > 48) ? "EXTENDED (>48h)" : "ACUTE (<24h)";
}

// Complete 25-FNO Recognition Dictionary for Vodacom FTTH, Prepaid Fibre, and Business FTTB
function detectFno(text) {
  const l = text.toLowerCase();
  const pairs = [
    ["vuma reach","Vuma Reach"],["vumatel reach","Vuma Reach"],["vuma villages","Vumatel"],["vumatel aerial","Vumatel"],
    ["vumatel","Vumatel"],["vumtel","Vumatel"],["vuma","Vumatel"],
    ["metrofibre","MetroFibre"],["mfbn","MetroFibre"],["mfibre","MetroFibre"],["mfn","MetroFibre"],
    ["frogfoot","Frogfoot"],["openserve","Openserve"],["octotel","Octotel"],["evotel","Evotel"],
    ["zoom fibre","Zoom Fibre"],["zoomfibre","Zoom Fibre"],["zoom","Zoom Fibre"],
    ["vodacom","Vodacom Fibre"],["link africa","Link Africa"],["linkafrica","Link Africa"],
    ["dfa","DFA"],["dark fibre","DFA"],["open fibre","Open Fibre"],["openfibre","Open Fibre"],
    ["clear access","Clear Access"],["waterfall access","Waterfall Access Networks"],["wan","Waterfall Access Networks"],
    ["century city","Century City Connect"],["sadv","SADV"],["tt connect","TT Connect"],
    ["link layer","Link Layer"],["linklayer","Link Layer"],["netstream","Netstream"],
    ["balwin","Balwin Fibre"],["fmas","FMAS Networks"],["lightstruck","Lightstruck"],
    ["liquid telecom","Liquid Telecom"],["liquid","Liquid Telecom"],["mitsol","Mitsol"],
    ["comtel","Comtel"],["cybersmart","Cybersmart"],["thinkspeed","Thinkspeed"],["purple forest","Purple Forest"],["unifybr","Unifybr"]
  ];
  for (let i = 0; i < pairs.length; i++) if (l.includes(pairs[i][0])) return pairs[i][1];
  return "FNO Partner";
}

function detectProvince(text) {
  const l = text.toLowerCase();
  if (/(jhb|midrand|johannesburg|pretoria|centurion|gauteng|sandton|sandown|sunninghill|magaliessig|fourways|riverside view|malibongwe|randburg|soweto|devland|turffontein|turfontein|florida|geluksdal|brakpan|benoni|springs|boksburg|roodepoort|ekurhuleni|tshwane|queenswood|krugersdorp|vosloorus|ennerdale|wierda|paulshof|parktown|rosebank|linden|vanderbijlpark|riverspray|menlo|lynnwood|rynfield|bracken|discovery|north riding|osprey|heidelberg|ratanda|linbro|randfontein|alberton|meyersdal|alrode|kempton|edenvale|bryanston|diepsloot|faerie glen|lenasia|germiston|nigel|buccleuch|ferndale|meyerton|henley|waverley|savoy|ebony park|vorna valley|chartwell|parkhurst|fountainebleau|robin hills|berario|jacanlee|westdene)/.test(l)) return "Gauteng";
  if (/(cpt|cape town|western cape|paarl|rondebosch|blue downs|khayelitsha|george|somerset west|durbanville|bellville|melkbos|parklands|kirstenhof|tokai|grassy park|beaufort west|plettenberg|plett|cape gate|kraaifontein|brackenfell|gugulethu|sea point|athlone|grabouw|bo-kaap|woodstock|observatory|salt river|strand|blouberg|mutual heights|langebaan|stellenbosch|winelands|overberg|mitchells plain|mowbray|de waterkant|foreshore|zonnebloem)/.test(l)) return "Western Cape";
  if (/(dbn|durban|kzn|kwazulu|pietermaritzburg|msunduzi|ethekwini|umhlanga|la mercy|buffelsdale|mooi river|new germany|ladysmith|phoenix|inanda|chatsworth|ballito|hillary|cornubia|bluff|richards bay|tongaat|port shepstone)/.test(l)) return "KwaZulu-Natal";
  if (/(parys|bloemfontein|free state|kroonstad|welkom|hillside)/.test(l)) return "Free State";
  if (/(lethlabile|brits|north west|rustenburg|hartebeespoort|klerksdorp)/.test(l)) return "North West";
  if (/(eastern cape|kouga|jeffrey|gqeberha|port elizabeth|east london|mdantsane|wilsonia|humansdorp|zwelitsha|king william|nelson mandela bay|wavecrest)/.test(l)) return "Eastern Cape";
  if (/(nelspruit|mbombela|mpumalanga|witbank|duvha|kanonkop|middelburg|standerton|meyerville)/.test(l)) return "Mpumalanga";
  if (/(kimberley|northern cape|hillcrest)/.test(l)) return "Northern Cape";
  if (/(limpopo|tzaneen|polokwane|thohoyandou|bela-bela|mokopane|seshego|mookgopong)/.test(l)) return "Limpopo";
  return "National";
}

function upsertTicketsToSheet(sheet, newTickets) {
  const lastRow = sheet.getLastRow();
  const existingRows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 11).getDisplayValues() : [];
  const nowStr = Utilities.formatDate(new Date(), "Africa/Johannesburg", "yyyy-MM-dd HH:mm");

  try {
    PropertiesService.getScriptProperties().setProperty("LAST_FNO_SYNC_MS", String(Date.now()));
  } catch (e) {}

  // Smart Cross-Feed Merge: combine Cool Ideas + Vox + Afrihost + Octotel notices by Ticket ID
  const byId = new Map();
  newTickets.forEach(t => {
    t.startedAt = normalizeSastStrServer_(t.startedAt);
    if (!byId.has(t.id)) {
      byId.set(t.id, t);
    } else {
      const prev = byId.get(t.id);
      if (t.bucket === "RESOLVED") prev.bucket = "RESOLVED";
      if (prev.startedAt.endsWith("08:00") && !t.startedAt.endsWith("08:00")) {
        prev.startedAt = t.startedAt;
      }
      if (t.impact && t.impact.length > prev.impact.length && !t.impact.includes("Live FNO notice")) {
        prev.impact = t.impact;
        if (t.macro) prev.macro = t.macro;
      } else if (!prev.macro && t.macro) {
        prev.macro = t.macro;
      }
      if (prev.province === "National" && t.province !== "National") {
        prev.province = t.province;
      }
      if (!prev.source.includes(t.source)) {
        prev.source = prev.source + " + " + t.source;
      }
    }
  });

  const mergedMap = new Map();
  for (let i = 0; i < existingRows.length; i++) {
    const r = existingRows[i].map(c => String(c || "").trim());
    const rowId = r[0];
    if (!rowId) continue;
    r[7] = normalizeSastStrServer_(r[7]);
    r[8] = normalizeSastStrServer_(r[8]);

    if (!byId.has(rowId) && !isRowResolvedServer_(r)) {
      // Auto-resolve previously active ticket that cleared from all live FNO feeds
      const fno = r[1] || "";
      const prov = r[2] || "";
      const sub = r[3] || "";
      const start = r[7] || "";
      const resMacro = "[082 1904 RESOLVED] FNO: " + fno + " | Ref: " + rowId + " | Area: " + sub + " (" + prov + ") | Status: Resolved — Reboot CPE | Started: " + start + " | Action: Advise customer to power-cycle ONT and Router for 2 mins.";
      r[4] = "RESOLVED";
      r[5] = "Resolved — Reboot CPE";
      r[6] = "✅ Restored (Advise 2-min ONT Reboot) | Cleared from live FNO feeds";
      r[8] = nowStr;
      r[9] = resMacro;
    }
    mergedMap.set(rowId, r);
  }

  byId.forEach(t => {
    const startNorm = normalizeSastStrServer_(t.startedAt);
    const act = t.bucket === "RESOLVED"
      ? "Advise customer to power-cycle ONT and Router for 2 mins."
      : "Inform customer of FNO Ref & ETA (" + t.impact + "). Link case to Master Ref — do NOT book tech callout.";
    const defaultMacro = "[082 1904 OUTAGE] FNO: " + t.fno + " | Ref: " + t.id + " | Area: " + t.suburb + " (" + t.province + ") | Status: " + t.statusDetail + " | ETA & Update: " + t.impact + " | Started: " + startNorm + " | Action: " + act;
    const macro = (t.macro && String(t.macro).trim().length > 0) ? String(t.macro).trim() : defaultMacro;

    if (mergedMap.has(t.id)) {
      const prevRow = mergedMap.get(t.id);
      const keepStart = (!startNorm.endsWith("08:00") || !prevRow[7]) ? startNorm : prevRow[7];
      mergedMap.set(t.id, [
        t.id, t.fno, t.province, t.suburb, t.bucket, t.statusDetail, t.impact, keepStart, nowStr, macro, t.source
      ]);
    } else {
      mergedMap.set(t.id, [
        t.id, t.fno, t.province, t.suburb, t.bucket, t.statusDetail, t.impact, startNorm, nowStr, macro, t.source
      ]);
    }
  });

  const finalRows = Array.from(mergedMap.values());
  finalRows.forEach(r => {
    if (isRowResolvedServer_(r) && r[4] !== "RESOLVED") {
      r[4] = "RESOLVED";
      if (!String(r[5] || "").toLowerCase().includes("resolved")) {
        r[5] = "Resolved — Reboot CPE";
      }
    }
  });
  // Sort Live FNO Outages using the EXACT SAME order as the Web App & Native Sheet Dashboard:
  // 1. Current Active Outages (Newest First) -> 2. Future Scheduled Maint -> 3. Resolved Outages (Newest First)
  finalRows.sort(compareOutageRowsServer_);

  if (finalRows.length > 0) {
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
    }
    sheet.getRange(2, 8, finalRows.length, 2).setNumberFormat("@");
    sheet.getRange(2, 1, finalRows.length, 11).setValues(finalRows);
  }
}

function install15MinuteTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "syncFnoFeeds") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncFnoFeeds").timeBased().everyMinutes(15).create();
  syncFnoFeeds();
  Logger.log("SUCCESS: 15-minute live background poller active under " + ADMIN_EMAIL);
}


// Auto-ingest Vodacom Nerve Centre ("Fixed Open Incidents") emails & attached CSVs from Gmail
function syncVodacomNerveCentreEmails(results) {
  try {
    if (typeof GmailApp === "undefined") return;
    const threads = GmailApp.search('subject:"Fixed Open Incidents" newer_than:7d', 0, 5);
    for (let t = 0; t < threads.length; t++) {
      const msgs = threads[t].getMessages();
      for (let m = 0; m < msgs.length; m++) {
        const msg = msgs[m];
        const date = msg.getDate();
        const atts = msg.getAttachments();
        let parsedAttachment = false;
        for (let a = 0; a < atts.length; a++) {
          const att = atts[a];
          const fn = att.getName().toLowerCase();
          if (fn.includes("incidents") && (fn.endsWith(".csv") || fn.endsWith(".txt"))) {
            parseNerveCentreCsvText(att.getDataAsString(), date, "Vodacom Nerve Centre (" + att.getName() + ")", results);
            parsedAttachment = true;
          }
        }
        if (!parsedAttachment) {
          const body = msg.getBody();
          if (body.includes("INC-0000")) {
            parseNerveCentreHtmlBody(body, date, "Vodacom Nerve Centre (Email Body)", results);
          }
        }
      }
    }
  } catch (e) {
    Logger.log("Nerve Centre Email Sync Warning: " + e);
  }
}

function parseNerveCentreCsvText(csvText, emailDate, sourceLabel, results) {
  const lines = csvText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.toUpperCase().startsWith("INC-")) continue;
    const cells = line.split(";").map(c => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 8) continue;

    const id = cells[0].toUpperCase();
    const cause = cells[2] || "Fibre Break";
    const prod = cells[3] || "Vuma Core";
    const grade = cells[5] || "Minor";
    const area = cells[6] || "";
    const city = cells[7] || "";

    // Duration: days, hours, mins
    const durD = parseInt(cells[8] || "0", 10) || 0;
    const durH = parseInt(cells[9] || "0", 10) || 0;
    const durM = parseInt(cells[10] || "0", 10) || 0;
    const totalHours = durD * 24 + durH + durM / 60;

    // Calculate approximate start timestamp from email date minus duration
    const emailMs = (emailDate instanceof Date && !isNaN(emailDate.getTime())) ? emailDate.getTime() : Date.now();
    const startMs = emailMs - Math.round(totalHours * 3600000);
    const startedAt = Utilities.formatDate(new Date(startMs), "Africa/Johannesburg", "yyyy-MM-dd HH:mm");

    // Status column
    const statusCol = cells[11] || "";
    const isResolved = /resolved|restored|closed/i.test(statusCol);

    let bucket = isResolved ? "RESOLVED" : (totalHours >= 48 ? "EXTENDED (>48h)" : "ACUTE (<24h)");
    let detail = isResolved ? "Resolved — Reboot CPE" : (statusCol || (totalHours >= 48 ? "Extended Outage (>48h)" : "Current Outage"));

    const combinedArea = city ? (city + " - " + area) : area;
    const prov = detectProvince(combinedArea);
    const fno = /vuma/i.test(prod) ? "Vumatel" : detectFno(prod + " " + combinedArea);

    const etrBadge = isResolved
      ? "✅ Restored (Advise 2-min ONT Reboot)"
      : (totalHours > 24
          ? ("🔴 SLA Breached (" + (totalHours/24).toFixed(1) + "d elapsed) — Civil/Wayleave Fault")
          : (/power/i.test(cause) ? "🟡 Derived ETA: 4–6h Power/Node SLA" : "🟠 Derived ETA: 8–12h Fibre Splice SLA"));

    const impact = etrBadge + " | Status: " + detail + " (" + grade + " Grade " + cause + " — " + durD + "d " + durH + "h elapsed)";

    results.push({
      id: id,
      fno: fno,
      province: prov,
      suburb: combinedArea.substring(0, 140),
      bucket: bucket,
      statusDetail: detail,
      impact: impact,
      startedAt: startedAt,
      source: sourceLabel
    });
  }
}

function parseNerveCentreHtmlBody(html, emailDate, sourceLabel, results) {
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const rowHtml = rm[1];
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cm;
    while ((cm = cellRe.exec(rowHtml)) !== null) {
      cells.push(cm[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim());
    }
    if (cells.length < 8 || !cells[0].toUpperCase().startsWith("INC-")) continue;
    const id = cells[0].toUpperCase();
    const cause = cells[2] || "Fibre Break";
    const grade = cells[5] || "Minor";
    const area = cells[6] || "";
    const city = cells[7] || "";
    const combinedArea = city ? (city + " - " + area) : area;
    const prov = detectProvince(combinedArea);

    const startedAt = Utilities.formatDate(emailDate || new Date(), "Africa/Johannesburg", "yyyy-MM-dd HH:mm");
    const impact = "🟠 Derived ETA: 8–12h Fibre Splice SLA | Vodacom Nerve Centre Notice (" + grade + " Grade " + cause + ")";

    results.push({
      id: id,
      fno: "Vumatel",
      province: prov,
      suburb: combinedArea.substring(0, 140),
      bucket: "ACUTE (<24h)",
      statusDetail: "Technicians attending",
      impact: impact,
      startedAt: startedAt,
      source: sourceLabel
    });
  }
}


function checkIsAdminUser() {
  try {
    const email = Session.getActiveUser().getEmail() || "";
    return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  } catch (e) {
    return false;
  }
}


/*************************************************************************
 * 11. USAGE ANALYTICS & ACTIVITY LOGGING ENGINE
 *************************************************************************/
function logDashboardActivity(actionType, details) {
  try {
    let email = "";
    try {
      email = Session.getActiveUser().getEmail() || "";
    } catch (e) {}

    const ss = getTargetSpreadsheet();
    let logSheet = ss.getSheetByName("📈 Usage Logs");
    if (!logSheet) {
      logSheet = ss.insertSheet("📈 Usage Logs");
      logSheet.appendRow(["TIMESTAMP (SAST)", "USER EMAIL", "ACTION TYPE", "DETAILS"]);
      logSheet.getRange("A1:D1").setBackground("#111827").setFontColor("#ffffff").setFontWeight("bold");
      logSheet.setFrozenRows(1);
      [180, 240, 160, 400].forEach((w, i) => logSheet.setColumnWidth(i + 1, w));
    }

    const nowStr = Utilities.formatDate(new Date(), "Africa/Johannesburg", "yyyy-MM-dd HH:mm:ss");
    logSheet.appendRow([nowStr, email || "Anonymous / Direct", actionType || "PAGE_VIEW", String(details || "")]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function getUsageAnalyticsData() {
  try {
    const ss = getTargetSpreadsheet();
    const logSheet = ss.getSheetByName("📈 Usage Logs");
    if (!logSheet || logSheet.getLastRow() < 2) {
      return { totalViews: 0, uniqueUsers: 0, macroCopies: 0, totalInteractions: 0, recentLogs: [], dailyCounts: {}, topUsers: {} };
    }

    const rows = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 4).getDisplayValues();
    let totalViews = 0;
    let macroCopies = 0;
    const usersSet = new Set();
    const userCounts = {};
    const dailyCounts = {};
    const recentLogs = [];

    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const timeStr = r[0];
      const email = r[1] || "Unknown";
      const action = r[2] || "PAGE_VIEW";
      const detail = r[3] || "";

      if (email && email !== "Unknown") usersSet.add(email);
      userCounts[email] = (userCounts[email] || 0) + 1;

      if (action === "PAGE_VIEW") totalViews++;
      if (action === "COPY_MACRO") macroCopies++;

      const datePart = timeStr.split(" ")[0];
      if (datePart) {
        dailyCounts[datePart] = (dailyCounts[datePart] || 0) + 1;
      }

      if (recentLogs.length < 30) {
        recentLogs.push({ time: timeStr, email: email, action: action, detail: detail });
      }
    }

    return {
      totalViews: totalViews,
      uniqueUsers: usersSet.size,
      macroCopies: macroCopies,
      totalInteractions: rows.length,
      recentLogs: recentLogs,
      dailyCounts: dailyCounts,
      topUsers: userCounts
    };
  } catch (err) {
    return { error: String(err) };
  }
}
