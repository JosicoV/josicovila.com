"""Emparejamiento literal por título y álbum.

MuQ relaciona audio con descripciones; de los títulos no sabe nada. Esta capa
cubre el otro caso de uso: alguien que recuerda el nombre de una canción.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher

# Clases de coincidencia, de más a menos fuerte. Se modelan por separado en vez
# de con un único número difuso para poder explicarlas y ajustarlas.
MATCH_TYPES = (
    "exact_title",
    "prefix_title",
    "all_tokens_title",
    "partial_title",
    "substring_title",
    "fuzzy_title",
    "exact_album",
    "all_tokens_album",
    "partial_album",
    None,
)

# Puntuación base de cada clase, en 0..1.
CLASS_SCORES = {
    "exact_title": 1.00,
    "prefix_title": 0.86,
    "all_tokens_title": 0.80,
    "partial_title": 0.55,   # se escala por cobertura
    "substring_title": 0.50,
    "fuzzy_title": 0.40,     # se escala por similitud
    "exact_album": 0.70,
    "all_tokens_album": 0.60,
    "partial_album": 0.35,   # se escala por cobertura
}

# Palabras vacías que no deberían, por sí solas, justificar una coincidencia.
STOPWORDS = frozenset(
    {
        "a", "al", "an", "and", "de", "del", "el", "en", "for", "in", "la", "las",
        "lo", "los", "of", "on", "or", "para", "por", "que", "the", "to", "un",
        "una", "with", "y",
    }
)

_PUNTUACION = re.compile(r"[^\w\s]+", re.UNICODE)
_ESPACIOS = re.compile(r"\s+")


def strip_accents(texto: str) -> str:
    descompuesto = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in descompuesto if not unicodedata.combining(c))


def normalize(texto: str) -> str:
    """Normalización determinista para comparar texto.

    Minúsculas, sin acentos, sin puntuación y con los espacios colapsados. Se
    quitan los acentos a propósito para que `melancolica` encuentre
    `melancólica`, que es como la mayoría de la gente teclea con prisa.
    """
    sin_acentos = strip_accents(texto).casefold()
    sin_puntuacion = _PUNTUACION.sub(" ", sin_acentos)
    return _ESPACIOS.sub(" ", sin_puntuacion).strip()


def tokenize(texto: str) -> list[str]:
    normalizado = normalize(texto)
    return normalizado.split() if normalizado else []


def content_tokens(tokens: list[str]) -> list[str]:
    """Tokens con carga semántica. Si sólo hay vacías, se devuelven todas:
    una consulta como `the` no debe quedarse sin nada que comparar."""
    contenido = [t for t in tokens if t not in STOPWORDS]
    return contenido or tokens


@dataclass(frozen=True)
class LiteralMatch:
    title_score: float = 0.0
    album_score: float = 0.0
    match_type: str | None = None

    @property
    def score(self) -> float:
        return max(self.title_score, self.album_score)


def _puntuar_campo(consulta: str, campo: str, *, es_titulo: bool) -> tuple[float, str | None]:
    """Devuelve la clase más fuerte que encaja entre la consulta y el campo."""
    if not campo:
        return 0.0, None

    q_norm, c_norm = normalize(consulta), normalize(campo)
    if not q_norm or not c_norm:
        return 0.0, None

    sufijo = "title" if es_titulo else "album"

    if q_norm == c_norm:
        clase = f"exact_{sufijo}"
        return CLASS_SCORES[clase], clase

    q_tokens, c_tokens = tokenize(consulta), tokenize(campo)
    q_contenido = content_tokens(q_tokens)
    c_conjunto = set(c_tokens)

    if es_titulo and c_norm.startswith(q_norm + " "):
        return CLASS_SCORES["prefix_title"], "prefix_title"

    presentes = [t for t in q_contenido if t in c_conjunto]
    cobertura = len(presentes) / len(q_contenido) if q_contenido else 0.0

    if cobertura >= 1.0:
        clase = f"all_tokens_{sufijo}"
        return CLASS_SCORES[clase], clase

    if presentes:
        clase = f"partial_{sufijo}"
        # Escalar por cobertura es lo que impide que un único token de título
        # dentro de una frase descriptiva larga se comporte como un acierto.
        return CLASS_SCORES[clase] * cobertura, clase

    if not es_titulo:
        return 0.0, None

    if q_norm in c_norm:
        return CLASS_SCORES["substring_title"], "substring_title"

    # Difuso sólo para consultas de una palabra: en frases largas produce
    # coincidencias caprichosas más que aciertos.
    if len(q_tokens) == 1:
        mejor = max(
            (SequenceMatcher(None, q_norm, token).ratio() for token in c_tokens),
            default=0.0,
        )
        if mejor >= 0.8:
            return CLASS_SCORES["fuzzy_title"] * mejor, "fuzzy_title"

    return 0.0, None


def score_literal(consulta: str, title: str, album: str) -> LiteralMatch:
    """Puntúa una pista contra la consulta, por título y por álbum.

    El título y el álbum se mantienen separados: una coincidencia de álbum es
    útil pero nunca debe pesar como un título exacto.
    """
    titulo_score, titulo_clase = _puntuar_campo(consulta, title, es_titulo=True)
    album_score, album_clase = _puntuar_campo(consulta, album, es_titulo=False)

    clase = titulo_clase if titulo_score >= album_score and titulo_clase else album_clase
    return LiteralMatch(title_score=titulo_score, album_score=album_score, match_type=clase)
