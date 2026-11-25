"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { label } from "@/lib/format";
import type { Summary, TimePoint } from "@/lib/types";

const RANGES = [7, 30, 90];

const percent = (value: number | null | undefined) => (value == null ? "no data" : `${Math.round(value * 100)}%`);

function duration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold">{children}</strong>;
}

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<TimePoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Summary>(`/dashboard/summary?days=${days}`), api<TimePoint[]>(`/dashboard/timeseries?days=${days}`)])
      .then(([s, t]) => {
        setSummary(s);
        setSeries(t);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [days]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div role="group" aria-label="Time range" className="inline-flex rounded border border-rule-strong bg-slip p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              aria-pressed={days === r}
              onClick={() => setDays(r)}
              className={`rounded-[2px] px-3 py-1.5 text-sm font-semibold transition-colors max-md:min-h-10 ${
                days === r ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="alert-error mt-4">Could not load the dashboard: {error}</p>
      )}

      {!summary && !error && (
        <div className="mt-8 space-y-3" role="status">
          <span className="sr-only">Loading dashboard</span>
          <div className="h-8 w-3/4 rounded bg-rule motion-safe:animate-pulse" />
          <div className="h-8 w-1/2 rounded bg-rule/70 motion-safe:animate-pulse" />
        </div>
      )}

      {summary && <Report summary={summary} series={series} days={days} />}
    </div>
  );
}

function Report({ summary, series, days }: { summary: Summary; series: TimePoint[]; days: number }) {
  const { tickets, ai } = summary;
  const reviewed = ai.drafts_reviewed;
  const approved = ai.outcomes.approved ?? 0;
  const edited = ai.outcomes.edited ?? 0;
  const rejected = ai.outcomes.rejected ?? 0;
  const share = (n: number) => (reviewed ? (n / reviewed) * 100 : 0);

  return (
    <div className="mt-8 space-y-12">
      <section aria-labelledby="queue">
        <h2 id="queue" className="sr-only">The queue</h2>
        {tickets.total === 0 ? (
          <p className="text-2xl font-medium leading-snug">No tickets came in over the last {days} days.</p>
        ) : (
          <p className="max-w-[52ch] text-2xl leading-snug tracking-tight">
            <Strong>{tickets.total}</Strong> tickets came in over the last {days} days, and <Strong>{tickets.open}</Strong>{" "}
            {tickets.open === 1 ? "is" : "are"} still open.{" "}
            {summary.median_first_response_minutes === null ? (
              "No replies have been sent yet."
            ) : (
              <>
                Agents first replied in a median of <Strong>{duration(summary.median_first_response_minutes)}</Strong>
                {summary.median_resolution_hours !== null && (
                  <>
                    {" "}and resolved tickets in <Strong>{duration(summary.median_resolution_hours * 60)}</Strong>
                  </>
                )}
                .
              </>
            )}
          </p>
        )}
      </section>

      <section aria-labelledby="ai">
        <h2 id="ai" className="text-xl font-bold tracking-tight">How the AI drafts are doing</h2>
        {reviewed === 0 ? (
          <p className="mt-3 text-muted">No drafts have been reviewed in this period.</p>
        ) : (
          <>
            <p className="mt-3 max-w-[60ch] text-lg leading-7">
              Agents accepted <Strong>{percent(ai.acceptance_rate)}</Strong> of {reviewed} reviewed drafts:{" "}
              <Strong>{percent(ai.approved_as_is_rate)}</Strong> as written and{" "}
              <Strong>{percent(ai.acceptance_rate !== null && ai.approved_as_is_rate !== null ? ai.acceptance_rate - ai.approved_as_is_rate : null)}</Strong>{" "}
              after editing.
            </p>

            <div
              role="img"
              aria-label={`${approved} approved as written, ${edited} edited, ${rejected} rejected`}
              className="mt-5 flex h-8 overflow-hidden rounded border border-rule-strong"
            >
              <div style={{ width: `${share(approved)}%` }} className="bg-pencil" />
              <div
                style={{
                  width: `${share(edited)}%`,
                  backgroundImage: "repeating-linear-gradient(135deg, #2742d1 0 2px, #e4e8fa 2px 7px)",
                }}
              />
              <div style={{ width: `${share(rejected)}%` }} className="bg-proof" />
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-[2px] bg-pencil" aria-hidden="true" />
                Approved as written <b className="tabular-nums">{approved}</b>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="size-3 rounded-[2px] border border-pencil"
                  style={{ backgroundImage: "repeating-linear-gradient(135deg, #2742d1 0 1px, #e4e8fa 1px 4px)" }}
                  aria-hidden="true"
                />
                Edited then sent <b className="tabular-nums">{edited}</b>
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 rounded-[2px] bg-proof" aria-hidden="true" />
                Rejected <b className="tabular-nums">{rejected}</b>
              </li>
            </ul>
          </>
        )}

        <dl className="mt-6 grid max-w-3xl gap-x-8 gap-y-3 border-t border-rule pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Average change when edited</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">{percent(ai.avg_edit_ratio)}</dd>
          </div>
          <div>
            <dt className="text-muted">Average time to draft</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">
              {ai.avg_latency_ms === null ? "no data" : `${(ai.avg_latency_ms / 1000).toFixed(1)} s`}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Drafts with no source found</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums">{ai.ungrounded_drafts}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="volume">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="volume" className="text-xl font-bold tracking-tight">Ticket volume</h2>
          <ul className="flex gap-5 text-sm text-muted">
            <li className="flex items-center gap-2">
              <svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke="#181816" strokeWidth="2" /></svg>
              Created
            </li>
            <li className="flex items-center gap-2">
              <svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke="#2742d1" strokeWidth="2" strokeDasharray="5 3" /></svg>
              Resolved
            </li>
          </ul>
        </div>
        <div className="panel mt-3 h-64 p-3 pr-5 md:h-72">
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid vertical={false} stroke="#d4d3ca" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: "#a7a69b" }}
                tick={{ fontSize: 12, fill: "#5a5a54" }}
                tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                minTickGap={28}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5a5a54" }} />
              <Tooltip
                contentStyle={{ background: "#fbfbf9", border: "1px solid #d4d3ca", borderRadius: 4, fontSize: 13, boxShadow: "none" }}
                labelFormatter={(d) => new Date(String(d)).toLocaleDateString(undefined, { day: "numeric", month: "long" })}
              />
              <Line type="monotone" dataKey="created" name="Created" stroke="#181816" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#2742d1" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-labelledby="mix" className="grid gap-8 md:grid-cols-3">
        <h2 id="mix" className="sr-only">Breakdowns</h2>
        <Ranked title="By category" data={summary.by_category} />
        <Ranked title="By priority" data={summary.by_priority} />
        <Ranked title="By mood" data={summary.by_sentiment} />
      </section>

      <section aria-labelledby="agents">
        <h2 id="agents" className="text-xl font-bold tracking-tight">Open tickets by agent</h2>
        {summary.open_by_agent.length === 0 ? (
          <p className="mt-3 text-muted">No open tickets are assigned to an agent.</p>
        ) : (
          <ul className="mt-3 max-w-md divide-y divide-rule border-y border-rule">
            {summary.open_by_agent.map((a) => (
              <li key={a.agent} className="flex items-center justify-between py-2.5">
                <span>{a.agent}</span>
                <b className="tabular-nums">{a.open}</b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Ranked({ title, data }: { title: string; data: Record<string, number> }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-muted">No data.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map(([name, count]) => (
            <li key={name}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{label(name)}</span>
                <b className="tabular-nums">{count}</b>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-rule">
                <div className="h-full rounded-full bg-ink" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
