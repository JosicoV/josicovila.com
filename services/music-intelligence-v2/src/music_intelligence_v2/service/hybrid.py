"""Mezcla de la señal literal con la semántica, y corte por relevancia.

Todos los números viven aquí: no hay pesos repartidos por el código.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .textmatch import LiteralMatch, content_tokens, tokenize

# --------------------------------------------------------------------------
# Intención de la consulta
# --------------------------------------------------------------------------

QUERY_INTENTS = ("identifier", "mixed", "descriptive")

# Palabras que delatan una descripción y no un título. Deliberadamente cortas y
# revisables: la alternativa sería un clasificador, que el documento descarta.
# Se excluyen a propósito palabras muy comunes en títulos ("for", "with",
# "that"): marcarlas convertiría "Quest for Avalon" en una descripción.
DESCRIPTIVE_MARKERS = frozenset(
    {
        # inglés
        "music", "song", "songs", "track", "sound", "sounds", "something",
        "like", "feels", "feeling", "mood", "vibe", "while", "when",
        # español (por si llega sin traducir)
        "musica", "cancion", "canciones", "tema", "algo", "mientras",
        "cuando", "sensacion",
    }
)

MAX_IDENTIFIER_TOKENS = 3
MIN_DESCRIPTIVE_TOKENS = 4


def classify_intent(consulta: str) -> str:
    """Clasifica la consulta en identificador, mixta o descriptiva.

    Una mala clasificación sólo hace daño cuando además existe una coincidencia
    literal: si nadie se parece al texto, la componente literal vale cero y
    manda la semántica de todos modos.
    """
    tokens = tokenize(consulta)
    if not tokens:
        return "descriptive"

    marcadores = sum(1 for t in tokens if t in DESCRIPTIVE_MARKERS)
    contenido = content_tokens(tokens)

    if len(tokens) >= MIN_DESCRIPTIVE_TOKENS or marcadores >= 1:
        return "descriptive"
    if len(contenido) <= MAX_IDENTIFIER_TOKENS and marcadores == 0:
        return "identifier"
    return "mixed"


# --------------------------------------------------------------------------
# Pesos
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class HybridWeights:
    semantic: float
    title: float
    album: float
    # Empujón adicional cuando el título coincide exactamente o casi. Da
    # precedencia casi determinista sin romper el orden por completo.
    exact_title_bonus: float = 0.0


# `semantic` se aplica sobre la puntuación semántica normalizada a 0..1 dentro
# del conjunto de candidatos, así que los pesos son comparables entre sí.
WEIGHTS: dict[str, HybridWeights] = {
    # El usuario teclea un nombre: el título manda.
    "identifier": HybridWeights(semantic=0.35, title=1.00, album=0.45, exact_title_bonus=1.00),
    # Ni una cosa ni otra: ambas señales suman.
    "mixed": HybridWeights(semantic=0.75, title=0.55, album=0.20, exact_title_bonus=0.60),
    # El usuario describe una escena: la coincidencia de palabras es anecdótica.
    "descriptive": HybridWeights(semantic=1.00, title=0.18, album=0.06, exact_title_bonus=0.35),
}

# Clases que se consideran "el título que buscaba".
STRONG_TITLE_MATCHES = frozenset({"exact_title", "prefix_title", "all_tokens_title"})


def effective_intent(intent: str, hay_coincidencia_fuerte: bool, hay_exacta: bool = False) -> str:
    """Corrige la intención con lo que de verdad hay en el catálogo.

    En los dos sentidos:

    - Un título exacto es evidencia inequívoca, mida lo que mida la consulta.
      Sin esto, teclear un título largo entero ("the edge of the unknown", cinco
      palabras) lo clasificaría como descripción y podría no llegar al primer
      puesto.
    - Al revés, con dos palabras como `dark guide` la heurística ve un título
      donde no lo hay. Si ninguno cubre la consulta entera, tratarla como
      identificador premia a cualquiera que comparta una palabra suelta, así que
      se rebaja y vuelve a decidir la música.
    """
    if hay_exacta:
        return "identifier"
    if intent == "identifier" and not hay_coincidencia_fuerte:
        return "mixed"
    return intent

# Por debajo de esto, una coincidencia literal no merece entrar al conjunto de
# candidatos por sí sola.
LITERAL_CANDIDATE_THRESHOLD = 0.34

# Cuántos candidatos semánticos se consideran antes de rerankear.
SEMANTIC_POOL_SIZE = 30


def hybrid_score(
    semantic_normalized: float,
    literal: LiteralMatch,
    intent: str,
) -> float:
    pesos = WEIGHTS[intent]
    puntuacion = (
        pesos.semantic * semantic_normalized
        + pesos.title * literal.title_score
        + pesos.album * literal.album_score
    )
    if literal.match_type in STRONG_TITLE_MATCHES:
        puntuacion += pesos.exact_title_bonus * literal.title_score
    return puntuacion


# --------------------------------------------------------------------------
# Etiquetas de explicación
# --------------------------------------------------------------------------

MATCH_LABELS = {
    "exact_title": "Exact title match",
    "prefix_title": "Title match",
    "all_tokens_title": "Title match",
    "partial_title": "Partial title match",
    "substring_title": "Partial title match",
    "fuzzy_title": "Similar title",
    "exact_album": "Album match",
    "all_tokens_album": "Album match",
    "partial_album": "Partial album match",
}

CLOSEST_CATALOGUE_LABEL = "Closest in the discography"

STRONG_SEMANTIC_NORMALIZED = 0.75


def match_reasons(
    literal: LiteralMatch,
    semantic_normalized: float,
    *,
    catalogue_fit: str = "clear",
) -> list[str]:
    """Motivos legibles por los que una pista aparece. Nunca porcentajes:
    las similitudes internas no son probabilidades calibradas."""
    razones = []
    etiqueta = MATCH_LABELS.get(literal.match_type or "")
    if etiqueta:
        razones.append(etiqueta)
    if catalogue_fit == "closest":
        razones.append(CLOSEST_CATALOGUE_LABEL)
        return razones
    if semantic_normalized >= STRONG_SEMANTIC_NORMALIZED:
        razones.append("Strong musical match")
    elif not razones:
        razones.append("Musical similarity")
    return razones


# --------------------------------------------------------------------------
# Ajuste global de la consulta a la discografía
# --------------------------------------------------------------------------

DEFAULT_CATALOGUE_FIT = {
    "enabled": False,
    # Calibrado con consultas propias y deliberadamente ajenas al catálogo.
    # Sólo cambia el lenguaje de la interfaz: nunca elimina ni reordena pistas.
    "absolute_minimum": 0.30,
}


def catalogue_fit_level(
    ranked: list[dict[str, Any]],
    config: dict[str, Any] | None = None,
) -> str:
    """Indica si hay un encaje claro o sólo candidatos cercanos.

    La señal usa el coseno original de MuQ, antes de normalizar y mezclar el
    ranking. El máximo normalizado siempre vale 1 y no permite distinguir una
    consulta excelente de otra completamente ajena al catálogo.
    """
    settings = {**DEFAULT_CATALOGUE_FIT, **(config or {})}
    if not settings["enabled"] or not ranked:
        return "clear"

    # Un título completo es evidencia directa aunque el audio-texto puntúe
    # bajo; nunca se presenta como una mera aproximación.
    if any(
        (item.get("literal") or LiteralMatch()).match_type in STRONG_TITLE_MATCHES
        for item in ranked
    ):
        return "clear"

    best_raw = max(float(item.get("semantic_raw", item["score"])) for item in ranked)
    return "clear" if best_raw >= float(settings["absolute_minimum"]) else "closest"


# --------------------------------------------------------------------------
# Corte por relevancia
# --------------------------------------------------------------------------

RELEVANCE_STRATEGIES = ("none", "absolute", "relative", "elbow")

DEFAULT_RELEVANCE = {
    "strategy": "relative",
    # Fracción de la mejor puntuación por debajo de la cual se descarta.
    "relative_ratio": 0.55,
    # Puntuación híbrida mínima en términos absolutos.
    "absolute_minimum": 0.30,
    # Caída relativa entre consecutivos que se lee como final de la lista.
    "elbow_drop": 0.28,
    # `None` significa "dedúcelo de la intención". Un entero aquí lo fija.
    # No se pone 1 como valor por defecto a propósito: quien copiase este
    # diccionario para cambiar otra cosa estaría anulando sin querer el mínimo
    # por intención.
    "minimum_results": None,
}

# Mínimo de resultados según lo que el usuario parece estar haciendo.
#
# Bajar el umbral general para que las descriptivas devolvieran más no sirve:
# de 0,45 hacia abajo casi todas las consultas vuelven a dar 8 y el filtro deja
# de existir. El problema real es otro: un único resultado en una búsqueda
# descriptiva se siente roto —la promesa es descubrir— mientras que en una
# búsqueda por título es exactamente lo correcto.
#
# Con un mínimo por intención se corrige eso sin rebajar el listón de calidad
# en todas las búsquedas.
MINIMUM_RESULTS_BY_INTENT = {
    "identifier": 1,
    "mixed": 3,
    "descriptive": 4,
}


def apply_relevance(
    puntuaciones: list[float],
    config: dict[str, Any] | None = None,
    intent: str | None = None,
) -> int:
    """Cuántos de los candidatos ya ordenados merecen mostrarse.

    `limit` es un máximo, no una cuota: si sólo tres resultados son buenos, se
    devuelven tres. El mínimo depende de la intención, salvo que se fije uno
    explícito en `config`.
    """
    ajustes = {**DEFAULT_RELEVANCE, **(config or {})}
    if not puntuaciones:
        return 0

    minimo_base = ajustes["minimum_results"]
    if minimo_base is None:
        minimo_base = MINIMUM_RESULTS_BY_INTENT.get(intent, 1) if intent else 1
    # Nunca por encima de los candidatos que de verdad hay.
    minimo = max(1, min(int(minimo_base), len(puntuaciones)))
    estrategia = ajustes["strategy"]

    if estrategia == "none":
        return len(puntuaciones)

    if estrategia == "absolute":
        conservados = sum(1 for p in puntuaciones if p >= ajustes["absolute_minimum"])
        return max(minimo, conservados)

    if estrategia == "relative":
        umbral = puntuaciones[0] * ajustes["relative_ratio"]
        conservados = sum(1 for p in puntuaciones if p >= umbral)
        return max(minimo, conservados)

    if estrategia == "elbow":
        for posicion in range(1, len(puntuaciones)):
            anterior = puntuaciones[posicion - 1]
            if anterior <= 0:
                break
            caida = (anterior - puntuaciones[posicion]) / anterior
            if caida >= ajustes["elbow_drop"]:
                return max(minimo, posicion)
        return len(puntuaciones)

    raise ValueError(f"Estrategia de relevancia desconocida: {estrategia}")
