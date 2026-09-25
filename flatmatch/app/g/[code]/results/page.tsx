import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ResultsExplanationProvider } from "@/components/AiText";
import { OptionCard } from "@/components/OptionCard";
import { btn, Eyebrow, Page } from "@/components/ui";
import { loadGroup, SHORTLIST_SIZE } from "@/lib/group";
import { rupees } from "@/lib/labels";
import { isFullMatch, RANKING_RULES } from "@/lib/matching";

export const dynamic = "force-dynamic";

export default async function Results(props: PageProps<"/g/[code]/results">) {
  const { code } = await props.params;
  const data = await loadGroup(code);
  if (!data) notFound();
  if (!data.complete) redirect(`/g/${data.group.code}`);

  const { group, results } = data;
  const shortlist = results.slice(0, SHORTLIST_SIZE);
  const rest = results.slice(SHORTLIST_SIZE);
  const fullCount = results.filter(isFullMatch).length;

  return (
    <ResultsExplanationProvider code={group.code}>
      <Page>
        <Link href={`/g/${group.code}`} className={btn.ghost}>← Group summary</Link>
        <Eyebrow><span className="mt-4 block">Step 3 of 3 · Your shortlist</span></Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{shortlist.length} flats worth discussing</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          We checked {results.length} listings against everyone&apos;s answers. {fullCount === 0
            ? "None meets every must-have, so these are the closest, with exactly what breaks."
            : `${fullCount} ${fullCount === 1 ? "meets" : "meet"} every must-have.`}{" "}
          This isn&apos;t a recommendation. It shows who gets what, so the three of you can decide.
        </p>

        <details className="mt-4 max-w-3xl rounded-xl border border-stone-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium">How are these ordered?</summary>
          <p className="mt-2 text-stone-600">No weighted score. Flats are sorted by these rules, in order, and everyone counts the same:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-stone-700">
            {RANKING_RULES.map((r) => <li key={r}>{r}</li>)}
          </ol>
          <p className="mt-2 text-stone-600">
            <span className="font-medium text-emerald-700">✓</span> met · <span className="font-medium text-amber-700">⚠</span> preference not met ·{" "}
            <span className="font-medium text-rose-700">✕</span> must-have not met
          </p>
        </details>

        <div className="mt-6 space-y-6">
          {shortlist.map((r, i) => <OptionCard key={r.property.id} r={r} index={i} />)}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={`/g/${group.code}/compare`} className={btn.primary}>Compare trade-offs side by side</Link>
          <Link href={`/g/${group.code}`} className={btn.secondary}>Back to requirements</Link>
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-semibold">The other {rest.length} listings</h2>
          <p className="text-sm text-stone-500">And exactly why they&apos;re further down.</p>
          <ul className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {rest.map((r) => {
              const musts = r.compromises.filter((c) => c.kind === "must");
              return (
                <li key={r.property.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {r.property.title} <span className="font-normal text-stone-500">· {rupees(r.property.rent)}</span>
                    </p>
                    <p className="text-xs text-stone-500">
                      {musts.length
                        ? musts.map((c) => `✕ ${c.memberName}: ${c.label.toLowerCase()} (${c.detail})`).join(" · ")
                        : `All must-haves met · ${r.preferMet}/${r.preferTotal} preferences`}
                    </p>
                  </div>
                  <Link href={`/g/${group.code}/compare?ids=${[shortlist[0]?.property.id, shortlist[1]?.property.id, r.property.id].filter(Boolean).join(",")}`} className="shrink-0 text-xs font-medium text-brand-700 hover:underline">
                    Compare with top 2
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </Page>
    </ResultsExplanationProvider>
  );
}
