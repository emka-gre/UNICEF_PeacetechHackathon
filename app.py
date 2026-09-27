"""Dashboard: streamlit run app.py"""
from __future__ import annotations

import importlib
import json
import re

import altair as alt
import joblib
import numpy as np
import pandas as pd
import streamlit as st

import config
import laaha_demo
from textrules import is_overt, normalise, topic, unsafe

st.set_page_config(page_title="Laaha Analysis Dashboard", layout="wide")

# UNICEF-style palette, split so the two charts never share colours:
# cool blues/greens for Telegram (real data), warm colours for Laaha (community reports)
TELEGRAM_PALETTE = ["#1CABE2", "#374EA2", "#00833D", "#80BD41", "#0B6E99", "#7A93D6", "#2E9C8F"]
LAAHA_PALETTE = ["#F26A21", "#E2231A", "#961A49", "#FFC20E"]
st.markdown("""
<style>
.laaha-band {background: #1CABE2; color: #FFFFFF; padding: 18px 24px; border-radius: 6px; margin-bottom: 8px;}
.laaha-band .name {font-size: 1.9rem; font-weight: 700; letter-spacing: 0.01em; line-height: 1.1;}
.laaha-band .sub {font-size: 0.95rem; opacity: 0.92; margin-top: 4px;}
</style>""", unsafe_allow_html=True)


def band(subtitle: str) -> None:
    st.markdown(f'<div class="laaha-band"><div class="name">Laaha Analysis Dashboard</div>'
                f'<div class="sub">{subtitle}</div></div>', unsafe_allow_html=True)

SCOPES = {"All posts about Ukrainian women": "all", "Refugee-related": "refugee"}
SERIES = {"negative": "Any negative portrayal", **config.THEME_NAMES}
VIEWS = {"Weekly": "week", "Monthly": "month"}
UNIT = {"week": "week", "month": "month"}
BASELINE = {"week": "previous 12 weeks", "month": "previous 6 months"}
FMT = {"week": "%d %b %Y", "month": "%b %Y"}
DEFINITION = ("Counts posts that portray Ukrainian women negatively. This is not a fact-check: many posts retell real "
              "events with a hostile framing, and the system does not judge whether a post is true.")


# ------------------------------------------------------------------ data
NEEDS_DATA = ("This page needs the pipeline outputs, which are not in the repository. Download the dataset and run "
              "`1_filter.py`, `2_classify.py` and `3_trends.py` (see README).")


@st.cache_data
def load():
    """Only data/trends.parquet ships with the repository (the Overview works out of the box).
    The other files are produced by the pipeline; pages that need them say so if they are missing."""
    def opt(path, reader):
        return reader(path) if path.exists() else None
    trends = pd.read_parquet(config.DATA_DIR / "trends.parquet")
    examples = opt(config.DATA_DIR / "examples.parquet", pd.read_parquet)
    metrics = opt(config.MODEL_DIR / "cv_metrics.json", lambda p: json.load(open(p)))
    leadlag = opt(config.DATA_DIR / "trends_leadlag.json", lambda p: json.load(open(p)))
    safety = opt(config.SAFETY_SUMMARY_PATH, lambda p: json.load(open(p)))       # counts only, no channel ids
    return trends, examples, metrics, leadlag, safety


def confidence(metrics: dict, theme: str) -> tuple[str, float | None]:
    f1 = metrics["themes"]["per_theme"].get(theme, {}).get("f1")
    if f1 is None:
        return "", None
    return ("higher" if f1 >= 0.7 else "medium" if f1 >= 0.55 else "low"), f1


def badge(level: str) -> str:
    return {"higher": ":green-badge[higher confidence]", "medium": ":orange-badge[medium confidence]",
            "low": ":red-badge[low confidence]"}.get(level, "")


def x_axis(domain=None, fmt=None) -> alt.X:
    """Time axis; pass (start, end) so side-by-side charts line up month for month. fmt='%b' shows month names only."""
    scale = alt.Scale(domain=[pd.Timestamp(d).isoformat() for d in domain]) if domain else alt.Undefined
    axis = alt.Axis(format=fmt, labelAngle=0, tickCount={"interval": "month", "step": 1}) if fmt else alt.Undefined
    return alt.X("period:T", title=None, scale=scale, axis=axis)


