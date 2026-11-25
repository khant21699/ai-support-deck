# Fonts

Both fonts are variable fonts (Latin subset, WOFF2) from [Fontsource](https://fontsource.org), licensed under the
SIL Open Font License 1.1, which allows bundling and redistribution.

| File | Font | Used for |
|---|---|---|
| `schibsted-grotesk-latin-wght-normal.woff2` | Schibsted Grotesk | The whole interface |
| `source-serif-4-latin-wght-normal.woff2` | Source Serif 4 | Words being edited: customer messages and AI drafts |

Downloaded from `https://cdn.jsdelivr.net/fontsource/fonts/<font>:vf@latest/latin-wght-normal.woff2`.
They are loaded in `app/layout.tsx` with `next/font/local`, so the app never fetches fonts at build time.
