"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, post } from "@/lib/api";
import type { User } from "@/lib/types";

const links = [
  { href: "/inbox", label: "Inbox" },
  { href: "/kb", label: "Knowledge base" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Nav() {
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

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-semibold">Support Desk</Link>
        {user && (
          <div className="flex gap-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={pathname.startsWith(l.href) ? "font-medium text-slate-900" : "text-slate-500 hover:text-slate-900"}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-slate-500">{user.email} ({user.role})</span>
              <button onClick={logout} className="btn-ghost">Log out</button>
            </>
          ) : (
            <>
              <Link href="/submit" className="text-slate-500 hover:text-slate-900">Submit a ticket</Link>
              <Link href="/login" className="btn-primary">Agent login</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
