import type { CheckResult, Claim, Country, Currency, DB, DisasterEvent, Farmer, Field, Lane, Lang, Policy } from "./types";

// Demo world: Typhoon Yagi (Sept 2024). Hit the Philippines first as "Enteng", then made
// landfall in northern Vietnam. India's cast covers the North Bihar floods (Kosi / Bagmati, late
// Sept 2024) under the same monsoon-season event. Dates and coordinates are demo values; verify before the pitch.
export const EVENT_ID = "yagi-2024";

const event: DisasterEvent = {
  id: EVENT_ID,
  name: "Typhoon Yagi",
  names: { IN: "Bihar floods (Kosi & Bagmati)" },
  localNames: { PH: "Enteng", VN: "Bão Yagi (số 3)", IN: "बिहार बाढ़ (कोसी-बागमती)" },
  status: "idle",
  windows: {
    PH: { start: "2024-08-31", end: "2024-09-04" },
    VN: { start: "2024-09-05", end: "2024-09-12" },
    IN: { start: "2024-09-26", end: "2024-10-03" },
  },
  zones: [
    { country: "VN", label: "Red River Delta", center: [20.6, 106.2], radiusKm: 120 },
    { country: "PH", label: "Laguna / Rizal", center: [14.3, 121.3], radiusKm: 80 },
    { country: "IN", label: "North Bihar (Kosi / Bagmati)", center: [26.3, 86.0], radiusKm: 110 },
  ],
};

const COUNTRY: Record<Country, { sumInsuredPerHa: number; currency: Currency; wallet: Farmer["wallet"]["provider"]; phone: string; language: Lang; scheme: string }> = {
  VN: { sumInsuredPerHa: 20_000_000, currency: "VND", wallet: "MoMo", phone: "+84 9xx xxx xxx", language: "vi", scheme: "Vietnam Agricultural Insurance (rice)" },
  PH: { sumInsuredPerHa: 25_000, currency: "PHP", wallet: "GCash", phone: "+63 9xx xxx xxxx", language: "tl", scheme: "PCIC Rice Crop Insurance" },
  // Bihar runs its own state crop-assistance scheme instead of PMFBY; this is a demo insurer product.
  IN: { sumInsuredPerHa: 50_000, currency: "INR", wallet: "UPI", phone: "+91 9xxxx xxxxx", language: "hi", scheme: "Kharif Paddy Flood Cover (demo)" },
};

function wallet(country: Country): Farmer["wallet"] {
  const c = COUNTRY[country];
  return { provider: c.wallet, currency: c.currency, balance: 0, tx: [] };
}

function farmer(
  id: string,
  name: string,
  country: Country,
  region: string,
  insured: boolean,
  hero: boolean,
  language: Lang = COUNTRY[country].language,
): Farmer {
  return {
    id,
    name,
    phone: COUNTRY[country].phone,
    language,
    country,
    region,
    insured,
    hero,
    wallet: wallet(country),
    session: { awaitingBaseline: false, pendingFileIds: [], languageChosen: false },
  };
}

function policy(f: Farmer, fieldId: string, purchasedAt = "2024-05-20"): Policy {
  return {
    id: `pol-${f.id}`,
    farmerId: f.id,
    fieldIds: [fieldId],
    scheme: COUNTRY[f.country].scheme,
    perils: ["flood", "typhoon"],
    sumInsuredPerHa: COUNTRY[f.country].sumInsuredPerHa,
    currency: COUNTRY[f.country].currency,
    start: "2024-06-01",
    end: "2024-11-30",
    purchasedAt,
  };
}

const pending = (): CheckResult => ({ status: "pending", score: 0, summary: "Waiting" });
export const emptyChecks = (): Claim["checks"] => ({
  photos: pending(),
  satellite: pending(),
  weather: pending(),
  policy: pending(),
  fraud: pending(),
});

// Deterministic PRNG so the seeded dashboard looks the same after every reset.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VN_NAMES = [
  "Đỗ Văn Hùng", "Bùi Thị Lan", "Hoàng Văn Nam", "Vũ Thị Mai", "Ngô Văn Tuấn", "Đặng Thị Thu",
  "Phan Văn Long", "Lý Thị Hằng", "Trịnh Văn Sơn", "Đinh Thị Nga", "Mai Văn Phúc", "Cao Thị Yến",
  "Tạ Văn Quang", "Hồ Thị Linh",
];
const PH_NAMES = [
  "Ramon Dela Cruz", "Liza Bautista", "Eduardo Garcia", "Rosario Mendoza", "Antonio Villanueva",
  "Teresita Ramos", "Rodel Aquino", "Marites Castillo", "Danilo Navarro", "Cristina Flores",
];
const IN_NAMES = [
  "Rajesh Kumar", "Geeta Devi", "Manoj Paswan", "Rekha Kumari", "Shankar Mandal", "Anita Devi",
  "Vinod Sah", "Pooja Kumari", "Dinesh Mukhiya", "Lalita Devi",
];

