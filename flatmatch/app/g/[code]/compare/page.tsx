import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PropertyImage } from "@/components/PropertyImage";
import { btn, Eyebrow, LevelTag, Page, StatusIcon, statusOf } from "@/components/ui";
import { loadGroup, SHORTLIST_SIZE } from "@/lib/group";
import { FURNISHING_LABELS, floorLabel, rupees } from "@/lib/labels";
import type { PropertyResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const yes = (b: boolean) => (b ? "Yes" : "No");

function Row({ label, cells, strong }: { label: ReactNode; cells: ReactNode[]; strong?: boolean }) {
  return (
    <tr className="border-t border-stone-100">
      <th scope="row" className={`sticky left-0 z-10 bg-white py-3 pr-4 text-left align-top text-sm ${strong ? "font-semibold text-stone-900" : "font-medium text-stone-500"}`}>
        {label}
      </th>
      {cells.map((c, i) => <td key={i} className="px-3 py-3 align-top text-sm">{c}</td>)}
    </tr>
  );
}

export default async function Compare(props: PageProps<"/g/[code]/compare">) {
  const { code } = await props.params;
  const { ids } = await props.searchParams;
  const data = await loadGroup(code);
  if (!data) notFound();
  if (!data.complete) redirect(`/g/${data.group.code}`);

  const { group, results, people } = data;
  const wanted = typeof ids === "string" ? ids.split(",").slice(0, 3) : [];
  const picked: PropertyResult[] = wanted.length
    ? wanted.map((id) => results.find((r) => r.property.id === id)).filter((r): r is PropertyResult => !!r)
    : results.slice(0, SHORTLIST_SIZE);
  const pickedIds = picked.map((r) => r.property.id);

  const toggleHref = (id: string) => {
    const next = pickedIds.includes(id) ? pickedIds.filter((x) => x !== id) : [...pickedIds, id].slice(-3);
    return `/g/${group.code}/compare?ids=${next.join(",")}`;
  };

  return (
    <Page>
      <Link href={`/g/${group.code}/results`} className={btn.ghost}>← Shortlist</Link>
      <Eyebrow><span className="mt-4 block">Trade-off view</span></Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">What each person gets, and gives up</h1>
      <p className="mt-2 max-w-3xl text-stone-600">Read across a row to see how one person fares at each flat. Choose up to three flats to compare.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {results.map((r) => {
          const on = pickedIds.includes(r.property.id);
          return (
            <Link
              key={r.property.id}
              href={toggleHref(r.property.id)}
              scroll={false}
              className={`rounded-full border px-3 py-1 text-xs ${on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"}`}
            >
              {on ? "✓ " : ""}{r.property.title}
            </Link>
          );
        })}
      </div>

      {picked.length === 0 ? (
        <p className="mt-8 text-stone-500">Pick at least one flat above.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-4">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-24 bg-white sm:w-36" />
                {picked.map((r) => (
                  <th key={r.property.id} className="px-3 pb-3 text-left align-top font-normal">
                    <PropertyImage src={r.property.image} alt={r.property.title} className="h-28 w-full rounded-xl" />
                    <p className="mt-2 font-semibold">{r.property.title}</p>
                    <p className="text-sm tabular text-stone-600">{rupees(r.property.rent)} · {rupees(r.share)} each</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row
                strong
                label="Hard requirements"
                cells={picked.map((r) => (
                  <span key="m" className="flex items-center gap-2">
                    <StatusIcon status={r.mustMet === r.mustTotal ? "ok" : "fail"} />
                    <b className="tabular">{r.mustMet}/{r.mustTotal}</b>
                  </span>
                ))}
              />
              <Row
                strong
                label="Preferences"
                cells={picked.map((r) => (
                  <span key="p" className="flex items-center gap-2">
                    <StatusIcon status={r.preferMet === r.preferTotal ? "ok" : "warn"} />
                    <b className="tabular">{r.preferMet}/{r.preferTotal}</b>
                  </span>
                ))}
              />
              <Row label="Main compromise" cells={picked.map((r) => <span key="c" className="text-stone-700">{r.mainCompromise}</span>)} />

              {people.map((person) => (
                <Row
                  key={person.id}
                  strong
                  label={person.name}
                  cells={picked.map((r) => {
                    const m = r.members.find((x) => x.memberId === person.id)!;
                    const gives = m.checks.filter((c) => !c.ok);
                    const gets = m.checks.filter((c) => c.ok);
                    return (
                      <div key={r.property.id} className="space-y-2">
                        {gives.length ? (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Gives up</p>
                            <ul className="mt-1 space-y-1">
                              {gives.map((c) => (
                                <li key={c.id} className="flex items-start gap-1.5">
                                  <StatusIcon status={statusOf(c)} className="mt-0.5" />
                                  <span>
                                    {c.label} <LevelTag kind={c.kind} />
                                    <span className="block text-xs text-stone-500">{c.detail}</span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="flex items-center gap-1.5 text-emerald-800"><StatusIcon status="ok" /> Gives up nothing</p>
                        )}
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Gets</p>
                          <p className="mt-0.5 text-xs text-stone-600">{gets.map((c) => c.label).join(" · ") || "-"}</p>
                        </div>
                      </div>
                    );
                  })}
                />
              ))}

              <tr><td colSpan={picked.length + 1} className="pt-6 text-xs font-semibold uppercase tracking-wide text-stone-400">The flat itself</td></tr>
              <Row label="Area" cells={picked.map((r) => r.property.area)} />
              <Row label="Bedrooms / baths" cells={picked.map((r) => `${r.property.bedrooms} / ${r.property.bathrooms}`)} />
              <Row label="Floor" cells={picked.map((r) => `${floorLabel(r.property.floor)} of ${r.property.totalFloors}`)} />
              <Row label="Lift · Parking" cells={picked.map((r) => `${yes(r.property.lift)} · ${yes(r.property.parking)}`)} />
              <Row label="Furnishing" cells={picked.map((r) => FURNISHING_LABELS[r.property.furnishing])} />
              <Row label="Pets" cells={picked.map((r) => yes(r.property.petFriendly))} />
              {people
                .filter((p) => p.requirements.officeHub !== "wfh")
                .map((p) => (
                  <Row
                    key={p.id}
                    label={`${p.name}'s commute`}
                    cells={picked.map((r) => {
                      const hub = p.requirements.officeHub as keyof typeof r.property.commute;
                      const mins = r.property.commute[hub];
                      const over = mins > p.requirements.commuteMax;
                      return <span key="c" className={over ? "font-medium text-rose-700" : ""}>{mins} min to {hub}{over ? ` (limit ${p.requirements.commuteMax})` : ""}</span>;
                    })}
                  />
                ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-sm text-stone-500">The final decision is yours. FlatMatch only makes the trade-offs visible.</p>
    </Page>
  );
}
