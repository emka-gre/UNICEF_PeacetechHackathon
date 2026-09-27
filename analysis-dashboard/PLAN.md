# PoC: Refugee Narrative Monitoring Pipeline

## Brief for implementation

Build a proof-of-concept pipeline and dashboard that detects narratives about Ukrainian refugees in Telegram data, tags how refugees are portrayed, and shows which narratives are rising over time. The intended audience for the dashboard is humanitarian staff (UNICEF framing). This is an evening-scale PoC: prefer the simplest working version of every component. No training of models in this phase; all models are pre-built. A section at the end lists what NOT to build.

---

## 1. Data

Source: "Russian and Ukrainian War-related Telegram Channels" dataset, Zenodo record 16949193, CC-BY 4.0. https://zenodo.org/records/16949193

Files to use (already being downloaded by the user; do not re-download unless asked):

| File | Size | Role |
|---|---|---|
| `post_texts_part_5.csv` | 4.6 GB | The post feed (one part of the full corpus is enough) |
| `channels.csv` | 16 MB | Channel metadata |
| `leiden_clusters.csv` | 1.5 MB | Channel community clusters (real groupings; used instead of geography) |

Important: inspect the actual column headers of each CSV before coding against them. Put the column-name mapping in a single config file so nothing else needs editing if names differ.

The posts are in Ukrainian and Russian. Dates run up to March 2024. The PoC is a historical replay, not live monitoring, and the dashboard should say so.

---

## 2. Project structure

```
refugee-poc/
  config.py          # ALL editable settings: paths, column map, keywords, frames, thresholds
  1_filter.py        # raw CSV -> filtered.parquet
  2_narratives.py    # filtered.parquet -> posts_labelled.parquet + narratives.parquet
  3_frames.py        # adds frame tags to narratives.parquet
  4_trends.py        # posts_labelled.parquet -> trends.parquet with spike flags
  app.py             # Streamlit dashboard
  requirements.txt
  README.md          # method notes + justification lines (section 8)
  data/              # all inputs and outputs live here
```

Dependencies: pandas, pyarrow, scikit-learn, sentence-transformers, transformers, torch, streamlit.

Development rule: first make the whole pipeline run end to end on a slice (`nrows=500_000` in step 1). Only then run on the full file. The dashboard must work off the slice output.

---

## 3. Step 1: filter (`1_filter.py`)

Purpose: extract refugee-related posts from the raw CSV.

- Read the CSV in chunks (200k rows). Expect parsing trouble: text fields contain newlines and odd encodings. Use `on_bad_lines="skip"` and fall back to `engine="python"` if needed. Log how many rows were skipped.
- Keep rows where the text column matches any keyword (case-insensitive substring). Keyword list (substrings, intentionally stemmed):
  - Ukrainian: `біженц, біженк, переселен, виплат, притул, ухилянт, за кордоном, повертатися, українки`
  - Russian: `беженц, беженк, переселен, пособи, убежищ, уклонист, за границей, возвращаться, украинки`
  - Places: `Польщ, Польш, Варшав, Німеччин, Германи, Чехі, Чехи, Берлін, Берлин, Краків, Краков`
- Drop posts shorter than 40 characters.
- Deduplicate: normalise text (lowercase, strip URLs and punctuation, collapse whitespace), hash it, keep first occurrence only. This stops reposts inflating trends later.
- Output `data/filtered.parquet` with exactly these columns: `post_id` (string), `text` (string), `date` (datetime, rows with unparseable dates dropped), `channel` (string).
- Print: rows scanned, rows kept, date range, distinct channels.

Acceptance: runs on the 500k-row slice in under a few minutes; produces a non-empty parquet; a manual look at 20 kept rows shows they are actually about refugees. If almost nothing is kept, widen keywords rather than lowering MIN_CHARS.

---

## 4. Step 2: narratives (`2_narratives.py`)

Purpose: group posts into narratives across the two languages.

- Embed every post text with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, normalized embeddings, batch 64. Save the matrix to `data/embeddings.npy`.
- KMeans, k = 15 (config value), random_state fixed.
- For each cluster produce a narrative record:
  - `narrative_id`
  - `name`: top 4 TF-IDF terms of the cluster (1-2 grams). These will be Ukrainian/Russian words; that is fine.
  - `posts`: cluster size
  - `channels`: distinct channels in cluster
  - `first_seen`, `last_seen`
  - `exemplars`: the 5 posts closest to the centroid (list of strings)
- Outputs: `data/posts_labelled.parquet` (posts + `narrative_id`) and `data/narratives.parquet`.

Acceptance: prints the narrative table; at least half the clusters look thematically coherent when reading exemplars. If clusters are dominated by one giant blob, try k = 20; do not tune beyond two attempts.

---

## 5. Step 3: frames (`3_frames.py`)

Purpose: tag each narrative with how it portrays refugees.

- Model: zero-shot classification pipeline with `MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7`, `multi_label=True`.
- Run on narrative exemplars only (concatenate the 5 exemplars per narrative, truncated to ~1500 chars), NOT on every post. 15 narratives means seconds of compute.
- Hypotheses (pass these exact full sentences as candidate labels; mapping back to short keys for storage):

