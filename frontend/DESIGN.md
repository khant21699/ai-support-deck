---
name: Support Desk
description: A copy desk where AI drafts the reply and a person signs it off, on newsprint with one blue editing pencil.
colors:
  paper: "#F0F0EB"
  slip: "#FBFBF9"
  ink: "#181816"
  muted: "#5A5A54"
  rule: "#D4D3CA"
  rule-strong: "#A7A69B"
  pencil: "#2742D1"
  pencil-dark: "#1B2FA0"
  pencil-wash: "#E4E8FA"
  proof: "#BF2F26"
  proof-wash: "#F8E4E1"
  caution: "#7A5200"
  caution-wash: "#F6EBCB"
  done: "#1E6B45"
  done-wash: "#DFEFE5"
typography:
  display:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1.03
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  copy:
    fontFamily: "Source Serif 4, ui-serif, Georgia, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  DEFAULT: "3px"
  md: "4px"
  lg: "6px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.pencil}"
    textColor: "#FFFFFF"
    rounded: "{rounded.DEFAULT}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.pencil-dark}"
  button-secondary:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    rounded: "{rounded.DEFAULT}"
    padding: "0 16px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.paper}"
  button-reject:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.proof}"
    rounded: "{rounded.DEFAULT}"
    padding: "0 16px"
    height: "36px"
  button-reject-hover:
    backgroundColor: "{colors.proof-wash}"
  field:
    backgroundColor: "{colors.slip}"
    textColor: "{colors.ink}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 12px"
  panel:
    backgroundColor: "{colors.slip}"
    rounded: "{rounded.md}"
  chip-status-new:
    backgroundColor: "{colors.pencil-wash}"
    textColor: "{colors.pencil-dark}"
    rounded: "{rounded.DEFAULT}"
    padding: "2px 8px"
  chip-status-resolved:
    backgroundColor: "{colors.done-wash}"
    textColor: "{colors.done}"
    rounded: "{rounded.DEFAULT}"
    padding: "2px 8px"
  alert-error:
    backgroundColor: "{colors.proof-wash}"
    textColor: "{colors.proof}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 12px"
  alert-caution:
    backgroundColor: "{colors.caution-wash}"
    textColor: "{colors.caution}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 12px"
---

# Design System: Support Desk

## Overview

**Creative North Star: "The Copy Desk"**

Every AI draft is a proof lying on an editor's desk. The interface is cool newsprint (#F0F0EB) with whiter proof slips on it, ink-black type, and a single blue editing pencil for actions and focus. Structure comes from hairline rules and tonal steps between paper and slip, not from boxes and shadows. It is a working tool for long sessions, in daylight: dense, quiet, legible.

The build is light only, by decision: the scene is a daylight office, so `color-scheme: light` is set and no dark theme exists. The serif face appears only where words are being edited or read as copy (customer messages, AI drafts, the knowledge base body field); everything else is the grotesk. Icons are authored SVG that borrow proofreader's marks.

**Key Characteristics:**
- Newsprint ground, proof-slip surfaces, hairline dividers.
- One accent (pencil blue) for every action and focus ring; red is reserved for urgency, rejection, errors.
- Two faces with a strict job split: grotesk for interface, serif for edited words.
- Flat at rest; one soft slip shadow on the draft and the home specimen only.
- Tight corners (3px default).
- Priority and status always carry a word, never color alone.

## Colors

A restrained newsprint palette: two warm-cool neutrals, ink, one blue accent, and three semantic inks each with a pale wash.

### Primary
- **Editor's Blue Pencil** (#2742D1): primary buttons, focus outline, text selection, caret and accent color of inputs, active nav icon, footnote markers, the wordmark tile. Hover is **Pencil Deep** (#1B2FA0). **Pencil Wash** (#E4E8FA) backs the "new" status chip.

