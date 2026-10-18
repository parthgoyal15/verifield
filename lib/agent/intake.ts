import type { Content, FunctionCall, Part } from "@google/genai";
import { T, tr, type L10n } from "../i18n";
import { eventName } from "../locale";
import { filePart, generate, hasGemini, LANG_NAME } from "../gemini";
import { addMessage, claimsFor, currentEvent, db, fieldsFor, messagesFor, nowIso, policyFor } from "../store";
import type { Farmer, Message } from "../types";
import { coachPhoto, transcribe } from "./media";
import { applyDetails, askNext, missingDetails, startDraft } from "./details";
import { reopenClaim } from "./pipeline";

// Details the farmer may already have said in their voice note; the app asks for whatever is left.
const DETAIL_PROPS = {
  lossDate: { type: "string", description: "Date the damage happened, YYYY-MM-DD. Only if the farmer said it." },
  cause: { type: "string", enum: ["flood", "heavy_rain", "storm_wind", "other"], description: "Only if the farmer said it." },
  affectedAreaHa: { type: "number", description: "Damaged area in hectares. Only if the farmer said it (convert bigha/acre/fraction of field)." },
  lossPctEstimate: { type: "number", description: "Farmer's own estimate of crop lost in the damaged part, 0-100. Only if the farmer said it." },
};

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "save_baseline_photos",
        description: "Store the farmer's pending photos as the pre-storm baseline for a field. Use only before the storm hits, when photos show the field before damage.",
        parametersJsonSchema: {
          type: "object",
          properties: { fieldId: { type: "string" } },
          required: ["fieldId"],
        },
      },
      {
        name: "submit_claim",
        description:
          "Start a damage claim (or, for uninsured farmers, a damage verification for government relief) using the farmer's pending photos. " +
          "Call once you know which field and have at least one usable damage photo. The app then asks the farmer, with buttons, for every " +
          "mandatory detail you did not pass (date of loss, cause, affected area, % lost, payout account) and for a signed declaration, then files it.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            fieldId: { type: "string" },
            description: { type: "string", description: "The farmer's account of the damage, in English" },
            crop: { type: "string" },
            cropStage: { type: "string" },
            damageType: { type: "string", description: "e.g. flooded, submerged, lodged, washed out" },
            ...DETAIL_PROPS,
          },
          required: ["fieldId", "description", "damageType"],
        },
      },
      {
        name: "update_claim_details",
        description: "While a claim is in progress, record mandatory details the farmer just typed or said instead of tapping a button.",
        parametersJsonSchema: { type: "object", properties: DETAIL_PROPS },
      },
      {
        name: "appeal_claim",
        description:
          "Re-open an existing claim that is under review or was not verified, adding the farmer's new pending photos and their explanation, and re-run verification.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            claimId: { type: "string" },
            reason: { type: "string", description: "The farmer's explanation, in English" },
          },
          required: ["claimId", "reason"],
        },
      },
    ],
  },
];

