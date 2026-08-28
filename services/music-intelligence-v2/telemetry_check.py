"""Comprueba la integridad de los ficheros JSONL de telemetría.

    python telemetry_check.py

Una línea corrupta se informa con fichero y número de línea. Nunca se descarta
ni se repara en silencio: perder datos sin avisar es peor que tenerlos malos.
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.telemetry import EVENT_TYPES, SCHEMA_VERSION, TelemetryWriter, read_events  # noqa: E402

DEFAULT_DIR = REPOSITORY_ROOT / "data" / "music-intelligence-v2" / "telemetry"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--telemetry-dir", type=Path, default=DEFAULT_DIR)
    args = parser.parse_args()

    ficheros = TelemetryWriter(args.telemetry_dir).files()
    if not ficheros:
        print(f"No hay ficheros de telemetría en {args.telemetry_dir}")
        return 0

    total = validos = 0
    problemas: list[str] = []
    identificadores: Counter[str] = Counter()
    tipos_desconocidos: Counter[str] = Counter()
    esquemas: Counter[int] = Counter()

    for ruta, numero, evento, error in read_events(ficheros):
        total += 1
        if error:
            problemas.append(f"  {ruta.name}:{numero}  {error}")
            continue

        fallos = []
        tipo = evento.get("event_type")
        if tipo not in EVENT_TYPES:
            tipos_desconocidos[str(tipo)] += 1
            fallos.append(f"tipo desconocido: {tipo!r}")
        if not evento.get("event_id"):
            fallos.append("sin event_id")
        else:
            identificadores[evento["event_id"]] += 1
        if not evento.get("timestamp"):
            fallos.append("sin timestamp")
        esquemas[evento.get("schema_version", 0)] += 1

        if fallos:
            problemas.append(f"  {ruta.name}:{numero}  " + "; ".join(fallos))
        else:
            validos += 1

    duplicados = {clave: n for clave, n in identificadores.items() if n > 1}

    print(f"Ficheros analizados:  {len(ficheros)}")
    print(f"Eventos:              {total}")
    print(f"Válidos:              {validos}")
    print(f"Inválidos:            {total - validos}")
    print(f"event_id duplicados:  {len(duplicados)}")
    print(f"Tipos desconocidos:   {sum(tipos_desconocidos.values())}")

    otras = {v: n for v, n in esquemas.items() if v != SCHEMA_VERSION}
    if otras:
        print(f"Otras versiones de esquema: {otras}")

    if problemas:
        print("\nProblemas:")
        for linea in problemas[:40]:
            print(linea)
        if len(problemas) > 40:
            print(f"  ... y {len(problemas) - 40} más")

    if duplicados:
        print("\nevent_id repetidos:")
        for clave, n in list(duplicados.items())[:10]:
            print(f"  {clave}  x{n}")

    return 1 if problemas or duplicados else 0


if __name__ == "__main__":
    raise SystemExit(main())
