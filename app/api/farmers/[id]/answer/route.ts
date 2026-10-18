import { answerDetail } from "@/lib/agent/details";
import { db } from "@/lib/store";
import type { DetailKey } from "@/lib/types";
import { farmerView } from "@/lib/views";

/** Farmer taps an answer to a mandatory claim question (or signs the declaration). */
export async function POST(req: Request, ctx: RouteContext<"/api/farmers/[id]/answer">) {
  const { id } = await ctx.params;
  const farmer = db().farmers[id];
  if (!farmer) return Response.json({ error: "Farmer not found" }, { status: 404 });
  const { key, value } = (await req.json()) as { key?: DetailKey; value?: string };
  if (!key || !value) return Response.json({ error: "key and value are required" }, { status: 400 });
  const { error } = answerDetail(farmer, key, value);
  if (error) return Response.json({ error }, { status: 400 });
  return Response.json(farmerView(id));
}
