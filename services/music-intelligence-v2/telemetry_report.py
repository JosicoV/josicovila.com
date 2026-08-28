"""Resumen legible de la telemetría recogida.

    python telemetry_report.py

Operación offline: nunca se ejecuta durante una búsqueda.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.telemetry import TelemetryWriter, load_events, summarize  # noqa: E402

DEFAULT_DIR = REPOSITORY_ROOT / "data" / "music-intelligence-v2" / "telemetry"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--telemetry-dir", type=Path, default=DEFAULT_DIR)
    parser.add_argument("--json", action="store_true", help="Salida en JSON en vez de texto.")
    args = parser.parse_args()

    eventos = load_events(TelemetryWriter(args.telemetry_dir).files())
    resumen = summarize(eventos)

    if args.json:
        print(json.dumps(resumen, ensure_ascii=False, indent=2))
        return 0

    if not eventos:
        print(f"No hay eventos en {args.telemetry_dir}")
        return 0

    print(f"Búsquedas:            {resumen['settled_searches']}"
          f"   (+{resumen['typing_steps']} pasos intermedios al teclear)")
    print(f"Clics en resultados:  {resumen['result_clicks']}")
    print()
    print("Feedback explícito:")
    print(f"  Sí: {resumen['feedback_yes']}")
    print(f"  No: {resumen['feedback_no']}")
    print()
    if resumen["average_clicked_rank"] is not None:
        print(f"Puesto medio del clic: {resumen['average_clicked_rank']}")
    print(f"Saltos rápidos:        {resumen['quick_skips']}")
    print(f"Repeticiones:          {resumen['replays']}")
    if resumen["median_listen_ratio"] is not None:
        print(f"Escucha mediana:       {resumen['median_listen_ratio']:.0%}")
    print()
    print(f"Búsquedas con feedback: {resumen['searches_with_feedback_pct']}%")
    print()
    print("Eventos por tipo:")
    for tipo, n in resumen["events_by_type"].items():
        print(f"  {tipo:22} {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
