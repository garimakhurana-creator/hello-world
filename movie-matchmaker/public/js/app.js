const app = document.getElementById('app');
let pollTimer = null;
let lastKey = null;
window.APP = {};

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Preference form (shared by Partner A and Partner B) ----------

function pillGroup(name, options, multi) {
  return options.map(o => `
    <label class="pill">
      <input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${o.value}">
      <span>${o.label}${o.caveat ? ` <em>(${o.caveat})</em>` : ''}</span>
    </label>`).join('');
}

function preferenceFormHtml(heading) {
  return `
    <div class="screen">
      <h1>${heading}</h1>
      <form id="pref-form" class="pref-form">
        <fieldset>
          <legend>Mood <span class="hint">(pick any that fit)</span></legend>
          <div class="pill-group" data-group="moods">${pillGroup('moods', MOOD_OPTIONS, true)}</div>
        </fieldset>

        <label class="field">
          <span>Describe what you're in the mood for tonight <span class="hint">(optional)</span></span>
          <textarea name="mood_text" maxlength="500" placeholder="e.g. something to fall asleep to, or a proper edge-of-seat thriller..."></textarea>
        </label>

        <fieldset>
          <legend>Language</legend>
          <div class="pill-group" data-group="languages">${pillGroup('languages', LANGUAGE_OPTIONS, true)}</div>
        </fieldset>

        <fieldset>
          <legend>Content type</legend>
          <div class="pill-group" data-group="content_type">${pillGroup('content_type', CONTENT_TYPE_OPTIONS, false)}</div>
        </fieldset>

        <fieldset>
          <legend>Minimum IMDb rating</legend>
          <div class="pill-group" data-group="min_rating">${pillGroup('min_rating', MIN_RATING_OPTIONS, false)}</div>
        </fieldset>

        <fieldset>
          <legend>Era</legend>
          <div class="pill-group" data-group="eras">${pillGroup('eras', ERA_OPTIONS, true)}</div>
        </fieldset>

        <p class="error" id="pref-error" hidden></p>
        <button type="submit" class="btn btn--primary">Continue</button>
      </form>
    </div>`;
}

function wireAnyExclusivity(form) {
  ['languages', 'eras'].forEach(group => {
    const boxes = [...form.querySelectorAll(`input[name="${group}"]`)];
    boxes.forEach(box => {
      box.addEventListener('change', () => {
        if (box.value === 'any' && box.checked) {
          boxes.forEach(b => { if (b !== box) b.checked = false; });
        } else if (box.value !== 'any' && box.checked) {
          const anyBox = boxes.find(b => b.value === 'any');
          if (anyBox) anyBox.checked = false;
        }
      });
    });
  });
}

function readPreferences(form) {
  const checked = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  const single = name => { const el = form.querySelector(`input[name="${name}"]:checked`); return el ? el.value : null; };

  const moods = checked('moods');
  const languages = checked('languages');
  const eras = checked('eras');
  const contentType = single('content_type');
  const minRating = single('min_rating');

  if (!moods.length) throw new Error('Pick at least one mood.');
  if (!languages.length) throw new Error('Pick at least one language.');
  if (!eras.length) throw new Error('Pick at least one era.');
  if (!contentType) throw new Error('Pick a content type.');
  if (!minRating) throw new Error('Pick a minimum rating.');

  return {
    moods,
    mood_text: form.querySelector('[name="mood_text"]').value.trim(),
    languages,
    content_type: contentType,
    min_rating: Number(minRating),
    eras
  };
}

function attachPreferenceForm(onSubmit) {
  const form = document.getElementById('pref-form');
  wireAnyExclusivity(form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errorEl = document.getElementById('pref-error');
    errorEl.hidden = true;
    let preferences;
    try {
      preferences = readPreferences(form);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Please wait…';
    try {
      await onSubmit(preferences);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue';
    }
  });
}

function renderLanding() {
  app.innerHTML = preferenceFormHtml("Tonight, you two are actually going to agree.");
  attachPreferenceForm(async preferences => {
    const coupleId = localStorage.getItem('coupleId');
    const result = await Api.createSession(preferences, coupleId);
    localStorage.setItem('coupleId', result.coupleId);
    localStorage.setItem(`role_${result.sessionId}`, 'A');
    localStorage.setItem(`sessionMeta_${result.sessionId}`, JSON.stringify({ joinUrl: result.joinUrl, qrCodeDataUrl: result.qrCodeDataUrl }));
    history.replaceState(null, '', `?s=${result.sessionId}`);
    window.APP = { sessionId: result.sessionId, role: 'A' };
    lastKey = null;
    await refreshAndRender();
    startPolling();
  });
}

