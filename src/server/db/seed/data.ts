import type { RequestPriority, RoleSlug } from "@/domain/constants";

/** Password for every seeded demo account (documented in the README and report). */
export const DEMO_PASSWORD = "Zega@2026!";

export const DEMO_ACCOUNTS: { email: string; name: string; role: RoleSlug; department: string; idNo?: string }[] = [
  { email: "admin@zega.test", name: "Adaeze Okafor", role: "admin", department: "Works & Services" },
  { email: "officer@zega.test", name: "Chinedu Okeke", role: "officer", department: "Works & Services" },
  {
    email: "staff@zega.test",
    name: "Dr. Funmilayo Adebayo",
    role: "staff",
    department: "Computer Science",
    idNo: "STF/0412",
  },
  {
    email: "student@zega.test",
    name: "Tobi Adewale",
    role: "student",
    department: "Computer Science",
    idNo: "ZU/2023/01027",
  },
];

export const CATEGORIES: {
  slug: string;
  name: string;
  description: string;
  icon: string;
  defaultPriority: RequestPriority;
  /** SLA speed factor: below 1 is faster than the baseline, above 1 slower. */
  slaFactor: number;
  titles: string[];
}[] = [
  {
    slug: "electrical",
    name: "Electrical",
    description: "Power outages, faulty sockets, lighting and wiring.",
    icon: "zap",
    defaultPriority: "high",
    slaFactor: 0.75,
    titles: [
      "No power in the room",
      "Faulty wall socket sparking",
      "Fluorescent tube flickering",
      "Ceiling fan not working",
      "Light switch broken",
      "Exposed wiring near the door",
      "Circuit breaker keeps tripping",
    ],
  },
  {
    slug: "furniture",
    name: "Furniture",
    description: "Broken chairs, desks, beds, wardrobes and doors.",
    icon: "armchair",
    defaultPriority: "low",
    slaFactor: 1.5,
    titles: [
      "Broken chair in row 4",
      "Desk leg is loose",
      "Wardrobe door off its hinge",
      "Bed frame cracked",
      "Door lock jammed",
      "Bookshelf collapsing",
    ],
  },
  {
    slug: "plumbing",
    name: "Plumbing",
    description: "Leaking pipes, blocked drains, toilets and water supply.",
    icon: "droplets",
    defaultPriority: "high",
    slaFactor: 1,
    titles: [
      "Leaking pipe under the sink",
      "Toilet not flushing",
      "Blocked shower drain",
      "No water supply on this floor",
      "Tap running non-stop",
      "Water dripping from the ceiling",
    ],
  },
  {
    slug: "network",
    name: "Internet & network",
    description: "Wi-Fi outages, slow internet and network ports.",
    icon: "wifi",
    defaultPriority: "medium",
    slaFactor: 0.75,
    titles: [
      "Wi-Fi down on this floor",
      "Very slow internet in the lab",
      "Network port not working",
      "Cannot connect to campus Wi-Fi",
      "Access point blinking red",
    ],
  },
  {
    slug: "classroom-equipment",
    name: "Classroom equipment",
    description: "Projectors, smart boards, speakers and lab equipment.",
    icon: "presentation",
    defaultPriority: "medium",
    slaFactor: 1,
    titles: [
      "Projector not powering on",
      "HDMI cable missing from lectern",
      "Microphone crackling",
      "Smart board not responding to touch",
      "Air conditioner not cooling",
      "Lab fume cupboard fan noisy",
    ],
  },
  {
    slug: "hostel",
    name: "Hostel maintenance",
    description: "General repairs in halls of residence.",
    icon: "building-2",
    defaultPriority: "medium",
    slaFactor: 1.25,
    titles: [
      "Window louvres broken",
      "Mosquito net torn",
      "Corridor light out",
      "Cracked floor tiles",
      "Pest infestation in the room",
      "Mould on the bathroom wall",
    ],
  },
  {
    slug: "other",
    name: "Other",
    description: "Anything that does not fit another category.",
    icon: "wrench",
    defaultPriority: "low",
    slaFactor: 1.5,
    titles: ["Signpost knocked down", "Gate not closing properly", "Drainage blocked outside the building"],
  },
];

/** Baseline SLA in minutes by priority; multiplied by each category's slaFactor. */
export const SLA_BASELINE: Record<RequestPriority, { response: number; resolution: number }> = {
  urgent: { response: 30, resolution: 4 * 60 },
  high: { response: 60, resolution: 24 * 60 },
  medium: { response: 4 * 60, resolution: 72 * 60 },
  low: { response: 24 * 60, resolution: 7 * 24 * 60 },
};

type LocationSeed = {
  code: string;
  name: string;
  kind: "campus" | "building" | "hostel" | "floor" | "room" | "outdoor";
  children?: LocationSeed[];
};

const rooms = (prefix: string, names: string[]): LocationSeed[] =>
  names.map((n, i) => ({ code: `${prefix}-${String(i + 1).padStart(2, "0")}`, name: n, kind: "room" }));

