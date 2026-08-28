"""Deriva el estado final a partir del histórico append-only.

Nunca se reescriben las líneas antiguas: si alguien pulsa "No" y luego "Sí",
quedan los dos eventos y es aquí donde se decide que el estado final es "Sí".
El JSONL original no se toca jamás.
"""

from __future__ import annotations

import statistics
from typing import Any, Iterable

from .schema import FEEDBACK_EVENTS


# Margen para considerar que dos búsquedas seguidas de la misma sesión son la
# misma intención escribiéndose. El buscador dispara tras 350 ms de pausa al
# teclear, así que "música relajante" puede dejar cuatro eventos.
TYPING_WINDOW_SECONDS = 12.0


def _clave(evento: dict[str, Any]) -> tuple[str, str] | None:
    search_id, track_id = evento.get("search_id"), evento.get("track_id")
    return (search_id, track_id) if search_id and track_id else None


def _instante(evento: dict[str, Any]) -> float:
    from datetime import datetime

    marca = evento.get("timestamp", "")
    try:
        return datetime.fromisoformat(marca.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def mark_superseded(eventos: list[dict[str, Any]]) -> set[str]:
    """search_id de búsquedas que sólo fueron un paso al teclear.

    Una búsqueda se considera superada si, en la misma sesión, otra la sigue en
    pocos segundos y con la primera nadie interactuó. No se borra nada: se
    marca, para que los recuentos no digan que hubo cuatro búsquedas cuando el
    usuario hizo una.
    """
    busquedas = [e for e in eventos if e.get("event_type") == "search_performed" and e.get("search_id")]
    con_interaccion = {
        e["search_id"]
        for e in eventos
        if e.get("event_type") not in {"search_performed", "query_reformulated"} and e.get("search_id")
    }

    por_sesion: dict[str, list[dict[str, Any]]] = {}
    for busqueda in busquedas:
        por_sesion.setdefault(busqueda.get("anon_session_id") or "", []).append(busqueda)

    superadas = set()
    for lista in por_sesion.values():
        lista.sort(key=_instante)
        for actual, siguiente in zip(lista, lista[1:]):
            if actual["search_id"] in con_interaccion:
                continue
            if _instante(siguiente) - _instante(actual) <= TYPING_WINDOW_SECONDS:
                superadas.add(actual["search_id"])
    return superadas


def resolve_feedback(eventos: Iterable[dict[str, Any]]) -> dict[tuple[str, str], str]:
    """Último feedback por (búsqueda, pista).

    Gana el más reciente por marca de tiempo; a igualdad, el que aparezca más
    tarde en el fichero. Así un `No` corregido a `Sí` se exporta como `Sí`.
    """
    ultimo: dict[tuple[str, str], tuple[str, int, str]] = {}
    for posicion, evento in enumerate(eventos):
        if evento.get("event_type") not in FEEDBACK_EVENTS:
            continue
        clave = _clave(evento)
        if clave is None:
            continue
        marca = (evento.get("timestamp", ""), posicion, evento["event_type"])
        anterior = ultimo.get(clave)
        if anterior is None or marca[:2] > anterior[:2]:
            ultimo[clave] = marca
    return {clave: valor[2] for clave, valor in ultimo.items()}


def consolidate_listening(eventos: Iterable[dict[str, Any]]) -> dict[tuple[str, str], dict[str, Any]]:
    """Une los resúmenes de escucha de una misma pista en una búsqueda.

    Regla: se conserva la escucha MÁS LARGA, no la suma. Si alguien oye 30 s,
    salta y vuelve a oír 20 s, sumar daría 50 s y exageraría el interés; el
    máximo describe mejor cuánto aguantó de una vez. Las repeticiones se
    cuentan aparte, en `replayed`.
    """
    resumen: dict[tuple[str, str], dict[str, Any]] = {}
    for evento in eventos:
        tipo = evento.get("event_type")
        clave = _clave(evento)
        if clave is None:
            continue

        if tipo in {"play_summary", "play_completed", "quick_skip"}:
            actual = resumen.setdefault(
                clave,
                {"seconds_listened": 0.0, "listen_ratio": 0.0, "completed": False, "quick_skip": False, "replayed": 0},
            )
            if evento.get("seconds_listened", 0) > actual["seconds_listened"]:
                actual["seconds_listened"] = evento.get("seconds_listened", 0.0)
                actual["listen_ratio"] = evento.get("listen_ratio", 0.0)
            actual["completed"] = actual["completed"] or bool(evento.get("completed"))
            if tipo == "quick_skip":
                actual["quick_skip"] = True
            if tipo == "play_completed":
                actual["completed"] = True

        elif tipo == "replay":
            actual = resumen.setdefault(
                clave,
                {"seconds_listened": 0.0, "listen_ratio": 0.0, "completed": False, "quick_skip": False, "replayed": 0},
            )
            actual["replayed"] += 1
    return resumen


def build_dataset(eventos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Una fila por (búsqueda, pista mostrada), con todas las señales unidas.

    Se parte de la instantánea guardada en `search_performed`: hace falta saber
    qué alternativas se le enseñaron al usuario, no sólo cuál eligió.
    """
    busquedas = {e["search_id"]: e for e in eventos if e.get("event_type") == "search_performed" and e.get("search_id")}
    feedback = resolve_feedback(eventos)
    escuchas = consolidate_listening(eventos)
    clics = {_clave(e) for e in eventos if e.get("event_type") == "result_clicked" and _clave(e)}
    superadas = mark_superseded(eventos)

    filas = []
    for search_id, busqueda in busquedas.items():
        for resultado in busqueda.get("results", []):
            clave = (search_id, resultado.get("track_id"))
            escucha = escuchas.get(clave, {})
            estado = feedback.get(clave)
            filas.append(
                {
                    "search_id": search_id,
                    "timestamp": busqueda.get("timestamp"),
                    "anon_session_id": busqueda.get("anon_session_id"),
                    "query": busqueda.get("query"),
                    "query_language": busqueda.get("query_language"),
                    "query_normalized_en": busqueda.get("query_normalized_en"),
                    "query_intent": busqueda.get("query_intent"),
                    # Búsqueda intermedia de teclear: útil conservarla, pero no
                    # se debería entrenar con ella.
                    "superseded": search_id in superadas,
                    "index_version": busqueda.get("index_version"),
                    "search_version": busqueda.get("search_version"),
                    "track_id": resultado.get("track_id"),
                    "composition_id": resultado.get("composition_id"),
                    "rank": resultado.get("rank"),
                    "semantic_score": resultado.get("semantic_score"),
                    "literal_title_score": resultado.get("literal_title_score"),
                    "literal_album_score": resultado.get("literal_album_score"),
                    "hybrid_score": resultado.get("hybrid_score"),
                    "match_reasons": resultado.get("match_reasons", []),
                    "clicked": clave in clics,
                    "seconds_listened": escucha.get("seconds_listened", 0.0),
                    "listen_ratio": escucha.get("listen_ratio", 0.0),
                    "completed": escucha.get("completed", False),
                    "quick_skip": escucha.get("quick_skip", False),
                    "replayed": escucha.get("replayed", 0),
                    "explicit_match": estado == "feedback_match",
                    "explicit_no_match": estado == "feedback_no_match",
                }
            )
    return filas


def summarize(eventos: list[dict[str, Any]]) -> dict[str, Any]:
    """Resumen legible del histórico."""
    por_tipo: dict[str, int] = {}
    for evento in eventos:
        tipo = evento.get("event_type", "?")
        por_tipo[tipo] = por_tipo.get(tipo, 0) + 1

    feedback = resolve_feedback(eventos)
    positivos = sum(1 for v in feedback.values() if v == "feedback_match")
    negativos = sum(1 for v in feedback.values() if v == "feedback_no_match")

    rangos = [e["rank"] for e in eventos if e.get("event_type") == "result_clicked" and e.get("rank")]
    proporciones = [
        e["listen_ratio"]
        for e in eventos
        if e.get("event_type") in {"play_summary", "play_completed"} and e.get("listen_ratio") is not None
    ]

    busquedas = {e["search_id"] for e in eventos if e.get("event_type") == "search_performed" and e.get("search_id")}
    superadas = mark_superseded(eventos)
    asentadas = busquedas - superadas
    con_feedback = {clave[0] for clave in feedback}

    return {
        "events": len(eventos),
        "events_by_type": dict(sorted(por_tipo.items())),
        "searches": len(busquedas),
        # Búsquedas reales: las intermedias de teclear no cuentan.
        "settled_searches": len(asentadas),
        "typing_steps": len(superadas),
        "result_clicks": por_tipo.get("result_clicked", 0),
        "feedback_yes": positivos,
        "feedback_no": negativos,
        "average_clicked_rank": round(statistics.fmean(rangos), 2) if rangos else None,
        "quick_skips": por_tipo.get("quick_skip", 0),
        "replays": por_tipo.get("replay", 0),
        "median_listen_ratio": round(statistics.median(proporciones), 3) if proporciones else None,
        "searches_with_feedback_pct": round(100 * len(con_feedback & asentadas) / len(asentadas), 1) if asentadas else 0.0,
    }
