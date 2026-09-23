const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
// curatePool's input can be a long candidate list (up to ~90 titles), and this
// preview model spends some of max_tokens on internal reasoning even with
// responseMimeType forcing JSON output — 2000 was truncating the response
// before the closing brace. 8000 matches what sales-intel-app uses for the
// same reason.
const MAX_TOKENS = Number(process.env.GEMINI_MAX_TOKENS || 8000);

function apiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set. Add it to movie-matchmaker/.env.');
  return key;
}

async function callGemini(system, userMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey())}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: MAX_TOKENS, responseMimeType: 'application/json' }
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Gemini API request failed: ${data.error?.message || res.statusText}`);
  }

  const candidate = (data.candidates || [])[0];
  const text = (candidate?.content?.parts || [])
    .filter(part => typeof part.text === 'string')
    .map(part => part.text)
    .join('\n');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Gemini did not return JSON. Raw response: ${text.slice(0, 300)}`);
  return JSON.parse(jsonMatch[0]);
}

function formatPrefs(label, prefs) {
  return [
    `${label}:`,
    `  Moods: ${prefs.moods.join(', ') || '(none)'}`,
    `  Mood in their own words: ${prefs.mood_text || '(not provided)'}`,
    `  Languages: ${prefs.languages.join(', ') || 'Any'}`,
    `  Content type: ${prefs.content_type}`,
    `  Minimum rating: ${prefs.min_rating}+`,
    `  Era: ${prefs.eras.join(', ') || 'Any'}`
  ].join('\n');
}

function formatHistory(history) {
  if (!history || !history.length) return '(no watch history yet)';
  return history
    .map(h => `- "${h.title}" (${h.year || '?'}) — rating given: ${h.rating ?? 'unrated'}${h.notes ? `, notes: ${h.notes}` : ''}`)
    .join('\n');
}

const BRIEF_SYSTEM_PROMPT = `You help pick movies/TV shows two partners will BOTH enjoy tonight.
Given two independent preference profiles, produce a JSON search brief that captures the genre and
mood/vibe nuance from their free-text answers (the structured fields like language, rating and era
are already handled elsewhere — focus on genre and vibe).

Respond with ONLY a JSON object, no other text, in this exact shape:
{
  "genreNames": ["..."],   // 2-5 names, ONLY from the allowed list given below, that would satisfy BOTH partners
  "vibeKeywords": ["..."], // 3-8 short free-text phrases capturing mood nuance (e.g. "slow burn", "feel-good ending", "not too gory")
  "moodSummary": "..."     // 1-2 sentences: what tonight's watch should feel like, for BOTH partners
}`;

async function generateSearchBrief({ prefsA, prefsB, allowedGenreNames, history }) {
  const userMessage = [
    'PARTNER A:',
    formatPrefs('Partner A', prefsA),
    '',
    'PARTNER B:',
    formatPrefs('Partner B', prefsB),
    '',
    `ALLOWED GENRE NAMES: ${allowedGenreNames.join(', ')}`,
    '',
    'PAST TITLES THIS COUPLE HAS WATCHED/RATED (use to lean toward what they actually enjoy together, if relevant):',
    formatHistory(history)
  ].join('\n');

  return callGemini(BRIEF_SYSTEM_PROMPT, userMessage);
}

const CURATE_SYSTEM_PROMPT = `You curate a final shortlist of movies/TV shows for two partners to swipe on tonight.
You'll be given a candidate list (each with a "key", title, year, genres, and a short synopsis) and a
mood brief. Pick the best candidates for tonight's mood — use the synopsis to judge nuance a genre
filter can't capture (tone, pacing, ending, intensity).

Respond with ONLY a JSON object, no other text, in this exact shape:
{ "keys": ["movie:123", "tv:456", ...] }   // ordered best-fit first, using the exact "key" values given`;

async function curatePool({ candidates, moodSummary, vibeKeywords, targetCount }) {
  const list = candidates
    .map(c => `- key=${c.key} | "${c.title}" (${c.year || '?'}) | genres: ${(c.genres || []).join('/')} | ${c.synopsis ? c.synopsis.slice(0, 200) : '(no synopsis)'}`)
    .join('\n');

  const userMessage = [
    `MOOD FOR TONIGHT: ${moodSummary}`,
    `VIBE KEYWORDS: ${vibeKeywords.join(', ')}`,
    `PICK UP TO ${targetCount} of the best-fitting candidates below, ordered best-first.`,
    '',
    'CANDIDATES:',
    list
  ].join('\n');

  const result = await callGemini(CURATE_SYSTEM_PROMPT, userMessage);
  return Array.isArray(result.keys) ? result.keys : [];
}

const REFINE_SYSTEM_PROMPT = `Two partners just swiped through a pool of titles with no mutual match.
Given what each partner actually swiped right on (their real signal, which may override their stated
mood), produce a refined JSON search brief for a second round that leans into what they responded to.

Respond with ONLY a JSON object, no other text, in this exact shape:
{
  "genreNames": ["..."],   // ONLY from the allowed list given below
  "vibeKeywords": ["..."],
  "moodSummary": "..."
}`;

async function refineFromSwipes({ likedByPartner, prefsA, prefsB, allowedGenreNames }) {
  const describeLiked = partner => {
    const items = likedByPartner[partner] || [];
    if (!items.length) return '(swiped right on nothing this round)';
    return items.map(t => `"${t.title}" (${(t.genres || []).join('/')})`).join(', ');
  };

  const userMessage = [
    'PARTNER A stated preferences:', formatPrefs('Partner A', prefsA),
    '', 'PARTNER B stated preferences:', formatPrefs('Partner B', prefsB),
    '',
    `PARTNER A swiped right on: ${describeLiked('A')}`,
    `PARTNER B swiped right on: ${describeLiked('B')}`,
    '',
    `ALLOWED GENRE NAMES: ${allowedGenreNames.join(', ')}`
  ].join('\n');

  return callGemini(REFINE_SYSTEM_PROMPT, userMessage);
}

module.exports = { generateSearchBrief, curatePool, refineFromSwipes };
