---
title: Perfecting Dark Mode Support with Tailwind on Deno Fresh
publishedAt: 2025-03-01T08:30:00Z
summary: I added dark/light mode (themes) to existing Deno websites (fresh.deno.dev/docs and docs.deno.com). Here is what I learned and how you can eventually implement my solution on Deno Fresh apps.
---

## How it Started: Bringing Dark Mode to Deno Docs and Deno Fresh Docs

Recently I had the privilege of helping to add light/dark mode toggling to
[Deno's documentation site](https://docs.deno.com) (built with
[Lume](https://lume.land/)) and the
[Fresh framework documentation](https://fresh.deno.dev/docs) (built with
[Fresh](https://fresh.deno.dev/)). The goal was to implement a seamless,
user-friendly theme switcher while keeping the solution as simple and
maintainable as possible.

_You can see the long history for each of these in the pull requests linked at
the bottom of this post._

### Tailwind and `@tailwindcss/forms`

Since both sites already used Tailwind CSS, integrating dark mode was
straightforward. The challenges were ensuring that:

- The user's theme preference (light/dark) is respected.
- The UI switches instantly when toggled.
- The preference persists across sessions.
- There is no FOUC (Flash of Unstyled Content) no matter the client's current
  "state".

To achieve this, I set the `data-theme` (or `class`) attribute on the `html` tag
of each page to either `dark` or `light` depending on a few factors (in order,
and depending on if the setting exists):

- A setting stored in localStorage (if the user clicked the `<ThemeToggle />`
  then localStorage.theme is set so use that).
- The user's system preference, using `prefers-color-scheme` (so we know if the
  browser or OS has a preference set).
- The default theme setting of the application if no user preference is
  available (I default to dark normally).

### The Implementation

The Deno Docs website uses Lume and the Fresh Docs website uses (not
surprisingly) Fresh. The Lume implementation was and is a bit less interesting
to me considering that my personal website (and a project I recently released,
[AgapeVerse](https://agapeverse.app)) use Fresh. For the Fresh Docs website I
ended up creating an Island that pretty cleanly adds almost everything needed.

Here is what I did:

1. Added `/island/ThemeToggle.tsx` with the following logic:

**Detect the user's preferred theme:** On initial page load, check
`localStorage` for a saved preference. If none exists, fallback to
`window.matchMedia('(prefers-color-scheme: dark)')`.

```ts
const [theme, setTheme] = useState(() => {
  if (!IS_BROWSER) return "light";
  return document.documentElement.dataset.theme ?? "light";
});

const ThemeToggle = () => {
  setTheme((prev) => {
    const theme = prev === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    return theme;
  });
};
```

2. Added script in the `<head>` to the `_app.tsx` file

The following requirements could be accomplished just from the Island component
however: To avoid FOUC (Flash of Unstyled Content) it's necessary to add the
following to the page in a `<script>` tag to the `<head>` element.

```javascript
const isDarkMode = localStorage.theme === "dark" ||
  (!("theme" in localStorage) &&
    window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
```

There are several ways this could be done, and while this isn't what was used on
the Fresh Docs page this is how I feel it makes the most sense to do it:

```tsx
# _app.tsx
import { PageProps } from "fresh";
import { themeToggleHeadScript } from "$/island/ThemeToggle.tsx";
...
  <head>
    ...
    <script src={`data: text/javascript, ${themeToggleHeadScript}`}></script>
  </head>
...
```

3. **Add CSS vars for site-wide color schemes:** In `styles.css` or similar
   create a set of CSS vars (as defaults and for the dark version of each color,
   example below).

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --foreground: 34, 73%, 10%;
    --background: 264, 100%, 90%;
    --primary: 265, 95%, 57%;
    --secondary: 34, 96%, 52%;
    --accent: 135, 73%, 49%;
    --link-blue: 220, 80%, 50%;
  }
  .html[data-theme="dark"]:root {
    --foreground: 34, 73%, 90%;
    --background: 264, 100%, 10%;
    --primary: 265, 95%, 43%;
    --secondary: 34, 96%, 48%;
    --accent: 135, 73%, 51%;
    --link-blue: 220, 80%, 50%;
  }
}
```

Here's a snippet of the core logic:

```ts
function setTheme(theme: "light" | "dark") {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}

function initTheme() {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme) {
    setTheme(storedTheme as "light" | "dark");
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    setTheme("dark");
  }
}

document.addEventListener("DOMContentLoaded", initTheme);
```

## Making It Easy for Everyone: A Deno Fresh Plugin

After implementing dark mode for these two sites, I realized that many
Fresh-based projects might benefit from a simple drop-in solution for theme
toggling. To address this, I’m now working on a **Deno Fresh plugin** that will
make it easy for any Fresh website to support dark mode with minimal setup.

### Goals for the Plugin

- **Zero-config setup** – Works out of the box.
- **Tailwind-compatible** – Uses Tailwind's `dark:` class strategy.
- **Automatic preference detection** – Defaults to system preference but allows
  manual toggling.
- **Lightweight and efficient** – Minimal JavaScript and no external
  dependencies.

### What's Next?

The plugin is still in early development, but once complete, it will provide:

- A mostly self-contained Fresh Island `<ThemeToggle />` for a dark/light/system
  mode toggle button.

I’ll be publishing the plugin on
[JSR](https://jsr.io/@davis9001/fresh-theme-toggle) soon, along with
installation and usage instructions. Stay tuned!

If you're building a Fresh app and want easy dark mode support, I'd love to hear
your thoughts. Let me know what features you'd find useful!

## Pull Requests (History)

- [Deno Fresh Docs](https://fresh.deno.dev/docs/introduction) (merged but
  awaiting merge of followup): https://github.com/denoland/fresh/pull/2820
- [Deno Docs](https://docs.deno.com/) (merged after many updates by other
  contributors): https://github.com/denoland/docs/pull/1018
- JSR - PR rejected: https://github.com/jsr-io/jsr/pull/985
