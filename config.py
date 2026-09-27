"""All editable settings: paths, column map, keyword filter, safety rule, models, themes, thresholds."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"

# ---------------------------------------------------------------- inputs
POST_GLOB = "post_texts_part_*.csv"          # 8 parts, ~80M posts
CHANNELS_PATH = DATA_DIR / "channels.csv"
CLUSTERS_PATH = DATA_DIR / "leiden_clusters.csv"
LABELS_PATH = DATA_DIR / "labels_seed.csv"   # 998 posts labelled by Claude (not human-validated)

RAW_POST_COLUMNS = {"post_id": "id", "peer_id": "peer_id", "date": "date", "text": "message"}

# ---------------------------------------------------------------- outputs
CANDIDATES_PATH = DATA_DIR / "candidates_all.parquet"          # step 1
SAFETY_META_PATH = DATA_DIR / "minor_safety_dropped_meta.parquet"  # step 1: date/channel/trigger only, no text
SAFETY_SUMMARY_PATH = DATA_DIR / "safety_summary.json"               # counts only, safe to share (dashboard)
SCAN_DIR = DATA_DIR / "scan"                                   # step 1 per-file intermediates
EMB_DIR = DATA_DIR / "emb"                                     # step 2 embedding cache, keyed by post
MODEL_DIR = DATA_DIR / "models"                                # step 2 classifiers + CV metrics
SCORED_PATH = DATA_DIR / "posts_scored.parquet"                # step 2

# ---------------------------------------------------------------- step 1: keyword filter
FILTER_CHUNK_SIZE = 200_000
MIN_CHARS = 40
COOCCUR_WINDOW = 150   # chars between a women word and a Ukrainian marker

# Strong terms: already mean "Ukrainian woman" (incl. slurs and female refugee forms)
UKR_WOMEN_STRONG = [
    r"\bукраинк", r"\bукраїнк", r"\bхохлушк", r"\bхохлушек", r"\bбандеровк", r"\bбандерівк",
    r"\bукропк", r"\bукропиц", r"беженк", r"біженк", r"переселенк",
    r"укробеженк", r"укробешенк", r"\bоксанк",
]
# Poet Lesya Ukrainka (streets, theatres) is removed before matching
EXCLUDE = r"лес[яиіеюі]\s+украинк\w*|лес[яіиеюі]\s+українк\w*"
WOMEN = [r"женщин", r"жінк", r"жінок", r"девушк", r"девочк", r"дівчат", r"дівчин", r"\bбаб[аыу]?\b",
         r"\bмам[аыуе]\b", r"\bматер", r"\bмати\b", r"\bжен[аыу]\b", r"дочер", r"доньк", r"невест", r"наречен"]
UKR_MARKER = [r"украин", r"україн", r"\bукр", r"киев", r"київ", r"хохл", r"бандер", r"всу\b", r"зсу\b",
              r"незалежн", r"свидом", r"западенц"]
REFUGEE_MARKER = [r"беженц", r"біженц", r"беженк", r"біженк", r"переселен", r"впо\b", r"убежищ", r"прихист",
                  r"за границ", r"за кордон", r"европ", r"європ", r"польш", r"польщ", r"германи", r"німеччин",
                  r"чехи", r"чехі"]
# Latin look-alikes used to dodge filters ('х0хлушка')
LOOKALIKE = {"0": "о", "a": "а", "e": "е", "o": "о", "x": "х", "p": "р", "c": "с", "y": "у", "k": "к"}

# ---------------------------------------------------------------- minor-safety rule (ethics)
# A post is dropped before its text is stored if it pairs an UNAMBIGUOUS sign of a minor with a sexual term.
# 'девочки'/'дівчата' alone do not count: they are routinely used for adult women.
MINOR_WORDS = (r"несовершеннолетн|неповнолітн|малолетн|малолітн|школьниц|школярк|школьник|школяр|"
               r"ребен|ребён|дитин|\bдет(?:и|ей|ям|ьми|ях)\b|\bдіт(?:и|ей|ям|ьми|ях)\b|подрост|підліт|"
               r"педофил|педофіл")
MINOR_AGE = r"\b(\d{1,2})[\s\-–]?(?:летн|річн)"      # '13-летняя', '15 річна'; ages < 18 count
SEXUAL = r"секс|изнасил|зґвалт|порн|интим|інтим|педофил|педофіл|растлен|розбещ|соити"
ALWAYS_DROP = r"нимфет"

# ---------------------------------------------------------------- step 2: models
EMBEDDING_MODEL = "BAAI/bge-m3"
EMB_MAX_CHARS = 1500
EMB_MAX_TOKENS = 512
EMB_CHUNK = 20_000
SLUR = r"хохлушк|хохлушек|бандеровк|бандерівк|укропк|укропиц|укробеженк|укробешенк|\bоксанк"
GATE_THRESHOLD = 0.55      # chosen on the representative sample (rounds 1-2): precision 0.81, recall 0.78; flags ~70% fewer neutral news posts than 0.4
# News-style posts (no slur/insult/mocking emoji) that the victim classifier scores at least this high are
# treated as victim reports (e.g. trafficking news), not hostile portrayals. Overt posts are never overridden.
VICTIM_OVERRIDE = 0.5
THEME_THRESHOLD = 0.5      # every theme >= threshold, plus always the top theme
MIN_THEME_LABELS = 12

# 6 themes. Labels use finer names; each theme merges them.
THEMES = {
    "contempt":             {"ridicule", "dehumanisation"},
    "sexualisation_men":    {"sexualisation", "gold_digging", "cultural_threat"},
    "extremism":            {"radicalism"},
    "criminality":          {"criminalisation"},
    "freeloading_burden":   {"economic_burden", "job_competition", "health_threat"},
    "betrayal_bad_mothers": {"betrayal", "bad_mothers"},
}
# Keyword signal blended into four theme scores: score = (1 - w) * classifier + w * keyword_hit.
# Tested on a fixed test set (see CODEBOOK.md); it helps these four themes and hurts contempt/freeloading.
THEME_KEYWORD_WEIGHT = 0.2
THEME_KEYWORDS = {
    "sexualisation_men": (r"проститу|шлюх|блуд|путан|содержанк|эскорт|спонсор|секс|интим|порн|онлифанс|вебкам|бордел|"
                          r"сутен|панел|жриц|увела|увести|любовник|иностранц|замуж|богат|трус|передок|охмурил|"
                          r"древнейш|под поляк|под немц|в тираж|совокуп|сношают|давать|изнасил|привлечь мужик|хулио"),
    "criminality": (r"укра[лв]|краж|вор[ауоы]?\b|воров|мошен|афер|задерж|арест|полиц|суд\b|приговор|тюрьм|напал|нож|"
                    r"избил|ограб|контрабанд|похит|преступ|нелегал|штраф|угрож"),
    "betrayal_bad_mothers": (r"бросил|бросают|сбежал|сбеж|пока .{0,40}(?:гибнут|воюют|воюет|на фронте|в окопах)|воюй|"
                             r"мыкол|тарас|хулио|мамаш|горе-мам"),
    "extremism": r"бандер|нацист|нацизм|фашист|упа\b|свидом|москал|русн|сдохн|ненавид|слава украин",
}

# "Overt" hostility: the post itself contains a slur, an insult or a mocking emoji. Negative posts without these
# are news-style retellings that carry a negative framing (e.g. the Karkadym "homewrecker" story). Keyword-based:
# dry sarcasm without markers counts as news-style.
OVERT = (r"хохл|бандеровк|бандерівк|укропк|укропиц|укробеженк|укробешенк|\bоксанк|🤣|😂|🤡|😁|😆|🐷|🐽|"
         r"тупа|дура\b|дуры|дебил|мраз|твар|сука|сучк|шлюх|проститу|быдл|свин|зомби|кастрюл|наглая|наглые|наглых|"
         r"халяв|кикимор|упорот|поехавш|бешен|одичал|идиотк|неадекват|рагул|хабал|шароварниц|свидомая|свидомые|"
         r"майданут|укрорейх|укро-|хвойд")

THEME_NAMES = {
    "contempt": "Contempt",
    "sexualisation_men": "Sexualisation",
    "extremism": "Extremism",
    "criminality": "Criminality",
    "freeloading_burden": "Burden",
    "betrayal_bad_mothers": "Betrayal & bad mothers",
}

# ---------------------------------------------------------------- legacy (used by the old app.py until it is rewritten)
FILTERED_PATH = DATA_DIR / "filtered.parquet"
LABELLED_PATH = DATA_DIR / "posts_labelled.parquet"
NARRATIVES_PATH = DATA_DIR / "narratives.parquet"
EMBEDDINGS_PATH = DATA_DIR / "embeddings.npy"
CENTROIDS_PATH = DATA_DIR / "centroids.npy"
TRENDS_PATH = DATA_DIR / "trends.parquet"

METHOD_NOTES = [
    "Frame labels were produced by Claude on 998 sampled posts and have not been validated by a human annotator. "
    "Reported precision, recall and F1 measure agreement with those labels. In deployment, fluent annotators "
    "would label a validation set, and a fine-tuned multilingual classifier (XLM-R + LoRA) is the next iteration.",
    "Trends count distinct channels, not posts, and reposts are removed, so coordinated bursts cannot fake a rise.",
    "Channel communities come from the dataset's own Leiden clustering; no geography is invented. Geographic signal "
    "arrives in phase 2 from the community reporting app (see API contract), which supplies coarse region codes.",
    "The corpus ends March 2024, so this is a historical replay demonstrating the method. Live ingestion is a "
    "deployment step, not a research gap.",
    "The corpus is Ukrainian- and Russian-language Telegram, which measures the upstream narrative layer rather than "
    "host-community discourse; Polish-language collection is named phase 2 work.",
]

ETHICS_NOTES = [
    "Analyse channels and narratives, never individuals. Do not store or display author identifiers.",
    "Show exemplar posts in the dashboard without channel handles.",
    "Posts pairing a clear sign of a minor with sexual terms are dropped before their text is stored; only date, "
    "channel and trigger type are kept so counts can be reported to protection staff.",
    "All data is public and CC-BY licensed; no personal reports are used in this phase.",
]

REPORT_API_CONTRACT = """POST /api/v1/reports
{
  \"report_id\": \"uuid\",
  \"received_at\": \"ISO timestamp\",
  \"source\": \"chatbot\" | \"in_person\" | \"partner\",
  \"type\": \"question\" | \"offer_check\" | \"incident\" | \"observation\",
  \"category\": \"sexual_harassment\" | \"physical_violence\" | \"verbal_abuse\" | \"property_defacing\" | null,
  \"language\": \"uk\",
  \"region_code\": \"PL-LU\",
  \"text\": \"...\",
  \"sensitive\": true | false
}
"""
