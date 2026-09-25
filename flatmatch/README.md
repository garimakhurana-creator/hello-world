# FlatMatch

One form, each flatmate fills it in separately, and you come out with 2–3 flats you can actually discuss, with a clear view of what each person gets and what each person gives up.

FlatMatch fixes the *process* (agreeing on dealbreakers before looking at listings). It doesn't try to find more listings.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

It works with no configuration. Without Supabase, data is saved to `.data/db.json`. Without a Gemini key, explanations fall back to a plain template. Click **Try the demo** on the home page to get a ready-made group with Riya, Meera and Kavita.

```bash
npm test           # matching engine tests (node --test, no extra deps)
```

## Environment

Copy `.env.example` to `.env.local`:

| Variable | Needed for |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Persistent storage. **Required on Vercel.** |
| `GEMINI_API_KEY` | Natural-language trade-off explanations |
| `GEMINI_MODEL` | Optional override (default `gemini-3.8-flash`) |

### Supabase setup

1. Create a project, open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
2. Put the URL and service-role key in `.env.local`, then run `npm run seed` to load the 16 mock Pune listings.

The service-role key is only used server-side. RLS is enabled with no policies, so the public anon key can't read anything.

### Deploy to Vercel

Import the repo, set **Root Directory** to `flatmatch`, add the environment variables above, and deploy.

## How it works

```
Browser ──► Next.js pages (server components) ──► lib/group.ts ──► lib/store.ts ──► Supabase | JSON file
                     │                                 │
                     │                                 └─► lib/matching.ts  (deterministic, pure)
                     └─ client fetch ─► /api/groups/[code]/explain ─► lib/explain.ts ─► Gemini (wording only, cached)
```

### Matching (`lib/matching.ts`)

For every flat × person the engine builds a list of **checks**. Each check is `{label, kind: must|prefer, ok, detail}`:

| Check | Kind |
| --- | --- |
| Budget (rent ÷ group size ≤ your max) | must |
| Not in your no-go areas | must |
| In your preferred areas | prefer |
| Commute to your office hub | must or prefer (you choose) |
| Bedrooms / bathrooms minimums | must |
| Each amenity you marked | must or prefer |
| Furnishing | must or prefer |
| No ground floor / max floor | must |

A failed **must** shows ✕ and a failed **prefer** shows ⚠. Nothing is weighted, and everyone's checks count the same. Flats are sorted by these rules, in order (they're also shown in the UI):

1. Fewest must-haves broken
2. Fewest people with a broken must-have
3. Most preferences met by whoever is getting the least
4. Most preferences met overall

Group-level analysis also shows how many flats each person could accept alone versus together, which must-haves rule out the most flats, and specific conflicts (an area one person prefers and another rules out, budget ceilings, commutes in different directions, scarce amenities).

If an equal split breaks someone's budget but your combined maximums cover the rent, the app says so as something to discuss. It never re-splits the rent on its own.

### Where Gemini is used (`lib/explain.ts`)

Only in two places, and only on already-computed results:

- **Group summary:** a short overview of what's narrowing the options, plus neutral questions to talk about.
- **Each shortlisted flat:** 2–3 sentences on who gives up what, plus one question to settle.

The prompt forbids recommending, ranking or weighting people. Output is validated, cached by input hash in the `explanations` table, and replaced by a template if Gemini is unavailable. Everything is labelled so users know which text is AI-written.

## Screens

| Route | Screen |
| --- | --- |
| `/` | Landing |
| `/create` | Create group |
| `/join`, `/join/[code]` | Join group |
| `/g/[code]/m/[memberId]` | Individual requirements form |
| `/g/[code]` | Group requirement summary |
| `/g/[code]/results` | Property results (2–3 options) |
| `/g/[code]/compare` | Trade-off comparison |

There are no accounts. Which member you are is remembered per device in `localStorage`, and the member ID in the URL works as a lightweight link.
