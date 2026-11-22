import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="print-hidden sticky top-0 z-40 border-b border-line bg-paper backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" className="flex min-h-[44px] shrink-0 items-center" aria-label="Branvidia home">
          <Image src="/branvidia-logo.svg" alt="branvidia" width={143} height={24} className="brand-wordmark block h-auto w-[108px] shrink-0 sm:w-[143px]" priority />
          <Image src="/branvidia-logo-dark.svg" alt="branvidia" width={143} height={24} className="brand-wordmark-dark hidden h-auto w-[108px] shrink-0 sm:w-[143px]" priority />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link
            href="/assistant"
            className="rounded-full px-2 py-3 text-sm font-medium text-slate hover:bg-mist hover:text-ink sm:px-4 sm:text-base"
          >
            Assistant
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full px-2 py-3 text-sm font-medium text-slate hover:bg-mist hover:text-ink sm:px-4 sm:text-base"
          >
            Dashboard
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
