import { generateText, hasGemini, LANG_NAME } from "../gemini";
import { T, tr, type L10n } from "../i18n";
import { COUNTRY_CURRENCY } from "../locale";
import { payoutFor } from "../seed";
import type { CheckKey, Claim, Farmer, Field, Lane, Policy } from "../types";

const WEIGHTS: Record<CheckKey, number> = { photos: 0.25, satellite: 0.3, weather: 0.2, policy: 0.15, fraud: 0.1 };
export const APPROVE_AT = 0.8;
export const REVIEW_AT = 0.5;
export const ADVANCE_PCT = 0.2;

export function scoreClaim(claim: Claim): { confidence: number; lane: Lane; lossPct: number } {
  let num = 0;
  let den = 0;
  for (const k of Object.keys(WEIGHTS) as CheckKey[]) {
    const c = claim.checks[k];
    if (c.status === "skipped") continue; // e.g. policy check for uninsured farmers
    num += WEIGHTS[k] * c.score;
    den += WEIGHTS[k];
  }
  let confidence = den ? num / den : 0;
  if (claim.fraudFlags.some((f) => f.severity === "high")) confidence = Math.min(confidence, 0.3);
  if (claim.checks.policy.status === "fail") confidence = Math.min(confidence, 0.3);
  confidence = +confidence.toFixed(2); // decide on the same number the assessor sees
  const lane: Lane = confidence >= APPROVE_AT ? "approve" : confidence >= REVIEW_AT ? "review" : "reject";

  const photoLoss = claim.checks.photos.details?.lossPct as number | undefined;
  const satLoss = claim.checks.satellite.details?.floodedPct as number | undefined;
  const estimates = [photoLoss, satLoss].filter((v): v is number => typeof v === "number");
  const blended = estimates.length ? estimates.reduce((a, b) => a + b, 0) / estimates.length : (claim.extracted.lossPctEstimate ?? 0);
  return { confidence, lane, lossPct: Math.round(Math.min(100, blended)) };
}

export function computePayout(policy: Policy | undefined, field: Field, lossPct: number, lane: Lane) {
  if (!policy || lane === "reject") return undefined;
  return { amount: payoutFor(policy, field, lossPct), currency: policy.currency };
}

const fmt = (n: number, cur: string) => new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

function evidenceBlock(claim: Claim) {
  return (Object.keys(claim.checks) as CheckKey[])
    .map((k) => `- ${k.toUpperCase()} [${claim.checks[k].status}, score ${claim.checks[k].score.toFixed(2)}]: ${claim.checks[k].summary}`)
    .join("\n");
}

export async function writeMemo(claim: Claim, farmer: Farmer, field: Field, policy?: Policy): Promise<string> {
  const pay = claim.payout ? fmt(claim.payout.amount, claim.payout.currency) : "n/a";
  const header =
    `Claim ${claim.id}: recommend ${claim.lane?.toUpperCase()} (confidence ${Math.round((claim.confidence ?? 0) * 100)}%)\n` +
    `Verified loss ${claim.lossPct}% · Recommended payout ${pay}`;
  if (!hasGemini()) {
    return `${header}\n\n${evidenceBlock(claim)}\n\nFraud flags: ${claim.fraudFlags.map((f) => `${f.severity}: ${f.detail}`).join("; ") || "none"}`;
  }
  const body = await generateText({
    system:
      "You write claim decision memos for insurance assessors. Plain text, no markdown headers, no bold. " +
      "Max 120 words. Structure: one-line verdict; 'Evidence:' then 3-5 short bullet lines starting with '- '; " +
      "'Action:' one line. Cite numbers. Never contradict the computed recommendation; explain it.",
    parts: [
      {
        text:
          `Farmer: ${farmer.name}, ${farmer.region}, ${farmer.country}. Insured: ${claim.insured}. ` +
          `Field: ${field.name}, ${field.areaHa} ha ${field.crop}. Policy: ${policy?.scheme ?? "none"}.\n` +
          `Farmer statement: "${claim.description}"\n` +
          `Computed recommendation: ${claim.lane} at confidence ${claim.confidence}. Verified loss ${claim.lossPct}%. Payout ${pay}.\n` +
          `Checks:\n${evidenceBlock(claim)}\nFraud flags: ${JSON.stringify(claim.fraudFlags)}`,
      },
    ],
  });
  return `${header}\n\n${body}`;
}

export async function writeFarmerLetter(claim: Claim, farmer: Farmer, advance?: number): Promise<{ text: string; i18n?: L10n }> {
  const cur = claim.payout?.currency ?? COUNTRY_CURRENCY[farmer.country];
  const facts =
    `Insured: ${claim.insured}. Lane: ${claim.lane}. Verified loss: ${claim.lossPct}%. ` +
    (claim.payout ? `Recommended payout: ${fmt(claim.payout.amount, cur)}. ` : "") +
    (advance ? `An advance of ${fmt(advance, cur)} has been sent to their ${farmer.wallet.provider} wallet right now. ` : "") +
    `Evidence: ${evidenceBlock(claim)}`;
  if (!hasGemini()) {
    const i18n = !claim.insured
      ? claim.lane === "approve"
        ? T.letterUninsuredApprove(claim.lossPct)
        : claim.lane === "review"
          ? T.letterUninsuredReview(claim.id)
          : T.letterUninsuredReject(claim.id)
      : claim.lane === "approve"
        ? T.letterApprove(claim.id, claim.lossPct, advance ? { amount: fmt(advance, cur), provider: farmer.wallet.provider } : undefined)
        : claim.lane === "review"
          ? T.letterReview(claim.id)
          : T.letterReject(claim.id);
    return { text: tr(i18n, farmer.language), i18n };
  }
  const text = await generateText({
    system:
      `You are Verifield, a kind insurance claims assistant writing to a smallholder farmer in ${LANG_NAME[farmer.language]}. ` +
      "Write in simple, warm language (max 70 words). No markdown. Mention the claim number. " +
      "For approve: give the good news and money facts. For review: say an assessor will visit within 3 days, no blame. " +
      "For reject with fraud signals: be neutral and polite, say an officer will contact them and they can send more evidence; never accuse. " +
      "For uninsured farmers there is no payout: if lane is approve, say damage is verified and a certificate for government " +
      "disaster relief is ready; if review, say an officer will check within 3 days before issuing the certificate; " +
      "if reject, be neutral, say an officer will contact them and they can send new photos.",
    parts: [{ text: `Farmer: ${farmer.name}. Claim ${claim.id}. ${facts}` }],
  });
  return { text };
}
