# Host shell contract

These pages render inside a Flask/Jinja shell (`base.html`), which is **not included in this
repo** — it carries internal network addresses. Everything the pages depend on from it is
documented here.

## Template blocks

```jinja
{% extends "base.html" %}
{% block title %}…{% endblock %}
{% block extra_head %}…{% endblock %}      ← <link>, <meta>, <script> go HERE
{% block content %}…{% endblock %}         ← rendered inside <main class="main-content">
{% block extra_scripts %}…{% endblock %}   ← last thing before </body>
```

### The trap

`base.html` also defines `{% block extra_styles %}`, and that block sits **inside a `<style>`
element**. Anything but raw CSS text placed there is parsed as CSS and **silently discarded** —
no error, no 404, the file is simply never requested. A `<link>` there produces a page that
returns HTTP 200 with no styling at all, which for inline SVG means falling back to `fill: black`.

**Always use `extra_head` for tags.** This already cost one full debugging cycle.

## Layout

`.main-content` is `max-width: 1400px; margin: 0 auto; padding: 24px 20px 60px 20px`.
A fixed footer occupies the bottom ~40px, hence the bottom padding.
A floating chat bubble sits bottom-right (~64px) and overlaps page content.

## Theming — two independent axes

- Accent: `<body data-theme="blue|green|purple|orange">` (blue is default)
- Mode: `<body data-dark-mode="true">` (absent = light)

That is **8 combinations**. See `design-tokens.css` for every variable in every state.
Any colour that is not a `var(--…)` token will be wrong in some of them.

Charts must read the tokens at runtime rather than hardcoding, e.g.
`getComputedStyle(document.documentElement).getPropertyValue('--text')`.
`static/js/water_system.js` exposes this as `WS.theme()`.

## Fonts

- UI: `Inter` (loaded by the shell)
- Icons: Material Icons, used as `<span class="material-icons">name</span>`
- Measured values: `IBM Plex Mono`, loaded per-page in `extra_head`

Mono on values is deliberate and load-bearing: readings refresh about every 36 seconds and
proportional digits visibly jitter when they change. Tabular figures hold still.

## Charts

Apache ECharts **5.4.3** from jsDelivr, loaded per-page in `extra_scripts`.
ECharts measures its container at init, so a chart created inside a `display:none` element gets a
0×0 canvas — build on first reveal, or resize after showing.
