const { getMany, getManyIn } = require('./db');
const { titlesForKeys } = require('./matching');

// Past matches (+ ratings, if given) for a couple, used to bias future Gemini briefs.
async function getHistory(coupleId) {
  if (!coupleId) return [];
  const sessions = await getMany('sessions', { couple_id: coupleId });
  const sessionIds = sessions.map(s => s.id);
  if (!sessionIds.length) return [];

  const matches = await getManyIn('matches', 'session_id', sessionIds);
  if (!matches.length) return [];

  const ratings = await getManyIn('ratings', 'session_id', sessionIds);
  const ratingBySession = new Map(ratings.map(r => [r.session_id, r]));

  const keys = matches.map(m => `${m.media_type}:${m.tmdb_id}`);
  const titlesByKey = await titlesForKeys(keys);

  return matches
    .map(m => {
      const title = titlesByKey.get(`${m.media_type}:${m.tmdb_id}`);
      if (!title) return null;
      const rating = ratingBySession.get(m.session_id);
      return { title: title.title, year: title.year, rating: rating ? rating.rating : null, notes: rating ? rating.notes : null };
    })
    .filter(Boolean);
}

module.exports = { getHistory };
