# Perf bench

Benchmarks a production build (`.output`) by booting the real Nitro server and measuring it with Lighthouse and Playwright. It has its own `package.json` so Lighthouse and Playwright stay out of the app's dependency tree and the Docker image.

```bash
pnpm build                      # from the repo root
cd bench && npm install
node run.mjs --output ../.output --label after --runs 5
node compare.mjs results/before.json results/after.json
```

To get a baseline, build the commit you want to compare against, copy its `.output` somewhere (e.g. `/tmp/before/.output`), and run with `--label before`.

What it measures:

- **Lighthouse**: mobile preset with simulated throttling on `/`, `/projects`, `/field-notes` and one field note. Reports the median of `--runs`.
- **Runtime**: desktop 1440×900 with 4× CPU throttling, via CDP `Performance.getMetrics`:
  - main-thread time on the idle homepage, during a pointer sweep, and while wheel-scrolling top to bottom (plus rAF frame times);
  - click → painted latency for the header's Field Notes link.

Chrome: set `CHROME_PATH`, otherwise the newest Playwright-cached Chrome for Testing is used. Compare runs from the same machine only, since absolute numbers vary between machines.
