const express = require('express');
const fs = require('fs');
const path = require('path');

loadDotEnv();

const app = express();
const PORT = process.env.PORT || 3100;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 8000);

const SYSTEM_PROMPT = buildSystemPrompt();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Loads sales-intel-app/.env into process.env if present, without adding a
// dependency on dotenv. Existing env vars (e.g. set in the shell) win.
// Handles UTF-8 and UTF-16 (Notepad's default for new files) transparently.
function loadDotEnv() {
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
}

// The web app and the /sales-intel Claude Code skill share one spec: this
// reads the skill's own SKILL.md + guardrails.md so both stay in sync.
function buildSystemPrompt() {
  const skillDir = path.join(__dirname, '..', '.claude', 'skills', 'sales-intel');
  const skillPath = path.join(skillDir, 'SKILL.md');
  const guardrailsPath = path.join(skillDir, 'references', 'guardrails.md');

  let skillBody = fs.readFileSync(skillPath, 'utf-8').replace(/^---[\s\S]*?---\n/, '').trim();
  const guardrails = fs.readFileSync(guardrailsPath, 'utf-8').trim();

  skillBody = skillBody.replace(
    /Before writing any outreach copy, read \[references\/guardrails\.md\]\([^)]*\)[^\n]*/,
    'Before writing any outreach copy, apply every guardrail in the "GUARDRAILS (full reference)" section below.'
  );

  skillBody = skillBody.replace(
    /If `WebSearch` and `WebFetch` aren't already available in this session, load them first via `ToolSearch` \(`select:WebSearch,WebFetch`\)\. /,
    ''
  );

  return `${skillBody}\n\n## GUARDRAILS (full reference)\n\n${guardrails}\n\nYou have a live web_search tool — use it as many times as you need across the research steps. Do not skip research and do not answer from memory for anything time-sensitive.`;
}

function isNonEmpty(val) {
  return typeof val === 'string' && val.trim() !== '';
}

function formatCompany(label, c) {
  if (!c) return `${label}: (not provided)`;
  const lines = [`${label}:`, `  Name: ${c.name || '(not provided)'}`];
  if (isNonEmpty(c.website)) lines.push(`  Website: ${c.website}`);
  if (isNonEmpty(c.product)) lines.push(`  Product/service: ${c.product}`);
  if (isNonEmpty(c.industry)) lines.push(`  Target industry: ${c.industry}`);
  if (isNonEmpty(c.geography)) lines.push(`  Target geography: ${c.geography}`);
  if (isNonEmpty(c.department)) lines.push(`  Target department: ${c.department}`);
  if (isNonEmpty(c.person)) lines.push(`  Target person: ${c.person}`);
  return lines.join('\n');
}

app.post('/api/research', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!isNonEmpty(apiKey)) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set on the server. Add it to sales-intel-app/.env or export it in your shell, then restart the app.'
    });
  }

  const { companyA, companyB } = req.body || {};
  if (!companyA || !isNonEmpty(companyA.name) || !isNonEmpty(companyA.product)) {
    return res.status(400).json({ error: 'Company A needs at least a name and a product/service description.' });
  }
  if (!companyB || !isNonEmpty(companyB.name)) {
    return res.status(400).json({ error: 'Company B needs at least a name.' });
  }

  const userMessage = [
    'Run the full sales-intelligence and outreach workflow for this seller/target pair.',
    '',
    formatCompany('COMPANY A (seller)', companyA),
    '',
    formatCompany('COMPANY B (target account)', companyB)
  ].join('\n');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API request failed.' });
    }

    const report = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    const searchCount = (data.content || []).filter(block => block.type === 'server_tool_use' && block.name === 'web_search').length;

    res.json({
      report,
      truncated: data.stop_reason === 'max_tokens',
      searchesRun: searchCount
    });
  } catch (err) {
    res.status(500).json({ error: `Request to Anthropic API failed: ${err.message}` });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Sales intel app running at http://localhost:${PORT}`);
});

// Research can involve many sequential web searches — give it room to finish.
server.timeout = 5 * 60 * 1000;
