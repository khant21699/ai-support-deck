"use client";

import { useState } from "react";
import { post } from "@/lib/api";

export default function SubmitPage() {
  const [form, setForm] = useState({ customer_email: "", subject: "", body: "" });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      await post("/tickets", form);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="text-xl font-semibold">Thanks, we got your request</h1>
        <p className="mt-2 text-slate-600">A member of our team will reply by email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Contact support</h1>
      <div>
        <label className="label" htmlFor="email">Your email</label>
        <input id="email" className="input" type="email" required value={form.customer_email}
          onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="subject">Subject</label>
        <input id="subject" className="input" required minLength={3} maxLength={300} value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="body">How can we help?</label>
        <textarea id="body" className="input min-h-[140px]" required minLength={10} maxLength={5000} value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send"}</button>
    </form>
  );
}
