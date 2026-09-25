import type { Amenity, Furnishing } from "./types";
import areaTable from "../data/areas.json" with { type: "json" };

export const AMENITY_LABELS: Record<Amenity, string> = {
  lift: "Lift",
  parking: "Parking",
  gym: "Gym in building",
  pool: "Swimming pool",
  powerBackup: "Power backup",
  security: "24×7 security",
  balcony: "Balcony",
  petFriendly: "Pet-friendly",
};

export const FURNISHING_LABELS: Record<Furnishing, string> = {
  furnished: "Fully furnished",
  semi: "Semi-furnished",
  unfurnished: "Unfurnished",
};

export const AREAS: string[] = areaTable.map((a) => a.name);

export function rupees(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function floorLabel(floor: number): string {
  if (floor === 0) return "Ground floor";
  const s = ["th", "st", "nd", "rd"];
  const v = floor % 100;
  return floor + (s[(v - 20) % 10] || s[v] || s[0]) + " floor";
}
