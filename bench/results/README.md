# Benchmark results

`before` = `82ec217` (main), `after` = this branch. Production builds, same machine (Apple M1 Max), Chrome for Testing 1217, run back to back. Regenerate with `node compare.mjs results/before.json results/after.json`.

### Lighthouse — mobile, simulated throttling (median of 5 runs)

#### `/`

| Metric | before | after | Δ |
|---|---:|---:|---:|
| Performance score | 85 | 86 | +1% |
| First Contentful Paint | 3153 ms | 3153 ms | +0% |
| Largest Contentful Paint | 3304 ms | 3228 ms | -2% ✅ |
| Speed Index | 3153 ms | 3153 ms | +0% |
| Total Blocking Time | 32 ms | 12 ms | -64% ✅ |
| Cumulative Layout Shift | 0.066 | 0.066 | 0% |
| JS execution (bootup) | 219 ms | 231 ms | +5% ⚠️ |
| Main-thread work | 2062 ms | 1970 ms | -4% ✅ |
| Transfer — total | 520.6 KB | 392.3 KB | -25% ✅ |
| Transfer — JS | 166.6 KB | 148.4 KB | -11% ✅ |
| Transfer — CSS | 23.7 KB | 22.7 KB | -4% ✅ |

#### `/projects`

| Metric | before | after | Δ |
|---|---:|---:|---:|
| Performance score | 91 | 92 | +1% |
| First Contentful Paint | 2703 ms | 2703 ms | +0% |
| Largest Contentful Paint | 2853 ms | 2703 ms | -5% ✅ |
| Speed Index | 2703 ms | 2703 ms | +0% |
| Total Blocking Time | 18 ms | 21 ms | +17% ⚠️ |
| Cumulative Layout Shift | 0.011 | 0.011 | 0% |
| JS execution (bootup) | 197 ms | 197 ms | +0% |
| Main-thread work | 1494 ms | 1436 ms | -4% ✅ |
| Transfer — total | 621.8 KB | 435.8 KB | -30% ✅ |
| Transfer — JS | 153.3 KB | 135.2 KB | -12% ✅ |
| Transfer — CSS | 23.7 KB | 22.7 KB | -4% ✅ |

#### `/field-notes`

| Metric | before | after | Δ |
|---|---:|---:|---:|
| Performance score | 93 | 92 | -1% |
| First Contentful Paint | 2552 ms | 2703 ms | +6% ⚠️ |
| Largest Contentful Paint | 2552 ms | 2703 ms | +6% ⚠️ |
| Speed Index | 2552 ms | 2703 ms | +6% ⚠️ |
| Total Blocking Time | 16 ms | 18 ms | +13% ⚠️ |
| Cumulative Layout Shift | 0.034 | 0.034 | 0% |
| JS execution (bootup) | 251 ms | 268 ms | +7% ⚠️ |
| Main-thread work | 1546 ms | 1515 ms | -2% |
| Transfer — total | 289.2 KB | 287.6 KB | -1% |
| Transfer — JS | 152.9 KB | 152.0 KB | -1% |
| Transfer — CSS | 24.3 KB | 23.3 KB | -4% ✅ |

#### `/field-notes/autocomplete-all-the-way-down`

| Metric | before | after | Δ |
|---|---:|---:|---:|
| Performance score | 92 | 92 | 0% |
| First Contentful Paint | 2703 ms | 2552 ms | -6% ✅ |
| Largest Contentful Paint | 2703 ms | 2702 ms | -0% |
| Speed Index | 2703 ms | 2552 ms | -6% ✅ |
| Total Blocking Time | 11 ms | 11 ms | -5% ✅ |
| Cumulative Layout Shift | 0.000 | 0.000 | 0% |
| JS execution (bootup) | 184 ms | 188 ms | +2% ⚠️ |
| Main-thread work | 1077 ms | 1027 ms | -5% ✅ |
| Transfer — total | 304.6 KB | 303.1 KB | -0% |
| Transfer — JS | 157.1 KB | 156.2 KB | -1% |
| Transfer — CSS | 24.3 KB | 23.3 KB | -4% ✅ |

### Runtime — desktop 1440×900, 4× CPU throttle (median)

| Metric | before | after | Δ |
|---|---:|---:|---:|
| Idle homepage — main-thread busy | 364 ms/s | 274 ms/s | -25% ✅ |
| Idle homepage — style + layout | 75 ms/s | 37 ms/s | -51% ✅ |
| Idle homepage — rAF callbacks (trace) | 13 ms/s | 0 ms/s | −100% ✅ |
| Idle homepage — style recalc (trace) | 76 ms/s | 42 ms/s | -44% ✅ |
| Idle homepage — paint (trace) | 189 ms/s | 177 ms/s | -6% ✅ |
| Idle homepage — layerize (trace) | 122 ms/s | 115 ms/s | -6% ✅ |
| Pointer sweep — main-thread busy | 640 ms/s | 577 ms/s | -10% ✅ |
| Pointer sweep — script | 18 ms/s | 24 ms/s | +35% ⚠️ |
| Scroll — main-thread busy | 570 ms/s | 476 ms/s | -16% ✅ |
| Scroll — p95 frame time | 17 ms | 17 ms | -2% |
| Scroll — dropped frames (>34 ms) | 0.0% | 0.0% | ±0 |
| Client nav / → /field-notes | 226 ms | 216 ms | -4% ✅ |
