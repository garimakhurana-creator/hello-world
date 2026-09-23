const { MOODS, LANGUAGES, CONTENT_TYPES, MIN_RATINGS, ERAS } = require('./constants');

function subsetOrThrow(values, allowed, label) {
  if (!Array.isArray(values) || !values.length) throw new Error(`${label} is required.`);
  for (const v of values) {
    if (!allowed.includes(v)) throw new Error(`Invalid ${label} value: ${v}`);
  }
}

// "Any" deselects everything else, both as a UX rule and a server-side guarantee.
function collapseAny(values, anyValue = 'any') {
  return values.includes(anyValue) ? [anyValue] : values;
}

function normalizePreferences(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Preferences are required.');

  subsetOrThrow(raw.moods, MOODS, 'mood');
  subsetOrThrow(raw.languages, LANGUAGES, 'language');
  subsetOrThrow(raw.eras, ERAS, 'era');
  if (!CONTENT_TYPES.includes(raw.content_type)) throw new Error('Invalid content type.');
  if (!MIN_RATINGS.includes(raw.min_rating)) throw new Error('Invalid minimum rating.');

  const moodText = typeof raw.mood_text === 'string' ? raw.mood_text.trim().slice(0, 500) : '';

  return {
    moods: raw.moods,
    mood_text: moodText,
    languages: collapseAny(raw.languages),
    content_type: raw.content_type,
    min_rating: raw.min_rating,
    eras: collapseAny(raw.eras)
  };
}

module.exports = { normalizePreferences };
