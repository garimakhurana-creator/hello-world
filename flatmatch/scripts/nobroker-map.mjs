// Pure mapping from Firecrawl's NoBroker extractions to FlatMatch properties.
// No network or database here so it can be unit-tested.

import { readFileSync } from "node:fs";

const areas = JSON.parse(readFileSync(new URL("../data/areas.json", import.meta.url), "utf8"));
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

// Longest aliases first so "Hinjewadi Phase 2" wins over "Hinjewadi".
const ALIASES = areas
  .flatMap((a) => a.aliases.map((alias) => ({ key: norm(alias), area: a })))
  .filter((x) => x.key.length >= 3)
  .sort((a, b) => b.key.length - a.key.length);

export function resolveArea(...candidates) {
  for (const c of candidates) {
    const n = norm(c);
    if (!n) continue;
    const exact = ALIASES.find((x) => x.key === n);
    if (exact) return exact.area;
  }
  // Fall back to "…for Rent In <locality> Pune" in the title, then substrings.
  for (const c of candidates) {
    const m = String(c ?? "").match(/for rent in (.+?) pune/i);
    if (m) {
      const hit = ALIASES.find((x) => x.key === norm(m[1]));
      if (hit) return hit.area;
    }
  }
  for (const c of candidates) {
    const n = norm(c);
    const hit = n && ALIASES.find((x) => x.key.length >= 5 && n.includes(x.key));
    if (hit) return hit.area;
  }
  return null;
}

// Family-only landlords won't rent to a group of friends.
export function tenantsAllowFlatmates(t) {
  if (!t) return true;
  const s = String(t).toLowerCase();
  if (/all|anyone|any|bachelor|company/.test(s)) return true;
  return !/family/.test(s);
}

export function normaliseFurnishing(f) {
  const s = String(f ?? "").toLowerCase();
  if (s.includes("semi")) return "semi";
  if (s.includes("un") || s.includes("not")) return "unfurnished";
  if (s.includes("full") || s.includes("furnished")) return "furnished";
  return null;
}

export function listingId(url) {
  const m = String(url ?? "").match(/\/([0-9a-f]{24,40})\/detail/i);
  return m ? `nb-${m[1].toLowerCase()}` : null;
}

const AMENITY_KEYS = ["gym", "pool", "powerBackup", "security", "balcony"];
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : null);

// Returns { property } or { skip: reason }.
export function toProperty(search, detail) {
  const d = detail ?? {};
  const id = listingId(search.listingUrl);
  if (!id) return { skip: "no listing link" };

  const tenants = d.preferredTenants ?? search.preferredTenants;
  if (!tenantsAllowFlatmates(tenants)) return { skip: `landlord wants: ${tenants}` };

  const area = resolveArea(d.locality, search.locality, search.title, d.address);
  if (!area) return { skip: `unknown area "${search.locality ?? d.locality ?? "?"}"` };

  const rent = num(d.rent) ?? num(search.rent);
  if (!rent || rent < 5000 || rent > 500000) return { skip: `implausible rent ${rent}` };
  const bedrooms = num(d.bedrooms) ?? num(search.bedrooms);
  const bathrooms = num(d.bathrooms) ?? num(search.bathrooms);
  if (!bedrooms || !bathrooms) return { skip: "bedrooms/bathrooms not stated" };

  const floor = num(d.floor);
  if (floor === null) return { skip: "floor not stated on listing page" };
  const totalFloors = Math.max(num(d.totalFloors) ?? floor, floor);

  const furnishing = normaliseFurnishing(d.furnishing ?? search.furnishing);
  if (!furnishing) return { skip: "furnishing not stated" };

  const unknown = [];
  const flag = (key, value) => {
    if (value === true) return true;
    if (value !== false) unknown.push(key);
    return false;
  };
  const lift = flag("lift", d.lift);
  const parkingFromSearch = /avail|yes|car|bike/i.test(String(search.parking ?? "")) ? true : undefined;
  const parking = flag("parking", d.parking ?? parkingFromSearch);
  const petFriendly = flag("petFriendly", d.petFriendly);
  const amenities = AMENITY_KEYS.filter((k) => flag(k, d[k]));

  const tenantNote = tenants && /bachelor/i.test(tenants) ? ` Owner preference: ${String(tenants).replace(/_/g, " ").toLowerCase()}.` : "";
  const description = ((d.description || `${search.society ?? "Flat"} in ${search.locality ?? area.name}.`).trim().slice(0, 450) + tenantNote).trim();
  const image = [...(d.imageUrls ?? []), search.imageUrl].find((u) => typeof u === "string" && u.startsWith("https://")) ?? "";

  return {
    property: {
      id,
      title: `${bedrooms}BHK in ${area.name}`,
      area: area.name,
      address: (d.address || [search.society, search.locality, "Pune"].filter(Boolean).join(", ")).slice(0, 200),
      rent,
      bedrooms,
      bathrooms,
      floor,
      totalFloors,
      lift,
      parking,
      furnishing,
      petFriendly,
      amenities,
      commute: area.commute,
      description,
      image,
      source: "nobroker",
      sourceUrl: search.listingUrl,
      deposit: num(d.deposit) ?? num(search.deposit),
      commuteEstimated: true,
      unknownAmenities: unknown,
    },
  };
}
