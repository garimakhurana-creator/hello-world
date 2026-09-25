"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setMe } from "@/components/identity";
import { btn, Card, Eyebrow, input, Page } from "@/components/ui";

export default function CreateGroup() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [yourName, setYourName] = useState("");
  const [expectedSize, setExpectedSize] = useState(3);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groupName, yourName, expectedSize }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setBusy(false);
      return;
    }
    setMe(data.code, data.memberId);
    router.push(`/g/${data.code}/m/${data.memberId}?new=1`);
  }

  return (
    <Page narrow>
      <Eyebrow>Step 1 of 3</Eyebrow>
      <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl">Create your group</h1>
      <p className="mt-2 text-stone-600">Next you&apos;ll add your own requirements. Then you get an invite link for the others.</p>
      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium">Group name</span>
            <input className={`${input} mt-1.5`} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Pune flat hunt" required />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Your first name</span>
            <input className={`${input} mt-1.5`} value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="Your name" required />
          </label>
          <div>
            <span className="text-sm font-medium">How many people, including you?</span>
            <div className="mt-1.5 flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setExpectedSize(n)}
                  className={`h-11 w-14 rounded-xl border text-sm font-medium ${expectedSize === n ? "border-brand-600 bg-brand-50 text-brand-700" : "border-stone-300 bg-white"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <button className={`${btn.primary} w-full`} disabled={busy}>
            {busy ? "Creating…" : "Create group & add my requirements"}
          </button>
        </form>
      </Card>
    </Page>
  );
}
