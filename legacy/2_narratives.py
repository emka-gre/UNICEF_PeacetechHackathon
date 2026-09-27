from __future__ import annotations

import argparse
import re

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sentence_transformers import SentenceTransformer

import config


STOPWORDS = {
    "на", "не", "что", "из", "за", "по", "и", "в", "с", "о", "у", "для", "как",
    "при", "к", "но", "же", "ли", "мы", "вы", "они", "она", "его", "ее", "их",
    "это", "или", "где", "гд", "потому", "над", "под", "между", "со", "все",
    "всех", "да", "нет", "так", "только", "потому", "чтобы", "где", "когда",
    "здесь", "там", "если", "то", "лишь", "без", "после", "перед", "через",
}


def translate_cluster_name(name: str, cluster_text: str | None = None) -> str:
    if not name:
        return "mixed"

    translation_map = {
        "біжен": "refugee",
        "бежен": "refugee",
        "переселен": "displaced",
        "польш": "poland",
        "герман": "germany",
        "чех": "czech",
        "берлин": "berlin",
        "крак": "cracow",
        "притул": "shelter",
        "виплат": "benefits",
        "пособ": "benefits",
        "убежищ": "shelter",
        "уклонист": "draft evader",
        "возвращ": "return",
        "поверт": "return",
        "украин": "ukrainian",
        "днр": "dnr",
        "воины": "war",
        "германии": "germany",
        "польши": "poland",
        "сир": "refugee",
        "беженцев": "refugees",
        "беженцы": "refugees",
        "біженців": "refugees",
        "біженці": "refugees",
        "вдома": "home",
        "жилье": "housing",
        "росс": "russia",
        "россии": "russia",
        "помощ": "aid",
        "жиль": "housing",
        "дома": "home",
    }

    tokens = []
    for raw in re.findall(r"[A-Za-zА-Яа-яЁё]+", str(name).lower()):
        if len(raw) <= 2 or raw in STOPWORDS:
            continue
        translated = None
        for key, value in translation_map.items():
            if key in raw:
                translated = value
                break
        if translated is not None:
            tokens.append(translated)
        elif any(ch in raw for ch in "abcdefghijklmnopqrstuvwxyz"):
            tokens.append(raw)

    text = (cluster_text or "").lower()
    if not tokens:
        if any(word in text for word in ["refugee", "refugees", "бежен", "біжен", "переселен"]):
            return "refugee support"
        if any(word in text for word in ["poland", "польш", "germany", "герм", "berlin", "warsaw"]):
            return "migration in europe"
        if any(word in text for word in ["benefits", "housing", "shelter", "выплат", "притул", "убежищ"]):
            return "benefits and shelter"
        return "refugee narrative"

    unique_tokens = []
    for token in tokens:
        if token not in unique_tokens:
            unique_tokens.append(token)

    return " ".join(unique_tokens[:4])[:80]


def build_narratives(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, np.ndarray]:
    model = SentenceTransformer(config.EMBEDDING_MODEL, device="cpu")
    texts = df["text"].fillna("").astype(str).tolist()
    embeddings = model.encode(texts, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    np.save(config.EMBEDDINGS_PATH, embeddings)

    n_clusters = min(config.NARRATIVE_K, max(1, len(texts)))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    centroids = kmeans.cluster_centers_
    np.save(config.CENTROIDS_PATH, centroids)

    posts_labelled = df.copy()
    posts_labelled["narrative_id"] = labels.astype(int)

    narrative_rows: list[dict] = []
    for narrative_id in range(n_clusters):
        idx = np.where(labels == narrative_id)[0]
        cluster_posts = posts_labelled.iloc[idx].copy()
        if cluster_posts.empty:
            continue

        cluster_texts = cluster_posts["text"].fillna("").astype(str).tolist()
        if len(cluster_texts) == 1:
            terms = [token for token in cluster_texts[0].split() if len(token) > 2][: config.TFIDF_TOP_TERMS]
            name = " ".join(terms) or "mixed"
        else:
            vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, strip_accents="unicode", lowercase=True)
            tfidf = vectorizer.fit_transform(cluster_texts)
            scores = np.asarray(tfidf.mean(axis=0)).ravel()
            selected = np.argsort(scores)[::-1][: config.TFIDF_TOP_TERMS]
            terms = [vectorizer.get_feature_names_out()[i] for i in selected if scores[i] > 0]
            name = " ".join(terms[: config.TFIDF_TOP_TERMS]) if terms else "mixed"

        name = translate_cluster_name(name, " ".join(cluster_texts[:10]))

        centroid = centroids[narrative_id]
        distances = np.linalg.norm(embeddings[idx] - centroid, axis=1)
        exemplar_indices = idx[np.argsort(distances)[:5]]
        exemplars = [str(posts_labelled.iloc[i]["text"]) for i in exemplar_indices]

        narrative_rows.append(
            {
                "narrative_id": narrative_id,
                "name": name,
                "posts": len(cluster_posts),
                "channels": cluster_posts["channel"].nunique(),
                "first_seen": cluster_posts["date"].min(),
                "last_seen": cluster_posts["date"].max(),
                "exemplars": exemplars,
            }
        )

    narratives = pd.DataFrame(narrative_rows)
    narratives["narrative_id"] = narratives["narrative_id"].astype(int)
    narratives = narratives.sort_values(["posts", "narrative_id"], ascending=[False, True]).reset_index(drop=True)
    return posts_labelled, narratives, centroids


def main() -> None:
    parser = argparse.ArgumentParser(description="Cluster refugee posts into narratives and export the cluster summaries.")
    parser.add_argument("--nrows", type=int, default=None, help="Optional limit for a 500k-row slice run.")
    args = parser.parse_args()

    df = pd.read_parquet(config.FILTERED_PATH)
    if args.nrows is not None:
        df = df.head(args.nrows).copy()
    df["date"] = pd.to_datetime(df["date"], utc=True)

    posts_labelled, narratives, _ = build_narratives(df)
    posts_labelled = posts_labelled[["post_id", "text", "date", "channel", "narrative_id"]].copy()
    posts_labelled.to_parquet(config.LABELLED_PATH, index=False)
    narratives.to_parquet(config.NARRATIVES_PATH, index=False)

    print(f"narratives={len(narratives)}")
    print(narratives[["narrative_id", "name", "posts", "channels", "first_seen", "last_seen"]].head(10).to_string(index=False))
    print(f"saved={config.LABELLED_PATH}")
    print(f"saved={config.NARRATIVES_PATH}")


if __name__ == "__main__":
    main()
