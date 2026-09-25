"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setMe } from "./identity";
import { btn, input } from "./ui";

export function JoinForm({ code }: { code: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await fetch(`/api/groups/${code}/members`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
          setBusy(false);
          return;
        }
        setMe(code, data.memberId);
        router.push(`/g/${code}/m/${data.memberId}`);
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">Your first name</span>
        <input className={`${input} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoFocus />
      </label>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <button className={`${btn.primary} w-full`} disabled={busy}>{busy ? "Joining…" : "Join & add my requirements"}</button>
    </form>
  );
}
