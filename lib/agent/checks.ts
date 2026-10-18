import type { Part } from "@google/genai";
import { filePart, generateJson, hasGemini, publicImagePart } from "../gemini";
import { addDays, daysBetween, distanceKm } from "../geo";
import { db } from "../store";
import type { CheckResult, Claim, Country, DisasterEvent, Field, FraudFlag, Policy } from "../types";
import { fetchWeather, summarize } from "../weather";
import { hamming, isEditingSoftware } from "./media";

// Each check returns { status, score 0..1, summary }. Score = how strongly it supports paying.

export async function assessPhotos(claim: Claim, field: Field): Promise<CheckResult> {
  if (claim.photoIds.length === 0) {
    return { status: "warn", score: 0.3, summary: "No damage photos were submitted.", source: "rules" };
  }
  if (!hasGemini()) {
    // Never let the farmer's own number stand in for evidence: loss % then comes from radar alone.
    return {
      status: "warn",
      score: 0.6,
      summary: "AI photo assessment unavailable (no GEMINI_API_KEY). Verified loss is taken from satellite radar only.",
      source: "fallback",
    };
  }
  const parts: Part[] = [];
  if (field.baseline?.fileIds.length) {
    parts.push({ text: `BASELINE photo(s) of the same field, taken before the storm on ${field.baseline.at.slice(0, 10)}:` });
    for (const id of field.baseline.fileIds) parts.push(filePart(id));
  }
  parts.push({ text: "DAMAGE photo(s) submitted with the claim:" });
  for (const id of claim.photoIds) parts.push(filePart(id));
  parts.push({
    text:
      `Registered crop: ${field.crop}, sown ${field.sowingDate}. Farmer says: "${claim.description}". ` +
      `Farmer's own loss estimate: ${claim.extracted.lossPctEstimate ?? "unknown"}%.`,
  });

  const r = await generateJson<{
    cropVisible: string;
    cropStage: string;
    floodDamageVisible: boolean;
    waterLevel: string;
    damageType: string;
    lossPct: number;
    consistentWithDescription: boolean;
    consistentWithBaseline: boolean | null;
    summary: string;
  }>({
    system:
      "You are an experienced agricultural loss adjuster in Southeast Asia assessing crop damage photos for a " +
      "typhoon/flood insurance claim. Be objective and conservative. Estimate the share of the crop that is lost.",
    parts,
    schema: {
      type: "object",
      properties: {
        cropVisible: { type: "string" },
        cropStage: { type: "string", description: "e.g. seedling, tillering, heading, ripening" },
        floodDamageVisible: { type: "boolean" },
        waterLevel: { type: "string", enum: ["none", "ankle", "knee", "waist", "submerged"] },
        damageType: { type: "string", description: "e.g. submerged, lodged, washed out, none" },
        lossPct: { type: "number", description: "Estimated crop loss 0-100" },
        consistentWithDescription: { type: "boolean" },
        consistentWithBaseline: { type: ["boolean", "null"], description: "null if no baseline given" },
        summary: { type: "string", description: "Two sentences for the claim memo" },
      },
      required: ["cropVisible", "cropStage", "floodDamageVisible", "waterLevel", "damageType", "lossPct", "consistentWithDescription", "consistentWithBaseline", "summary"],
    },
  });

  const loss = Math.max(0, Math.min(100, Math.round(r.lossPct)));
  let score = r.floodDamageVisible ? 0.55 + 0.4 * (loss / 100) : 0.15;
  if (!r.consistentWithDescription) score -= 0.2;
  if (r.consistentWithBaseline === false) score -= 0.2;
  score = Math.max(0, Math.min(1, score));
  return {
    status: score >= 0.7 ? "pass" : score >= 0.45 ? "warn" : "fail",
    score,
    summary: r.summary,
    source: "gemini",
    details: { ...r, lossPct: loss },
  };
}

