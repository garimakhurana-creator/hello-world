// Deterministic matching. Every result here is explainable line by line:
// each person gets a list of checks, and every check says exactly why it
// passed or failed. No weights, no hidden score, and nobody's requirement
// counts for more than anybody else's.

import type {
  Amenity,
  Check,
  MemberResult,
  MemberWithRequirements,
  Property,
  PropertyResult,
  Requirements,
} from "./types";
import { AMENITY_LABELS, FURNISHING_LABELS, floorLabel, rupees } from "./labels.ts";

type Person = { id: string; name: string; requirements: Requirements };

export function readyMembers(members: MemberWithRequirements[]): Person[] {
  return members
    .filter((m) => m.requirements && m.submittedAt)
    .map((m) => ({ id: m.id, name: m.name, requirements: m.requirements! }));
}

function hasAmenity(p: Property, a: Amenity): boolean {
  if (a === "lift") return p.lift;
  if (a === "parking") return p.parking;
  if (a === "petFriendly") return p.petFriendly;
  return p.amenities.includes(a);
}

const FURNISHING_RANK = { unfurnished: 0, semi: 1, furnished: 2 } as const;

function furnishingOk(wanted: Requirements["furnishing"]["value"], actual: Property["furnishing"]) {
  // "Unfurnished" means they have their own furniture: only unfurnished works.
  // Otherwise the flat must be at least as furnished as asked for.
  if (wanted === "unfurnished") return actual === "unfurnished";
  return FURNISHING_RANK[actual] >= FURNISHING_RANK[wanted];
}

export function checkPerson(p: Property, r: Requirements, groupSize: number): Check[] {
  const checks: Check[] = [];
  const share = Math.round(p.rent / groupSize);

  checks.push({
    id: "budget",
    label: "Budget",
    kind: "must",
    ok: share <= r.budgetMax,
    detail: `Share ${rupees(share)} · your max ${rupees(r.budgetMax)}`,
  });

  if (r.excludedAreas.length) {
    const blocked = r.excludedAreas.includes(p.area);
    checks.push({
      id: "no-go-area",
      label: blocked ? "No-go area" : "Location",
      kind: "must",
      ok: !blocked,
      detail: blocked ? `${p.area} is on your no-go list` : `${p.area} is not on your no-go list`,
    });
  }

  if (r.preferredAreas.length) {
    const ok = r.preferredAreas.includes(p.area);
    checks.push({
      id: "preferred-area",
      label: "Preferred area",
      kind: "prefer",
      ok,
      detail: ok ? `${p.area} is one of your areas` : `${p.area} isn't one of ${r.preferredAreas.join(", ")}`,
    });
  }

  if (r.officeHub !== "wfh") {
    const mins = p.commute[r.officeHub];
    checks.push({
      id: "commute",
      label: mins <= r.commuteMax ? "Commute" : "Commute exceeds limit",
      kind: r.commuteLevel,
      ok: mins <= r.commuteMax,
      detail: `${mins} min to ${r.officeHub} · limit ${r.commuteMax} min`,
    });
  }

  checks.push({
    id: "bedrooms",
    label: "Bedrooms",
    kind: "must",
    ok: p.bedrooms >= r.minBedrooms,
    detail: `${p.bedrooms} bedrooms · you need ${r.minBedrooms}+`,
  });
  checks.push({
    id: "bathrooms",
    label: "Bathrooms",
    kind: "must",
    ok: p.bathrooms >= r.minBathrooms,
    detail: `${p.bathrooms} bathrooms · you need ${r.minBathrooms}+`,
  });

  for (const [a, level] of Object.entries(r.amenities) as [Amenity, Requirements["amenities"][Amenity]][]) {
    if (!level || level === "none") continue;
    const ok = hasAmenity(p, a);
    checks.push({
      id: `amenity-${a}`,
      label: AMENITY_LABELS[a],
      kind: level,
      ok,
      detail: ok ? `Has ${AMENITY_LABELS[a].toLowerCase()}` : `No ${AMENITY_LABELS[a].toLowerCase()}`,
    });
  }

  if (r.furnishing.level !== "none") {
    const ok = furnishingOk(r.furnishing.value, p.furnishing);
    checks.push({
      id: "furnishing",
      label: "Furnishing",
      kind: r.furnishing.level,
      ok,
      detail: `${FURNISHING_LABELS[p.furnishing]} · you want ${FURNISHING_LABELS[r.furnishing.value].toLowerCase()}`,
    });
  }

  if (r.noGroundFloor) {
    checks.push({
      id: "no-ground",
      label: "Not ground floor",
      kind: "must",
      ok: p.floor > 0,
      detail: floorLabel(p.floor),
    });
  }
  if (r.maxFloor !== null && r.maxFloor !== undefined) {
    checks.push({
      id: "max-floor",
      label: "Floor limit",
      kind: "must",
      ok: p.floor <= r.maxFloor,
      detail: `${floorLabel(p.floor)} · your limit ${floorLabel(r.maxFloor).toLowerCase()}`,
    });
  }

  return checks;
}