function renderJoinForm() {
  app.innerHTML = preferenceFormHtml('Your partner is waiting on you. Set your own vibe for tonight.');
  attachPreferenceForm(async preferences => {
    await Api.joinSession(window.APP.sessionId, preferences);
    localStorage.setItem(`role_${window.APP.sessionId}`, 'B');
    lastKey = null;
    await refreshAndRender();
  });
}

// ---------- Waiting for partner (Partner A, with QR + share) ----------

async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

function renderWaitingForPartner() {
  const meta = JSON.parse(localStorage.getItem(`sessionMeta_${window.APP.sessionId}`) || '{}');
  app.innerHTML = `
    <div class="screen screen--center">
      <h1>Send this to your partner</h1>
      <p class="subtle">They scan the code, or open the link, and set their own preferences — you won't see each other's answers.</p>
      <img class="qr" src="${meta.qrCodeDataUrl || ''}" alt="QR code to join">
      <div class="link-row">
        <input type="text" id="join-link" readonly value="${escapeHtml(meta.joinUrl || '')}">
        <button class="btn btn--ghost" id="copy-link-btn">Copy</button>
      </div>
      <button class="btn btn--primary" id="share-btn">Share to a messaging app</button>
      <div class="spinner-row"><span class="spinner"></span> Waiting for your partner to join…</div>
    </div>`;

  document.getElementById('copy-link-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(meta.joinUrl || '').then(() => {
      const btn = document.getElementById('copy-link-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });

  document.getElementById('share-btn').addEventListener('click', async () => {
    try {
      const file = await dataUrlToFile(meta.qrCodeDataUrl, 'join-tonights-watch.png');
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "What Should We Watch", text: meta.joinUrl });
        return;
      }
    } catch (err) {
      // fall through to download fallback below
    }
    const a = document.createElement('a');
    a.href = meta.qrCodeDataUrl;
    a.download = 'join-tonights-watch.png';
    a.click();
  });
}

function renderBuildingPool() {
  app.innerHTML = `
    <div class="screen screen--center">
      <h1>Curating tonight's picks…</h1>
      <p class="subtle">Reading both your moods and pulling the best matches from thousands of titles.</p>
      <div class="spinner-row"><span class="spinner"></span></div>
    </div>`;
}

// ---------- Swiping ----------

let currentDeck = null;

async function renderSwiping(session) {
  const { sessionId, role } = window.APP;
  app.innerHTML = `
    <div class="screen screen--swipe">
      <div class="round-label">Round ${session.round}</div>
      <div id="deck" class="deck"></div>
      <div class="swipe-controls">
        <button class="btn btn--circle btn--pass" id="pass-btn" aria-label="Pass">✕</button>
        <button class="btn btn--circle btn--like" id="like-btn" aria-label="Like">♥</button>
      </div>
    </div>`;

  const { titles } = await Api.getPool(sessionId, role);
  const deckEl = document.getElementById('deck');

  if (!titles.length) {
    deckEl.innerHTML = '<p class="subtle">No titles made the cut this round.</p>';
    return;
  }

  currentDeck = createSwipeDeck({
    container: deckEl,
    titles,
    onSwipe: async (title, liked) => {
      try {
        const result = await Api.swipe(sessionId, role, title.tmdbId, title.mediaType, liked);
        if (result.matched) {
          clearInterval(pollTimer);
          renderMatch({ match: result.match });
          return;
        }
      } catch (err) {
        console.error('Swipe failed:', err);
      }
      if (!currentDeck.hasMore()) renderWaitingAfterDeck();
    }
  });

  document.getElementById('like-btn').addEventListener('click', () => currentDeck.swipeTop(true));
  document.getElementById('pass-btn').addEventListener('click', () => currentDeck.swipeTop(false));
}

function renderWaitingAfterDeck() {
  app.innerHTML = `
    <div class="screen screen--center">
      <h1>That's everyone!</h1>
      <p class="subtle">Waiting for your partner to finish swiping tonight's picks…</p>
      <div class="spinner-row"><span class="spinner"></span></div>
    </div>`;
}

// ---------- Final pick (round 3) ----------

function titleCardHtml(t) {
  const rating = t.imdbRating != null ? `★ ${t.imdbRating.toFixed(1)}` : 'Unrated';
  const runtime = t.runtimeMinutes ? `${t.runtimeMinutes} min` : '';
  return `
    <div class="pick-card" data-tmdb-id="${t.tmdbId}" data-media-type="${t.mediaType}">
      <div class="pick-card__poster" style="background-image:url('${t.posterUrl || ''}')"></div>
      <div class="pick-card__info">
        <h3>${escapeHtml(t.title)} <span class="swipe-card__year">${t.year || ''}</span></h3>
        <div class="swipe-card__meta">${rating} &middot; ${runtime}</div>
        <p class="swipe-card__synopsis">${escapeHtml(t.synopsis || '')}</p>
        <button class="btn btn--primary pick-btn">We'll watch this</button>
      </div>
    </div>`;
}