function systemPrompt(farmer: Farmer) {
  const event = currentEvent();
  const fields = fieldsFor(farmer.id).map((f) => {
    const p = policyFor(farmer.id, f.id);
    return `- fieldId=${f.id} "${f.name}", ${f.areaHa} ha ${f.crop}, sown ${f.sowingDate}, ${p ? `insured under ${p.scheme}` : "NOT insured"}${f.baseline ? ", baseline photo on file" : ""}`;
  });
  const claims = claimsFor(farmer.id).map((c) => `- ${c.id} (${c.status}${c.lane ? `, ${c.lane}` : ""})`);
  return [
    `You are Verifield, an AI claims agent helping smallholder farmers after disasters. You are chatting with ${farmer.name} from ${farmer.region}.`,
    `ALWAYS reply in ${LANG_NAME[farmer.language]}, even if the farmer mixes languages. Short, warm, simple sentences (max 3). No markdown.`,
    `Farmer is ${farmer.insured ? "insured" : "NOT insured: you verify damage so they can apply for government disaster relief, and you never promise an insurance payout"}.`,
    `Fields:\n${fields.join("\n")}`,
    `Existing claims:\n${claims.join("\n") || "- none"}`,
    `Current event: ${eventName(event, farmer.country)} (${event.localNames[farmer.country] ?? ""}), status=${event.status}.`,
    farmer.session.awaitingBaseline
      ? "The storm has NOT hit yet. You asked for a baseline photo. If the farmer sends field photos now, call save_baseline_photos, thank them, and remind them to stay safe."
      : "",
    `Pending photos not yet attached to a claim: ${farmer.session.pendingFileIds.length}.`,
    farmer.session.draft
      ? `A claim is IN PROGRESS for field ${farmer.session.draft.fieldId}; still missing: ${missingDetails(farmer.session.draft).join(", ")}. ` +
        "The app shows the farmer a button question for the next missing item right after your reply. If the farmer's message answers any of them, " +
        "call update_claim_details. New photos are added automatically. Do not call submit_claim again and do not ask the questions yourself: reply in one short sentence."
      : "",
    "Claim rules: if a photo is marked unusable, ask for a retake using the tip given. Identity, policy, field, crop and sowing date are already on file: never ask for them. " +
      "Ask which field only if there is more than one. As soon as you have a usable damage photo, call submit_claim, passing any of date of loss, cause, " +
      "affected area and % lost the farmer has already mentioned. Then thank them in one short sentence and say a few quick questions follow below; " +
      "do not ask those questions yourself. Never promise a payout amount. " +
      "If the farmer already has a claim for this event under review or not verified and sends new photos or an explanation, call appeal_claim instead of submit_claim. " +
      "Never file a second claim for the same field and event.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function describeTurn(m: Message): string {
  const files = (m.fileIds ?? []).map((id) => db().files[id]).filter(Boolean);
  const notes = files.map((f) => {
    if (f.kind === "audio") return `[Voice note. Transcript: "${f.transcript?.text}" (English: "${f.transcript?.english}")]`;
    const c = f.coach;
    return c && !c.usable ? `[Photo: UNUSABLE, ${c.issue}. Tip: ${c.tip}]` : "[Photo: usable]";
  });
  return [m.text, ...notes].filter(Boolean).join("\n") || "(empty)";
}

function history(farmerId: string, latest: Message): Content[] {
  const contents: Content[] = [];
  for (const m of messagesFor(farmerId).slice(-14)) {
    const role = m.role === "farmer" ? "user" : "model";
    const text = m.role === "agent" && !m.text && m.card ? `[sent ${m.card.type} card]` : describeTurn(m);
    const parts: Part[] = [{ text }];
    if (m.id === latest.id) {
      for (const id of m.fileIds ?? []) if (db().files[id]?.kind === "image") parts.push(filePart(id));
    }
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts!.push(...parts);
    else contents.push({ role, parts });
  }
  if (contents[0]?.role === "model") contents.unshift({ role: "user", parts: [{ text: "(conversation start)" }] });
  return contents;
}

function runTool(farmer: Farmer, call: FunctionCall): Record<string, unknown> {
  const args = (call.args ?? {}) as Record<string, unknown>;
  if (call.name === "update_claim_details") {
    const draft = farmer.session.draft;
    if (!draft) return { error: "No claim in progress" };
    applyDetails(draft, args);
    return { ok: true, stillMissing: missingDetails(draft) };
  }
  if (call.name === "appeal_claim") {
    const claim = db().claims[String(args.claimId)];
    if (!claim || claim.farmerId !== farmer.id) return { error: `Unknown claimId ${args.claimId}` };
    const photos = farmer.session.pendingFileIds.filter((id) => db().files[id]?.kind === "image");
    const reopened = reopenClaim(claim.id, photos, String(args.reason ?? ""));
    if (!reopened) return { error: `Claim ${claim.id} cannot be appealed (status ${claim.status}, lane ${claim.lane})` };
    farmer.session.pendingFileIds = [];
    return { ok: true, claimId: claim.id, status: "verifying", newPhotos: photos.length };
  }
  const fieldId = String(args.fieldId ?? fieldsFor(farmer.id)[0]?.id);
  const field = db().fields[fieldId];
  if (!field || field.farmerId !== farmer.id) return { error: `Unknown fieldId ${fieldId}` };
  const photos = farmer.session.pendingFileIds.filter((id) => db().files[id]?.kind === "image");

  if (call.name === "save_baseline_photos") {
    if (!photos.length) return { error: "No pending photos" };
    field.baseline = { fileIds: photos, at: nowIso() };
    farmer.session.pendingFileIds = [];
    farmer.session.awaitingBaseline = false;
    return { ok: true, saved: photos.length };
  }
  if (call.name === "submit_claim") {
    if (farmer.session.draft) return { error: "A claim is already in progress; use update_claim_details" };
    if (!photos.length) return { error: "No usable damage photo yet" };
    const draft = startDraft(
      farmer,
      {
        fieldId,
        description: String(args.description ?? ""),
        photoIds: photos,
        extracted: {
          crop: args.crop as string | undefined,
          cropStage: args.cropStage as string | undefined,
          damageType: args.damageType as string | undefined,
          lossPctEstimate: typeof args.lossPctEstimate === "number" ? args.lossPctEstimate : undefined,
        },
      },
      args,
    );
    farmer.session.pendingFileIds = [];
    return { ok: true, status: "collecting_details", stillMissing: missingDetails(draft), insured: Boolean(policyFor(farmer.id, fieldId)) };
  }
  return { error: `Unknown tool ${call.name}` };
}

/** Handle one farmer turn: store it, enrich media (transcripts, photo coaching), run the agent. */
export async function handleFarmerTurn(farmerId: string, text: string, fileIds: string[]) {
  const store = db();
  const farmer = store.farmers[farmerId];
  const files = fileIds.map((id) => store.files[id]).filter(Boolean);

  await Promise.all(
    files.map(async (f) => {
      try {
        if (f.kind === "audio") f.transcript = await transcribe(f, farmer.language);
        else f.coach = await coachPhoto(f);
      } catch (e) {
        console.error("[intake] media enrichment failed", e);
      }
    }),
  );
  const usable = files.filter((f) => f.kind === "image" && f.coach?.usable !== false).map((f) => f.id);
  farmer.session.pendingFileIds.push(...usable);

  const msg = addMessage(farmerId, "farmer", text, { fileIds });

  // Extra photos sent mid-claim go straight onto the claim being assembled.
  const draft = farmer.session.draft;
  const addedPhotos = Boolean(draft && farmer.session.pendingFileIds.length);
  if (draft && addedPhotos) {
    draft.photoIds.push(...farmer.session.pendingFileIds);
    farmer.session.pendingFileIds = [];
  }

  if (!hasGemini()) return fallbackTurn(farmer, msg, addedPhotos);

  const contents = history(farmerId, msg);
  const config = { systemInstruction: systemPrompt(farmer), tools: TOOLS };
  for (let step = 0; step < 4; step++) {
    const res = await generate(contents, config);
    const calls = res.functionCalls ?? [];
    if (!calls.length) {
      const reply = addMessage(farmerId, "agent", (res.text ?? "").trim() || "…");
      return askNext(farmer) ?? reply;
    }
    const modelContent = res.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);
    contents.push({
      role: "user",
      parts: calls.map((c) => ({ functionResponse: { id: c.id, name: c.name, response: runTool(farmer, c) } })),
    });
  }
  const reply = addMessage(farmerId, "agent", "…");
  return askNext(farmer) ?? reply;
}

