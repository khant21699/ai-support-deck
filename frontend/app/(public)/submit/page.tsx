"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/Icons";
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
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="mx-auto max-w-xl py-6 md:py-12">
        <div className="panel p-6 md:p-8">
          <span className="flex size-10 items-center justify-center rounded-full bg-done-wash text-done">
            <CheckIcon />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">We&rsquo;ve got your request</h1>
          <p className="mt-2 text-muted">A member of our team will read your message and reply.</p>
          <button
            className="btn-secondary mt-6"
            onClick={() => {
              setForm({ customer_email: "", subject: "", body: "" });
              setState("idle");
            }}
          >
            Send another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-2 md:py-8">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Tell us what&rsquo;s going on</h1>
      <p className="mt-3 text-lg leading-7 text-muted">
        A person reads every request. Say what you expected and what happened instead.
      </p>

      <form onSubmit={onSubmit} className="panel mt-8 space-y-5 p-5 md:p-7">
        <div>
          <label className="label" htmlFor="email">
            Your email
          </label>
          <input
            id="email"
            className="field"
            type="email"
            autoComplete="email"
            required
            value={form.customer_email}
            onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="subject">
            Subject
          </label>
          <input
            id="subject"
            className="field"
            required
            minLength={3}
            maxLength={300}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="body">
            Message
          </label>
          <textarea
            id="body"
            className="field min-h-[160px] font-serif text-[17px] leading-relaxed max-md:text-[17px]"
            required
            minLength={10}
            maxLength={5000}
            aria-describedby="body-hint"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <p id="body-hint" className="hint">
            At least 10 characters. {form.body.length} / 5000
          </p>
        </div>
        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}
        <button className="btn-primary w-full md:w-auto md:px-6" disabled={state === "busy"}>
          {state === "busy" ? "Sending…" : "Send request"}
        </button>
      </form>
    </div>
  );
}
