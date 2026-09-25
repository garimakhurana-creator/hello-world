"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AMENITY_LABELS, AREAS, FURNISHING_LABELS } from "@/lib/labels";
import { AMENITIES, HUBS, type Furnishing, type Level, type Requirements } from "@/lib/types";
import { setMe } from "./identity";
import { btn, Card, input, LevelTag } from "./ui";

const DEFAULTS: Requirements = {
  budgetMax: 15000,
  officeHub: "Hinjewadi",
  commuteMax: 45,
  commuteLevel: "must",
  minBedrooms: 3,
  minBathrooms: 2,
  preferredAreas: [],
  excludedAreas: [],
  amenities: {},
  furnishing: { value: "semi", level: "none" },
  noGroundFloor: false,
  maxFloor: null,
  notes: "",
};

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <Card className="mt-4">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-stone-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-stone-100 p-1 text-sm">
      {options.map(([v, text]) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === v}
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${
            value === v ? (v === "must" ? "bg-stone-900 text-white" : "bg-white text-stone-900 shadow-sm") : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string }) {
  const b = "h-10 w-10 rounded-xl border border-stone-300 bg-white text-lg disabled:opacity-40";
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={b} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label}`}>−</button>
      <span className="w-6 text-center text-lg font-semibold tabular">{value}</span>
      <button type="button" className={b} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label}`}>+</button>
    </div>
  );
}

const LEVEL_OPTIONS: [Level, string][] = [["none", "Don't mind"], ["prefer", "Prefer"], ["must", "Must have"]];

export function RequirementsForm({ code, memberId, initial }: { code: string; memberId: string; initial: Requirements | null }) {
  const router = useRouter();
  const [r, setR] = useState<Requirements>(initial ?? DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Requirements>(k: K, v: Requirements[K]) => setR((prev) => ({ ...prev, [k]: v }));

  // Area chips cycle: neutral → prefer → no-go → neutral
  function cycleArea(area: string) {
    const pref = r.preferredAreas.includes(area);
    const excl = r.excludedAreas.includes(area);
    setR((prev) => ({
      ...prev,
      preferredAreas: pref ? prev.preferredAreas.filter((a) => a !== area) : excl ? prev.preferredAreas : [...prev.preferredAreas, area],
      excludedAreas: pref ? [...prev.excludedAreas, area] : prev.excludedAreas.filter((a) => a !== area),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/groups/${code}/members/${memberId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(r),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Couldn't save. Try again.");
      setBusy(false);
      return;
    }
    setMe(code, memberId);
    router.push(`/g/${code}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <Section title="Money" hint={<>Rent is split equally for matching. <LevelTag kind="must" /></>}>
        <label className="block max-w-xs">
          <span className="text-sm font-medium">The most I&apos;ll pay per month (my share)</span>
          <div className="relative mt-1.5">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={1000}
              step={500}
              className={`${input} pl-8 tabular`}
              value={r.budgetMax}
              onChange={(e) => set("budgetMax", Number(e.target.value))}
              required
            />
          </div>
        </label>
      </Section>

      <Section title="Areas" hint="Tap once for areas you'd like, tap again for areas you won't consider. No-go areas are dealbreakers.">
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => {
            const pref = r.preferredAreas.includes(a);
            const excl = r.excludedAreas.includes(a);
            return (
              <button
                type="button"
                key={a}
                onClick={() => cycleArea(a)}
                aria-pressed={pref || excl}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  pref
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : excl
                      ? "border-rose-300 bg-rose-50 text-rose-700 line-through"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                }`}
              >
                {pref ? "♥ " : excl ? "✕ " : ""}
                {a}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          <span className="text-brand-700">♥ Prefer</span> · <span className="text-rose-700">✕ Won&apos;t consider</span> · untouched = don&apos;t mind
        </p>
      </Section>

      <Section title="Commute">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">I commute to</span>
            <select className={`${input} mt-1.5`} value={r.officeHub} onChange={(e) => set("officeHub", e.target.value as Requirements["officeHub"])}>
              {HUBS.map((h) => <option key={h} value={h}>{h}</option>)}
              <option value="wfh">I work from home</option>
            </select>
          </label>
          {r.officeHub !== "wfh" && (
            <label className="block">
              <span className="text-sm font-medium">Longest acceptable commute: <b className="tabular">{r.commuteMax} min</b></span>
              <input type="range" min={10} max={90} step={5} value={r.commuteMax} onChange={(e) => set("commuteMax", Number(e.target.value))} className="mt-3 w-full accent-brand-600" />
            </label>
          )}
        </div>
        {r.officeHub !== "wfh" && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-stone-600">This limit is</span>
            <Segmented label="Commute importance" value={r.commuteLevel} onChange={(v) => set("commuteLevel", v)} options={[["prefer", "Flexible"], ["must", "Must have"]]} />
          </div>
        )}
      </Section>

      <Section title="Space" hint={<>Minimums are dealbreakers. <LevelTag kind="must" /></>}>
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="mb-2 text-sm font-medium">Bedrooms, at least</p>
            <Stepper label="bedrooms" value={r.minBedrooms} min={1} max={5} onChange={(n) => set("minBedrooms", n)} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Bathrooms, at least</p>
            <Stepper label="bathrooms" value={r.minBathrooms} min={1} max={5} onChange={(n) => set("minBathrooms", n)} />
          </div>
        </div>
      </Section>

      <Section title="Amenities">
        <ul className="divide-y divide-stone-100">
          {AMENITIES.map((a) => (
            <li key={a} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="text-sm font-medium">{AMENITY_LABELS[a]}</span>
              <Segmented
                label={AMENITY_LABELS[a]}
                value={r.amenities[a] ?? "none"}
                onChange={(v) => set("amenities", { ...r.amenities, [a]: v })}
                options={LEVEL_OPTIONS}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Furnishing">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className={`${input} w-auto`}
            value={r.furnishing.value}
            onChange={(e) => set("furnishing", { ...r.furnishing, value: e.target.value as Furnishing })}
            aria-label="Furnishing wanted"
          >
            {(Object.keys(FURNISHING_LABELS) as Furnishing[]).map((f) => <option key={f} value={f}>{FURNISHING_LABELS[f]}</option>)}
          </select>
          <Segmented label="Furnishing importance" value={r.furnishing.level} onChange={(v) => set("furnishing", { ...r.furnishing, level: v })} options={LEVEL_OPTIONS} />
        </div>
      </Section>

      <Section title="Other dealbreakers" hint="Only tick what would make you say no outright.">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={r.noGroundFloor} onChange={(e) => set("noGroundFloor", e.target.checked)} />
          No ground-floor flats
        </label>
        <label className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={r.maxFloor !== null} onChange={(e) => set("maxFloor", e.target.checked ? 10 : null)} />
          Nothing above floor
          <input
            type="number"
            min={0}
            max={60}
            disabled={r.maxFloor === null}
            className={`${input} w-20 py-1.5 disabled:bg-stone-100`}
            value={r.maxFloor ?? ""}
            onChange={(e) => set("maxFloor", Number(e.target.value))}
            aria-label="Maximum floor"
          />
        </label>
      </Section>

      <Section title="Anything else?" hint="Shown to the group as context. Not used for matching.">
        <textarea className={`${input} min-h-24`} maxLength={500} value={r.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. I work late, I have a cat, I need a quiet room for calls…" />
      </Section>

      {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-stone-200 bg-[#f7f6f3]/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button className={`${btn.primary} w-full`} disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Submit my requirements"}</button>
      </div>
    </form>
  );
}
