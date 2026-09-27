from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

import config


KEYWORD_PATTERN = config.REFUGEE_KEYWORD_PATTERN
WOMEN_KEYWORD_PATTERN = config.WOMEN_KEYWORD_PATTERN
HARM_KEYWORD_PATTERN = config.HARM_KEYWORD_PATTERN


def normalize_text(value: str) -> str:
    text = str(value or "")
    text = re.sub(r"https?://\S+|www\.\S+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text, flags=re.UNICODE)
    return text.strip().lower()


def load_channel_lookup() -> dict[str, str]:
    path = config.CHANNELS_PATH
    if not path.exists():
        return {}
    df = pd.read_csv(
        path,
        usecols=[config.CHANNEL_COLUMNS["channel_id"], config.CHANNEL_COLUMNS["channel_name"], config.CHANNEL_COLUMNS["username"]],
        low_memory=False,
        dtype={config.CHANNEL_COLUMNS["channel_id"]: "string"},
    )
    df["channel"] = df[config.CHANNEL_COLUMNS["channel_name"]].fillna(df[config.CHANNEL_COLUMNS["username"]]).fillna("unknown")
    return df.set_index(config.CHANNEL_COLUMNS["channel_id"])["channel"].astype(str).to_dict()


def build_filtered_dataframe(nrows: int | None = None) -> pd.DataFrame:
    channel_lookup = load_channel_lookup()
    parts: list[pd.DataFrame] = []
    rows_scanned = 0
    total_kept = 0

    reader = pd.read_csv(
        config.POST_PATH,
        chunksize=config.FILTER_CHUNK_SIZE,
        on_bad_lines="skip",
        engine="python",
        dtype={
            config.RAW_POST_COLUMNS["post_id"]: "string",
            config.RAW_POST_COLUMNS["peer_id"]: "string",
            config.RAW_POST_COLUMNS["date"]: "string",
            config.RAW_POST_COLUMNS["text"]: "string",
        },
    )

    women_related_posts = 0
    for chunk in reader:
        if nrows is not None:
            remaining = nrows - rows_scanned
            if remaining <= 0:
                break
            chunk = chunk.iloc[:remaining]

        rows_scanned += len(chunk)
        chunk = chunk.copy()
        chunk[config.RAW_POST_COLUMNS["text"]] = chunk[config.RAW_POST_COLUMNS["text"]].fillna("").astype(str)
        chunk[config.RAW_POST_COLUMNS["peer_id"]] = chunk[config.RAW_POST_COLUMNS["peer_id"]].fillna("").astype(str)

        refugee_mask = (
            chunk[config.RAW_POST_COLUMNS["text"]].astype(str).str.lower().str.contains(KEYWORD_PATTERN, case=False, na=False)
        )
        filtered = chunk.loc[refugee_mask].copy()
        filtered["text_clean"] = filtered[config.RAW_POST_COLUMNS["text"]].apply(normalize_text)
        filtered = filtered[filtered["text_clean"].str.len() >= config.MIN_CHARS].copy()

        refugee_text_mask = filtered["text_clean"].str.contains(KEYWORD_PATTERN, case=False, na=False)
        women_text_mask = filtered["text_clean"].str.contains(WOMEN_KEYWORD_PATTERN, case=False, na=False)

        def sentence_has_women_harm(text: str) -> bool:
            if not text:
                return False
            sentences = re.split(r"[.!?;\n]", text)
            for sentence in sentences:
                low = sentence.lower()
                if not re.search(config.WOMEN_KEYWORD_PATTERN, low, flags=re.IGNORECASE):
                    continue
                if any(re.search(pattern, low, flags=re.IGNORECASE) for pattern in config.WOMEN_HARM_EXCLUDE_PATTERNS):
                    continue
                if re.search(config.EXPLICIT_HARM_PATTERN, low, flags=re.IGNORECASE):
                    return True
            return False

        explicit_women_harm_mask = refugee_text_mask & women_text_mask & filtered["text_clean"].apply(sentence_has_women_harm)
        filtered["is_women_related"] = explicit_women_harm_mask
        filtered["category"] = filtered["is_women_related"].map({True: "women_refugee", False: "refugee"})
        women_related_posts += int(filtered["is_women_related"].sum())
        filtered = filtered.loc[filtered["is_women_related"]].copy()

        if filtered.empty:
            continue

        filtered["text_clean"] = filtered["text_clean"].str.replace(r"\s+", " ", regex=True)
        filtered["dedup_key"] = filtered["text_clean"]
        filtered = filtered.drop_duplicates(subset="dedup_key", keep="first").copy()

        filtered["date"] = pd.to_datetime(filtered[config.RAW_POST_COLUMNS["date"]], errors="coerce", utc=True)
        filtered = filtered.dropna(subset=["date"]).copy()
        filtered["channel_id"] = filtered[config.RAW_POST_COLUMNS["peer_id"]].astype(str)
        filtered["channel"] = filtered["channel_id"].map(channel_lookup).fillna(filtered["channel_id"])
        filtered["post_id"] = filtered[config.RAW_POST_COLUMNS["post_id"]].astype(str)
        filtered["text"] = filtered["text_clean"].astype(str)

        result = filtered[["post_id", "text", "date", "channel"]].copy()
        result["post_id"] = result["post_id"].astype(str)
        result["text"] = result["text"].astype(str)
        result["channel"] = result["channel"].astype(str)
        total_kept += len(result)
        parts.append(result)

    if not parts:
        return pd.DataFrame(columns=["post_id", "text", "date", "channel"])

    out = pd.concat(parts, ignore_index=True)
    out = out.drop_duplicates(subset=["post_id", "text", "date", "channel"], keep="first").copy()
    out["date"] = pd.to_datetime(out["date"], utc=True)
    print(f"rows_scanned={rows_scanned}")
    print(f"rows_kept={len(out)}")
    print(f"women_related_posts={women_related_posts}")
    print(f"date_range={out['date'].min()} -> {out['date'].max()}")
    print(f"distinct_channels={out['channel'].nunique()}")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Filter refugee-related Telegram posts from the raw CSV.")
    parser.add_argument("--nrows", type=int, default=None, help="Optional limit for a 500k-row slice run.")
    args = parser.parse_args()

    config.DATA_DIR.mkdir(exist_ok=True)
    df = build_filtered_dataframe(nrows=args.nrows)
    df = df[["post_id", "text", "date", "channel"]].copy()
    df["post_id"] = df["post_id"].astype(str)
    df["text"] = df["text"].astype(str)
    df["channel"] = df["channel"].astype(str)
    df.to_parquet(config.FILTERED_PATH, index=False)
    print(f"saved={config.FILTERED_PATH}")


if __name__ == "__main__":
    main()
