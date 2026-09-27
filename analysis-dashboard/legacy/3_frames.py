from __future__ import annotations

import json
from typing import Any

import pandas as pd
from transformers import pipeline

import config


def load_cache() -> dict[str, Any]:
    if not config.FRAME_CACHE_PATH.exists():
        return {}
    try:
        with open(config.FRAME_CACHE_PATH, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def save_cache(cache: dict[str, Any]) -> None:
    with open(config.FRAME_CACHE_PATH, "w", encoding="utf-8") as fh:
        json.dump(cache, fh, ensure_ascii=False, indent=2)


def zero_shot_frame_tags() -> pd.DataFrame:
    narratives = pd.read_parquet(config.NARRATIVES_PATH)
    classifier = pipeline(
        "zero-shot-classification",
        model=config.FRAME_MODEL,
        tokenizer=config.FRAME_MODEL,
        multi_label=True,
        device=-1,
    )

    cache = load_cache()
    labels = list(config.FRAME_LABELS.values())

    rows = []
    for row in narratives.itertuples(index=False):
        narrative_id = getattr(row, "narrative_id")
        raw_exemplars = getattr(row, "exemplars", [])
        if isinstance(raw_exemplars, str):
            exemplars = [raw_exemplars]
        elif hasattr(raw_exemplars, "tolist"):
            exemplars = [str(item) for item in raw_exemplars.tolist()]
        else:
            exemplars = [str(item) for item in list(raw_exemplars or [])]
        combined = " ".join(str(item) for item in exemplars)[:1500]
        cache_key = str(narrative_id)

        if cache_key in cache:
            result = cache[cache_key]
        else:
            result = classifier(combined, candidate_labels=labels, multi_label=True)
            cache[cache_key] = result

        score_map = dict(zip(result.get("labels", []), result.get("scores", [])))
        frames: list[str] = []
        frame_scores: dict[str, float] = {}
        for key, hypothesis in config.FRAME_LABELS.items():
            score = float(score_map.get(hypothesis, 0.0))
            if score >= config.FRAME_THRESHOLD:
                frames.append(key)
                frame_scores[key] = score

        rows.append(
            {
                "narrative_id": narrative_id,
                "frames": frames,
                "frame_scores": json.dumps(frame_scores, ensure_ascii=False) if frame_scores else "{}",
            }
        )

    save_cache(cache)

    narrative_table = narratives.merge(pd.DataFrame(rows), on="narrative_id", how="left")
    narrative_table["frames"] = narrative_table["frames"].apply(lambda v: v or [])
    narrative_table["frame_scores"] = narrative_table["frame_scores"].apply(
        lambda v: json.dumps(v, ensure_ascii=False) if isinstance(v, dict) and v else "{}"
    )
    return narrative_table


def main() -> None:
    narrative_table = zero_shot_frame_tags()
    narrative_table.to_parquet(config.NARRATIVES_PATH, index=False)
    print(f"narratives_with_frames={len(narrative_table)}")
    print(narrative_table[["narrative_id", "name", "frames", "frame_scores"]].head(10).to_string(index=False))
    print(f"saved={config.NARRATIVES_PATH}")
    print(f"cache={config.FRAME_CACHE_PATH}")


if __name__ == "__main__":
    main()
