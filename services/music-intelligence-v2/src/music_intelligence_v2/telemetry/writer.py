"""Escritura JSONL con rotación diaria.

Sólo se añade al final: una línea por evento, nunca se reescribe lo anterior.
Eso hace el histórico auditable, fácil de respaldar y barato de escribir.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

FILE_PATTERN = "%Y-%m-%d.jsonl"


class TelemetryWriter:
    """Añade eventos al fichero del día.

    Concurrencia: hay un cerrojo por instancia y se abre en modo `a`, que en
    POSIX garantiza que cada escritura menor que PIPE_BUF va al final sin
    entremezclarse. Suficiente mientras un único proceso escriba, que es el
    caso: el contenedor de búsqueda es el único que toca este directorio.
    Si algún día escribiesen varios procesos, haría falta un cerrojo de fichero
    real (fcntl/msvcrt); está anotado a propósito y no implementado por no
    añadir complejidad que hoy no se usa.
    """

    def __init__(self, root: Path) -> None:
        self.root = Path(root)
        self._lock = threading.Lock()

    def path_for(self, momento: datetime | None = None) -> Path:
        # La fecha del nombre es UTC, igual que las marcas de tiempo de dentro:
        # mezclar husos haría que un fichero contuviera dos días distintos.
        instante = momento or datetime.now(timezone.utc)
        return self.root / instante.astimezone(timezone.utc).strftime(FILE_PATTERN)

    def append(self, evento: dict[str, Any]) -> Path:
        destino = self.path_for()
        linea = json.dumps(evento, ensure_ascii=False, separators=(",", ":"))
        with self._lock:
            destino.parent.mkdir(parents=True, exist_ok=True)
            with destino.open("a", encoding="utf-8", newline="\n") as handle:
                handle.write(linea + "\n")
                handle.flush()
        return destino

    def files(self) -> list[Path]:
        if not self.root.is_dir():
            return []
        return sorted(p for p in self.root.glob("*.jsonl") if p.is_file())


def read_events(rutas: list[Path]) -> Iterator[tuple[Path, int, dict[str, Any] | None, str | None]]:
    """Recorre los ficheros devolviendo (fichero, línea, evento, error).

    Una línea corrupta se comunica con su error en vez de descartarse en
    silencio: perder datos sin avisar es peor que tener datos malos.
    """
    for ruta in rutas:
        with ruta.open("r", encoding="utf-8") as handle:
            for numero, linea in enumerate(handle, start=1):
                texto = linea.strip()
                if not texto:
                    continue
                try:
                    evento = json.loads(texto)
                except json.JSONDecodeError as error:
                    yield ruta, numero, None, f"JSON inválido: {error}"
                    continue
                if not isinstance(evento, dict):
                    yield ruta, numero, None, "La línea no es un objeto JSON"
                    continue
                yield ruta, numero, evento, None


def load_events(rutas: list[Path]) -> list[dict[str, Any]]:
    """Sólo los eventos legibles, en orden de aparición."""
    return [evento for _, _, evento, error in read_events(rutas) if error is None and evento]
