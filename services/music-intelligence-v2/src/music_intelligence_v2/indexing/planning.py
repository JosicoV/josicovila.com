from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

TRACK_STATES = ("unchanged", "new", "audio_modified", "metadata_modified", "deleted")

# Cambiar cualquiera de estos invalida todo embedding existente: mezclar
# vectores producidos con configuraciones distintas daría un ranking sin
# sentido, y en silencio.
PIPELINE_FIELDS = (
    "retrieval_model",
    "model_revision",
    "embedding_dimension",
    "segment_seconds",
    "stride_seconds",
)


@dataclass(frozen=True)
class TrackChange:
    track_id: str
    state: str
    reason: str = ""

    @property
    def requires_audio_analysis(self) -> bool:
        return self.state in {"new", "audio_modified"}


@dataclass
class UpdatePlan:
    changes: list[TrackChange] = field(default_factory=list)
    pipeline_changed: bool = False
    pipeline_reason: str = ""
    manifest_present: bool = True
    manifest_has_checksums: bool = True

    def by_state(self, state: str) -> list[TrackChange]:
        return [cambio for cambio in self.changes if cambio.state == state]

    def counts(self) -> dict[str, int]:
        return {estado: len(self.by_state(estado)) for estado in TRACK_STATES}

    @property
    def tracks_requiring_analysis(self) -> list[TrackChange]:
        return [cambio for cambio in self.changes if cambio.requires_audio_analysis]

    @property
    def is_noop(self) -> bool:
        """Nada que hacer: sólo pistas sin cambios y el pipeline intacto."""
        return not self.pipeline_changed and all(
            cambio.state == "unchanged" for cambio in self.changes
        )


def pipeline_signature(meta: dict[str, Any]) -> dict[str, Any]:
    """Extrae del metadato del índice los valores que condicionan los embeddings."""
    modelo = meta.get("retrieval_model", {})
    segmentacion = meta.get("segmentation", {})
    return {
        "retrieval_model": modelo.get("checkpoint"),
        "model_revision": modelo.get("revision"),
        "embedding_dimension": modelo.get("embedding_dimension"),
        "segment_seconds": segmentacion.get("segment_seconds"),
        "stride_seconds": segmentacion.get("stride_seconds"),
    }


def _comparar_pipeline(anterior: dict[str, Any], actual: dict[str, Any]) -> str:
    diferencias = [
        f"{campo}: {anterior.get(campo)!r} -> {actual.get(campo)!r}"
        for campo in PIPELINE_FIELDS
        if anterior.get(campo) != actual.get(campo)
    ]
    return "; ".join(diferencias)


def plan_update(
    catalogo: list[dict[str, Any]],
    manifiesto: dict[str, Any] | None,
    pipeline_actual: dict[str, Any],
    *,
    force_rebuild: bool = False,
) -> UpdatePlan:
    """Clasifica cada pista comparando el catálogo actual con el índice publicado.

    `catalogo` son entradas con `track_id`, `audio_sha256` y `metadata_sha256`
    ya calculados. No abre ficheros ni toca el índice: es pura comparación, de
    modo que `--dry-run` puede usarla tal cual.
    """
    plan = UpdatePlan(manifest_present=manifiesto is not None)

    if manifiesto is None:
        plan.pipeline_changed = True
        plan.pipeline_reason = "no hay índice publicado todavía"
        plan.manifest_has_checksums = False
        plan.changes = [
            TrackChange(entrada["track_id"], "new", "primera construcción")
            for entrada in catalogo
        ]
        return plan

    indexadas = {str(pista["track_id"]): pista for pista in manifiesto.get("tracks", [])}

    # Los índices anteriores a esta fase no llevan sumas de comprobación. No se
    # pueden clasificar por contenido, así que se adoptan sus embeddings y se
    # les calculan las sumas ahora; la verificación de que el audio sigue
    # siendo el mismo la hace el constructor comparando el número de segmentos.
    plan.manifest_has_checksums = all("audio_sha256" in pista for pista in indexadas.values())

    diferencia = _comparar_pipeline(pipeline_signature(manifiesto), pipeline_actual)
    if diferencia:
        plan.pipeline_changed = True
        plan.pipeline_reason = diferencia

    reconstruir = force_rebuild or plan.pipeline_changed

    for entrada in catalogo:
        track_id = entrada["track_id"]
        anterior = indexadas.get(track_id)

        if anterior is None:
            plan.changes.append(TrackChange(track_id, "new", "no está en el índice"))
            continue

        if reconstruir:
            motivo = "reconstrucción completa" if force_rebuild else "el pipeline cambió"
            plan.changes.append(TrackChange(track_id, "audio_modified", motivo))
            continue

        if not plan.manifest_has_checksums:
            plan.changes.append(
                TrackChange(track_id, "metadata_modified", "índice sin sumas de comprobación")
            )
            continue

        if anterior.get("audio_sha256") != entrada["audio_sha256"]:
            plan.changes.append(TrackChange(track_id, "audio_modified", "cambió el audio"))
        elif anterior.get("metadata_sha256") != entrada["metadata_sha256"]:
            plan.changes.append(TrackChange(track_id, "metadata_modified", "cambiaron los metadatos"))
        else:
            plan.changes.append(TrackChange(track_id, "unchanged"))

    presentes = {entrada["track_id"] for entrada in catalogo}
    for track_id in indexadas:
        if track_id not in presentes:
            plan.changes.append(TrackChange(track_id, "deleted", "ya no está en el catálogo"))

    return plan
