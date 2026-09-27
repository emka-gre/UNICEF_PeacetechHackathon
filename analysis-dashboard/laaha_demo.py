"""SYNTHETIC example data for the Laaha community-reports chart.

Laaha (the community reporting app) is not connected yet. This module generates made-up report counts so the
dashboard can show what the second chart would look like. Nothing here is real, and the numbers carry no
relationship to the Telegram data. Replace `synthetic_reports` with a query on real aggregated reports once the
API contract is live.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

CATEGORIES = {
    "sexual_harassment": "Sexual harassment",
    "physical_violence": "Physical violence",
    "verbal_abuse": "Verbal abuse",
    "property_defacing": "Property defacing",
}
START, END = "2022-03-07", "2024-03-25"      # app assumed to launch after the full-scale invasion
WEEKLY_BASE = {"sexual_harassment": 9, "physical_violence": 4, "verbal_abuse": 22, "property_defacing": 3}
# a few invented bursts so the spike markers have something to show: (category, first week, weeks, multiplier)
BURSTS = [("verbal_abuse", "2022-09-05", 3, 2.2), ("sexual_harassment", "2023-04-17", 2, 2.5),
          ("property_defacing", "2023-08-28", 2, 3.0), ("physical_violence", "2023-11-13", 2, 2.4)]
SPIKE_Z, MIN_REPORTS = 2.0, 5
WINDOW = {"week": (12, 6), "month": (6, 4)}


def _weekly(seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    weeks = pd.date_range(START, END, freq="W-MON")
    adoption = np.clip(np.linspace(0.15, 1.0, len(weeks)) ** 0.6, 0, 1)   # user base grows after launch
    rows = []
    for cat, base in WEEKLY_BASE.items():
        rate = base * adoption * (1 + 0.15 * np.sin(np.arange(len(weeks)) / 8.0 + rng.uniform(0, 6)))
        for c, first, n, mult in BURSTS:
            if c == cat:
                i = weeks.get_indexer([pd.Timestamp(first)])[0]
                rate[i:i + n] *= mult
        rows.append(pd.DataFrame({"period": weeks, "category": cat, "reports": rng.poisson(rate)}))
    return pd.concat(rows, ignore_index=True)


def synthetic_reports(freq: str = "week") -> pd.DataFrame:
    """Columns: period, category, category_name, reports, baseline, z, spike, freq. SYNTHETIC."""
    df = _weekly()
    if freq == "month":
        df = (df.assign(period=df.period.dt.to_period("M").dt.start_time)
                .groupby(["period", "category"], as_index=False)["reports"].sum())
    window, min_periods = WINDOW[freq]
    out = []
    for cat, g in df.groupby("category"):
        g = g.sort_values("period").copy()
        past = g["reports"].shift(1).rolling(window, min_periods=min_periods)
        g["baseline"] = past.mean()
        g["z"] = ((g["reports"] - past.mean()) / past.std().where(past.std() > 0)).fillna(0.0)
        g["spike"] = (g["z"] >= SPIKE_Z) & (g["reports"] >= MIN_REPORTS)
        out.append(g)
    res = pd.concat(out, ignore_index=True)
    res["category_name"] = res["category"].map(CATEGORIES)
    res["freq"] = freq
    return res
