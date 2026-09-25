import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "FlatMatch: find a flat you'll all say yes to",
  description: "Everyone answers privately. Get 2–3 flats worth discussing, with every trade-off in plain sight.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f5f0" };

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect width="32" height="32" rx="10" className="fill-brand-700" />
      <path d="M8 15.5 16 9l8 6.5V23a1 1 0 0 1-1 1h-4.5v-5h-5v5H9a1 1 0 0 1-1-1z" className="fill-white" />
      <circle cx="23.5" cy="9.5" r="3" className="fill-amber-300" />
    </svg>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#f7f5f0]/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight">
              <Logo />
              FlatMatch
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/join" className="rounded-full px-3.5 py-2 font-medium text-stone-600 hover:bg-stone-200/60 hover:text-stone-900">
                Join
              </Link>
              <Link href="/create" className="rounded-full bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700">
                Start a group
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200/70">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-stone-500 sm:flex-row">
            <span className="flex items-center gap-2 font-medium text-stone-700"><Logo /> FlatMatch</span>
            <span>Rule-based matching you can read line by line. AI only helps with the wording.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
