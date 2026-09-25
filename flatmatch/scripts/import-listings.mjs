// Imports real Pune rentals from NoBroker via Firecrawl into Supabase.
//
//   npm run import-listings -- --dry-run            preview only, writes .data/imported-preview.json
//   npm run import-listings                         import into Supabase, replacing the mock listings
//   Options: --max-details 15  --url <search page> (repeatable)  --keep-mock  --fresh
//
// Every Firecrawl response is cached in .data/firecrawl-cache, so re-runs cost
// nothing unless --fresh is passed. Each uncached page costs ~5 credits.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { toProperty, listingId } from "./nobroker-map.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const urls = args.flatMap((a, i) => (a === "--url" && args[i + 1] ? [args[i + 1]] : []));
const SEARCH_URLS = urls.length ? urls : ["https://www.nobroker.in/3bhk-flats-for-rent-in-pune_pune"];
const MAX_DETAILS = Number(opt("max-details", 15));
const DRY = flag("dry-run");

const KEY = process.env.FIRECRAWL_API_KEY;
if (!KEY) {
  console.error("FIRECRAWL_API_KEY is missing from .env.local");
  process.exit(1);
}

const CACHE_DIR = new URL("../.data/firecrawl-cache/", import.meta.url);
mkdirSync(CACHE_DIR, { recursive: true });
let creditsUsed = 0;

async function scrape(url, schema, prompt) {
  const file = new URL(createHash("sha1").update(url + JSON.stringify(schema)).digest("hex") + ".json", CACHE_DIR);
  if (!flag("fresh") && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ url, onlyMainContent: true, formats: [{ type: "json", schema, prompt }] }),
      signal: AbortSignal.timeout(120000),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 5000 * attempt));
      continue;
    }
    creditsUsed += 5;
    if (!res.ok || !body.success) throw new Error(body.error || `Firecrawl ${res.status}`);
    const finalUrl = body.data?.metadata?.url ?? "";
    if (/captcha|verify|blocked/i.test(finalUrl)) throw new Error(`blocked by the site (redirected to ${finalUrl})`);
    const out = body.data?.json ?? {};
    writeFileSync(file, JSON.stringify(out));
    return out;
  }
}

const boolean = (description) => ({ type: "boolean", description });
const SEARCH_SCHEMA = {
  type: "object",
  properties: {
    listings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          society: { type: "string" },
          locality: { type: "string", description: "Neighbourhood in Pune, e.g. Baner, Wakad" },
          rent: { type: "number", description: "Monthly rent in INR as a plain number" },
          deposit: { type: "number" },
          bedrooms: { type: "number" },
          bathrooms: { type: "number" },
          furnishing: { type: "string" },
          preferredTenants: { type: "string" },
          parking: { type: "string" },
          imageUrl: { type: "string" },
          listingUrl: { type: "string" },
        },
        required: ["title", "rent", "listingUrl"],
      },
    },
  },
};
const SEARCH_PROMPT = "Extract every rental listing card on this page. Rent must be monthly INR as a number (e.g. 45000). Do not invent values; omit fields not shown.";

const DETAIL_SCHEMA = {
  type: "object",
  properties: {
    locality: { type: "string" },
    address: { type: "string" },
    rent: { type: "number" },
    deposit: { type: "number" },
    bedrooms: { type: "number" },
    bathrooms: { type: "number" },
    floor: { type: "number", description: "Floor the flat is on; 0 for ground" },
    totalFloors: { type: "number" },
    furnishing: { type: "string" },
    preferredTenants: { type: "string" },
    lift: boolean("Building has a lift"),
    parking: boolean("Parking available"),
    petFriendly: boolean("Pets explicitly allowed"),
    gym: boolean("Gym in building/society"),
    pool: boolean("Swimming pool"),
    powerBackup: boolean("Power backup"),
    security: boolean("24x7 security"),
    balcony: boolean("Has balcony"),
    description: { type: "string" },
    imageUrls: { type: "array", items: { type: "string" } },
  },
};
const DETAIL_PROMPT = "Extract this rental listing. Only set an amenity boolean true or false if the page states it; omit it if not mentioned. Floor numbers as integers.";

