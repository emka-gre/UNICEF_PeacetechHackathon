## Context

See proposal.md for motivation. The repo is a Vite + React PWA with an Express server (`tsx`, Node 24). The existing staff dashboard and export use `src/shared.ts` and `server/data/db.json`. This mockup must stay fully apart from both: it does not import app code, share types, or read app data. Requirements are in `specs/synthetic-report-dataset` and `specs/insights-mockup-page`.

## Goals / Non-Goals

**Goals:**
- Anyone can clone the repo, run one command and open one page, with no API key, network or server.
- The dataset is useful outside the page (pandas, R, Excel, sklearn), with labels kept apart for honest model evaluation.
- The page finds the planted patterns with simple, explainable rules.

**Non-Goals:**
- Statistical realism beyond "plausible to a domain expert". The numbers are illustrative, not calibrated to real Polish data.
- Reusing the app's React components, styles or build.
- Production-quality charts or accessibility audits. It is a mockup.

## Decisions

### Folder layout
```
insights-mockup/
  README.md             how to generate and open
  generate.mjs          the generator (plain Node ESM, no dependencies)
  index.html            the page
  analysis.js           counts and alert rules, no DOM (checkable from Node)
  app.js                page rendering and charts
  styles.css
  data/                 generated, committed so the page works straight after clone
    laaha-poland-synthetic.csv
    laaha-poland-synthetic.json
    laaha-poland-synthetic.data.js    (same data as `window.MOCK_DATA = ...`)
    ground-truth.synthetic.csv        report_id,pattern
    DATA_CARD.md
```
One npm script in the root `package.json`: `"mock:generate": "node insights-mockup/generate.mjs"` (optional `--seed=N`). This is the only line outside the folder.

- *Why a separate folder, not a route in the app*: the user asked for it to be separate. It also avoids touching the app's schema, auth and build.
- *Why plain `.mjs`, not TypeScript*: it runs with bare `node` and needs no `tsx` or `tsconfig` changes. The app's `tsc --noEmit` does not pick it up.

### Page runs from `file://`
The page loads the data through a `<script src="data/...data.js">` tag, not `fetch`, so opening `index.html` directly from disk works (browsers block `fetch` on `file://`). The same folder can also be served with any static server.

- *Alternative*: a small Vite app. Rejected because it needs a build step and more dependencies for one page.

### Charts: hand-rolled inline SVG, no CDN
Four chart types are needed (stacked weekly area/bars, heatmap, horizontal bars, two-line comparison). Hand-written SVG keeps the page offline and dependency-free.

- *Alternative*: Chart.js from a CDN. Rejected because it breaks offline use and adds a network dependency to a privacy-themed demo.

### Seeded random numbers
A small seeded PRNG (mulberry32) inside the generator. `Math.random` is never used, so output is byte-identical for a seed. Rows are sorted by date, then id, and ids are derived from the seed (`PL-000123`), not UUIDs.

### Generation model
1. **Baseline**: for each week, draw a count around a mean that grows from about 35 to 50 per week. Spread over weekdays with a slight weekday bias.
2. **Per report**: draw mode (about 75% online), then region from voivodeship weights (Mazowieckie, Małopolskie, Dolnośląskie, Podkarpackie, Lubelskie, Pomorskie, Wielkopolskie, Śląskie weighted high; the rest low), then narrative, then a category conditioned on narrative, then a platform conditioned on category, then language conditioned on platform and narrative. Use small weight tables, not a full joint distribution.
3. **Planted patterns** are added as extra reports on top of the baseline, each labelled in ground truth:
   - A: weeks of 9 Feb to 8 Mar 2026, "abusing benefits" narrative, category "False claim to discredit", X/Facebook, about 70% Mazowieckie, PL.
   - B: 45 reports between 14 and 16 Apr 2026, 3 link clusters (ordinary-looking `LC-nnnnn` ids, so the id does not give the pattern away), "Manipulated image or video", "Stolen photos / fake profiles" narrative, TikTok/Instagram, spread nationally.
   - C: lure reports from 1 Jun to 20 Jul 2026, Telegram/classifieds, UA/RU, Podkarpackie and Lubelskie; then extra in-person "Being followed or watched" and "Threats or intimidation" reports in the same voivodeships from about 3 to 4 weeks after each lure week.
4. **Status and review time**: verified by default; pending probability rises for the last 6 weeks; rejected or "needs more info" is more likely when evidence type is description only. Hours to review are drawn from a skewed distribution and are longer during pattern B (moderator overload, a secondary signal).
5. **Descriptions**: chosen from per-narrative paraphrase templates with a few slot fillers (platform, place, kind of offer). No slurs, no explicit wording, no URLs, handles or names. Link cluster ids stand in for links.

### Category and narrative values
Kept inside the mockup (not added to `src/shared.ts`). Categories: the app's existing online and in-person categories plus "Sexualised content or stereotypes" and "Fake job, housing or relationship offer". Narratives: "Came to seduce / steal husbands", "Available women / brides", "Sex work stereotypes", "Abusing benefits / taking jobs", "Criminal or dangerous", "Fake offers (lures)", "Stolen photos / fake profiles", and "None (in-person)". Platforms: Instagram, TikTok, Facebook, X, Telegram, Classifieds site, WhatsApp, Other.

### Alert rules on the page
Computed in the browser from the filtered rows:
- **Spike**: for each narrative and week, count ≥ 3x the mean of the previous 8 weeks and ≥ 15 reports. The usual level is fixed when a rise starts; a rise needs at least 2 hot weeks and may contain 1 quiet week, so one noisy week is never an alert and a rise with a dip stays one alert. Reports that belong to a detected campaign are left out, so a campaign is not reported twice.
- **Campaign**: for each link cluster, a sliding 72-hour window with ≥ 20 reports. Other links reported at least 3 times in the same window are counted as part of that campaign. The generator splits pattern B 22 / 13 / 10 across its three links so the main link always clears the threshold.
- **Online to offline**: for each voivodeship, compare lure reports in weeks t to t+3 with in-person reports in weeks t+3 to t+7 against that region's baseline. Alert when both are ≥ 2x baseline.

Thresholds are constants at the top of `analysis.js`, so they are easy to explain and tune.

## Risks / Trade-offs

- [Synthetic data read as real findings] → A fixed "Synthetic demo data" badge on the page, "synthetic" in every file name, a header line in the CSV comment and the data card, and a data card "Limits" section.
- [Sensitive scenario, real community] → Paraphrased templates reviewed once by hand. Fictional triggers. Nothing attributed to real actors. No individual risk scoring.
- [Alert rules tuned to planted data look too perfect] → The data card says the thresholds were chosen for this dataset and would need tuning on real data. A different seed still keeps the patterns, which gives a light robustness check.
- [Committed generated data drifts from the generator] → The README says to regenerate after changing `generate.mjs`. The seeded output makes diffs clean.
- [Hand-rolled SVG takes longer than a library] → Keep charts minimal (no animations, simple hover titles via `<title>`).

## Open Questions

- Should the data card include a short example notebook snippet (pandas load plus one groupby)? This can be added later without changing anything else.
