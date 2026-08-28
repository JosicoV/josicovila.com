"""Construcción incremental del índice.

Separado de `service/`, que es sólo tiempo de ejecución: nada de lo que hay
aquí se carga en el servicio de búsqueda.
"""

from .checksums import (
    METADATA_FIELDS,
    audio_sha256,
    catalogue_fingerprint,
    metadata_sha256,
)
from .embedding import (
    embed_track,
    expected_segment_count,
    preprocessing_config,
)
from .planning import (
    TRACK_STATES,
    TrackChange,
    UpdatePlan,
    pipeline_signature,
    plan_update,
)
from .publication import (
    ACTIVE_POINTER,
    INDEX_DIR_PATTERN,
    list_index_versions,
    next_index_version,
    publish_index,
    read_active_version,
    resolve_index_dir,
    rollback_index,
)

__all__ = [
    "ACTIVE_POINTER",
    "INDEX_DIR_PATTERN",
    "METADATA_FIELDS",
    "TRACK_STATES",
    "TrackChange",
    "UpdatePlan",
    "audio_sha256",
    "catalogue_fingerprint",
    "embed_track",
    "expected_segment_count",
    "list_index_versions",
    "metadata_sha256",
    "next_index_version",
    "pipeline_signature",
    "plan_update",
    "preprocessing_config",
    "publish_index",
    "read_active_version",
    "resolve_index_dir",
    "rollback_index",
]
