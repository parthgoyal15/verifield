"use client";

import { use, useEffect, useState } from "react";
import { Logo, pct } from "@/components/ui";
import { getJson, type CertificateResponse } from "@/lib/client/api";
import { COUNTRY_NAME, eventName } from "@/lib/locale";

export default function CertificateView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<CertificateResponse>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    getJson<CertificateResponse>(`/api/certificates/${id}`).then(setD).catch((e) => setError((e as Error).message));
  }, [id]);
  if (!d) return <div className="p-10 text-sm text-slate-500">{error ?? "Loading certificate…"}</div>;
  const { certificate: c, farmer, field, event, photos } = d;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="rounded-2xl border-4 border-double border-indigo-300 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <Logo className="text-xl" />
          <div className="text-right text-xs text-slate-500">
            Certificate no. <span className="font-mono">{c.id}</span>
            <br />
            Issued {new Date(c.issuedAt).toLocaleString()}
          </div>
        </div>
        <h1 className="mt-8 text-center text-2xl font-semibold tracking-tight">Verified Crop Damage Certificate</h1>
        <p className="mt-1 text-center text-sm text-slate-500">For use in government disaster relief and assistance applications</p>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Item k="Farmer" v={farmer.name} />
          <Item k="Location" v={`${farmer.region}, ${COUNTRY_NAME[farmer.country]}`} />
          <Item k="Field" v={`${field.name}, ${field.areaHa} ha ${field.crop}`} />
          <Item k="Coordinates" v={`${field.lat.toFixed(4)}, ${field.lng.toFixed(4)}`} />
          <Item k="Event" v={`${eventName(event, farmer.country)} (${event.localNames[farmer.country] ?? ""})`} />
          <Item k="Event window" v={`${event.windows[farmer.country].start} to ${event.windows[farmer.country].end}`} />
          <Item k="Verified crop loss" v={<span className="text-lg font-semibold text-rose-700">{c.verifiedLossPct}%</span>} />
          <Item k="Verification confidence" v={pct(c.confidence)} />
        </dl>

        <div className="mt-6">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Independent evidence</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {c.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>

        {photos.length > 0 && (
          <div className="mt-6 flex gap-2">
            {photos.slice(0, 4).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt="" className="h-24 w-24 rounded object-cover" />
            ))}
          </div>
        )}

        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Damage verified by the Verifield AI claims agent using farmer photos (with location and time checks), Sentinel-1
          satellite radar before/after comparison, and recorded rainfall at the field. This certificate records verified
          evidence of loss. It is not an insurance payout and does not by itself guarantee relief.
        </p>
      </div>
      <div className="no-print mt-4 text-center">
        <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Print / save as PDF
        </button>
      </div>
    </main>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
