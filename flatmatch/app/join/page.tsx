"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn, Card, Eyebrow, input, Page } from "@/components/ui";

export default function JoinWithCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <Page narrow>
      <Eyebrow>Join a group</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Enter your invite code</h1>
      <p className="mt-2 text-stone-600">It&apos;s the 6-character code in the link your friend shared.</p>
      <Card className="mt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const c = code.trim().toUpperCase();
            if (c) router.push(`/join/${c}`);
          }}
          className="space-y-4"
        >
          <input
            className={`${input} text-center font-mono text-2xl uppercase tracking-[0.3em]`}
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABC123"
            autoFocus
            aria-label="Invite code"
          />
          <button className={`${btn.primary} w-full`}>Continue</button>
        </form>
      </Card>
    </Page>
  );
}
