"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon } from "@/components/Icons";
import { ApiError, api, post } from "@/lib/api";
import { label, shortDate } from "@/lib/format";
import type { UserListItem } from "@/lib/types";

// Easy-to-read characters only: no 0/O or 1/l/I.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ROLES = [
  { value: "agent", name: "Agent", text: "Works tickets and reviews AI drafts. Can read the knowledge base." },
  { value: "admin", name: "Admin", text: "Also adds and removes agents, adds admins, and edits the knowledge base." },
] as const;

function randomPassword(length = 14) {
  const limit = 256 - (256 % ALPHABET.length); // skip values that would favour the first characters
  const chars: string[] = [];
  while (chars.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && chars.length < length) chars.push(ALPHABET[byte % ALPHABET.length]);
    }
  }
  return chars.join("");
}

export default function TeamPage() {
  const [team, setTeam] = useState<UserListItem[] | null>(null);
  const [notAdmin, setNotAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ email: string; password: string; role: "agent" | "admin" }>({ email: "", password: "", role: "agent" });
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<{ email: string; password: string; role: string } | null>(null);
  const [removed, setRemoved] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null); // the agent whose Remove button was clicked

  const load = useCallback(
    () =>
      api<UserListItem[]>("/users")
        .then(setTeam)
        .catch((e) => {
          if (e instanceof ApiError && e.status === 403) setNotAdmin(true);
          else setError(e.message);
        }),
    [],
  );
  useEffect(() => { load(); }, [load]);

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdded(null);
    setRemoved(null);
    if (form.password.length < 8) {
      setError("The password needs at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await post("/users", form);
      setAdded(form);
      setForm({ email: "", password: "", role: form.role });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this person.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAgent(person: UserListItem) {
    setError(null);
    setAdded(null);
    setRemoved(null);
    try {
      await api(`/users/${person.id}`, { method: "DELETE" });
      setConfirmingId(null);
      setRemoved(person.email);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this agent.");
    }
  }

  if (notAdmin) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="panel mt-6 max-w-xl px-5 py-6">
          <span className="font-semibold">Only admins can manage the team.</span>
          <span className="mt-1 block text-muted">Ask an admin if you need an account changed.</span>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Team</h1>
      <p className="mt-2 max-w-[60ch] text-muted">
        Agents work the inbox and review AI drafts. Admins can also manage the team and edit the knowledge base.
      </p>

      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <section aria-label="People with an account">
          {removed && (
            <p role="status" className="mb-3 text-sm text-muted">
              Removed {removed}. They are signed out, and their tickets are now unassigned.
            </p>
          )}
          {team === null && !error ? (
            <div role="status" className="divide-y divide-rule border-y border-rule">
              <span className="sr-only">Loading team</span>
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-3 py-4">
                  <div className="h-4 w-1/2 rounded bg-rule motion-safe:animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {team?.map((person) => (
                <li key={person.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1 py-3.5 sm:px-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{person.email}</p>
                    <p className="text-[13px] text-muted">Added {shortDate(person.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {person.role === "agent" && confirmingId === person.id ? (
                      <>
                        <span className="text-sm text-muted">Remove this agent?</span>
                        <button className="btn-reject" onClick={() => removeAgent(person)}>Remove</button>
                        <button className="btn-secondary" onClick={() => setConfirmingId(null)}>Keep</button>
                      </>
                    ) : (
                      <>
                        {person.role === "agent" && (
                          <button
                            className="btn-quiet hover:text-proof"
                            onClick={() => setConfirmingId(person.id)}
                            aria-label={`Remove ${person.email}`}
                          >
                            Remove
                          </button>
                        )}
                        <span
                          className={`rounded px-2 py-0.5 text-[12px] font-bold ${
                            person.role === "admin" ? "bg-ink text-white" : "bg-pencil-wash text-pencil-dark"
                          }`}
                        >
                          {label(person.role)}
                        </span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={addPerson} className="panel space-y-4 p-5 xl:sticky xl:top-6">
          <h2 className="text-lg font-bold">Add a person</h2>
          <div>
            <label className="label" htmlFor="person-email">Email</label>
            <input
              id="person-email"
              className="field"
              type="email"
              required
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="person-password">Password</label>
            <div className="flex gap-2">
              <input
                id="person-password"
                className="field"
                required
                minLength={8}
                maxLength={72}
                autoComplete="off"
                spellCheck={false}
                aria-describedby="person-password-hint"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" className="btn-secondary shrink-0" onClick={() => setForm({ ...form, password: randomPassword() })}>
                Generate
              </button>
            </div>
            <p id="person-password-hint" className="hint">
              At least 8 characters. They can&rsquo;t change it themselves yet, so pick one they can keep.
            </p>
          </div>

          <fieldset>
            <legend className="label">Role</legend>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2.5 ${
                    form.role === r.value ? "border-pencil bg-pencil-wash/50" : "border-rule-strong bg-slip"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={() => setForm({ ...form, role: r.value })}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold">{r.name}</span>
                    <span className="block text-[13px] text-muted">{r.text}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="alert-error">{error}</p>
          )}
          {added && (
            <div role="status" className="rounded border border-done/30 bg-done-wash px-3 py-3 text-sm text-done">
              <p className="flex items-center gap-2 font-semibold">
                <CheckIcon size={16} />
                Added {added.email} as {added.role === "admin" ? "an admin" : "an agent"}
              </p>
              <p className="mt-1">
                Give them the email and this password: <b className="select-all break-all">{added.password}</b>. It isn&rsquo;t shown again.
              </p>
            </div>
          )}

          <button className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add person"}</button>
          <p className="text-[13px] text-muted">Admins can&rsquo;t be removed from here, so add them with care.</p>
        </form>
      </div>
    </div>
  );
}