export function createSeed(): DB {
  const db: DB = {
    farmers: {},
    fields: {},
    policies: {},
    events: { [EVENT_ID]: structuredClone(event) },
    claims: {},
    certificates: {},
    messages: [],
    files: {},
    counters: { VN: 100, PH: 100, IN: 100 },
  };

  // ---- Hero farmers (the demo cast) ----
  const heroes: { f: Farmer; field: Omit<Field, "farmerId" | "id">; insured: boolean }[] = [
    {
      f: farmer("h1", "Nguyễn Văn An", "VN", "Thái Bình", true, true),
      insured: true,
      field: { name: "Ruộng Đồng Bãi", lat: 20.452, lng: 106.338, areaHa: 1.2, crop: "rice", sowingDate: "2024-06-25", truthFloodedPct: 90 },
    },
    {
      f: farmer("h2", "Trần Thị Hoa", "VN", "Nam Định", true, true),
      insured: true,
      field: { name: "Ruộng Xóm Trên", lat: 20.421, lng: 106.162, areaHa: 0.8, crop: "rice", sowingDate: "2024-06-28", truthFloodedPct: 35 },
    },
    {
      f: farmer("h3", "Lê Văn Minh", "VN", "Hải Dương", true, true),
      insured: true,
      field: { name: "Ruộng Cánh Đồng Lớn", lat: 20.938, lng: 106.331, areaHa: 1.5, crop: "rice", sowingDate: "2024-06-20", truthFloodedPct: 5 },
    },
    {
      f: farmer("h4", "Phạm Văn Đức", "VN", "Hưng Yên", true, true),
      insured: true,
      field: { name: "Ruộng Bờ Sông", lat: 20.652, lng: 106.051, areaHa: 1.0, crop: "rice", sowingDate: "2024-06-22", truthFloodedPct: 85 },
    },
    {
      f: farmer("h5", "Maria Santos", "PH", "Pila, Laguna", true, true),
      insured: true,
      field: { name: "Palayan sa Bukid", lat: 14.232, lng: 121.364, areaHa: 1.0, crop: "rice", sowingDate: "2024-06-15", truthFloodedPct: 80 },
    },
    {
      f: farmer("h6", "Jose Reyes", "PH", "Victoria, Laguna", false, true),
      insured: false,
      field: { name: "Palayan ni Jose", lat: 14.215, lng: 121.329, areaHa: 0.7, crop: "rice", sowingDate: "2024-06-18", truthFloodedPct: 75 },
    },
    {
      f: { ...farmer("h7", "Ramesh Yadav", "IN", "Supaul, Bihar", true, true), regionLocal: "सुपौल, बिहार" },
      insured: true,
      field: { name: "Kosi kinare wala khet", lat: 26.123, lng: 86.605, areaHa: 0.8, crop: "rice", sowingDate: "2024-07-10", truthFloodedPct: 85 },
    },
    {
      f: { ...farmer("h8", "Sunita Devi", "IN", "Sitamarhi, Bihar", false, true), regionLocal: "सीतामढ़ी, बिहार" },
      insured: false,
      field: { name: "Bagmati wala khet", lat: 26.589, lng: 85.487, areaHa: 0.5, crop: "rice", sowingDate: "2024-07-12", truthFloodedPct: 70 },
    },
    {
      f: farmer("h9", "Arjun Mishra", "IN", "Darbhanga, Bihar", true, true, "en"),
      insured: true,
      field: { name: "North plot", lat: 26.152, lng: 85.897, areaHa: 1.4, crop: "rice", sowingDate: "2024-07-05", truthFloodedPct: 80 },
    },
    {
      f: farmer("h10", "Priya Singh", "IN", "Madhubani, Bihar", true, true, "en"),
      insured: true,
      field: { name: "Canal-side plot", lat: 26.353, lng: 86.072, areaHa: 1.0, crop: "rice", sowingDate: "2024-07-08", truthFloodedPct: 10 },
    },
  ];

  for (const h of heroes) {
    const fieldId = `fld-${h.f.id}`;
    db.farmers[h.f.id] = h.f;
    db.fields[fieldId] = {
      ...h.field,
      id: fieldId,
      farmerId: h.f.id,
      satBefore: `/sat/${fieldId}-before.png`,
      satAfter: `/sat/${fieldId}-after.png`,
    };
    if (h.insured) {
      const p = policy(h.f, fieldId);
      db.policies[p.id] = p;
    }
  }

  // ---- Background farmers + pre-verified claims, so the dashboard has real volume ----
  const rand = mulberry32(42);
  const bg: { names: string[]; country: Country; center: [number, number]; region: string }[] = [
    { names: VN_NAMES, country: "VN", center: [20.55, 106.2], region: "Red River Delta" },
    { names: PH_NAMES, country: "PH", center: [14.25, 121.33], region: "Laguna" },
    { names: IN_NAMES, country: "IN", center: [26.3, 86.0], region: "North Bihar" },
  ];
  for (const group of bg) {
    group.names.forEach((name, i) => {
      const id = `${group.country.toLowerCase()}${i + 1}`;
      const f = farmer(id, name, group.country, group.region, true, false);
      const fieldId = `fld-${id}`;
      const spread = group.country === "PH" ? 0.18 : 0.45;
      const fld: Field = {
        id: fieldId,
        farmerId: id,
        name: `Field ${i + 1}`,
        lat: +(group.center[0] + (rand() - 0.5) * spread).toFixed(4),
        lng: +(group.center[1] + (rand() - 0.5) * spread).toFixed(4),
        areaHa: +(0.5 + rand() * 1.5).toFixed(1),
        crop: "rice",
        sowingDate: "2024-06-20",
        truthFloodedPct: Math.round(20 + rand() * 75),
      };
      const p = policy(f, fieldId);
      db.farmers[id] = f;
      db.fields[fieldId] = fld;
      db.policies[p.id] = p;
      const r = rand();
      const lane: Lane = r < 0.62 ? "approve" : r < 0.87 ? "review" : "reject";
      const claim = seededClaim(db, f, fld, p, lane, rand);
      if (lane === "approve" && rand() < 0.35) {
        claim.status = "approved";
        claim.settledAt = "2024-09-13T09:00:00Z";
      }
      db.claims[claim.id] = claim;
    });
  }

  // ---- Seeded hero claims that demonstrate review + fraud lanes ----
  const dupSource = Object.values(db.claims).find((c) => c.farmerId.startsWith("vn") && c.lane === "approve");
  addHeroSeeded(db, "h2", "review", [], {
    photos: { status: "warn", score: 0.55, summary: "Partial lodging visible on the field edge; centre of field looks intact. Estimated loss 30%.", source: "seed" },
    satellite: { status: "warn", score: 0.6, summary: "Radar shows flooding on ~35% of the field, mostly along the canal side.", source: "seed" },
  }, 30, "Field partly flooded near the canal. Rice lodged in some areas.");
  addHeroSeeded(db, "h3", "reject", [
    { type: "location_mismatch", severity: "high", detail: "Photo GPS is 31.4 km from the registered field (Hải Dương). Photo appears to be from a different district." },
  ], {
    photos: { status: "pass", score: 0.85, summary: "Photos show a fully submerged rice field, estimated 90% loss.", source: "seed" },
    satellite: { status: "fail", score: 0.1, summary: "Registered field shows no change in radar backscatter: not flooded (~5%).", source: "seed" },
  }, 90, "My whole field is underwater, total loss.");
  addHeroSeeded(db, "h4", "reject", [
    { type: "duplicate_photo", severity: "high", detail: `Photo is a cropped copy of a photo already submitted in claim ${dupSource?.id ?? "VN-2024-0103"}.` },
  ], {
    photos: { status: "pass", score: 0.8, summary: "Photo shows flooded rice field, estimated 85% loss.", source: "seed" },
    satellite: { status: "pass", score: 0.9, summary: "Radar confirms flooding on ~85% of the registered field.", source: "seed" },
  }, 85, "Lúa ngập hết, mất trắng.");

  return db;
}

