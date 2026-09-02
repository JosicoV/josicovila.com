from __future__ import annotations

import re
import unicodedata


# Conservador a propósito: no añadir voces compartidas con el inglés (piano,
# violin, solo, honor...) porque una falsa detección rompería búsquedas exactas.
SPANISH_MARKERS = {
    "alegre",
    "alegria",
    "algo",
    "antiguas",
    "arpa",
    "aunque",
    "batalla",
    "bosque",
    "buscar",
    "busco",
    "calma",
    "caminando",
    "caminar",
    "con",
    "coro",
    "cuando",
    "cuerdas",
    "desde",
    "donde",
    "epica",
    "entre",
    "esperanza",
    "fantasia",
    "flauta",
    "guitarra",
    "hacia",
    "hasta",
    "heroico",
    "juego",
    "lenta",
    "lento",
    "magia",
    "magica",
    "magico",
    "melancolica",
    "miedo",
    "mientras",
    "misterio",
    "misteriosa",
    "misterioso",
    "musica",
    "necesito",
    "oscuro",
    "para",
    "parezca",
    "pero",
    "pieza",
    "poderosa",
    "poderoso",
    "porque",
    "que",
    "quiero",
    "quisiera",
    "rapida",
    "rapido",
    "reflexivo",
    "ruinas",
    "sobre",
    "suave",
    "suena",
    "suene",
    "taberna",
    "tambores",
    "tranquila",
    "triste",
    "tristeza",
    "una",
    "unas",
    "viaje",
    "voces",
    "y",
}

# Variantes muy acotadas para que una palabra traducida pueda rescatar un
# título o álbum aunque la consulta completa contenga además una descripción.
# No se usa un diccionario general: añadir términos aquí cambia qué pistas
# pueden entrar en la piscina literal y debe responder a casos comprobados.
SPANISH_LITERAL_ALIASES = {
    "taberna": "tavern",
}


def detect_es_or_en(text: str) -> str:
    """Deterministic detector for the deliberately bounded es/en search input."""
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").casefold()
    tokens = set(re.findall(r"[a-z]+", normalized))
    return "es" if tokens & SPANISH_MARKERS else "en"


def literal_alias_queries(text: str) -> list[str]:
    """Devuelve variantes inglesas concretas presentes en una consulta ES."""
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").casefold()
    tokens = set(re.findall(r"[a-z]+", normalized))
    return [alias for source, alias in SPANISH_LITERAL_ALIASES.items() if source in tokens]
