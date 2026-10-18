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

/** The check-over-field mark from docs/icon.svg. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      <rect width="96" height="96" rx="22" fill="#059669" />
      <path d="M14 70 Q48 52 82 70" fill="none" stroke="#a7f3d0" strokeWidth="5" strokeLinecap="round" />
      <path d="M14 82 Q48 64 82 82" fill="none" stroke="#6ee7b7" strokeWidth="5" strokeLinecap="round" />
      <path d="M27 36 L42 51 L70 21" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className = "", mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      {mark && <LogoMark className="h-[1.6em] w-[1.6em]" />}
      <span>
        <span className="text-emerald-600">Veri</span>field<span className="text-slate-400">.ai</span>
      </span>
    </span>
  );
}

const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** Phone with a chat bubble: the farmer's messaging app. */
export function FarmerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M10.5 4.5h3" />
      <path d="M9 8.5h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3.5L9.5 15v-1.5H9a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" />
    </svg>
  );
}

/** Dashboard with a shield check: the insurer's review console. */
export function InsurerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M12 6.5l3 1.2v2.2c0 1.8-1.3 3.1-3 3.6-1.7-.5-3-1.8-3-3.6V7.7z" />
      <path d="M10.8 9.8l.9.9 1.6-1.7" />
    </svg>
  );
}
