import { connection } from "next/server";
import { db, policyFor } from "@/lib/store";

export async function GET() {
  await connection();
  const farmers = Object.values(db().farmers)
    .filter((f) => f.hero)
    .map((f) => ({
      id: f.id,
      name: f.name,
      country: f.country,
      region: f.region,
      language: f.language,
      insured: f.insured,
      scheme: policyFor(f.id)?.scheme,
    }));
  return Response.json({ farmers });
}
