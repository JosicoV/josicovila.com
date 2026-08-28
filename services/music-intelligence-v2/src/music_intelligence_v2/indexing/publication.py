from __future__ import annotations

import json
import os
import re
import shutil
from pathlib import Path

ACTIVE_POINTER = "current.json"
INDEX_DIR_PATTERN = re.compile(r"^index-v(\d{3,})$")


class PublicationError(RuntimeError):
    """Fallo al publicar o revertir un índice."""


def list_index_versions(raiz: Path) -> list[str]:
    """Versiones presentes, de la más antigua a la más reciente."""
    if not raiz.is_dir():
        return []
    nombres = [
        ruta.name
        for ruta in raiz.iterdir()
        if ruta.is_dir() and INDEX_DIR_PATTERN.match(ruta.name)
    ]
    return sorted(nombres, key=lambda nombre: int(INDEX_DIR_PATTERN.match(nombre).group(1)))


def next_index_version(raiz: Path) -> str:
    versiones = list_index_versions(raiz)
    if not versiones:
        return "index-v001"
    ultimo = int(INDEX_DIR_PATTERN.match(versiones[-1]).group(1))
    return f"index-v{ultimo + 1:03d}"


def read_active_version(raiz: Path) -> str | None:
    puntero = raiz / ACTIVE_POINTER
    if not puntero.is_file():
        return None
    try:
        return json.loads(puntero.read_text(encoding="utf-8-sig")).get("active_index")
    except json.JSONDecodeError:
        return None


def _escribir_puntero(raiz: Path, version: str) -> None:
    """El puntero se escribe aparte y se mueve encima: `os.replace` es atómico,
    así que nunca existe un `current.json` a medio escribir que el servicio
    pudiera leer."""
    puntero = raiz / ACTIVE_POINTER
    temporal = puntero.with_suffix(puntero.suffix + ".tmp")
    temporal.write_text(
        json.dumps({"active_index": version}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporal, puntero)


def resolve_index_dir(raiz: Path) -> Path | None:
    """Directorio del índice activo.

    Acepta las dos disposiciones para no romper lo ya desplegado:
      - `indexes/current.json` -> `indexes/index-vNNN/`   (a partir de Fase 5)
      - `index/` sin versionar                             (Fase 3)
    """
    versionados = raiz / "indexes"
    activo = read_active_version(versionados)
    if activo:
        destino = versionados / activo
        if (destino / "index_meta.json").is_file():
            return destino

    heredado = raiz / "index"
    if (heredado / "index_meta.json").is_file():
        return heredado
    return None


def publish_index(raiz_versionados: Path, candidato: Path, version: str) -> Path:
    """Mueve un candidato ya validado a su versión definitiva y activa el puntero.

    El orden importa: primero se coloca el directorio, después se mueve el
    puntero. Si algo falla a mitad, el puntero sigue apuntando al índice
    anterior, que continúa intacto.
    """
    if not (candidato / "index_meta.json").is_file():
        raise PublicationError(f"El candidato no está completo: {candidato}")

    destino = raiz_versionados / version
    if destino.exists():
        raise PublicationError(f"La versión {version} ya existe")

    raiz_versionados.mkdir(parents=True, exist_ok=True)
    os.replace(candidato, destino)
    _escribir_puntero(raiz_versionados, version)
    return destino


def rollback_index(raiz_versionados: Path, version: str | None = None) -> tuple[str | None, str]:
    """Devuelve el puntero a una versión anterior. No regenera nada.

    Sin `version`, elige la inmediatamente anterior a la activa.
    Devuelve (versión_anterior, versión_nueva).
    """
    versiones = list_index_versions(raiz_versionados)
    if not versiones:
        raise PublicationError(f"No hay ningún índice publicado en {raiz_versionados}")

    activa = read_active_version(raiz_versionados)

    if version is None:
        if activa is None:
            raise PublicationError("No hay índice activo del que retroceder")
        if activa not in versiones:
            raise PublicationError(f"El índice activo {activa} no existe en disco")
        posicion = versiones.index(activa)
        if posicion == 0:
            raise PublicationError(f"{activa} es la versión más antigua: no hay a dónde volver")
        version = versiones[posicion - 1]

    if version not in versiones:
        raise PublicationError(f"La versión {version} no existe en {raiz_versionados}")
    if not (raiz_versionados / version / "index_meta.json").is_file():
        raise PublicationError(f"La versión {version} está incompleta")

    _escribir_puntero(raiz_versionados, version)
    return activa, version


def discard_candidate(candidato: Path) -> None:
    """Limpia un candidato fallido. Nunca toca el índice activo."""
    if candidato.exists():
        shutil.rmtree(candidato, ignore_errors=True)
