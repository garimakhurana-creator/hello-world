import Link from "next/link";
import { notFound } from "next/navigation";
import { AiSummary } from "@/components/AiText";
import { InviteCard } from "@/components/InviteCard";
import { MemberList } from "@/components/MemberList";
import { RequirementsTable } from "@/components/RequirementsTable";
import { btn, Card, Eyebrow, Page } from "@/components/ui";
import { loadGroup } from "@/lib/group";

export const dynamic = "force-dynamic";

export default async function GroupSummary(props: PageProps<"/g/[code]">) {
  const { code } = await props.params;
  const data = await loadGroup(code);
  if (!data) notFound();
  const { group, members, people, complete, analysis } = data;
  const waitingFor = group.expectedSize - members.length;
  const submitted = members.filter((m) => m.submittedAt).length;

  return (
    <Page>
      <Eyebrow>Group summary · code {group.code}</Eyebrow>
      <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl">{group.name}</h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Who&apos;s in</h2>
            <span className="text-sm text-stone-500 tabular">{submitted}/{group.expectedSize} submitted</span>
          </div>
          <MemberList
            code={group.code}
            expectedSize={group.expectedSize}
            members={members.map((m) => ({ id: m.id, name: m.name, role: m.role, submitted: !!m.submittedAt }))}
          />
        </Card>

        {complete && analysis ? (
          <Card>
            <h2 className="font-semibold">Before looking at any flat</h2>
            <p className="mt-1 text-sm text-stone-500">How many of the {analysis.totalListings} listings pass each person&apos;s must-haves.</p>
            <ul className="mt-4 space-y-2.5">
              {[...analysis.perPerson.map((p) => ({ label: `${p.name} alone`, n: p.feasible, all: false })), { label: "Everyone together", n: analysis.allFeasible, all: true }].map((row) => (
                <li key={row.label} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className={row.all ? "font-semibold" : "text-stone-600"}>{row.label}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                    <span className={`block h-full rounded-full ${row.all ? "bg-brand-600" : "bg-stone-400"}`} style={{ width: `${(row.n / analysis.totalListings) * 100}%` }} />
                  </span>
                  <span className="text-right tabular font-medium">{row.n}</span>
                </li>
              ))}
            </ul>
            {analysis.blockers.length > 0 && (
              <div className="mt-5 border-t border-stone-100 pt-4">
                <p className="text-sm font-medium">Must-haves ruling out the most flats</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {analysis.blockers.map((b) => (
                    <li key={b.name + b.label} className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-800">
                      {b.name}&apos;s {b.label.toLowerCase()} · {b.count} flats
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {waitingFor > 0 && <InviteCard code={group.code} waitingFor={waitingFor} />}
            <Card>
              <h2 className="font-semibold">Matching unlocks when everyone has submitted</h2>
              <p className="mt-1 text-sm text-stone-600">
                Requirements stay hidden until then, so nobody adjusts theirs to fit someone else&apos;s. You&apos;ll see them side by side here,
                along with where they conflict.
              </p>
            </Card>
          </div>
        )}
      </div>

      {complete && analysis && (
        <>
          <Card className="mt-4">
            <h2 className="font-semibold">Everyone&apos;s requirements</h2>
            <p className="mb-3 mt-1 text-sm text-stone-500">Every requirement counts equally. MUST means a dealbreaker for that person.</p>
            <RequirementsTable people={people} />
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-semibold">Where your requirements pull apart</h2>
              <ul className="mt-3 space-y-3">
                {analysis.conflicts.map((c) => (
                  <li key={c.title} className="text-sm">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-stone-600">{c.detail}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <AiSummary code={group.code} />
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 text-center">
            <Link href={`/g/${group.code}/results`} className={btn.primary}>See your 2–3 flats to discuss →</Link>
            <p className="text-xs text-stone-500">Anyone can still edit their answers. Results update instantly.</p>
          </div>
        </>
      )}
    </Page>
  );
}
