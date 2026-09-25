import "server-only";
import { createHash } from "node:crypto";
import type { GroupAnalysis } from "./matching";
import type { PropertyResult } from "./types";
import { rupees } from "./labels";
import { getStore } from "./store";

// Gemini's only job: turn the deterministic results into plain English.
// It never sees raw listings, never ranks, and is told not to recommend.

const MODEL = () => process.env.GEMINI_MODEL || "gemini-3.8-flash";

const SYSTEM = `You help a group of friends who are choosing a shared flat talk through trade-offs.
You are given structured, already-computed match results. Rules:
- Only use facts in the data. Never invent amenities, distances, prices or opinions.
- Never recommend a flat, never say which one they "should" pick, and never rank the options.
- Treat every person's requirements as equally important. Never suggest someone's must-have matters less.
- "must" items are non-negotiable for that person; "prefer" items are nice-to-haves. Say so accurately.
- Use first names, warm plain English, short sentences. Rupees as ₹45,000.
- Respond with JSON only, matching the requested shape.`;

export interface SummaryExplanation {
  overview: string;
  talkingPoints: string[];
}
export interface ResultsExplanation {
  options: { propertyId: string; tradeoff: string; question: string }[];
}
export type Explained<T> = { source: "gemini" | "template"; content: T; note?: string };

async function callGemini(prompt: string): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL())}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 8000 },
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Gemini request failed (${res.status})`);
  const text: string = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .replace(/^```(?:json)?\s*|```\s*$/g, "")
    .trim();
  return JSON.parse(text);
}

async function cached<T>(
  groupId: string,
  scope: string,
  input: unknown,
  prompt: string,
  validate: (x: unknown) => T | null,
  fallback: () => T,
): Promise<Explained<T>> {
  const store = getStore();
  const hash = createHash("sha256").update(MODEL() + JSON.stringify(input)).digest("hex");
  const hit = validate(await store.getExplanation(groupId, scope, hash));
  if (hit) return { source: "gemini", content: hit };
  try {
    const out = validate(await callGemini(prompt));
    if (!out) throw new Error("Gemini returned an unexpected shape");
    await store.saveExplanation(groupId, scope, hash, out);
    return { source: "gemini", content: out };
  } catch (e) {
    return { source: "template", content: fallback(), note: (e as Error).message };
  }
}

// ---------------- Group summary: conflicts ----------------

export function explainSummary(groupId: string, analysis: GroupAnalysis) {
  const input = {
    listingsChecked: analysis.totalListings,
    flatsEachPersonCouldAcceptAlone: analysis.perPerson,
    flatsEveryoneCanAccept: analysis.allFeasible,
    mostCommonMustHaveBlockers: analysis.blockers,
    conflicts: analysis.conflicts,
  };
  const prompt = `Here is how a group's requirements interact, before looking at any single flat:
${JSON.stringify(input, null, 2)}

Return {"overview": string, "talkingPoints": string[]}.
- overview: 2-3 sentences. Say how many flats pass everyone's must-haves and what is doing most of the narrowing.
- talkingPoints: 2-4 neutral questions the group could discuss, each tied to a specific conflict above. Frame them as questions for the people involved; don't answer them.`;

  return cached(
    groupId,
    "summary",
    input,
    prompt,
    (x) => {
      const v = x as SummaryExplanation | null;
      return v && typeof v.overview === "string" && Array.isArray(v.talkingPoints) ? v : null;
    },
    () => ({
      overview: `${analysis.allFeasible} of ${analysis.totalListings} flats ${analysis.allFeasible === 1 ? "meets" : "meet"} everyone's must-haves.${
        analysis.blockers[0]
          ? ` The requirement ruling out the most flats is ${analysis.blockers[0].name}'s ${analysis.blockers[0].label.toLowerCase()} (${analysis.blockers[0].count} flats).`
          : ""
      }`,
      talkingPoints: analysis.conflicts.map((c) => `${c.title}: ${c.detail}`),
    }),
  );
}

// ---------------- Results: trade-offs per option ----------------

export function explainResults(groupId: string, results: PropertyResult[]) {
  const input = results.map((r) => ({
    propertyId: r.property.id,
    title: r.property.title,
    rent: r.property.rent,
    equalShare: r.share,
    mustHaves: `${r.mustMet}/${r.mustTotal}`,
    preferences: `${r.preferMet}/${r.preferTotal}`,
    unevenSplitNote: r.unevenSplitNote,
    people: r.members.map((m) => ({
      name: m.name,
      gets: m.checks.filter((c) => c.ok).map((c) => `${c.label} (${c.kind}): ${c.detail}`),
      givesUp: m.checks.filter((c) => !c.ok).map((c) => `${c.label} (${c.kind}): ${c.detail}`),
    })),
  }));
  const prompt = `These are the shortlisted flats for a group, with exactly what each person gets and gives up:
${JSON.stringify(input, null, 2)}

Return {"options": [{"propertyId": string, "tradeoff": string, "question": string}]} with one entry per flat, same order.
- tradeoff: 2-3 sentences on who gives up what at this flat, naming people. Lead with any broken must-haves.
- question: one specific, neutral question the group would need to settle to take this flat seriously.`;

  return cached(
    groupId,
    "results",
    input,
    prompt,
    (x) => {
      const v = x as ResultsExplanation | null;
      if (!v || !Array.isArray(v.options)) return null;
      const ok = results.every((r) => v.options.some((o) => o.propertyId === r.property.id && typeof o.tradeoff === "string"));
      return ok ? v : null;
    },
    () => ({
      options: results.map((r) => {
        const musts = r.compromises.filter((c) => c.kind === "must");
        const prefers = r.compromises.filter((c) => c.kind === "prefer");
        const parts: string[] = [];
        if (musts.length) parts.push(`Must-haves broken: ${musts.map((c) => `${c.memberName}'s ${c.label.toLowerCase()} (${c.detail})`).join("; ")}.`);
        else parts.push("Everyone's must-haves are met.");
        const byPerson = r.members
          .map((m) => ({ name: m.name, items: prefers.filter((c) => c.memberName === m.name).map((c) => c.label.toLowerCase()) }))
          .filter((x) => x.items.length);
        if (byPerson.length) parts.push(`Preferences given up: ${byPerson.map((x) => `${x.name} (${x.items.join(", ")})`).join("; ")}.`);
        return {
          propertyId: r.property.id,
          tradeoff: parts.join(" "),
          question: musts.length
            ? `"${musts[0].label}" is one of ${musts[0].memberName}'s must-haves. Does ${musts[0].memberName} want to revisit it for this flat, or is it off the table?`
            : `Is ${rupees(r.share)} each worth the preferences given up here?`,
        };
      }),
    }),
  );
}
