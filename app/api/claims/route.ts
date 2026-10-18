import { connection } from "next/server";
import { currentEvent, db } from "@/lib/store";
import { claimSummary, stats } from "@/lib/views";
import { geminiModel, hasGemini } from "@/lib/gemini";

export async function GET() {
  await connection();
  const claims = Object.values(db().claims)
    .map(claimSummary)
    .sort((a, b) => Number(b.hero) - Number(a.hero) || b.createdAt.localeCompare(a.createdAt));
  return Response.json({ claims, stats: stats(), event: currentEvent(), ai: { gemini: hasGemini(), model: geminiModel() } });
}
