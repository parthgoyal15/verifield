import { generateJson, hasGemini } from "@/lib/gemini";
import { db } from "@/lib/store";
import { claimSummary, stats } from "@/lib/views";

export async function POST(req: Request) {
  const { question } = (await req.json()) as { question?: string };
  if (!question?.trim()) return Response.json({ error: "Ask a question" }, { status: 400 });

  const claims = Object.values(db().claims).map(claimSummary);
  if (!hasGemini()) {
    return Response.json({
      answer: `Demo mode (no GEMINI_API_KEY). Book summary: ${JSON.stringify(stats())}`,
      claimIds: [],
      source: "fallback",
    });
  }

  const rows = claims.map((c) => ({
    id: c.id,
    farmer: c.farmerName,
    country: c.country,
    region: c.region,
    insured: c.insured,
    status: c.status,
    lane: c.lane,
    confidence: c.confidence,
    lossPct: c.lossPct,
    areaHa: c.areaHa,
    payout: c.payout && `${c.payout.amount} ${c.payout.currency}`,
    advancePaid: c.advance?.amount,
    fraud: c.fraudFlags.filter((f) => f.severity !== "low").map((f) => f.detail),
  }));

  const r = await generateJson<{ answer: string; claimIds: string[] }>({
    system:
      "You are Verifield's analyst assistant for an insurance claims team handling Typhoon Yagi (Sept 2024) claims in " +
      "Vietnam and the Philippines. Answer ONLY from the claims data given. Be concise (max 80 words), cite numbers, " +
      "and compute totals carefully. Currencies differ by country: never add VND, PHP and INR together. " +
      "List the ids of the claims your answer refers to (max 20).",
    parts: [{ text: `Claims data (JSON):\n${JSON.stringify(rows)}\n\nQuestion: ${question}` }],
    schema: {
      type: "object",
      properties: { answer: { type: "string" }, claimIds: { type: "array", items: { type: "string" } } },
      required: ["answer", "claimIds"],
    },
  });
  const known = new Set(claims.map((c) => c.id));
  return Response.json({ answer: r.answer, claimIds: r.claimIds.filter((id) => known.has(id)), source: "gemini" });
}
