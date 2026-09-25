import { FURNISHING_LABELS, floorLabel, rupees } from "@/lib/labels";
import type { PropertyResult } from "@/lib/types";
import { OptionExplanation } from "./AiText";
import { PropertyImage } from "./PropertyImage";
import { CheckRow, Stat } from "./ui";

export function OptionCard({ r, index }: { r: PropertyResult; index: number }) {
  const p = r.property;
  const full = r.mustMet === r.mustTotal;
  const brokenMust = r.mustTotal - r.mustMet;

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="grid sm:grid-cols-[280px_1fr]">
        <PropertyImage src={p.image} alt={p.title} className="h-48 w-full sm:h-full" />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Option {index + 1}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${full ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
              {full ? "Meets every must-have" : `Breaks ${brokenMust} must-have${brokenMust > 1 ? "s" : ""}`}
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight">{p.title}</h2>
          <p className="text-sm text-stone-500">{p.address}</p>
          <p className="mt-2 text-2xl font-semibold tabular">
            {rupees(p.rent)}<span className="text-sm font-normal text-stone-500">/month · {rupees(r.share)} each</span>
          </p>
          <p className="mt-2 text-xs text-stone-500">
            {p.bedrooms} bed · {p.bathrooms} bath · {floorLabel(p.floor)} of {p.totalFloors} · {FURNISHING_LABELS[p.furnishing]}
            {p.lift ? " · Lift" : " · No lift"}
            {p.parking ? " · Parking" : ""}
            {p.petFriendly ? " · Pets OK" : ""}
          </p>
          <p className="mt-2 text-sm text-stone-600">{p.description}</p>
        </div>
      </div>

      <div className="grid gap-px border-t border-stone-200 bg-stone-200 md:grid-cols-3">
        {r.members.map((m) => (
          <section key={m.memberId} className="bg-white p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide">{m.name}</h3>
              <span className="text-xs text-stone-500 tabular">
                {m.mustMet}/{m.mustTotal} must · {m.preferMet}/{m.preferTotal} prefer
              </span>
            </div>
            <ul className="mt-2">
              {m.checks.map((c) => <CheckRow key={c.id} check={c} />)}
            </ul>
          </section>
        ))}
      </div>

      <div className="grid gap-4 border-t border-stone-200 bg-stone-50 p-5 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Group summary</h3>
          <Stat status={full ? "ok" : "fail"}>
            <b className="tabular">{r.mustMet}/{r.mustTotal}</b> hard requirements satisfied
          </Stat>
          <Stat status={r.preferMet === r.preferTotal ? "ok" : "warn"}>
            <b className="tabular">{r.preferMet}/{r.preferTotal}</b> preferences satisfied
          </Stat>
          <Stat status={!full ? "fail" : r.compromises.length ? "warn" : "ok"}>Main compromise: {r.mainCompromise}</Stat>
          {r.unevenSplitNote && <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">{r.unevenSplitNote}</p>}
        </div>
        <OptionExplanation propertyId={p.id} />
      </div>
    </article>
  );
}
