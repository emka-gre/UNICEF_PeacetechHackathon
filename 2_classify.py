"""Step 2: train classifiers on the labels and score every candidate -> data/posts_scored.parquet

1. Embed labelled posts with bge-m3; cross-validate and train
   - gate: negative portrayal or not (embedding + slur flag), threshold config.GATE_THRESHOLD
   - victim: reports of violence/trafficking against women (weak, few labels)
   - one classifier per theme in config.THEMES, trained on negative posts only
2. Embed candidates (cached per post in data/emb/, so only new posts are embedded) and score them.

Labels were produced by Claude and are not human-validated; CV metrics mean agreement with those labels.

    python 2_classify.py              # full run (~50 min first time on Apple GPU, minutes when cached)
    python 2_classify.py --sample 3000  # quick test on a random sample, separate output files
"""
from __future__ import annotations

import argparse
import json
import time

import joblib
import numpy as np
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score
from sklearn.model_selection import KFold, StratifiedKFold, cross_val_predict

import config
from textrules import has_slur, is_overt, normalise, unsafe

np.seterr(all="ignore")
DEVICE = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def load_embedder() -> SentenceTransformer:
    m = SentenceTransformer(config.EMBEDDING_MODEL, device=DEVICE)
    m.max_seq_length = config.EMB_MAX_TOKENS
    if DEVICE in ("mps", "cuda"):
        m.half()                                  # identical vectors (cosine > 0.999), ~2x faster
    return m


def embed(model: SentenceTransformer, texts: list[str]) -> np.ndarray:
    return model.encode([str(t)[:config.EMB_MAX_CHARS] for t in texts], batch_size=32,
                        normalize_embeddings=True, show_progress_bar=False).astype(np.float32)


def slur_col(texts: pd.Series) -> np.ndarray:
    return texts.map(has_slur).astype(np.float32).values[:, None]


def theme_targets(frames: pd.Series) -> pd.DataFrame:
    gold = frames.fillna("").str.split("|").apply(set)
    return pd.DataFrame({t: gold.apply(lambda s, src=src: bool(s & src)).astype(int)
                         for t, src in config.THEMES.items()}, index=frames.index)


def keyword_hits(texts: pd.Series) -> pd.DataFrame:
    """1.0 where a theme's keyword list matches (only themes listed in config.THEME_KEYWORDS)."""
    low = texts.astype(str).map(normalise)
    return pd.DataFrame({t: low.str.contains(p, regex=True).astype(float).values
                         for t, p in config.THEME_KEYWORDS.items()}, index=texts.index)


def blend(probs: pd.DataFrame, hits: pd.DataFrame) -> pd.DataFrame:
    out = probs.copy()
    w = config.THEME_KEYWORD_WEIGHT
    for t in hits:
        out[t] = (1 - w) * probs[t].values + w * hits[t].values
    return out


def logreg(C: float = 1.0) -> LogisticRegression:
    return LogisticRegression(max_iter=3000, C=C, class_weight="balanced")


