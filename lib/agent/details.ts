import { T, tr, type L10n } from "../i18n";
import { formatDay } from "../locale";
import { addMessage, currentEvent, db, messagesFor, nowIso, policyFor } from "../store";
import type { ClaimDetails, ClaimDraft, DetailKey, Farmer, Lang, LossCause, Message } from "../types";
import { createClaim, runPipeline } from "./pipeline";

// Mandatory claim details. Identity, policy, field, crop and sowing date come from registration;
// these are the facts only the farmer can give, collected with tap-to-answer buttons so the flow
// works for low-literacy users and without Gemini. Gemini fills in whatever the farmer already said.

const LANGS: Lang[] = ["en", "hi", "vi", "tl"];
const CAUSES: LossCause[] = ["flood", "heavy_rain", "storm_wind", "other"];
const AREA_FRACTIONS = [1, 0.75, 0.5, 0.25];
const LOSS_PCTS = [100, 75, 50, 25];

const each = (fn: (lang: Lang) => string) => Object.fromEntries(LANGS.map((l) => [l, fn(l)])) as L10n;
const round2 = (n: number) => Math.round(n * 100) / 100;

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dates offered as answers: the first days of the event window, when the damage is most likely. */
function lossDateOptions(farmer: Farmer) {
  const w = currentEvent().windows[farmer.country];
  return [1, 2, 3, 4].map((i) => addDays(w.start, i)).filter((d) => d <= w.end);
}

function needsPayout(draft: ClaimDraft) {
  return Boolean(policyFor(db().fields[draft.fieldId].farmerId, draft.fieldId));
}

export function missingDetails(draft: ClaimDraft): DetailKey[] {
  const d = draft.details;
  const keys: DetailKey[] = [];
  if (!d.lossDate) keys.push("lossDate");
  if (!d.cause) keys.push("cause");
  if (d.affectedAreaHa === undefined) keys.push("affectedArea");
  if (d.lossPct === undefined) keys.push("lossPct");
  if (needsPayout(draft) && d.payoutConfirmed === undefined) keys.push("payout");
  if (!d.declaration) keys.push("declaration");
  return keys;
}

/** Copy details the agent extracted from the farmer's own words, ignoring anything malformed. */
export function applyDetails(draft: ClaimDraft, args: Record<string, unknown>) {
  const d = draft.details;
  const areaHa = db().fields[draft.fieldId].areaHa;
  if (typeof args.lossDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.lossDate)) d.lossDate = args.lossDate;
  if (CAUSES.includes(args.cause as LossCause)) d.cause = args.cause as LossCause;
  if (typeof args.affectedAreaHa === "number" && args.affectedAreaHa > 0) d.affectedAreaHa = round2(Math.min(args.affectedAreaHa, areaHa));
  if (typeof args.lossPctEstimate === "number" && args.lossPctEstimate >= 0 && args.lossPctEstimate <= 100) d.lossPct = Math.round(args.lossPctEstimate);
}

export function startDraft(farmer: Farmer, draft: Omit<ClaimDraft, "details">, args: Record<string, unknown> = {}) {
  farmer.session.draft = { ...draft, details: {} };
  applyDetails(farmer.session.draft, args);
  return farmer.session.draft;
}

function options(farmer: Farmer, draft: ClaimDraft, key: DetailKey): { value: string; i18n: L10n }[] {
  const field = db().fields[draft.fieldId];
  switch (key) {
    case "lossDate":
      return [...lossDateOptions(farmer).map((d) => ({ value: d, i18n: each((l) => formatDay(d, l)) })), { value: "unknown", i18n: T.optNotSure() }];
    case "cause":
      return CAUSES.map((c) => ({ value: c, i18n: T.optCause[c] }));
    case "affectedArea":
      return AREA_FRACTIONS.map((f) => ({ value: String(f), i18n: T.optArea(f, round2(field.areaHa * f)) }));
    case "lossPct":
      return LOSS_PCTS.map((p) => ({ value: String(p), i18n: T.optLoss(p) }));
    case "payout":
      return [
        { value: "yes", i18n: T.optPayoutYes(farmer.wallet.provider) },
        { value: "no", i18n: T.optPayoutNo() },
      ];
    case "declaration":
      return [{ value: "accept", i18n: T.declared() }];
  }
}

