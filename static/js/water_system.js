/* ===========================================================================
   Vatnskerfi - shared front-end helpers for the water-system pages.
   Loaded before each page's own script. Depends on ECharts 5.4.3.
   =========================================================================== */
'use strict';

/* Sensor identity. Colours are literal hex, never CSS-variable lookups: a
   lookup that resolves empty hands the series back to ECharts' default palette
   and every line silently ends up a different colour than its legend swatch.
   `name` is only a fallback - device_settings.display_name is authoritative,
   and WS.applyNames() overwrites these from the API. Never key anything by
   display name; names change and are not unique. */
const WS_SENSORS = [
    { id: 'DS18B20_B8F628',   name: 'Vatn',   gloss: 'in water', color: '#0ea5e9' },
    { id: 'DS18B20_53E228',   name: 'Úti',    gloss: 'outside',  color: '#a855f7' },
    { id: 'AHT10_Bus0_0x38',  name: 'Dæla',   gloss: 'pump',     color: '#f59e0b' },
    { id: 'SHT31_Bus1_0x44',  name: 'Inntak', gloss: 'inlet',    color: '#10b981' },
    { id: 'BMP280_Bus1_0x76', name: 'Tankur', gloss: 'tank air', color: '#ef4444' }
];

const WS_WATER = '#0ea5e9';
const WS_MONO = 'IBM Plex Mono, monospace';

