import json

import pytest
from service_fixtures import build_arrays_and_meta

from music_intelligence_v2.indexing import (
    audio_sha256,
    catalogue_fingerprint,
    list_index_versions,
    metadata_sha256,
    next_index_version,
    plan_update,
    publish_index,
    read_active_version,
    resolve_index_dir,
    rollback_index,
)
from music_intelligence_v2.indexing.publication import PublicationError
from music_intelligence_v2.service.index import write_index

PIPELINE = {
    "retrieval_model": "OpenMuQ/MuQ-MuLan-large",
    "model_revision": "test-revision",
    "embedding_dimension": 4,
    "segment_seconds": 25.0,
    "stride_seconds": 12.5,
}


def entrada(track_id, *, title="Believe", audio="aaa", album="Test Album"):
    base = {
        "track_id": track_id,
        "title": title,
        "album": album,
        "album_code": "TestAl",
        "album_cover_url": "musica/DISCOS/test.jpg",
        "audio_url": f"musica/Test/{track_id}.mp3",
    }
    return {**base, "audio_sha256": audio, "metadata_sha256": metadata_sha256(base)}


def manifiesto(entradas, **overrides):
    base = {
        "retrieval_model": {
            "checkpoint": PIPELINE["retrieval_model"],
            "revision": PIPELINE["model_revision"],
            "embedding_dimension": PIPELINE["embedding_dimension"],
        },
        "segmentation": {
            "segment_seconds": PIPELINE["segment_seconds"],
            "stride_seconds": PIPELINE["stride_seconds"],
        },
        "tracks": entradas,
    }
    for clave, valor in overrides.items():
        base[clave] = valor
    return base


# --------------------------------------------------------------------------
# Sumas de comprobación
# --------------------------------------------------------------------------

def test_audio_sha256_sigue_al_contenido_no_a_la_fecha(tmp_path):
    pista = tmp_path / "cancion.mp3"
    pista.write_bytes(b"contenido de audio")
    original = audio_sha256(pista)

    # Reescribir lo mismo cambia mtime pero no el contenido.
    pista.write_bytes(b"contenido de audio")
    assert audio_sha256(pista) == original

    pista.write_bytes(b"contenido de audio distinto")
    assert audio_sha256(pista) != original


def test_metadata_sha256_detecta_un_cambio_de_mayusculas():
    antes = metadata_sha256({"title": "The guide girl", "album": "A"})
    despues = metadata_sha256({"title": "The Guide Girl", "album": "A"})
    assert antes != despues


def test_metadata_sha256_ignora_espacios_sobrantes():
    assert metadata_sha256({"title": " Believe "}) == metadata_sha256({"title": "Believe"})


def test_catalogue_fingerprint_no_depende_del_orden():
    a, b = entrada("uno"), entrada("dos", audio="bbb")
    assert catalogue_fingerprint([a, b]) == catalogue_fingerprint([b, a])
    assert catalogue_fingerprint([a]) != catalogue_fingerprint([a, b])


# --------------------------------------------------------------------------
# Clasificación de cambios
# --------------------------------------------------------------------------

def test_catalogo_intacto_no_requiere_nada():
    catalogo = [entrada("a"), entrada("b", audio="bbb")]
    plan = plan_update(catalogo, manifiesto(catalogo), PIPELINE)

    assert plan.counts()["unchanged"] == 2
    assert plan.tracks_requiring_analysis == []
    assert plan.is_noop


def test_cambio_solo_de_metadatos_no_dispara_analisis_de_audio():
    """El requisito central de la fase: renombrar no cuesta una inferencia."""
    antes = [entrada("a", title="The guide girl")]
    despues = [entrada("a", title="The Guide Girl")]

    plan = plan_update(despues, manifiesto(antes), PIPELINE)

    assert plan.counts()["metadata_modified"] == 1
    assert plan.tracks_requiring_analysis == []


def test_cambio_de_audio_si_dispara_analisis():
    antes = [entrada("a", audio="aaa")]
    despues = [entrada("a", audio="zzz")]

    plan = plan_update(despues, manifiesto(antes), PIPELINE)

    assert plan.counts()["audio_modified"] == 1
    assert [c.track_id for c in plan.tracks_requiring_analysis] == ["a"]


def test_pista_nueva_y_pista_borrada():
    antes = [entrada("a"), entrada("vieja", audio="bbb")]
    despues = [entrada("a"), entrada("nueva", audio="ccc")]

    plan = plan_update(despues, manifiesto(antes), PIPELINE)
    conteos = plan.counts()

    assert conteos["new"] == 1 and conteos["deleted"] == 1 and conteos["unchanged"] == 1
    assert [c.track_id for c in plan.tracks_requiring_analysis] == ["nueva"]


def test_sin_indice_previo_todo_es_nuevo():
    plan = plan_update([entrada("a"), entrada("b", audio="bbb")], None, PIPELINE)

    assert plan.counts()["new"] == 2
    assert not plan.manifest_present
    assert len(plan.tracks_requiring_analysis) == 2


def test_indice_heredado_sin_sumas_reutiliza_embeddings():
    """Migración: se adoptan los vectores existentes sin volver a analizar."""
    catalogo = [entrada("a"), entrada("b", audio="bbb")]
    viejo = manifiesto([{"track_id": "a"}, {"track_id": "b"}])

    plan = plan_update(catalogo, viejo, PIPELINE)

    assert plan.manifest_has_checksums is False
    assert plan.counts()["metadata_modified"] == 2
    assert plan.tracks_requiring_analysis == []


