# Design brief — Vatnskerfi pages

Paste the block below into Claude Code from `/home/ubuntu/dashboard`.

---

## Context (carry forward — these are locked decisions, do not revisit)

You are working in `/home/ubuntu/dashboard`, a **read-only** Flask dashboard on port 5006
(`dashboard.service`). It renders sensor data for a rainwater system: a 1000 L IBC tank with an
ultrasonic level probe, an inline flow meter, and five temperature probes.

Locked, do NOT change:
- **Data layer is correct and off-limits.** `db_ro.py` and `app.py` are finished. The level
  differencing algorithm (median filter, 2.0 cm deadband, 8 cm max-step rejector) was tuned
  empirically and is pinned by 15 tests in `tests/`. Do not touch its logic or constants.
- **`{% block extra_styles %}` in `base.html` sits INSIDE a `<style>` element.** Any `<link>`
  or `<meta>` placed there is parsed as CSS and silently discarded. These pages correctly use
  **`{% block extra_head %}`**. Keep it that way.
- **Never key code by sensor display name.** Names live in `device_settings.display_name`, change,
  and are not unique. Key by `sensor_id`.
- **Sensor colours are literal hex in `WS_SENSORS`** (`static/js/water_system.js`), never
  CSS-variable lookups — a lookup that resolves empty silently hands the series to ECharts'
  default palette. Vatn `#0ea5e9`, Úti `#a855f7`, Dæla `#f59e0b`, Inntak `#10b981`,
  Tankur `#ef4444`. A colour must mean the same sensor on every page.
- **Everything else must use `var(--…)` tokens.** The shell has four accent themes
  (`data-theme`) crossed with light/dark (`data-dark-mode`) = 8 states. Hardcoded colours break
  half of them.
- **ECharts 5.4.3 from CDN.** It measures its container at init, so a chart built inside a
  `display:none` element gets a 0×0 canvas.
- The tank SVG's **blind band, overflow line and dimension annotations encode real physical
  constraints** — the sensor cannot read closer than 25 cm and the overflow caps the tank at
  844 L. You may restyle them. You may NOT remove them or make them merely decorative.

Read `WATER_SYSTEM.md` before starting. It documents every constant and why it has that value.

## Starting state

Three working pages, all functional, all fed by live data:
- `/water-system` → `templates/water_system.html` (overview: tank drawing, water used, temp range)
- `/water-system/usage` → `templates/water_usage.html` (live meter, calibration tool, 3 charts)
- `/water-system/temperature` → `templates/water_temperature.html` (5 probe cards, multi-line chart)

Shared: `static/css/water_system.css`, `static/js/water_system.js`.

They are correct but visually unresolved. A design audit produced the findings below.

## Target state

The same three pages, same data, same correctness — but designed as a coherent product rather
than three card stacks. Fix every finding below without regressing anything listed as locked.

### Findings to fix

**Hierarchy**
1. On the overview, the biggest type on the page is "WATER USED 0.0 L today" — currently the
   least informative number there. The tank volume (`736–844 L`) is the real headline and sits
   small, below the drawing. Invert this so visual weight matches information value.
2. Explanatory prose dominates. The overview carries a 4-line amber paragraph; the usage page has
   two full-width banners plus three card footnotes plus a 4-line calibration explainer. On a
   390 px screen roughly 40% of the usage page above the first chart is explanation. Compress it:
   keep the meaning, lose the lecture. Progressive disclosure is fine.
3. Every caveat is amber. The blind-band note is a **normal operating state**, not a warning —
   when everything is amber, nothing reads as urgent. Reserve warning colour for actual faults
   (sensor stale, meter dead, leak gap) and give neutral states neutral styling.

**Balance and rhythm**
4. Page weights are wildly uneven: overview 1000 px, temperature 1000 px, usage **2437 px**
   desktop / **3459 px** mobile. The usage page is doing too much.
5. The calibration tool ("Start measurement" + litres input) is a **diagnostic instrument living
   permanently inside a monitoring page**. It should be present but subordinate — collapsed,
   behind a disclosure, or moved lower. It currently sits second from the top.
6. The overview wastes its canvas: the right column ends ~80 px above the left, leaving a large
   empty region bottom-right at 1440 px.
