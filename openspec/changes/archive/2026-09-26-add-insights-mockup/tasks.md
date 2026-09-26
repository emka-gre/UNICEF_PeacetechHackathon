## 1. Generator

- [x] 1.1 Create `insights-mockup/` with `README.md` and `generate.mjs` (seeded mulberry32 PRNG, `--seed=N` flag), and add `"mock:generate"` to the root `package.json`; verify `npm run mock:generate` runs with bare Node and no new dependencies
- [x] 1.2 Add the value tables (16 voivodeships with weights, categories, narratives, platforms, languages, target types, age bands, evidence types, statuses) and the baseline weekly generator (about 35 growing to 50 per week, 1 Oct 2025 to 30 Sep 2026); verify weekly totals grow from the first to the last quarter
- [x] 1.3 Add the conditional draws (narrative → category → platform → language; in-person reports get a place and no platform or link cluster); verify by printing a category x platform table and checking that deepfakes lean to TikTok/Instagram and lures to Telegram/classifieds
- [x] 1.4 Add status and hours-to-review logic (more pending in the last 6 weeks, more rejected or "needs more info" for description-only evidence, slower reviews during pattern B); verify the status mix is mostly verified
- [x] 1.5 Add paraphrased description templates per narrative and in-person category; verify with a regex check that no description contains a URL, an @-handle or a capitalised personal name, and read the templates once by hand for slurs or explicit wording

## 2. Planted patterns and outputs

- [x] 2.1 Add pattern A (abusing-benefits spike, 9 Feb to 8 Mar 2026, X/Facebook, mostly Mazowieckie); verify its weekly count is at least 3x the previous 8-week average
- [x] 2.2 Add pattern B (45 reports, 14 to 16 Apr 2026, 3 shared link clusters, stolen photos and fake profiles, TikTok/Instagram); verify all 45 fall within 48 hours
- [x] 2.3 Add pattern C (lure ads 1 Jun to 20 Jul 2026 on Telegram and classifieds, UA/RU, Podkarpackie and Lubelskie, then in-person followed or threatened reports 3 to 4 weeks later in the same voivodeships); verify the lagged rise by printing weekly counts for Lubelskie
- [x] 2.4 Write `data/laaha-poland-synthetic.csv`, `.json`, `.data.js` and `ground-truth.synthetic.csv`, with a synthetic notice in each and pattern labels only in the ground-truth file; verify the total is between 2,000 and 3,000, the CSV and JSON match, and two runs with the default seed give identical files (`shasum`)
- [x] 2.5 Write `data/DATA_CARD.md` (scenario, every column and its values, how it was generated, the three planted patterns, limits, "synthetic only" notice); verify every CSV column is described

## 3. Insights page

- [x] 3.1 Create `index.html`, `styles.css` and `app.js` that load the data through the `.data.js` script, show a fixed "Synthetic demo data" badge, and show generation instructions when the data is missing; verify by opening `index.html` directly from disk, with and without the data file
- [x] 3.2 Add region and mode filters and the headline figures (total, change vs previous period, % verified, active alerts); verify choosing Podkarpackie updates every figure
- [x] 3.3 Add the weekly trend chart stacked by narrative with a trend line (inline SVG); verify the pattern A spike is visible with no filters
- [x] 3.4 Add the category x platform heatmap, the voivodeship breakdown and the target type and age band breakdown; verify heatmap cells match counts from the CSV for two sample cells
- [x] 3.5 Add the three alert rules computed from the filtered rows (thresholds as constants at the top of `analysis.js`) with one-sentence alert cards; verify all three planted patterns are alerted with no filters, and that filtering to a voivodeship without patterns shows none of them
- [x] 3.6 Add the online-to-offline chart (weekly lure reports vs weekly in-person reports for the selected region); verify Lubelskie shows lures rising before in-person reports
- [x] 3.7 Add the download section (CSV, JSON, data card) with the synthetic and ground-truth note; verify each link downloads the right file when served and when opened from disk

## 4. Check

- [x] 4.1 Run `npm run mock:generate` with a different seed and open the page; verify all three alerts still appear, then regenerate with the default seed
- [x] 4.2 Confirm nothing outside `insights-mockup/` changed apart from the one `package.json` script, and that `npm run typecheck` still passes
