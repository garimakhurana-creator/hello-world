"use client";

// fetch + JSON with a readable error when the server or database is down,
// so buttons never get stuck on "Saving…".
export async function send<T = Record<string, unknown>>(
  url: string,
  method: "POST" | "PUT",
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data) return { ok: true, data };
    return { ok: false, error: data?.error ?? "Something went wrong on our side. Please try again in a minute." };
  } catch {
    return { ok: false, error: "Couldn't reach FlatMatch. Check your connection and try again." };
  }
}
