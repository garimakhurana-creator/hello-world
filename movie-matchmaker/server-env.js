const fs = require('fs');
const path = require('path');

// Loads movie-matchmaker/.env into process.env if present, without adding a
// dependency on dotenv. Existing env vars (e.g. set in the shell) win.
// Handles UTF-8 and UTF-16 (Notepad's default for new files) transparently.
module.exports = function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const buf = fs.readFileSync(envPath);

  let raw;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    raw = buf.toString('utf16le').replace(/^﻿/, '');
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    raw = buf.swap16().toString('utf16le').replace(/^﻿/, '');
  } else if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    raw = buf.toString('utf8').replace(/^﻿/, '');
  } else {
    raw = buf.toString('utf8');
  }

  raw.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
};
