import { T, tr, type L10n } from "../i18n";
import { emptyChecks, allocateClaimId } from "../seed";
import { addMessage, credit, db, nowIso, policyFor, uid } from "../store";
import type { CheckKey, CheckResult, Claim, Country } from "../types";
import { assessPhotos, dedupFlags, fraudCheck, fraudResult, policyCheck, satelliteCheck, statementCheck, weatherCheck } from "./checks";
import { ADVANCE_PCT, computePayout, scoreClaim, writeFarmerLetter, writeMemo } from "./decide";
import { sendRecoveryPlan } from "./outreach";

export function createClaim(input: {
  farmerId: string;
  fieldId: string;
  eventId: string;
  description: string;
  photoIds: string[];
  extracted: Claim["extracted"];
  details?: Claim["details"];
}): Claim {
  const store = db();
  const farmer = store.farmers[input.farmerId];
  const policy = policyFor(farmer.id, input.fieldId);
  const claim: Claim = {
    id: allocateClaimId(store, farmer.country),
    farmerId: farmer.id,
    fieldId: input.fieldId,
    policyId: policy?.id,
    eventId: input.eventId,
    insured: Boolean(policy),
    createdAt: nowIso(),
    language: farmer.language,
    description: input.description,
    extracted: input.extracted,
    details: input.details,
    photoIds: input.photoIds,
    checks: emptyChecks(),
    fraudFlags: [],
    status: "verifying",
  };
  store.claims[claim.id] = claim;
  return claim;
}

async function track(claim: Claim, key: CheckKey, run: () => Promise<CheckResult> | CheckResult) {
  claim.checks[key] = { status: "running", score: 0, summary: "Checking…" };
  try {
    claim.checks[key] = await run();
  } catch (e) {
    console.error(`[pipeline] ${claim.id} ${key} failed`, e);
    claim.checks[key] = { status: "warn", score: 0.5, summary: `Check could not complete: ${(e as Error).message}`, source: "rules" };
  }
}

/** Runs every verification check in parallel, then decides, pays the advance, and messages the farmer. */
export async function runPipeline(claimId: string) {
  const store = db();
  const claim = store.claims[claimId];
  const farmer = store.farmers[claim.farmerId];
  const field = store.fields[claim.fieldId];
  const event = store.events[claim.eventId];
  const policy = claim.policyId ? store.policies[claim.policyId] : undefined;
  const country = farmer.country;

  await Promise.all([
    track(claim, "photos", () => assessPhotos(claim, field)),
    track(claim, "satellite", () => satelliteCheck(field, event, country)),
    track(claim, "weather", () => weatherCheck(field, event, country)),
    track(claim, "policy", () => policyCheck(claim, field, policy, event, country)),
    track(claim, "fraud", async () => {
      const { result, flags } = await fraudCheck(claim, field, policy, event, country);
      claim.fraudFlags = flags;
      return result;
    }),
  ]);

  // Now that the evidence is in, check the farmer's own answers against it.
  const said = statementCheck(claim, field);
  if (said.length) {
    claim.fraudFlags = dedupFlags([...claim.fraudFlags, ...said]);
    claim.checks.fraud = fraudResult(claim.fraudFlags);
  }

  const { confidence, lane, lossPct } = scoreClaim(claim);
  claim.confidence = confidence;
  claim.lane = lane;
  claim.lossPct = lossPct;
  claim.payout = computePayout(policy, field, lossPct, lane);

  let advance: number | undefined;
  const clean = !claim.fraudFlags.some((f) => f.severity !== "low");
  // No instant money if the farmer asked to change the payout account: an officer confirms it first.
  const payoutOk = claim.details?.payoutConfirmed !== false;
  if (claim.insured && lane === "approve" && clean && payoutOk && claim.payout) {
    const step = claim.payout.currency === "VND" ? 1000 : 10;
    advance = Math.round((claim.payout.amount * ADVANCE_PCT) / step) * step;
  }

  try {
    claim.memo = await writeMemo(claim, farmer, field, policy);
  } catch (e) {
    console.error("[pipeline] memo failed", e);
    claim.memo = `Recommend ${lane.toUpperCase()} at ${Math.round(confidence * 100)}% confidence.`;
  }
  try {
    const letter = await writeFarmerLetter(claim, farmer, advance);
    claim.farmerLetter = letter.text;
    claim.farmerLetterI18n = letter.i18n;
  } catch (e) {
    console.error("[pipeline] letter failed", e);
    claim.farmerLetter = `Claim ${claim.id}: ${lane}.`;
  }

  if (!claim.insured) {
    // Clear cases get a certificate straight away; the rest wait for an officer in the review/reject lane.
    if (lane === "approve") issueCertificate(claim);
    else {
      claim.status = "decided";
      addMessage(farmer.id, "agent", claim.farmerLetter, { i18n: claim.farmerLetterI18n });
    }
  } else {
    claim.status = "decided";
    addMessage(farmer.id, "agent", claim.farmerLetter, {
      i18n: claim.farmerLetterI18n,
      card: { type: "decision", claimId: claim.id, lane, confidence, payout: claim.payout?.amount, currency: claim.payout?.currency },
    });
    if (advance && claim.payout) {
      claim.advance = { amount: advance, at: nowIso() };
      credit(farmer, advance, "advance", claim.id);
      const amount = new Intl.NumberFormat("en", { style: "currency", currency: claim.payout.currency, maximumFractionDigits: 0 }).format(advance);
      const i18n = T.advance(amount, farmer.wallet.provider);
      addMessage(farmer.id, "agent", tr(i18n, farmer.language), {
        i18n,
        card: { type: "advance", amount: advance, currency: claim.payout.currency, provider: farmer.wallet.provider, claimId: claim.id },
      });
    }
  }

  if (lane !== "reject") {
    await sendRecoveryPlan(claim, farmer, event).catch((e) => console.error("[pipeline] recovery plan failed", e));
  }
  return claim;
}