function nextClaimId(db: DB, country: Country) {
  db.counters[country] += 1;
  return `${country}-2024-${String(db.counters[country]).padStart(4, "0")}`;
}

export function allocateClaimId(db: DB, country: Country) {
  return nextClaimId(db, country);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function payoutFor(p: Policy, fld: Field, lossPct: number) {
  const raw = (p.sumInsuredPerHa * fld.areaHa * lossPct) / 100;
  const step = p.currency === "VND" ? 1000 : 10;
  return Math.round(raw / step) * step;
}

function seededClaim(db: DB, f: Farmer, fld: Field, p: Policy, lane: Lane, rand: () => number): Claim {
  const loss = lane === "reject" ? fld.truthFloodedPct : Math.max(25, fld.truthFloodedPct);
  const conf = lane === "approve" ? 0.8 + rand() * 0.17 : lane === "review" ? 0.52 + rand() * 0.25 : 0.12 + rand() * 0.25;
  const fraudFlags = lane === "reject"
    ? [{ type: rand() < 0.5 ? "location_mismatch" : "timestamp_before_event", severity: "high" as const, detail: rand() < 0.5 ? "Photo GPS does not match the registered field." : "Photo was taken before the event started." }]
    : [];
  const window = db.events[EVENT_ID].windows[f.country];
  const claim: Claim = {
    id: nextClaimId(db, f.country),
    farmerId: f.id,
    fieldId: fld.id,
    policyId: p.id,
    eventId: EVENT_ID,
    insured: true,
    createdAt: `${window.end}T0${Math.floor(rand() * 9)}:${String(Math.floor(rand() * 59)).padStart(2, "0")}:00Z`,
    language: f.language,
    description: "Rice field flooded after the typhoon.",
    extracted: { crop: "rice", cropStage: "heading", damageType: "flood", lossPctEstimate: loss },
    details: {
      lossDate: addDays(window.start, 2),
      cause: "flood",
      affectedAreaHa: fld.areaHa,
      lossPct: loss,
      payoutConfirmed: true,
      declaration: { accepted: true, at: `${window.end}T00:00:00Z` },
    },
    photoIds: [],
    checks: {
      photos: { status: lane === "reject" ? "warn" : "pass", score: lane === "reject" ? 0.5 : 0.85, summary: `Flooded rice visible, estimated ${loss}% loss.`, source: "seed" },
      satellite: { status: fld.truthFloodedPct > 50 ? "pass" : "warn", score: fld.truthFloodedPct > 50 ? 0.9 : 0.6, summary: `Radar shows ~${fld.truthFloodedPct}% of field flooded.`, source: "seed" },
      weather: { status: "pass", score: 0.95, summary: "Heavy rainfall recorded during the event window.", source: "seed" },
      policy: { status: "pass", score: 1, summary: "Active policy, flood and typhoon covered.", source: "rules" },
      fraud: fraudFlags.length
        ? { status: "fail", score: 0.1, summary: fraudFlags[0].detail, source: "seed" }
        : { status: "pass", score: 1, summary: "No fraud signals.", source: "seed" },
    },
    fraudFlags,
    confidence: +conf.toFixed(2),
    lane,
    lossPct: loss,
    payout: { amount: lane === "reject" ? 0 : payoutFor(p, fld, loss), currency: p.currency },
    memo: `Seeded claim. Recommendation: ${lane.toUpperCase()} at ${Math.round(conf * 100)}% confidence.`,
    status: "decided",
    seeded: true,
  };
  return claim;
}

function addHeroSeeded(
  db: DB,
  farmerId: string,
  lane: Lane,
  fraudFlags: Claim["fraudFlags"],
  overrides: Partial<Claim["checks"]>,
  lossPct: number,
  description: string,
) {
  const f = db.farmers[farmerId];
  const fld = db.fields[`fld-${farmerId}`];
  const p = db.policies[`pol-${farmerId}`];
  const rand = mulberry32(farmerId.charCodeAt(1));
  const c = seededClaim(db, f, fld, p, lane, rand);
  c.description = description;
  c.extracted.lossPctEstimate = lossPct;
  c.details!.lossPct = lossPct;
  c.fraudFlags = fraudFlags;
  c.checks = { ...c.checks, ...overrides };
  c.checks.fraud = fraudFlags.length
    ? { status: "fail", score: 0.1, summary: fraudFlags.map((x) => x.detail).join(" "), source: "seed" }
    : { status: "pass", score: 1, summary: "No fraud signals.", source: "seed" };
  c.lossPct = lossPct;
  c.confidence = lane === "review" ? 0.64 : 0.24;
  c.payout = { amount: lane === "reject" ? 0 : payoutFor(p, fld, lossPct), currency: p.currency };
  c.memo =
    lane === "review"
      ? "Partial flooding confirmed by radar on the canal side only. Photo loss estimate (30%) is consistent with satellite (35%). Recommend field assessor visit to confirm extent before payout."
      : `Do not pay. ${fraudFlags.map((x) => x.detail).join(" ")} Refer to investigations.`;
  db.claims[c.id] = c;
}

export { payoutFor };
