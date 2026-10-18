import { createSeed } from "./seed";
import type { DB, Farmer, Message, MessageCard } from "./types";

// In-memory store. Survives dev hot reloads via globalThis. On Cloud Run, run with
// max-instances=1 so every request sees the same state. Swap for Firestore later behind
// the same functions.
const g = globalThis as unknown as { __verifieldDb?: DB };

export function db(): DB {
  if (!g.__verifieldDb) g.__verifieldDb = createSeed();
  return g.__verifieldDb;
}

export function resetDb() {
  g.__verifieldDb = createSeed();
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export const nowIso = () => new Date().toISOString();

export function addMessage(
  farmerId: string,
  role: Message["role"],
  text: string,
  extra: { fileIds?: string[]; card?: MessageCard; i18n?: Message["i18n"] } = {},
): Message {
  const m: Message = { id: uid("msg"), farmerId, role, text, at: nowIso(), ...extra };
  db().messages.push(m);
  return m;
}

export function messagesFor(farmerId: string) {
  return db().messages.filter((m) => m.farmerId === farmerId);
}

export function fieldsFor(farmerId: string) {
  return Object.values(db().fields).filter((f) => f.farmerId === farmerId);
}

export function policyFor(farmerId: string, fieldId?: string) {
  return Object.values(db().policies).find(
    (p) => p.farmerId === farmerId && (!fieldId || p.fieldIds.includes(fieldId)),
  );
}

export function claimsFor(farmerId: string) {
  return Object.values(db().claims).filter((c) => c.farmerId === farmerId);
}

export function currentEvent() {
  return Object.values(db().events)[0];
}

export function credit(farmer: Farmer, amount: number, type: "advance" | "settlement", claimId: string) {
  farmer.wallet.balance += amount;
  farmer.wallet.tx.unshift({ id: uid("tx"), amount, type, claimId, at: nowIso() });
}

export function fileUrl(id: string) {
  return `/api/files/${id}`;
}