export async function satelliteCheck(field: Field, event: DisasterEvent, country: Country): Promise<CheckResult> {
  if (!field.satBefore || !field.satAfter) {
    return { status: "warn", score: 0.5, summary: "No satellite imagery available for this field.", source: "rules" };
  }
  const w = event.windows[country];
  let floodedPct: number;
  let summary: string;
  let source: CheckResult["source"] = "gemini";
  if (hasGemini()) {
    const r = await generateJson<{ floodedPct: number; changeDetected: boolean; summary: string }>({
      system:
        "You analyse Sentinel-1 SAR radar images (VV backscatter) for flood insurance. In SAR, open water " +
        "appears very dark (low backscatter); vegetated fields appear mid-grey and textured. The registered " +
        "field is the area inside the outlined box at the centre of each image.",
      parts: [
        { text: `BEFORE the event (around ${addDays(w.start, -10)}):` },
        await publicImagePart(field.satBefore),
        { text: `AFTER the event (around ${addDays(w.end, -2)}):` },
        await publicImagePart(field.satAfter),
        { text: "Estimate what percentage of the outlined field is newly flooded in the AFTER image." },
      ],
      schema: {
        type: "object",
        properties: {
          floodedPct: { type: "number" },
          changeDetected: { type: "boolean" },
          summary: { type: "string", description: "One or two sentences for the claim memo" },
        },
        required: ["floodedPct", "changeDetected", "summary"],
      },
    });
    floodedPct = Math.round(Math.max(0, Math.min(100, r.floodedPct)));
    summary = r.summary;
  } else {
    floodedPct = field.truthFloodedPct;
    summary = `Radar before/after comparison: ~${floodedPct}% of the field newly flooded (fallback value, no GEMINI_API_KEY).`;
    source = "fallback";
  }
  const score = floodedPct >= 50 ? 0.95 : floodedPct >= 20 ? 0.6 : 0.1;
  return {
    status: score >= 0.9 ? "pass" : score >= 0.5 ? "warn" : "fail",
    score,
    summary,
    source,
    details: { floodedPct, before: field.satBefore, after: field.satAfter },
  };
}

export async function weatherCheck(field: Field, event: DisasterEvent, country: Country): Promise<CheckResult> {
  const w = event.windows[country];
  try {
    const series = await fetchWeather(field.lat, field.lng, addDays(w.start, -3), w.end);
    const s = summarize(series);
    const score = s.max48hMm >= 100 ? 0.95 : s.max48hMm >= 50 ? 0.6 : 0.1;
    return {
      status: score >= 0.9 ? "pass" : score >= 0.5 ? "warn" : "fail",
      score,
      summary:
        `${s.max48hMm} mm of rain in the wettest 48 hours (threshold 100 mm), ${s.totalMm} mm total, ` +
        `peak wind ${s.maxWindKmh} km/h at the field location.`,
      source: "open-meteo",
      details: { ...s, series },
    };
  } catch (e) {
    return { status: "warn", score: 0.5, summary: `Weather service unreachable (${(e as Error).message}).`, source: "rules" };
  }
}

export function policyCheck(claim: Claim, field: Field, policy: Policy | undefined, event: DisasterEvent, country: Country): CheckResult {
  if (!policy) {
    return { status: "skipped", score: 0, summary: "Farmer is not insured. Evidence is verified for a government relief certificate instead.", source: "rules" };
  }
  const w = event.windows[country];
  const problems: string[] = [];
  if (!(policy.start <= w.start && policy.end >= w.end)) problems.push("policy not active during the event");
  if (!policy.perils.some((p) => ["flood", "typhoon"].includes(p))) problems.push("flood/typhoon not covered");
  if (!policy.fieldIds.includes(field.id)) problems.push("field not on this policy");
  const d = claim.details;
  if (d?.cause === "other") problems.push("farmer reports a cause other than flood, rain or storm");
  if (problems.length) return { status: "fail", score: 0, summary: `Not covered: ${problems.join(", ")}.`, source: "rules" };

  // Mandatory claim details from the farmer: missing or inconsistent ones send the claim to a human.
  const warnings: string[] = [];
  if (!d?.declaration) warnings.push("no signed farmer declaration");
  if (!d?.lossDate || d.lossDate === "unknown") warnings.push("date of loss not confirmed");
  else if (d.lossDate < w.start || d.lossDate > w.end) warnings.push(`date of loss ${d.lossDate} is outside the event window (${w.start} to ${w.end})`);
  if (d?.affectedAreaHa === undefined) warnings.push("affected area not stated");
  if (d?.payoutConfirmed === false) warnings.push("farmer asked to change the payout account");
  const base = `${policy.scheme}: active ${policy.start} to ${policy.end}, flood and typhoon covered, ${field.areaHa} ha insured`;
  const stated = d?.affectedAreaHa !== undefined ? `; farmer reports ${d.affectedAreaHa} ha affected, ${d.lossPct ?? "?"}% crop lost` : "";
  if (warnings.length) {
    return { status: "warn", score: 0.5, summary: `${base}${stated}. Needs attention: ${warnings.join(", ")}.`, source: "rules" };
  }
  return { status: "pass", score: 1, summary: `${base}${stated}. All mandatory details and declaration on file.`, source: "rules" };
}

