"use client";

import { useCallback, useEffect, useState } from "react";
import { api, post } from "@/lib/api";
import type { KbArticle } from "@/lib/types";

export default function KbPage() {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [editing, setEditing] = useState<{ id?: number; title: string; body: string }>({ title: "", body: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<KbArticle[]>("/kb/articles").then(setArticles).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { id, ...payload } = editing;
      if (id) await api(`/kb/articles/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await post("/kb/articles", payload);
      setEditing({ title: "", body: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed (admin role required)");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this article?")) return;
    try {
      await api(`/kb/articles/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Knowledge base</h1>
        {articles.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium">{a.title}</h2>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setEditing({ id: a.id, title: a.title, body: a.body })}>Edit</button>
                <button className="btn-danger" onClick={() => remove(a.id)}>Delete</button>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
          </div>
        ))}
        {articles.length === 0 && <p className="text-sm text-slate-500">No articles yet.</p>}
      </section>

      <form onSubmit={save} className="card h-fit space-y-3">
        <h2 className="font-semibold">{editing.id ? "Edit article" : "New article"}</h2>
        <input className="input" placeholder="Title" required minLength={3} value={editing.title}
          onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
        <textarea className="input min-h-[200px]" placeholder="Article body (blank lines separate paragraphs)" required minLength={10}
          value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>{busy ? "Saving and embedding…" : "Save"}</button>
          {editing.id && <button type="button" className="btn-ghost" onClick={() => setEditing({ title: "", body: "" })}>Cancel</button>}
        </div>
        <p className="text-xs text-slate-400">Saving re-chunks and re-embeds the article. Only admins can edit.</p>
      </form>
    </div>
  );
}
