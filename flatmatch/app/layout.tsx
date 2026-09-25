import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FlatMatch: find a flat you all can live with",
  description: "One form, each flatmate fills it in separately, and you get 2–3 flats you can actually discuss.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f6f3" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">F</span>
              FlatMatch
            </Link>
            <nav className="flex gap-4 text-sm text-stone-600">
              <Link href="/create" className="hover:text-stone-900">Create group</Link>
              <Link href="/join" className="hover:text-stone-900">Join</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
          Matching is rule-based and fully explained. AI only helps with the wording. You make the decision.
        </footer>
      </body>
    </html>
  );
}
