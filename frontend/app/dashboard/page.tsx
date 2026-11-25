"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import type { Summary, TimePoint } from "@/lib/types";

const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)}%`);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

const toRows = (o: Record<string, number>) => Object.entries(o).map(([name, count]) => ({ name, count }));

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<TimePoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Summary>(`/dashboard/summary?days=${days}`), api<TimePoint[]>(`/dashboard/timeseries?days=${days}`)])
      .then(([s, t]) => { setSummary(s); setSeries(t); })
      .catch((e) => setError(e.message));
  }, [days]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!summary) return <p className="text-slate-500">Loading…</p>;
  const ai = summary.ai;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <select className="input max-w-[160px]" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tickets" value={String(summary.tickets.total)} hint={`${summary.tickets.open} open`} />
        <Stat label="Median first response" value={summary.median_first_response_minutes === null ? "–" : `${summary.median_first_response_minutes} min`} />
        <Stat label="Median resolution" value={summary.median_resolution_hours === null ? "–" : `${summary.median_resolution_hours} h`} />
        <Stat label="AI acceptance rate" value={pct(ai.acceptance_rate)} hint={`${pct(ai.approved_as_is_rate)} approved as-is · ${ai.drafts_reviewed} reviewed`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Avg edit on edited drafts" value={pct(ai.avg_edit_ratio)} />
        <Stat label="Avg draft latency" value={ai.avg_latency_ms === null ? "–" : `${(ai.avg_latency_ms / 1000).toFixed(1)} s`} />
        <Stat label="Drafts with no KB answer" value={String(ai.ungrounded_drafts)} />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Ticket volume</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="created" stroke="#0f172a" dot={false} />
              <Line type="monotone" dataKey="resolved" stroke="#16a34a" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {([["By category", summary.by_category], ["By priority", summary.by_priority], ["By sentiment", summary.by_sentiment]] as const).map(([title, data]) => (
          <div key={title} className="card">
            <h2 className="mb-3 font-semibold">{title}</h2>
            <div className="h-52">
              <ResponsiveContainer>
                <BarChart data={toRows(data)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#334155" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Open tickets by agent</h2>
        {summary.open_by_agent.length === 0 ? <p className="text-sm text-slate-500">None assigned.</p> : (
          <ul className="text-sm">{summary.open_by_agent.map((a) => <li key={a.agent}>{a.agent}: {a.open}</li>)}</ul>
        )}
      </div>
    </div>
  );
}
