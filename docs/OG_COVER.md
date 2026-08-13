# The share card — `static/cover.png`

`static/cover.png` is the image Discord, Slack, X and iMessage show when someone
pastes a davis9001.dev link. It is **generated**, not hand-drawn: edit the render
route, re-run the capture, commit the new PNG.

## How it works

| Piece                                     | Role                                                  |
| ----------------------------------------- | ----------------------------------------------------- |
| `src/routes/hidden/og-cover/+page.svelte` | The card itself, laid out at exactly 1200×630.        |
| `scripts/capture-og-cover.cjs`            | Screenshots that route and writes `static/cover.png`. |
| `src/lib/utils/seo.ts`                    | `DEFAULT_OG_IMAGE` — the URL `SEO.svelte` publishes.  |

The route is under `/hidden`, so the root layout gives it no nav and no footer.
It carries the site's own furniture — the hoodie photo the homepage uses as its
background, the green davis9001 logo, the wordmark, and the crow perched on the
"9" — so the card and the page a visitor lands on read as the same site.

Everything on the card is deterministic. The ASCII signal field is built from a
small seeded LCG rather than `Math.random()`, so re-running the capture without
changing the route produces a byte-identical image instead of a spurious diff.

## Regenerating it

The capture script drives a real browser against a **running dev server** — it
does not build the site itself:

```bash
bun run dev              # in one terminal
bun run screenshot:og-cover
```

It tries ports 4242, 4243 and 4220 in that order, or honours `OG_COVER_URL`.
The script waits for `[data-og-ready="true"]`, which the route only sets once
webfonts have settled _and_ the crow has finished flying to its perch — without
that wait you capture the crow mid-flight.

The raw screenshot lands around 800KB, so the script palette-quantises it with
`sharp` down to roughly 220KB before writing. That size is asserted in
`tests/unit/og-cover-route.test.ts` along with the PNG's dimensions.

## Changing the artwork

**Bump `?v=` in `DEFAULT_OG_IMAGE` (`src/lib/utils/seo.ts`) whenever the card
changes.** Discord and friends cache unfurled images by URL and will happily
serve the previous card for weeks otherwise — replacing the file alone is not
enough to make the new one show up.
