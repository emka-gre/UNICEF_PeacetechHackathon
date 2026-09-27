from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"

POST_PATH = DATA_DIR / "post_texts_part_5.csv"
CHANNELS_PATH = DATA_DIR / "channels.csv"
CLUSTERS_PATH = DATA_DIR / "leiden_clusters.csv"

FILTERED_PATH = DATA_DIR / "filtered.parquet"
LABELLED_PATH = DATA_DIR / "posts_labelled.parquet"
NARRATIVES_PATH = DATA_DIR / "narratives.parquet"
EMBEDDINGS_PATH = DATA_DIR / "embeddings.npy"
CENTROIDS_PATH = DATA_DIR / "centroids.npy"
TRENDS_PATH = DATA_DIR / "trends.parquet"
FRAME_CACHE_PATH = DATA_DIR / "frame_model_cache.json"

SLICE_ROWS = 500_000
FILTER_CHUNK_SIZE = 200_000
MIN_CHARS = 40
FRAME_THRESHOLD = 0.65
NARRATIVE_K = 15
TFIDF_TOP_TERMS = 4
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
FRAME_MODEL = "MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7"

RAW_POST_COLUMNS = {
    "post_id": "id",
    "peer_id": "peer_id",
    "date": "date",
    "text": "message",
}

CHANNEL_COLUMNS = {
    "channel_id": "id",
    "channel_name": "title",
    "username": "username",
}

KEYWORDS = {
    "ukrainian": [
        "біженц",
        "біженк",
        "переселен",
        "виплат",
        "притул",
        "ухилянт",
        "за кордоном",
        "повертатися",
        "украинки",
        "біженці",
        "біженців",
        "вимушено",
    ],
    "russian": [
        "беженц",
        "беженк",
        "переселен",
        "пособи",
        "убежищ",
        "уклонист",
        "за границей",
        "возвращаться",
        "украинки",
        "беженцы",
        "беженцев",
    ],
    "english": [
        "refugee",
        "refugees",
        "displaced",
        "migrant",
        "migrants",
        "asylum",
        "shelter",
        "internally displaced",
        "returning home",
        "ukrainian refugee",
        "ukrainian refugees",
        "benefits",
        "housing support",
        "temporary housing",
        "camp",
        "idp",
        "idps",
    ],
    "women": [
        "женщ",
        "девуш",
        "девоч",
        "матер",
        "мам",
        "дочк",
        "дочь",
        "сирот",
        "жена",
        "women",
        "woman",
        "girls",
        "girl",
        "female",
        "mothers",
        "mother",
        "wives",
        "wife",
        "moms",
        "refugee women",
        "refugee mothers",
        "refugee girls",
        "women and girls",
        "girls and women",
    ],
    "harm": [
        "насил",
        "изнасил",
        "rape",
        "raped",
        "abuse",
        "abused",
        "abuser",
        "harass",
        "violence",
        "violent",
        "attack",
        "assault",
        "traffick",
        "trafick",
        "prostitut",
        "prostitute",
        "exploit",
        "exploited",
        "kidnap",
        "abduct",
        "threaten",
        "threat",
        "criminal",
        "dangerous",
        "угроз",
        "насили",
        "напад",
        "похищ",
        "жертв",
        "жертва",
        "насиль",
        "насильник",
        "похит",
        "продаж",
        "торговл",
        "нападен",
        "убий",
    ],
    "places": [
        "польщ",
        "польш",
        "варшав",
        "німеччин",
        "германи",
        "чехі",
        "чехи",
        "берлін",
        "берлин",
        "краків",
        "краков",
        "poland",
        "warsaw",
        "germany",
        "berlin",
        "prague",
        "cracow",
    ],
}

REFUGEE_KEYWORD_PATTERN = "|".join(
    KEYWORDS["ukrainian"] + KEYWORDS["russian"] + KEYWORDS["english"] + KEYWORDS["places"]
)
WOMEN_KEYWORD_PATTERN = "|".join(KEYWORDS["women"])
HARM_KEYWORD_PATTERN = "|".join(KEYWORDS["harm"])
EXPLICIT_HARM_PATTERN = r"(?:rape|raped|abuse|abused|assault|attack|kidnap|abduct|traffick|prostitut|prostitute|exploit|exploited|насил|изнасил|похищ|торговл|продаж|сексу|принуж|застав|жертва|жертв|напад|убий|насиль|насильник)"

