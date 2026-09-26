## Why

The Laaha app collects reports one at a time, and the staff dashboard is built for moderating them one at a time. UNICEF and Laaha analysts need the other view: what is happening across all reports, where, whether it is growing, and how online harm connects to offline risk. We have only a handful of test reports, so we cannot show that view, or give researchers anything to analyse or train models on, without a realistic synthetic dataset.

## What Changes

- **Standalone mockup, separate from the app**: a new top-level `insights-mockup/` folder with its own generator and page. It does not import from, change, or run inside the existing app, server or data.
- **Synthetic dataset generator**: a seeded, repeatable Node script that writes about 2,500 fictional reports over 12 months (October 2025 to September 2026) as CSV and JSON, plus a data card.
- **Scenario: Ukrainian women in Poland**: reports describe gendered misinformation and hypersexualisation aimed at Ukrainian women living in Poland, with regions at voivodeship level, content language, platform (including Telegram and classifieds sites), category and narrative.
- **Planted patterns**: the generator hides three documented patterns (a narrative spike, a coordinated campaign, and online lure ads followed by in-person harm in the same regions) so analysts and models can be checked against a known ground truth.
- **Insights page**: one static page for analysts with headline numbers, weekly trend by narrative, category by platform heatmap, region breakdown, alert cards for the planted patterns, and download links for the dataset and data card. It is always labelled as synthetic demo data.

### Out of scope

- Any change to the existing app, its report form, `src/shared.ts`, the server, the staff dashboard or `server/data/db.json`
- Reading real reports
- Trained models or notebooks (the CSV is ready for them, but none are included)
- An "ask the data" assistant

## Capabilities

### New Capabilities
- `synthetic-report-dataset`: seeded generation of a fictional Poland report dataset with a fixed schema, planted patterns, paraphrased descriptions, and a data card
- `insights-mockup-page`: a standalone analyst page that visualises the synthetic dataset, shows alerts for the planted patterns, and offers the dataset for download

### Modified Capabilities
<!-- None. The existing app is not touched. -->

## Safety, Privacy and Ethics

- **Synthetic only**: every row is generated. The page, the CSV header comment, the file names and the data card say so. Synthetic and real data are never combined.
- **Fictional triggers**: the spike and campaign are described generically ("a benefits-policy debate", "a coordinated campaign"). They are not tied to real Polish events, and no real state, group or person is named as a source.
- **No harmful text**: descriptions paraphrase the content ("Post claims Ukrainian women come to Poland to find husbands") and never contain slurs, explicit wording, or real links, handles or names.
- **Aggregate insights only**: the page shows trends and patterns, not risk predictions about individual women.

## Impact

- New folder `insights-mockup/` (generator script, page, generated data, data card)
- New npm script to run the generator; no new dependencies
- No change to existing code, APIs or data
