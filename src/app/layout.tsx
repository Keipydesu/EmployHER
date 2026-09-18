import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EmployHER", template: "%s | EmployHER" },
  description: "A career navigator for your next step in tech.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
            <Link
              href="/"
              aria-label="EmployHER home"
              className="text-2xl font-bold tracking-tight"
            >
              Employ<span className="text-purple-800">HER</span>
            </Link>
            <nav
              aria-label="Main navigation"
              className="flex gap-6 text-sm font-medium"
            >
              <Link href="/">Overview</Link>
              <Link href="/#journey">The journey</Link>
            </nav>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-6xl px-6 py-16 sm:py-24"
        >
          {children}
        </main>
        <footer className="mx-auto max-w-6xl border-t border-stone-200 px-6 py-8 text-sm text-stone-600">
          Built for early-career possibilities. One step at a time.
        </footer>
      </body>
    </html>
  );
}