def period_controls(container, trends: pd.DataFrame, freq: str, key: str):
    """Monthly: one year at a time, default the last 12 months of data. Weekly: a date-range slider.
    Returns (start, end, axis format, label)."""
    periods = [pd.Timestamp(p) for p in sorted(trends.period.unique())]
    last = periods[-1]
    if freq == "month":
        years = sorted({p.year for p in periods if p.year >= 2019}, reverse=True)
        choice = container.selectbox("Year", ["Last 12 months"] + years, key=f"year_{key}")
        if choice == "Last 12 months":
            start, end = last - pd.DateOffset(months=11), last
        else:
            start, end = pd.Timestamp(f"{choice}-01-01"), min(pd.Timestamp(f"{choice}-12-01"), last)
        return start, end, "%b", f"{start:%b %Y} – {end:%b %Y}"
    first = next(p for p in periods if p >= pd.Timestamp("2021-01-01"))
    start, end = container.select_slider("Period", options=periods, value=(first, last), key=f"range_{key}",
                                         format_func=lambda d: pd.Timestamp(d).strftime("%d %b"))   # no year
    return start, end, None, f"{start:%b %Y} – {end:%b %Y}"


def legend(names: list[str], palette: list[str], dashed: bool = False) -> str:
    """HTML legend that wraps like text (Vega legends in narrow columns stack awkwardly)."""
    line = "border-top: 2px dashed {c}; width: 16px;" if dashed else "background: {c}; width: 10px; height: 10px; border-radius: 50%;"
    items = "".join(
        f'<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;white-space:nowrap;">'
        f'<span style="display:inline-block;{line.format(c=palette[i % len(palette)])}"></span>{n}</span>'
        for i, n in enumerate(names))
    return f'<div style="font-size:0.85rem;color:#5B6B7B;line-height:1.9;margin-top:-6px;">{items}</div>'


def trend_chart(df: pd.DataFrame, color_field: str, title: str, freq: str, domain=None,
                height: int = 340, fmt=None) -> alt.Chart:
    base = alt.Chart(df).encode(
        x=x_axis(domain, fmt),
        y=alt.Y("posts:Q", title="Hostile posts", axis=alt.Axis(minExtent=34)),
        color=alt.Color(f"{color_field}:N", legend=None,
                        scale=alt.Scale(domain=list(dict.fromkeys(df[color_field])),
                                        range=TELEGRAM_PALETTE)),
        tooltip=[alt.Tooltip("period:T", title="Week of" if freq == "week" else "Month",
                             format="%d %b %Y" if freq == "week" else "%b %Y"),
                 alt.Tooltip(f"{color_field}:N", title="Series"),
                 alt.Tooltip("posts:Q", title="Hostile posts"), alt.Tooltip("channels:Q", title="Channels"),
                 alt.Tooltip("share:Q", title="Share of channels", format=".1%"),
                 alt.Tooltip("z:Q", title=f"z vs {BASELINE[freq]}", format=".1f")])
    lines = base.mark_line(strokeWidth=1.6)
    spikes = base.transform_filter("datum.spike").mark_point(filled=True, size=45)
    return (lines + spikes).properties(height=height)


def laaha_chart(df: pd.DataFrame, freq: str, domain=None, height: int = 300, fmt=None) -> alt.Chart:
    unit = UNIT[freq]
    base = alt.Chart(df).encode(
        x=x_axis(domain, fmt),
        # keep this title short: a long vertical axis title plus a bottom legend collapses the plot in Streamlit
        y=alt.Y("reports:Q", title="Reports (example)", axis=alt.Axis(minExtent=34)),
        color=alt.Color("category_name:N", legend=None,
                        scale=alt.Scale(domain=list(dict.fromkeys(df["category_name"])), range=LAAHA_PALETTE)),
        tooltip=[alt.Tooltip("period:T", title="Week of" if freq == "week" else "Month",
                             format="%d %b %Y" if freq == "week" else "%b %Y"),
                 alt.Tooltip("category_name:N", title="Category"),
                 alt.Tooltip("reports:Q", title="Reports (synthetic)"),
                 alt.Tooltip("z:Q", title=f"z vs {BASELINE[freq]}", format=".1f")])
    lines = base.mark_line(strokeWidth=1.6, strokeDash=[5, 3])        # dashed: not real data
    spikes = base.transform_filter("datum.spike").mark_point(filled=True, size=45)
    return (lines + spikes).properties(height=height)