def train(embedder: SentenceTransformer, model_dir) -> dict:
    labels = pd.read_csv(config.LABELS_PATH)
    log(f"embedding {len(labels)} labelled posts")
    X = embed(embedder, labels["text"].astype(str).tolist())
    Xg = np.hstack([X, slur_col(labels["text"].astype(str))])
    y_neg = (labels["stance"] == "negative").astype(int).values
    y_vic = (labels["stance"] == "victim").astype(int).values
    negs = (labels["stance"] == "negative").values
    Y = theme_targets(labels.loc[negs, "frames"])

    # ---- cross-validated metrics (agreement with Claude's labels) ----
    metrics = {"n_labels": len(labels), "n_negative": int(negs.sum())}
    cv = StratifiedKFold(5, shuffle=True, random_state=0)
    for name, feats, y, thr in [("gate", Xg, y_neg, config.GATE_THRESHOLD), ("victim", X, y_vic, 0.5)]:
        p = cross_val_predict(logreg(), feats, y, cv=cv, method="predict_proba")[:, 1]
        pr, rc, f1, _ = precision_recall_fscore_support(y, p >= thr, average="binary", zero_division=0)
        metrics[name] = {"threshold": thr, "precision": round(pr, 3), "recall": round(rc, 3), "f1": round(f1, 3),
                         "auc": round(float(roc_auc_score(y, p)), 3), "n_pos": int(y.sum())}
        log(f"CV {name}: {metrics[name]}")
    Xn = X[negs]
    P = pd.DataFrame(0.0, index=Y.index, columns=Y.columns)
    for t in Y:
        for tr, te in KFold(5, shuffle=True, random_state=0).split(Xn):
            P.iloc[te, P.columns.get_loc(t)] = logreg(2.0).fit(Xn[tr], Y[t].iloc[tr]).predict_proba(Xn[te])[:, 1]
    P = blend(P, keyword_hits(labels.loc[negs, "text"]))
    pred = (P >= config.THEME_THRESHOLD).astype(int)
    for i, t in P.idxmax(axis=1).items():
        pred.loc[i, t] = 1
    tp = (pred & Y).sum()
    per = {t: {"n": int(Y[t].sum()), "f1": round(float(2 * tp[t] / (pred[t].sum() + Y[t].sum())), 3)} for t in Y}
    micro_p, micro_r = tp.sum() / pred.values.sum(), tp.sum() / Y.values.sum()
    metrics["themes"] = {"micro_f1": round(float(2 * micro_p * micro_r / (micro_p + micro_r)), 3),
                         "at_least_one_correct": round(float(np.mean((pred & Y).sum(axis=1) > 0)), 3),
                         "per_theme": per}
    log(f"CV themes: micro-F1 {metrics['themes']['micro_f1']}, per theme "
        + ", ".join(f"{t} {v['f1']}" for t, v in per.items()))

    # ---- final models on all labels ----
    for t in Y:
        assert Y[t].sum() >= config.MIN_THEME_LABELS, f"too few labels for theme {t}: {Y[t].sum()}"
    models = {"gate": logreg().fit(Xg, y_neg), "victim": logreg().fit(X, y_vic),
              "themes": {t: logreg(2.0).fit(Xn, Y[t]) for t in Y},
              "config": {"embedding_model": config.EMBEDDING_MODEL, "gate_threshold": config.GATE_THRESHOLD,
                         "theme_threshold": config.THEME_THRESHOLD, "themes": config.THEMES, "slur": config.SLUR,
                         "theme_keywords": config.THEME_KEYWORDS, "theme_keyword_weight": config.THEME_KEYWORD_WEIGHT}}
    joblib.dump(models, model_dir / "classifiers.joblib")
    json.dump(metrics, open(model_dir / "cv_metrics.json", "w"), indent=2)
    return models


