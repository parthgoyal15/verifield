import { handleFarmerTurn } from "@/lib/agent/intake";
import { db } from "@/lib/store";
import { messageView } from "@/lib/views";

export async function POST(req: Request) {
  const body = (await req.json()) as { farmerId?: string; text?: string; fileIds?: string[] };
  if (!body.farmerId || !db().farmers[body.farmerId]) return Response.json({ error: "Unknown farmer" }, { status: 404 });
  const fileIds = (body.fileIds ?? []).filter((id) => db().files[id]);
  if (!body.text?.trim() && !fileIds.length) return Response.json({ error: "Empty message" }, { status: 400 });
  try {
    const reply = await handleFarmerTurn(body.farmerId, body.text?.trim() ?? "", fileIds);
    return Response.json({ reply: messageView(reply, db().farmers[body.farmerId].language) });
  } catch (e) {
    console.error("[chat]", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
