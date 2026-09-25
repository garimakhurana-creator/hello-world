// Shared shapes. This file has no runtime code so it can be imported from
// both Next.js and plain `node --test` (type-only imports are erased).

export type Level = "must" | "prefer" | "none";

export const HUBS = ["Hinjewadi", "Shivajinagar", "Kharadi", "Magarpatta"] as const;
export type Hub = (typeof HUBS)[number];

export const AMENITIES = [
  "lift",
  "parking",
  "gym",
  "pool",
  "powerBackup",
  "security",
  "balcony",
  "petFriendly",
] as const;
export type Amenity = (typeof AMENITIES)[number];

export type Furnishing = "furnished" | "semi" | "unfurnished";

export interface Property {
  id: string;
  title: string;
  area: string;
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  floor: number; // 0 = ground
  totalFloors: number;
  lift: boolean;
  parking: boolean;
  furnishing: Furnishing;
  petFriendly: boolean;
  amenities: Amenity[]; // extra amenities beyond lift/parking/petFriendly
  commute: Record<Hub, number>; // peak-hour minutes to each office hub
  description: string;
  image: string;
  // Set for imported (real) listings; absent on mock data.
  source?: "mock" | "nobroker";
  sourceUrl?: string | null;
  deposit?: number | null;
  commuteEstimated?: boolean; // commute derived from the area, not the exact address
  unknownAmenities?: Amenity[]; // listing didn't say either way
}

export interface Requirements {
  budgetMax: number; // max monthly contribution, always a must-have
  officeHub: Hub | "wfh";
  commuteMax: number; // minutes
  commuteLevel: Exclude<Level, "none">;
  minBedrooms: number; // must-have
  minBathrooms: number; // must-have
  preferredAreas: string[]; // prefer
  excludedAreas: string[]; // must (dealbreaker)
  amenities: Partial<Record<Amenity, Level>>;
  furnishing: { value: Furnishing; level: Level };
  noGroundFloor: boolean; // dealbreaker
  maxFloor: number | null; // dealbreaker, e.g. vertigo / no lift trust
  notes: string; // free text, shown to the group, never used for matching
}

export interface Group {
  id: string;
  code: string;
  name: string;
  expectedSize: number;
  createdAt: string;
}

export interface Member {
  id: string;
  groupId: string;
  name: string;
  role: "coordinator" | "member";
  submittedAt: string | null;
  createdAt: string;
}

export interface MemberWithRequirements extends Member {
  requirements: Requirements | null;
}

export interface GroupBundle {
  group: Group;
  members: MemberWithRequirements[];
}

// ---- Matching output ----

export interface Check {
  id: string;
  label: string; // short: "Budget"
  kind: "must" | "prefer";
  ok: boolean;
  detail: string; // exact reason: "Share ₹15,000 ≤ max ₹17,000"
}

export interface MemberResult {
  memberId: string;
  name: string;
  checks: Check[];
  mustMet: number;
  mustTotal: number;
  preferMet: number;
  preferTotal: number;
}

export interface PropertyResult {
  property: Property;
  share: number; // equal split per person
  members: MemberResult[];
  mustMet: number;
  mustTotal: number;
  preferMet: number;
  preferTotal: number;
  peopleWithBrokenMust: number;
  lowestPreferShare: number; // 0..1, preferences met by the least-satisfied person
  compromises: { memberName: string; label: string; kind: "must" | "prefer"; detail: string }[];
  mainCompromise: string;
  combinedBudget: number;
  unevenSplitNote: string | null;
}
