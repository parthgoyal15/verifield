import { connection } from "next/server";
import { farmerView } from "@/lib/views";

export async function GET(_req: Request, ctx: RouteContext<"/api/farmers/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const view = farmerView(id);
  if (!view) return Response.json({ error: "Farmer not found" }, { status: 404 });
  return Response.json(view);
}
