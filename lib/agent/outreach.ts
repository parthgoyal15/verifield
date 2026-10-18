import { generateText, hasGemini, LANG_NAME } from "../gemini";
import { daysBetween } from "../geo";
import { T, tr, type L10n } from "../i18n";
import { eventName } from "../locale";
import { addMessage, db, fieldsFor, nowIso } from "../store";
import type { Claim, DisasterEvent, Farmer } from "../types";

function cropAgeDays(farmer: Farmer, event: DisasterEvent) {
  const field = fieldsFor(farmer.id)[0];
  return field ? daysBetween(field.sowingDate, event.windows[farmer.country].start) : undefined;
}

async function localise(farmer: Farmer, instruction: string, fallback: L10n): Promise<{ text: string; i18n?: L10n }> {
  const scripted = { text: tr(fallback, farmer.language), i18n: fallback };
  if (!hasGemini()) return scripted;
  try {
    const text = await generateText({
      system:
        `You are Verifield, a caring insurance and disaster assistant messaging a smallholder rice farmer by chat. ` +
        `Write in ${LANG_NAME[farmer.language]}. Simple words, max 60 words, no markdown, at most one emoji.`,
      parts: [{ text: instruction }],
    });
    return { text };
  } catch {
    return scripted;
  }
}

const place = (f: Farmer) => ({ en: f.region, local: f.regionLocal ?? f.region });

/** Before the storm: warning, crop-stage-aware advice, and a request for a baseline photo. */
export async function sendPreStormWarnings(event: DisasterEvent) {
  const farmers = Object.values(db().farmers);
  const heroes = farmers.filter((f) => f.hero);
  await Promise.all(
    heroes.map(async (f) => {
      const age = cropAgeDays(f, event);
      const name = event.localNames[f.country] ?? eventName(event, f.country);
      const { text, i18n } = await localise(
        f,
        `${name} (${eventName(event, f.country)}) is forecast to hit ${f.region} within 48 hours with heavy rain and flooding. ` +
          `The farmer's rice is about ${age} days old (harvest is usually around 100-110 days). ` +
          `Give one practical piece of advice for that crop stage (e.g. harvest early if near maturity, clear drainage, ` +
          `move seed and fertiliser to high ground). Then ask them to send one photo of their field now, so any claim later is faster.`,
        T.warning({ en: eventName(event, f.country), local: name }, place(f), age),
      );
      f.session.awaitingBaseline = true;
      addMessage(f.id, "agent", text, { card: { type: "warning", eventName: eventName(event, f.country), localName: name }, i18n });
    }),
  );
  event.status = "forecast";
  event.warnedAt = nowIso();
  return { warned: heroes.length };
}

/** After landfall: the agent reaches out first instead of waiting for farmers to file. */
export async function sendLandfallOutreach(event: DisasterEvent) {
  const farmers = Object.values(db().farmers);
  const heroes = farmers.filter((f) => f.hero);
  await Promise.all(
    heroes.map(async (f) => {
      const name = event.localNames[f.country] ?? eventName(event, f.country);
      const { text, i18n } = await localise(
        f,
        `${name} has just passed through ${f.region}. Ask if the farmer and family are safe. ` +
          (f.insured
            ? `Tell them their field is insured. If the field is damaged, they can reply with a voice message describing it and 2-3 photos, and you will handle the claim.`
            : `They are not insured, but say you can still verify the damage for a government relief application. Ask them to reply with a voice message and 2-3 photos if the field is damaged.`),
        T.landfall({ en: eventName(event, f.country), local: name }, place(f), f.insured),
      );
      f.session.awaitingBaseline = false;
      addMessage(f.id, "agent", text, { i18n });
    }),
  );
  event.status = "landfall";
  event.outreachAt = nowIso();
  return { contacted: heroes.length };
}

/** After the decision: what to do next on the farm, and which support schemes to look at. */
export async function sendRecoveryPlan(claim: Claim, farmer: Farmer, event: DisasterEvent) {
  const field = db().fields[claim.fieldId];
  const daysLeft = 120 - (daysBetween(field.sowingDate, event.windows[farmer.country].end) || 0);
  const { text, i18n } = await localise(
    farmer,
    `Write a short recovery plan for this farmer after ${eventName(event, farmer.country)}. Field: ${field.areaHa} ha rice, ${claim.lossPct}% lost, ` +
      `region ${farmer.region}, ${farmer.country}. Roughly ${Math.max(daysLeft, 0)} days of the season remain. ` +
      `Give 3 numbered short steps: (1) what to do with the damaged crop and the field now, (2) whether a short-duration ` +
      `rice variety can still be planted this season or what to plant instead, (3) which kind of government or local ` +
      `support to ask about (for example agriculture office seed support or disaster relief). Do not invent specific scheme names or amounts.`,
    T.recoveryPlan(),
  );
  addMessage(farmer.id, "agent", text, { i18n });
}