function issueCertificate(claim: Claim, letter: { text: string; i18n?: L10n } = { text: claim.farmerLetter ?? "", i18n: claim.farmerLetterI18n as L10n | undefined }) {
  const store = db();
  const farmer = store.farmers[claim.farmerId];
  const certId = uid("cert");
  store.certificates[certId] = {
    id: certId,
    claimId: claim.id,
    farmerId: farmer.id,
    fieldId: claim.fieldId,
    eventId: claim.eventId,
    verifiedLossPct: claim.lossPct ?? 0,
    confidence: claim.confidence ?? 0,
    issuedAt: nowIso(),
    evidence: (["photos", "satellite", "weather", "fraud"] as CheckKey[]).map((k) => claim.checks[k].summary),
  };
  claim.certificateId = certId;
  claim.status = "certified";
  addMessage(farmer.id, "agent", letter.text, { i18n: letter.i18n, card: { type: "certificate", certificateId: certId } });
  addMessage(farmer.id, "agent", tr(T.enroll(), farmer.language), {
    i18n: T.enroll(),
    card: { type: "enroll", premium: PREMIUM[farmer.country] },
  });
}

const PREMIUM: Record<Country, string> = { VN: "₫50,000 / tháng", PH: "₱150 / month", IN: "₹99 / महीना" };



/** Insurer approves: pay the remainder (payout minus any advance) and tell the farmer. */
export function approveClaim(claimId: string) {
  const store = db();
  const claim = store.claims[claimId];
  if (!claim || claim.status !== "decided") return claim;
  const farmer = store.farmers[claim.farmerId];
  if (!claim.insured) {
    // For uninsured farmers, "approve" means the officer signs off the damage certificate.
    issueCertificate(claim, { text: tr(T.certificate(claim.id), farmer.language), i18n: T.certificate(claim.id) });
    return claim;
  }
  if (!claim.payout) return claim;
  const remainder = claim.payout.amount - (claim.advance?.amount ?? 0);
  claim.status = "approved";
  claim.settledAt = nowIso();
  if (remainder > 0) credit(farmer, remainder, "settlement", claim.id);
  if (farmer.hero) {
    addMessage(farmer.id, "agent", tr(T.settlement(claim.id), farmer.language), {
      i18n: T.settlement(claim.id),
      card: { type: "settlement", amount: remainder, currency: claim.payout.currency, provider: farmer.wallet.provider, claimId: claim.id },
    });
  }
  return claim;
}


/** Farmer appeals with new evidence: the new photos replace the old ones (kept for audit) and every check re-runs. */
export function reopenClaim(claimId: string, photoIds: string[], reason: string) {
  const claim = db().claims[claimId];
  if (!claim || !["decided", "rejected"].includes(claim.status) || claim.lane === "approve") return undefined;
  claim.appeals = [...(claim.appeals ?? []), { at: nowIso(), reason, previousPhotoIds: claim.photoIds, previousConfidence: claim.confidence }];
  if (photoIds.length) claim.photoIds = photoIds;
  claim.description = `${claim.description}\nAppeal: ${reason}`;
  claim.checks = emptyChecks();
  claim.fraudFlags = [];
  claim.seeded = false;
  claim.status = "verifying";
  for (const k of ["confidence", "lane", "lossPct", "payout", "memo", "farmerLetter", "farmerLetterI18n"] as const) delete claim[k];
  void runPipeline(claim.id).catch((e) => console.error("[pipeline] appeal", e));
  return claim;
}

export function rejectClaim(claimId: string) {
  const claim = db().claims[claimId];
  if (claim && claim.status === "decided") claim.status = "rejected";
  return claim;
}