const WS = {

    sensors: WS_SENSORS,

    byId(id) { return WS_SENSORS.find(s => s.id === id); },

    /* device_settings.display_name wins over the built-in fallback. */
    applyNames(lookup) {
        WS_SENSORS.forEach(s => {
            const name = lookup[s.id];
            if (name && name !== s.id) s.name = name;
        });
    },

    /* Read the shell's tokens so charts follow the accent theme and dark mode. */
    theme() {
        const s = getComputedStyle(document.documentElement);
        const pick = (n, fb) => (s.getPropertyValue(n) || '').trim() || fb;
        return {
            text:      pick('--text', '#1e293b'),
            textMuted: pick('--text-muted', '#64748b'),
            border:    pick('--border', '#e2e8f0'),
            bgCard:    pick('--bg-card', '#ffffff'),
            primary:   pick('--primary', '#3b82f6')
        };
    },

    axis(c) {
        return {
            axisLine:  { lineStyle: { color: c.border } },
            axisLabel: { color: c.textMuted, fontFamily: WS_MONO, fontSize: 10 },
            splitLine: { lineStyle: { color: c.border, opacity: .45 } }
        };
    },

    tooltip(c, suffix) {
        return {
            trigger: 'axis',
            backgroundColor: c.bgCard,
            borderColor: c.border,
            textStyle: { color: c.text, fontSize: 12 },
            valueFormatter: v => (v === null || v === undefined)
                ? 'no reading' : v + (suffix || '')
        };
    },

    /* ECharts measures its container at init time, so a chart created inside a
       hidden element gets a 0x0 canvas. Callers build on first reveal. */
    init(elId) {
        const el = document.getElementById(elId);
        if (!el) return null;
        if (typeof echarts === 'undefined') {
            el.innerHTML = '<div class="ws-empty">Chart library failed to load.</div>';
            return null;
        }
        return echarts.init(el);
    },

    fmt(n, digits) {
        if (n === null || n === undefined || isNaN(n)) return '--';
        return Number(n).toFixed(digits === undefined ? 1 : digits);
    },

    clock(iso) {
        const d = iso ? new Date(iso.replace(' ', 'T') + 'Z') : new Date();
        return isNaN(d) ? '--' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    },

    /* Age of a reading in seconds, or null if unparseable. */
    ageSeconds(iso) {
        if (!iso) return null;
        const d = new Date(iso.replace(' ', 'T') + 'Z');
        return isNaN(d) ? null : (Date.now() - d.getTime()) / 1000;
    },

    /* ---- the tank -------------------------------------------------------
       SVG geometry: the bottle interior runs y=68 (under the lid frame) to
       y=262 (floor) for tank.depth_cm. Keep in step with the markup. */
    TOP_Y: 68,
    BOT_Y: 262,
    SURFACE_BASE_Y: 118.5,

    renderTank(tank) {
        const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
        if (!tank) return;

        const pxPerCm = (this.BOT_Y - this.TOP_Y) / tank.depth_cm;
        const gap = tank.distance_cm;

        if (gap === null || gap === undefined) {
            set('wsTankValue', el => el.textContent = '--');
            set('wsTankNote', el => {
                el.textContent = 'No distance reading from Vatnsmagn.';
                el.className = 'ws-note warn';
            });
            return;
        }

        set('wsGapLabel', el => el.textContent = Math.round(gap) + 'cm');

        const surfaceY = this.TOP_Y + gap * pxPerCm;
        set('wsFill', el => {
            el.setAttribute('y', surfaceY);
            el.setAttribute('height', Math.max(0, this.BOT_Y - surfaceY));
        });
        set('wsSurface', el =>
            el.setAttribute('transform', 'translate(0,' + (surfaceY - this.SURFACE_BASE_Y) + ')'));

        // Staleness outranks everything: if the device stopped reporting, the
        // number on screen is history, not a level. Showing it plainly is how
        // you avoid trusting a volume from half an hour ago.
        const age = this.ageSeconds(tank.last_reading);
        if (age !== null && age > 300) {
            const mins = Math.round(age / 60);
            set('wsTankValue', el => el.textContent =
                tank.clamped ? tank.litres + '–' + tank.litres_max : tank.litres);
            set('wsTankUnit', el => el.textContent = 'L  ·  last known');
            set('wsTankNote', el => {
                el.innerHTML = '<strong>No readings for ' +
                    (mins >= 90 ? Math.round(mins / 60) + ' hours' : mins + ' minutes') +
                    '.</strong> The device has stopped reporting, so this is the last known ' +
                    'value, not the current level.';
                el.className = 'ws-note warn';
            });
            return;
        }

        // A frozen reading beats every other interpretation: if the probe has
        // stopped measuring, the volume shown is meaningless regardless of
        // whether it happens to be clamped.
        if (tank.suspect) {
            const h = tank.frozen_hours;
            set('wsTankValue', el => el.textContent = '?');
            set('wsTankUnit', el => el.textContent = '');
            set('wsTankNote', el => {
                el.innerHTML = '<strong>Level sensor is not measuring.</strong> Reading has been ' +
                    'frozen at exactly ' + tank.distance_cm + '&nbsp;cm for ' +
                    (h >= 24 ? Math.round(h / 24) + ' days' : Math.round(h) + ' hours') +
                    ' &mdash; a real level drifts. Something is returning an echo inside the ' +
                    tank.blind_cm + '&nbsp;cm minimum range: condensation on the transducer face, ' +
                    'or an obstruction. Volume below is not trustworthy.';
                el.className = 'ws-note warn';
            });
            return;
        }

        if (tank.clamped) {
            // Bounded above by the overflow, not by nominal capacity: the tank
            // physically cannot hold more than the overflow height.
            set('wsTankValue', el => el.textContent = tank.litres + '–' + tank.litres_max);
            set('wsTankUnit', el => el.textContent = 'L');
            set('wsTankNote', el => {
                el.innerHTML = 'Surface is above the sensor\'s ' + tank.blind_cm +
                    '&nbsp;cm limit, and capped by the overflow at ' + tank.capacity_working +
                    '&nbsp;L &mdash; so the volume sits somewhere in a ' + tank.unresolved_litres +
                    '&nbsp;L band. Exact metering resumes once the level drops below the blind limit.';
                el.className = 'ws-note warn';
            });
        } else {
            const pct = Math.round(tank.litres / tank.capacity_working * 100);
            set('wsTankValue', el => el.textContent = tank.litres);
            set('wsTankUnit', el => el.textContent = 'L · ' + pct + '%');
            set('wsTankNote', el => {
                el.textContent = this.fmt(gap) + ' cm to the surface · ' +
                    tank.litres_per_cm + ' L per cm · ' + tank.capacity_working + ' L working capacity';
                el.className = 'ws-note';
            });
        }
    },

    /* ---- freshness ------------------------------------------------------ */
    setStatus(elId, dotId, lastReading, countText) {
        const age = this.ageSeconds(lastReading);
        const dot = document.getElementById(dotId);
        const txt = document.getElementById(elId);
        if (!dot || !txt) return;

        dot.className = 'ws-dot';
        if (age === null)      { txt.textContent = countText; }
        else if (age > 900)    { dot.classList.add('down');  txt.textContent = 'no readings for ' + Math.round(age / 60) + ' min'; }
        else if (age > 300)    { dot.classList.add('stale'); txt.textContent = 'last reading ' + Math.round(age / 60) + ' min ago'; }
        else                   { txt.textContent = countText; }
    }
};
