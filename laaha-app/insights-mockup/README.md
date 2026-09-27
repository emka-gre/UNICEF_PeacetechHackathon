# Laaha Insights mockup (synthetic data)

A standalone mockup of what UNICEF and Laaha analysts could see once the app has collected reports for a year: trends, where and how harm happens, and alerts for emerging patterns. The scenario is gendered misinformation and hypersexualisation targeting Ukrainian women in Poland.

**Every report here is invented.** Nothing in this folder reads or changes the Laaha app, its server or its data.

## Open the page

Open `index.html` in a browser, straight from disk. No server, build or internet connection is needed.

To serve it instead: `npx serve insights-mockup` or `python3 -m http.server -d insights-mockup`.

## Regenerate the data

```bash
npm run mock:generate                 # default seed, same files every time
npm run mock:generate -- --seed=7     # a different sample with the same planted patterns
```

This writes to `data/`:

| File | What it is |
|---|---|
| `laaha-poland-synthetic.csv` / `.json` | The dataset, about 2,500 reports, 21 columns |
| `laaha-poland-synthetic.data.js` | The same data as a script, so the page works from disk |
| `ground-truth.synthetic.csv` | Which reports belong to which planted pattern. Use it only for scoring |
| `DATA_CARD.md` | Columns, how the data was made, the planted patterns and the limits |

The generated files are committed so the page works straight after cloning. Regenerate after changing `generate.mjs`.

## Files

| File | What it does |
|---|---|
| `generate.mjs` | Seeded generator (plain Node, no dependencies) |
| `analysis.js` | Counts and alert rules, with thresholds at the top. No DOM, so it can be checked from Node |
| `app.js` | Page rendering and hand-drawn SVG charts |
| `index.html`, `styles.css` | The page |
