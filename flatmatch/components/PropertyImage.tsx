"use client";

import { useState } from "react";

export function PropertyImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src)
    return (
      <div className={`grid place-items-center bg-gradient-to-br from-brand-100 to-stone-200 text-3xl ${className}`} aria-label={alt}>
        🏠
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}
