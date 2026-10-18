import { connection } from "next/server";
import { db } from "@/lib/store";
import { fileView } from "@/lib/views";

export async function GET(_req: Request, ctx: RouteContext<"/api/certificates/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const store = db();
  const cert = store.certificates[id];
  if (!cert) return Response.json({ error: "Certificate not found" }, { status: 404 });
  const claim = store.claims[cert.claimId];
  return Response.json({
    certificate: cert,
    farmer: store.farmers[cert.farmerId],
    field: store.fields[cert.fieldId],
    event: store.events[cert.eventId],
    claim: { id: claim.id, description: claim.description, createdAt: claim.createdAt },
    photos: claim.photoIds.map(fileView).filter(Boolean),
  });
}
