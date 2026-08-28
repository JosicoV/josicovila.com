"""Benchmark de búsqueda híbrida: semántica sola frente a híbrida.

Ejecuta el mismo conjunto de consultas en los dos modos, guarda todas las
puntuaciones internas y genera una hoja de revisión humana. No decide nada:
produce el material para que una persona juzgue si la híbrida mejora las
búsquedas por título sin estropear las descriptivas.

    python benchmark_hybrid.py
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.indexing import resolve_index_dir  # noqa: E402
from music_intelligence_v2.service.bootstrap import build_service  # noqa: E402
from music_intelligence_v2.service.hybrid import DEFAULT_RELEVANCE, apply_relevance  # noqa: E402

DATA_ROOT = REPOSITORY_ROOT / "data" / "music-intelligence-v2"
RESULTS_ROOT = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "phase6"

# Consultas del documento de fase, agrupadas por lo que ponen a prueba.
QUERY_SETS: dict[str, list[str]] = {
    "literal": [
        "guide",
        "the guide girl",
        "guide girl",
        "avalon",
        "edge",
        "believe",
        "live",
        "dragon",
        "dragon rage",
        "quest for avalon",
        "pegasus",
    ],
    "semantic": [
        "soft medieval flute",
        "dark but peaceful",
        "music for exploring ancient ruins",
        "heroic but reflective",
        "epic orchestral music with choir",
        "music for a quiet sunrise",
    ],
    "mixed": [
        "dark guide",
        "guide through a dark forest",
        "a mysterious guide crossing an ancient forest",
        "something that makes me believe again",
        "music on the edge of a battle",
        "dragon music for a peaceful fantasy scene",
    ],
    "spanish": [
        "guide",
        "the guide girl",
        "musica oscura pero tranquila",
        "musica medieval suave con flauta",
        "musica para explorar unas ruinas antiguas",
    ],
}

# Para cada consulta con una expectativa clara, qué título debería aparecer
# arriba. Sirve para medir, no para forzar el ranking.
EXPECTED_TITLE: dict[str, str] = {
    "guide": "The Guide Girl",
    "the guide girl": "The Guide Girl",
    "guide girl": "The Guide Girl",
    "avalon": "Quest for Avalon",
    "quest for avalon": "Quest for Avalon",
    "edge": "The edge of the unknown",
    "believe": "Believe",
    "live": "Live",
    "dragon rage": "Dragon Rage",
    "pegasus": "Pegasus",
}


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results-dir", type=Path, default=RESULTS_ROOT)
    parser.add_argument("--data-root", type=Path, default=DATA_ROOT)
    parser.add_argument("--device", choices=["auto", "cuda", "cpu"], default="auto")
    parser.add_argument("--limit", type=int, default=8)
    parser.add_argument("--repeats", type=int, default=3, help="Repeticiones para medir latencia.")
    return parser.parse_args()


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporal = path.with_suffix(path.suffix + ".tmp")
    temporal.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporal, path)


def rango_de_titulo(resultados: list[dict[str, Any]], titulo: str) -> int | None:
    for resultado in resultados:
        if resultado["title"].casefold() == titulo.casefold():
            return resultado["rank"]
    return None


def evaluar_cortes(puntuaciones: list[float], intent: str) -> dict[str, int]:
    """Cuántos resultados dejaría cada estrategia de relevancia.

    Se pasa la intención para que los números coincidan con los que ve el
    usuario: el mínimo de resultados depende de ella.
    """
    return {
        estrategia: apply_relevance(
            puntuaciones, {**DEFAULT_RELEVANCE, "strategy": estrategia}, intent=intent
        )
        for estrategia in ("absolute", "relative", "elbow")
    }


def main() -> int:
    args = parse_arguments()
    args.results_dir.mkdir(parents=True, exist_ok=True)

    directorio = resolve_index_dir(args.data_root)
    if directorio is None:
        print(f"No hay índice bajo {args.data_root}", file=sys.stderr)
        return 1

    print(f"Cargando servicio (índice {directorio.name})...")
    arranque = build_service(
        index_dir=directorio,
        model_registry=SERVICE_ROOT / "config" / "model_registry.json",
        translation_registry=SERVICE_ROOT / "config" / "translation_registry.json",
        repository_root=REPOSITORY_ROOT,
        device=args.device,
    )
    servicio = arranque.service
    # Sin corte: el informe necesita la lista completa para poder comparar las
    # tres estrategias sobre los mismos datos.
    servicio.relevance = {"strategy": "none"}

    filas_csv: list[dict[str, Any]] = []
    consultas: list[dict[str, Any]] = []
    latencias: dict[str, list[float]] = {"semantic": [], "hybrid": []}

    for categoria, textos in QUERY_SETS.items():
        for texto in textos:
            registro: dict[str, Any] = {"query": texto, "category": categoria}
            esperado = EXPECTED_TITLE.get(texto.casefold())
            if esperado:
                registro["expected_title"] = esperado

            for modo in ("semantic", "hybrid"):
                servicio.hybrid = modo == "hybrid"
                iniciado = time.perf_counter()
                respuesta, telemetria = servicio.search(
                    {"query": texto, "limit": args.limit}, diagnostics=True
                )
                latencias[modo].append((time.perf_counter() - iniciado) * 1000)
                resultados = respuesta["results"]

                registro[modo] = {
                    "intent": telemetria["query_intent"],
                    "detected_language": respuesta["detected_language"],
                    "normalized_query": respuesta["query_normalized_en"],
                    "results": resultados,
                    "relevance_cuts": evaluar_cortes(
                        [r["diagnostics"]["hybrid_score"] for r in resultados],
                        telemetria["query_intent"],
                    ),
                }
                if esperado:
                    registro[modo]["expected_rank"] = rango_de_titulo(resultados, esperado)

                conservados = registro[modo]["relevance_cuts"]["relative"]
                for resultado in resultados:
                    d = resultado["diagnostics"]
                    filas_csv.append(
                        {
                            "query": texto,
                            "category": categoria,
                            "mode": modo,
                            "rank": resultado["rank"],
                            "track": resultado["title"],
                            "album": resultado["album"],
                            "semantic_score": round(d["semantic_score"], 4),
                            "literal_title_score": round(d["literal_title_score"], 4),
                            "literal_album_score": round(d["literal_album_score"], 4),
                            "literal_match_type": d["literal_match_type"] or "",
                            "hybrid_score": round(d["hybrid_score"], 4),
                            "match_reason": " + ".join(resultado["match_reasons"]),
                            "best_segment": f"{resultado['match']['best_segment_start']}-{resultado['match']['best_segment_end']}",
                            "included": "yes" if resultado["rank"] <= conservados else "no",
                            "human_relevance": "",
                            "notes": "",
                        }
                    )
            consultas.append(registro)

    # ---------------------------------------------------------------- resumen
    con_expectativa = [c for c in consultas if "expected_title" in c]

    def aciertos(modo: str, tope: int) -> int:
        return sum(
            1
            for c in con_expectativa
            if c[modo].get("expected_rank") is not None and c[modo]["expected_rank"] <= tope
        )

    def movimiento_semantico() -> dict[str, Any]:
        """Cuánto se mueve el top-5 en las consultas descriptivas."""
        solapes = []
        for c in consultas:
            if c["category"] not in {"semantic"}:
                continue
            sem = [r["track_id"] for r in c["semantic"]["results"][:5]]
            hib = [r["track_id"] for r in c["hybrid"]["results"][:5]]
            solapes.append(len(set(sem) & set(hib)) / max(1, len(sem)))
        return {
            "queries": len(solapes),
            "mean_top5_overlap": round(statistics.fmean(solapes), 3) if solapes else 0.0,
            "unchanged_top1": sum(
                1
                for c in consultas
                if c["category"] == "semantic"
                and c["semantic"]["results"][0]["track_id"] == c["hybrid"]["results"][0]["track_id"]
            ),
        }

    resumen = {
        "queries": len(consultas),
        "queries_with_expected_title": len(con_expectativa),
        "expected_at_rank_1": {"semantic": aciertos("semantic", 1), "hybrid": aciertos("hybrid", 1)},
        "expected_in_top_3": {"semantic": aciertos("semantic", 3), "hybrid": aciertos("hybrid", 3)},
        "expected_in_top_8": {"semantic": aciertos("semantic", 8), "hybrid": aciertos("hybrid", 8)},
        "semantic_regression": movimiento_semantico(),
        "latency_ms": {
            modo: {
                "mean": round(statistics.fmean(valores), 2),
                "p95": round(sorted(valores)[int(0.95 * (len(valores) - 1))], 2),
            }
            for modo, valores in latencias.items()
        },
    }

    informe = {
        "measured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "index_version": servicio.index.index_version,
        "device": arranque.device,
        "limit": args.limit,
        "summary": resumen,
        "queries": consultas,
    }
    write_json(args.results_dir / "hybrid_comparison.json", informe)

    campos = list(filas_csv[0].keys())
    with (args.results_dir / "human_review_hybrid.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        escritor = csv.DictWriter(handle, fieldnames=campos)
        escritor.writeheader()
        escritor.writerows(filas_csv)

    print(json.dumps(resumen, ensure_ascii=False, indent=2))
    print(f"\nDetalle:  {args.results_dir / 'hybrid_comparison.json'}")
    print(f"Revisión: {args.results_dir / 'human_review_hybrid.csv'}  ({len(filas_csv)} filas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
