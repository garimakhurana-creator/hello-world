const BASE = 'https://api.themoviedb.org/3';

let genreMapPromise = null;

function apiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY is not set. Add it to movie-matchmaker/.env.');
  return key;
}

async function tmdbGet(pathname, params) {
  const url = new URL(BASE + pathname);
  url.searchParams.set('api_key', apiKey());
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TMDB ${pathname} failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

// { movie: { "Action": 28, ... }, tv: { "Action & Adventure": 10759, ... } }
async function genreMap() {
  if (!genreMapPromise) {
    genreMapPromise = (async () => {
      const [movieGenres, tvGenres] = await Promise.all([
        tmdbGet('/genre/movie/list', {}),
        tmdbGet('/genre/tv/list', {})
      ]);
      const toMap = list => Object.fromEntries(list.genres.map(g => [g.name.toLowerCase(), g.id]));
      return { movie: toMap(movieGenres), tv: toMap(tvGenres) };
    })();
  }
  return genreMapPromise;
}

function genreIdsFor(names, mapForType) {
  return (names || [])
    .map(name => mapForType[String(name).toLowerCase()])
    .filter(id => id !== undefined);
}

// brief: { genreNames: string[], languageCodes: string[], eraRanges: {from,to}[], mediaTypes: ('movie'|'tv')[] }
// Returns raw, deduped candidates with basic TMDB metadata (no runtime/imdb yet), sorted by popularity desc.
async function discover(brief) {
  const maps = await genreMap();
  const mediaTypes = brief.mediaTypes && brief.mediaTypes.length ? brief.mediaTypes : ['movie'];
  const languages = brief.languageCodes && brief.languageCodes.length ? brief.languageCodes : [null];
  const eras = brief.eraRanges && brief.eraRanges.length ? brief.eraRanges : [null];

  const byId = new Map();
  let calls = 0;
  const MAX_CALLS = 16;

  for (const mediaType of mediaTypes) {
    const genreIds = genreIdsFor(brief.genreNames, maps[mediaType] || {});
    for (const language of languages) {
      for (const era of eras) {
        if (calls >= MAX_CALLS) break;
        calls += 1;
        const dateGteKey = mediaType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
        const dateLteKey = mediaType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
        const params = {
          // Sorted by TMDB's own rating (with a vote-count floor to avoid
          // noisy small-sample scores) rather than popularity, since the
          // enrichment pipeline downstream stops once enough candidates clear
          // the user's minimum IMDb rating — popularity-sorted results skew
          // toward buzzy/recent titles that often don't clear a 7+ bar.
          sort_by: 'vote_average.desc',
          'vote_count.gte': 100,
          include_adult: 'false',
          [dateGteKey]: era && era.from ? era.from : undefined,
          [dateLteKey]: era && era.to ? era.to : undefined,
          with_original_language: language || undefined,
          with_genres: genreIds.length ? genreIds.join('|') : undefined
        };
        const pages = [];
        for (let page = 1; page <= 4; page++) {
          try {
            const result = await tmdbGet(`/discover/${mediaType}`, { ...params, page });
            pages.push(result);
            if (page >= result.total_pages) break;
          } catch (err) {
            break; // keep whatever pages already succeeded
          }
        }
        for (const page of pages) {
          for (const item of page.results || []) {
            const key = `${mediaType}:${item.id}`;
            if (byId.has(key)) continue;
            byId.set(key, {
              tmdbId: item.id,
              mediaType,
              title: item.title || item.name,
              year: parseYear(item.release_date || item.first_air_date),
              synopsis: item.overview,
              posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
              popularity: item.popularity,
              voteAverage: item.vote_average,
              genreIds: item.genre_ids || []
            });
          }
        }
      }
    }
  }

  // Highest TMDB rating first, so the enrichment pipeline (which stops once
  // enough candidates clear the user's real IMDb-rating floor) burns through
  // the most likely-to-qualify candidates first.
  return [...byId.values()].sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0));
}

function parseYear(dateStr) {
  if (!dateStr) return null;
  const year = parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

// Adds runtime + imdb_id + genre names to a discover() candidate.
async function enrichDetails(candidate) {
  const data = await tmdbGet(`/${candidate.mediaType}/${candidate.tmdbId}`, {
    append_to_response: 'external_ids'
  });
  const runtime = candidate.mediaType === 'movie'
    ? data.runtime
    : (Array.isArray(data.episode_run_time) && data.episode_run_time.length ? data.episode_run_time[0] : null);
  return {
    ...candidate,
    runtimeMinutes: runtime || null,
    imdbId: data.external_ids ? data.external_ids.imdb_id : null,
    genres: (data.genres || []).map(g => g.name)
  };
}

module.exports = { discover, enrichDetails, genreMap };
