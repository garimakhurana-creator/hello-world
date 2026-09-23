require('./server-env')();

const express = require('express');
const path = require('path');
const QRCode = require('qrcode');

const { insertOne, getOne, getMany, updateOne, getClient } = require('./lib/db');
const { normalizePreferences } = require('./lib/validate');
const { buildPool } = require('./lib/pool');
const matching = require('./lib/matching');
const { getHistory } = require('./lib/history');

const app = express();
const PORT = process.env.PORT || 3200;

app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Prevents duplicate concurrent pool builds for the same session if the
// client polls/retries while a build is already in flight.
const buildLocks = new Map();
function withBuildLock(sessionId, fn) {
  if (buildLocks.has(sessionId)) return buildLocks.get(sessionId);
  const p = fn().finally(() => buildLocks.delete(sessionId));
  buildLocks.set(sessionId, p);
  return p;
}

function asyncHandler(fn) {
  return (req, res) => fn(req, res).catch(err => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Unexpected server error.' });
  });
}

async function getPreferencesFor(sessionId) {
  const rows = await getMany('preferences', { session_id: sessionId });
  const byPartner = {};
  rows.forEach(r => { byPartner[r.partner] = r; });
  return byPartner;
}

async function runRound1Build(session, prefs) {
  const history = session.couple_id ? await getHistory(session.couple_id) : [];
  await buildPool({
    sessionId: session.id,
    round: 1,
    prefsA: prefs.A,
    prefsB: prefs.B,
    history
  });
  await updateOne('sessions', { id: session.id }, { status: 'swiping' });
}

async function runRefinementBuild(session, prefs, nextRound) {
  const likedByPartner = await matching.likedTitlesForRound(session.id, nextRound - 1);
  const prevPool = await matching.getPool(session.id, nextRound - 1);
  const excludeKeys = prevPool ? prevPool.tmdbIds : [];
  await buildPool({
    sessionId: session.id,
    round: nextRound,
    prefsA: prefs.A,
    prefsB: prefs.B,
    excludeKeys,
    likedByPartner
  });
  await updateOne('sessions', { id: session.id }, { status: 'swiping', current_round: nextRound });
}

// Called after any swipe that didn't produce a match: if both partners have
// now finished the current round, advances to round 2, or to the final_pick
// screen if round 2 is also exhausted.
async function maybeAdvanceRound(session) {
  const size = await matching.poolSize(session.id, session.current_round);
  if (!size) return;
  const [countA, countB] = await Promise.all([
    matching.swipeCount(session.id, session.current_round, 'A'),
    matching.swipeCount(session.id, session.current_round, 'B')
  ]);
  if (countA < size || countB < size) return;

  if (session.current_round >= 2) {
    await updateOne('sessions', { id: session.id }, { status: 'final_pick' });
    return;
  }

  await updateOne('sessions', { id: session.id }, { status: 'building_pool' });
  const prefs = await getPreferencesFor(session.id);
  withBuildLock(session.id, () => runRefinementBuild(session, prefs, session.current_round + 1))
    .catch(err => console.error(`Round ${session.current_round + 1} build failed for session ${session.id}:`, err));
}

app.post('/api/sessions', asyncHandler(async (req, res) => {
  const preferences = normalizePreferences(req.body.preferences);
  let coupleId = req.body.coupleId || null;
  if (coupleId) {
    const existing = await getOne('couples', { id: coupleId });
    if (!existing) coupleId = null;
  }
  if (!coupleId) {
    const couple = await insertOne('couples', {});
    coupleId = couple.id;
  }

  const session = await insertOne('sessions', { couple_id: coupleId, status: 'waiting_partner', current_round: 1 });
  await insertOne('preferences', { session_id: session.id, partner: 'A', ...preferences });

  const joinUrl = `${req.protocol}://${req.get('host')}/?s=${session.id}`;
  const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, { margin: 1, width: 320 });

  res.json({ sessionId: session.id, joinUrl, qrCodeDataUrl, coupleId });
}));

app.post('/api/sessions/:id/join', asyncHandler(async (req, res) => {
  const session = await getOne('sessions', { id: req.params.id });
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (session.status !== 'waiting_partner') return res.status(409).json({ error: 'This session already has both partners.' });

  const preferences = normalizePreferences(req.body.preferences);
  await insertOne('preferences', { session_id: session.id, partner: 'B', ...preferences });
  await updateOne('sessions', { id: session.id }, { status: 'building_pool' });

  const prefs = await getPreferencesFor(session.id);
  withBuildLock(session.id, () => runRound1Build(session, prefs))
    .catch(err => console.error(`Round 1 build failed for session ${session.id}:`, err));

  res.json({ ok: true });
}));

