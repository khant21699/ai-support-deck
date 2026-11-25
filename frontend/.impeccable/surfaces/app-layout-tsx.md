---
version: 1
slug: "app-layout-tsx"
primary_target: "app/layout.tsx"
related_targets: ["app/page.tsx","app/(public)/submit/page.tsx","app/login/page.tsx","app/inbox/page.tsx","app/tickets/[id]/page.tsx","app/kb/page.tsx","app/dashboard/page.tsx"]
---

# Surface brief: the whole app

Scope: every screen of the frontend: home, public ticket form, login, inbox, ticket page, knowledge base, dashboard. Mode: Operate. Home and the ticket form are the only public screens.

Audience and job: agents work the inbox for hours and must judge an AI draft quickly; customers fill one form, often on a phone; reviewers click through the demo. Fully responsive, WCAG AA.

Unresolved: the product name is open (user approves any rename); "Support Desk" stays until then.

## Direction contract

THESIS: Every AI draft is a proof on an editor's desk. The app is a copy desk where a person reads, marks up and signs off AI-written copy with its sources in view. It refuses the category default: a white sidebar of soft cards with a sparkle "AI" button.

OWN-WORLD: Cool newsprint ground (#F0F0EB), whiter proof slips (#FBFBF9), ink-black type, one editor's blue-pencil accent (#2742D1), proof-red (#BF2F26) only for urgent, reject and errors. Schibsted Grotesk runs the interface; Source Serif 4 is reserved for words being edited (customer messages, AI drafts). Hairline rules instead of boxes, 3px corners, drawn proofreader's marks as the icon language, citations as numbered footnotes.

STORY: An agent sees in seconds what the customer wants and exactly which knowledge base passages the AI used, then signs off, edits or rejects with one clear decision. A reviewer understands within a minute that a human is always in control.

FIRST VIEWPORT: Home: headline "AI writes the draft. A person signs it off." on the left, a labelled synthetic proof specimen on the right (customer message, draft with footnote markers, sources, a sign-off bar). Agent screens: 232px left rail with wordmark and nav (bottom tab bar on phones); inbox is a dense ruled list with priority marks, subject, category, status and age under one toolbar; the ticket page puts the thread left and a sticky proof panel (draft, footnotes, sign-off) right. Signature motion: the draft slip lands once (6px rise and fade, 300ms ease-out) when it first appears.

FORM: The Copy Desk, candidate 1 of 7 on the grounded list (impeccable's pick), seed key 1519ff7a. Code-led build: no image generation here.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
