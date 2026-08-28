"""Exporta la telemetría a un conjunto de datos de relevancia.

    python telemetry_export.py

Una fila por (búsqueda, pista mostrada), con las señales ya resueltas: el
histórico sólo añade líneas, así que un "No" corregido a "Sí" se resuelve aquí.
El JSONL original nunca se modifica.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.telemetry import TelemetryWriter, build_dataset, load_events, summarize  # noqa: E402

DEFAULT_DIR = REPOSITORY_ROOT / "data" / "music-intelligence-v2" / "telemetry"

# En CSV las listas se aplanan; el JSON conserva la estructura.
CAMPOS_CSV = (
    "search_id", "timestamp", "anon_session_id", "query", "query_language",
    "query_normalized_en", "query_intent", "superseded", "index_version", "search_version",
    "track_id", "composition_id", "rank",
    "semantic_score", "literal_title_score", "literal_album_score", "hybrid_score",
    "match_reasons",
    "clicked", "seconds_listened", "listen_ratio", "completed", "quick_skip", "replayed",
    "explicit_match", "explicit_no_match",
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--telemetry-dir", type=Path, default=DEFAULT_DIR)
    parser.add_argument("--output-dir", type=Path, default=None)
    args = parser.parse_args()

    destino = args.output_dir or (args.telemetry_dir / "exports")
    destino.mkdir(parents=True, exist_ok=True)

    eventos = load_events(TelemetryWriter(args.telemetry_dir).files())
    filas = build_dataset(eventos)

    (destino / "relevance_dataset.json").write_text(
        json.dumps(filas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    with (destino / "relevance_dataset.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        escritor = csv.DictWriter(handle, fieldnames=list(CAMPOS_CSV))
        escritor.writeheader()
        for fila in filas:
            plana = {campo: fila.get(campo) for campo in CAMPOS_CSV}
            plana["match_reasons"] = " + ".join(fila.get("match_reasons") or [])
            escritor.writerow(plana)

    resumen = summarize(eventos)
    (destino / "summary.json").write_text(
        json.dumps(resumen, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    positivos = sum(1 for f in filas if f["explicit_match"])
    negativos = sum(1 for f in filas if f["explicit_no_match"])
    print(f"Filas exportadas:     {len(filas)}")
    print(f"  con 'Sí' explícito: {positivos}")
    print(f"  con 'No' explícito: {negativos}")
    print(f"  con clic:           {sum(1 for f in filas if f['clicked'])}")
    print(f"\nEscrito en {destino}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
