import { approveClaim } from "@/lib/agent/pipeline";
import { db } from "@/lib/store";

/** Approve every decided claim in the approve lane (or the given ids). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
  const ids =
    body.ids ??
    Object.values(db().claims)
      .filter((c) => c.status === "decided" && c.lane === "approve")
      .map((c) => c.id);
  const approved = ids.map(approveClaim).filter((c) => c?.status === "approved");
  return Response.json({ approved: approved.length });
}
