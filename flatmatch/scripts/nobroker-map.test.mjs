import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveArea, tenantsAllowFlatmates, normaliseFurnishing, toProperty } from "./nobroker-map.mjs";

test("resolves NoBroker spellings and nearby localities to FlatMatch areas", () => {
  assert.equal(resolveArea("Hinjawadi").name, "Hinjewadi");
  assert.equal(resolveArea("Pan Card Club Rd").name, "Baner");
  assert.equal(resolveArea("Karvenagar").name, "Kothrud");
  assert.equal(resolveArea("Tejas Nandan", "3 BHK Flat In Tejas Nandan for Rent In Tathawade Pune").name, "Ravet");
  assert.equal(resolveArea("Somewhere Else"), null);
});

test("family-only landlords are excluded, everyone else kept", () => {
  assert.equal(tenantsAllowFlatmates("Family"), false);
  assert.equal(tenantsAllowFlatmates("All"), true);
  assert.equal(tenantsAllowFlatmates("Bachelor_female"), true);
  assert.equal(tenantsAllowFlatmates("Family, Bachelors"), true);
  assert.equal(tenantsAllowFlatmates(undefined), true);
});

test("furnishing labels normalise", () => {
  assert.equal(normaliseFurnishing("Semi furnished"), "semi");
  assert.equal(normaliseFurnishing("Fully furnished"), "furnished");
  assert.equal(normaliseFurnishing("Unfurnished"), "unfurnished");
});

const search = {
  title: "3 BHK Apartment In Vrindavan Housing Complex for Rent In Kothrud Pune",
  society: "Vrindavan Housing Complex",
  locality: "Kothrud",
  rent: 40000,
  bedrooms: 3,
  bathrooms: 2,
  furnishing: "Semi furnished",
  preferredTenants: "All",
  parking: "Available",
  listingUrl: "https://www.nobroker.in/property/x/8aa9b1919f3c20d2019f3c479e5217ad/detail",
};

test("amenities not mentioned are recorded as unknown, not as absent", () => {
  const { property } = toProperty(search, { floor: 2, totalFloors: 3, lift: false, petFriendly: true, gym: false });
  assert.equal(property.lift, false);
  assert.ok(!property.unknownAmenities.includes("lift"));
  assert.ok(property.unknownAmenities.includes("pool"));
  assert.equal(property.petFriendly, true);
  assert.equal(property.parking, true); // from the search card
  assert.equal(property.area, "Kothrud");
  assert.equal(property.commuteEstimated, true);
});

test("listings without a stated floor are skipped with a reason", () => {
  assert.match(toProperty(search, {}).skip, /floor/);
  assert.match(toProperty({ ...search, preferredTenants: "Family" }, { floor: 1 }).skip, /Family/);
});
