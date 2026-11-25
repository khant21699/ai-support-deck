"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plain, PriorityMark, StatusChip } from "@/components/Badge";
import { AlertIcon, ArrowLeftIcon, CheckIcon, StrikeIcon, SwapIcon } from "@/components/Icons";
import { api, post } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { Draft, Ticket } from "@/lib/types";

// While the AI works we check the ticket again and again. Each check waits a bit longer than the
// last one (2s, 3s, 4.5s ... up to 10s), and we give up after 2 minutes.
const POLL_FIRST_DELAY_MS = 2000;
const POLL_MAX_DELAY_MS = 10000;
const POLL_GIVE_UP_MS = 2 * 60 * 1000;

/** Show citation markers like [E1] as small superscript footnote numbers. */
function withMarkers(text: string) {
  return text.split(/(\[E\d+\])/g).map((part, i) => {
    const marker = part.match(/^\[E(\d+)\]$/);
    return marker ? (
      <sup key={i} className="ml-0.5 text-[11px] font-bold text-pencil">
        {marker[1]}
      </sup>
    ) : (
      part
    );
  });
}

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

  if (!ticket) {
    return error ? (
      <p role="alert" className="alert-error">{error}</p>
    ) : (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading ticket</span>
        <div className="h-8 w-2/3 rounded bg-rule motion-safe:animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-rule/70 motion-safe:animate-pulse" />
      </div>
    );
  }

  const unchanged = pending ? text.trim() === pending.body.trim() : false;
  const waiting = ticket.ai_status === "pending" && !gaveUp;
  const triaged = Boolean(ticket.priority || ticket.category || ticket.sentiment);

  return (
    <div>
      <Link href="/inbox" className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeftIcon size={16} />
        Inbox
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_344px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-label="Conversation">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{ticket.subject}</h1>
          <p className="mt-1.5 text-muted">
            {ticket.customer_email} &middot; {dateTime(ticket.created_at)}
          </p>

          <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Status</dt>
              <dd><StatusChip value={ticket.status} /></dd>
            </div>
            {triaged ? (
              <>
                <div className="flex items-center gap-2">
                  <dt className="text-muted">Priority</dt>
                  <dd><PriorityMark value={ticket.priority} /></dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-muted">Category</dt>
                  <dd><Plain value={ticket.category} /></dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-muted">Mood</dt>
                  <dd><Plain value={ticket.sentiment} tone="negative" /></dd>
                </div>
              </>
            ) : (
              <div className="text-muted">{ticket.ai_status === "failed" ? "Not triaged" : "Awaiting triage"}</div>
            )}
          </dl>

          <ol className="mt-6 divide-y divide-rule border-y border-rule">
            {ticket.messages.map((m) => (
              <li key={m.id} className={`px-4 py-5 ${m.author_type === "agent" ? "bg-pencil-wash/40" : ""}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-semibold">{m.author_type === "agent" ? "Agent reply" : "Customer"}</p>
                  <time dateTime={m.created_at} className="text-[13px] text-muted">{dateTime(m.created_at)}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap font-serif text-[17px] leading-relaxed">{withMarkers(m.body)}</p>
              </li>
            ))}
          </ol>
          {error && (
            <p role="alert" className="alert-error mt-4">{error}</p>
          )}
        </section>

        <aside aria-label="AI draft" className="space-y-4 lg:sticky lg:top-6">
          <div key={pending?.id ?? "no-draft"} className="panel shadow-slip motion-safe:animate-land">
            <div className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3">
              <div>
                <h2 className="font-semibold">AI draft</h2>
                <p className="text-[13px] text-muted">
                  {pending ? "A proof for your sign-off" : ticket.status === "resolved" ? "This ticket is resolved" : "No draft waiting"}
                </p>
              </div>
              <button
                className="btn-quiet"
                disabled={busy || waiting}
                onClick={() =>
                  act(async () => {
                    await post(`/tickets/${id}/draft/regenerate`);
                    setPollRound((n) => n + 1); // start checking again, even if the status was already "pending"
                  })
                }
              >
                <SwapIcon size={15} />
                Regenerate
              </button>
            </div>

            <div className="space-y-4 p-4 empty:hidden" aria-live="polite">
              {waiting && (
                <div>
                  <p className="text-sm font-semibold">Triaging and drafting&hellip;</p>
                  <div className="mt-3 space-y-2" aria-hidden="true">
                    <div className="h-3 w-full rounded bg-rule motion-safe:animate-pulse" />
                    <div className="h-3 w-[92%] rounded bg-rule motion-safe:animate-pulse" />
                    <div className="h-3 w-[64%] rounded bg-rule motion-safe:animate-pulse" />
                  </div>
                </div>
              )}

              {ticket.ai_status === "pending" && gaveUp && (
                <p className="alert-caution">
                  This is taking longer than usual. The AI model may be slow or rate-limited, or the API may have restarted.
                  Use Regenerate to try again.
                </p>
              )}

              {ticket.ai_status === "failed" && (
                <p className="alert-error flex items-start gap-2">
                  <AlertIcon size={16} className="mt-0.5 shrink-0" />
                  <span>The AI step failed. Write a reply yourself, or try Regenerate.</span>
                </p>
              )}

              {pending && (
                <>
                  {!pending.grounded && (
                    <p className="alert-caution flex items-start gap-2">
                      <AlertIcon size={16} className="mt-0.5 shrink-0" />
                      <span>
                        <b>No answer found in the knowledge base.</b> This is a holding reply. Edit it or write your own.
                      </span>
                    </p>
                  )}

                  <div>
                    <label htmlFor="draft" className="sr-only">Draft reply</label>
                    <textarea
                      id="draft"
                      className="field min-h-[200px] font-serif text-[17px] leading-relaxed max-md:text-[17px]"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>

                  {pending.citations.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-semibold">Sources</h3>
                      <ol className="mt-2 space-y-2 border-t border-rule pt-3">
                        {pending.citations.map((c) => (
                          <li key={c.marker} className="grid grid-cols-[1.75rem_1fr] gap-x-1 text-[13px] leading-5 text-muted">
                            <span className="font-bold text-pencil">{c.marker}</span>
                            <span>
                              <span className="font-semibold text-ink">{c.article_title}:</span> {c.snippet}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              )}
            </div>

            {pending && (
              <div className="rounded-b-md border-t border-rule bg-paper/60 px-4 py-3">
                <p className="text-[13px] text-muted">
                  {unchanged ? "Sends the AI draft exactly as written." : "Sends your edited version."} Nothing is sent until you choose.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {unchanged ? (
                    <button className="btn-primary" disabled={busy} onClick={() => act(() => post(`/drafts/${pending.id}/approve`))}>
                      <CheckIcon size={16} />
                      Approve and send
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      disabled={busy || !text.trim()}
                      onClick={() => act(() => post(`/drafts/${pending.id}/edit`, { final_body: text }))}
                    >
                      <CheckIcon size={16} />
                      Send edited reply
                    </button>
                  )}
                  <button className="btn-reject" disabled={busy} onClick={() => act(() => post(`/drafts/${pending.id}/reject`))}>
                    <StrikeIcon size={16} />
                    Reject draft
                  </button>
                </div>
              </div>
            )}
          </div>

          {ticket.status !== "resolved" && !pending && (
            <ManualReply onSend={(body) => act(() => post(`/tickets/${id}/messages`, { body }))} busy={busy} />
          )}
        </aside>
      </div>
    </div>
  );
}

function ManualReply({ onSend, busy }: { onSend: (body: string) => void; busy: boolean }) {
  const [body, setBody] = useState("");
  return (
    <div className="panel p-4">
      <label htmlFor="manual" className="font-semibold">Reply yourself</label>
      <textarea
        id="manual"
        className="field mt-2 min-h-[120px] font-serif text-[17px] leading-relaxed max-md:text-[17px]"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        className="btn-primary mt-3"
        disabled={busy || !body.trim()}
        onClick={() => {
          onSend(body);
          setBody("");
        }}
      >
        Send reply
      </button>
    </div>
  );
}
