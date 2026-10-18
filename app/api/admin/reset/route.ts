import { resetDb } from "@/lib/store";

export async function POST() {
  resetDb();
  return Response.json({ ok: true });
}
