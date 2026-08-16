# Vatnskerfi — water-system pages

Three pages under `/water-system`, served by the read-only `dashboard` app on port 5006.

| Route | Template | Shows |
|---|---|---|
| `/water-system` | `water_system.html` | Tank volume, water used today, temperature spread |
| `/water-system/usage` | `water_usage.html` | Meter vs level outflow, rainwater collected, charts |
| `/water-system/temperature` | `water_temperature.html` | All five probes graphed |

Shared assets: `static/css/water_system.css`, `static/js/water_system.js`.
Query layer: `db_ro.py`. Charts: ECharts 5.4.3.

---

## Tank model

Standard 1000 L IBC tote. All constants live in `TANK` in `db_ro.py`.

| Constant | Value | Basis |
|---|---|---|
| `litres` | 1000 | Nominal IBC capacity |
| `depth_cm` | 96 | **Observed.** Deepest reading ever recorded is 96.7 cm, which matches the IBC spec |
| `blind_cm` | 25 | JSN-SR04T minimum range |
| `overflow_cm` | 15 | **ASSUMPTION — still to be measured** |

Derived: **10.42 L per cm**, working capacity **844 L**.

### Why the reading is a range, not a number

The probe is mounted on the lid, so its 25 cm blind zone sits *inside* the tank. The overflow
also sits inside that band, which means:

- Water can never rise above the overflow — most of the blind zone is unreachable.
- The genuinely unresolvable volume is only the **overflow-to-blind band, ~104 L**, not the
  whole 260 L blind zone.
- While the surface is above the blind limit the page reports **`740–844 L`**, bounded above by
  the overflow rather than by nominal capacity.

**Working capacity is 844 L, not 1000 L.** The nominal figure is the bottle's volume; the
overflow caps what you can actually hold.

`overflow_cm` is the only guess left in the model. Measure lid-to-overflow and every derived
figure — working capacity, the unresolved band, the level chart ceiling — corrects itself.

---

## Level differencing — read this before touching the constants

Turning a distance series into litres in and out is the most failure-prone part of this feature.
Every bug it had produced *plausible-looking numbers rather than an error*, which is the
dangerous kind. Pinned by `tests/test_level_accumulate.py` (15 tests).

### The sensor does not drift — it flips

Measured across 2026-08-01: of 1865 consecutive deltas, **1539 were exactly 0**, 252 under 1 cm,
and **65 in the 1–2 cm band**. It alternates between quantised values (e.g. 27.6 ↔ 29.4 cm).
At 10.42 L/cm each flip books ~19 L, so naive differencing reported a tank that never moved as
shifting **~650 L in a day**.

### The guards, and why each value is what it is

| Constant | Value | Why |
|---|---|---|
| `LEVEL_MEDIAN_WINDOW_SECONDS` | 600 | Median-filter before differencing. A mean would sit between two values the sensor never actually reported |
| `LEVEL_DEADBAND_CM` | 2.0 | **Swept empirically.** Below 2.0 the pure-noise fixture leaks ~430 L, because median filtering alone does not kill flipping — window sample counts vary, so the median itself flips. At 2.0 noise reads exactly 0 and a real drawdown still captures ~89%. Raising to 2.5 buys no extra rejection and drops capture to ~83% |
| `LEVEL_MAX_STEP_CM` | 8.0 | Peak flow ever recorded is 88.7 L/min ≈ 5 cm per reading interval. Anything larger is the sensor being handled, not water. On 2026-08-01 18:00 it jumped 51.4 → 96.7 cm during install, worth 470 L of phantom usage |
| `LEVEL_MAX_GAP_SECONDS` | 3 × window | Must be **larger than the median window**. Set equal, and every pair is discarded as a gap, because after filtering samples are exactly one window apart |

### Bugs to not reintroduce

1. **Continuity is a property of consecutive samples, not of the reference.** Measuring the gap
   from the reference treats a level that legitimately held steady for half an hour as a hole in
   the data, wiping accumulated drift.
2. **Rises are rain, not negative usage.** Falls and rises accumulate separately. `start − end`
   would under-report usage on a rainy day, or go negative.
3. **Clamped readings carry no information.** All identical, so they are excluded — not treated
   as a level.

### Known limitations, by design

- **Under-reports by up to ~21 L per period.** Changes below the deadband are never committed.
  Deliberately conservative: better to miss real usage than to invent any.
- **Collection under-reports when the tank is near full.** Rain arriving on a full tank leaves by
  the overflow without ever moving the measurable level — so collection reads low in exactly the
  conditions that produce the most rain.
- **Nothing is derivable while the level sits in the blind band.** The pages say so explicitly
  rather than showing a 0 that reads as "no water moved".

---

## Flow meter

`total_liters` is a **cumulative counter that resets** — 29 times so far. Usage is the sum of
*positive deltas only*; `MAX − MIN` would be wrong. Applies to both `get_water_summary` and
`get_hourly_usage`.

---

## Temperature

Series come from `readings`, bucketed on the fly — **never from `hourly_data`**. That table's
`hour_start` values are inconsistent (some carry a `+00:00` suffix, some are not hour boundaries
at all, e.g. `2025-11-01 22:47:09.696812`) and coverage is erratic. Note `get_device_history()`
still reads it for its week/month/year tiers, so the older `/sensors` chart has this problem.

Buckets keep any range near ~600 points: 300 s (24h), 1800 s (7d), 7200 s (30d). At 99
readings/hour/sensor a raw week would be ~16k points per series.

The overview's aggregate low/avg/high is paired with a **range bar carrying one dot per sensor**,
so the aggregate can be broken down — otherwise it mixes an outdoor probe with a pump housing and
describes no single physical thing.

---

## Conventions

- **Never key code by display name.** Names live in `device_settings.display_name`, change, and
  are not unique — the retired `SHT31_Bus0_0x44` also holds `Dæla`. Key by `sensor_id`. An
  earlier rename broke a chart lookup exactly this way.
- **Sensor colours are literal hex in `WS_SENSORS`**, never CSS-variable lookups. A lookup that
  resolves empty hands the series to ECharts' default palette, and lines stop matching their
  legend swatches.
- **Everything else uses `var(--…)` tokens** so the pages survive four accent themes × light/dark.
- **ECharts measures its container at init**, so a chart built inside a hidden element gets a 0×0
  canvas.
- Display names are rendered with `textContent`, never `innerHTML` — they come from the database.

## Tests

```
cd /home/ubuntu/dashboard && python3 -m unittest discover -s tests -v
```
