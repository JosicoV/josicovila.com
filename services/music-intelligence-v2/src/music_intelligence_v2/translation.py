from __future__ import annotations

import re
import unicodedata


SPANISH_MARKERS = {
    "algo",
    "antiguas",
    "arpa",
    "bosque",
    "caminando",
    "caminar",
    "con",
    "coro",
    "epica",
    "fantasia",
    "flauta",
    "heroico",
    "melancolica",
    "musica",
    "oscuro",
    "para",
    "pero",
    "pieza",
    "que",
    "reflexivo",
    "ruinas",
    "suave",
    "tranquila",
    "una",
    "unas",
}


def detect_es_or_en(text: str) -> str:
    """Deterministic detector for the deliberately bounded es/en search input."""
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").casefold()
    tokens = set(re.findall(r"[a-z]+", normalized))
    return "es" if tokens & SPANISH_MARKERS else "en"
