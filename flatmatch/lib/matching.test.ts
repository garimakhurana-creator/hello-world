import { test } from "node:test";
import assert from "node:assert/strict";
import properties from "../data/properties.json" with { type: "json" };
import { analyseGroup, checkPerson, evaluateProperty, matchAll } from "./matching.ts";
import { DEMO_MEMBERS } from "./demo.ts";
import type { Property, Requirements } from "./types";

const props = properties as Property[];
const people = DEMO_MEMBERS.map((m, i) => ({ id: String(i), name: m.name, requirements: m.requirements }));
const byId = (id: string) => props.find((p) => p.id === id)!;

const base: Requirements = {
  budgetMax: 20000,
  officeHub: "wfh",
  commuteMax: 30,
  commuteLevel: "must",
  minBedrooms: 3,
  minBathrooms: 2,
  preferredAreas: [],
  excludedAreas: [],
  amenities: {},
  furnishing: { value: "semi", level: "none" },
  noGroundFloor: false,
  maxFloor: null,
  notes: "",
};

test("budget uses an equal split of the rent", () => {
  const p = byId("p01"); // 45,000 → 15,000 each
  assert.equal(checkPerson(p, { ...base, budgetMax: 15000 }, 3).find((c) => c.id === "budget")!.ok, true);
  assert.equal(checkPerson(p, { ...base, budgetMax: 14999 }, 3).find((c) => c.id === "budget")!.ok, false);
});

test("prefer-level misses never count as broken must-haves", () => {
  const r = evaluateProperty(byId("p01"), [
    { id: "a", name: "A", requirements: { ...base, budgetMax: 50000, preferredAreas: ["Aundh"], amenities: { gym: "prefer" } } },
  ]);
  assert.equal(r.mustMet, r.mustTotal);
  assert.equal(r.preferMet, 0);
  assert.equal(r.preferTotal, 2);
});

test("unfurnished preference only matches unfurnished flats", () => {
  const req = { ...base, furnishing: { value: "unfurnished" as const, level: "must" as const } };
  assert.equal(checkPerson(byId("p11"), req, 3).find((c) => c.id === "furnishing")!.ok, true);
  assert.equal(checkPerson(byId("p02"), req, 3).find((c) => c.id === "furnishing")!.ok, false);
});

test("uneven split note appears only when combined budget covers the rent", () => {
  const r = evaluateProperty(byId("p02"), [
    { id: "a", name: "A", requirements: { ...base, budgetMax: 15000 } },
    { id: "b", name: "B", requirements: { ...base, budgetMax: 19000 } },
    { id: "c", name: "C", requirements: { ...base, budgetMax: 19000 } },
  ]); // 52,000 rent, 53,000 combined
  assert.ok(r.unevenSplitNote);
});

test("results are sorted so full matches come first", () => {
  const results = matchAll(props, people);
  const broken = results.map((r) => r.mustTotal - r.mustMet);
  assert.deepEqual(broken, [...broken].sort((a, b) => a - b));
});

test("demo group prints a readable shortlist", () => {
  const results = matchAll(props, people);
  for (const r of results.slice(0, 5)) {
    console.log(
      `${r.property.title} ₹${r.property.rent}: must ${r.mustMet}/${r.mustTotal}, prefer ${r.preferMet}/${r.preferTotal} · ${r.mainCompromise}`,
    );
  }
  const a = analyseGroup(props, people);
  console.log(a.perPerson, "all:", a.allFeasible, a.blockers);
  for (const c of a.conflicts) console.log("-", c.title, ":", c.detail);
});
