import { AMENITIES, HUBS, type Amenity, type Level, type Requirements } from "./types";
import { AREAS } from "./labels";

// Server-side clean-up of a submitted form. Anything unexpected is dropped or
// clamped rather than trusted.

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const level = (v: unknown): Level => (v === "must" || v === "prefer" ? v : "none");
const areas = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((a) => AREAS.includes(a)))] : []);

export function cleanName(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 40) : "";
  return s.length ? s : null;
}

export function cleanRequirements(raw: unknown): Requirements {
  const r = (raw ?? {}) as Record<string, unknown>;
  const amenitiesIn = (r.amenities ?? {}) as Record<string, unknown>;
  const amenities: Partial<Record<Amenity, Level>> = {};
  for (const a of AMENITIES) {
    const l = level(amenitiesIn[a]);
    if (l !== "none") amenities[a] = l;
  }
  const furnishingIn = (r.furnishing ?? {}) as Record<string, unknown>;
  const fv = furnishingIn.value;
  const preferred = areas(r.preferredAreas);
  const excluded = areas(r.excludedAreas).filter((a) => !preferred.includes(a));

  return {
    budgetMax: int(r.budgetMax, 1000, 500000, 15000),
    officeHub: (HUBS as readonly string[]).includes(r.officeHub as string) ? (r.officeHub as Requirements["officeHub"]) : "wfh",
    commuteMax: int(r.commuteMax, 5, 180, 45),
    commuteLevel: r.commuteLevel === "prefer" ? "prefer" : "must",
    minBedrooms: int(r.minBedrooms, 1, 6, 3),
    minBathrooms: int(r.minBathrooms, 1, 6, 2),
    preferredAreas: preferred,
    excludedAreas: excluded,
    amenities,
    furnishing: {
      value: fv === "furnished" || fv === "unfurnished" ? fv : "semi",
      level: level(furnishingIn.level),
    },
    noGroundFloor: r.noGroundFloor === true,
    maxFloor: r.maxFloor === null || r.maxFloor === undefined || r.maxFloor === "" ? null : int(r.maxFloor, 0, 60, 10),
    notes: typeof r.notes === "string" ? r.notes.slice(0, 500) : "",
  };
}
