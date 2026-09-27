# PoC v2: Monitoring negative narratives about Ukrainian women and girls

## What changed since PLAN.md

The scope moved twice during review, and the pipeline order changes with it:

- **Old scope:** refugee-related posts → cluster → tag frames per cluster.
- **New scope:** any post about **Ukrainian women and girls** → classify per post whether it portrays them **negatively and how** → cluster the negative posts into narratives → trends per frame and per narrative. A `refugee_flag` column marks posts that also mention refugees/being abroad, so the dashboard can switch between "all posts about Ukrainian women" and "explicitly refugee/abroad".

Rationale: hostile refugee tropes ("украинки едут на панель", "наглые беженки на пособиях") circulate about Ukrainian women in general before and while they attach to refugees. Monitoring the wider layer gives earlier warning; the flag preserves the refugee-specific view.

The corpus is now complete: all 8 `post_texts_part_*.csv` files (~48 GB).

## Pipeline (target state)

```
1_filter.py      Stage A  keyword topic filter over all 8 parts  → candidates_all.parquet
2_frames.py      Stage C  per-post zero-shot: gate + negative frames → posts_scored.parquet
3_narratives.py  cluster NEGATIVE posts into narratives          → narratives.parquet, posts_labelled.parquet
4_trends.py      weekly channel counts per frame and narrative   → trends.parquet
app.py           dashboard
```

(Stage B — an embedding pre-gate between A and C — only if Stage A volume makes zero-shot too slow; decide from the scan results.)

## Current status

| Piece | State |
|---|---|
| Stage A scan of all 8 parts | **Running now** (two background jobs; scripts in session scratchpad: `scan_all.py`, `scan_parts.py`, `merge.py`) |
| Seed labels | Done: `data/labels_seed.csv`, 160 posts labelled by Claude (needs a human spot-check; 21 negative examples) |
| Everything else below | To do |

## Step-by-step plan

### 1. Finish Stage A and promote it into the repo — ~1 h

1. When both scans finish, run the merge (`merge.py scan_out`) → `data/candidates_all.parquet` (global dedup, earliest copy kept, per-part stats, year distribution).
2. Copy the scratchpad scan script into the repo as the new `1_filter.py` (argparse: `--parts`, `--nrows`); move its keyword lists into `config.py`, replacing the old KEYWORDS/WOMEN_HARM patterns.
3. Keep what the new filter already fixes — do not regress on these:
   - matches run on raw lowercased text (lookalike-normalised), **raw text is stored**; normalised text is only the dedup key
   - global dedup across parts, not per chunk
   - "Леся Українка"/village-name exclusions; word boundaries on `украинк`
   - **minor-safety drop before anything is written** (girls/minors + sexual terms → count only). This implements the README ethics promise that the old code never did.
4. Sanity-check `candidates_all.parquet`: volume, per-year spread, % refugee_flag, % strong vs cooccur.

### 2. Decide on Stage B — ~30 min, only if needed

If candidates ≳ 100k, zero-shot on all of them is days of CPU. Then: embed all candidates with MiniLM (needed for clustering anyway), write ~20–40 RU/UK seed sentences (hostile + neutral examples), keep posts above a cosine threshold OR strong-term matches, send only those to Stage C. If candidates ≲ 30–50k, skip Stage B.

### 3. Rewrite frames as per-post `2_frames.py` — ~2 h + compute time

