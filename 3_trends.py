"""Step 3: weekly and monthly trends per theme -> data/trends.parquet (+ examples and lead-lag for the dashboard)

Unit: distinct channels per week (or month), as a share of all channels posting about Ukrainian women in it. Using a share
removes the growth of the corpus itself (volume jumps after February 2022); using channels, not posts, stops one
channel's burst or a repost chain from faking a rise.

Scopes: all posts, refugee-related (refugee_flag), general (not refugee-related).
Layers: "overt" = negative posts with a slur, insult or mocking emoji; "all" = also news-style posts that carry a
negative framing without those markers.
Spike: share at least SPIKE_Z standard deviations above the previous 12 weeks (or 6 months), with
>= SPIKE_MIN_CHANNELS channels.

    python 3_trends.py
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

import config

START = "2017-06-05"          # first week with >= 50 posts
# period -> (pandas period code, date_range frequency, baseline length, minimum baseline periods)
FREQS = {"week": ("W-SUN", "W-MON", 12, 6), "month": ("M", "MS", 6, 4)}
SPIKE_Z = 2.0
SPIKE_MIN_CHANNELS = 5
LEADLAG_FROM = "2022-02-21"   # full-scale invasion onwards: enough refugee-related volume
MAX_LAG = 8


def per_period(df: pd.DataFrame, base: pd.DataFrame, freq: str, periods: pd.DatetimeIndex) -> pd.DataFrame:
    g = df.groupby(freq).agg(posts=("post_id", "size"), channels=("peer_id", "nunique"))
    b = base.groupby(freq).agg(base_posts=("post_id", "size"), base_channels=("peer_id", "nunique"))
    out = g.reindex(periods, fill_value=0).join(b.reindex(periods, fill_value=0))
    out["share"] = np.where(out["base_channels"] > 0, out["channels"] / out["base_channels"].clip(lower=1), 0.0)
    _, _, window, min_periods = FREQS[freq]
    past = out["share"].shift(1).rolling(window, min_periods=min_periods)      # baseline excludes the current period
    mean, std = past.mean(), past.std()
    out["baseline"] = mean
    out["z"] = ((out["share"] - mean) / std.where(std > 0)).fillna(0.0)
    out["spike"] = (out["z"] >= SPIKE_Z) & (out["channels"] >= SPIKE_MIN_CHANNELS)
    return out.rename_axis("period").reset_index().assign(freq=freq)


def leadlag(trends: pd.DataFrame, layer: str) -> dict:
    """Correlation of general vs refugee-related weekly shares at lags -MAX_LAG..MAX_LAG weeks.
    Positive best lag = general hostility moves first, refugee-related follows that many weeks later."""
    res = {}
    t = trends[(trends["freq"] == "week") & (trends["period"] >= LEADLAG_FROM) & (trends["layer"] == layer)]
    for s in t["series"].unique():
        g = t[(t.series == s) & (t.scope == "general")].set_index("period")["share"]
        r = t[(t.series == s) & (t.scope == "refugee")].set_index("period")["share"]
        g, r = g.diff().dropna(), r.diff().dropna()              # week-to-week changes, not levels
        cors = {lag: float(g.corr(r.shift(-lag))) for lag in range(-MAX_LAG, MAX_LAG + 1)}
        best = max(cors, key=lambda k: abs(cors[k]) if not np.isnan(cors[k]) else -1)
        res[s] = {"best_lag_weeks": best, "corr_at_best": round(cors[best], 3), "corr_at_0": round(cors[0], 3),
                  "all": {k: round(v, 3) for k, v in cors.items()}}
    return res


def main() -> None:
    s = pd.read_parquet(config.SCORED_PATH)
    s["date"] = pd.to_datetime(s["date"], utc=True)
    s = s[s["date"] >= pd.Timestamp(START, tz="UTC")].copy()
    naive = s["date"].dt.tz_localize(None)
    grids = {}
    for freq, (code, rng, _, _) in FREQS.items():
        s[freq] = naive.dt.to_period(code).dt.start_time
        grids[freq] = pd.date_range(s[freq].min(), s[freq].max(), freq=rng)
    themes = list(config.THEMES)

    rows = []
    for scope, mask in [("all", s["refugee_flag"] | True), ("refugee", s["refugee_flag"]), ("general", ~s["refugee_flag"])]:
        base = s[mask]
        for layer in ["overt", "all"]:
            neg = base[base["is_negative"] & (base["overt"] if layer == "overt" else True)]
            for series in ["negative"] + themes:
                sub = neg if series == "negative" else neg[neg["themes"].apply(lambda xs, t=series: t in list(xs))]
                for freq, periods in grids.items():
                    rows.append(per_period(sub, base, freq, periods).assign(series=series, scope=scope, layer=layer))
    trends = pd.concat(rows, ignore_index=True)
    trends.to_parquet(config.DATA_DIR / "trends.parquet", index=False)

    ll = {layer: leadlag(trends, layer) for layer in ["overt", "all"]}
    json.dump(ll, open(config.DATA_DIR / "trends_leadlag.json", "w"), indent=2)

    # example posts for the dashboard: negative posts with text, WITHOUT channel ids (ethics rule)
    cand = pd.read_parquet(config.CANDIDATES_PATH, columns=["post_id", "peer_id", "text"])
    ex = s[s["is_negative"]].merge(cand, on=["post_id", "peer_id"], how="left")
    keep = ["date", "week", "month", "refugee_flag", "overt", "neg_prob", "themes"] + [f"theme_{t}" for t in themes] + ["text"]
    ex[keep].to_parquet(config.DATA_DIR / "examples.parquet", index=False)

    a = trends[trends.scope == "all"]
    w = grids["week"]
    print(f"weeks={len(w)} ({w.min().date()} -> {w.max().date()}), months={len(grids['month'])}, rows={len(trends)}")
    print("spikes per series (all posts), by period and layer:")
    print(a.pivot_table(index="series", columns=["freq", "layer"], values="spike", aggfunc="sum").astype(int).to_string())
    print("\nlead-lag, overt layer, general vs refugee-related (positive = general moves first):")
    for k, v in ll["overt"].items():
        print(f"  {k:22s} best lag {v['best_lag_weeks']:+d} wk (r={v['corr_at_best']}), same week r={v['corr_at_0']}")
    print(f"saved={config.DATA_DIR / 'trends.parquet'}, examples={len(ex)}")


if __name__ == "__main__":
    main()
