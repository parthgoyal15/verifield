import { approveClaim } from "@/lib/agent/pipeline";
import { claimSummary } from "@/lib/views";

export async function POST(_req: Request, ctx: RouteContext<"/api/claims/[id]/approve">) {
  const { id } = await ctx.params;
  const claim = approveClaim(id);
  if (!claim) return Response.json({ error: "Claim not found" }, { status: 404 });
  return Response.json({ claim: claimSummary(claim) });
}
