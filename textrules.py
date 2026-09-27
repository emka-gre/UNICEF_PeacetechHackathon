"""Text rules shared by step 1 and step 2: normalisation, topic match, minor-safety rule, slur flag."""
from __future__ import annotations

import re

import config

STRONG_RE = re.compile("|".join(config.UKR_WOMEN_STRONG))
WOMEN_RE = re.compile("|".join(config.WOMEN))
UKR_RE = re.compile("|".join(config.UKR_MARKER))
REF_RE = re.compile("|".join(config.REFUGEE_MARKER))
EXCL_RE = re.compile(config.EXCLUDE)
MINOR_WORDS_RE = re.compile(config.MINOR_WORDS)
MINOR_AGE_RE = re.compile(config.MINOR_AGE)
SEXUAL_RE = re.compile(config.SEXUAL)
ALWAYS_RE = re.compile(config.ALWAYS_DROP)
SLUR_RE = re.compile(config.SLUR)
OVERT_RE = re.compile(config.OVERT)
LOOKALIKE = str.maketrans(config.LOOKALIKE)
COARSE = "|".join(config.UKR_WOMEN_STRONG + config.WOMEN)


def normalise(text: str) -> str:
    """Lowercase, map Latin look-alikes to Cyrillic, blank out 'Леся Українка'."""
    return EXCL_RE.sub(" ", str(text).lower().translate(LOOKALIKE))


def topic(low: str) -> str | None:
    """'strong' / 'cooccur' / None, on normalised text."""
    if STRONG_RE.search(low):
        return "strong"
    w = config.COOCCUR_WINDOW
    for m in WOMEN_RE.finditer(low):
        if UKR_RE.search(low, max(0, m.start() - w), m.end() + w):
            return "cooccur"
    return None


def minor_signal(low: str) -> str | None:
    """'age' / 'word' / None. Unambiguous signals only."""
    if any(int(m.group(1)) < 18 for m in MINOR_AGE_RE.finditer(low)):
        return "age"
    if MINOR_WORDS_RE.search(low):
        return "word"
    return None


def unsafe(low: str) -> tuple[bool, str | None, str | None]:
    """(drop?, minor trigger, sexual trigger) under the minor-safety rule."""
    if ALWAYS_RE.search(low):
        return True, "nymphet", None
    ms, sx = minor_signal(low), SEXUAL_RE.search(low)
    return bool(ms and sx), ms, (sx.group(0) if sx else None)


def refugee_flag(low: str) -> bool:
    return bool(REF_RE.search(low))


def has_slur(text: str) -> bool:
    return bool(SLUR_RE.search(normalise(text)))


def is_overt(text: str) -> bool:
    """Slur, insult or mocking emoji in the post itself (see config.OVERT)."""
    return bool(OVERT_RE.search(normalise(text)))


def dedup_key(low: str) -> str:
    return re.sub(r"\W+", " ", low).strip()[:300]
