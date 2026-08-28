"""Aplica la política de retención a los ficheros de telemetría.

    python telemetry_cleanup.py --dry-run    # qué borraría
    python telemetry_cleanup.py              # lo borra

Por defecto simula: borrar datos no debe poder ocurrir por teclear de más.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.telemetry import TelemetryWriter  # noqa: E402

DEFAULT_DIR = REPOSITORY_ROOT / "data" / "music-intelligence-v2" / "telemetry"
# Se guarda el texto de las consultas, así que la retención no es opcional:
# es la contrapartida de haberlo activado.
DEFAULT_RETENTION_DAYS = 90


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--telemetry-dir", type=Path, default=DEFAULT_DIR)
    parser.add_argument(
        "--retention-days",
        type=int,
        default=int(os.environ.get("TELEMETRY_RETENTION_DAYS", DEFAULT_RETENTION_DAYS)),
    )
    parser.add_argument("--dry-run", action="store_true", help="Sólo informa. Es el modo recomendado.")
    parser.add_argument("--apply", action="store_true", help="Borra de verdad.")
    args = parser.parse_args()

    if args.retention_days < 1:
        print("La retención debe ser de al menos un día.", file=sys.stderr)
        return 1

    limite = (datetime.now(timezone.utc) - timedelta(days=args.retention_days)).date()
    ficheros = TelemetryWriter(args.telemetry_dir).files()

    caducados = []
    for ruta in ficheros:
        try:
            fecha = datetime.strptime(ruta.stem, "%Y-%m-%d").date()
        except ValueError:
            print(f"  se ignora (nombre inesperado): {ruta.name}")
            continue
        if fecha < limite:
            caducados.append((ruta, fecha))

    print(f"Retención: {args.retention_days} días (se conserva desde {limite})")
    print(f"Ficheros:  {len(ficheros)}  |  caducados: {len(caducados)}")

    if not caducados:
        return 0

    for ruta, fecha in caducados:
        print(f"  {ruta.name}  ({ruta.stat().st_size} bytes)")

    if not args.apply:
        print("\nSimulación: no se ha borrado nada. Usa --apply para hacerlo efectivo.")
        return 0

    for ruta, _ in caducados:
        ruta.unlink()
    print(f"\nBorrados {len(caducados)} fichero(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