export async function fraudCheck(claim: Claim, field: Field, policy: Policy | undefined, event: DisasterEvent, country: Country): Promise<{ result: CheckResult; flags: FraudFlag[] }> {
  const flags: FraudFlag[] = [];
  const store = db();
  const w = event.windows[country];
  const photos = claim.photoIds.map((id) => store.files[id]).filter(Boolean);

  for (const p of photos) {
    const m = p.meta ?? {};
    if (m.lat !== undefined && m.lng !== undefined) {
      const d = distanceKm(m.lat, m.lng, field.lat, field.lng);
      if (d > 2) flags.push({ type: "location_mismatch", severity: "high", detail: `Photo GPS is ${d.toFixed(1)} km from the registered field.` });
      else if (d > 0.5) flags.push({ type: "location_offset", severity: "low", detail: `Photo taken ${(d * 1000).toFixed(0)} m from field centre.` });
    } else {
      flags.push({ type: "no_gps", severity: "low", detail: "Photo has no GPS location data." });
    }
    if (m.takenAt) {
      if (m.takenAt.slice(0, 10) < w.start) {
        flags.push({ type: "timestamp_before_event", severity: "high", detail: `Photo was taken on ${m.takenAt.slice(0, 10)}, before the event started (${w.start}).` });
      }
    } else {
      flags.push({ type: "no_timestamp", severity: "low", detail: "Photo has no capture time." });
    }
    if (isEditingSoftware(m.software)) {
      flags.push({ type: "edited_photo", severity: "medium", detail: `Photo metadata shows it was processed with ${m.software}.` });
    }
    if (p.hash) {
      for (const other of Object.values(store.claims)) {
        if (other.id === claim.id) continue;
        for (const oid of other.photoIds) {
          const of = store.files[oid];
          if (of?.hash && hamming(of.hash, p.hash) <= 6) {
            flags.push({ type: "duplicate_photo", severity: "high", detail: `Photo matches a photo already submitted in claim ${other.id}.` });
          }
        }
      }
    }
  }

  if (policy && daysBetween(policy.purchasedAt, w.start) <= 7) {
    flags.push({ type: "late_purchase", severity: "medium", detail: `Policy bought ${daysBetween(policy.purchasedAt, w.start)} days before the event.` });
  }

  if (hasGemini() && photos.length) {
    const r = await generateJson<{ suspicious: boolean; likelyAiGenerated: boolean; reasons: string }>({
      system:
        "You are an insurance fraud analyst checking photos for digital manipulation: AI-generated imagery, " +
        "composited water, cloned regions, inconsistent lighting/shadows, or screenshots of photos from the internet. " +
        "Only flag clear signs; ordinary phone photos of floods are expected.",
      parts: [...photos.map((p) => filePart(p.id)), { text: "Do these photos show signs of manipulation?" }],
      schema: {
        type: "object",
        properties: { suspicious: { type: "boolean" }, likelyAiGenerated: { type: "boolean" }, reasons: { type: "string" } },
        required: ["suspicious", "likelyAiGenerated", "reasons"],
      },
    });
    if (r.likelyAiGenerated) flags.push({ type: "ai_generated", severity: "high", detail: `Photo looks AI-generated: ${r.reasons}` });
    else if (r.suspicious) flags.push({ type: "manipulation_suspected", severity: "medium", detail: r.reasons });
  }

  return { flags: dedupFlags(flags), result: fraudResult(flags) };
}