| key | hypothesis |
|---|---|
| sexualisation | This text portrays refugee women as sexual objects or as sex workers. |
| criminalisation | This text portrays refugees as criminals, violent or dangerous. |
| economic_burden | This text says refugees live on benefits and do not work. |
| job_competition | This text says refugees take jobs, housing or public services from locals. |
| cultural_threat | This text portrays refugees as a threat to national identity or culture. |
| health_threat | This text says refugees bring disease or are a health risk. |
| dehumanisation | This text compares refugees to animals, vermin, disease, a flood or an invasion. |
| disloyalty | This text accuses refugees of cowardice, draft evasion or betraying their country. |

- Attach every frame scoring above 0.55 (config value). Store as a list column `frames` plus a dict column `frame_scores` on `narratives.parquet`.
- Cache raw model outputs to a JSON file so reruns are free.

Acceptance: at least some narratives get sensible tags; spot-check 5 by reading exemplars against tags. If everything scores low, lower the threshold to 0.4 before touching anything else.

---

## 6. Step 4: trends (`4_trends.py`)

Purpose: time series and surge flags per narrative.

- Unit of counting: distinct channels per narrative per day (`groupby(narrative_id, date.dt.date).channel.nunique()`). Never raw post counts. Reindex each narrative to a complete daily range, filling 0.
- Baseline: 28-day rolling mean and std per narrative (min_periods=7).
- `z = (count - rolling_mean) / rolling_std` (guard divide-by-zero). Flag `spike = z >= 2.0`.
- If `leiden_clusters.csv` can be joined to channels: also compute, per narrative per week, the share of activity coming from each channel cluster. A narrative whose activity appears in a new cluster is a "spread" event; flag when a cluster's share goes from under 5% to over 20% within two weeks. If the join is awkward, skip this and leave a TODO; it is optional.
- Output `data/trends.parquet`: `narrative_id, date, channels_active, z, spike` (+ optional cluster shares).

Acceptance: at least a handful of spike days exist; plotting one narrative shows a plausible series, not all zeros.

---

## 7. Dashboard (`app.py`, Streamlit)

Four panels, sidebar navigation. Keep styling minimal but tidy; dark-mode friendly defaults.

1. **Rising narratives** (landing page)
   - Table of narratives ranked by max z over the most recent 60 days of data: name, frame tags, posts, channels, sparkline or last-z.
   - Headline counters: posts analysed, narratives tracked, spikes flagged.
2. **Narrative detail**
   - Selectbox for narrative. Line chart of channels_active over time with spike days marked. Frame tags with scores. Exemplar posts shown verbatim (with a machine-translation note if shown untranslated). First/last seen, channel count.
3. **Check a post**
   - Text input. Embed the input with the same model, cosine against narrative centroids (recompute centroids from embeddings.npy + posts_labelled.parquet, or persist centroids in step 2). Show best-matching narrative, similarity score, and the 3 most similar individual posts.
4. **Method and next steps**
   - Data source and licence, date coverage, the replay caveat.
   - The justification notes from section 8 verbatim.
   - A visually distinct box: "Community reports: not yet connected", displaying the future API contract:

```
POST /api/v1/reports
{
  "report_id": "uuid",
  "received_at": "ISO timestamp",
  "source": "chatbot" | "in_person" | "partner",
  "type": "question" | "offer_check" | "incident" | "observation",
  "language": "uk",
  "region_code": "PL-LU",
  "text": "...",
  "sensitive": true | false
}
```
   - One line under it: sensitive reports are routed to protection staff by the reporting app and never enter this analytics pipeline.

Acceptance: `streamlit run app.py` works against slice-sized outputs with no errors on empty edge cases (narrative with < 7 days of data, etc.).

---

## 8. Method notes to include in README (verbatim, these are the justification lines)

- Zero-shot frame labels stand in for human annotation. In deployment, training data would be labelled by fluent annotators, and this pipeline's outputs are exactly the candidate set that annotation would start from; a fine-tuned multilingual classifier (XLM-R + LoRA) replaces the zero-shot step in the next iteration.
- Trends count distinct channels per day, not posts, so reposts and coordinated bursts cannot fake a rise on their own.
- Channel communities come from the dataset's own Leiden clustering; no geography is invented. Geographic signal arrives in phase 2 from the community reporting app (see API contract), which supplies coarse region codes.
- The corpus ends March 2024, so this is a historical replay demonstrating the method. Live ingestion is a deployment step, not a research gap.
- The corpus is Ukrainian- and Russian-language Telegram, which measures the upstream narrative layer rather than host-community discourse; Polish-language collection is named phase 2 work.

## 9. Ethics and safety constraints

- Analyse channels and narratives, never individuals. Do not store or display author identifiers.
- Show exemplar posts in the dashboard without channel handles.
- If any content sexualising minors is encountered it must not be stored, displayed or labelled; drop and note the count only.
- All data is public and CC-BY licensed; no personal reports are used in this phase.

## 10. Do NOT build

- No live Telegram collection, no Telethon.
- No model training or fine-tuning.
- No LLM API calls; everything runs locally.
- No database; parquet files only.
- No geographic maps.
- No report ingestion endpoint; the contract is displayed, not implemented.

## 11. Definition of done

- [ ] Pipeline runs end to end on a 500k-row slice, then on the full part file.
- [ ] Narratives table readable and mostly coherent.
- [ ] Frames attached with cached scores.
- [ ] Trends parquet has spikes; at least one clear surge visible in the dashboard.
- [ ] All four dashboard panels render, including the reports contract panel.
- [ ] README contains sections 8 and 9.