function renderFinalPick(session) {
  app.innerHTML = `
    <div class="screen">
      <h1>No overlap after two rounds — you two decide</h1>
      <p class="subtle">These got the most combined right-swipes. Pick one together.</p>
      <div class="pick-grid">${(session.top5 || []).map(titleCardHtml).join('') || '<p class="subtle">Not enough data to suggest anything — try a new session.</p>'}</div>
    </div>`;

  document.querySelectorAll('.pick-card').forEach(card => {
    card.querySelector('.pick-btn').addEventListener('click', async () => {
      const tmdbId = Number(card.dataset.tmdbId);
      const mediaType = card.dataset.mediaType;
      const result = await Api.finalPick(window.APP.sessionId, tmdbId, mediaType);
      clearInterval(pollTimer);
      renderMatch({ match: result.match });
    });
  });
}

// ---------- Match reveal ----------

function ottLinksHtml(ott) {
  if (!ott || !ott.length) return '<p class="subtle">No India streaming info found for this title yet.</p>';
  return `<div class="ott-list">${ott.map(o => `
    <a class="ott-chip" href="${o.link || '#'}" target="_blank" rel="noopener">${escapeHtml(o.name)}</a>`).join('')}</div>`;
}

function renderMatch({ match }) {
  const t = match || {};
  const rating = t.imdbRating != null ? `★ ${t.imdbRating.toFixed(1)} IMDb` : 'Unrated';
  const runtime = t.runtimeMinutes ? `${t.runtimeMinutes} min` : '';
  app.innerHTML = `
    <div class="screen screen--match">
      <div class="match-banner">It's a match! 🎬</div>
      <div class="match-card">
        <div class="match-card__poster" style="background-image:url('${t.posterUrl || ''}')"></div>
        <h1>${escapeHtml(t.title)} <span class="swipe-card__year">${t.year || ''}</span></h1>
        <div class="swipe-card__meta">${rating} &middot; ${runtime}</div>
        <p class="swipe-card__synopsis">${escapeHtml(t.synopsis || '')}</p>
        <h3>Watch now in India</h3>
        ${ottLinksHtml(t.ott)}
      </div>
      <div id="rating-block" class="rating-block">
        <p>Watched it? Rate it for next time:</p>
        <div class="stars">${[1, 2, 3, 4, 5].map(n => `<button class="star" data-star="${n}">☆</button>`).join('')}</div>
      </div>
      <button class="btn btn--ghost" id="new-session-btn">Start a new movie night</button>
    </div>`;

  let selected = 0;
  document.querySelectorAll('.star').forEach(btn => {
    btn.addEventListener('click', async () => {
      selected = Number(btn.dataset.star);
      document.querySelectorAll('.star').forEach(b => { b.textContent = Number(b.dataset.star) <= selected ? '★' : '☆'; });
      await Api.rate(window.APP.sessionId, t.tmdbId, t.mediaType, selected, '');
    });
  });

  document.getElementById('new-session-btn').addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    location.reload();
  });
}

// ---------- Polling / routing ----------

async function renderForStatus(session) {
  const { role } = window.APP;
  if (session.status === 'waiting_partner') {
    if (role === 'A') renderWaitingForPartner();
    else if (!session.partnerBSubmitted) renderJoinForm();
    else renderBuildingPool(); // partner B just submitted; pool build is about to start
    return;
  }
  if (session.status === 'building_pool') return renderBuildingPool();
  if (session.status === 'swiping') return renderSwiping(session);
  if (session.status === 'final_pick') return renderFinalPick(session);
  if (session.status === 'matched') return renderMatch(session);
}

async function refreshAndRender() {
  try {
    const session = await Api.getSession(window.APP.sessionId);
    const key = `${session.status}:${session.round}`;
    if (key === lastKey) return;
    lastKey = key;
    await renderForStatus(session);
    if (session.status === 'matched' && pollTimer) clearInterval(pollTimer);
  } catch (err) {
    console.error(err);
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refreshAndRender, 1500);
}

async function init() {
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('s');
  if (!sessionId) {
    renderLanding();
    return;
  }
  const role = localStorage.getItem(`role_${sessionId}`) || 'B';
  window.APP = { sessionId, role };
  await refreshAndRender();
  startPolling();
}

init();