/** Folds a list of flags into the fraud check's status, score and summary. */
export function fraudResult(flags: FraudFlag[]): CheckResult {
  const dedup = dedupFlags(flags);
  const worst = dedup.some((f) => f.severity === "high") ? "high" : dedup.some((f) => f.severity === "medium") ? "medium" : dedup.length ? "low" : "none";
  const score = { none: 1, low: 0.85, medium: 0.5, high: 0.1 }[worst];
  const serious = dedup.filter((f) => f.severity !== "low");
  return {
    status: worst === "high" ? "fail" : worst === "medium" ? "warn" : "pass",
    score,
    summary: serious.length
      ? serious.map((f) => f.detail).join(" ")
      : dedup.length
        ? `No serious fraud signals (${dedup.length} minor note${dedup.length > 1 ? "s" : ""}).`
        : "No fraud signals: location, timestamp and photo originality all check out.",
    source: hasGemini() ? "gemini" : "rules",
  };
}

export const dedupFlags = (flags: FraudFlag[]) => flags.filter((f, i) => flags.findIndex((g) => g.type === f.type && g.detail === f.detail) === i);

/**
 * Cross-examines what the farmer told us against the independent evidence. Runs after the other
 * checks because it needs their results. Farmers misjudge, so mismatches send the claim to a human
 * (medium) rather than rejecting it outright.
 */
export function statementCheck(claim: Claim, field: Field): FraudFlag[] {
  const d = claim.details;
  if (!d) return [];
  const flags: FraudFlag[] = [];

  // 1. Size of the loss: what they said vs what radar and photos show, both as % of the whole field.
  const verified = [claim.checks.satellite.details?.floodedPct, claim.checks.photos.details?.lossPct].filter((v): v is number => typeof v === "number");
  if (d.affectedAreaHa !== undefined && d.lossPct !== undefined && verified.length) {
    const stated = Math.round((d.affectedAreaHa / field.areaHa) * d.lossPct);
    const seen = Math.round(verified.reduce((a, b) => a + b, 0) / verified.length);
    if (stated - seen >= 40) {
      flags.push({ type: "overstated_loss", severity: "medium", detail: `Farmer reports ~${stated}% of the field lost; radar and photos show ~${seen}%. Payout follows the verified figure.` });
    }
  }

  // 2. Timing: damage photos taken before the date the farmer says the damage happened.
  if (d.lossDate && d.lossDate !== "unknown") {
    const early = claim.photoIds.map((id) => db().files[id]?.meta?.takenAt?.slice(0, 10)).filter((t): t is string => Boolean(t && t < d.lossDate!));
    if (early.length) flags.push({ type: "photo_before_loss_date", severity: "medium", detail: `A damage photo was taken on ${early[0]}, before the stated date of loss (${d.lossDate}).` });

    // Rivers can flood days after the rain, so only a loss reported *before* any heavy rain is suspicious.
    const series = claim.checks.weather.details?.series as { time: string[]; rainMm: number[] } | undefined;
    const firstHeavy = series?.time.find((_, i) => series.rainMm[i] >= 30);
    if (series && firstHeavy && d.lossDate < addDays(firstHeavy, -1)) {
      flags.push({ type: "loss_before_rain", severity: "medium", detail: `Stated date of loss ${d.lossDate} is before the heavy rain began (${firstHeavy}).` });
    }
  }

  // 3. Cause: storm wind damage with no strong wind recorded at the field.
  const maxWind = claim.checks.weather.details?.maxWindKmh as number | undefined;
  if (d.cause === "storm_wind" && maxWind !== undefined && maxWind < 40) {
    flags.push({ type: "cause_mismatch", severity: "low", detail: `Farmer reports storm wind, but peak wind at the field was only ${maxWind} km/h.` });
  }
  return flags;
}
