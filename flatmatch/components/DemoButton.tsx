"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn } from "./ui";
import { send } from "./api";
import { setMe } from "./identity";

export function DemoButton({ className = btn.secondary }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          const res = await send<{ code: string; memberId: string }>("/api/demo", "POST");
          if (!res.ok) {
            setError(res.error);
            setBusy(false);
            return;
          }
          setMe(res.data.code, res.data.memberId);
          router.push(`/g/${res.data.code}`);
        }}
      >
        {busy ? "Setting up…" : "Explore a sample group"}
      </button>
      {error && <span role="alert" className="basis-full text-sm text-rose-700">{error}</span>}
    </>
  );
}
