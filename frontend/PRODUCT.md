# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, with very different needs.

- **Support agents (primary).** People on a small support team who work the inbox on a laptop for hours at a time: read a ticket, check the AI's suggested reply and the knowledge base text it cites, then approve, edit, or reject it. They are judging quality quickly and repeatedly, so scanning speed and trust in what the AI did matter most.
- **Customers.** Anyone with a problem who fills in the public ticket form, often on a phone and often annoyed. They see one form and a confirmation, nothing else.
- **Reviewers of the project (confirmed secondary).** This is a portfolio piece that must also work as a real tool. Recruiters and engineers will click through it as a demo using seeded data, so the whole flow has to read clearly without explanation.

## Product Purpose

A support desk where AI helps but a human always decides. Tickets are triaged automatically (category, priority, sentiment) and answered with a draft reply written only from the team's own knowledge base, with citations. An agent approves, edits, or rejects every draft, and nothing is sent without that click. A dashboard shows ticket volume, response times, and how often agents accept the AI's drafts. Success is agents resolving tickets faster while trusting the AI because they can always see where an answer came from.

## Positioning

AI drafts that are accountable: every reply shows the knowledge base passages it came from, says plainly when it found no answer instead of guessing, and the dashboard measures how often agents accept it. A neighboring helpdesk with an "AI reply" button cannot show this evidence trail and acceptance record for each draft.

## Operating Context

- Agents work in a long-running inbox, usually at a desk. A ticket page holds the customer's message thread, the AI labels, and the draft review panel side by side.
- The AI step is asynchronous: a new ticket briefly shows "triaging and drafting", then a draft appears. A model can be slow or rate-limited, so waiting, failed and "no answer found" states are normal and must be handled honestly.
- Admins also maintain the knowledge base (articles that the AI cites).
- The backend is a separate FastAPI service; the frontend talks to it over REST with a login cookie.

## Capabilities and Constraints

- Pages today: home, public ticket form (`/submit`), agent login, inbox with filters and paging, ticket detail with draft review, knowledge base (read-only for agents), dashboard with charts, and Team (admins only). No marketing site beyond the home page.
- Roles: anonymous visitor (can only submit a ticket), `agent` (works tickets, reviews drafts, reads the knowledge base) and `admin` (everything an agent does, plus adding agents and other admins, removing agents (never admins) on the Team page, and editing the knowledge base). Agents never see the Team item or the knowledge base editor.
- Existing stack to keep: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS 3, Recharts. The frontend has no backend of its own and must keep working with the current API shapes (`lib/types.ts`).
- Real states that exist and need good design: AI pending, AI failed, draft with no knowledge base answer, draft with citations, polling gave up, empty inbox, API errors, loading.
- Ticket categories: billing, technical, account, shipping, feature request, other. Priorities: low, normal, high, urgent. Sentiment: positive, neutral, negative. Ticket statuses: new, open, resolved.

## Brand Commitments

None are binding. The working name "Support Desk" is open to change: the design may propose a stronger name and wordmark, and the user approves it before it ships. No logo or brand assets exist yet.

## Evidence on Hand

- Seeded demo data only: two demo users, five knowledge base articles, and 200 fake tickets spread over 60 days. This is real enough to fill the inbox and dashboard.
- There are no real customers, testimonials, case studies, or benchmarks. Do not invent any, and do not show fake claims such as customer counts or uptime on any page.

## Product Principles

1. **Human decides, visibly.** The agent's approval is the center of the product; the interface should never imply the AI acts alone.
2. **Show the evidence.** Citations, "no answer found", and model-failure states are first-class content, not footnotes.
3. **Honest about waiting and failure.** AI is slow and sometimes fails; say what is happening and what the agent can do next.
4. **Built for repeated use.** Dense, scannable, predictable for someone who sits in the inbox all day.
5. **Credible at first glance.** It is also a portfolio piece, so the first minute of clicking around should feel like a finished product.

## Accessibility & Inclusion

Meet WCAG AA (contrast, keyboard use, visible focus, labels on every control, no meaning conveyed by color alone). The whole app, including the inbox, ticket page and dashboard, must be fully usable on a phone, not just the public form.
