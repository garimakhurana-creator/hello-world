import type { Requirements } from "./types";

// Sample answers used by "Try the demo". Realistic enough to produce real
// tension: offices on opposite sides of the city, a pet, a scooter.
export const DEMO_MEMBERS: { name: string; requirements: Requirements }[] = [
  {
    name: "Riya",
    requirements: {
      budgetMax: 17000,
      officeHub: "Hinjewadi",
      commuteMax: 40,
      commuteLevel: "must",
      minBedrooms: 3,
      minBathrooms: 2,
      preferredAreas: ["Baner", "Aundh", "Balewadi"],
      excludedAreas: ["Pimple Saudagar", "Hinjewadi"],
      amenities: { lift: "must", powerBackup: "must", gym: "prefer", security: "prefer" },
      furnishing: { value: "semi", level: "prefer" },
      noGroundFloor: true,
      maxFloor: null,
      notes: "I work late, so I'd rather not be far from the office. Gym in the building would be lovely.",
    },
  },
  {
    name: "Meera",
    requirements: {
      budgetMax: 18000,
      officeHub: "Shivajinagar",
      commuteMax: 35,
      commuteLevel: "prefer",
      minBedrooms: 3,
      minBathrooms: 3,
      preferredAreas: ["Aundh", "Kothrud"],
      excludedAreas: ["Wakad", "Hinjewadi"],
      amenities: { lift: "must", petFriendly: "must", balcony: "prefer" },
      furnishing: { value: "semi", level: "prefer" },
      noGroundFloor: false,
      maxFloor: null,
      notes: "My cat Biscuit comes with me. That's non-negotiable. I really want my own bathroom.",
    },
  },
  {
    name: "Kavita",
    requirements: {
      budgetMax: 18000,
      officeHub: "Magarpatta",
      commuteMax: 55,
      commuteLevel: "must",
      minBedrooms: 3,
      minBathrooms: 2,
      preferredAreas: ["Koregaon Park", "Kalyani Nagar", "Aundh"],
      excludedAreas: [],
      amenities: { parking: "must", balcony: "prefer", security: "prefer" },
      furnishing: { value: "furnished", level: "prefer" },
      noGroundFloor: false,
      maxFloor: 12,
      notes: "I ride a scooter so I need parking. Not comfortable living too high up.",
    },
  },
];
