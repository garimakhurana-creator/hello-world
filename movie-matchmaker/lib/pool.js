const { getClient, insertOne, getMany } = require('./db');
const tmdb = require('./tmdb');
const ott = require('./ott');
const gemini = require('./gemini');
const { LANGUAGE_CODES, ERA_RANGES } = require('./constants');

const POOL_TARGET = 30;
const ENRICH_BUFFER = 5;
const MAX_CANDIDATES_TO_ENRICH = 90;
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function keyOf(c) {
  return `${c.mediaType}:${c.tmdbId}`;
}

// The most restrictive value wins for hard filters (min rating, content type,
// era) so a title satisfies both partners; languages are unioned so neither
// partner's comfortable-language titles get excluded by the other's picks.
function combinePreferences(prefsA, prefsB) {
  const minRating = Math.max(prefsA.min_rating, prefsB.min_rating);
  const contentType = (prefsA.content_type === 'movies_only' || prefsB.content_type === 'movies_only')
    ? 'movies_only'
    : 'include_series';
  const mediaTypes = contentType === 'movies_only' ? ['movie'] : ['movie', 'tv'];

  const languagesRaw = [...new Set([...prefsA.languages, ...prefsB.languages])];
  const languageCodes = languagesRaw.includes('any')
    ? []
    : languagesRaw.map(l => LANGUAGE_CODES[l]).filter(Boolean);

  const erasRaw = [...new Set([...prefsA.eras, ...prefsB.eras])];
  const eraRanges = erasRaw.includes('any')
    ? []
    : erasRaw.map(e => ERA_RANGES[e]).filter(Boolean);

  return { minRating, mediaTypes, languageCodes, eraRanges };
}

async function allowedGenreNames() {
  const maps = await tmdb.genreMap();
  return [...new Set([...Object.keys(maps.movie), ...Object.keys(maps.tv)])].map(titleCase);
}

function titleCase(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

async function loadCached(tmdbId, mediaType) {
  const rows = await getMany('titles_cache', { tmdb_id: tmdbId, media_type: mediaType });
  const row = rows[0];
  if (!row) return null;
  const fresh = row.updated_at && (Date.now() - new Date(row.updated_at).getTime() < CACHE_MAX_AGE_MS);
  if (!fresh) return null;
  return {
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    year: row.year,
    synopsis: row.synopsis,
    posterUrl: row.poster_url,
    popularity: row.popularity,
    genres: row.genres,
    runtimeMinutes: row.runtime_minutes,
    imdbId: row.imdb_id,
    imdbRating: row.imdb_rating,
    ott: row.ott
  };
}

async function saveToCache(title) {
  const { error } = await getClient().from('titles_cache').upsert({
    tmdb_id: title.tmdbId,
    media_type: title.mediaType,
    title: title.title,
    year: title.year,
    synopsis: title.synopsis,
    poster_url: title.posterUrl,
    popularity: title.popularity,
    genres: title.genres,
    runtime_minutes: title.runtimeMinutes,
    imdb_id: title.imdbId,
    imdb_rating: title.imdbRating,
    ott: title.ott,
    ott_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'tmdb_id,media_type' });
  if (error) throw new Error(`titles_cache upsert failed: ${error.message}`);
}

// Enriches one TMDB discover() candidate with runtime/imdbId (TMDB) and real
// IMDb rating + India streaming links (RapidAPI OTT Details), using the cache
// so the same title is never re-fetched from either paid API twice.
async function enrichOne(candidate) {
  const cached = await loadCached(candidate.tmdbId, candidate.mediaType);
  if (cached) return cached;

  const withDetails = await tmdb.enrichDetails(candidate);
  let imdbRating = null;
  let ottPlatforms = [];
  if (withDetails.imdbId) {
    try {
      const result = await ott.getImdbRatingAndOtt(withDetails.imdbId);
      imdbRating = result.imdbRating;
      ottPlatforms = result.platforms;
    } catch (err) {
      console.warn(`OTT Details lookup failed for ${withDetails.imdbId}: ${err.message}`);
    }
  }

  const title = { ...withDetails, imdbRating, ott: ottPlatforms };
  await saveToCache(title);
  return title;
}

async function mapWithConcurrency(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Enriches candidates in popularity order, stopping once enough pass the
// minRating threshold (plus a small buffer) so Gemini has room to curate.
async function enrichUntilEnough(candidates, minRating) {
  const qualifying = [];
  const batchSize = 5;
  for (let start = 0; start < candidates.length && start < MAX_CANDIDATES_TO_ENRICH; start += batchSize) {
    const batch = candidates.slice(start, start + batchSize);
    const enriched = await mapWithConcurrency(batch, batchSize, c =>
      enrichOne(c).catch(err => {
        console.warn(`Enrichment failed for ${keyOf(c)}: ${err.message}`);
        return null;
      })
    );
    for (const title of enriched) {
      if (title && title.imdbRating !== null && title.imdbRating >= minRating) qualifying.push(title);
    }
    if (qualifying.length >= POOL_TARGET + ENRICH_BUFFER) break;
  }
  return qualifying;
}

function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Builds and saves a round's pool. `mode` is 'initial' (round 1, from stated
// prefs + history) or 'refine' (round 2+, biased by round 1's right-swipes).
async function buildPool({ sessionId, round, prefsA, prefsB, excludeKeys = [], likedByPartner, history }) {
  const filters = combinePreferences(prefsA, prefsB);
  const genreNames = await allowedGenreNames();

  const brief = likedByPartner
    ? await gemini.refineFromSwipes({ likedByPartner, prefsA, prefsB, allowedGenreNames: genreNames })
    : await gemini.generateSearchBrief({ prefsA, prefsB, allowedGenreNames: genreNames, history });

  const rawCandidates = await tmdb.discover({
    genreNames: brief.genreNames || [],
    languageCodes: filters.languageCodes,
    eraRanges: filters.eraRanges,
    mediaTypes: filters.mediaTypes
  });

  const excludeSet = new Set(excludeKeys);
  const freshCandidates = rawCandidates.filter(c => !excludeSet.has(keyOf(c)));

  const qualifying = await enrichUntilEnough(freshCandidates, filters.minRating);

  const curatedKeys = qualifying.length
    ? await gemini.curatePool({
        candidates: qualifying.map(t => ({ key: keyOf(t), title: t.title, year: t.year, genres: t.genres, synopsis: t.synopsis })),
        moodSummary: brief.moodSummary || '',
        vibeKeywords: brief.vibeKeywords || [],
        targetCount: POOL_TARGET
      }).catch(err => {
        console.warn(`Gemini curation failed, falling back to popularity order: ${err.message}`);
        return [];
      })
    : [];

  const byKey = new Map(qualifying.map(t => [keyOf(t), t]));
  const ordered = [];
  for (const key of curatedKeys) {
    if (byKey.has(key)) ordered.push(byKey.get(key));
  }
  for (const t of qualifying) {
    if (ordered.length >= POOL_TARGET) break;
    if (!ordered.includes(t)) ordered.push(t);
  }
  const finalTitles = ordered.slice(0, POOL_TARGET);

  const keys = finalTitles.map(keyOf);
  await insertOne('pools', {
    session_id: sessionId,
    round,
    tmdb_ids: keys,
    order_a: shuffled(keys),
    order_b: shuffled(keys)
  });

  return finalTitles;
}

module.exports = { buildPool, combinePreferences, keyOf };
