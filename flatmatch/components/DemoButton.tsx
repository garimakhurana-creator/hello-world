"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn } from "./ui";
import { setMe } from "./identity";

export function DemoButton({ className = btn.secondary }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/demo", { method: "POST" });
        const data = await res.json();
        if (!res.ok) return setBusy(false);
        setMe(data.code, data.memberId);
        router.push(`/g/${data.code}`);
      }}
    >
      {busy ? "Setting up…" : "Explore a sample group"}
    </button>
  );
}
