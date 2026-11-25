"use client";

import { useCallback, useEffect, useState } from "react";
import { CaretIcon } from "@/components/Icons";
import { api, post } from "@/lib/api";
import { shortDate } from "@/lib/format";
import type { KbArticle, User } from "@/lib/types";

const EMPTY = { title: "", body: "" };

export default function KbPage() {
  const [articles, setArticles] = useState<KbArticle[] | null>(null);
  const [editing, setEditing] = useState<{ id?: number; title: string; body: string }>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // agents can read the knowledge base; only admins edit it

  const load = useCallback(
    () =>
      api<KbArticle[]>("/kb/articles")
        .then(setArticles)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<User>("/auth/me").then((u) => setIsAdmin(u.role === "admin")).catch(() => setIsAdmin(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { id, ...payload } = editing;
      if (id) await api(`/kb/articles/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await post("/kb/articles", payload);
      setEditing(EMPTY);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Only admins can edit the knowledge base.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(article: KbArticle) {
    if (!confirm(`Delete "${article.title}"? The AI will stop citing it.`)) return;
    try {
      await api(`/kb/articles/${article.id}`, { method: "DELETE" });
      if (editing.id === article.id) setEditing(EMPTY);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the article.");
    }
  }

  function startEditing(article: KbArticle) {
    setEditing({ id: article.id, title: article.title, body: article.body });
    document.getElementById("kb-form")?.scrollIntoView({ block: "start" });
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Knowledge base</h1>
      <p className="mt-2 max-w-[60ch] text-muted">
        {isAdmin
          ? "The articles the AI cites when it drafts a reply. Saving an article splits it up and indexes it for search."
          : "The articles the AI cites when it drafts a reply. Only admins can add or edit them."}
      </p>

      <div className={`mt-6 grid gap-8 ${isAdmin ? "xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start" : "max-w-3xl"}`}>
        <section aria-label="Articles">
          {articles === null ? (
            <div className="space-y-3" role="status">
              <span className="sr-only">Loading articles</span>
              {[0, 1, 2].map((i) => (
                <div key={i} className="panel p-4">
                  <div className="h-4 w-1/2 rounded bg-rule motion-safe:animate-pulse" />
                  <div className="mt-3 h-3 w-full rounded bg-rule/70 motion-safe:animate-pulse" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="panel px-5 py-12 text-center">
              <p className="font-semibold">No articles yet</p>
              <p className="mt-1 text-muted">{isAdmin ? "Add the first article so the AI has something to cite." : "An admin can add the first article."}</p>
            </div>
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {articles.map((a) => (
                <li key={a.id} className={`px-1 py-4 sm:px-3 ${editing.id === a.id ? "bg-pencil-wash/50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold">{a.title}</h2>
                      <p className="text-[13px] text-muted">Updated {shortDate(a.updated_at)}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex shrink-0 gap-1">
                        <button className="btn-quiet" onClick={() => startEditing(a)} aria-label={`Edit ${a.title}`}>
                          <CaretIcon size={15} />
                          Edit
                        </button>
                        <button className="btn-quiet hover:text-proof" onClick={() => remove(a)} aria-label={`Delete ${a.title}`}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-muted">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isAdmin && (
        <form id="kb-form" onSubmit={save} className="panel space-y-4 p-5 xl:sticky xl:top-6">
          <h2 className="text-lg font-bold">{editing.id ? "Edit article" : "New article"}</h2>
          <div>
            <label className="label" htmlFor="kb-title">Title</label>
            <input
              id="kb-title"
              className="field"
              required
              minLength={3}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="kb-body">Article</label>
            <textarea
              id="kb-body"
              className="field min-h-[220px] font-serif text-[17px] leading-relaxed max-md:text-[17px]"
              required
              minLength={10}
              aria-describedby="kb-hint"
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            />
            <p id="kb-hint" className="hint">Leave a blank line between paragraphs. Short, specific articles are cited best.</p>
          </div>
          {error && (
            <p role="alert" className="alert-error">{error}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary" disabled={busy}>{busy ? "Saving and indexing…" : "Save article"}</button>
            {editing.id && (
              <button type="button" className="btn-secondary" onClick={() => { setEditing(EMPTY); setError(null); }}>
                Cancel
              </button>
            )}
          </div>
          <p className="text-[13px] text-muted">Only admins can add, edit or delete articles.</p>
        </form>
        )}
      </div>
    </div>
  );
}
