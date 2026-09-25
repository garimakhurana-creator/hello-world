"use client";

import Link from "next/link";
import { setMe, useMe } from "./identity";

type M = { id: string; name: string; role: string; submitted: boolean };

// Shows who has submitted. "You" is remembered per device; anyone can switch,
// since there are no accounts in this MVP.
export function MemberList({ code, members, expectedSize }: { code: string; members: M[]; expectedSize: number }) {
  const me = useMe(code);
  const empty = Math.max(0, expectedSize - members.length);

  return (
    <ul className="divide-y divide-stone-100">
      {members.map((m) => {
        const mine = m.id === me;
        return (
          <li key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold ${m.submitted ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                {m.name[0]}
              </span>
              <div>
                <p className="text-sm font-medium">
                  {m.name} {mine && <span className="text-stone-400">(you)</span>}
                  {m.role === "coordinator" && <span className="ml-1.5 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-500">Coordinator</span>}
                </p>
                <p className={`text-xs ${m.submitted ? "text-emerald-700" : "text-amber-700"}`}>{m.submitted ? "✓ Submitted" : "Still filling in"}</p>
              </div>
            </div>
            {mine ? (
              <Link href={`/g/${code}/m/${m.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                {m.submitted ? "Edit mine" : "Fill in mine"}
              </Link>
            ) : (
              !me && (
                <Link href={`/g/${code}/m/${m.id}`} onClick={() => setMe(code, m.id)} className="text-sm text-stone-500 hover:text-stone-800">
                  This is me
                </Link>
              )
            )}
          </li>
        );
      })}
      {Array.from({ length: empty }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-3 text-sm text-stone-400">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-stone-300">?</span>
          Not joined yet
        </li>
      ))}
    </ul>
  );
}
