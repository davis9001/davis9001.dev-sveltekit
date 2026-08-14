# Inline charts for CMS posts

Charts in blog posts are **inline SVG stored in the post body**, not images.
That keeps them sharp at any size, correct in both themes from one asset, and
readable by anything that reads the page. It also means they have to survive
`src/lib/cms/sanitize.ts`, which is where all the constraints below come from.

```bash
bun run scripts/charts/build.mjs            # → chart-data.json, bars.svg, donuts.svg
bun run scripts/charts/build.mjs /tmp/out   # …somewhere else
```

`build-data.mjs` reads the lead-scanner's sweep output (default
`~/_Projects/Anzu/anzu/out`, overridable as the second argument) and derives
every number. Nothing in a figure is typed by hand, and the build throws rather
than emitting figures that disagree with each other.

## What the sanitizer allows

The allowlist is deliberately narrow. **Absent: `<style>`, `style` attributes,
`<script>`, every `animate*` tag, and any `href`.** A chart therefore cannot
style or animate itself — it can only carry `class`, and the CSS lives in
`src/app.css`.

Present and used here: `svg g path rect circle line text`, plus `fill`,
`fill-opacity`, `stroke`, `stroke-opacity`, `stroke-width`, `stroke-dasharray`,
`transform`, `class`, and `pathLength` on `<circle>`.

Two consequences worth knowing before designing a figure:

- **`<figcaption>` takes no attributes**, so a caption renders at full body size
  and reads as prose. Both figures draw their footnote _inside_ the SVG instead,
  under a hairline rule, with padding below it — otherwise the next paragraph
  crowds the figure with nothing marking where it ends.
- **Anything you can't express in the allowlist has to move into `app.css`**,
  which is shared by every post. Keep per-figure geometry in the SVG and only
  put reusable behaviour in CSS.

## The class contract

`CmsContent.svelte` adds `.chart-anim` on mount and `.in-view` when the figure
scrolls into the viewport. `app.css` keys off both.

| class       | on                    | effect                                    |
| ----------- | --------------------- | ----------------------------------------- |
| `cms-chart` | the `<svg>`           | opts the figure into animation at all     |
| `cg`        | a bar `<path>`        | grows from `scaleX(0)`                    |
| `cr`        | a ring `<circle>`     | draws itself, `stroke-dashoffset` 100 → 0 |
| `cf`        | text, legend swatches | fades and rises                           |
| `s0`…`s6`   | any of the above      | stagger step, 110ms apart                 |

Rules that keep it working:

1. **`.chart-anim` is added by JS, never written into the markup.** The hidden
   state only exists once something is present to undo it, so with JS off the
   chart renders complete rather than blank.
2. **Every keyframe animates opacity as well as its transform.** A transform is
   the part an engine can decline; opacity is not. Worst case is a plain fade,
   never a mark stranded at `scale(0)` with nothing on screen.
3. **Avoid CSS transforms that need an origin on SVG nodes.** `transform-box` +
   `transform-origin` on a `<g>` is the least even corner of CSS and does not
   work in WebKit — the donut rings sat motionless on iOS while the bars
   animated, because bars use `fill-box` on a shape, which is SVG-native. Rings
   are now positioned with the SVG `transform` _attribute_
   (`rotate(deg cx cy)`, which names its own centre) and animated purely via
   `stroke-dashoffset`, so no CSS transform machinery is involved.
4. **Stagger rules must match the specificity of the rules that set
   `animation`, and come after them.** The `animation` shorthand resets
   `animation-delay` to 0, so a weaker selector is silently overruled and the
   whole figure moves in lockstep. This shipped broken once; `tests/unit/
chart-animation-css.test.ts` now pins it.

## Surviving the admin editor

The CMS body editor is TipTap, whose schema has no node for `<svg>`. Left to
itself it does not merely drop a chart — it parses the `<text>` children as
prose and writes the flattened result back, so the save looks like it worked.
That is what destroyed both figures in this post on 2026-08-08; they were wrong
on the live site for five days before anyone noticed.

`src/lib/cms/richtext-svg-extension.ts` is what stops it. It captures an inline
`<svg>` — or a `<figure>` that wraps one — as an atom node holding the markup
verbatim, and renders it straight back out. `tests/unit/richtext-svg-extension.
test.ts` pins the round-trip, including a test that still reproduces the old
destruction with the extension removed.

Two things follow for anyone editing these posts:

- **A chart is one atom in the editor.** It shows as the real figure with a
  dashed outline, and the WYSIWYG will not edit inside it. Use the **HTML**
  toolbar button to change a chart's markup, or regenerate and re-paste it.
- **Saving lowercases `viewBox` and `pathLength`.** js-xss lowercases attribute
  names, so storage ends up with `viewbox` / `pathlength`. This is safe because
  bodies render as HTML and the HTML parser case-corrects SVG attributes —
  confirmed in Chromium, where `pathlength="100"` yields `pathLength.baseVal
=== 100`. It would **not** be safe if a body were ever parsed as XML/XHTML.

## Colour

Both accents (`#ea580c`, `#0891b2`) were checked with the dataviz palette
validator against **both** page surfaces — light `#ffffff` and dark `#0a0a0a` —
for 3:1 contrast and CVD separation. Everything else is `currentColor`, which is
what makes one asset correct in both themes. If you add a colour, validate it
against both surfaces; a hue that only clears one of them will fail silently for
half your readers.
