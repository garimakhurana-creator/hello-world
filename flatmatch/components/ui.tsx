import type { ReactNode } from "react";
import type { Check } from "@/lib/types";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(17,90,77,0.6)] hover:bg-brand-900 hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 hover:border-stone-400 hover:bg-stone-50 disabled:opacity-50 transition",
  ghost: "inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900",
};

export const input =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export function Page({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto w-full px-4 py-8 sm:py-10 ${narrow ? "max-w-xl" : "max-w-5xl"}`}>{children}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(28,27,25,0.04),0_8px_24px_-12px_rgba(28,27,25,0.12)] sm:p-6 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{children}</p>;
}

export function LevelTag({ kind }: { kind: "must" | "prefer" }) {
  return kind === "must" ? (
    <span className="rounded-md bg-stone-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Must</span>
  ) : (
    <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">Prefer</span>
  );
}

type Status = "ok" | "warn" | "fail";
export function statusOf(c: Check): Status {
  return c.ok ? "ok" : c.kind === "must" ? "fail" : "warn";
}

export function StatusIcon({ status, className = "" }: { status: Status; className?: string }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    fail: "bg-rose-100 text-rose-700",
  }[status];
  const glyph = { ok: "✓", warn: "⚠", fail: "✕" }[status];
  const label = { ok: "Met", warn: "Preference not met", fail: "Must-have not met" }[status];
  return (
    <span role="img" aria-label={label} className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${styles} ${className}`}>
      {glyph}
    </span>
  );
}

export function CheckRow({ check }: { check: Check }) {
  const s = statusOf(check);
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <StatusIcon status={s} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-sm font-medium ${s === "fail" ? "text-rose-800" : s === "warn" ? "text-amber-900" : "text-stone-800"}`}>
            {check.label}
          </span>
          <LevelTag kind={check.kind} />
        </div>
        <p className="text-xs text-stone-500">{check.detail}</p>
      </div>
    </li>
  );
}

export function Stat({ status, children }: { status: Status; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <StatusIcon status={status} className="mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// One colour per person, by their position in the group, used everywhere
// that person appears so they're easy to follow across screens.
const PERSON_COLORS = [
  "bg-teal-100 text-teal-800 ring-teal-200",
  "bg-violet-100 text-violet-800 ring-violet-200",
  "bg-amber-100 text-amber-800 ring-amber-200",
  "bg-sky-100 text-sky-800 ring-sky-200",
  "bg-rose-100 text-rose-800 ring-rose-200",
  "bg-lime-100 text-lime-800 ring-lime-200",
];

export function Avatar({ name, index, size = "md" }: { name: string; index: number; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "h-6 w-6 text-[11px]", md: "h-9 w-9 text-sm", lg: "h-11 w-11 text-base" }[size];
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ring-2 ${dims} ${PERSON_COLORS[index % PERSON_COLORS.length]}`}>
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

export function Meter({ value, total, tone }: { value: number; total: number; tone: "brand" | "amber" | "rose" }) {
  const pct = total ? Math.round((value / total) * 100) : 100;
  const fill = { brand: "bg-brand-500", amber: "bg-amber-400", rose: "bg-rose-400" }[tone];
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-stone-200/70" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}>
      <span className={`block h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </span>
  );
}