# --------------------------------------------------------------------------
# Invalidación por cambio de pipeline
# --------------------------------------------------------------------------

@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("segment_seconds", 20.0),
        ("stride_seconds", 10.0),
        ("model_revision", "otra-revision"),
        ("embedding_dimension", 768),
    ],
)
def test_un_cambio_de_pipeline_invalida_todos_los_embeddings(campo, valor):
    catalogo = [entrada("a"), entrada("b", audio="bbb")]
    plan = plan_update(catalogo, manifiesto(catalogo), {**PIPELINE, campo: valor})

    assert plan.pipeline_changed
    assert campo in plan.pipeline_reason
    assert len(plan.tracks_requiring_analysis) == 2


def test_rebuild_forzado_reanaliza_aunque_nada_haya_cambiado():
    catalogo = [entrada("a")]
    plan = plan_update(catalogo, manifiesto(catalogo), PIPELINE, force_rebuild=True)

    assert len(plan.tracks_requiring_analysis) == 1
    assert not plan.is_noop


# --------------------------------------------------------------------------
# Publicación atómica y rollback
# --------------------------------------------------------------------------

def _publicar(raiz, version):
    arrays, meta = build_arrays_and_meta()
    meta["index_version"] = version
    candidato = raiz / f"{version}.tmp"
    write_index(candidato, meta, arrays)
    return publish_index(raiz, candidato, version)


def test_publicar_activa_la_version_y_conserva_la_anterior(tmp_path):
    raiz = tmp_path / "indexes"
    _publicar(raiz, "index-v001")
    _publicar(raiz, "index-v002")

    assert read_active_version(raiz) == "index-v002"
    assert list_index_versions(raiz) == ["index-v001", "index-v002"]
    assert (raiz / "index-v001" / "index_meta.json").is_file()


def test_numeracion_de_versiones_es_correlativa(tmp_path):
    raiz = tmp_path / "indexes"
    assert next_index_version(raiz) == "index-v001"
    _publicar(raiz, "index-v001")
    assert next_index_version(raiz) == "index-v002"


def test_no_se_puede_publicar_dos_veces_la_misma_version(tmp_path):
    raiz = tmp_path / "indexes"
    _publicar(raiz, "index-v001")
    with pytest.raises(PublicationError, match="ya existe"):
        _publicar(raiz, "index-v001")


def test_un_candidato_incompleto_no_reemplaza_al_activo(tmp_path):
    raiz = tmp_path / "indexes"
    _publicar(raiz, "index-v001")

    roto = raiz / "index-v002.tmp"
    roto.mkdir(parents=True)
    (roto / "index.npz").write_bytes(b"basura")  # sin index_meta.json

    with pytest.raises(PublicationError, match="no está completo"):
        publish_index(raiz, roto, "index-v002")

    assert read_active_version(raiz) == "index-v001"


def test_rollback_vuelve_a_la_anterior_sin_borrar_nada(tmp_path):
    raiz = tmp_path / "indexes"
    _publicar(raiz, "index-v001")
    _publicar(raiz, "index-v002")

    anterior, nueva = rollback_index(raiz)

    assert (anterior, nueva) == ("index-v002", "index-v001")
    assert read_active_version(raiz) == "index-v001"
    # La versión de la que se vuelve sigue en disco por si hay que rehacerlo.
    assert (raiz / "index-v002" / "index_meta.json").is_file()


def test_rollback_a_una_version_inexistente_se_rechaza(tmp_path):
    raiz = tmp_path / "indexes"
    _publicar(raiz, "index-v001")

    with pytest.raises(PublicationError, match="no existe"):
        rollback_index(raiz, "index-v099")

    assert read_active_version(raiz) == "index-v001"


def test_rollback_sin_version_anterior_se_rechaza(tmp_path):
    raiz = tmp_path / "indexes"
    _publicar(raiz, "index-v001")

    with pytest.raises(PublicationError, match="más antigua"):
        rollback_index(raiz)


# --------------------------------------------------------------------------
# Resolución del índice activo
# --------------------------------------------------------------------------

def test_resolucion_prefiere_el_versionado(tmp_path):
    _publicar(tmp_path / "indexes", "index-v001")
    assert resolve_index_dir(tmp_path).name == "index-v001"


def test_resolucion_cae_al_indice_heredado(tmp_path):
    """Un despliegue anterior a esta fase tiene que seguir arrancando."""
    arrays, meta = build_arrays_and_meta()
    write_index(tmp_path / "index", meta, arrays)

    assert resolve_index_dir(tmp_path).name == "index"


def test_un_puntero_roto_no_deja_el_servicio_sin_indice(tmp_path):
    arrays, meta = build_arrays_and_meta()
    write_index(tmp_path / "index", meta, arrays)
    (tmp_path / "indexes").mkdir()
    (tmp_path / "indexes" / "current.json").write_text(
        json.dumps({"active_index": "index-v404"}), encoding="utf-8"
    )

    assert resolve_index_dir(tmp_path).name == "index"


def test_sin_ningun_indice_se_devuelve_none(tmp_path):
    assert resolve_index_dir(tmp_path) is None