CHART_HEIGHT = 320


def laaha_data(freq: str, cats: list[str], start, end) -> pd.DataFrame:
    df = laaha_demo.synthetic_reports(freq)
    df = df[df.category.isin(cats) & df.period.between(start, end)]
    return df.astype({"reports": float})     # int64 reaches the browser as BigInt, which Vega cannot scale


# ------------------------------------------------------------------ pages
def page_overview(trends):
    band("Telegram data: hostile narratives about Ukrainian women")
    st.caption("Historical replay of Russian- and Ukrainian-language Telegram, 2017 to March 2024. "
               "Monitoring and analysis, not a forecast. " + DEFINITION)
    view_col, period_col, _ = st.columns([1, 1.4, 1.6], vertical_alignment="bottom")   # one tidy control row
    freq = VIEWS[view_col.radio("View", list(VIEWS), horizontal=True, key="view_overview")]
    layer = "overt"                       # dashboard shows overt hostility only (see Method and limits)
    trends = trends[trends.freq == freq]

    start, end, fmt, span = period_controls(period_col, trends, freq, "overview")
    # Laid out row by row (not as two independent columns) so both charts start at the same height,
    # whatever wraps in the pickers above them.
    def row():
        return st.columns(2, gap="large")

    l, r = row()
    l.subheader("Telegram data")
    l.markdown(":blue-badge[real data]")
    r.subheader("Laaha reports")
    r.markdown(":orange-badge[synthetic example data]")

    l, r = row()
    chosen = l.multiselect("Themes", list(config.THEMES), default=["sexualisation_men", "criminality", "extremism"],
                           format_func=lambda t: config.THEME_NAMES[t])
    cats = r.multiselect("Report categories", list(laaha_demo.CATEGORIES), default=list(laaha_demo.CATEGORIES),
                         format_func=laaha_demo.CATEGORIES.get, key="laaha_cats")

    l, r = row()
    l.markdown(f"**Hostile posts per {UNIT[freq]}, by theme**")
    r.markdown(f"**Reports per {UNIT[freq]}, by category** (synthetic)")

    df = trends[(trends.scope == "all") & (trends.layer == layer) & trends.series.isin(chosen)
                & trends.period.between(start, end)].copy()
    df["theme"] = df.series.map(SERIES)
    df = df.astype({"posts": float, "channels": float})     # avoid int64 -> BigInt in the browser
    ldf = laaha_data(freq, cats, start, end)
    l, r = row()
    l.altair_chart(trend_chart(df, "theme", "", freq, (start, end), CHART_HEIGHT, fmt), use_container_width=True)
    l.markdown(legend(list(dict.fromkeys(df["theme"])), TELEGRAM_PALETTE), unsafe_allow_html=True)
    if ldf.empty:
        r.info("No synthetic reports in this period (the example data starts in March 2022).")
    else:
        r.altair_chart(laaha_chart(ldf, freq, (start, end), CHART_HEIGHT, fmt), use_container_width=True)
        r.markdown(legend(list(dict.fromkeys(ldf["category_name"])), LAAHA_PALETTE, dashed=True),
                   unsafe_allow_html=True)

    l, r = row()
    l.caption(f"{span}. Dots mark spikes: a {UNIT[freq]} when a theme's share of active channels is at least 2 "
              f"standard deviations above the {BASELINE[freq]} (at least 5 channels). Spikes use shares, so the "
              "growth of the corpus after February 2022 does not create them; raw counts do rise with it. The "
              "lines track clear-cut cases: about 8 in 10 flagged posts are hostile, and an estimated quarter "
              "of all hostile posts are caught.")
    r.warning("**Synthetic example data.** Laaha is not connected yet. These counts are made up to show how the "
              "chart will look; they are not real reports and have no relationship to the Telegram data.")
    r.caption("Dashed lines mark example data. Real reports would arrive through the API contract on the Method "
              "page; only aggregate counts per category and period would reach this dashboard, never report text "
              "or personal details.")

    st.subheader("Recent spikes")
    sp = trends[(trends.scope == "all") & (trends.layer == layer) & trends.spike
                & (trends.series != "negative")
                & trends.period.between(start, end)].sort_values("period", ascending=False).head(15)
    if sp.empty:
        st.info("No spikes in this period.")
    else:
        st.dataframe(pd.DataFrame({
            ("Week of" if freq == "week" else "Month"): sp.period.dt.strftime(FMT[freq]),
            "Theme": sp.series.map(SERIES),
            "Hostile posts": sp.posts, "Channels": sp.channels,
            "Share of channels": (sp.share * 100).round(1).astype(str) + "%",
            "Usual share": (sp.baseline * 100).round(1).astype(str) + "%"}), hide_index=True,
            width="stretch")


