"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, post } from "@/lib/api";
import { label } from "@/lib/format";
import type { User } from "@/lib/types";
import { InboxIcon, LogOutIcon, PilcrowIcon, TallyIcon } from "./Icons";
import Wordmark from "./Wordmark";

// Customers and visitors see a light top bar. Signed-in agents get the working layout: a left rail
// on laptops and a bottom tab bar on phones.
const PUBLIC_PATHS = ["/", "/submit", "/login"];

const NAV = [
  { href: "/inbox", name: "Inbox", Icon: InboxIcon },
  { href: "/kb", name: "Knowledge base", Icon: PilcrowIcon },
  { href: "/dashboard", name: "Dashboard", Icon: TallyIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api<User>("/auth/me").then(setUser).catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await post("/auth/logout");
    setUser(null);
    router.push("/login");
  }

  const skipLink = (
    <a
      href="#main"
      className="sr-only rounded bg-ink px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
    >
      Skip to content
    </a>
  );

  if (PUBLIC_PATHS.includes(pathname)) {
    return (
      <>
        {skipLink}
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 md:px-10 md:py-4">
            <Wordmark />
            <nav aria-label="Main" className="flex items-center gap-1 text-sm font-semibold">
              <Link href="/submit" className="rounded px-3 py-2 text-ink hover:bg-slip max-md:hidden">
                Contact support
              </Link>
              {user ? (
                <Link href="/inbox" className="btn-secondary">Open inbox</Link>
              ) : (
                <Link href="/login" className="btn-secondary">Agent login</Link>
              )}
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1180px] px-4 py-8 md:px-10 md:py-12">
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      {skipLink}
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden border-r border-rule lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-4 lg:py-6">
          <div className="px-2">
            <Wordmark href="/inbox" />
          </div>
          <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
            {NAV.map(({ href, name, Icon }) => {
              const active = pathname.startsWith(href) || (href === "/inbox" && pathname.startsWith("/tickets"));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded px-3 py-2 text-sm no-underline transition-colors ${
                    active ? "bg-slip font-semibold text-ink shadow-[inset_0_0_0_1px_#d4d3ca]" : "text-muted hover:bg-slip hover:text-ink"
                  }`}
                >
                  <Icon className={active ? "text-pencil" : ""} />
                  {name}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-rule px-2 pt-4 text-sm">
            {user && (
              <>
                <p className="truncate font-semibold">{user.email}</p>
                <p className="text-muted">{label(user.role)}</p>
              </>
            )}
            <button onClick={logout} className="btn-quiet -ml-1.5 mt-2">
              <LogOutIcon size={16} />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex items-center justify-between border-b border-rule px-4 py-2.5 lg:hidden">
          <Wordmark href="/inbox" />
          <button onClick={logout} aria-label="Log out" className="btn-quiet">
            <LogOutIcon />
          </button>
        </div>

        <main id="main" className="min-w-0 px-4 pb-28 pt-6 md:px-10 md:pt-10 lg:pb-12">
          <div className="mx-auto max-w-[1060px]">{children}</div>
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-rule bg-slip pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map(({ href, name, Icon }) => {
          const active = pathname.startsWith(href) || (href === "/inbox" && pathname.startsWith("/tickets"));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold no-underline ${
                active ? "text-pencil" : "text-muted"
              }`}
            >
              <Icon />
              {name}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
