"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COUNTRY_FLAG, LANG_LABEL } from "@/lib/locale";
import type { Country, Lang } from "@/lib/types";

type F = { id: string; name: string; country: string; region: string; language: string; insured: boolean; scheme?: string };

const NOTES: Record<string, string> = {
  h1: "Live demo: genuine claim → advance in minutes",
  h2: "Seeded: partial damage, sent to human review",
  h3: "Seeded: photo GPS 31 km away → flagged",
  h4: "Seeded: reused photo → flagged",
  h5: "Live demo: genuine claim in Tagalog",
  h6: "Live demo: uninsured → damage certificate",
  h7: "Live demo: genuine claim in Hindi → UPI advance",
  h8: "Live demo: uninsured, Hindi → damage certificate",
  h9: "Live demo: genuine claim in English",
  h10: "Live demo: English, radar shows little flooding → review",
};

export default function FarmerPicker() {
  const [farmers, setFarmers] = useState<F[]>();
  useEffect(() => {
    fetch("/api/farmers").then((r) => r.json()).then((d) => setFarmers(d.farmers));
  }, []);
  if (!farmers) return <p className="mt-6 text-sm text-slate-500">Loading…</p>;
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {farmers.map((f) => (
        <li key={f.id}>
          <Link href={`/farmer/${f.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-400">
            <div className="flex items-center justify-between">
              <span className="font-medium">{f.name}</span>
              <span className="text-lg">{COUNTRY_FLAG[f.country as Country]}</span>
            </div>
            <div className="mt-1 text-sm text-slate-600">{f.region}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${f.insured ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {f.insured ? f.scheme : "Uninsured"}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{LANG_LABEL[f.language as Lang]}</span>
            </div>
            {NOTES[f.id] && <div className="mt-2 text-xs text-slate-500">{NOTES[f.id]}</div>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