const hostelFloors = (prefix: string): LocationSeed[] =>
  [1, 2, 3].map((f) => ({
    code: `${prefix}-F${f}`,
    name: `Floor ${f}`,
    kind: "floor" as const,
    children: [
      { code: `${prefix}-F${f}-R${f}01`, name: `Room ${f}01`, kind: "room" as const },
      { code: `${prefix}-F${f}-R${f}08`, name: `Room ${f}08`, kind: "room" as const },
      { code: `${prefix}-F${f}-BATH`, name: "Shower block", kind: "room" as const },
    ],
  }));

export const LOCATION_TREE: LocationSeed = {
  code: "MAIN",
  name: "Main Campus",
  kind: "campus",
  children: [
    {
      code: "SEN",
      name: "Senate Building",
      kind: "building",
      children: rooms("SEN", ["Registry", "Bursary", "Council Chamber"]),
    },
    {
      code: "SCI",
      name: "Faculty of Science",
      kind: "building",
      children: rooms("SCI", ["Chemistry Lab", "Physics Lab", "Room 104", "Room 105"]),
    },
    {
      code: "ART",
      name: "Faculty of Arts",
      kind: "building",
      children: rooms("ART", ["Room 201", "Room 202", "Studio"]),
    },
    {
      code: "LIB",
      name: "University Library",
      kind: "building",
      children: rooms("LIB", ["Reading Room", "E-Library", "Third Floor"]),
    },
    {
      code: "LT",
      name: "Lecture Theatres",
      kind: "building",
      children: rooms("LT", ["Lecture Theatre 1", "Lecture Theatre 2", "Lecture Theatre 3"]),
    },
    {
      code: "ICT",
      name: "ICT Centre",
      kind: "building",
      children: rooms("ICT", ["Server Room", "Computer Lab", "Help Desk"]),
    },
    { code: "MOREMI", name: "Moremi Hall", kind: "hostel", children: hostelFloors("MOREMI") },
    { code: "AMINA", name: "Amina Hall", kind: "hostel", children: hostelFloors("AMINA") },
    { code: "ZIK", name: "Zik Hall", kind: "hostel", children: hostelFloors("ZIK") },
    { code: "SPORTS", name: "Sports Complex", kind: "outdoor" },
  ],
};

export const OFFICERS: { name: string; specialties: string[] }[] = [
  { name: "Chinedu Okeke", specialties: ["plumbing", "hostel"] },
  { name: "Tunde Adeyemi", specialties: ["electrical"] },
  { name: "Fatima Bello", specialties: ["network"] },
  { name: "Emeka Nwosu", specialties: ["furniture", "hostel", "other"] },
  { name: "Ibrahim Musa", specialties: ["classroom-equipment", "electrical"] },
  { name: "Ngozi Eze", specialties: ["hostel", "plumbing", "other"] },
];

export const FIRST_NAMES = [
  "Amaka",
  "Bolaji",
  "Chiamaka",
  "Damilola",
  "Ebuka",
  "Fiyin",
  "Gbenga",
  "Halima",
  "Ifeoma",
  "Jide",
  "Kelechi",
  "Lola",
  "Musa",
  "Nkechi",
  "Olumide",
  "Precious",
  "Rukayat",
  "Segun",
  "Temitope",
  "Uche",
  "Victor",
  "Wuraola",
  "Yusuf",
  "Zainab",
  "Ada",
  "Babatunde",
  "Chidi",
  "Efe",
  "Kemi",
  "Obinna",
];

export const LAST_NAMES = [
  "Adeleke",
  "Balogun",
  "Chukwu",
  "Danjuma",
  "Eze",
  "Fashola",
  "Garba",
  "Ibe",
  "Johnson",
  "Kalu",
  "Lawal",
  "Mohammed",
  "Nnamdi",
  "Ogunleye",
  "Okonkwo",
  "Olatunji",
  "Onyeka",
  "Salami",
  "Usman",
  "Yakubu",
];

export const DEPARTMENTS = [
  "Computer Science",
  "Accounting",
  "Mass Communication",
  "Economics",
  "Nursing",
  "Law",
  "Microbiology",
  "Business Administration",
  "Public Health",
  "Software Engineering",
];

export const DESCRIPTION_SNIPPETS = [
  "This started yesterday evening and is getting worse.",
  "It has been like this for three days now.",
  "Students have been complaining since Monday.",
  "Please treat this as urgent, we have an exam here this week.",
  "I reported this by phone last week but nothing happened.",
  "It is affecting everyone on this floor.",
  "Photos attached show the problem clearly.",
];

export const OFFICER_NOTES = [
  "Inspected on site, replacement part needed.",
  "Parts ordered from the store, expected tomorrow.",
  "Fixed and tested, working normally now.",
  "Temporary fix applied, permanent repair scheduled.",
  "Replaced the faulty component.",
];
