"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import type { TicketListItem } from "@/lib/types";

const PAGE = 25;

export default function InboxPage() {
  const [filters, setFilters] = useState({ status: "", priority: "", category: "", q: "" });
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ items: TicketListItem[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    api<{ items: TicketListItem[]; total: number }>(`/tickets?${params}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [filters, offset]);

  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setOffset(0);
    setFilters({ ...filters, [k]: e.target.value });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Search subject…" value={filters.q} onChange={set("q")} />
        <select className="input max-w-[160px]" value={filters.status} onChange={set("status")}>
          <option value="">All statuses</option><option>new</option><option>open</option><option>resolved</option>
        </select>
        <select className="input max-w-[160px]" value={filters.priority} onChange={set("priority")}>
          <option value="">All priorities</option><option>urgent</option><option>high</option><option>normal</option><option>low</option>
        </select>
        <select className="input max-w-[180px]" value={filters.category} onChange={set("category")}>
          <option value="">All categories</option>
          {["billing", "technical", "account", "shipping", "feature_request", "other"].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2">Subject</th><th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Priority</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/tickets/${t.id}`} className="font-medium hover:underline">{t.subject}</Link>
                  <div className="text-xs text-slate-500">{t.customer_email}</div>
                </td>
                <td className="px-4 py-2"><Badge value={t.category} /></td>
                <td className="px-4 py-2"><Badge value={t.priority} /></td>
                <td className="px-4 py-2"><Badge value={t.status} /></td>
                <td className="px-4 py-2 text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No tickets match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{data.total} tickets</span>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
            <button className="btn-ghost" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
