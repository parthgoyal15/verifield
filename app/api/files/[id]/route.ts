import { connection } from "next/server";
import { db } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const f = db().files[id];
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: { "Content-Type": f.mime, "Cache-Control": "private, max-age=3600" },
  });
}
