from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Iterable

_BLOQUE = 1024 * 1024

# Campos que afectan a lo que se muestra o se reproduce, pero no a lo que MuQ
# escucha. Un cambio aquí actualiza metadatos y conserva los embeddings.
#
# `composition_id` NO está aquí a propósito: no lo escribe nadie, se deriva de
# los propios embeddings comparando título, duración y similitud acústica.
# Incluirlo haría circular la comparación, porque haría falta el embedding para
# decidir si hace falta calcular el embedding. Se recalcula en cada construcción
# a partir de los vectores ya existentes, que es barato y no requiere audio.
METADATA_FIELDS = (
    "title",
    "album",
    "album_code",
    "album_cover_url",
    "audio_url",
)


def audio_sha256(path: Path) -> str:
    """Huella del contenido del audio.

    Deliberadamente sobre los bytes y no sobre `mtime`, que es lo que usa la
    caché de embeddings: copiar los MP3, restaurar un backup o clonar el
    repositorio cambia la fecha sin tocar el audio, y eso invalidaría el
    trabajo de todo el catálogo sin motivo.
    """
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for bloque in iter(lambda: handle.read(_BLOQUE), b""):
            digest.update(bloque)
    return digest.hexdigest()


def metadata_sha256(entrada: dict[str, Any]) -> str:
    """Huella de los metadatos de una pista.

    No se normaliza el texto más allá de recortar espacios: un cambio de
    mayúsculas como `The guide girl` -> `The Guide Girl` DEBE detectarse para
    que se actualice el índice, aunque no toque el audio.
    """
    payload = {campo: str(entrada.get(campo, "")).strip() for campo in METADATA_FIELDS}
    codificado = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(codificado).hexdigest()


def catalogue_fingerprint(entradas: Iterable[dict[str, Any]]) -> str:
    """Huella determinista del catálogo indexado.

    Se construye con los identificadores estables ordenados más las dos sumas
    de comprobación, de modo que no depende del orden de recorrido ni de rutas
    absolutas de la máquina que lo generó.
    """
    filas = sorted(
        (
            str(entrada["track_id"]),
            str(entrada["audio_sha256"]),
            str(entrada["metadata_sha256"]),
        )
        for entrada in entradas
    )
    codificado = json.dumps(filas, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(codificado).hexdigest()
