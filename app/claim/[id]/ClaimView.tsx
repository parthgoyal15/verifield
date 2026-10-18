"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { CheckIcon, ConfidenceBar, LaneBadge, Logo, StatusBadge, money, pct } from "@/components/ui";
import { getJson, postJson, type ClaimDetail } from "@/lib/client/api";
import type { CheckKey, ClaimDetails } from "@/lib/types";

const CHECKS: { key: CheckKey; label: string; weight: string }[] = [
  { key: "satellite", label: "Satellite radar (Sentinel-1)", weight: "30%" },
  { key: "photos", label: "Photo damage assessment", weight: "25%" },
  { key: "weather", label: "Rainfall & wind (Open-Meteo)", weight: "20%" },
  { key: "policy", label: "Policy coverage", weight: "15%" },
  { key: "fraud", label: "Fraud & photo forensics", weight: "10%" },
];

const SOURCE_LABEL: Record<string, string> = {
  gemini: "Gemini",
  fallback: "fallback (no key)",
  rules: "rules",
  "open-meteo": "Open-Meteo",
  seed: "seeded demo",
};

export default function ClaimView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<ClaimDetail>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    () => getJson<ClaimDetail>(`/api/claims/${id}`).then(setD).catch((e) => setError((e as Error).message)),
    [id],
  );
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  async function act(kind: "approve" | "reject") {
    setBusy(true);
    await postJson(`/api/claims/${id}/${kind}`).catch((e) => setError((e as Error).message));
    await refresh();
    setBusy(false);
  }

  if (!d) return <div className="p-10 text-sm text-slate-500">{error ?? "Fetching claim…"}</div>;
  const { claim, farmer, field, policy, event, photos } = d;
  const sat = claim.checks.satellite.details as { before?: string; after?: string; floodedPct?: number } | undefined;
  const series = d.weatherSeries as { time: string[]; rainMm: number[]; windKmh: number[] } | undefined;
  const window = event.windows[farmer.country];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/">
          <Logo className="text-lg" />
        </Link>
        <Link href="/insurer" className="text-sm text-slate-500 hover:text-slate-900">
          ← Insurer console
        </Link>
      </header>

      <section className="mt-5 flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold">{claim.id}</h1>
            <StatusBadge status={claim.status} />
            {claim.lane && <LaneBadge lane={claim.lane} />}
            {!claim.insured && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">Uninsured: certificate track</span>}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {farmer.name} · {farmer.region} · {field.name}, {field.areaHa} ha {field.crop} (sown {field.sowingDate}) ·{" "}
            {policy?.scheme ?? "no policy"}
          </div>
          <div className="mt-2 text-sm italic text-slate-700">“{claim.description}”</div>
          <ClaimDetailsRow details={claim.details} insured={claim.insured} />
        </div>
        <div className="w-64 shrink-0">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Confidence</span>
            <span className="text-2xl font-semibold">{pct(claim.confidence)}</span>
          </div>
          <ConfidenceBar value={claim.confidence} lane={claim.lane} />
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-slate-500">Verified loss</div>
              <div className="font-medium">{claim.lossPct ?? "–"}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Payout</div>
              <div className="font-medium">{claim.payout ? money(claim.payout.amount, claim.payout.currency) : "–"}</div>
            </div>
          </div>
          {claim.advance && claim.payout && (
            <div className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
              Advance {money(claim.advance.amount, claim.payout.currency)} paid to {farmer.wallet.provider} automatically
            </div>
          )}
          {claim.status === "decided" && (
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy || claim.lane === "reject"}
                onClick={() => act("approve")}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {claim.insured ? "Approve & pay" : "Issue certificate"}
              </button>
              <button disabled={busy} onClick={() => act("reject")} className="flex-1 rounded-lg border border-rose-300 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
                Reject
              </button>
            </div>
          )}
          {claim.certificateId && (
            <Link href={`/certificate/${claim.certificateId}`} className="mt-3 block rounded-lg bg-indigo-600 py-2 text-center text-sm font-medium text-white">
              View damage certificate
            </Link>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Panel title="Verification checks">
            <ul className="divide-y divide-slate-100">
              {CHECKS.map(({ key, label, weight }) => {
                const c = claim.checks[key];
                return (
                  <li key={key} className="flex gap-3 py-2.5">
                    <CheckIcon status={c.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {label}
                        <span className="text-xs font-normal text-slate-400">weight {weight}</span>
                        {c.source && <span className="rounded bg-slate-100 px-1.5 text-[10px] font-normal text-slate-500">{SOURCE_LABEL[c.source]}</span>}
                      </div>
                      <div className="text-sm text-slate-600">{c.summary || (c.status === "pending" ? "Waiting…" : "")}</div>
                    </div>
                    <div className="w-10 text-right text-xs text-slate-400">{["pending", "running", "skipped"].includes(c.status) ? "" : pct(c.score)}</div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {sat?.before && sat.after && (
            <Panel title={`Sentinel-1 radar · before / after${sat.floodedPct !== undefined ? ` · ~${sat.floodedPct}% of field newly flooded` : ""}`}>
              <div className="grid grid-cols-2 gap-2">
                {[sat.before, sat.after].map((src, i) => (
                  <figure key={src}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full rounded-lg" />
                    <figcaption className="mt-1 text-xs text-slate-500">{i === 0 ? "Before the event" : "After the event"} · dark = open water</figcaption>
                  </figure>
                ))}
              </div>
            </Panel>
          )}

          {series && <RainChart series={series} start={window.start} end={window.end} />}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="AI decision memo">
            {claim.memo ? (
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{claim.memo}</pre>
            ) : (
              <div className="text-sm italic text-slate-400">Written once all checks finish…</div>
            )}
          </Panel>

          {claim.fraudFlags.length > 0 && (
            <Panel title="Fraud signals">
              <ul className="space-y-1.5 text-sm">
                {claim.fraudFlags.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      className={`mt-0.5 h-fit rounded px-1.5 text-[10px] font-medium uppercase ${
                        f.severity === "high" ? "bg-rose-100 text-rose-800" : f.severity === "medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-slate-700">{f.detail}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title={`Farmer photos (${photos.length})`}>
            {photos.length ? (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p) => (
                  <figure key={p!.id}>
                    <a href={p!.url} target="_blank">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p!.url} alt="" className="h-32 w-full rounded-lg object-cover" />
                    </a>
                    <figcaption className="mt-1 text-[11px] text-slate-500">
                      {p!.meta?.lat !== undefined ? `GPS ${p!.meta.lat.toFixed(3)}, ${p!.meta.lng?.toFixed(3)}` : "no GPS"} ·{" "}
                      {p!.meta?.takenAt ? p!.meta.takenAt.slice(0, 16).replace("T", " ") : "no timestamp"}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">{claim.seeded ? "Seeded demo claim: evidence summarised in checks." : "No photos."}</div>
            )}
            {field.baseline && (
              <div className="mt-3">
                <div className="text-xs font-medium text-emerald-700">Pre-storm baseline ({field.baseline.at.slice(0, 10)})</div>
                <div className="mt-1 flex gap-2">
                  {field.baseline.files.map(
                    (f) =>
                      f && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={f.id} src={f.url} alt="" className="h-20 w-20 rounded object-cover" />
                      ),
                  )}
                </div>
              </div>
            )}
          </Panel>

          {claim.appeals && claim.appeals.length > 0 && (
            <Panel title={`Appeals (${claim.appeals.length})`}>
              <ul className="space-y-2 text-sm text-slate-700">
                {claim.appeals.map((a, i) => (
                  <li key={i}>
                    <div className="text-xs text-slate-500">
                      {a.at.slice(0, 16).replace("T", " ")} · previous confidence {pct(a.previousConfidence)} · {a.previousPhotoIds.length} earlier photo(s) kept for audit
                    </div>
                    “{a.reason}”
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {claim.farmerLetter && (
            <Panel title={`Message sent to farmer (${farmer.language})`}>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{claim.farmerLetter}</p>
            </Panel>
          )}
        </div>
      </section>
    </main>
  );
}

const CAUSE_LABEL: Record<string, string> = { flood: "Flood water", heavy_rain: "Heavy rain", storm_wind: "Storm wind", other: "Other (not covered)" };

/** Mandatory details the farmer gave in chat, with anything missing called out for the assessor. */
function ClaimDetailsRow({ details: d, insured }: { details?: ClaimDetails; insured: boolean }) {
  const item = (label: string, value: string | undefined, ok = value !== undefined) => (
    <span className={`rounded-md px-2 py-0.5 ${ok ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800"}`}>
      {label}: <b>{value ?? "missing"}</b>
    </span>
  );
  return (
    <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
      {item("Date of loss", d?.lossDate === "unknown" ? "not sure" : d?.lossDate, Boolean(d?.lossDate && d.lossDate !== "unknown"))}
      {item("Cause", d?.cause && CAUSE_LABEL[d.cause], Boolean(d?.cause && d.cause !== "other"))}
      {item("Area damaged", d?.affectedAreaHa !== undefined ? `${d.affectedAreaHa} ha` : undefined)}
      {item("Farmer est. loss", d?.lossPct !== undefined ? `${d.lossPct}%` : undefined)}
      {insured && item("Payout account", d?.payoutConfirmed === undefined ? undefined : d.payoutConfirmed ? "confirmed" : "change requested", d?.payoutConfirmed === true)}
      {item("Declaration", d?.declaration ? `signed ${new Date(d.declaration.at).toLocaleDateString("en", { day: "numeric", month: "short" })}` : undefined)}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function RainChart({ series, start, end }: { series: { time: string[]; rainMm: number[] }; start: string; end: string }) {
  const max = Math.max(100, ...series.rainMm.map((v) => v ?? 0));
  const W = 600, H = 160, pad = 24;
  const bw = (W - pad * 2) / series.time.length;
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  return (
    <Panel title="Daily rainfall at the field (mm)">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={pad} x2={W - pad} y1={y(100)} y2={y(100)} stroke="#f43f5e" strokeDasharray="4 3" strokeWidth={1} />
        <text x={W - pad} y={y(100) - 4} textAnchor="end" fontSize="10" fill="#f43f5e">
          100 mm
        </text>
        {series.time.map((t, i) => {
          const v = series.rainMm[i] ?? 0;
          const inWindow = t >= start && t <= end;
          return (
            <g key={t}>
              <rect x={pad + i * bw + 2} y={y(v)} width={bw - 4} height={H - pad - y(v)} rx={2} fill={inWindow ? "#3b82f6" : "#cbd5e1"} />
              <text x={pad + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#64748b">
                {t.slice(5)}
              </text>
              {v >= 20 && (
                <text x={pad + i * bw + bw / 2} y={y(v) - 3} textAnchor="middle" fontSize="9" fill="#334155">
                  {Math.round(v)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}
