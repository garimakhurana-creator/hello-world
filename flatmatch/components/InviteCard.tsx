"use client";

import { useState } from "react";
import { useOrigin } from "./identity";
import { btn } from "./ui";

export function InviteCard({ code, waitingFor }: { code: string; waitingFor: number }) {
  const link = `${useOrigin()}/join/${code}`;
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
      <p className="font-semibold text-brand-900">Invite your flatmates</p>
      <p className="mt-1 text-sm text-brand-900/80">
        Waiting for {waitingFor} more {waitingFor === 1 ? "person" : "people"}. Send them this link, or the code{" "}
        <span className="font-mono font-semibold tracking-widest">{code}</span>.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={link} className="min-w-0 flex-1 rounded-xl border border-brand-100 bg-white px-3 py-2.5 font-mono text-sm" onFocus={(e) => e.target.select()} aria-label="Invite link" />
        <button
          className={btn.primary}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* user can copy manually */
            }
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a className={btn.secondary} href={`https://wa.me/?text=${encodeURIComponent(`Fill in your flat requirements (takes 3 min): ${link}`)}`} target="_blank" rel="noreferrer">
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}
