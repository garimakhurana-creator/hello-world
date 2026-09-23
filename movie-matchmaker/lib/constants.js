const MOODS = ['light_fun', 'intense_gripping', 'scary', 'romantic', 'other'];
const LANGUAGES = ['hindi', 'english', 'tamil', 'telugu', 'kannada', 'any'];
const LANGUAGE_CODES = { hindi: 'hi', english: 'en', tamil: 'ta', telugu: 'te', kannada: 'kn' };
const CONTENT_TYPES = ['movies_only', 'include_series'];
const MIN_RATINGS = [6, 7, 8, 9];
const ERAS = ['any', 'classic', '2000_2020', 'recent'];

const ERA_RANGES = {
  classic: { from: null, to: '1999-12-31' },
  '2000_2020': { from: '2000-01-01', to: '2020-12-31' },
  recent: { from: '2021-01-01', to: new Date().toISOString().slice(0, 10) }
};

module.exports = { MOODS, LANGUAGES, LANGUAGE_CODES, CONTENT_TYPES, MIN_RATINGS, ERAS, ERA_RANGES };