7. Three levels of navigation chrome stack before any content: global nav → page title → tab bar.

**Charts**
8. All three usage charts render as the same blue line/bar and read as one repeated element.
   "Used per hour" (consumption), "Tank level" (a state over time) and "Flow rate" (an
   instantaneous rate) are three different kinds of quantity and should look like it.
9. Chart heights are uniform (340/340/220 px) regardless of information density. The used-per-hour
   chart is often near-empty (max 0.03 L) yet gets 340 px.
10. The tank-level chart's empty-state message **clips on both edges at 390 px** — it is an
    ECharts `graphic` text element with no wrapping. Must wrap or shorten responsively.
11. Temperature page shows the same five sensor names twice, adjacently: five legend cards
    immediately above an in-chart legend.

**Mobile (390 px)**
12. Tab labels wrap ("Water usage" onto two lines), making tab heights uneven.
13. The live-meter raw table shows 14 rows of mostly-identical zeros — very high space cost for
    very low information. Consider collapsing to changed rows, or fewer rows, on narrow screens.
14. A global floating chat bubble (not yours, in `base.html`) overlaps content bottom-right on
    both pages. Add bottom padding so nothing important sits under it.

**Identity**
15. The tank cross-section is the one distinctive element and it works — but it appears only on
    the overview. The other two pages have no visual identity beyond generic cards and default
    ECharts. Give the set a shared visual language so the three pages read as one product.
16. IBM Plex Mono is used for measured values (deliberately — values refresh every ~36 s and
    proportional digits jitter). Keep that. Build the rest of the type scale around it properly
    instead of leaving everything else at shell defaults.

## Allowed actions

- Edit only: `templates/water_system.html`, `templates/water_usage.html`,
  `templates/water_temperature.html`, `static/css/water_system.css`,
  `static/js/water_system.js`.
- Restart with `sudo systemctl restart dashboard` to see changes (templates are cached).
- Screenshot to verify. Playwright + headless chromium are already installed:
  `/tmp/claude-1000/*/scratchpad/shotenv/bin/python`. If that venv is gone, recreate with
  `python3 -m venv shotenv && shotenv/bin/pip install playwright` (the chromium build persists in
  `~/.cache/ms-playwright`). Use `ignore_https_errors=True` and pass
  `--ignore-certificate-errors`.

## Forbidden actions

- Do NOT modify `db_ro.py`, `app.py`, `base.html`, `tests/`, or any template outside the three
  named above.
- Do NOT change any API response shape, query, or tuned constant.
- Do NOT add a build step, framework, bundler, or npm dependency. Plain Jinja + CSS + vanilla JS.
- Do NOT swap charting libraries. ECharts 5.4.3 stays.
- Do NOT add features that were not asked for — no new pages, routes, settings panels, export
  buttons, or animations beyond what serves the findings above.
- Do NOT remove the physical annotations from the tank drawing.
- Do NOT delete data or run any write query. This app is read-only by design.

## Verification — required before you claim done

HTTP 200 is not verification. For each of the three pages you MUST:
1. Screenshot at **1440 px** and **390 px**, in **light and dark**.
2. Look at every screenshot and confirm the finding it targets is actually fixed.
3. Confirm zero console errors (ignore pre-existing `/api/chat/*` 404s) and
   `document.documentElement.scrollWidth <= clientWidth`.
4. Confirm the CSS actually loaded: `[...document.styleSheets].some(s => (s.href||'').includes('water_system.css'))`.
   A page can return 200 with its stylesheet silently discarded — that exact failure has already
   happened once here.
5. Run `python3 -m unittest discover -s tests` — 15 tests must still pass.

## Stop and ask before

- Deleting any file, or removing any existing chart or data field from a page.
- Changing anything in the locked list.
- Any change that would alter what a number means rather than how it looks.

## Output

After each page is done, print: `✅ [page] — [what changed] — [screenshots checked]`.
Then stop and wait for review before starting the next page. Do all three in this order:
temperature (simplest), overview, usage (most complex).

Only make changes directly requested above. Do not refactor, reorganise, or add abstractions
beyond what the findings require.
