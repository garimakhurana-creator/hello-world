import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import seedProperties from "@/data/properties.json";
import type { Group, GroupBundle, Member, Property, Requirements } from "./types";

// One interface, two backends. Supabase when configured (production/Vercel);
// otherwise a JSON file so the app runs locally with zero setup.

export interface Store {
  kind: "supabase" | "local";
  createGroup(input: { name: string; expectedSize: number; coordinatorName: string }): Promise<{ group: Group; member: Member }>;
  getBundle(code: string): Promise<GroupBundle | null>;
  addMember(groupId: string, name: string): Promise<Member>;
  saveRequirements(member: Member, req: Requirements): Promise<void>;
  listProperties(): Promise<Property[]>;
  getExplanation(groupId: string, scope: string, hash: string): Promise<unknown | null>;
  saveExplanation(groupId: string, scope: string, hash: string, content: unknown): Promise<void>;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// ---------------- Supabase ----------------

type RequirementsRow = {
  member_id: string;
  group_id: string;
  budget_max: number;
  office_hub: string;
  commute_max: number;
  commute_level: string;
  min_bedrooms: number;
  min_bathrooms: number;
  preferred_areas: string[];
  excluded_areas: string[];
  amenities: Requirements["amenities"];
  furnishing: Requirements["furnishing"];
  no_ground_floor: boolean;
  max_floor: number | null;
  notes: string;
};

function toRow(member: Member, r: Requirements): RequirementsRow {
  return {
    member_id: member.id,
    group_id: member.groupId,
    budget_max: r.budgetMax,
    office_hub: r.officeHub,
    commute_max: r.commuteMax,
    commute_level: r.commuteLevel,
    min_bedrooms: r.minBedrooms,
    min_bathrooms: r.minBathrooms,
    preferred_areas: r.preferredAreas,
    excluded_areas: r.excludedAreas,
    amenities: r.amenities,
    furnishing: r.furnishing,
    no_ground_floor: r.noGroundFloor,
    max_floor: r.maxFloor,
    notes: r.notes,
  };
}

function fromRow(row: RequirementsRow): Requirements {
  return {
    budgetMax: row.budget_max,
    officeHub: row.office_hub as Requirements["officeHub"],
    commuteMax: row.commute_max,
    commuteLevel: row.commute_level as Requirements["commuteLevel"],
    minBedrooms: row.min_bedrooms,
    minBathrooms: row.min_bathrooms,
    preferredAreas: row.preferred_areas ?? [],
    excludedAreas: row.excluded_areas ?? [],
    amenities: row.amenities ?? {},
    furnishing: row.furnishing,
    noGroundFloor: row.no_ground_floor,
    maxFloor: row.max_floor,
    notes: row.notes ?? "",
  };
}

type GroupRow = { id: string; code: string; name: string; expected_size: number; created_at: string };
type MemberRow = { id: string; group_id: string; name: string; role: Member["role"]; submitted_at: string | null; created_at: string };

const group = (g: GroupRow): Group => ({ id: g.id, code: g.code, name: g.name, expectedSize: g.expected_size, createdAt: g.created_at });
const member = (m: MemberRow): Member => ({ id: m.id, groupId: m.group_id, name: m.name, role: m.role, submittedAt: m.submitted_at, createdAt: m.created_at });

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

function supabaseStore(db: SupabaseClient): Store {
  return {
    kind: "supabase",
    async createGroup({ name, expectedSize, coordinatorName }) {
      const g = must(await db.from("groups").insert({ code: newCode(), name, expected_size: expectedSize }).select().single()) as GroupRow;
      const m = must(await db.from("members").insert({ group_id: g.id, name: coordinatorName, role: "coordinator" }).select().single()) as MemberRow;
      return { group: group(g), member: member(m) };
    },
    async getBundle(code) {
      const g = must(await db.from("groups").select().eq("code", code.toUpperCase()).maybeSingle()) as GroupRow | null;
      if (!g) return null;
      const ms = must(await db.from("members").select().eq("group_id", g.id).order("created_at")) as MemberRow[];
      const rs = must(await db.from("requirements").select().eq("group_id", g.id)) as RequirementsRow[];
      return {
        group: group(g),
        members: ms.map((m) => {
          const r = rs.find((x) => x.member_id === m.id);
          return { ...member(m), requirements: r ? fromRow(r) : null };
        }),
      };
    },
    async addMember(groupId, name) {
      return member(must(await db.from("members").insert({ group_id: groupId, name, role: "member" }).select().single()) as MemberRow);
    },
    async saveRequirements(m, req) {
      must(await db.from("requirements").upsert({ ...toRow(m, req), updated_at: new Date().toISOString() }));
      must(await db.from("members").update({ submitted_at: new Date().toISOString() }).eq("id", m.id));
    },
    async listProperties() {
      const rows = must(await db.from("properties").select().order("id")) as Record<string, unknown>[];
      if (!rows.length) return seedProperties as Property[];
      return rows.map((p) => ({
        id: p.id, title: p.title, area: p.area, address: p.address, rent: p.rent,
        bedrooms: p.bedrooms, bathrooms: p.bathrooms, floor: p.floor, totalFloors: p.total_floors,
        lift: p.lift, parking: p.parking, furnishing: p.furnishing, petFriendly: p.pet_friendly,
        amenities: p.amenities, commute: p.commute, description: p.description, image: p.image_url,
        source: p.source ?? "mock", sourceUrl: p.source_url ?? null, deposit: p.deposit ?? null,
        commuteEstimated: p.commute_estimated ?? false, unknownAmenities: p.unknown_amenities ?? [],
      })) as Property[];
    },
    async getExplanation(groupId, scope, hash) {
      const row = must(await db.from("explanations").select("content,input_hash").eq("group_id", groupId).eq("scope", scope).maybeSingle()) as { content: unknown; input_hash: string } | null;
      return row && row.input_hash === hash ? row.content : null;
    },
    async saveExplanation(groupId, scope, hash, content) {
      must(await db.from("explanations").upsert({ group_id: groupId, scope, input_hash: hash, content, created_at: new Date().toISOString() }));
    },
  };
}

// ---------------- Local JSON file ----------------

type LocalDb = {
  groups: Group[];
  members: Member[];
  requirements: Record<string, Requirements>;
  explanations: Record<string, { hash: string; content: unknown }>;
};

const LOCAL_PATH = process.env.VERCEL ? "/tmp/flatmatch-db.json" : path.join(process.cwd(), ".data", "db.json");
let queue: Promise<unknown> = Promise.resolve();

async function readLocal(): Promise<LocalDb> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_PATH, "utf8"));
  } catch {
    return { groups: [], members: [], requirements: {}, explanations: {} };
  }
}

