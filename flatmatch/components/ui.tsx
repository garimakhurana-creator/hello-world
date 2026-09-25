import type { ReactNode } from "react";
import type { Check } from "@/lib/types";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50 transition",
  ghost: "inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900",
};

export const input =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function Page({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto w-full px-4 py-8 sm:py-10 ${narrow ? "max-w-xl" : "max-w-5xl"}`}>{children}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
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