// ---- 1. Search pages ----
const found = new Map();
for (const url of SEARCH_URLS) {
  process.stdout.write(`Search page: ${url}\n`);
  try {
    const { listings = [] } = await scrape(url, SEARCH_SCHEMA, SEARCH_PROMPT);
    for (const l of listings) {
      const id = listingId(l.listingUrl);
      if (id && !found.has(id)) found.set(id, l);
    }
    console.log(`  ${listings.length} listings`);
  } catch (e) {
    console.error(`  ✕ ${e.message}`);
  }
}

// ---- 2. Cheap filters before spending credits on detail pages ----
const skipped = [];
const shortlist = [];
for (const l of found.values()) {
  const pre = toProperty(l, { floor: 0 }); // placeholder floor: only checks search-level fields
  if (pre.skip) skipped.push({ l, reason: pre.skip });
  else shortlist.push(l);
}
const toFetch = shortlist.slice(0, MAX_DETAILS);
console.log(`\n${found.size} unique listings · ${skipped.length} filtered out · fetching ${toFetch.length} listing pages`);

// ---- 3. Detail pages (3 at a time) ----
const imported = [];
for (let i = 0; i < toFetch.length; i += 3) {
  await Promise.all(
    toFetch.slice(i, i + 3).map(async (l) => {
      try {
        const detail = await scrape(l.listingUrl, DETAIL_SCHEMA, DETAIL_PROMPT);
        const r = toProperty(l, detail);
        if (r.skip) skipped.push({ l, reason: r.skip });
        else imported.push(r.property);
      } catch (e) {
        skipped.push({ l, reason: `listing page failed: ${e.message}` });
      }
    }),
  );
}

// ---- 4. Report ----
console.log(`\nImported ${imported.length}:`);
for (const p of imported)
  console.log(`  ✓ ${p.title.padEnd(26)} ₹${String(p.rent).padStart(6)}  ${p.bathrooms} bath · floor ${p.floor}/${p.totalFloors} · ${p.furnishing}${p.lift ? " · lift" : ""}${p.petFriendly ? " · pets" : ""}`);
const reasons = skipped.reduce((acc, s) => ((acc[s.reason.replace(/".*"/, '"…"')] = (acc[s.reason.replace(/".*"/, '"…"')] || 0) + 1), acc), {});
console.log(`Skipped ${skipped.length}:`);
for (const [reason, n] of Object.entries(reasons)) console.log(`  – ${n} × ${reason}`);
const unknownAreas = [...new Set(skipped.filter((s) => s.reason.startsWith("unknown area")).map((s) => s.l.locality))];
if (unknownAreas.length) console.log(`  Unknown areas (add to data/areas.json to include): ${unknownAreas.join(", ")}`);
console.log(`Firecrawl credits used this run: ~${creditsUsed}`);

if (DRY) {
  writeFileSync(new URL("../.data/imported-preview.json", import.meta.url), JSON.stringify(imported, null, 2));
  console.log("\nDry run: nothing written to Supabase. Preview saved to .data/imported-preview.json");
  process.exit(0);
}
if (!imported.length) {
  console.log("\nNothing to import; Supabase left unchanged.");
  process.exit(0);
}

// ---- 5. Write to Supabase ----
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const now = new Date().toISOString();
const rows = imported.map((p) => ({
  id: p.id, title: p.title, area: p.area, address: p.address, rent: p.rent,
  bedrooms: p.bedrooms, bathrooms: p.bathrooms, floor: p.floor, total_floors: p.totalFloors,
  lift: p.lift, parking: p.parking, furnishing: p.furnishing, pet_friendly: p.petFriendly,
  amenities: p.amenities, commute: p.commute, description: p.description, image_url: p.image,
  source: p.source, source_url: p.sourceUrl, deposit: p.deposit, commute_estimated: true,
  unknown_amenities: p.unknownAmenities, imported_at: now,
}));
const { error } = await db.from("properties").upsert(rows);
if (error) {
  console.error(`\nSupabase write failed: ${error.message}`);
  if (/column/.test(error.message)) console.error("Run supabase/002_imported_listings.sql in the SQL editor first.");
  process.exit(1);
}
console.log(`\nSaved ${rows.length} listings to Supabase.`);
if (!flag("keep-mock")) {
  const { error: delErr, count } = await db.from("properties").delete({ count: "exact" }).eq("source", "mock");
  console.log(delErr ? `Could not remove mock listings: ${delErr.message}` : `Removed ${count} mock listings (use --keep-mock to keep them).`);
}