@st.cache_resource
def translator(lang: str):
    from transformers import pipeline
    return pipeline("translation", model=f"Helsinki-NLP/opus-mt-{lang}-en", device=-1)


def translate(text: str) -> str:
    lang = "uk" if re.search(r"[єіїґ]", text.lower()) else "ru"
    parts = [p for p in re.split(r"(?<=[.!?])\s+", text[:1500]) if p.strip()]
    return " ".join(translator(lang)(p, max_length=512, truncation=True)[0]["translation_text"] for p in parts)


def page_theme(trends, examples, metrics):
    band("Theme explorer")
    theme = st.selectbox("Theme", list(config.THEMES), format_func=lambda t: config.THEME_NAMES[t])
    level, f1 = confidence(metrics, theme)
    st.title(config.THEME_NAMES[theme])
    st.markdown(f"{badge(level)}  Cross-validated F1 {f1:.2f} (agreement with Claude's labels)")
    view_col, period_col, _ = st.columns([1, 1.4, 1.6], vertical_alignment="bottom")   # one tidy control row
    freq = VIEWS[view_col.radio("View", list(VIEWS), horizontal=True, key="view_theme")]
    layer = "overt"
    trends = trends[trends.freq == freq]
    start, end, fmt, span = period_controls(period_col, trends, freq, "theme")
    df = trends[(trends.series == theme) & (trends.layer == layer) & trends.scope.isin(SCOPES.values())
                & trends.period.between(start, end)].copy()
    df["scope_name"] = df.scope.map({v: k for k, v in SCOPES.items()})
    df = df.astype({"posts": float, "channels": float})
    st.markdown(f"**Hostile posts per {UNIT[freq]}: all posts about Ukrainian women vs refugee-related** "
                f"({span}; dots = spikes)")
    st.altair_chart(trend_chart(df, "scope_name", "", freq, (start, end), fmt=fmt), use_container_width=True)
    st.markdown(legend(list(dict.fromkeys(df["scope_name"])), TELEGRAM_PALETTE), unsafe_allow_html=True)

    st.subheader("Example posts")
    st.caption("Highest-scoring posts for this theme. Shown without channel names. Machine translation is optional "
               "and loses slang and sarcasm.")
    c1, c2, c3, c4 = st.columns([1, 2, 1, 1])
    only_ref = c1.toggle("Refugee-related only")
    show_tr = c3.toggle("Translate to English")
    limit = c4.selectbox("Posts to show", [8, 20, 50], key="limit_theme")
    ex = examples[examples.themes.apply(lambda xs: theme in list(xs))]
    ex = ex[ex.overt]
    if only_ref:
        ex = ex[ex.refugee_flag]
    spikes = set(trends[(trends.series == theme) & (trends.scope == "all") & (trends.layer == layer)
                        & trends.spike].period)
    if freq == "month":        # every month with posts; spike months marked
        options = sorted(ex["month"].dropna().unique(), reverse=True)
        help_text = "Pick a month to browse its posts. ▲ marks a spike month."
    else:                      # weeks: spike weeks only (there are too many weeks to list)
        options = sorted(spikes, reverse=True)
        help_text = "Pick a spike week to see what drove it."
    labels = {"any": "Any time"}
    for p in options:
        p = pd.Timestamp(p)
        labels[p.strftime("%Y-%m-%d")] = p.strftime(FMT[freq]) + (" ▲ spike" if freq == "month" and p in spikes else "")
    period = c2.selectbox("Month" if freq == "month" else "Spike week", list(labels), format_func=labels.get,
                          help=help_text, key=f"period_{freq}")
    if period != "any":
        ex = ex[ex[freq] == pd.Timestamp(period)]
    st.caption(f"{len(ex):,} posts match; showing the highest-scoring {min(limit, len(ex))}.")
    ex = ex.sort_values(f"theme_{theme}", ascending=False).head(limit)
    if ex.empty:
        st.info("No posts match.")
    for _, r in ex.iterrows():
        with st.container(border=True):
            other = [config.THEME_NAMES[t] for t in r.themes if t != theme]
            st.caption(f"{pd.Timestamp(r.date).strftime('%d %b %Y')} · score {r[f'theme_{theme}']:.2f}"
                       + (" · refugee-related" if r.refugee_flag else "")

                       + (f" · also: {', '.join(other)}" if other else ""))
            st.write(r.text[:1200])
            if show_tr:
                st.markdown(f"*{translate(r.text)}*")