// Serialise writes so two people submitting at once don't clobber each other.
function mutate<T>(fn: (db: LocalDb) => T): Promise<T> {
  const run = queue.then(async () => {
    const db = await readLocal();
    const out = fn(db);
    await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
    await fs.writeFile(LOCAL_PATH, JSON.stringify(db, null, 2));
    return out;
  });
  queue = run.catch(() => {});
  return run;
}

const localStore: Store = {
  kind: "local",
  createGroup({ name, expectedSize, coordinatorName }) {
    return mutate((db) => {
      const now = new Date().toISOString();
      const g: Group = { id: randomUUID(), code: newCode(), name, expectedSize, createdAt: now };
      const m: Member = { id: randomUUID(), groupId: g.id, name: coordinatorName, role: "coordinator", submittedAt: null, createdAt: now };
      db.groups.push(g);
      db.members.push(m);
      return { group: g, member: m };
    });
  },
  async getBundle(code) {
    const db = await readLocal();
    const g = db.groups.find((x) => x.code === code.toUpperCase());
    if (!g) return null;
    return {
      group: g,
      members: db.members
        .filter((m) => m.groupId === g.id)
        .map((m) => ({ ...m, requirements: db.requirements[m.id] ?? null })),
    };
  },
  addMember(groupId, name) {
    return mutate((db) => {
      const m: Member = { id: randomUUID(), groupId, name, role: "member", submittedAt: null, createdAt: new Date().toISOString() };
      db.members.push(m);
      return m;
    });
  },
  saveRequirements(m, req) {
    return mutate((db) => {
      db.requirements[m.id] = req;
      const row = db.members.find((x) => x.id === m.id);
      if (row) row.submittedAt = new Date().toISOString();
    });
  },
  async listProperties() {
    return seedProperties as Property[];
  },
  async getExplanation(groupId, scope, hash) {
    const e = (await readLocal()).explanations[`${groupId}:${scope}`];
    return e && e.hash === hash ? e.content : null;
  },
  saveExplanation(groupId, scope, hash, content) {
    return mutate((db) => {
      db.explanations[`${groupId}:${scope}`] = { hash, content };
    });
  },
};

let cached: Store | null = null;
export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? supabaseStore(createClient(url, key, { auth: { persistSession: false } })) : localStore;
  return cached;
}
