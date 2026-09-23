const Api = (() => {
  async function request(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  return {
    createSession: (preferences, coupleId) => request('POST', '/api/sessions', { preferences, coupleId }),
    joinSession: (sessionId, preferences) => request('POST', `/api/sessions/${sessionId}/join`, { preferences }),
    getSession: sessionId => request('GET', `/api/sessions/${sessionId}`),
    getPool: (sessionId, partner) => request('GET', `/api/sessions/${sessionId}/pool?partner=${partner}`),
    swipe: (sessionId, partner, tmdbId, mediaType, liked) =>
      request('POST', `/api/sessions/${sessionId}/swipe`, { partner, tmdbId, mediaType, liked }),
    nextRound: sessionId => request('POST', `/api/sessions/${sessionId}/next-round`),
    finalPick: (sessionId, tmdbId, mediaType) =>
      request('POST', `/api/sessions/${sessionId}/final-pick`, { tmdbId, mediaType }),
    rate: (sessionId, tmdbId, mediaType, rating, notes) =>
      request('POST', `/api/sessions/${sessionId}/rating`, { tmdbId, mediaType, rating, notes })
  };
})();