function summarise(checks: Check[]) {
  const musts = checks.filter((c) => c.kind === "must");
  const prefers = checks.filter((c) => c.kind === "prefer");
  return {
    mustMet: musts.filter((c) => c.ok).length,
    mustTotal: musts.length,
    preferMet: prefers.filter((c) => c.ok).length,
    preferTotal: prefers.length,
  };
}

function possessive(name: string) {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

export function evaluateProperty(p: Property, people: Person[]): PropertyResult {
  const n = people.length;
  const members: MemberResult[] = people.map((person) => {
    const checks = checkPerson(p, person.requirements, n);
    return { memberId: person.id, name: person.name, checks, ...summarise(checks) };
  });

  const sum = (k: "mustMet" | "mustTotal" | "preferMet" | "preferTotal") =>
    members.reduce((s, m) => s + m[k], 0);

  const compromises = members.flatMap((m) =>
    m.checks
      .filter((c) => !c.ok)
      .map((c) => ({ memberName: m.name, label: c.id === "commute" ? "Commute" : c.label, kind: c.kind, detail: c.detail })),
  );
  compromises.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "must" ? -1 : 1));

  const brokenMusts = compromises.filter((c) => c.kind === "must");
  let mainCompromise: string;
  if (brokenMusts.length) {
    const parts = brokenMusts.map((c) => `${possessive(c.memberName)} ${c.label.toLowerCase()}`);
    mainCompromise = parts.length > 2 ? `${parts.slice(0, 2).join(", ")} and ${parts.length - 2} more` : parts.join(" and ");
  } else {
    // Nobody's must-haves break. Name whoever is giving up the most preferences.
    const byMisses = members
      .map((m) => ({ m, misses: m.checks.filter((c) => c.kind === "prefer" && !c.ok) }))
      .filter((x) => x.misses.length)
      .sort((a, b) => b.misses.length - a.misses.length);
    mainCompromise = byMisses.length
      ? `${possessive(byMisses[0].m.name)} ${byMisses[0].misses.map((c) => c.label.toLowerCase()).join(", ")}`
      : "None: everyone gets their must-haves and preferences";
  }

  const combinedBudget = people.reduce((s, x) => s + x.requirements.budgetMax, 0);
  const budgetBreakers = members.filter((m) => m.checks.some((c) => c.id === "budget" && !c.ok));
  const unevenSplitNote =
    budgetBreakers.length && combinedBudget >= p.rent
      ? `An equal split is over ${budgetBreakers.map((m) => possessive(m.name)).join(" and ")} budget, but your combined maximums (${rupees(combinedBudget)}) cover the rent. An uneven split is something you could discuss.`
      : null;

  return {
    property: p,
    share: Math.round(p.rent / n),
    members,
    mustMet: sum("mustMet"),
    mustTotal: sum("mustTotal"),
    preferMet: sum("preferMet"),
    preferTotal: sum("preferTotal"),
    peopleWithBrokenMust: members.filter((m) => m.mustMet < m.mustTotal).length,
    lowestPreferShare: Math.min(...members.map((m) => (m.preferTotal ? m.preferMet / m.preferTotal : 1))),
    compromises,
    mainCompromise,
    combinedBudget,
    unevenSplitNote,
  };
}

// Ordering rules, applied in turn. Shown verbatim in the UI.
export const RANKING_RULES = [
  "Fewest must-haves broken (for anyone)",
  "Fewest people with a broken must-have",
  "Most preferences met for whoever is getting the least",
  "Most preferences met in total",
];

export function compareResults(a: PropertyResult, b: PropertyResult): number {
  return (
    b.mustMet - b.mustTotal - (a.mustMet - a.mustTotal) ||
    a.peopleWithBrokenMust - b.peopleWithBrokenMust ||
    b.lowestPreferShare - a.lowestPreferShare ||
    b.preferMet - a.preferMet ||
    a.property.rent - b.property.rent
  );
}

export function matchAll(properties: Property[], people: Person[]): PropertyResult[] {
  return properties.map((p) => evaluateProperty(p, people)).sort(compareResults);
}

export function isFullMatch(r: PropertyResult) {
  return r.mustMet === r.mustTotal;
}

// ---- Group-level analysis, before looking at any single flat ----

export interface GroupAnalysis {
  perPerson: { name: string; feasible: number }[];
  allFeasible: number;
  totalListings: number;
  blockers: { name: string; label: string; count: number }[];
  conflicts: { title: string; detail: string }[];
}

