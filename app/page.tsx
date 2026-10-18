import Link from "next/link";
import { Logo } from "@/components/ui";

const STEPS = [
  { t: "Before", d: "Storm warning with crop-stage advice, plus a 10-second baseline photo request." },
  { t: "During", d: "The agent reaches out first after landfall, in Vietnamese, Tagalog, Hindi or English." },
  { t: "Claim", d: "A voice note and photos. Gemini checks photos, Sentinel-1 radar, rainfall, policy and fraud in parallel." },
  { t: "Paid", d: "Clean claims get a 20% cash advance to MoMo, GCash or UPI in minutes. Uninsured farmers get a verified damage certificate." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo className="text-xl" />
        <nav className="flex gap-4 text-sm text-slate-600">
          <Link href="/farmer" className="hover:text-slate-900">Farmer app</Link>
          <Link href="/insurer" className="hover:text-slate-900">Insurer console</Link>
        </nav>
      </header>

      <section className="mt-16 max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">AI claims agent · Typhoon Yagi demo</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Every field verified.
          <br />
          Every farmer paid.
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          AI claims agents pay a car owner in Tokyo in minutes. Verifield brings that to the rice farmer in Thái Bình and
          Laguna: a voice-first, multilingual agent that verifies crop damage from photos, satellite radar and weather data,
          catches fraud, and starts the payout the same day.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/farmer" className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700">
            Open the farmer chat
          </Link>
          <Link href="/insurer" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-medium hover:bg-slate-50">
            Open the insurer console
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.t} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold text-emerald-700">
              {i + 1}. {s.t}
            </div>
            <p className="mt-2 text-sm text-slate-600">{s.d}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto pt-16 text-xs text-slate-400">
        Built with Gemini, hosted on Render. Demo data: Typhoon Yagi (Sept 2024), Vietnam and the Philippines. Weather by
        Open-Meteo. Satellite tiles are placeholders until replaced with Copernicus Sentinel-1 exports.
      </footer>
    </main>
  );
}
