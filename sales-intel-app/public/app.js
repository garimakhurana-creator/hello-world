const form = document.getElementById('research-form');
const submitBtn = document.getElementById('submit-btn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const outputEl = document.getElementById('report-output');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');

let lastReport = '';
let lastCompanyBName = '';

function setStatus(message, isError) {
  statusEl.hidden = !message;
  statusEl.textContent = message || '';
  statusEl.classList.toggle('error', Boolean(isError));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(form);

  const companyA = {
    name: data.get('a-name')?.trim(),
    website: data.get('a-website')?.trim(),
    product: data.get('a-product')?.trim(),
    industry: data.get('a-industry')?.trim(),
    geography: data.get('a-geography')?.trim()
  };
  const companyB = {
    name: data.get('b-name')?.trim(),
    website: data.get('b-website')?.trim(),
    department: data.get('b-department')?.trim(),
    person: data.get('b-person')?.trim()
  };

  lastCompanyBName = companyB.name || 'company';
  resultEl.hidden = true;
  submitBtn.disabled = true;
  setStatus('Researching Company B and building outreach — this can take 1–3 minutes...', false);

  try {
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ companyA, companyB })
    });
    const payload = await res.json();

    if (!res.ok) {
      setStatus(payload.error || 'Something went wrong.', true);
      return;
    }

    lastReport = payload.report || '(no report returned)';
    outputEl.textContent = lastReport;
    resultEl.hidden = false;

    let statusMsg = `Done — ran ${payload.searchesRun ?? 0} web search${payload.searchesRun === 1 ? '' : 'es'}.`;
    if (payload.truncated) statusMsg += ' Note: output hit the token limit and may be cut off.';
    setStatus(statusMsg, false);
  } catch (err) {
    setStatus(`Request failed: ${err.message}`, true);
  } finally {
    submitBtn.disabled = false;
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(lastReport);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy report'; }, 1500);
  } catch {
    setStatus('Could not copy to clipboard — select and copy the text manually.', true);
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([lastReport], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-intel-${lastCompanyBName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});
