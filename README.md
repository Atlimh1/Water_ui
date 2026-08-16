# Water_ui

Front-end for **Vatnskerfi** — a rainwater system on a Raspberry Pi: a 1000 L IBC tank with an
ultrasonic level probe, an inline flow meter, and five temperature probes.

This repo contains **only the presentation layer** of three pages, extracted for design work.
It is not a runnable application.

## Pages

| Page | Template | Shows |
|---|---|---|
| Overview | `templates/water_system.html` | Tank cross-section, volume, water used, temperature spread |
| Water usage | `templates/water_usage.html` | Live meter, calibration tool, usage/level/flow charts |
| Temperature | `templates/water_temperature.html` | Five probe cards, multi-series chart |

Shared: `static/css/water_system.css`, `static/js/water_system.js`.

## Start here

1. **`MOCKUP_BRIEF.md`** — start here if you are producing a visual mockup.
2. **`DESIGN_BRIEF.md`** — the same findings written for an agent editing the real files.
3. **`WATER_SYSTEM.md`** — every tuned constant and why it has that value. Read before changing
   any number.
4. **`reference/shell-contract.md`** — the host template's blocks, theming axes and one
   significant trap.
5. **`reference/design-tokens.css`** — all CSS variables across 4 accent themes × light/dark.
6. **`reference/api-samples/`** — real API responses, so data shapes are known without a server.
7. **`screenshots/`** — current state, each page at 1440px desktop, dark, and 390px mobile.

## Constraints that are not negotiable

- Plain Jinja + CSS + vanilla JS. No build step, bundler, framework or npm dependency.
- ECharts 5.4.3 stays.
- Every colour is a `var(--…)` token **except** the five sensor hues and the water fill, which are
  literal hex on purpose — a colour must mean the same sensor on every page, and a variable
  lookup that resolves empty silently hands the series back to ECharts' default palette.
- Never key code by sensor display name. Names are editable, non-unique, and one rename already
  broke a chart. Key by `sensor_id`.
- The tank drawing's blind band, overflow line and dimensions encode real physical limits: the
  sensor cannot read closer than 25 cm, and the overflow caps usable volume at 844 L rather than
  the nominal 1000 L. Restyle them freely; do not remove them.

## Not included

`base.html` (the host shell) is withheld — it contains internal network addresses. Everything the
pages rely on from it is captured in `reference/`.
