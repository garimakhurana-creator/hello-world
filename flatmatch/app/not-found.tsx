import Link from "next/link";
import { btn, Page } from "@/components/ui";

export default function NotFound() {
  return (
    <Page narrow>
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that</h1>
      <p className="mt-2 text-stone-600">The group code or link may be wrong. Check it with whoever invited you.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/join" className={btn.primary}>Enter a code</Link>
        <Link href="/" className={btn.secondary}>Home</Link>
      </div>
    </Page>
  );
}
