# LiftKit design system

A 5 am training journal for a phone. Read this before touching UI.

## Feel

Calm, premium, quick to read from a bench. Pre-dawn ink blue in dark mode, cool fog in light mode. One accent colour, used sparingly: for the next thing to tap and for progress. Green (`--ok`) only ever means done.

## Tokens (src/styles/globals.css)

- Surfaces: `--background` (page), `--surface` (cards), `--surface-2` (insets, secondary buttons, rows inside cards)
- Text: `--foreground`, `--muted` (secondary), `--faint` (tertiary)
- Lines: `--border`, `--accent-line`
- Accent: `--accent`, `--accent-contrast`, `--accent-soft` (tinted fill)
- States: `--ok`, `--ok-soft`, `--danger`
- Radii: cards 20px (`.card`), rows inside cards 12px (`rounded-xl` / `rounded-[12px]`), buttons 14px (`.btn`), pills full
- Never use raw zinc/gray Tailwind colours or hex values in components. Use the tokens, e.g. `bg-(--surface)`, `text-(--muted)`.

## Type

Archivo, one family. `.display` (narrow, 650) for titles and section headings. `.num` (narrow, tabular) for every weight, rep, set count and stat. Body is regular Archivo at 15 to 16px. `.label` (13px, medium, muted) for small captions.

Scale: page title 34px `.display` (via `PageHeader`), section heading 22px `.display` (via `SectionTitle`), card title 18 to 20px `.display`, body 15 to 16px, caption 13px, micro 12px.

## Components (src/components)

- `PageHeader({ title, subtitle?, back?, action?, eyebrow? })` at the top of every screen
- `SectionTitle({ children, action? })` for sections within a page
- CSS classes: `.card`, `.btn` + `.btn-primary | .btn-secondary | .btn-ghost | .btn-danger`, `.btn-sm`, `.btn-block`, `.chip`, `.chip-accent`, `.chip-ok`, `.label`, `.display`, `.num`
- Page wrapper: `<main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 pt-4 pb-tabbar">`. `pb-tabbar` keeps content clear of the fixed bottom tab bar. Do not add a top nav; navigation is the bottom tab bar (Today, Plans, Progress, Settings).
- Tap targets at least 44px tall.

## Writing

- Sentence case everywhere ("Start workout", "Your plans"). No all-lowercase, no ALL CAPS, no `uppercase tracking-wider` labels.
- Never use em dashes (—) or en dashes as punctuation. Use commas, periods or parentheses. A range can be "8-10" or "8 to 10".
- No arrows appended to button or link text ("Start →" becomes "Start workout").
- Don't join metadata with middle dots ("a · b · c"). Use separate elements, chips or commas.
- Buttons say exactly what happens ("Start workout", "Set as active plan", "Delete session"). Plain words, active voice, no filler, no exclamation marks.
- Empty states tell you what to do next.

## Don't

- No gradients, glows, blurred colour blobs or coloured shadows.
- No raw codes shown to people: plan notes start with set codes like `[A1]`; use `parseSetCode` from `src/lib/set-code.ts` and show grouping visually instead.
- Destructive actions are never one tap away next to a primary tap target. Put them behind a menu, an edit mode, or a confirm.
- Don't show "0s" or empty values; leave them out.

## Motion

Only in response to a tap (expand, confirm, check off). 150 to 200ms, ease. Respect reduced motion (globals already do).
