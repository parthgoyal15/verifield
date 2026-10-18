import { sendLandfallOutreach } from "@/lib/agent/outreach";
import { db } from "@/lib/store";

export async function POST(_req: Request, ctx: RouteContext<"/api/events/[id]/outreach">) {
  const { id } = await ctx.params;
  const event = db().events[id];
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
  return Response.json(await sendLandfallOutreach(event));
}
