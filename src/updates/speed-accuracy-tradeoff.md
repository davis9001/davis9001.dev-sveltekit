---
title: "Speed vs. Accuracy: A Warning Against Letting Past Mistakes Slow Your Future Progress"
summary: "In open-source development, as in physics, speed and accuracy are locked in a dance of trade-offs. My journey adding dark mode to Deno’s ecosystem taught me that progress isn’t about perfection—it’s about momentum, iteration, and knowing when to move fast or slow."
publishedAt: 2025-03-14T14:00:00Z
tags: [
  deno,
  jsr,
  open-source,
  development,
  dark-mode,
  theming,
  physics,
  philosophy,
]
---

Three weeks ago, I submitted a pull request to add dark mode to JSR, Deno’s
shiny new package registry. It wasn’t my first rodeo—I’d already tackled dark
mode for [Deno Docs](https://docs.deno.com) and
[Deno Fresh Docs](https://fresh.deno.dev/docs). My Deno Docs PR wasn’t accepted
outright but was copied, refined, and merged by the core team. I learned from
it. My Fresh Docs PR? Accepted clean as a whistle
([see it here](https://github.com/denoland/fresh/pull/2820)). So, with JSR, I
felt the wind at my back—momentum building.

Then, [my JSR PR](https://github.com/jsr-io/jsr/pull/985) got rejected.

It hit like a sudden stop—a loss of momentum. Had I moved too fast? Sacrificed
accuracy for speed? Or was this just the chaotic nature of open-source
contribution?

## The Physics of Progress

In physics, speed (velocity) and position are tied, while momentum carries that
motion forward. Accuracy, though, is trickier—it’s the precision of knowing
where you are or how fast you’re going. Heisenberg’s Uncertainty Principle
captures this tension:

$$ \Delta x \cdot \Delta p \geq \frac{\hbar}{2} $$

The more precisely you pin down position ( x ), the less you know about momentum
( p ), and vice versa. Speed up, and accuracy blurs; aim for precision, and you
slow down.

Open-source development mirrors this. My JSR PR was a high-speed
particle—rushing toward a goal but fuzzy on alignment with the project’s
trajectory. Rejection was the measurement that snapped me into focus, costing me
momentum but sharpening my position.

## Iterating Through the Uncertainty

That first Deno Docs PR wasn’t a failure—it was a calibration (and then a
collaboration). The team took my rough draft, polished it, and shipped it. I
absorbed the feedback, adjusted my aim, and fired again with Fresh Docs.
Success. Momentum restored. Each step was a dance between speed (submitting
fast) and accuracy (learning the project’s needs).

JSR, though? I’d misjudged the system’s inertia. Deno and JSR prioritize
security and stability—laudable goals born from Node.js and NPM’s scars. But
caution can calcify into stagnation. Look at NPM’s
[dark mode debate](https://github.com/orgs/community/discussions/128400)—years
of pleas, no action. Deno doesn’t want to be Node, but moving too slow risks
missing what users need _now_. Dark mode isn’t just a perk; it’s an
accessibility lifeline for those with light sensitivity or migraines. In 2025,
it’s table stakes.

## Failing Fast, Building Momentum

Rejection stung, but it didn’t stop me. Why? I live by a short list of credos:

- ["fail fast" aka "fail often” aka "fail cheap"](https://en.wikipedia.org/wiki/Fail_fast_(business))
  — a mantra for most of my work and life.
- _Adapt and Overcome_ — what doesn’t break me sharpens my resolve.
- “Hoping for the best, prepared for the worst, and unsurprised by anything in
  between.” ― Maya Angelou,
  [I Know Why the Caged Bird Sings](https://en.wikipedia.org/wiki/I_Know_Why_the_Caged_Bird_Sings)

Here’s why it works:

1. **Rapid Learning**: Each failure refines your aim. Post-JSR, I understood
   rejection’s _why_—better than if I’d never tried.
2. **Momentum Over Perfection**: A stalled PR gathers dust; a submitted one
   sparks dialogue. My imperfect Deno Docs PR moved the needle.
3. **Community Physics**: In open source, a rough draft today beats a
   masterpiece tomorrow. It’s position over paralysis.
4. **Low Stakes, High Speed**: If the downside’s small (a UI tweak, not a
   security flaw), why overthink?

But I know when to brake. For pacemakers, car brakes, or JSR’s core security?
Slow, meticulous accuracy trumps all. For dark mode? Speed wins—users need it,
the risk is low, and iteration is fast.

## The Strange Loop of Speed and Accuracy

Submitting those PRs took guts and humility. Deno Docs: fast, copied, improved.
Fresh Docs: accurate, accepted. JSR: fast, rejected. Was I speeding toward
success or just crashing through failures? If iteration hones accuracy, isn’t
speed just the path to getting it right?

It’s a loop: speed breeds mistakes, mistakes demand reflection, reflection
boosts accuracy, and accuracy fuels faster moves next time. Like a particle’s
wavefunction collapsing under observation, each failure clarified my
position—letting momentum build anew.

## Why I Keep Moving

Had I frozen I wouldn’t have added
[my namespace (davis9001)](https://jsr.io/@davis9001) to JSR, wouldn't have
learned Deno Fresh plugin dev, wouldn't have collaborated with
[Sai (@texoport.in)](https://bsky.app/profile/texoport.in) on a slicker dark
mode (WIP). I wouldn’t have nudged Deno Docs and Fresh Docs into the dark-mode
era. Inaction, not rejection, is the real risk.

JSR could’ve accepted my PR and fixed it later—especially given GitHub Issue
#18’s upvotes (1+8=9, a cosmic nudge). Browser plugins or “not enough users”
excuses don’t cut it when accessibility’s on the line. I stepped on toes,
ignored some rules, and I’d do it again. Speed delivered results.

## A Decision Algorithm: Speed or Accuracy?

Life’s a balancing act between speed and accuracy. Here’s a guide to choose
wisely. Score each factor 0–2, then sum up:

1. **Stakes**: 0 (high risk—security, harm), 1 (moderate—bugs, fixable), 2
   (low—UI, minor).
2. **Impact**: 0 (huge audience, critical), 1 (some users), 2 (small scope).
3. **Feedback Loops**: 0 (slow iteration), 1 (moderate), 2 (fast fixes).
4. **Urgency**: 0 (no rush), 1 (nice soon), 2 (overdue).
5. **Demand**: 0 (niche), 1 (some interest), 2 (big support).

- **0–4**: Accuracy first.
- **5–7**: Context calls it.
- **8–10**: Speed ahead.

For JSR’s dark mode? Stakes: 2 (low risk). Impact: 1 (moderate reach). Feedback:
2 (fast iteration). Urgency: 2 (2025 overdue). Demand: 2 (Issue #18’s upvotes).
Total: 9. Speed was the play—and I stand by it.

Here’s a TypeScript snippet to compute it:

```typescript
type DecisionFactor = 0 | 1 | 2;
type Decision = "Accuracy" | "Neutral" | "Speed";

function chooseSpeedOrAccuracy(
  stakes: DecisionFactor,
  impact: DecisionFactor,
  feedback: DecisionFactor,
  urgency: DecisionFactor,
  demand: DecisionFactor,
): Decision {
  const score = stakes + impact + feedback + urgency + demand;

  if (score <= 4) return "Accuracy";
  if (score <= 7) return "Neutral";
  return "Speed";
}
```

## The Final Equation

Progress isn’t

$$ ( speed = accuracy ) $$

It’s

$$ ( p = m \cdots v ) $$

—momentum from mass (effort) and velocity (action). Accuracy refines your
vector, but speed gets you moving. I’d rather crash and adjust than stand still
and wonder.

Maybe JSR will revisit dark mode. Maybe I will have inspired someone else to
crack [deno_doc #377](https://github.com/denoland/deno_doc/issues/377) faster
than I would have (sooner than would have happened had I not "intervened"). For
now, I’m content—knowing I’ve pushed the needle, one imperfect PR at a time.

In this strange loop of open source, speed isn’t the enemy of accuracy—it’s the
spark that lights the way.

## Conclusion

I'm posting this because I'm aware and I want to share that there is a time for
being careful and a time for being bold. My tendency is to ignore the rules and
break things, make changes quickly when I know that the alternative would be to
wait and likely never get the work done in a reasonable time (if ever).

I'm not (to my knowledge) writing any code that is going to be crucial to the
safety and security of others, if that were the case I'm sure my willingness to
throw rules out the window would be much less than it is now.

My question is this: what is the right balance between speed and accuracy?

---

## Sources

- [Deno Docs](https://docs.deno.com) - Inspiration and initial dark mode
  contribution.
- [Deno Fresh Docs PR #2820](https://github.com/denoland/fresh/pull/2820) -
  Successful dark mode implementation.
- [JSR PR #985](https://github.com/jsr-io/jsr/pull/985) - Rejected dark mode
  attempt.
- [NPM Dark Mode Discussion](https://github.com/orgs/community/discussions/128400) -
  Example of stalled progress.
- [deno_doc Issue #377](https://github.com/denoland/deno_doc/issues/377) -
  Potential future contribution.
- [Deno SaaSKit](https://deno.com/saaskit).
- Heisenberg Uncertainty Principle:
  - $$ \Delta x \cdot \Delta p \geq \frac{\hbar}{2} $$
