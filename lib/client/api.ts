import type { claimDetail, claimSummary, farmerView, messageView, stats } from "../views";
import type { Certificate, DisasterEvent, Farmer, Field } from "../types";

// Response shapes of the API routes, derived from the server view functions.
export type FarmerView = NonNullable<ReturnType<typeof farmerView>>;
export type MessageView = ReturnType<typeof messageView>;
export type ClaimSummary = ReturnType<typeof claimSummary>;
export type ClaimDetail = ReturnType<typeof claimDetail>;
export type ClaimsResponse = {
  claims: ClaimSummary[];
  stats: ReturnType<typeof stats>;
  event: DisasterEvent;
  ai: { gemini: boolean; model: string };
};
export type CertificateResponse = {
  certificate: Certificate;
  farmer: Farmer;
  field: Field;
  event: DisasterEvent;
  claim: { id: string; description: string; createdAt: string };
  photos: { id: string; url: string }[];
};

export async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json();
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json();
}
