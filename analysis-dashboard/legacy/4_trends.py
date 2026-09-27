from __future__ import annotations

import numpy as np
import pandas as pd

import config


def build_trends() -> pd.DataFrame:
    posts = pd.read_parquet(config.LABELLED_PATH)
    posts["date"] = pd.to_datetime(posts["date"], utc=True)
    posts["date_day"] = posts["date"].dt.date

    daily = (
        posts.groupby(["narrative_id", "date_day"], as_index=False)["channel"]
        .nunique()
        .rename(columns={"channel": "channels_active", "date_day": "date"})
    )
    daily["date"] = pd.to_datetime(daily["date"])

    narrative_ids = sorted(posts["narrative_id"].dropna().astype(int).unique().tolist())
    start = posts["date"].min().tz_localize(None).date()
    end = posts["date"].max().tz_localize(None).date()
    full_dates = pd.date_range(start=start, end=end, freq="D")

    rows: list[dict] = []
    for narrative_id in narrative_ids:
        narrative_daily = daily[daily["narrative_id"] == narrative_id].set_index("date")["channels_active"]
        full_series = pd.Series(0, index=full_dates, dtype=float)
        full_series.loc[narrative_daily.index] = narrative_daily.values

        rolling_mean = full_series.rolling(window=28, min_periods=7).mean()
        rolling_std = full_series.rolling(window=28, min_periods=7).std(ddof=0)
        z = (full_series - rolling_mean) / rolling_std.replace(0, np.nan)
        z = z.fillna(0.0)
        spikes = z >= 2.0

        for d, count in full_series.items():
            rows.append(
                {
                    "narrative_id": int(narrative_id),
                    "date": d.strftime("%Y-%m-%d"),
                    "channels_active": int(count),
                    "z": float(z.loc[d]),
                    "spike": bool(spikes.loc[d]),
                }
            )

    trends = pd.DataFrame(rows)
    if trends.empty:
        return pd.DataFrame(columns=["narrative_id", "date", "channels_active", "z", "spike"])
    trends["date"] = pd.to_datetime(trends["date"])
    trends = trends.sort_values(["narrative_id", "date"]).reset_index(drop=True)
    return trends


def main() -> None:
    trends = build_trends()
    trends.to_parquet(config.TRENDS_PATH, index=False)
    print(f"trends_rows={len(trends)}")
    print(f"spike_days={int(trends['spike'].sum())}")
    print(trends.head(10).to_string(index=False))
    print(f"saved={config.TRENDS_PATH}")


if __name__ == "__main__":
    main()
