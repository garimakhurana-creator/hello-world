"use client";

import { useSyncExternalStore } from "react";

// No accounts: we remember which member you are, per group, on this device.
const key = (code: string) => `flatmatch:${code.toUpperCase()}`;

export function getMe(code: string): string | null {
  try {
    return localStorage.getItem(key(code));
  } catch {
    return null;
  }
}

export function setMe(code: string, memberId: string) {
  try {
    localStorage.setItem(key(code), memberId);
  } catch {
    /* private mode: fine, links still work */
  }
}

const noop = () => () => {};
const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

// Server render (and first hydration pass) sees null; the client then reads storage.
export function useMe(code: string): string | null {
  return useSyncExternalStore(subscribeStorage, () => getMe(code), () => null);
}

export function useOrigin(): string {
  return useSyncExternalStore(noop, () => window.location.origin, () => "");
}
