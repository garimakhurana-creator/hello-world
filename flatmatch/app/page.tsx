import Link from "next/link";
import { DemoButton } from "@/components/DemoButton";
import { btn, Card, Eyebrow, LevelTag, StatusIcon } from "@/components/ui";

const steps = [
  { n: "1", title: "One person creates the group", body: "Riya sets it up, fills in her own requirements, and shares a link." },
  { n: "2", title: "Everyone fills it in alone", body: "Meera and Kavita add theirs independently. Nobody sees a flat yet, so nobody anchors on one." },
  { n: "3", title: "You get 2–3 flats to talk about", body: "Each option shows exactly what every person gets and what they give up." },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-12 sm:pt-20">
        <Eyebrow>For friends looking for a flat together</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          Stop arguing over listings. Agree on what matters first.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-stone-600">
          One form, and each of you fills it in separately. You come out with 2–3 flats you can actually discuss, with a clear view of
          what each person gets and what each person gives up.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/create" className={btn.primary}>Create a group</Link>
          <Link href="/join" className={btn.secondary}>I have an invite code</Link>
        </div>
        <div className="mt-3">
          <DemoButton className={btn.ghost} />
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-12 sm:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.n}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{s.n}</span>
            <h3 className="mt-3 font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{s.body}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <Card className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">How matching works</h2>
            <ul className="mt-4 space-y-3 text-sm text-stone-700">
              <li className="flex gap-2"><LevelTag kind="must" /> <span>Non-negotiable. If a flat breaks it, you&apos;ll see a ✕ and exactly why.</span></li>
              <li className="flex gap-2"><LevelTag kind="prefer" /> <span>Nice to have. Missing it shows a ⚠, and you can negotiate it.</span></li>
              <li>Everyone&apos;s requirements count the same. The app never decides whose needs matter more.</li>
              <li>No mystery score. Every result is a list of checks you can read.</li>
              <li>AI only turns the results into plain English. It doesn&apos;t pick flats.</li>
            </ul>
          </div>
          <div className="rounded-xl bg-stone-50 p-4 text-sm">
            <p className="font-semibold">3BHK in Baner · ₹45,000/month</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              {[
                ["Riya", [["ok", "Budget"], ["ok", "Lift"], ["warn", "Gym"]]],
                ["Meera", [["ok", "Budget"], ["ok", "Bathrooms"], ["fail", "Pets"]]],
                ["Kavita", [["ok", "Budget"], ["ok", "Parking"], ["fail", "Commute"]]],
              ].map(([name, rows]) => (
                <div key={name as string}>
                  <p className="mb-1.5 font-semibold uppercase tracking-wide text-stone-500">{name as string}</p>
                  {(rows as [string, string][]).map(([s, l]) => (
                    <p key={l} className="flex items-center gap-1.5 py-0.5">
                      <StatusIcon status={s as "ok"} /> {l}
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-stone-200 pt-3 text-stone-600">
              ⚠ Main compromise: Meera&apos;s pet-friendly and Kavita&apos;s commute
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