def embeddings_for(cand: pd.DataFrame, embedder: SentenceTransformer, emb_dir) -> np.ndarray:
    """Embeddings for every candidate row; cached per post key, only missing posts are embedded."""
    key = (cand["post_id"].astype(str) + "_" + cand["peer_id"].astype(str)).tolist()
    cache_keys, cache_vecs = [], []
    for ids in sorted(emb_dir.glob("*.ids.json")):
        cache_keys += json.load(open(ids))
        cache_vecs.append(np.load(ids.with_name(ids.name.replace(".ids.json", ".npy"))))
    pos = {k: i for i, k in enumerate(cache_keys)}
    missing = [i for i, k in enumerate(key) if k not in pos]
    log(f"embedding cache: {len(pos)} posts; {len(missing)} candidates need embedding")
    batch_no = len(list(emb_dir.glob("*.ids.json")))
    for c in range(0, len(missing), config.EMB_CHUNK):
        idx = missing[c:c + config.EMB_CHUNK]
        t0 = time.time()
        vec = embed(embedder, cand["text"].iloc[idx].tolist()).astype(np.float16)
        name = f"batch_{batch_no:03d}"
        np.save(emb_dir / f"{name}.npy", vec)
        json.dump([key[i] for i in idx], open(emb_dir / f"{name}.ids.json", "w"))
        for j, i in enumerate(idx):
            pos[key[i]] = len(cache_keys) + j
        cache_keys += [key[i] for i in idx]
        cache_vecs.append(vec)
        batch_no += 1
        log(f"embedded {min(c + config.EMB_CHUNK, len(missing))}/{len(missing)} "
            f"({len(idx) / (time.time() - t0):.0f} posts/s)")
    return np.vstack(cache_vecs)[[pos[k] for k in key]].astype(np.float32)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sample", type=int, default=0, help="score a random sample only (test run)")
    args = ap.parse_args()
    suffix = f"_sample{args.sample}" if args.sample else ""
    emb_dir, model_dir = config.EMB_DIR, config.MODEL_DIR.with_name(config.MODEL_DIR.name + suffix)
    emb_dir.mkdir(parents=True, exist_ok=True)
    model_dir.mkdir(parents=True, exist_ok=True)

    embedder = load_embedder()
    models = train(embedder, model_dir)

    cand = pd.read_parquet(config.CANDIDATES_PATH).reset_index(drop=True)
    if args.sample:
        cand = cand.sample(args.sample, random_state=0).reset_index(drop=True)
    bad = cand["text"].map(lambda t: unsafe(normalise(t))[0])       # safety net; step 1 already applies the rule
    if bad.any():
        log(f"minor-safety net dropped {int(bad.sum())} candidates (count only)")
        cand = cand[~bad].reset_index(drop=True)

    E = embeddings_for(cand, embedder, emb_dir)
    del embedder
    if DEVICE == "mps":
        torch.mps.empty_cache()

    out = cand[["post_id", "peer_id", "date", "part", "match", "refugee_flag"]].copy()
    out["slur"] = slur_col(cand["text"])[:, 0].astype(bool)
    out["overt"] = cand["text"].map(is_overt)
    out["neg_prob"] = models["gate"].predict_proba(np.hstack([E, out[["slur"]].values.astype(np.float32)]))[:, 1]
    out["victim_prob"] = models["victim"].predict_proba(E)[:, 1]
    out["victim_override"] = (out["neg_prob"] >= config.GATE_THRESHOLD) & ~out["overt"] & \
        (out["victim_prob"] >= config.VICTIM_OVERRIDE)
    out["is_negative"] = (out["neg_prob"] >= config.GATE_THRESHOLD) & ~out["victim_override"]
    neg_idx = np.where(out["is_negative"].values)[0]
    for t, m in models["themes"].items():
        out[f"theme_{t}"] = np.nan
        out.loc[neg_idx, f"theme_{t}"] = m.predict_proba(E[neg_idx])[:, 1]
    theme_p = blend(out.loc[neg_idx, [f"theme_{t}" for t in models["themes"]]].rename(columns=lambda x: x[6:]),
                    keyword_hits(cand["text"].iloc[neg_idx]))
    out.loc[neg_idx, [f"theme_{t}" for t in theme_p]] = theme_p.values
    tcols = [f"theme_{t}" for t in models["themes"]]
    T = out.loc[neg_idx, tcols]
    top = T.idxmax(axis=1)
    themes = [[] for _ in range(len(out))]
    for i, row in T.iterrows():
        themes[i] = sorted({c[6:] for c in tcols if row[c] >= config.THEME_THRESHOLD} | {top[i][6:]})
    out["themes"] = themes
    path = config.SCORED_PATH.with_name(config.SCORED_PATH.stem + suffix + ".parquet")
    out.to_parquet(path, index=False)

    log(f"victim override (news-style, victim score >= {config.VICTIM_OVERRIDE}): {int(out.victim_override.sum())}")
    log(f"overt among negatives: {out.loc[neg_idx, 'overt'].mean():.0%}")
    log(f"negative: {len(neg_idx)} of {len(out)} ({len(neg_idx) / len(out):.1%}); "
        f"refugee-flagged {out.loc[out.refugee_flag, 'is_negative'].mean():.1%} vs "
        f"other {out.loc[~out.refugee_flag, 'is_negative'].mean():.1%}")
    print(out.loc[neg_idx, "themes"].explode().value_counts().rename("posts per theme").to_string())
    print(f"saved={path}")


if __name__ == "__main__":
    main()
