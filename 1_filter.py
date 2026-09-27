"""Step 1: keyword filter over the raw post files -> data/candidates_all.parquet

Keeps posts about Ukrainian women and girls: a strong term (украинка, беженка, slurs) or a women word within
COOCCUR_WINDOW chars of a Ukrainian marker. Adds refugee_flag. Applies the minor-safety rule before any text is
stored, keeping only date/channel/trigger metadata for dropped posts. Deduplicates reposts across all files.

    python 1_filter.py                 # all parts, one process per file (~15 min on 8 cores)
    python 1_filter.py --parts 5       # one part
    python 1_filter.py --nrows 400000  # quick slice per part
"""
from __future__ import annotations

import argparse
import json
import time
from functools import partial
from multiprocessing import Pool
from pathlib import Path

import pandas as pd

import config

from textrules import COARSE, EXCL_RE, LOOKALIKE, dedup_key, refugee_flag, topic, unsafe

COLS = config.RAW_POST_COLUMNS


def scan(part: Path, nrows: int | None) -> dict:
    t0 = time.time()
    stats = {"part": part.name, "rows": 0, "candidates": 0, "minor_safety_dropped": 0}
    rows, dropped = [], []
    reader = pd.read_csv(part, chunksize=config.FILTER_CHUNK_SIZE, nrows=nrows, dtype=str, on_bad_lines="skip",
                         usecols=[COLS["post_id"], COLS["peer_id"], COLS["date"], COLS["text"]])
    for chunk in reader:
        stats["rows"] += len(chunk)
        chunk = chunk.dropna(subset=[COLS["text"]])
        chunk = chunk[chunk[COLS["text"]].str.len() >= config.MIN_CHARS]
        low = chunk[COLS["text"]].str.lower().str.translate(LOOKALIKE).str.replace(EXCL_RE, " ", regex=True)
        hit = low.str.contains(COARSE, regex=True)
        for (_, r), l in zip(chunk[hit].iterrows(), low[hit]):
            t = topic(l)
            if t is None:
                continue
            drop, minor_trigger, sexual_trigger = unsafe(l)
            if drop:                                   # text is never stored
                stats["minor_safety_dropped"] += 1
                dropped.append({"date": r[COLS["date"]], "peer_id": r[COLS["peer_id"]], "match": t,
                                "minor_trigger": minor_trigger, "sexual_trigger": sexual_trigger})
                continue
            rows.append((r[COLS["post_id"]], r[COLS["peer_id"]], r[COLS["date"]], t, refugee_flag(l),
                         r[COLS["text"]], dedup_key(l)))
    df = pd.DataFrame(rows, columns=["post_id", "peer_id", "date", "match", "refugee_flag", "text", "dedup_key"])
    df["part"] = part.stem.rsplit("_", 1)[-1]
    df.to_parquet(config.SCAN_DIR / f"cand_{part.stem}.parquet", index=False)
    pd.DataFrame(dropped, columns=["date", "peer_id", "match", "minor_trigger", "sexual_trigger"]).to_parquet(
        config.SCAN_DIR / f"dropped_meta_{part.stem}.parquet", index=False)
    stats["candidates"] = len(df)
    stats["minutes"] = round((time.time() - t0) / 60, 1)
    print(json.dumps(stats), flush=True)
    return stats


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--parts", default="", help="comma-separated part numbers, e.g. 1,5 (default: all)")
    ap.add_argument("--nrows", type=int, default=None, help="rows per part, for a quick slice")
    args = ap.parse_args()

    config.SCAN_DIR.mkdir(parents=True, exist_ok=True)
    parts = sorted(config.DATA_DIR.glob(config.POST_GLOB))
    if args.parts:
        wanted = set(args.parts.split(","))
        parts = [p for p in parts if p.stem.rsplit("_", 1)[-1] in wanted]
    with Pool(len(parts)) as pool:
        stats = pool.map(partial(scan, nrows=args.nrows), parts)
    json.dump(stats, open(config.SCAN_DIR / "scan_stats.json", "w"), indent=2)

    df = pd.concat([pd.read_parquet(config.SCAN_DIR / f"cand_{p.stem}.parquet") for p in parts], ignore_index=True)
    raw = len(df)
    df["date"] = pd.to_datetime(df["date"], errors="coerce", utc=True)
    df = df.dropna(subset=["date"]).sort_values("date").drop_duplicates("dedup_key", keep="first")  # earliest copy
    df.to_parquet(config.CANDIDATES_PATH, index=False)
    meta = pd.concat([pd.read_parquet(config.SCAN_DIR / f"dropped_meta_{p.stem}.parquet") for p in parts],
                     ignore_index=True)
    meta.to_parquet(config.SAFETY_META_PATH, index=False)
    json.dump({"dropped": len(meta), "by_minor_trigger": meta["minor_trigger"].value_counts().to_dict()},
              open(config.SAFETY_SUMMARY_PATH, "w"), indent=2)          # counts only: no channel ids

    print(f"rows_scanned={sum(s['rows'] for s in stats)} candidates_raw={raw} after_dedup={len(df)} "
          f"minor_safety_dropped={len(meta)}")
    print(df.groupby(["match", "refugee_flag"]).size().to_string())
    print(f"saved={config.CANDIDATES_PATH}")


if __name__ == "__main__":
    main()
