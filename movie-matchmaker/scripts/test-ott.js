// Live smoke test for lib/ott.js. Run once real keys are in .env:
//   node scripts/test-ott.js tt1375666
// Prints the raw RapidAPI response and what lib/ott.js parses out of it.
require('../server-env')();
const ott = require('../lib/ott');

async function main() {
  const imdbId = process.argv[2] || 'tt1375666'; // The Dark Knight
  console.log(`Looking up ${imdbId} via ${process.env.RAPIDAPI_HOST}${process.env.OTT_DETAILS_PATH || '/gettitleDetails'} ...`);
  const raw = await ott.rawLookup(imdbId);
  console.log('\n--- RAW RESPONSE ---');
  console.log(JSON.stringify(raw, null, 2));
  console.log('\n--- PARSED (lib/ott.js normalize) ---');
  console.log(JSON.stringify(ott.normalize(raw), null, 2));
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
