const { getMany, getManyIn } = require('./db');

async function titlesForKeys(keys) {
  if (!keys.length) return new Map();
  const tmdbIds = [...new Set(keys.map(k => Number(k.split(':')[1])))];
  const rows = await getManyIn('titles_cache', 'tmdb_id', tmdbIds);
  // Supabase JS has no convenient "WHERE (a,b) IN (...)"; narrow by tmdb_id via
  // the index, then filter client-side to the exact (tmdb_id, media_type) pairs.
  const wanted = new Set(keys);
  const map = new Map();
  for (const row of rows) {
    const key = `${row.media_type}:${row.tmdb_id}`;
    if (!wanted.has(key)) continue;
    map.set(key, {
      tmdbId: row.tmdb_id,
      mediaType: row.media_type,
      title: row.title,
      year: row.year,
      synopsis: row.synopsis,
      posterUrl: row.poster_url,
      genres: row.genres,
      runtimeMinutes: row.runtime_minutes,
      imdbRating: row.imdb_rating,
      ott: row.ott
    });
  }
  return map;
}

// Returns { titlesByKey, orderA, orderB } for a round's pool, or null if not built yet.
async function getPool(sessionId, round) {
  const pools = await getMany('pools', { session_id: sessionId, round });
  const pool = pools[0];
  if (!pool) return null;
  const titlesByKey = await titlesForKeys(pool.tmdb_ids);
  return { titlesByKey, orderA: pool.order_a, orderB: pool.order_b, tmdbIds: pool.tmdb_ids };
}

async function poolSize(sessionId, round) {
  const pools = await getMany('pools', { session_id: sessionId, round });
  return pools[0] ? pools[0].tmdb_ids.length : 0;
}

async function swipeCount(sessionId, round, partner) {
  const rows = await getMany('swipes', { session_id: sessionId, round, partner });
  return rows.length;
}

async function likedTitlesForRound(sessionId, round) {
  const rows = await getMany('swipes', { session_id: sessionId, round, liked: true });
  const keys = rows.map(r => `${r.media_type}:${r.tmdb_id}`);
  const titlesByKey = await titlesForKeys(keys);
  const result = { A: [], B: [] };
  for (const row of rows) {
    const title = titlesByKey.get(`${row.media_type}:${row.tmdb_id}`);
    if (title) result[row.partner].push(title);
  }
  return result;
}

// Combined right-swipe score across every round so far: how many times (out of
// up to 2 partners x N rounds) a title was swiped right, used for the round-3
// "top 5, you two decide" fallback.
async function computeTop5(sessionId, upToRound) {
  const allLiked = [];
  for (let round = 1; round <= upToRound; round++) {
    const rows = await getMany('swipes', { session_id: sessionId, round, liked: true });
    allLiked.push(...rows);
  }
  const counts = new Map(); // key -> count
  for (const row of allLiked) {
    const key = `${row.media_type}:${row.tmdb_id}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const keys = [...counts.keys()];
  const titlesByKey = await titlesForKeys(keys);

  const ranked = keys
    .map(key => ({ key, count: counts.get(key), title: titlesByKey.get(key) }))
    .filter(entry => entry.title)
    .sort((a, b) => (b.count - a.count) || ((b.title.imdbRating || 0) - (a.title.imdbRating || 0)));

  return ranked.slice(0, 5).map(entry => entry.title);
}

module.exports = { getPool, poolSize, swipeCount, likedTitlesForRound, computeTop5, titlesForKeys };
