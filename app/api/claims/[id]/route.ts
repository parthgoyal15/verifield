import { connection } from "next/server";
import { db } from "@/lib/store";
import { claimDetail } from "@/lib/views";

export async function GET(_req: Request, ctx: RouteContext<"/api/claims/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const claim = db().claims[id];
  if (!claim) return Response.json({ error: "Claim not found" }, { status: 404 });
  return Response.json(claimDetail(claim));
}