export function analyseGroup(properties: Property[], people: Person[]): GroupAnalysis {
  const n = people.length;
  const perPerson = people.map((person) => ({
    name: person.name,
    feasible: properties.filter((p) =>
      checkPerson(p, person.requirements, n).every((c) => c.kind !== "must" || c.ok),
    ).length,
  }));
  const results = properties.map((p) => evaluateProperty(p, people));
  const allFeasible = results.filter(isFullMatch).length;

  const blockerCounts = new Map<string, { name: string; label: string; count: number }>();
  for (const r of results)
    for (const m of r.members)
      for (const c of m.checks)
        if (c.kind === "must" && !c.ok) {
          const key = `${m.name}|${c.id}`;
          const label = c.id === "commute" ? "Commute" : c.label;
          const cur = blockerCounts.get(key) ?? { name: m.name, label, count: 0 };
          cur.count++;
          blockerCounts.set(key, cur);
        }
  const blockers = [...blockerCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const conflicts: { title: string; detail: string }[] = [];

  for (const a of people)
    for (const b of people)
      if (a !== b)
        for (const area of a.requirements.preferredAreas)
          if (b.requirements.excludedAreas.includes(area))
            conflicts.push({
              title: `${area}: preferred vs. ruled out`,
              detail: `${a.name} would like ${area}, but it's on ${possessive(b.name)} no-go list.`,
            });

  const needBeds = Math.max(...people.map((x) => x.requirements.minBedrooms));
  const lowestMax = Math.min(...people.map((x) => x.requirements.budgetMax));
  const combined = people.reduce((s, x) => s + x.requirements.budgetMax, 0);
  const bigEnough = properties.filter((p) => p.bedrooms >= needBeds);
  const affordableEqual = bigEnough.filter((p) => p.rent / n <= lowestMax).length;
  const tightest = people.filter((x) => x.requirements.budgetMax === lowestMax).map((x) => x.name);
  conflicts.push({
    title: "Budget",
    detail: `With an equal split, the lowest maximum (${tightest.join(" & ")}, ${rupees(lowestMax)}) caps the rent at ${rupees(lowestMax * n)}. ${affordableEqual} of ${bigEnough.length} flats with ${needBeds}+ bedrooms fit that. Your combined maximum is ${rupees(combined)}.`,
  });

  const hubs = [...new Set(people.map((x) => x.requirements.officeHub).filter((h) => h !== "wfh"))];
  if (hubs.length > 1) {
    const commuteOk = properties.filter((p) =>
      people.every(
        (x) =>
          x.requirements.officeHub === "wfh" ||
          x.requirements.commuteLevel !== "must" ||
          p.commute[x.requirements.officeHub] <= x.requirements.commuteMax,
      ),
    ).length;
    conflicts.push({
      title: "Commutes pull in different directions",
      detail: `Offices: ${people.map((x) => `${x.name} → ${x.requirements.officeHub === "wfh" ? "works from home" : `${x.requirements.officeHub} (≤${x.requirements.commuteMax} min${x.requirements.commuteLevel === "prefer" ? ", flexible" : ""})`}`).join("; ")}. ${commuteOk} of ${properties.length} flats meet every strict commute limit.`,
    });
  }

  const amenityMusts = new Map<Amenity, string[]>();
  for (const x of people)
    for (const [a, level] of Object.entries(x.requirements.amenities) as [Amenity, string][])
      if (level === "must") amenityMusts.set(a, [...(amenityMusts.get(a) ?? []), x.name]);
  for (const [a, names] of amenityMusts) {
    const count = properties.filter((p) => hasAmenity(p, a)).length;
    if (count <= properties.length / 2)
      conflicts.push({
        title: `${AMENITY_LABELS[a]} is scarce`,
        detail: `${names.join(" & ")} ${names.length > 1 ? "need" : "needs"} ${AMENITY_LABELS[a].toLowerCase()}; only ${count} of ${properties.length} flats have it.`,
      });
  }

  const furnishings = people.filter((x) => x.requirements.furnishing.level !== "none");
  const wantsNone = furnishings.filter((x) => x.requirements.furnishing.value === "unfurnished");
  const wantsSome = furnishings.filter((x) => x.requirements.furnishing.value !== "unfurnished");
  if (wantsNone.length && wantsSome.length)
    conflicts.push({
      title: "Furnishing",
      detail: `${wantsNone.map((x) => x.name).join(" & ")} want${wantsNone.length > 1 ? "" : "s"} unfurnished; ${wantsSome.map((x) => x.name).join(" & ")} want${wantsSome.length > 1 ? "" : "s"} it furnished.`,
    });

  return { perPerson, allFeasible, totalListings: properties.length, blockers, conflicts };
}
