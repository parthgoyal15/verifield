import { rejectClaim } from "@/lib/agent/pipeline";
import { claimSummary } from "@/lib/views";

export async function POST(_req: Request, ctx: RouteContext<"/api/claims/[id]/reject">) {
  const { id } = await ctx.params;
  const claim = rejectClaim(id);
  if (!claim) return Response.json({ error: "Claim not found" }, { status: 404 });
  return Response.json({ claim: claimSummary(claim) });
}
