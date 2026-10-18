import type { CheckStatus, Lane } from "@/lib/types";

export const money = (n: number | undefined, cur: string | undefined) =>
  n === undefined || !cur ? "–" : new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

export const pct = (n: number | undefined) => (n === undefined ? "–" : `${Math.round(n * 100)}%`);

export const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
};

export const LANE_STYLE: Record<Lane, { label: string; badge: string; dot: string; hex: string }> = {
  approve: { label: "Auto-approve", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", hex: "#10b981" },
  review: { label: "Needs review", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500", hex: "#f59e0b" },
  reject: { label: "Likely fraud / reject", badge: "bg-rose-100 text-rose-800", dot: "bg-rose-500", hex: "#f43f5e" },
};

export function LaneBadge({ lane }: { lane?: Lane }) {
  if (!lane) return <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">Verifying…</span>;
  const s = LANE_STYLE[lane];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.badge}`}>{s.label}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    verifying: "bg-sky-100 text-sky-800",
    decided: "bg-slate-100 text-slate-700",
    approved: "bg-emerald-600 text-white",
    rejected: "bg-rose-600 text-white",
    certified: "bg-indigo-600 text-white",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>{status}</span>;
}

export function CheckIcon({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, [string, string]> = {
    pending: ["○", "text-slate-300"],
    running: ["◌", "text-sky-500 animate-spin"],
    pass: ["✓", "text-emerald-600"],
    warn: ["!", "text-amber-600"],
    fail: ["✕", "text-rose-600"],
    skipped: ["–", "text-slate-400"],
  };
  const [ch, cls] = map[status];
  return <span className={`inline-flex w-5 justify-center font-bold ${cls}`}>{ch}</span>;
}

export function ConfidenceBar({ value, lane }: { value?: number; lane?: Lane }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round((value ?? 0) * 100)}%`, background: lane ? LANE_STYLE[lane].hex : "#94a3b8" }}
      />
    </div>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      <span className="text-emerald-600">Veri</span>field<span className="text-slate-400">.ai</span>
    </span>
  );
}
