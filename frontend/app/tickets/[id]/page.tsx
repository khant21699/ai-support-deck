"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api, post } from "@/lib/api";
import type { Draft, Ticket } from "@/lib/types";

// While the AI works we check the ticket again and again. Each check waits a bit longer than the
// last one (2s, 3s, 4.5s ... up to 10s), and we give up after 2 minutes.
const POLL_FIRST_DELAY_MS = 2000;
const POLL_MAX_DELAY_MS = 10000;
const POLL_GIVE_UP_MS = 2 * 60 * 1000;

export default function TicketPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gaveUp, setGaveUp] = useState(false); // true when polling stopped because it took too long
  const [pollRound, setPollRound] = useState(0); // add 1 to start polling again (after Regenerate)

  const load = useCallback(async () => {
    try {
      setTicket(await api<Ticket>(`/tickets/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Keep checking while the AI is still working on triage and the draft.
  useEffect(() => {
    if (ticket?.ai_status !== "pending") return;

    setGaveUp(false);
    const startedAt = Date.now();
    let delay = POLL_FIRST_DELAY_MS;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false; // set when this effect is cleaned up, so a late response does not start a new timer

    function scheduleNextCheck() {
      if (stopped) return;
      if (Date.now() - startedAt > POLL_GIVE_UP_MS) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(async () => {
        await load();
        delay = Math.min(delay * 1.5, POLL_MAX_DELAY_MS);
        scheduleNextCheck();
      }, delay);
    }

    scheduleNextCheck();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [ticket?.ai_status, pollRound, load]);

  const pending: Draft | undefined = ticket?.drafts.find((d) => d.status === "pending");

  // Seed the editor once per draft.
  useEffect(() => { if (pending) setText(pending.body); }, [pending?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ticket) return <p className="text-slate-500">{error ?? "Loading…"}</p>;

  const unchanged = pending ? text.trim() === pending.body.trim() : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <p className="text-sm text-slate-500">{ticket.customer_email} · {new Date(ticket.created_at).toLocaleString()}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge value={ticket.status} /><Badge value={ticket.category} /><Badge value={ticket.priority} /><Badge value={ticket.sentiment} />
          </div>
        </div>

        <div className="space-y-3">
          {ticket.messages.map((m) => (
            <div key={m.id} className={`card ${m.author_type === "agent" ? "border-blue-200 bg-blue-50" : ""}`}>
              <div className="mb-1 text-xs font-medium uppercase text-slate-500">{m.author_type}</div>
              <p className="whitespace-pre-wrap text-sm">{m.body}</p>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      <aside className="space-y-3">
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">AI draft</h2>
            <button className="btn-ghost" disabled={busy || (ticket.ai_status === "pending" && !gaveUp)}
              onClick={() => act(async () => {
                await post(`/tickets/${id}/draft/regenerate`);
                setPollRound((n) => n + 1); // start checking again, even if the status was already "pending"
              })}>Regenerate</button>
          </div>

          {ticket.ai_status === "pending" && !gaveUp && <p className="text-sm text-slate-500">Triaging and drafting…</p>}
          {ticket.ai_status === "pending" && gaveUp && (
            <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">
              This is taking longer than usual. The AI model may be slow, rate-limited, or the API may have restarted.
              Click Regenerate to try again.
            </p>
          )}
          {ticket.ai_status === "failed" && <p className="text-sm text-red-600">AI processing failed. Reply manually or regenerate.</p>}

          {pending ? (
            <>
              {!pending.grounded && (
                <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">
                  No confident answer found in the knowledge base. Review carefully or reply manually.
                </p>
              )}
              <textarea className="input min-h-[180px]" value={text} onChange={(e) => setText(e.target.value)} />
              {pending.citations.length > 0 && (
                <ul className="space-y-1 text-xs text-slate-600">
                  {pending.citations.map((c) => (
                    <li key={c.marker}><b>[{c.marker}]</b> {c.article_title}: {c.snippet}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                {unchanged ? (
                  <button className="btn-primary" disabled={busy} onClick={() => act(() => post(`/drafts/${pending.id}/approve`))}>
                    Approve and send
                  </button>
                ) : (
                  <button className="btn-primary" disabled={busy || !text.trim()}
                    onClick={() => act(() => post(`/drafts/${pending.id}/edit`, { final_body: text }))}>
                    Send edited reply
                  </button>
                )}
                <button className="btn-danger" disabled={busy} onClick={() => act(() => post(`/drafts/${pending.id}/reject`))}>
                  Reject
                </button>
              </div>
              <p className="text-xs text-slate-400">Nothing is sent until you approve. {pending.model && `Model: ${pending.model}`}</p>
            </>
          ) : (
            ticket.ai_status === "done" && <p className="text-sm text-slate-500">No pending draft.</p>
          )}
        </div>

        {ticket.status !== "resolved" && !pending && (
          <ManualReply onSend={(body) => act(() => post(`/tickets/${id}/messages`, { body }))} busy={busy} />
        )}
      </aside>
    </div>
  );
}

function ManualReply({ onSend, busy }: { onSend: (body: string) => void; busy: boolean }) {
  const [body, setBody] = useState("");
  return (
    <div className="card space-y-2">
      <h2 className="font-semibold">Manual reply</h2>
      <textarea className="input min-h-[100px]" value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="btn-primary" disabled={busy || !body.trim()} onClick={() => { onSend(body); setBody(""); }}>Send</button>
    </div>
  );
}
