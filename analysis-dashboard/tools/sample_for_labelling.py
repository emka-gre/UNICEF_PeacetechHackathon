"""Draw a targeted labelling batch from the scored candidates (active learning).

Two plans. "uncertain" picks posts where the gate is unsure (neg_prob near the threshold) or a weak theme is
plausible but uncertain. "yield" picks likely positives for the weak themes (high theme score or a theme keyword,
among posts that look negative), because uncertainty sampling found almost no new positives for them in round 3.
Already-labelled posts are excluded. Writes a parquet plus plain-text reading batches.

    python tools/sample_for_labelling.py --round 3 --plan uncertain
    python tools/sample_for_labelling.py --round 4 --plan yield
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402

FREELOADING = r"пособи|выплат|социал|халяв|на шее|за (?:наш|чуж)|бесплатн|жиль|налог|работ[уа]|нахлебн|паразит|виплат"


def likely(d: pd.DataFrame, theme: str, pattern: str | None = None) -> pd.Series:
    hit = d["text"].str.contains(pattern or config.THEME_KEYWORDS[theme], case=False, regex=True, na=False)
    return (d["neg_prob"] >= 0.3) & ((d[f"theme_{theme}"] >= 0.5) | hit)


# plan -> reason -> (filter on scored posts, how many)
PLANS = {"uncertain": {
    "gate_uncertain":        (lambda d: d["neg_prob"].between(0.25, 0.6), 60),
    "betrayal_bad_mothers":  (lambda d: d["theme_betrayal_bad_mothers"].between(0.35, 0.85), 45),
    "criminality":           (lambda d: d["theme_criminality"].between(0.35, 0.85), 40),
    "sexualisation_men":     (lambda d: d["theme_sexualisation_men"].between(0.35, 0.85), 30),
    "freeloading_burden":    (lambda d: d["theme_freeloading_burden"].between(0.35, 0.85), 25),
}, "yield": {
    "criminality":           (lambda d: likely(d, "criminality"), 55),
    "betrayal_bad_mothers":  (lambda d: likely(d, "betrayal_bad_mothers"), 55),
    "freeloading_burden":    (lambda d: likely(d, "freeloading_burden", FREELOADING), 50),
    "victim":                (lambda d: d["victim_prob"] >= 0.4, 40),
}}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--round", type=int, required=True)
    ap.add_argument("--plan", choices=PLANS, default="uncertain")
    ap.add_argument("--seed", type=int, default=3)
    args = ap.parse_args()

    scored = pd.read_parquet(config.SCORED_PATH)
    cand = pd.read_parquet(config.CANDIDATES_PATH, columns=["post_id", "peer_id", "text"])
    df = scored.merge(cand, on=["post_id", "peer_id"], how="left")
    labelled = pd.read_csv(config.LABELS_PATH, dtype={"post_id": str, "peer_id": str})
    done = set(labelled["post_id"] + "_" + labelled["peer_id"])
    df = df[~(df["post_id"].astype(str) + "_" + df["peer_id"].astype(str)).isin(done)]

    picked, taken = [], set()
    for reason, (flt, n) in PLANS[args.plan].items():
        pool = df[flt(df).fillna(False) & ~df.index.isin(taken)]
        s = pool.sample(min(n, len(pool)), random_state=args.seed)
        taken |= set(s.index)
        picked.append(s.assign(stratum=f"targeted_{reason}", weight=pd.NA))
        print(f"{reason:22s} pool={len(pool):6d} picked={len(s)}")
    out = pd.concat(picked).sample(frac=1, random_state=args.seed).reset_index(drop=True)
    out.insert(0, "sid", range(args.round * 1000, args.round * 1000 + len(out)))

    lab_dir = config.DATA_DIR / "labelling"
    lab_dir.mkdir(exist_ok=True)
    out.to_parquet(lab_dir / f"round{args.round}.parquet", index=False)
    for b in range(0, len(out), 50):
        with open(lab_dir / f"round{args.round}_batch{b // 50}.txt", "w") as f:
            for r in out.iloc[b:b + 50].itertuples():
                text = re.sub(r"\s+", " ", r.text)[:520]
                reason = r.stratum.replace("targeted_", "")
                f.write(f"[{r.sid}] {reason} | {text}\n\n")
    print(f"saved {len(out)} posts -> {lab_dir}")


if __name__ == "__main__":
    main()
