"""Actualización incremental del índice de búsqueda.

Analiza con MuQ únicamente las pistas nuevas o cuyo audio haya cambiado. Un
cambio de título o de portada actualiza metadatos reutilizando los embeddings
existentes, que es lo caro de recalcular.

    python update_index.py --dry-run    # qué haría, sin tocar nada
    python update_index.py              # actualización incremental
    python update_index.py --rebuild    # recalcula todo desde cero
    python update_index.py --rollback   # vuelve a la versión anterior

Nunca escribe sobre el índice activo: construye un candidato aparte, lo valida
y sólo entonces mueve el puntero.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.catalog import build_catalog  # noqa: E402
from music_intelligence_v2.indexing import (  # noqa: E402
    audio_sha256,
    catalogue_fingerprint,
    embed_track,
    expected_segment_count,
    list_index_versions,
    metadata_sha256,
    next_index_version,
    pipeline_signature,
    plan_update,
    preprocessing_config,
    publish_index,
    read_active_version,
    resolve_index_dir,
    rollback_index,
)
from music_intelligence_v2.indexing.publication import PublicationError, discard_candidate  # noqa: E402
from music_intelligence_v2.retrieval import infer_canonical_groups  # noqa: E402
from music_intelligence_v2.service.index import INDEX_SCHEMA_VERSION, SearchIndex, write_index  # noqa: E402
from music_intelligence_v2.service.pipeline import SearchService  # noqa: E402

DATA_ROOT = REPOSITORY_ROOT / "data" / "music-intelligence-v2"
VERSIONED_ROOT = DATA_ROOT / "indexes"
CATALOG_PHP = REPOSITORY_ROOT / "app" / "includes" / "musica.estructura-datos.php"
AUDIO_ROOT = REPOSITORY_ROOT / "data" / "musica"

# Consultas fijas de humo. No miden calidad, sólo que el índice candidato
# responde, devuelve el esquema correcto y no reintroduce versiones duplicadas.
SMOKE_QUERIES = (
    "guide",
    "the guide girl",
    "soft medieval flute",
    "dark but peaceful",
    "epic music",
)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    modo = parser.add_mutually_exclusive_group()
    modo.add_argument("--dry-run", action="store_true", help="Sólo informa del plan. No escribe nada.")
    modo.add_argument("--rebuild", action="store_true", help="Recalcula todos los embeddings.")
    modo.add_argument("--rollback", action="store_true", help="Devuelve el puntero a la versión anterior.")
    parser.add_argument("--rollback-to", default=None, help="Versión concreta a la que volver.")
    parser.add_argument("--catalog-php", type=Path, default=CATALOG_PHP)
    parser.add_argument("--audio-root", type=Path, default=AUDIO_ROOT)
    parser.add_argument("--data-root", type=Path, default=DATA_ROOT)
    parser.add_argument("--model-registry", type=Path, default=SERVICE_ROOT / "config" / "model_registry.json")
    parser.add_argument("--translation-registry", type=Path, default=SERVICE_ROOT / "config" / "translation_registry.json")
    parser.add_argument("--segment-seconds", type=float, default=25.0)
    parser.add_argument("--stride-seconds", type=float, default=12.5)
    parser.add_argument("--device", choices=["auto", "cuda", "cpu"], default="auto")
    parser.add_argument("--audio-url-prefix", default="musica/")
    parser.add_argument("--cover-url-prefix", default="musica/DISCOS/")
    parser.add_argument("--vps-host", default="USUARIO@HOST", help="Destino para los comandos de subida que se imprimen al final.")
    parser.add_argument(
        "--vps-path",
        default="/opt/containers/josicovila-com/data/music-intelligence-v2",
        help="Ruta del VPS para los comandos de subida.",
    )
    args = parser.parse_args()
    # A absoluto: el catálogo se compara con la raíz del repositorio para
    # guardar rutas portables, y `relative_to` falla si una es relativa.
    for opcion in ("catalog_php", "audio_root", "data_root", "model_registry", "translation_registry"):
        setattr(args, opcion, getattr(args, opcion).resolve())
    return args


def leer_json(ruta: Path) -> Any:
    return json.loads(ruta.read_text(encoding="utf-8-sig"))


# --------------------------------------------------------------------------
# Catálogo
# --------------------------------------------------------------------------

def construir_catalogo(args: argparse.Namespace) -> list[dict[str, Any]]:
    """Lee la fuente de verdad (el PHP de producción) y calcula las sumas.

    No se mantiene un segundo catálogo: `build_catalog` ya valida que las rutas
    y los identificadores sean únicos y que no haya MP3 huérfanos.
    """
    catalogo = build_catalog(args.catalog_php, args.audio_root, REPOSITORY_ROOT)
    entradas = []
    for pista in catalogo["tracks"]:
        audio_path = REPOSITORY_ROOT / pista["audio_path"]
        entrada = {
            "track_id": pista["track_id"],
            "title": pista["title"],
            "album": pista["album"],
            "album_code": pista.get("album_code", ""),
            "album_cover_url": f"{args.cover_url_prefix}{pista['album_cover']}" if pista.get("album_cover") else "",
            "audio_url": f"{args.audio_url_prefix}{pista['web_audio_route']}",
            "audio_path": pista["audio_path"],
            "audio_bytes": pista["audio_bytes"],
        }
        entrada["audio_sha256"] = audio_sha256(audio_path)
        entrada["metadata_sha256"] = metadata_sha256(entrada)
        entradas.append(entrada)
    return entradas


# --------------------------------------------------------------------------
# Informe del plan
# --------------------------------------------------------------------------

def imprimir_plan(plan, catalogo: list[dict[str, Any]], indexadas: int) -> None:
    conteos = plan.counts()
    print(f"Pistas indexadas:  {indexadas}")
    print(f"Pistas catálogo:   {len(catalogo)}")
    print()
    print(f"Sin cambios:       {conteos['unchanged']:>4}")
    print(f"Nuevas:            {conteos['new']:>4}")
    print(f"Audio modificado:  {conteos['audio_modified']:>4}")
    print(f"Metadatos:         {conteos['metadata_modified']:>4}")
    print(f"Borradas:          {conteos['deleted']:>4}")
    print()
    print(f"Pistas que requieren análisis MuQ: {len(plan.tracks_requiring_analysis)}")

    if plan.pipeline_changed and plan.manifest_present:
        print()
        print(f"  ATENCIÓN: el pipeline cambió ({plan.pipeline_reason}).")
        print("  Los embeddings existentes no son comparables: se recalculan todos.")
    if not plan.manifest_has_checksums and plan.manifest_present:
        print()
        print("  El índice actual no tiene sumas de comprobación (anterior a Fase 5).")
        print("  Se adoptan sus embeddings y se calculan las sumas ahora.")

    for estado in ("new", "audio_modified", "metadata_modified", "deleted"):
        cambios = plan.by_state(estado)
        if not cambios:
            continue
        print()
        print(f"  {estado}:")
        for cambio in cambios[:12]:
            print(f"    - {cambio.track_id}  ({cambio.reason})")
        if len(cambios) > 12:
            print(f"    ... y {len(cambios) - 12} más")


# --------------------------------------------------------------------------
# Construcción del candidato
# --------------------------------------------------------------------------

def cargar_indice_anterior(directorio: Path | None):
    if directorio is None:
        return None, None
    indice = SearchIndex.load(directorio)
    return indice, indice.meta


def filas_reutilizadas(indice: SearchIndex, track_id: str) -> dict[str, np.ndarray | float]:
    """Extrae del índice publicado los vectores de una pista, para reutilizarlos."""
    entrada = next(t for t in indice.tracks if t.track_id == track_id)
    corte = slice(entrada.segment_offset, entrada.segment_offset + entrada.segment_count)
    return {
        "segment_embeddings": np.array(indice.segment_embeddings[corte], dtype=np.float32),
        "global_embedding": np.array(indice.global_embeddings[entrada.row], dtype=np.float32),
        "segment_starts": np.array(indice.segment_starts[corte], dtype=np.float32),
        "segment_ends": np.array(indice.segment_ends[corte], dtype=np.float32),
        "duration_seconds": entrada.duration_seconds,
    }


def construir_candidato(
    args: argparse.Namespace,
    catalogo: list[dict[str, Any]],
    plan,
    indice_anterior: SearchIndex | None,
    destino: Path,
) -> dict[str, Any]:
    """Ensambla el índice candidato. Sólo carga MuQ si hace falta analizar audio."""
    estado_por_id = {cambio.track_id: cambio.state for cambio in plan.changes}
    a_analizar = [c.track_id for c in plan.tracks_requiring_analysis]

    registro_modelo = leer_json(args.model_registry)["muq_mulan"]
    registro_traduccion = leer_json(args.translation_registry)["opus_es_en"]

    adapter = None
    segundos_inferencia = 0.0
    try:
        if a_analizar:
            from music_intelligence_v2.adapters import create_adapter
            from music_intelligence_v2.service.encoders import resolve_device

            dispositivo = resolve_device(args.device)
            print(f"\nCargando MuQ-MuLan en {dispositivo} para {len(a_analizar)} pista(s)...")
            adapter = create_adapter("muq_mulan", registro_modelo, dispositivo)
            adapter.load()

        vectores: dict[str, dict[str, Any]] = {}
        for posicion, entrada in enumerate(catalogo, 1):
            track_id = entrada["track_id"]
            estado = estado_por_id.get(track_id, "new")

            if estado in {"new", "audio_modified"}:
                audio_path = REPOSITORY_ROOT / entrada["audio_path"]
                iniciado = time.perf_counter()
                try:
                    vectores[track_id] = embed_track(
                        adapter,
                        audio_path,
                        segment_seconds=args.segment_seconds,
                        stride_seconds=args.stride_seconds,
                    )
                except Exception as error:
                    # Task 17: un fallo aborta la publicación entera. Nunca se
                    # publica medio catálogo.
                    raise RuntimeError(f"Falló el análisis de '{track_id}' ({audio_path}): {error}") from error
                segundos_inferencia += time.perf_counter() - iniciado
                print(f"  [{posicion:>3}/{len(catalogo)}] {track_id}: {len(vectores[track_id]['segment_embeddings'])} segmentos")
            else:
                assert indice_anterior is not None
                reutilizado = filas_reutilizadas(indice_anterior, track_id)
                # Un índice heredado no tiene sumas: se comprueba que el audio
                # siga produciendo el mismo número de segmentos antes de fiarse.
                if not plan.manifest_has_checksums:
                    esperados = expected_segment_count(
                        REPOSITORY_ROOT / entrada["audio_path"], args.segment_seconds, args.stride_seconds
                    )
                    if esperados != len(reutilizado["segment_embeddings"]):
                        raise RuntimeError(
                            f"'{track_id}' tiene {esperados} segmentos según su audio pero el índice "
                            f"guarda {len(reutilizado['segment_embeddings'])}. Usa --rebuild."
                        )
                vectores[track_id] = reutilizado
    finally:
        if adapter is not None:
            adapter.close()

    # Agrupación de versiones: se recalcula siempre a partir de los vectores ya
    # disponibles. Es barato y no necesita tocar el audio.
    entrada_agrupacion = [
        {
            "track_id": e["track_id"],
            "title": e["title"],
            "duration_seconds": vectores[e["track_id"]]["duration_seconds"],
            "global_embedding": vectores[e["track_id"]]["global_embedding"],
        }
        for e in catalogo
    ]
    composicion_por_pista, grupos = infer_canonical_groups(entrada_agrupacion)

    segmentos, inicios, finales, globales = [], [], [], []
    desplazamientos, cuentas, meta_pistas = [], [], []
    desplazamiento = 0
    for fila, entrada in enumerate(catalogo):
        track_id = entrada["track_id"]
        v = vectores[track_id]
        cuenta = int(v["segment_embeddings"].shape[0])

        segmentos.append(v["segment_embeddings"])
        inicios.append(v["segment_starts"])
        finales.append(v["segment_ends"])
        globales.append(v["global_embedding"])
        desplazamientos.append(desplazamiento)
        cuentas.append(cuenta)

        meta_pistas.append(
            {
                "row": fila,
                "track_id": track_id,
                "composition_id": composicion_por_pista[track_id],
                "title": entrada["title"],
                "album": entrada["album"],
                "album_code": entrada["album_code"],
                "album_cover_url": entrada["album_cover_url"],
                "audio_url": entrada["audio_url"],
                "duration_seconds": float(v["duration_seconds"]),
                "segment_offset": desplazamiento,
                "segment_count": cuenta,
                "audio_sha256": entrada["audio_sha256"],
                "metadata_sha256": entrada["metadata_sha256"],
            }
        )
        desplazamiento += cuenta

    arrays = {
        "segment_embeddings": np.concatenate(segmentos, axis=0).astype(np.float32),
        "segment_starts": np.concatenate(inicios, axis=0).astype(np.float32),
        "segment_ends": np.concatenate(finales, axis=0).astype(np.float32),
        "segment_offsets": np.asarray(desplazamientos, dtype=np.int32),
        "segment_counts": np.asarray(cuentas, dtype=np.int32),
        "global_embeddings": np.stack(globales, axis=0).astype(np.float32),
    }

    construido = datetime.now(timezone.utc).isoformat(timespec="seconds")
    dimension = int(arrays["segment_embeddings"].shape[1])
    meta = {
        "schema_version": INDEX_SCHEMA_VERSION,
        "index_version": construido.replace(":", "").replace("-", ""),
        "built_at": construido,
        "retrieval_model": {
            "key": "muq_mulan",
            "name": registro_modelo["display_name"],
            "checkpoint": registro_modelo["checkpoint"],
            "revision": registro_modelo["revision"],
            "embedding_dimension": dimension,
            "sample_rate": registro_modelo["sample_rate"],
            "audio_input_seconds": registro_modelo["audio_input_seconds"],
            "license": registro_modelo["license"],
        },
        "translation_model": {
            "key": "opus_es_en",
            "checkpoint": registro_traduccion["checkpoint"],
            "revision": registro_traduccion["revision"],
            "license": registro_traduccion["license"],
        },
        "segmentation": {
            "strategy": "sliding-window",
            "segment_seconds": args.segment_seconds,
            "stride_seconds": args.stride_seconds,
            "overlap_fraction": 1.0 - (args.stride_seconds / args.segment_seconds),
            "global_strategy": "l2-normalized mean of all segment embeddings",
        },
        "catalogue": {
            "track_count": len(meta_pistas),
            "segment_count": int(arrays["segment_embeddings"].shape[0]),
            "fingerprint": catalogue_fingerprint(catalogo),
            "source": args.catalog_php.relative_to(REPOSITORY_ROOT).as_posix(),
        },
        "composition_groups": [
            {"composition_id": g["canonical_track_id"], "title": g["title"], "members": g["members"]}
            for g in grupos
        ],
        "embeddings_sha256": "",
        "tracks": meta_pistas,
    }

    write_index(destino, meta, arrays)
    return {"meta": meta, "inference_seconds": segundos_inferencia}


# --------------------------------------------------------------------------
# Validación del candidato
# --------------------------------------------------------------------------

def validar_candidato(destino: Path, catalogo: list[dict[str, Any]]) -> SearchIndex:
    """Comprueba el candidato antes de que llegue a ser el índice activo."""
    # `SearchIndex.load` ya valida esquema, dimensiones, recuentos, coherencia
    # de desplazamientos, checksum del .npz e identificadores duplicados.
    indice = SearchIndex.load(destino)

    if indice.track_count != len(catalogo):
        raise RuntimeError(f"El candidato tiene {indice.track_count} pistas y el catálogo {len(catalogo)}")

    esperada = catalogue_fingerprint(catalogo)
    if indice.meta["catalogue"]["fingerprint"] != esperada:
        raise RuntimeError("La huella del catálogo no coincide con el candidato")

    for nombre, array in (
        ("segment_embeddings", indice.segment_embeddings),
        ("global_embeddings", indice.global_embeddings),
    ):
        if not np.isfinite(array).all():
            raise RuntimeError(f"'{nombre}' contiene NaN o infinitos")

    if (indice.segment_ends < indice.segment_starts).any():
        raise RuntimeError("Hay segmentos que terminan antes de empezar")
    if (indice.segment_starts < 0).any():
        raise RuntimeError("Hay segmentos con inicio negativo")

    sin_composicion = [t.track_id for t in indice.tracks if not t.composition_id]
    if sin_composicion:
        raise RuntimeError(f"Pistas sin composition_id: {', '.join(sin_composicion[:5])}")

    sin_sumas = [t.track_id for t in indice.tracks if not t.audio_sha256 or not t.metadata_sha256]
    if sin_sumas:
        raise RuntimeError(f"Pistas sin sumas de comprobación: {', '.join(sin_sumas[:5])}")

    return indice


def prueba_de_humo(indice: SearchIndex) -> dict[str, Any]:
    """Ejecuta la búsqueda sobre el candidato con un codificador de texto falso.

    No mide relevancia —para eso está el benchmark— sino que la tubería
    completa responde, el esquema es válido y la agrupación no deja versiones
    duplicadas en el resultado.
    """
    dimension = indice.embedding_dimension

    class CodificadorDeterminista:
        """Vectores reproducibles a partir del texto: sin GPU y sin sorpresas."""

        def embed_query(self, texto: str) -> np.ndarray:
            # hashlib y no hash(): el hash de cadenas de Python se aleatoriza en
            # cada proceso, y esta prueba tiene que dar lo mismo siempre.
            digest = hashlib.sha256(texto.encode("utf-8")).digest()[:8]
            semilla = int.from_bytes(digest, "big")
            generador = np.random.default_rng(semilla)
            vector = generador.standard_normal(dimension).astype(np.float32)
            return vector / np.linalg.norm(vector)

    servicio = SearchService(indice, CodificadorDeterminista(), None)
    informe = []
    for consulta in SMOKE_QUERIES:
        respuesta, _ = servicio.search({"query": consulta, "language": "en", "limit": 8})
        resultados = respuesta["results"]
        if not resultados:
            raise RuntimeError(f"La consulta de humo '{consulta}' no devolvió resultados")
        composiciones = [r["composition_id"] for r in resultados]
        if len(composiciones) != len(set(composiciones)):
            raise RuntimeError(f"La consulta '{consulta}' devolvió versiones duplicadas de una misma composición")
        for resultado in resultados:
            faltan = {"track_id", "title", "album", "audio_url", "match"} - set(resultado)
            if faltan:
                raise RuntimeError(f"Resultado sin los campos {faltan}")
        informe.append({"query": consulta, "results": len(resultados)})
    return {"queries": informe}


# --------------------------------------------------------------------------
# Comandos de despliegue
# --------------------------------------------------------------------------

def imprimir_comandos_de_subida(args: argparse.Namespace, version: str) -> None:
    destino = f"{args.vps_host}:{args.vps_path}"
    print()
    print("-" * 70)
    print("Para llevarlo al VPS:")
    print()
    print(f"  ssh {args.vps_host} \"mkdir -p {args.vps_path}/indexes/{version}\"")
    print()
    print(f"  scp data/music-intelligence-v2/indexes/{version}/index.npz \\")
    print(f"      data/music-intelligence-v2/indexes/{version}/index_meta.json \\")
    print(f"      {destino}/indexes/{version}/")
    print()
    print("  # El puntero se copia el último: hasta que se mueve, el VPS sigue")
    print("  # sirviendo el índice anterior.")
    print(f"  scp data/music-intelligence-v2/indexes/current.json {destino}/indexes/")
    print()
    print("  ssh -t {host} \"cd /opt/containers/josicovila-com && sudo docker compose restart music-search\"".format(host=args.vps_host))
    print("-" * 70)


# --------------------------------------------------------------------------

def ejecutar_rollback(args: argparse.Namespace) -> int:
    try:
        anterior, nueva = rollback_index(args.data_root / "indexes", args.rollback_to)
    except PublicationError as error:
        print(f"No se pudo revertir: {error}", file=sys.stderr)
        return 1
    print(f"Índice activo: {anterior or '(ninguno)'} -> {nueva}")
    print("Sólo se ha movido el puntero; no se ha regenerado ningún embedding.")
    imprimir_comandos_de_subida(args, nueva)
    return 0


def main() -> int:
    args = parse_arguments()
    if args.rollback or args.rollback_to:
        return ejecutar_rollback(args)

    inicio = time.perf_counter()
    versionados = args.data_root / "indexes"

    print("Leyendo el catálogo y calculando sumas de comprobación...")
    catalogo = construir_catalogo(args)

    directorio_activo = resolve_index_dir(args.data_root)
    indice_anterior, manifiesto = cargar_indice_anterior(directorio_activo)
    indexadas = indice_anterior.track_count if indice_anterior else 0

    pipeline_actual = {
        "retrieval_model": leer_json(args.model_registry)["muq_mulan"]["checkpoint"],
        "model_revision": leer_json(args.model_registry)["muq_mulan"]["revision"],
        "embedding_dimension": indice_anterior.embedding_dimension if indice_anterior else None,
        "segment_seconds": args.segment_seconds,
        "stride_seconds": args.stride_seconds,
    }
    if indice_anterior is not None:
        # La dimensión la fija el modelo; se compara la del índice consigo misma
        # para no marcar un cambio falso cuando aún no se ha embebido nada.
        pipeline_actual["embedding_dimension"] = pipeline_signature(manifiesto)["embedding_dimension"]

    plan = plan_update(catalogo, manifiesto, pipeline_actual, force_rebuild=args.rebuild)
    print()
    imprimir_plan(plan, catalogo, indexadas)

    if args.dry_run:
        print()
        print("Simulación: no se ha escrito nada.")
        return 0

    if plan.is_noop and plan.manifest_has_checksums and not args.rebuild:
        print()
        print("Nada que hacer: el índice está al día.")
        print("(Para forzar una reconstrucción completa, usa --rebuild.)")
        return 0

    version = next_index_version(versionados)
    candidato = versionados / f"{version}.tmp"
    discard_candidate(candidato)

    try:
        resultado = construir_candidato(args, catalogo, plan, indice_anterior, candidato)
        print("\nValidando el candidato...")
        indice = validar_candidato(candidato, catalogo)
        humo = prueba_de_humo(indice)
        print(f"Validación: CORRECTA ({indice.track_count} pistas, {indice.segment_count} segmentos)")
        print(f"Prueba de humo: {len(humo['queries'])} consultas sin incidencias")

        anterior_activa = read_active_version(versionados)
        publish_index(versionados, candidato, version)
    except Exception as error:
        discard_candidate(candidato)
        print(f"\nFALLO: {error}", file=sys.stderr)
        print("El índice activo no se ha tocado.", file=sys.stderr)
        traceback.print_exc()
        return 1

    conteos = plan.counts()
    informe = {
        "from_index": anterior_activa,
        "to_index": version,
        "catalogue_tracks": len(catalogo),
        **conteos,
        "tracks_reembedded": len(plan.tracks_requiring_analysis),
        "segments_generated": int(indice.segment_count),
        "inference_seconds": round(resultado["inference_seconds"], 2),
        "duration_seconds": round(time.perf_counter() - inicio, 2),
        "catalogue_fingerprint": indice.meta["catalogue"]["fingerprint"],
        "status": "published",
    }
    (versionados / version / "update_report.json").write_text(
        json.dumps(informe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print()
    print(f"Índice publicado: {version}")
    if anterior_activa:
        print(f"Anterior conservado: {anterior_activa}")
    print(f"Versiones disponibles: {', '.join(list_index_versions(versionados))}")
    imprimir_comandos_de_subida(args, version)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
