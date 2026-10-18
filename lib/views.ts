import { hasGemini, geminiModel } from "./gemini";
import { claimsFor, currentEvent, db, fieldsFor, fileUrl, messagesFor, policyFor } from "./store";
import type { Claim, Message, Lang } from "./types";

// JSON-safe views for the UI. Never send StoredFile buffers over the wire.

export function fileView(id: string) {
  const f = db().files[id];
  if (!f) return undefined;
  return { id, url: fileUrl(id), kind: f.kind, meta: f.meta, coach: f.coach, transcript: f.transcript };
}

export function messageView(m: Message, lang?: Lang) {
  const { i18n, ...rest } = m;
  return { ...rest, text: (lang && i18n?.[lang]) || m.text, files: (m.fileIds ?? []).map(fileView).filter(Boolean) };
}

export function claimSummary(c: Claim) {
  const store = db();
  const farmer = store.farmers[c.farmerId];
  const field = store.fields[c.fieldId];
  return {
    id: c.id,
    farmerId: c.farmerId,
    farmerName: farmer.name,
    country: farmer.country,
    region: farmer.region,
    hero: farmer.hero,
    insured: c.insured,
    lat: field.lat,
    lng: field.lng,
    areaHa: field.areaHa,
    createdAt: c.createdAt,
    status: c.status,
    lane: c.lane,
    confidence: c.confidence,
    lossPct: c.lossPct,
    payout: c.payout,
    advance: c.advance,
    fraudFlags: c.fraudFlags,
    checkStatus: Object.fromEntries(Object.entries(c.checks).map(([k, v]) => [k, v.status])),
    seeded: Boolean(c.seeded),
  };
}

export function claimDetail(c: Claim) {
  const store = db();
  const { series, ...weatherDetails } = (c.checks.weather.details ?? {}) as Record<string, unknown>;
  const field = store.fields[c.fieldId];
  const baseline = field.baseline ? { at: field.baseline.at, files: field.baseline.fileIds.map(fileView) } : undefined;
  return {
    ...claimSummary(c),
    claim: { ...c, checks: { ...c.checks, weather: { ...c.checks.weather, details: weatherDetails } } },
    weatherSeries: series,
    farmer: store.farmers[c.farmerId],
    field: { ...field, baseline },
    policy: c.policyId ? store.policies[c.policyId] : undefined,
    event: store.events[c.eventId],
    photos: c.photoIds.map(fileView).filter(Boolean),
  };
}

export function farmerView(id: string) {
  const store = db();
  const farmer = store.farmers[id];
  if (!farmer) return undefined;
  return {
    farmer,
    fields: fieldsFor(id),
    policy: policyFor(id),
    claims: claimsFor(id).map(claimSummary),
    messages: messagesFor(id).map((m) => messageView(m, farmer.language)),
    event: currentEvent(),
    ai: { gemini: hasGemini(), model: geminiModel() },
  };
}

export function stats() {
  const claims = Object.values(db().claims);
  const by = (pred: (c: Claim) => boolean) => claims.filter(pred).length;
  // Seeded approved claims never went through a wallet, so count from claims, not wallets.
  const paid = (cur: string) =>
    claims
      .filter((c) => c.payout?.currency === cur)
      .reduce((s, c) => s + (c.status === "approved" ? c.payout!.amount : (c.advance?.amount ?? 0)), 0);
  return {
    total: claims.length,
    verifying: by((c) => c.status === "verifying"),
    approve: by((c) => c.status === "decided" && c.lane === "approve"),
    review: by((c) => c.status === "decided" && c.lane === "review"),
    reject: by((c) => c.status === "decided" && c.lane === "reject"),
    approved: by((c) => c.status === "approved"),
    rejected: by((c) => c.status === "rejected"),
    certified: by((c) => c.status === "certified"),
    fraudCaught: by((c) => c.fraudFlags.some((f) => f.severity === "high")),
    paidVND: paid("VND"),
    paidPHP: paid("PHP"),
    paidINR: paid("INR"),
  };
}
