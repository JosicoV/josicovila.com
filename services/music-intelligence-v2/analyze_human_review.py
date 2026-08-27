from __future__ import annotations

import argparse
import json
import statistics
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path
from typing import Any

from review_app import DEFAULT_CSV, HUMAN_FIELDS, ReviewStore


BENCHMARK_ROOT = DEFAULT_CSV.parent
DEFAULT_JSON = BENCHMARK_ROOT / "results" / "human_review_quick_analysis.json"
DEFAULT_REPORT = BENCHMARK_ROOT / "PHASE1_HUMAN_REVIEW_REPORT.md"
SYSTEM_LABELS = {
    "figma:segment": "FIGMA · Segmento",
    "figma:hybrid": "FIGMA · Híbrido",
    "muq_mulan:segment": "MuQ-MuLan · Segmento",
    "muq_mulan:hybrid": "MuQ-MuLan · Híbrido",
}


def system_key(model: str, mode: str) -> str:
    return f"{model}:{mode}"


def build_analysis(store: ReviewStore) -> dict[str, Any]:
    quick_review = store.bootstrap()["quick_review"]
    quick_rows = quick_review["rows"]
    pending = [row for row in quick_rows if not row["human_score"]]
    conflicts = [row for row in quick_rows if row["human_conflicts"]]
    if pending:
        raise ValueError(f"Quick review is incomplete: {len(pending)} judgments pending")
    if conflicts:
        raise ValueError(f"Quick review contains {len(conflicts)} conflicting judgments")

    observations: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in quick_rows:
        human_score = int(row["human_score"])
        for system in row["systems"]:
            key = system_key(system["model"], system["mode"])
            observations[key].append(
                {
                    "query": row["query"],
                    "track_id": row["track_id"],
                    "title": row["title"],
                    "segment_start": float(row["best_segment_start"]),
                    "segment_end": float(row["best_segment_end"]),
                    "human_score": human_score,
                }
            )

    expected_systems = set(SYSTEM_LABELS)
    if set(observations) != expected_systems:
        raise ValueError("Quick review does not contain the four expected systems")
    if any(len(rows) != 20 for rows in observations.values()):
        raise ValueError("Every quick-review system must contain exactly 20 top-1 results")

    systems: dict[str, dict[str, Any]] = {}
    by_query: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    for key, rows in observations.items():
        scores = [row["human_score"] for row in rows]
        distribution = Counter(scores)
        systems[key] = {
            "label": SYSTEM_LABELS[key],
            "n": len(scores),
            "mean_score": round(statistics.mean(scores), 3),
            "median_score": statistics.median(scores),
            "excellent_3": distribution[3],
            "good_or_better_2_3": distribution[2] + distribution[3],
            "weak_1": distribution[1],
            "irrelevant_0": distribution[0],
            "distinct_top1_tracks": len({row["track_id"] for row in rows}),
            "weak_results": [row for row in rows if row["human_score"] <= 1],
        }
        for row in rows:
            by_query[row["query"]][key] = row

    ranking = sorted(
        systems,
        key=lambda key: (
            systems[key]["mean_score"],
            systems[key]["good_or_better_2_3"],
            systems[key]["excellent_3"],
        ),
        reverse=True,
    )
    winner = ranking[0]

    pairwise = []
    for left, right in combinations(SYSTEM_LABELS, 2):
        left_scores = {row["query"]: row["human_score"] for row in observations[left]}
        right_scores = {row["query"]: row["human_score"] for row in observations[right]}
        differences = [left_scores[query] - right_scores[query] for query in left_scores]
        pairwise.append(
            {
                "left": left,
                "right": right,
                "left_wins": sum(diff > 0 for diff in differences),
                "right_wins": sum(diff < 0 for diff in differences),
                "ties": sum(diff == 0 for diff in differences),
                "mean_delta_left_minus_right": round(statistics.mean(differences), 3),
            }
        )

    model_scores: dict[str, list[int]] = defaultdict(list)
    mode_scores: dict[str, list[int]] = defaultdict(list)
    for key, rows in observations.items():
        model, mode = key.split(":", 1)
        model_scores[model].extend(row["human_score"] for row in rows)
        mode_scores[mode].extend(row["human_score"] for row in rows)

    return {
        "status": {
            "unique_judgments": len(quick_rows),
            "reviewed": quick_review["summary"]["reviewed"],
            "candidate_rows": quick_review["candidate_rows"],
            "human_field_completion": {
                field: sum(bool(row[field]) for row in quick_rows) for field in HUMAN_FIELDS
            },
        },
        "winner": winner,
        "ranking": ranking,
        "systems": systems,
        "model_summary": {
            model: {"n": len(scores), "mean_score": round(statistics.mean(scores), 3)}
            for model, scores in model_scores.items()
        },
        "mode_summary": {
            mode: {"n": len(scores), "mean_score": round(statistics.mean(scores), 3)}
            for mode, scores in mode_scores.items()
        },
        "pairwise": pairwise,
        "queries": by_query,
    }