app.get('/api/sessions/:id', asyncHandler(async (req, res) => {
  const session = await getOne('sessions', { id: req.params.id });
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const prefs = await getPreferencesFor(session.id);
  const base = {
    sessionId: session.id,
    status: session.status,
    round: session.current_round,
    partnerASubmitted: Boolean(prefs.A),
    partnerBSubmitted: Boolean(prefs.B)
  };

  if (session.status === 'swiping') {
    const size = await matching.poolSize(session.id, session.current_round);
    const [countA, countB] = await Promise.all([
      matching.swipeCount(session.id, session.current_round, 'A'),
      matching.swipeCount(session.id, session.current_round, 'B')
    ]);
    return res.json({ ...base, poolSize: size, partnerAFinished: countA >= size, partnerBFinished: countB >= size });
  }

  if (session.status === 'final_pick') {
    const top5 = await matching.computeTop5(session.id, session.current_round);
    return res.json({ ...base, top5 });
  }

  if (session.status === 'matched') {
    const matches = await getMany('matches', { session_id: session.id });
    const match = matches[0];
    const titlesByKey = await matching.titlesForKeys([`${match.media_type}:${match.tmdb_id}`]);
    const title = titlesByKey.get(`${match.media_type}:${match.tmdb_id}`);
    return res.json({ ...base, match: title });
  }

  res.json(base);
}));

app.get('/api/sessions/:id/pool', asyncHandler(async (req, res) => {
  const partner = req.query.partner;
  if (partner !== 'A' && partner !== 'B') return res.status(400).json({ error: 'partner must be A or B.' });

  const session = await getOne('sessions', { id: req.params.id });
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const pool = await matching.getPool(session.id, session.current_round);
  if (!pool) return res.status(409).json({ error: 'Pool is not ready yet.' });

  const order = partner === 'A' ? pool.orderA : pool.orderB;
  const titles = order.map(key => pool.titlesByKey.get(key)).filter(Boolean);
  res.json({ round: session.current_round, titles });
}));

app.post('/api/sessions/:id/swipe', asyncHandler(async (req, res) => {
  const { partner, tmdbId, mediaType, liked } = req.body;
  if (partner !== 'A' && partner !== 'B') return res.status(400).json({ error: 'partner must be A or B.' });
  if (typeof liked !== 'boolean') return res.status(400).json({ error: 'liked must be a boolean.' });
  if (!Number.isInteger(tmdbId) || !['movie', 'tv'].includes(mediaType)) {
    return res.status(400).json({ error: 'tmdbId and mediaType are required.' });
  }

  const session = await getOne('sessions', { id: req.params.id });
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (session.status !== 'swiping') return res.status(409).json({ error: 'This session is not currently swiping.' });

  const { error: insertError } = await getClient().from('swipes').insert({
    session_id: session.id, round: session.current_round, partner, tmdb_id: tmdbId, media_type: mediaType, liked
  });
  if (insertError && insertError.code !== '23505') throw new Error(`swipe insert failed: ${insertError.message}`);

  if (liked) {
    const otherPartner = partner === 'A' ? 'B' : 'A';
    const otherLiked = await getOne('swipes', {
      session_id: session.id, round: session.current_round, partner: otherPartner, tmdb_id: tmdbId, media_type: mediaType, liked: true
    });
    if (otherLiked) {
      const { error: matchError } = await getClient().from('matches').insert({
        session_id: session.id, round: session.current_round, tmdb_id: tmdbId, media_type: mediaType, is_final_pick: false
      });
      if (matchError && matchError.code !== '23505') throw new Error(`match insert failed: ${matchError.message}`);
      await updateOne('sessions', { id: session.id }, { status: 'matched' });

      const titlesByKey = await matching.titlesForKeys([`${mediaType}:${tmdbId}`]);
      return res.json({ matched: true, match: titlesByKey.get(`${mediaType}:${tmdbId}`) });
    }
  }

  await maybeAdvanceRound(session);
  res.json({ matched: false });
}));

app.post('/api/sessions/:id/next-round', asyncHandler(async (req, res) => {
  const session = await getOne('sessions', { id: req.params.id });
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (session.status === 'swiping') await maybeAdvanceRound(session);
  res.json({ ok: true });
}));

app.post('/api/sessions/:id/final-pick', asyncHandler(async (req, res) => {
  const { tmdbId, mediaType } = req.body;
  const session = await getOne('sessions', { id: req.params.id });
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (session.status !== 'final_pick') return res.status(409).json({ error: 'This session is not at the final pick stage.' });

  const { error } = await getClient().from('matches').insert({
    session_id: session.id, round: session.current_round, tmdb_id: tmdbId, media_type: mediaType, is_final_pick: true
  });
  if (error && error.code !== '23505') throw new Error(`final pick insert failed: ${error.message}`);
  await updateOne('sessions', { id: session.id }, { status: 'matched' });

  const titlesByKey = await matching.titlesForKeys([`${mediaType}:${tmdbId}`]);
  res.json({ match: titlesByKey.get(`${mediaType}:${tmdbId}`) });
}));

app.post('/api/sessions/:id/rating', asyncHandler(async (req, res) => {
  const { tmdbId, mediaType, rating, notes } = req.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5.' });
  const session = await getOne('sessions', { id: req.params.id });
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  await insertOne('ratings', {
    session_id: session.id, tmdb_id: tmdbId, media_type: mediaType, rating,
    notes: typeof notes === 'string' ? notes.slice(0, 500) : null
  });
  res.json({ ok: true });
}));

const server = app.listen(PORT, () => {
  console.log(`Movie matchmaker running at http://localhost:${PORT}`);
});

// Pool building involves several sequential Gemini/TMDB/RapidAPI calls.
server.timeout = 3 * 60 * 1000;
