export type Lang = "vi" | "tl" | "hi" | "en";
export type Country = "VN" | "PH" | "IN";
export type Currency = "VND" | "PHP" | "INR";

export type CheckStatus = "pending" | "running" | "pass" | "warn" | "fail" | "skipped";
export type CheckSource = "gemini" | "fallback" | "rules" | "open-meteo" | "seed";

export interface CheckResult {
  status: CheckStatus;
  score: number; // 0..1, how strongly this check supports the claim
  summary: string;
  source?: CheckSource;
  details?: Record<string, unknown>;
}

export type CheckKey = "photos" | "satellite" | "weather" | "policy" | "fraud";
export type Lane = "approve" | "review" | "reject";

export interface FraudFlag {
  type: string;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface WalletTx {
  id: string;
  amount: number;
  type: "advance" | "settlement";
  claimId: string;
  at: string;
}

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  language: Lang;
  country: Country;
  region: string;
  /** Region in the local script, for local-language messages and speech. */
  regionLocal?: string;
  insured: boolean;
  hero: boolean;
  wallet: { provider: "MoMo" | "GCash" | "UPI"; currency: Currency; balance: number; tx: WalletTx[] };
  session: { awaitingBaseline: boolean; pendingFileIds: string[]; languageChosen?: boolean; draft?: ClaimDraft };
}

/** The mandatory details every claim needs from the farmer, on top of what registration already holds. */
export type DetailKey = "lossDate" | "cause" | "affectedArea" | "lossPct" | "payout" | "declaration";
export type LossCause = "flood" | "heavy_rain" | "storm_wind" | "other";

export interface ClaimDetails {
  /** YYYY-MM-DD, or "unknown" when the farmer is not sure. */
  lossDate?: string;
  cause?: LossCause;
  affectedAreaHa?: number;
  lossPct?: number;
  /** Insured farmers only: payout goes to the registered wallet. false = farmer wants a different account. */
  payoutConfirmed?: boolean;
  declaration?: { accepted: true; at: string };
}

/** A claim being assembled in chat: photos and story are in, mandatory details are being collected. */
export interface ClaimDraft {
  fieldId: string;
  description: string;
  photoIds: string[];
  extracted: Claim["extracted"];
  details: ClaimDetails;
}

export interface Field {
  id: string;
  farmerId: string;
  name: string;
  lat: number;
  lng: number;
  areaHa: number;
  crop: string;
  sowingDate: string;
  satBefore?: string; // public path
  satAfter?: string;
  truthFloodedPct: number; // used only when Gemini is unavailable
  baseline?: { fileIds: string[]; at: string };
}

export interface Policy {
  id: string;
  farmerId: string;
  fieldIds: string[];
  scheme: string;
  perils: string[];
  sumInsuredPerHa: number;
  currency: Currency;
  start: string;
  end: string;
  purchasedAt: string;
}

export interface DisasterEvent {
  id: string;
  name: string;
  /** Per-country event name when a country was hit by a different system (e.g. India: Bihar floods). */
  names?: Partial<Record<Country, string>>;
  localNames: Partial<Record<Country, string>>;
  status: "idle" | "forecast" | "landfall";
  windows: Record<Country, { start: string; end: string }>;
  zones: { country: Country; label: string; center: [number, number]; radiusKm: number }[];
  warnedAt?: string;
  outreachAt?: string;
}

export interface PhotoMeta {
  lat?: number;
  lng?: number;
  takenAt?: string;
  software?: string;
}

export interface StoredFile {
  id: string;
  kind: "image" | "audio";
  mime: string;
  data: Buffer;
  createdAt: string;
  meta?: PhotoMeta;
  hash?: string; // perceptual hash for images
  coach?: { usable: boolean; issue: string; tip: string };
  transcript?: { text: string; english: string };
}

export interface Claim {
  id: string;
  farmerId: string;
  fieldId: string;
  policyId?: string;
  eventId: string;
  insured: boolean;
  createdAt: string;
  language: Lang;
  description: string;
  extracted: { crop?: string; cropStage?: string; damageType?: string; lossPctEstimate?: number };
  details?: ClaimDetails;
  photoIds: string[];
  checks: Record<CheckKey, CheckResult>;
  fraudFlags: FraudFlag[];
  confidence?: number;
  lane?: Lane;
  lossPct?: number;
  payout?: { amount: number; currency: Currency };
  memo?: string;
  farmerLetter?: string;
  farmerLetterI18n?: Partial<Record<Lang, string>>;
  status: "verifying" | "decided" | "approved" | "rejected" | "certified";
  advance?: { amount: number; at: string };
  settledAt?: string;
  certificateId?: string;
  appeals?: { at: string; reason: string; previousPhotoIds: string[]; previousConfidence?: number }[];
  seeded?: boolean;
}

export interface Certificate {
  id: string;
  claimId: string;
  farmerId: string;
  fieldId: string;
  eventId: string;
  verifiedLossPct: number;
  confidence: number;
  issuedAt: string;
  evidence: string[];
}

export type MessageCard =
  | { type: "advance"; amount: number; currency: Currency; provider: string; claimId: string }
  | { type: "settlement"; amount: number; currency: Currency; provider: string; claimId: string }
  | { type: "decision"; claimId: string; lane: Lane; confidence: number; payout?: number; currency?: Currency }
  | { type: "certificate"; certificateId: string }
  | { type: "enroll"; premium: string }
  | { type: "warning"; eventName: string; localName?: string }
  | { type: "question"; key: DetailKey; options: { value: string; i18n: Partial<Record<Lang, string>> }[]; answer?: string }
  | {
      type: "declaration";
      fieldName: string;
      crop: string;
      sowingDate: string;
      areaHa: number;
      policyId?: string;
      details: ClaimDetails;
      payoutTo?: string;
      accepted?: boolean;
    };

export interface Message {
  id: string;
  farmerId: string;
  role: "farmer" | "agent";
  text: string;
  fileIds?: string[];
  card?: MessageCard;
  /** Same text in every language, for scripted messages; the view picks the farmer's current language. */
  i18n?: Partial<Record<Lang, string>>;
  at: string;
}

export interface DB {
  farmers: Record<string, Farmer>;
  fields: Record<string, Field>;
  policies: Record<string, Policy>;
  events: Record<string, DisasterEvent>;
  claims: Record<string, Claim>;
  certificates: Record<string, Certificate>;
  messages: Message[];
  files: Record<string, StoredFile>;
  counters: Record<Country, number>;
}
