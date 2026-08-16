# Mockup brief (for Claude web)

Design an improved version of these three pages. **Output a single self-contained HTML artifact**
— inline CSS, no build step, no external requests except the fonts already used. It is a visual
mockup: hardcode realistic values from `reference/api-samples/`. It does not need to fetch
anything.

`DESIGN_BRIEF.md` is the same task written for an agent editing the real files; read it for the
full findings, but produce a mockup, not a patch.

## What this is

A rainwater system in Iceland. A 1000 L IBC tank collects roof runoff; an ultrasonic probe on the
lid measures the level, an inline meter measures flow out, five probes measure temperature.
The audience is one person checking their own system, on a phone and on a laptop.

## Current state

See `screenshots/` — each page at 1440px, in dark mode, and at 390px. The pages work and the data
is right. They look like three unrelated stacks of cards.

## The problems to solve

1. **Hierarchy is inverted.** The biggest number on the overview is "WATER USED 0.0 L today" — the
   least interesting figure on the page. The real headline, tank volume, is small and below a
   drawing.
2. **It reads like documentation.** Long amber explanatory paragraphs everywhere; ~40% of the
   usage page above the first chart is prose on mobile.
3. **Everything is amber.** Normal operating states are styled as warnings, so real warnings do
   not stand out.
4. **Wildly uneven weight.** Overview and temperature are ~1000px; the usage page is 2437px
   desktop / 3459px mobile.
5. **Three charts look identical** though they show three different kinds of quantity:
   consumption per hour, tank state over time, and instantaneous flow rate.
6. **No shared identity.** The tank cross-section on the overview is the one distinctive element,
   and the other two pages have nothing like it.

## Things that must survive the redesign

- The tank drawing's **blind band and overflow** are real: the sensor cannot read closer than
  25 cm, and the overflow caps the tank at **844 L**, not the nominal 1000 L. So the volume is
  honestly a **range** (`736–844 L`) whenever the surface is above the blind limit, not a single
  number. Do not "clean this up" into a fake precise figure or a simple percentage gauge.
- **Sensor colours are fixed** and must mean the same sensor everywhere:
  Vatn `#0ea5e9` (in water), Úti `#a855f7` (outside), Dæla `#f59e0b` (pump),
  Inntak `#10b981` (inlet), Tankur `#ef4444` (tank air).
- Names are **Icelandic** and stay that way.
- Measured values are set in a **monospace** face on purpose: readings refresh every ~36 s and
  proportional digits jitter. Keep tabular figures for anything that updates.
- Must work in **light and dark**, and at **390px and 1440px**.

## Palette

Use `reference/design-tokens.css`. The host has four accent themes (blue default, green, purple,
orange) crossed with light/dark. Design against blue, but do not hardcode colours that would break
in the others — the five sensor hues and the water blue are the deliberate exceptions.

## Deliverable

One HTML artifact showing all three pages (tabs or sections are fine), responsive, in whichever
of light/dark you think shows the design best. Explain the reasoning behind the layout decisions
briefly at the end — I need to be able to port it back to Jinja templates by hand.
