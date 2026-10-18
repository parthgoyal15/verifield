import { T, tr } from "@/lib/i18n";
import { COUNTRY_LANGS } from "@/lib/locale";
import { addMessage, db } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { farmerView } from "@/lib/views";

/** Farmer picks the language for the conversation; the agent confirms in that language. */
export async function POST(req: Request, ctx: RouteContext<"/api/farmers/[id]/language">) {
  const { id } = await ctx.params;
  const farmer = db().farmers[id];
  if (!farmer) return Response.json({ error: "Farmer not found" }, { status: 404 });
  const { language } = (await req.json()) as { language?: Lang };
  if (!language || !COUNTRY_LANGS[farmer.country].includes(language)) {
    return Response.json({ error: "Unsupported language" }, { status: 400 });
  }
  const changed = farmer.language !== language || !farmer.session.languageChosen;
  farmer.language = language;
  farmer.session.languageChosen = true;
  // No i18n here: this confirmation belongs to the moment the language was picked.
  if (changed) addMessage(farmer.id, "agent", tr(T.languageSet(), language));
  return Response.json(farmerView(id));
}
