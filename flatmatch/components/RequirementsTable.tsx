import type { ReactNode } from "react";
import { AMENITY_LABELS, FURNISHING_LABELS, floorLabel, rupees } from "@/lib/labels";
import { AMENITIES, type Level, type Requirements } from "@/lib/types";
import { LevelTag } from "./ui";

type P = { id: string; name: string; requirements: Requirements };

function Cell({ level, children }: { level?: Level; children: ReactNode }) {
  if (level === "none") return <span className="text-stone-300">-</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span>{children}</span>
      {level && <LevelTag kind={level} />}
    </span>
  );
}

// Everyone's answers side by side, with MUST/PREFER shown on every cell.
export function RequirementsTable({ people }: { people: P[] }) {
  const rows: { label: string; render: (r: Requirements) => ReactNode }[] = [
    { label: "Max share / month", render: (r) => <Cell level="must">{rupees(r.budgetMax)}</Cell> },
    {
      label: "Commute",
      render: (r) =>
        r.officeHub === "wfh" ? <Cell>Works from home</Cell> : <Cell level={r.commuteLevel}>≤{r.commuteMax} min to {r.officeHub}</Cell>,
    },
    { label: "Bedrooms", render: (r) => <Cell level="must">{r.minBedrooms}+</Cell> },
    { label: "Bathrooms", render: (r) => <Cell level="must">{r.minBathrooms}+</Cell> },
    { label: "Preferred areas", render: (r) => (r.preferredAreas.length ? <Cell level="prefer">{r.preferredAreas.join(", ")}</Cell> : <Cell level="none">-</Cell>) },
    { label: "Won't consider", render: (r) => (r.excludedAreas.length ? <Cell level="must">{r.excludedAreas.join(", ")}</Cell> : <Cell level="none">-</Cell>) },
    ...AMENITIES.filter((a) => people.some((p) => (p.requirements.amenities[a] ?? "none") !== "none")).map((a) => ({
      label: AMENITY_LABELS[a],
      render: (r: Requirements) => <Cell level={r.amenities[a] ?? "none"}>{r.amenities[a] === "must" ? "Needs it" : "Would like"}</Cell>,
    })),
    { label: "Furnishing", render: (r) => <Cell level={r.furnishing.level}>{FURNISHING_LABELS[r.furnishing.value]}</Cell> },
    {
      label: "Floor",
      render: (r) => {
        const parts = [r.noGroundFloor && "Not ground floor", r.maxFloor !== null && `Up to ${floorLabel(r.maxFloor).toLowerCase()}`].filter(Boolean);
        return parts.length ? <Cell level="must">{parts.join("; ")}</Cell> : <Cell level="none">-</Cell>;
      },
    },
  ];

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
            <th className="py-2 pr-4 font-medium" />
            {people.map((p) => <th key={p.id} className="py-2 pr-4 font-semibold text-stone-800">{p.name}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="py-2.5 pr-4 font-medium text-stone-500">{row.label}</th>
              {people.map((p) => <td key={p.id} className="py-2.5 pr-4 align-top">{row.render(p.requirements)}</td>)}
            </tr>
          ))}
          {people.some((p) => p.requirements.notes) && (
            <tr>
              <th scope="row" className="py-2.5 pr-4 align-top font-medium text-stone-500">In their words</th>
              {people.map((p) => (
                <td key={p.id} className="py-2.5 pr-4 align-top text-stone-600 italic">{p.requirements.notes ? `“${p.requirements.notes}”` : ""}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
