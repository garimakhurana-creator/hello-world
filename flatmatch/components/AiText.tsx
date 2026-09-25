"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type State<T> = { status: "loading" } | { status: "done"; source: "gemini" | "template"; content: T; note?: string } | { status: "error" };

function useExplanation<T>(code: string, scope: "summary" | "results"): State<T> {
  const [state, setState] = useState<State<T>>({ status: "loading" });
  useEffect(() => {
    let live = true;
    fetch(`/api/groups/${code}/explain?scope=${scope}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => live && setState({ status: "done", ...d }))
      .catch(() => live && setState({ status: "error" }));
    return () => {
      live = false;
    };
  }, [code, scope]);
  return state;
}

export function AiBadge({ source }: { source?: "gemini" | "template" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
      ✦ {source === "template" ? "Plain summary (AI unavailable)" : "Written by Gemini from the checks above"}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-label="Loading explanation">
      <div className="h-3 w-full rounded bg-stone-200" />
      <div className="h-3 w-5/6 rounded bg-stone-200" />
      <div className="h-3 w-2/3 rounded bg-stone-200" />
    </div>
  );
}

// ---- Group summary ----

export function AiSummary({ code }: { code: string }) {
  const s = useExplanation<{ overview: string; talkingPoints: string[] }>(code, "summary");
  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/60 to-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">What you&apos;ll need to talk about</h2>
        {s.status === "done" && <AiBadge source={s.source} />}
      </div>
      <div className="mt-3 text-sm text-stone-700">
        {s.status === "loading" && <Skeleton />}
        {s.status === "error" && <p className="text-stone-500">Couldn&apos;t load the summary. The conflicts listed are still accurate.</p>}
        {s.status === "done" && (
          <>
            <p>{s.content.overview}</p>
            <ul className="mt-3 space-y-2">
              {s.content.talkingPoints.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-violet-500">?</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Results: one fetch, many cards ----

type ResultsContent = { options: { propertyId: string; tradeoff: string; question: string }[] };
const ResultsCtx = createContext<State<ResultsContent>>({ status: "loading" });

export function ResultsExplanationProvider({ code, children }: { code: string; children: ReactNode }) {
  const s = useExplanation<ResultsContent>(code, "results");
  return <ResultsCtx.Provider value={s}>{children}</ResultsCtx.Provider>;
}

export function OptionExplanation({ propertyId }: { propertyId: string }) {
  const s = useContext(ResultsCtx);
  const opt = s.status === "done" ? s.content.options.find((o) => o.propertyId === propertyId) : undefined;
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 text-sm">
      {s.status === "loading" && <Skeleton />}
      {s.status === "error" && <p className="text-stone-500">Explanation unavailable. The checks above are the full picture.</p>}
      {s.status === "done" && opt && (
        <>
          <p className="text-stone-700">{opt.tradeoff}</p>
          <p className="mt-2 font-medium text-violet-900">To discuss: {opt.question}</p>
          <div className="mt-3"><AiBadge source={s.source} /></div>
        </>
      )}
    </div>
  );
}
