// RapidAPI "OTT Details" (host: ott-details.p.rapidapi.com by gox-ai-gox-ai-default).
// Looks up a title by IMDb ID and returns its IMDb rating + India streaming links.
// Endpoint and response shape confirmed with a live call (see scripts/test-ott.js):
//   GET /gettitleDetails?imdbid=tt1234567
//   { imdbrating, runtime: "92 min", synopsis, streamingAvailability: { country: { IN: [{platform, url}], US: [...] } }, ... }

const DEFAULT_PATH = process.env.OTT_DETAILS_PATH || '/gettitleDetails';
const COUNTRY = 'IN';

// Known slugs from the streamingAvailability payload -> a readable display name.
// Unrecognized slugs fall back to a title-cased version of the slug itself.
const PLATFORM_NAMES = {
  netflix: 'Netflix',
  prime: 'Amazon Prime Video',
  amazonprimevideo: 'Amazon Prime Video',
  amazon: 'Amazon Video',
  hotstar: 'Disney+ Hotstar',
  jiocinema: 'JioCinema',
  jiohotstar: 'JioHotstar',
  zee5: 'ZEE5',
  sonyliv: 'SonyLIV',
  mxplayer: 'MX Player',
  voot: 'Voot',
  altbalaji: 'ALTBalaji',
  lionsgateplay: 'Lionsgate Play',
  sunnxt: 'Sun NXT',
  aha: 'Aha',
  hungamaplay: 'Hungama Play',
  tatasky: 'Tata Sky',
  itunes: 'Apple TV',
  play: 'Google Play Movies',
  youtube: 'YouTube',
  tubitv: 'Tubi',
  hoopla: 'Hoopla',
  redbox: 'Redbox',
  directv: 'DirecTV',
  vudu: 'Vudu',
  microsoft: 'Microsoft Store',
  hbomax: 'HBO Max'
};

function displayName(slug) {
  if (!slug) return null;
  if (PLATFORM_NAMES[slug.toLowerCase()]) return PLATFORM_NAMES[slug.toLowerCase()];
  return slug.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function headers() {
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || 'ott-details.p.rapidapi.com';
  if (!key) throw new Error('RAPIDAPI_KEY is not set. Add it to movie-matchmaker/.env.');
  return { 'x-rapidapi-key': key, 'x-rapidapi-host': host };
}

// The RapidAPI BASIC plan enforces a strict per-second rate limit (confirmed
// live: concurrent calls got 429'd almost immediately). All calls are funneled
// through this single queue, spaced out, so no matter how many titles are
// being enriched in parallel elsewhere, actual requests to RapidAPI go out
// one at a time with a minimum gap between them.
const MIN_INTERVAL_MS = Number(process.env.OTT_MIN_INTERVAL_MS || 1100);
let lastCallAt = 0;
let queue = Promise.resolve();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function schedule(fn) {
  const result = queue.then(async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastCallAt));
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return fn();
  });
  queue = result.catch(() => {}); // keep the queue alive even if this call fails
  return result;
}

async function fetchOnce(imdbId) {
  const host = process.env.RAPIDAPI_HOST || 'ott-details.p.rapidapi.com';
  const url = new URL(`https://${host}${DEFAULT_PATH}`);
  url.searchParams.set('imdbid', imdbId);
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`OTT Details lookup failed (${res.status}) for ${imdbId}: ${body.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function rawLookup(imdbId) {
  return schedule(async () => {
    // One retry on 429: the per-second window may just need a beat to clear.
    try {
      return await fetchOnce(imdbId);
    } catch (err) {
      if (err.status !== 429) throw err;
      await sleep(MIN_INTERVAL_MS * 2);
      return fetchOnce(imdbId);
    }
  });
}

function normalize(raw) {
  if (!raw) return { imdbRating: null, platforms: [] };

  const imdbRating = raw.imdbrating !== undefined && raw.imdbrating !== null ? Number(raw.imdbrating) : null;

  const inList = (raw.streamingAvailability && raw.streamingAvailability.country && raw.streamingAvailability.country[COUNTRY]) || [];
  const platforms = inList
    .map(entry => ({ name: displayName(entry.platform), link: entry.url, type: 'stream' }))
    .filter(p => p.name && p.link);

  return { imdbRating: Number.isFinite(imdbRating) ? imdbRating : null, platforms };
}

async function getImdbRatingAndOtt(imdbId) {
  if (!imdbId) return { imdbRating: null, platforms: [] };
  const raw = await rawLookup(imdbId);
  return normalize(raw);
}

module.exports = { getImdbRatingAndOtt, rawLookup, normalize };
