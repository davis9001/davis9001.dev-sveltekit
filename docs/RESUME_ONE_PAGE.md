# /resume — the one-page print guarantee

`/resume` prints to **exactly one US Letter page**, and keeps doing so when the
content changes. No one has to re-tune font sizes after editing a bullet.

## How it works

The résumé is authored once in `src/lib/components/ResumeContent.svelte` and
rendered twice by `src/routes/resume/+page.svelte`:

| Copy                             | Purpose                                         |
| -------------------------------- | ----------------------------------------------- |
| `<ResumeContent />`              | The responsive web layout you see on the page.  |
| `<ResumeContent mode="sheet" />` | A fixed 8.5in-wide sheet — this is what prints. |

The sheet is always in the DOM, parked off-screen (`position: fixed; left: -20000px`).
Because it is laid out at true page width at all times, its height can be
**measured for real** instead of guessed at from a print preview.

Every size inside the sheet is `calc(N * var(--pt))`, where
`--pt: calc(1pt * var(--s))`. One `--s` multiplier therefore scales the whole
document uniformly. On mount — and after webfonts settle, on content changes,
and again on `beforeprint` — `fitSheetToPage()` (`src/lib/utils/fit-to-page.ts`)
bisects for the largest `--s` whose measured height still fits one page, then
leaves it applied. Printing is then just "hide the chrome, unpark the sheet".

The solved scale is published on the element as `data-fit-scale`,
`data-fit-height` and `data-fit-fits` for tests and tooling.

## Rules for editing the résumé

1. **Never use a fixed `px` / `pt` / `rem` font size in sheet mode.** It will
   refuse to scale and break the guarantee. Use `calc(N * var(--pt))`.
2. **Never let the sheet inherit sizing from the app.** `app.css` scales the
   root font-size with the viewport (18 / 20 / 23px), so anything inheriting it
   — or using `rem` — measures one height on screen and lays out at another on
   paper. `.r-root.sheet` declares its own base font-size for this reason.
3. Spacing inside the sheet should be `calc(N * var(--pt))` or `em`, both of
   which scale with `--s`. Hairline borders in `px` are fine.
4. If the résumé grows past what `minScale` (0.55) can absorb, the fit reports
   `data-fit-fits="false"` and page view shows a warning. That is an editorial
   signal — cut content; don't lower the floor.

## Knobs

| Where                                          | What                                                    |
| ---------------------------------------------- | ------------------------------------------------------- |
| `--resume-web-scale` in `ResumeContent.svelte` | On-screen type size (currently `1.2` = 120%).           |
| `FIT_DEFAULTS` in `fit-to-page.ts`             | Min/max scale, bisection precision, page-bottom safety. |
| `.resume-sheet` padding in `+page.svelte`      | Page gutters (0.25in × 0.3in).                          |

Gutters are content padding rather than `@page` margin, so they survive the
print dialog's "Margins: None" and never land in a printer's dead zone.

## Checking it

- **Page view** — the toggle in the top-right (or `/resume?preview`) shows the
  actual print sheet on screen at page size, with the solved type scale.
- **`?light` / `?dark`** — force a palette for headless PDF generation.
- **`bunx playwright test tests/e2e/resume-print.test.ts`** — prints real PDFs
  and asserts the page count is 1, including after content is added or removed.
- **`bun run test tests/unit/fit-to-page.test.ts`** — the bisection itself.
