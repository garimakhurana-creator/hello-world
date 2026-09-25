import Link from "next/link";
import type { ReactNode } from "react";
import { DemoButton } from "@/components/DemoButton";
import { Avatar, btn, Meter, StatusIcon } from "@/components/ui";

const steps: { icon: ReactNode; title: string; hint: string }[] = [
  {
    title: "Start a group",
    hint: "One link to share",
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    title: "Answer privately",
    hint: "Must-haves vs. nice-to-haves",
    icon: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  },
  {
    title: "Discuss the shortlist",
    hint: "Every trade-off visible",
    icon: <><path d="M4 6h16M4 12h10M4 18h7" /><path d="m15 17 2 2 4-4" /></>,
  },
];

const principles = [
  { title: "Must vs. prefer", body: "Dealbreakers and nice-to-haves are kept apart, so you know what's negotiable." },
  { title: "No mystery score", body: "Every result is a list of checks you can read, with the reason for each." },
  { title: "Everyone counts the same", body: "No one's requirements are weighted above anyone else's." },
];

type Row = [status: "ok" | "warn" | "fail", label: string];
const preview: { who: string; rows: Row[] }[] = [
  { who: "You", rows: [["ok", "Budget"], ["ok", "Lift"], ["warn", "Gym nearby"]] },
  { who: "Flatmate", rows: [["ok", "Budget"], ["ok", "Bathrooms"], ["ok", "Pets"]] },
  { who: "Flatmate", rows: [["ok", "Budget"], ["ok", "Parking"], ["fail", "Commute"]] },
];

function PreviewCard() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-4 -z-10 rotate-2 rounded-[2rem] bg-gradient-to-br from-brand-100 via-white to-amber-100" />
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_24px_60px_-24px_rgba(17,58,50,0.35)]">
        <div className="relative h-36 sm:h-44">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=70&auto=format&fit=crop"
            alt=""
            className="h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-stone-800 backdrop-blur">
            Option 1 of 3
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold">3BHK · Baner</p>
            <p className="text-sm font-semibold tabular">₹45,000<span className="font-normal text-stone-500">/mo</span></p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {preview.map((p, i) => (
              <div key={i} className="rounded-2xl bg-stone-50 p-2.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Avatar name={p.who} index={i} size="sm" />
                  <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-stone-500">{p.who}</span>
                </div>
                {p.rows.map(([s, l]) => (
                  <p key={l} className="flex items-center gap-1.5 py-0.5 text-[12px] text-stone-700">
                    <StatusIcon status={s} className="!h-4 !w-4 !text-[9px]" /> {l}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-stone-100 pt-3 text-xs text-stone-600">
            <div className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2"><span>Must-haves</span><Meter value={8} total={9} tone="rose" /><span className="text-right tabular font-medium">8/9</span></div>
            <div className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2"><span>Preferences</span><Meter value={10} total={15} tone="amber" /><span className="text-right tabular font-medium">10/15</span></div>
            <p className="pt-1 font-medium text-stone-800">Main compromise: one commute</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <section className="hero-glow overflow-x-clip">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Flat hunting with friends
            </span>
            <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
              Find a flat you&apos;ll <span className="font-serif font-normal italic text-brand-700">all</span> say yes to.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
              Agree on what matters before anyone falls for a listing. Come out with 2–3 flats worth a real conversation.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/create" className={btn.primary}>Start a group →</Link>
              <Link href="/join" className={btn.secondary}>Join with a code</Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-500">
              <span>No sign-up</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-stone-300" />
              <span>About 3 minutes each</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-stone-300" />
              <DemoButton className="font-medium text-brand-700 underline decoration-brand-100 underline-offset-4 hover:decoration-brand-500" />
            </div>
          </div>
          <div className="rise rise-2 mx-auto w-full max-w-md lg:max-w-none">
            <PreviewCard />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="group flex items-center gap-4 rounded-3xl border border-stone-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_rgba(28,27,25,0.25)]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-700 group-hover:text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {s.icon}
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-stone-400 tabular">0{i + 1}</p>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-stone-500">{s.hint}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <h2 className="font-serif text-4xl leading-tight text-stone-900 sm:text-5xl">
            Fair by design, <span className="italic text-brand-700">not by vibes.</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="rounded-3xl bg-white/70 p-5 ring-1 ring-stone-200/80">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-900 px-6 py-12 text-center text-white sm:px-12">
          <div aria-hidden className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
          <h2 className="relative font-serif text-4xl sm:text-5xl">Ready when your flatmates are.</h2>
          <p className="relative mx-auto mt-3 max-w-md text-brand-100">Set up a group in under a minute and share the link.</p>
          <Link href="/create" className="relative mt-7 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:-translate-y-px hover:bg-brand-50">
            Start a group →
          </Link>
        </div>
      </section>
    </div>
  );
}