@st.cache_resource
def classifier():
    c = importlib.import_module("2_classify")
    return c, c.load_embedder(), joblib.load(config.MODEL_DIR / "classifiers.joblib")


def page_check():
    band("Check a post")
    st.caption("Runs the same filter and models as the pipeline on one post. The first run loads the model (~30 s).")
    text = st.text_area("Post text (Russian or Ukrainian)", height=180, key="check_text",
                        value="Пока Миколы гибнут на передке, Оксанки пляшут в Испании с местными Хулио.")
    if not st.button("Check", type="primary") or not text.strip():
        return
    low = normalise(text)
    if unsafe(low)[0]:
        st.error("This text matches the minor-safety rule and is not processed.")
        return
    t = topic(low)
    st.markdown(f"**Keyword filter:** {'passes (' + t + ' match)' if t else 'would not be selected as about Ukrainian women'}")
    c, emb_model, models = classifier()
    X = c.embed(emb_model, [text])
    s = pd.Series([text])
    neg = models["gate"].predict_proba(np.hstack([X, c.slur_col(s)]))[0, 1]
    vic = models["victim"].predict_proba(X)[0, 1]
    m1, m2 = st.columns(2)
    m1.metric("Negative portrayal", f"{neg:.0%}", "flagged" if neg >= config.GATE_THRESHOLD else "not flagged",
              delta_color="off")
    m2.metric("Victim report", f"{vic:.0%}", help="Weak classifier; indicative only")
    st.markdown("**Style:** " + ("overt (slur, insult or mocking emoji)" if is_overt(text)
                                 else "news-style (no slur, insult or mocking emoji)"))
    P = pd.DataFrame({t: [m.predict_proba(X)[0, 1]] for t, m in models["themes"].items()})
    P = c.blend(P, c.keyword_hits(s)).iloc[0].sort_values(ascending=False)
    st.subheader("Theme scores")
    st.bar_chart(pd.DataFrame({"score": P.values}, index=[config.THEME_NAMES[t] for t in P.index]), horizontal=True)
    if neg < config.GATE_THRESHOLD:
        st.caption("Theme scores are only used for posts flagged as negative.")