### Secondary
- **Proof Red** (#BF2F26, wash #F8E4E1): urgent priority, reject button, error alerts, negative sentiment.
- **Caution Amber** (#7A5200, wash #F6EBCB): "no source found" and slow-AI notices.
- **Resolved Green** (#1E6B45, wash #DFEFE5): resolved status.

### Neutral
- **Newsprint Paper** (#F0F0EB): page ground; also hover fill of secondary buttons and the "open" chip.
- **Proof Slip** (#FBFBF9): panels, inputs, secondary buttons, mobile tab bar.
- **Ink** (#181816): body text, strong marks, skip link.
- **Pencil-Gray Muted** (#5A5A54): secondary text, placeholders, inactive nav (about 6:1 on paper).
- **Hairline Rule** (#D4D3CA): panel borders, row dividers, rail and header borders.
- **Strong Rule** (#A7A69B): input and secondary-button borders, unfilled priority ticks, scrollbar.

### Named Rules
**The One Pencil Rule.** Blue means "you can act here" or "you are here". It is the only chromatic accent for interaction.
**The Red Is a Verdict Rule.** Proof red appears only for urgent, reject and errors. Never for decoration or a second brand color.
**The Wash Pairing Rule.** Every semantic ink pairs with its own wash for backgrounds (e.g. red text on proof-wash); do not put a semantic ink on paper-colored chips outside this pairing.

## Typography

**Interface Font:** Schibsted Grotesk (variable 400-900, self-hosted woff2 in app/fonts, `font-display: swap`, fallback ui-sans-serif/system-ui)
**Copy Font:** Source Serif 4 (variable 200-900, self-hosted, fallback ui-serif/Georgia)

**Character:** A newsroom grotesk for the tool, a text serif for the words under edit. The switch of face tells the agent "this is customer or AI copy".

### Hierarchy
- **Display** (700, 2.6rem on phones, 3.75rem from md, 1.03, -0.025em): home headline only.
- **Headline** (700, 1.875rem, tracking-tight): page titles (Inbox, Knowledge base, Dashboard, Agent login); ticket subject is 1.5rem rising to 1.875rem at md; submit form title 1.875rem rising to 2.25rem at md.
- **Title** (700, 17px, tight): wordmark; other section headings use 1.125-1.25rem.
- **Body** (400, 15px, 24px line height): default text and `.field` input text. Fields go to 16px under md to stop iOS zoom.
- **Label** (600, 13px; 12px for chips, column heads and tab-bar names; 14px `text-sm` for buttons and nav): metadata, hints (13px muted), priority words. Case is sentence case; no uppercase, no letter-spaced labels.
- **Copy** (serif 400, 17px, relaxed 1.625; 16px in the specimen): customer messages, AI drafts, draft and KB textareas. Citation markers are 11px bold blue superscripts.

### Named Rules
**The Serif Is for Edited Words Rule.** Source Serif 4 is used only for message bodies, drafts and the textareas where copy is written. Never for headings, labels or buttons.
**The Tight Headings Rule.** Headings are bold with negative tracking and `text-balance`; body copy stays untracked. Prose measure is capped (46-60ch) where it runs long.

## Layout

Two shells. Public pages (home, submit, login) use a light top header and a centered 1180px column with 16px mobile and 40px desktop side padding. Agent pages use a working layout: from lg a 232px sticky left rail (wordmark, three nav items, signed-in user and log out) beside a main column capped at 1060px; below lg a top bar with wordmark and log out plus a fixed bottom tab bar of three 56px-minimum items with safe-area padding. Main reserves 112px at the bottom on small screens for the tab bar.

Responsive deviations from a single breakpoint story, as shipped: the ticket page becomes two columns at lg (thread plus a 344px sticky proof panel) and widens the panel to 400px at xl; the inbox switches from stacked rows to a five-column ruled table (120px, flexible, 140px, 100px, 96px) at xl; the knowledge-base page puts list and a sticky 420px editor side by side at xl; inbox filters are a 2-column grid on phones and a single row (search flexible, 150, 150, 170px) from lg; the home page splits headline and specimen at lg (flexible, 460px).

Spacing is Tailwind's 4px scale, used loosely: 8px inside controls, 12-16px panel padding (p-5 on the KB form), 32px gap between thread and panel, hairline-separated list rows with 16px horizontal padding. Density is high in lists, relaxed in reading.

## Elevation & Depth

Flat and tonal. Depth is paper under slip plus a 1px hairline border; there are no card stacks. The one shadow is a diffuse "slip" lift, used on the AI draft panel and the home specimen to say "this is the proof being looked at". Active rail item uses an inset 1px rule instead of a shadow.

### Shadow Vocabulary
- **Slip** (`box-shadow: 0 1px 0 rgb(24 24 22 / 0.06), 0 12px 24px -16px rgb(24 24 22 / 0.35)`): draft panel and specimen only.

### Named Rules
**The Flat-By-Default Rule.** Panels, rows and inputs carry a hairline, not a shadow. The slip shadow is reserved for the single proof under review on a screen.

## Shapes

Small, near-square corners: 3px default (buttons, fields, chips, alerts, rail items), 4px on panels, 6px at most (scrollbar thumb). Fully round pills are not used; chips are 3px rectangles. Priority ticks are 3px-wide bars with a 1px radius. The wordmark tile is a 4px-radius blue square with a white caret. Borders are 1px hairlines; the default is `rule`, inputs use `rule-strong`.

## Components

### Buttons
- **Shape:** 3px corners, 36px high (44px under md), 16px side padding, 14px semibold text, icon gap 8px.
- **Primary:** pencil fill, white text; hover pencil-deep. Used for the sign-off.
- **Secondary:** slip fill, 1px strong-rule border, ink text; hover fills with paper.
- **Reject:** slip fill, 1px proof border at 40%, proof text; hover proof-wash.
- **Quiet:** no fill, muted text, hover ink; for log out and low-weight actions; 44px minimum on phones.
- **Disabled:** 50% opacity, not-allowed cursor. **Focus:** global 2px pencil outline with 2px offset.

### Fields
- 3px corners, slip fill, 1px strong-rule border, 8px 12px padding, 15px text (16px and 44px minimum under md), muted placeholder. Focus swaps the border to pencil and adds the global outline. Selects hide the native arrow and use an inline 14px chevron at the right. Labels are 14px semibold above the field; hints are 13px muted. Textareas for copy use the serif.

### Panel (proof slip)
- Slip fill, 1px hairline border, 4px corners. The surface for anything an agent reads or decides on: inbox list, ticket draft, KB form. Draft panel adds the slip shadow and the land entrance.

### Priority Mark
- Four ascending ticks (heights 7 to 13px) plus the word. Filled ticks are ink, or proof red for urgent; unfilled are strong-rule at 60%. 13px semibold. Unset shows "Not set" in muted.

### Status Chip
- 3px rectangle, 12px semibold, 8px by 2px padding. New: pencil-wash with pencil-deep text. Open: paper fill with ink text and a 1px inset strong-rule ring. Resolved: done-wash with done text. Category and sentiment are plain 13px words, not chips (negative sentiment turns red and semibold).

### Ruled List Rows
- Inside a panel, rows are separated by hairline dividers, not boxed. Phones and tablets show stacked rows; at xl a muted 12px column-header row appears over the five-column grid. Loading shows seven skeleton rows with pulsing bars in the rule color.

### Navigation
- Left rail (lg+): 14px items with an 18px icon, 12px by 8px padding; inactive muted, hover slip; active is slip fill, semibold ink, inset hairline, blue icon, `aria-current="page"`. Tickets count as Inbox. Below lg: bottom tab bar on slip, icon over 12px label, active blue, inactive muted. A skip-to-content link appears on focus.

### Proof Panel (ticket page)
- Sticky aside beside the thread at lg (344px; 400px at xl): the AI draft in serif with blue superscript footnote markers, numbered sources beneath, an edit area, then sign-off, edit, regenerate and reject. A caution alert covers "no source found". It lands once with the entrance motion.

### Icons
- Authored inline SVG in Icons.tsx: 24px viewBox, 1.7 stroke, round caps and joins, `currentColor`, default 18px, decorative (`aria-hidden`). Set: inbox (ticked list), pilcrow (knowledge base), tally (dashboard), caret (edit), swap/transposition (regenerate), strike-through (reject), tick (approve), plus search, arrows, alert triangle, log out. The wordmark is a caret over a baseline on a blue tile.

### Alerts
- Error: proof-wash, proof text, 1px proof border at 30%. Caution: caution-wash, caution text, 1px border at 25%. 3px corners, 14px text; errors use `role="alert"`.

### Motion
- One entrance, "land": 6px rise and fade over 300ms with `cubic-bezier(0.16, 1, 0.3, 1)`, played once when the draft panel (re-keyed per draft) or home specimen appears. Loading uses the built-in pulse on skeleton bars. Both are gated with `motion-safe:`. Color transitions on buttons and nav only.

### Accessibility
- Contrast: muted text about 6:1 on paper; semantic text uses dark inks on their washes. Touch targets 44px on phones. Form inputs are 16px on phones. Priority and status always include text. Skip link, labelled search and filters (sr-only labels), live region for the ticket count, `lang="en"`.

## Do's and Don'ts

### Do:
- **Do** use pencil (#2742D1) for every primary action, focus ring and selection, and nothing else.
- **Do** separate content with 1px hairlines (`rule`) and the paper/slip tonal step before reaching for a shadow.
- **Do** set customer messages, AI drafts and copy textareas in Source Serif 4 at 17px with relaxed leading.
- **Do** pair color with a word or mark (priority ticks plus label, status chip text).
- **Do** keep controls at 36px on desktop and 44px on phones, with 16px field text on phones.
- **Do** wrap entrance motion in `motion-safe:` and keep to the single 300ms land.

### Don't:
- **Don't** use proof red for anything but urgent, reject and errors.
- **Don't** use the serif for headings, buttons, labels or navigation.
- **Don't** add dark mode or dark surfaces; the system is light by decision.
- **Don't** add rounded-pill chips, soft stacked cards, gradient fills, or a sparkle/AI-glow treatment for AI features.
- **Don't** use stock icon sets; extend Icons.tsx in the same 1.7 stroke, 24px grid.
- **Don't** put the slip shadow on ordinary panels or rows.
