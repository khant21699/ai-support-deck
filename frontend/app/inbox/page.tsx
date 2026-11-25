"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plain, PriorityMark, StatusChip } from "@/components/Badge";
import { SearchIcon } from "@/components/Icons";
import { api } from "@/lib/api";
import { dateTime, label, timeAgo } from "@/lib/format";
import type { TicketListItem } from "@/lib/types";

const PAGE_SIZE = 25;
const CATEGORIES = ["billing", "technical", "account", "shipping", "feature_request", "other"];
const NO_FILTERS = { status: "", priority: "", category: "", q: "" };

// Column widths on laptops: priority, subject, category, status, age.
const COLUMNS = "xl:grid-cols-[120px_minmax(0,1fr)_140px_100px_96px]";

export default function InboxPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ items: TicketListItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(0);
      setFilters((f) => (f.q === search ? f : { ...f, q: search }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    setLoading(true);
    api<{ items: TicketListItem[]; total: number }>(`/tickets?${params}`)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters, offset]);

  const choose = (key: "status" | "priority" | "category") => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOffset(0);
    setFilters({ ...filters, [key]: e.target.value });
  };

  const isFiltered = Object.values(filters).some(Boolean);
  const from = data && data.total > 0 ? offset + 1 : 0;
  const to = data ? Math.min(offset + PAGE_SIZE, data.total) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted" aria-live="polite">
          {data ? `${data.total} ${data.total === 1 ? "ticket" : "tickets"}${isFiltered ? " match" : ""}` : ""}
        </p>
      </div>

      <form role="search" className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_170px]" onSubmit={(e) => e.preventDefault()}>
        <div className="relative col-span-2 lg:col-span-1">
          <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <label htmlFor="search" className="sr-only">
            Search subjects
          </label>
          <input
            id="search"
            type="search"
            className="field pl-9"
            placeholder="Search subjects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="status" className="sr-only">
            Status
          </label>
          <select id="status" className="field" value={filters.status} onChange={choose("status")}>
            <option value="">Any status</option>
            <option value="new">New</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="sr-only">
            Priority
          </label>
          <select id="priority" className="field" value={filters.priority} onChange={choose("priority")}>
            <option value="">Any priority</option>
            {["urgent", "high", "normal", "low"].map((p) => (
              <option key={p} value={p}>
                {label(p)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="category" className="sr-only">
            Category
          </label>
          <select id="category" className="field" value={filters.category} onChange={choose("category")}>
            <option value="">Any category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        </div>
      </form>

      {error && (
        <p role="alert" className="alert-error mt-4">
          Could not load tickets: {error}
        </p>
      )}

      <div className="panel mt-4 overflow-hidden">
        <div aria-hidden="true" className={`hidden gap-x-4 border-b border-rule px-4 py-2 text-[12px] font-semibold text-muted xl:grid ${COLUMNS}`}>
          <span>Priority</span>
          <span>Ticket</span>
          <span>Category</span>
          <span>Status</span>
          <span>Age</span>
        </div>

        {loading && !data ? (
          <ul aria-label="Loading tickets" className="divide-y divide-rule">
            {Array.from({ length: 7 }).map((_, i) => (
              <li key={i} className="px-4 py-4">
                <div className="h-4 w-2/3 rounded bg-rule motion-safe:animate-pulse" />
                <div className="mt-2.5 h-3 w-1/3 rounded bg-rule/70 motion-safe:animate-pulse" />
              </li>
            ))}
          </ul>
        ) : data && data.items.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="font-semibold">{isFiltered ? "No tickets match these filters" : "No tickets yet"}</p>
            <p className="mt-1 text-muted">
              {isFiltered ? "Try a different search or clear the filters." : "New requests from the contact form will appear here."}
            </p>
            {isFiltered && (
              <button
                className="btn-secondary mt-4"
                onClick={() => {
                  setSearch("");
                  setOffset(0);
                  setFilters(NO_FILTERS);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul className={`divide-y divide-rule transition-opacity ${loading ? "opacity-60" : ""}`}>
            {data?.items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className={`grid gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-pencil-wash/50 focus-visible:outline-offset-[-2px] xl:items-center ${COLUMNS}`}
                >
                  <div className="min-w-0 xl:col-start-2 xl:row-start-1">
                    <p className="truncate font-semibold">{t.subject}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                      <span className="truncate">{t.customer_email}</span>
                      {t.ai_status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 text-pencil-dark">
                          <span className="size-1.5 rounded-full bg-pencil motion-safe:animate-pulse" aria-hidden="true" />
                          AI drafting
                        </span>
                      )}
                      {t.ai_status === "failed" && <span className="font-semibold text-proof">AI failed</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 xl:contents">
                    {t.priority || t.category ? (
                      <>
                        <span className="xl:col-start-1 xl:row-start-1">
                          <PriorityMark value={t.priority} />
                        </span>
                        <span className="xl:col-start-3 xl:row-start-1">
                          <Plain value={t.category} />
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] text-muted xl:col-start-1 xl:col-span-2 xl:row-start-1">
                        {t.ai_status === "failed" ? "Not triaged" : "Awaiting triage"}
                      </span>
                    )}
                    <span className="xl:col-start-4 xl:row-start-1">
                      <StatusChip value={t.status} />
                    </span>
                    <time dateTime={t.created_at} title={dateTime(t.created_at)} className="text-[13px] tabular-nums text-muted xl:col-start-5 xl:row-start-1">
                      {timeAgo(t.created_at)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span className="tabular-nums">
            {from}&ndash;{to} of {data.total}
          </span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Previous
            </button>
            <button className="btn-secondary" disabled={offset + PAGE_SIZE >= data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
