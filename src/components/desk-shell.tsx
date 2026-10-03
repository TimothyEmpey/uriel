"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { signOutDesk } from "@/app/actions";
import { LiveRefresh } from "@/components/live-refresh";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UrielMark } from "@/components/uriel-mark";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/logs", label: "Logs" },
  { href: "/pnl", label: "P&L" },
  { href: "/risk", label: "Risk" },
];

export function DeskShell({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "live" | "paused" | "halted" | "idle";
}) {
  const pathname = usePathname();
  return (
    <>
      <LiveRefresh />
      <UrielMark tone={tone} />
      <div className="mx-auto min-h-screen max-w-6xl px-4 pb-24 pt-5 md:pb-10 md:pt-6">
        <header className="mb-6 flex items-center justify-between gap-3 pr-28 sm:pr-36">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Uriel
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm",
                    active ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={signOutDesk}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        {children}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_88%,transparent)] px-2 py-2 backdrop-blur md:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn("rounded-full px-2 py-1 text-xs", pathname === link.href ? "text-[var(--primary)]" : "text-[var(--muted)]")}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