def page_method(metrics, leadlag, safety):
    band("Method and limits")
    st.markdown("""
**Pipeline.** A keyword filter selects posts about Ukrainian women and girls from 79.6M Telegram posts (strong
terms and slurs, or a women word near a Ukrainian marker), removes reposts and applies the minor-safety rule.
Each remaining post is embedded with `BAAI/bge-m3`. A classifier trained on labelled examples decides whether the
post portrays Ukrainian women negatively; six theme classifiers then score what kind of negative portrayal it is.
Trends count distinct channels per week as a share of all channels posting about Ukrainian women.
""")
    st.subheader("What counts as hostile")
    st.markdown(f"""
{DEFINITION}

- **The dashboard shows overt hostility only:** posts that contain a slur, an insult or a mocking emoji. This is
  about half of the posts the classifier flags. The test is keyword-based, so dry sarcasm without markers is left out.
- **News-style framing is excluded:** posts that retell real events with a negative framing but no slurs or
  insults (the Karkadym "homewrecker" story alone accounts for over 200). They remain in `posts_scored.parquet`
  (`overt = False`) for analysis, but are not counted here because individually they read as news.
- **Victim reports are kept out:** a news-style post that the victim classifier scores at least
  {config.VICTIM_OVERRIDE} (typically trafficking or abuse news) is counted as a victim report, not hostility.
  Overt posts are never moved, so trafficking news retold with mockery aimed at someone else can still be counted.
- **Coverage:** the negative-portrayal classifier is tuned for precision (threshold {config.GATE_THRESHOLD}). On a
  weighted sample, about 8 in 10 flagged posts are hostile, and it catches an estimated quarter of all hostile posts.
  These estimates are rough: the largest group of posts is represented by few labelled examples.
""")
    st.warning("Labels were produced by Claude against the codebook below and have not been validated by a human "
               "annotator. All accuracy figures measure agreement with those labels.")
    g = metrics["gate"]
    st.subheader("Accuracy (5-fold cross-validation)")
    st.markdown(f"**Negative portrayal:** precision {g['precision']:.2f}, recall {g['recall']:.2f}, "
                f"AUC {g['auc']:.2f} on {metrics['n_labels']} labelled posts ({metrics['n_negative']} negative).")
    rows = [{"Theme": config.THEME_NAMES[t], "Labelled examples": v["n"], "F1": v["f1"],
             "Confidence": confidence(metrics, t)[0]} for t, v in metrics["themes"]["per_theme"].items()]
    st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch")
    st.caption(f"Themes micro-F1 {metrics['themes']['micro_f1']:.2f}; at least one correct theme for "
               f"{metrics['themes']['at_least_one_correct']:.0%} of negative posts. The evaluation includes 200 "
               "deliberately hard, borderline posts.")

    st.subheader("Does general hostility rise before refugee-related hostility?")
    ll = pd.DataFrame([{"Series": SERIES[k], "Same-week correlation": v["corr_at_0"],
                        "Best lag (weeks)": v["best_lag_weeks"], "Correlation at best lag": v["corr_at_best"]}
                       for k, v in leadlag["overt"].items()])
    st.dataframe(ll, hide_index=True, width="stretch")
    st.caption("Overt layer, week-to-week changes since February 2022. Correlations are weak and the best lags "
               "point in different directions, so this data shows no consistent early-warning pattern.")

    st.subheader("Ethics and safety")
    for n in config.ETHICS_NOTES:
        st.markdown(f"- {n}")
    st.markdown(f"Posts dropped by the minor-safety rule: **{safety['dropped']:,}** "
                f"({safety['by_minor_trigger'].get('age', 0):,} by a stated age under 18). Only date, channel and "
                "trigger type are stored.")
    st.subheader("Method notes")
    for n in config.METHOD_NOTES:
        st.markdown(f"- {n}")
    with st.expander("Theme codebook"):
        st.markdown(open(config.ROOT / "CODEBOOK.md").read())
    st.subheader("Community reports (Laaha): not yet connected")
    st.markdown("The Overview shows a Laaha chart filled with **synthetic example data** so the layout can be "
                "reviewed. It will switch to real aggregate counts once reports arrive through this contract.")
    st.code(config.REPORT_API_CONTRACT, language="json")
    st.caption("Sensitive reports are routed to protection staff by the reporting app and never enter this "
               "analytics pipeline.")


def main():
    trends, examples, metrics, leadlag, safety = load()
    st.sidebar.markdown("## Laaha Analysis Dashboard")
    st.sidebar.caption("Narrative monitoring · proof of concept")
    page = st.sidebar.radio("Page", ["Overview", "Theme explorer", "Check a post", "Method and limits"])
    if page == "Overview":
        page_overview(trends)
    elif page == "Theme explorer":
        if examples is None or metrics is None:
            band("Theme explorer")
            st.info(NEEDS_DATA)
        else:
            page_theme(trends, examples, metrics)
    elif page == "Check a post":
        if not (config.MODEL_DIR / "classifiers.joblib").exists():
            band("Check a post")
            st.info(NEEDS_DATA)
        else:
            page_check()
    else:
        if metrics is None or leadlag is None or safety is None:
            band("Method and limits")
            st.info(NEEDS_DATA)
        else:
            page_method(metrics, leadlag, safety)


main()
