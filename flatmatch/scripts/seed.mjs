// Upserts data/properties.json into Supabase. Usage: npm run seed
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const properties = JSON.parse(readFileSync(new URL("../data/properties.json", import.meta.url), "utf8"));
const rows = properties.map((p) => ({
  id: p.id, title: p.title, area: p.area, address: p.address, rent: p.rent,
  bedrooms: p.bedrooms, bathrooms: p.bathrooms, floor: p.floor, total_floors: p.totalFloors,
  lift: p.lift, parking: p.parking, furnishing: p.furnishing, pet_friendly: p.petFriendly,
  amenities: p.amenities, commute: p.commute, description: p.description, image_url: p.image,
  source: "mock",
}));

const db = createClient(url, key, { auth: { persistSession: false } });
const { error } = await db.from("properties").upsert(rows);
if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}
console.log(`Seeded ${rows.length} properties.`);