- **Gate:** `GATE_LABELS` (negative / neutral / supportive), `multi_label=False`; post is negative if `negative` wins ≥ 0.5. Separately score `VICTIM_LABEL` (victim reports are a protection signal, not a hostile narrative — never mixed into narratives).
- **Frames:** for negative posts only, `NEGATIVE_FRAMES` with `multi_label=True`, attach ≥ 0.55, **store all scores** not just those above threshold.
- Label set (from the labelling round — note `ridicule` was the most common frame, 15/21, and is missing from the current config): sexualisation, gold_digging, economic_burden, job_competition, criminalisation, radicalism, cultural_threat, bad_mothers, betrayal, ridicule, dehumanisation. Drop `women_refugees` (it's a topic, not a frame).
- **Cache keyed by `sha1(model + label-set + text)`** — the current narrative_id-keyed cache is why every narrative has zero frames today. Also delete the `frame_scores`-wiping line and the merge that crashes on rerun (`frames_x/frames_y`).
- Batch the classifier calls; run on a 500-post slice first to estimate total time.

### 4. Rework clustering `3_narratives.py` — ~1 h

- Input: negative posts only (reuse embeddings from Stage B if computed).
- `k` from data size (e.g. `max(3, n_posts // 40)`), not fixed 15.
- Names: raw TF-IDF terms (**no `strip_accents` — it mangles Cyrillic й/ї**) + dominant frame, e.g. `sexualisation · украинки панель европа`. Drop the tiny hand-made translation map that collapsed 11 of 15 names into duplicates.
- Persist centroids (already done) and keep exemplars as raw text.

### 5. Fix trends `4_trends.py` — ~1 h

- Weekly bins, not daily (sparsity), distinct channels per bin.
- Baseline excludes current bin: `rolling(...).shift(1)`; spike needs `z ≥ 2` **and** a minimum count (e.g. ≥ 3 channels). Today 75 of 82 active days are "spikes" — that's noise, not signal.
- Two outputs: per **narrative** and per **frame** (the frame series is the headline chart).

### 6. Dashboard `app.py` — ~2 h

- Global toggle: all posts / `refugee_flag` only.
- Landing: stacked area of channels-per-week by frame; narrative table ranked over a window that actually contains data (not "last 60 days of a corpus that ends in 2024"); spike counter scoped to the same window.
- Narrative detail: **select by `narrative_id`** with `format_func` for the name (duplicate names currently make 11 of 15 narratives unreachable); show all frame scores; translation runs on raw text (the sentence splitter finally has punctuation to split on).
- Method page: update scope wording; show minor-safety drop count and victim-report count.

### 7. Validation — ~2 h spread out

1. **Human spot-check** ~20 rows of `labels_seed.csv` (it was labelled by Claude, not a human — say so in the README).
2. After step 3: compare zero-shot gate output against the 77 on-topic seed labels → report gate precision/recall in the README. If most hand-labelled negatives come out neutral, reword the `negative` hypothesis or lower the gate threshold before touching anything else.
3. **Recall audit:** run the embedding check over ~20k Stage-A-rejected posts, read the top 50; add missed vocabulary to Stage A and rescan if needed. One line for the README: "keyword recall estimated at X% on a 20k audit."
4. Second labelling round (~150 strong-match posts, Claude-labelled + human spot-check) to get enough negatives per frame.

### 8. Housekeeping — ~30 min

- `git init`; `.gitignore` for `data/`, `.venv/`, `__pycache__/`.
- Pin versions in `requirements.txt`.
- `run_all.sh` running steps in order on a `--nrows` slice, then full.
- README: new scope, gate/frame method, validation numbers, ethics section pointing at the *implemented* minor-safety drop, hash channel names before display.

## Definition of done (v2)

- [ ] Stage A candidates from all 8 parts, deduped, with year spread and refugee_flag.
- [ ] Per-post gate + frame scores with content-keyed cache; rerun-safe.
- [ ] Gate precision/recall vs seed labels reported.
- [ ] Narratives built from negative posts only; every narrative reachable in the dashboard.
- [ ] Weekly trends per frame and narrative; spikes are rare and eyeball-plausible.
- [ ] Dashboard toggle all ↔ refugee-flagged; minor-safety and victim counts shown.
- [ ] README updated; repo under git.

## Explicitly out of scope (unchanged from PLAN.md)

No live Telegram collection, no model training (XLM-R + LoRA is the named next phase, using the labels this PoC produces), no LLM API calls, no database, no maps, no report-ingestion endpoint.