def render_markdown(analysis: dict[str, Any]) -> str:
    lines = [
        "# Phase 1 — informe de revisión humana rápida",
        "",
        "## Estado",
        "",
        f"- Juicios únicos completados: {analysis['status']['reviewed']}/{analysis['status']['unique_judgments']}.",
        f"- Filas candidatas representadas: {analysis['status']['candidate_rows']}.",
        "- Criterio principal: relevancia humana de 0 a 3.",
        "",
        "## Ranking",
        "",
        "| Posición | Sistema | Media | Excelentes | ≥2 | Débiles | Irrelevantes | Pistas distintas |",
        "|---:|---|---:|---:|---:|---:|---:|---:|",
    ]
    for position, key in enumerate(analysis["ranking"], 1):
        metric = analysis["systems"][key]
        lines.append(
            f"| {position} | {metric['label']} | {metric['mean_score']:.3f} | "
            f"{metric['excellent_3']}/20 | {metric['good_or_better_2_3']}/20 | "
            f"{metric['weak_1']}/20 | {metric['irrelevant_0']}/20 | "
            f"{metric['distinct_top1_tracks']} |"
        )

    winner_key = analysis["winner"]
    winner_metric = analysis["systems"][winner_key]
    runner_up_metric = analysis["systems"][analysis["ranking"][1]]
    lead = winner_metric["mean_score"] - runner_up_metric["mean_score"]
    lines.extend(
        [
            "",
            "## Conclusión provisional",
            "",
            f"- Candidato recomendado para la siguiente fase: **{winner_metric['label']}**.",
            f"- Obtiene {winner_metric['mean_score']:.3f}/3 de media, "
            f"{winner_metric['good_or_better_2_3']}/20 resultados buenos o excelentes y "
            f"{winner_metric['weak_1']} resultados débiles.",
            f"- La ventaja sobre el segundo puesto es de {lead:.3f} puntos; es pequeña, "
            "pero el ganador evita por completo resultados débiles en esta muestra.",
            "- MuQ-MuLan devuelve 10 pistas top 1 distintas frente a 4 de FIGMA, una ventaja práctica de diversidad.",
            "- Para este proyecto personal no es necesario ampliar ahora al top 2; conviene validar de nuevo al indexar las 115 pistas.",
        ]
    )

    lines.extend(["", "## Resumen por modelo y modo", ""])
    for model, metric in sorted(analysis["model_summary"].items()):
        lines.append(f"- Modelo `{model}`: media {metric['mean_score']:.3f} sobre {metric['n']} resultados.")
    for mode, metric in sorted(analysis["mode_summary"].items()):
        lines.append(f"- Modo `{mode}`: media {metric['mean_score']:.3f} sobre {metric['n']} resultados.")

    lines.extend(
        [
            "",
            "## Comparaciones pareadas por consulta",
            "",
            "| Sistema A | Sistema B | Gana A | Gana B | Empates | Δ medio A−B |",
            "|---|---|---:|---:|---:|---:|",
        ]
    )
    for comparison in analysis["pairwise"]:
        lines.append(
            f"| {SYSTEM_LABELS[comparison['left']]} | {SYSTEM_LABELS[comparison['right']]} | "
            f"{comparison['left_wins']} | {comparison['right_wins']} | {comparison['ties']} | "
            f"{comparison['mean_delta_left_minus_right']:+.3f} |"
        )

    lines.extend(["", "## Resultados débiles", ""])
    weak_found = False
    for key in analysis["ranking"]:
        for row in analysis["systems"][key]["weak_results"]:
            weak_found = True
            lines.append(
                f"- **{SYSTEM_LABELS[key]}** — `{row['query']}` → {row['title']} "
                f"({row['segment_start']:.0f}–{row['segment_end']:.0f} s): {row['human_score']}/3."
            )
    if not weak_found:
        lines.append("- Ninguno.")

    fields = analysis["status"]["human_field_completion"]
    lines.extend(
        [
            "",
            "## Límites",
            "",
            "- La muestra mide top 1 en 20 consultas inglesas y 15 pistas; no evalúa todavía el catálogo completo.",
            "- Las similitudes internas de modelos distintos no se comparan entre sí; el ranking usa únicamente juicio humano.",
            f"- Los criterios complementarios tienen poca cobertura: instrumento {fields['instrument_correct']}/45, "
            f"ánimo {fields['mood_correct']}/45 y contradicción {fields['contradiction']}/45.",
            "- Una ampliación al top 2 queda como validación opcional si se necesita más confianza antes de integrar.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Aggregate the Phase 1 quick human review")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--no-write", action="store_true")
    args = parser.parse_args()

    analysis = build_analysis(ReviewStore(csv_path=args.csv))
    if not args.no_write:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(analysis, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(render_markdown(analysis), encoding="utf-8")
    print(json.dumps(analysis, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
