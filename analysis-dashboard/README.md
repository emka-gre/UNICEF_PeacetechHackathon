# Laaha Analysis Dashboard

Proof of concept for monitoring hostile narratives about Ukrainian women and girls in Russian- and Ukrainian-language Telegram, shown next to (synthetic) community reports from the Laaha app.

The pipeline scans about 80 million Telegram posts (2015 to March 2024), keeps those about Ukrainian women, flags the ones that portray them in an overtly hostile way, and classifies them into six themes: contempt, sexualisation, extremism, criminality, burden, and betrayal & bad mothers. The dashboard shows how each theme rises and falls per week or month.

This is a historical replay for monitoring and analysis, not a forecast, and not a fact-check: many posts retell real events with a hostile framing, and the system does not judge whether a post is true.

## Quick start: the dashboard

In the team repository this project lives in the `analysis-dashboard/` folder. Run every command below from that folder, because the dashboard theme in `.streamlit/config.toml` is only picked up there.

```bash
cd analysis-dashboard
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

**Only the Overview page works straight after cloning.** The repository includes one data file, `data/trends.parquet` (weekly and monthly counts per theme, with no post text and no channel identifiers), which is all the Overview needs. The Laaha chart uses synthetic example data generated in `laaha_demo.py`, because the Laaha app is not connected yet.

The other pages (Theme explorer, Check a post, Method and limits) need the pipeline outputs, which are not in the repository. They show a message saying so until you run the pipeline below.

## Full pipeline (needs the downloaded data)

1. Download the dataset *Russian and Ukrainian War-related Telegram Channels* (Zenodo record [16949193](https://zenodo.org/records/16949193), CC-BY 4.0) and place `post_texts_part_1.csv` … `post_texts_part_8.csv` in `data/`. They total about 48 GB.
2. Obtain the labelled set `data/labels_seed.csv` from the project owner. It is not in the repository because it contains the text of hostile posts.
3. Run:

```bash
python 1_filter.py     # ~15 min on 8 cores: 80M posts -> ~300k about Ukrainian women; applies the minor-safety rule
python 2_classify.py   # trains on data/labels_seed.csv and scores every candidate (~50 min first run on an Apple GPU)
python 3_trends.py     # weekly and monthly trends, example posts, lead-lag analysis
streamlit run app.py
```

If the dashboard was already open, clear its cache (press **C**, then **R**) after re-running the pipeline.

| File | Role |
|---|---|
| `config.py` | all settings: keywords, safety rule, themes, thresholds |
| `textrules.py` | shared text rules: normalisation, topic match, minor-safety rule, slur and overt-hostility flags |
| `1_filter.py`, `2_classify.py`, `3_trends.py` | the three pipeline steps |
| `app.py` | Streamlit dashboard; theme in `.streamlit/config.toml` |
| `laaha_demo.py` | synthetic Laaha report counts (placeholder until the app is connected) |
| `CODEBOOK.md` | theme definitions used for labelling |
| `tools/sample_for_labelling.py` | draws batches of posts for labelling |
| `legacy/` | the first version of the pipeline, kept for reference |

## Method notes

- Posts about Ukrainian women are found with keyword rules (strong terms and slurs, or a word for women near a Ukrainian marker). Each post is embedded with `BAAI/bge-m3`; logistic-regression classifiers trained on labelled examples decide whether it portrays Ukrainian women negatively, and which themes apply.
- The dashboard counts overt hostility only: posts with a slur, an insult or a mocking emoji. News-style posts that retell events with a negative framing are scored but not counted.
- The negative-portrayal classifier is tuned for precision: on a weighted sample, about 8 in 10 flagged posts are hostile, and it catches an estimated quarter of all hostile posts.
- Labels were produced by Claude against `CODEBOOK.md` and have not been validated by a human annotator. All accuracy figures measure agreement with those labels. A human-validated set and a fine-tuned multilingual model are the next step.
- Spikes are weeks (or months) when a theme's share of active channels is at least 2 standard deviations above its recent baseline. Using channel shares, not raw posts, stops one channel's burst or the growth of the corpus from creating a spike.
- The corpus is Ukrainian- and Russian-language Telegram, which measures the upstream narrative layer rather than discourse in host countries.

## Ethics and safety

- Channels and narratives are analysed, never individuals. Example posts are shown without channel names.
- Posts pairing a clear sign of a minor with sexual terms are dropped before their text is stored. Only date, channel and trigger type are kept locally, and only the counts are shown.
- Neither post text nor channel identifiers are committed to this repository.
- Laaha reports would reach the dashboard only as aggregate counts per category and period, never as report text or personal details.
