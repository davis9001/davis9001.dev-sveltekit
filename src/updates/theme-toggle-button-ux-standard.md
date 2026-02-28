---
title: "The Case for a Universal Theme Toggle Standard: Show What Happens, Not What Is"
publishedAt: 2026-01-26
summary: After implementing dark/light mode toggles on docs.deno.com and fresh.deno.dev/docs, I've settled on a UX principle that I believe should become the standard—the toggle icon should indicate the action, not the state.
tags: [ux, design, dark-mode, accessibility, web-development, standards]
---

Here's a UX opinion I'm ready to defend: **when in dark mode, the theme toggle
should show a sun. When in light mode, it should show a moon.**

This might sound obvious to some, but I've seen countless implementations get
this backwards—and after carefully considering this during my work on
[docs.deno.com](https://docs.deno.com) and
[fresh.deno.dev/docs](https://fresh.deno.dev/docs), I'm convinced this approach
should become the universal standard.

## The Principle: Buttons Indicate Actions, Not States

Let me break down the fundamental UX principle at play here:

**A button's icon should communicate what will happen when you interact with it,
not describe the current state of the application.**

Think about it this way: when you're looking at a dark-themed page, you _already
know_ it's dark. The entire interface—the background, the text colors, the
overall ambiance—is screaming "dark mode" at you. You don't need a moon icon to
confirm what your eyes can plainly see.

What you _do_ need is guidance on what the button will do. And in dark mode,
clicking the theme toggle will take you to light mode. Hence: **show a sun**.

The inverse is equally true: in light mode, the page is obviously bright and
light-colored. You don't need a sun icon to tell you that. But you do want to
know that clicking this button will take you somewhere darker and easier on the
eyes at night. Hence: **show a moon**.

## The Anti-Pattern: Icons as State Indicators

The opposite approach—showing a moon when in dark mode and a sun when in light
mode—treats the toggle as a status indicator rather than an action trigger. This
is problematic for several reasons:

### 1. Redundant Information

If I'm staring at a white page with black text, I don't need a sun icon to
confirm I'm in light mode. That's like having a "You are currently standing"
sign next to an elevator button.

### 2. Cognitive Friction

When the icon shows the current state, users must perform an extra mental step:
"I see a moon, which means I'm in dark mode, which means clicking this will take
me to... light mode?" That's unnecessary cognitive load.

### 3. Inconsistent with Standard Button Behavior

Consider every other button in your interface:

- A **play button** doesn't show the "playing" state—it shows what happens when
  you click it
- A **mute button** shows a speaker with a line through it to indicate "click to
  mute," not "audio is currently unmuted"
- A **hamburger menu** doesn't change based on whether menus exist—it indicates
  "click to open menu"

Why should theme toggles be any different?

## My Implementation Journey with Deno

When I worked on adding dark/light mode support to Deno's documentation sites, I
spent considerable time thinking through this problem. These sites serve
developers—people who appreciate thoughtful, intuitive interfaces.

The implementation I settled on uses a clever SVG animation that morphs between
sun and moon icons. The key CSS that makes this work correctly:

```css
/* In dark mode: show the sun (to switch to light) */
.dark .sun-and-moon > .sun {
  transform: scale(1);
}
.dark .sun-and-moon > .sun-beams {
  opacity: 1;
}
.dark .sun-and-moon > .moon > circle {
  transform: translateX(-7px); /* Hide the moon mask */
}

/* In light mode: show the moon (to switch to dark) */
.light .sun-and-moon > .sun {
  transform: scale(0.5);
}
.light .sun-and-moon > .sun-beams {
  opacity: 0;
}
.light .sun-and-moon > .moon > circle {
  transform: translateX(0); /* Show the moon crescent */
}
```

The sun morphs into a moon (and vice versa) with smooth transitions, making it
crystal clear what the button does without requiring any additional thought from
the user.

## A Call to Action for Developers

I genuinely hope to see this become the standard approach for theme toggles
across the web. If you're implementing a dark/light mode toggle, consider these
guidelines:

### The Standard

| Current Theme | Toggle Icon | Action on Click |
| ------------- | ----------- | --------------- |
| Dark Mode     | ☀️ Sun      | Switch to Light |
| Light Mode    | 🌙 Moon     | Switch to Dark  |

### Additional Best Practices

1. **Use smooth transitions** — A morphing animation between sun and moon
   reinforces the connection between the icon and the action.

2. **Include proper ARIA labels** — Use `aria-label` to explicitly state what
   the button does: "Switch to light mode" or "Switch to dark mode."

3. **Consider the half-states** — If you support a "system" or "auto" mode,
   think carefully about what icon represents "use system preference."

4. **Test with real users** — Watch someone use your toggle. Do they hesitate?
   Do they click it and seem surprised by the result? These are signs your
   iconography might be backwards.

## The Bigger Picture

This might seem like a small detail, but it's emblematic of a larger UX
philosophy: **respect your users' cognitive resources**. Every interface element
should reduce mental load, not add to it.

When a user glances at your theme toggle, they should instantly understand what
clicking it will do. They shouldn't have to decode whether the icon represents
the current state or the future state. Make it obvious. Make it intuitive. Show
them where they're going, not where they are.

The page already tells them where they are.

---

_I implemented this approach on [docs.deno.com](https://docs.deno.com) and
[fresh.deno.dev/docs](https://fresh.deno.dev/docs). You can see the related pull
requests and deeper implementation details in my previous post:
[Perfecting Dark Mode Support with Tailwind on Deno Fresh](/update/perfecting-dark-theme-support-deno-tailwind)._

Let's make this the standard. Your users' brains will thank you.
