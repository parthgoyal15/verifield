"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfidenceBar, LANE_STYLE, LaneBadge, Logo, StatusBadge, money, pct, timeAgo } from "@/components/ui";
import { getJson, postJson, type ClaimSummary, type ClaimsResponse } from "@/lib/client/api";
import { COUNTRY_FLAG, eventName } from "@/lib/locale";
import type { Country, Lane } from "@/lib/types";

const ClaimsMap = dynamic(() => import("@/components/ClaimsMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />,
});

const SUGGESTIONS = [
  "Which claims have fraud signals and why?",
  "Total recommended payout in Vietnam for the approve lane?",
  "Which farmers in Laguna are waiting on review?",
];

export default function Dashboard() {
  const [data, setData] = useState<ClaimsResponse>();
  const [country, setCountry] = useState<Country>("VN");
  const [busy, setBusy] = useState<string>();
  const [toast, setToast] = useState<string>();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; claimIds: string[] }>();

  const refresh = useCallback(() => getJson<ClaimsResponse>("/api/claims").then(setData).catch(() => {}), []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [refresh]);

  async function act(label: string, fn: () => Promise<unknown>, done?: (r: never) => string) {
    setBusy(label);
    try {
      const r = await fn();
      if (done) setToast(done(r as never));
      await refresh();
    } catch (e) {
      setToast(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(undefined);
    }
  }

  async function ask(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    setAnswer(undefined);
    await act("ask", async () => setAnswer(await postJson("/api/ask", { question: q })));
  }

  const highlight = useMemo(() => new Set(answer?.claimIds ?? []), [answer]);
  if (!data) return <div className="p-10 text-sm text-slate-500">Loading console…</div>;
  const { claims, stats, event } = data;
  const lane = (l: Lane) => claims.filter((c) => c.status === "decided" && c.lane === l);
  const verifying = claims.filter((c) => c.status === "verifying");
  const done = claims.filter((c) => ["approved", "rejected", "certified"].includes(c.status));
  const approveLane = lane("approve");

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/">
          <Logo className="text-lg" />
        </Link>
        <span className="text-sm text-slate-400">/ Insurer console</span>
        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${data.ai.gemini ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {data.ai.gemini ? `Gemini: ${data.ai.model}` : "Demo mode: no GEMINI_API_KEY"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-800">
            🌀 {eventName(event, country)}: <b>{event.status}</b>
          </span>
          <button
            disabled={Boolean(busy)}
            onClick={() => act("warn", () => postJson(`/api/events/${event.id}/warn`), (r: { warned: number }) => `Storm warning sent to ${r.warned} farmers`)}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {busy === "warn" ? "Sending…" : "1 · Send storm warning"}
          </button>
          <button
            disabled={Boolean(busy)}
            onClick={() => act("outreach", () => postJson(`/api/events/${event.id}/outreach`), (r: { contacted: number }) => `Landfall check-in sent to ${r.contacted} farmers`)}
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
          >
            {busy === "outreach" ? "Sending…" : "2 · Landfall outreach"}
          </button>
          <button
            disabled={Boolean(busy)}
            onClick={() => confirm("Reset all demo data?") && act("reset", () => postJson("/api/admin/reset"), () => "Demo data reset")}
            className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
      </header>

      {toast && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          {toast}
          <button onClick={() => setToast(undefined)} className="opacity-60">×</button>
        </div>
      )}

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Claims" value={stats.total} />
        <Stat label="Verifying now" value={stats.verifying} tone="text-sky-700" />
        <Stat label="Ready to approve" value={stats.approve} tone="text-emerald-700" />
        <Stat label="Needs review" value={stats.review} tone="text-amber-700" />
        <Stat label="Fraud caught" value={stats.fraudCaught} tone="text-rose-700" />
        <Stat label="Paid out" value={`${money(stats.paidVND, "VND")} · ${money(stats.paidPHP, "PHP")} · ${money(stats.paidINR, "INR")}`} small />
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-2 flex gap-1 text-sm">
            {(["VN", "PH", "IN"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className={`rounded-lg px-3 py-1 ${country === c ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
              >
                {COUNTRY_FLAG[c]} {event.zones.find((z) => z.country === c)?.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
              {(Object.keys(LANE_STYLE) as Lane[]).map((l) => (
                <span key={l} className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${LANE_STYLE[l].dot}`} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[380px] overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ClaimsMap claims={claims} event={event} country={country} highlight={highlight} />
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <div className="font-medium">Ask Verifield</div>
          <p className="text-xs text-slate-500">Ask about the claims book in plain language. Gemini answers from live claim data.</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which claims look like fraud?"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button disabled={busy === "ask"} className="rounded-lg bg-slate-900 px-3 text-sm text-white disabled:opacity-50">
              Ask
            </button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-full bg-slate-100 px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-200">
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3 flex-1 overflow-y-auto text-sm">
            {busy === "ask" && <div className="italic text-slate-500">Thinking…</div>}
            {answer && (
              <>
                <p className="whitespace-pre-wrap">{answer.answer}</p>
                {answer.claimIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {answer.claimIds.map((id) => (
                      <Link key={id} href={`/claim/${id}`} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs hover:bg-slate-200">
                        {id}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {verifying.length > 0 && (
        <section className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-3">
          <div className="text-sm font-medium text-sky-900">Verifying now</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {verifying.map((c) => (
              <Link key={c.id} href={`/claim/${c.id}`} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                <span className="font-mono text-xs">{c.id}</span> {c.farmerName}
                <span className="text-xs text-slate-400">
                  {Object.values(c.checkStatus).filter((s) => !["pending", "running"].includes(s)).length}/5 checks
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <LaneColumn
          lane="approve"
          claims={approveLane}
          action={
            approveLane.length > 0 && (
              <button
                disabled={Boolean(busy)}
                onClick={() => act("bulk", () => postJson("/api/claims/bulk-approve"), (r: { approved: number }) => `Approved ${r.approved} claims and paid farmers`)}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Bulk approve {approveLane.length}
              </button>
            )
          }
        />
        <LaneColumn lane="review" claims={lane("review")} />
        <LaneColumn lane="reject" claims={lane("reject")} />
      </section>

      {done.length > 0 && (
        <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium">Closed ({done.length})</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {done.map((c) => (
              <ClaimCard key={c.id} c={c} />
            ))}
          </div>
        </details>
      )}
    </main>
  );
}

function Stat({ label, value, tone = "", small }: { label: string; value: React.ReactNode; tone?: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 font-semibold ${small ? "text-sm" : "text-2xl"} ${tone}`}>{value}</div>
    </div>
  );
}

function LaneColumn({ lane, claims, action }: { lane: Lane; claims: ClaimSummary[]; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={`h-2.5 w-2.5 rounded-full ${LANE_STYLE[lane].dot}`} />
          {LANE_STYLE[lane].label}
          <span className="text-slate-400">{claims.length}</span>
        </div>
        {action}
      </div>
      <div className="max-h-[520px] space-y-2 overflow-y-auto">
        {claims.map((c) => (
          <ClaimCard key={c.id} c={c} />
        ))}
        {claims.length === 0 && <div className="py-6 text-center text-xs text-slate-400">Empty</div>}
      </div>
    </div>
  );
}

function ClaimCard({ c }: { c: ClaimSummary }) {
  const serious = c.fraudFlags.filter((f) => f.severity !== "low");
  return (
    <Link href={`/claim/${c.id}`} className={`block rounded-lg border bg-white p-3 text-sm hover:border-slate-400 ${c.hero ? "border-slate-300" : "border-slate-200"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-slate-500">{c.id}</span>
        {c.status === "decided" ? <LaneBadge lane={c.lane} /> : <StatusBadge status={c.status} />}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="font-medium">
          {c.farmerName}
          {!c.insured && <span className="ml-1 text-xs font-normal text-indigo-600">uninsured</span>}
        </span>
        <span className="text-xs text-slate-400">{timeAgo(c.createdAt)}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <ConfidenceBar value={c.confidence} lane={c.lane} />
        <span className="w-9 text-right text-xs text-slate-500">{pct(c.confidence)}</span>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {c.areaHa} ha · loss {c.lossPct ?? "–"}% · {c.payout ? money(c.payout.amount, c.payout.currency) : "no payout"}
        {c.advance && <span className="text-emerald-700"> · advance paid</span>}
      </div>
      {serious.length > 0 && <div className="mt-1 truncate text-xs text-rose-700">⚑ {serious[0].detail}</div>}
    </Link>
  );
}
