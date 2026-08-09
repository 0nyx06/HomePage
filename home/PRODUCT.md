# PRODUCT — 0nyx.cn personal homepage

register: brand (design IS the product; this is a developer portfolio / personal landing)

## Who / what
0Nyx, an independent full-stack developer. The site is a single-page personal
homepage that signals craft: web + mobile + AI products shipped end to end.

## Audience & scene
Recruiters, collaborators, and fellow engineers, usually browsing in the evening on
desktop or phone. The page should feel like a late-night terminal glow inside a quiet
design studio: focused, precise, a little luminous. Confident, not loud.

## Voice (three concrete words)
precise · luminous · engineered

## Color strategy — Committed (dark)
Near-black surface carries the page; a single luminous jade "signal" green is the brand,
used for highlights, links, focus, and the live canvas. White ink for readability.

Tokens (OKLCH):
- --bg:      oklch(0.155 0 0)        near-black, neutral
- --surface: oklch(0.195 0.004 160)  panels / raised
- --ink:     oklch(0.965 0 0)        body text (>= 7:1 on bg)
- --muted:   oklch(0.74 0.012 160)   secondary text (>= 3.5:1)
- --signal:  oklch(0.86 0.17 158)    jade accent (text on it = dark)
- --signal-deep: oklch(0.70 0.15 160)

## Type (3 families, contrast axis: expressive vs neutral vs technical)
- display: "Bricolage Grotesque" (Google) — name + headings
- body:    "Hanken Grotesk" (Google)
- mono:    "JetBrains Mono" (Google) — labels, code-y metadata

## Sections
1. Hero — interactive canvas field + cursor glow, name, role, intro, CTAs, status
2. About — focused statement + what-I-do (web / mobile / AI)
3. Stack — capabilities grouped by domain (tag groups, not cards)
4. Selected work — featured ListenE (asymmetric) + mqlt; 月薪喵 easter egg via avatar click
5. Contact — bold CTA, email + socials
6. Footer

## Imagery
Generated animated canvas hero (the "imagery"); no stock photos. No colored-div
placeholders. Project entries get crafted typographic + accent treatments (not identical cards).

## Editable placeholders (fill before go-live)
- Real name (optional), email, GitHub handle, location, "available for" status.

## Build constraints
- Dependency-free: vanilla HTML/CSS/JS + <canvas>. Google Fonts via <link> with system fallback.
- Relative asset paths so the folder works in /home/ preview and when moved to web root.
- Respect prefers-reduced-motion. Content visible without JS.