/** Scripted behaviour so the full flow is demo-able before a Gemini key is configured. */
function fallbackTurn(farmer: Farmer, msg: Message, addedPhotos: boolean) {
  const field = fieldsFor(farmer.id)[0];
  if (farmer.session.draft) return askNext(farmer, addedPhotos ? T.photosAdded() : T.tapOption())!;
  const hasPhotos = farmer.session.pendingFileIds.length > 0;
  if (farmer.session.awaitingBaseline && hasPhotos) {
    runTool(farmer, { name: "save_baseline_photos", args: { fieldId: field.id } });
    return say(farmer, T.baselineSaved());
  }
  const existing = claimsFor(farmer.id).find((c) => c.eventId === currentEvent().id);
  if (existing && hasPhotos) {
    const r = runTool(farmer, { name: "appeal_claim", args: { claimId: existing.id, reason: msg.text || "New photos" } });
    return say(farmer, r.ok ? T.appealStarted(existing.id) : T.alreadyHandled(existing.id));
  }
  if (hasPhotos) {
    runTool(farmer, { name: "submit_claim", args: { fieldId: field.id, description: msg.text || "Field flooded after the storm.", damageType: "flooded" } });
    return askNext(farmer, T.detailsIntro())!;
  }
  return say(farmer, T.askPhotos());
}

const say = (farmer: Farmer, i18n: L10n) => addMessage(farmer.id, "agent", tr(i18n, farmer.language), { i18n });