WOMEN_HARM_PATTERNS = [
    r"(?:женщ|девуш|девоч|матер|мам|дочк|wife|wives|woman|women|girl|girls|mother|mothers|женщин|девочек|девушек|матерей).{0,120}(?:rape|raped|abuse|abused|assault|attack|kidnap|abduct|traffick|prostitut|prostitute|exploit|exploited|насил|изнасил|похищ|торговл|продаж|сексу|принуж|застав|жертва|жертв|напад|убий|насиль|насильник)",
    r"(?:rape|raped|abuse|abused|assault|attack|kidnap|abduct|traffick|prostitut|prostitute|exploit|exploited|насил|изнасил|похищ|торговл|продаж|сексу|принуж|застав|жертва|жертв|напад|убий|насиль|насильник).{0,120}(?:женщ|девуш|девоч|матер|мам|дочк|wife|wives|woman|women|girl|girls|mother|mothers|женщин|девочек|девушек|матерей)",
]
WOMEN_HARM_EXCLUDE_PATTERNS = [
    r"(?:бежен|эваку|спас|помощ|поддерж|выезд|дома|приют|семей|детей|семьи|переселен|убежищ|сирот).{0,120}(?:женщ|девуш|девоч|матер|мам|дочк|wife|wives|woman|women|girl|girls|mother|mothers|женщин|девочек|девушек|матерей)",
    r"(?:женщ|девуш|девоч|матер|мам|дочк|wife|wives|woman|women|girl|girls|mother|mothers|женщин|девочек|девушек|матерей).{0,120}(?:бежен|эваку|спас|помощ|поддерж|выезд|дома|приют|семей|детей|семьи|переселен|убежищ|сирот)",
    r"(?:женщины|девочки|девушки|матери).{0,50}(?:и дети|и старики|с детьми|с семьёй|вместе с детьми)",
    r"(?:дети|семьи|беременные|мать|матери|мамы).{0,80}(?:эваку|спас|притул|поддерж|бежен|выезд)",
    r"(?:эваку|спас|притул|поддерж|бежен|выезд).{0,80}(?:дети|семьи|беременные|мать|матери|мамы)",
]
KEYWORD_PATTERN = REFUGEE_KEYWORD_PATTERN

FRAME_LABELS = {
    "women_refugees": "This text is specifically about refugee women, mothers, girls or women in displacement.",
    "sexualisation": "This text portrays refugee women and girls as sexual objects, targets of sexual exploitation or sex workers.",
    "hate_speech": "This text uses hostile, degrading or hateful language against refugee women and girls.",
    "criminalisation": "This text portrays refugee women and girls as criminals, violent or dangerous.",
    "economic_burden": "This text says refugee women and girls live on benefits and do not work.",
    "job_competition": "This text says refugee women and girls take jobs, housing or public services from locals.",
    "cultural_threat": "This text portrays refugee women and girls as a threat to national identity or culture.",
    "health_threat": "This text says refugee women and girls bring disease or are a health risk.",
    "dehumanisation": "This text compares refugee women and girls to animals, vermin, disease, a flood or an invasion.",
    "disloyalty": "This text accuses refugee women and girls of cowardice, draft evasion or betraying their country.",
}

METHOD_NOTES = [
    "Zero-shot frame labels stand in for human annotation. In deployment, training data would be labelled by fluent annotators, and this pipeline's outputs are exactly the candidate set that annotation would start from; a fine-tuned multilingual classifier (XLM-R + LoRA) replaces the zero-shot step in the next iteration.",
    "Trends count distinct channels per day, not posts, so reposts and coordinated bursts cannot fake a rise on their own.",
    "Channel communities come from the dataset's own Leiden clustering; no geography is invented. Geographic signal arrives in phase 2 from the community reporting app (see API contract), which supplies coarse region codes.",
    "The corpus ends March 2024, so this is a historical replay demonstrating the method. Live ingestion is a deployment step, not a research gap.",
    "The corpus is Ukrainian- and Russian-language Telegram, which measures the upstream narrative layer rather than host-community discourse; Polish-language collection is named phase 2 work.",
]

ETHICS_NOTES = [
    "Analyse channels and narratives, never individuals. Do not store or display author identifiers.",
    "Show exemplar posts in the dashboard without channel handles.",
    "If any content sexualising minors is encountered it must not be stored, displayed or labelled; drop and note the count only.",
    "All data is public and CC-BY licensed; no personal reports are used in this phase.",
]

REPORT_API_CONTRACT = """POST /api/v1/reports
{
  \"report_id\": \"uuid\",
  \"received_at\": \"ISO timestamp\",
  \"source\": \"chatbot\" | \"in_person\" | \"partner\",
  \"type\": \"question\" | \"offer_check\" | \"incident\" | \"observation\",
  \"language\": \"uk\",
  \"region_code\": \"PL-LU\",
  \"text\": \"...\",
  \"sensitive\": true | false
}
"""