function questionText(farmer: Farmer, draft: ClaimDraft, key: DetailKey): L10n {
  const field = db().fields[draft.fieldId];
  switch (key) {
    case "lossDate":
      return T.qLossDate();
    case "cause":
      return T.qCause();
    case "affectedArea":
      return T.qArea(field.name, field.areaHa);
    case "lossPct":
      return T.qLoss();
    case "payout":
      return T.qPayout(farmer.wallet.provider, farmer.phone);
    case "declaration":
      return T.qDeclare();
  }
}

/** Post the next missing question (or the declaration summary). Returns undefined when nothing is left to ask. */
export function askNext(farmer: Farmer, prefix?: L10n): Message | undefined {
  const draft = farmer.session.draft;
  if (!draft) return undefined;
  const key = missingDetails(draft)[0];
  if (!key) return undefined;
  const q = questionText(farmer, draft, key);
  const i18n = prefix ? each((l) => `${prefix[l]} ${q[l]}`) : q;
  const text = tr(i18n, farmer.language);
  if (key !== "declaration") {
    return addMessage(farmer.id, "agent", text, { i18n, card: { type: "question", key, options: options(farmer, draft, key) } });
  }
  const field = db().fields[draft.fieldId];
  const policy = policyFor(farmer.id, field.id);
  return addMessage(farmer.id, "agent", text, {
    i18n,
    card: {
      type: "declaration",
      fieldName: field.name,
      crop: field.crop,
      sowingDate: field.sowingDate,
      areaHa: field.areaHa,
      policyId: policy?.id,
      details: { ...draft.details },
      payoutTo: policy ? `${farmer.wallet.provider} · ${farmer.phone}` : undefined,
    },
  });
}

/** Most recent card the farmer is answering, so old buttons show what was picked. */
function lastCard(farmerId: string, key: DetailKey) {
  return messagesFor(farmerId)
    .toReversed()
    .find((m) => (key === "declaration" ? m.card?.type === "declaration" : m.card?.type === "question" && m.card.key === key))?.card;
}

/** Record a tapped answer, echo it as the farmer's message, then ask the next question or file the claim. */
export function answerDetail(farmer: Farmer, key: DetailKey, value: string): { error?: string } {
  const draft = farmer.session.draft;
  if (!draft) return { error: "No claim in progress" };
  const option = options(farmer, draft, key).find((o) => o.value === value);
  if (!option) return { error: `Invalid answer for ${key}` };
  if (key === "declaration" && missingDetails(draft).length > 1) return { error: "Answer the other questions first" };

  const d: ClaimDetails = draft.details;
  if (key === "lossDate") d.lossDate = value;
  if (key === "cause") d.cause = value as LossCause;
  if (key === "affectedArea") d.affectedAreaHa = round2(db().fields[draft.fieldId].areaHa * Number(value));
  if (key === "lossPct") d.lossPct = Number(value);
  if (key === "payout") d.payoutConfirmed = value === "yes";
  if (key === "declaration") d.declaration = { accepted: true, at: nowIso() };

  const card = lastCard(farmer.id, key);
  if (card?.type === "question") card.answer = value;
  if (card?.type === "declaration") {
    card.accepted = true;
    card.details = { ...d };
  }
  addMessage(farmer.id, "farmer", tr(option.i18n, farmer.language), { i18n: option.i18n });

  if (key === "declaration") {
    fileDraft(farmer);
    return {};
  }
  askNext(farmer, key === "payout" && value === "no" ? T.payoutHeld() : undefined);
  return {};
}

/** The farmer's answers as % of the whole field: affected share × crop lost in it. */
function fieldLossPct(draft: ClaimDraft) {
  const { affectedAreaHa, lossPct } = draft.details;
  if (affectedAreaHa === undefined || lossPct === undefined) return undefined;
  return Math.round((affectedAreaHa / db().fields[draft.fieldId].areaHa) * lossPct);
}

function fileDraft(farmer: Farmer) {
  const draft = farmer.session.draft!;
  farmer.session.draft = undefined;
  const claim = createClaim({
    farmerId: farmer.id,
    fieldId: draft.fieldId,
    eventId: currentEvent().id,
    description: draft.description,
    photoIds: draft.photoIds,
    extracted: { ...draft.extracted, lossPctEstimate: fieldLossPct(draft) ?? draft.extracted.lossPctEstimate },
    details: draft.details,
  });
  addMessage(farmer.id, "agent", tr(T.claimFiled(claim.id), farmer.language), { i18n: T.claimFiled(claim.id) });
  void runPipeline(claim.id).catch((e) => console.error("[pipeline]", e));
  return claim;
}
