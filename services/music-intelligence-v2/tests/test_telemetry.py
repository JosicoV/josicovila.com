import json
from datetime import datetime, timezone

import pytest
from service_fixtures import FakeEncoder, FakeTranslator, build_index

from music_intelligence_v2.service.collector import TelemetryCollector
from music_intelligence_v2.service.errors import InvalidEvent, TelemetryUnavailable
from music_intelligence_v2.service.pipeline import SearchService
from music_intelligence_v2.telemetry import (
    EventValidationError,
    TelemetryWriter,
    build_dataset,
    load_events,
    new_id,
    read_events,
    resolve_feedback,
    summarize,
    validate_event,
)


def coleccionador(tmp_path, **kwargs):
    return TelemetryCollector(tmp_path / "telemetry", **kwargs)


def servicio_con_telemetria(tmp_path, **kwargs):
    return SearchService(
        build_index(),
        FakeEncoder(),
        FakeTranslator(),
        telemetry=coleccionador(tmp_path, **kwargs),
        relevance={"strategy": "none"},
    )


# --------------------------------------------------------------------------
# Escritura
# --------------------------------------------------------------------------

def test_un_evento_escribe_exactamente_una_linea(tmp_path):
    writer = TelemetryWriter(tmp_path)
    writer.append({"event_type": "result_clicked", "event_id": "a"})

    destino = writer.files()[0]
    assert destino.read_text(encoding="utf-8").count("\n") == 1


def test_dos_eventos_producen_dos_lineas_validas(tmp_path):
    writer = TelemetryWriter(tmp_path)
    writer.append({"event_type": "result_clicked", "n": 1})
    writer.append({"event_type": "replay", "n": 2})

    lineas = writer.files()[0].read_text(encoding="utf-8").strip().split("\n")
    assert [json.loads(l)["n"] for l in lineas] == [1, 2]


def test_el_utf8_se_conserva(tmp_path):
    writer = TelemetryWriter(tmp_path)
    writer.append({"event_type": "search_performed", "query": "música épica y melancólica"})

    evento = load_events(writer.files())[0]
    assert evento["query"] == "música épica y melancólica"


def test_los_eventos_van_al_fichero_del_dia(tmp_path):
    writer = TelemetryWriter(tmp_path)
    momento = datetime(2026, 8, 28, 23, 59, tzinfo=timezone.utc)

    assert writer.path_for(momento).name == "2026-08-28.jsonl"


def test_una_linea_corrupta_se_informa_no_se_descarta(tmp_path):
    fichero = tmp_path / "2026-08-28.jsonl"
    fichero.write_text('{"ok":1}\nesto no es json\n{"ok":2}\n', encoding="utf-8")

    errores = [(n, e) for _, n, _, e in read_events([fichero]) if e]
    assert len(errores) == 1 and errores[0][0] == 2
    assert len(load_events([fichero])) == 2


# --------------------------------------------------------------------------
# Validación
# --------------------------------------------------------------------------

def test_un_tipo_de_evento_desconocido_se_rechaza():
    with pytest.raises(EventValidationError, match="desconocido"):
        validate_event({"event_type": "borrar_todo", "search_id": new_id()})


def test_un_payload_que_no_es_objeto_se_rechaza():
    with pytest.raises(EventValidationError):
        validate_event(["result_clicked"])


def test_una_pista_desconocida_se_rechaza():
    with pytest.raises(EventValidationError, match="track_id desconocido"):
        validate_event(
            {"event_type": "result_clicked", "search_id": new_id(), "track_id": "inventada"},
            known_track_ids={"believe-studio"},
        )


def test_una_busqueda_desconocida_se_rechaza():
    with pytest.raises(EventValidationError, match="search_id desconocido"):
        validate_event(
            {"event_type": "result_clicked", "search_id": new_id(), "track_id": "x"},
            known_search_ids={new_id()},
        )


@pytest.mark.parametrize("rank", [0, -1, 999])
def test_un_puesto_fuera_de_rango_se_rechaza(rank):
    with pytest.raises(EventValidationError, match="rank"):
        validate_event({"event_type": "result_clicked", "search_id": new_id(), "track_id": "x", "rank": rank})


def test_una_duracion_negativa_se_rechaza():
    with pytest.raises(EventValidationError, match="negativo"):
        validate_event(
            {
                "event_type": "play_summary",
                "search_id": new_id(),
                "track_id": "x",
                "seconds_listened": -5,
            }
        )


def test_el_texto_desmesurado_se_rechaza():
    with pytest.raises(EventValidationError, match="caracteres"):
        validate_event(
            {"event_type": "result_clicked", "search_id": new_id(), "track_id": "x" * 500}
        )


def test_la_proporcion_de_escucha_la_calcula_el_servidor():
    """No se acepta del cliente: es la métrica con la que se juzga relevancia."""
    evento = validate_event(
        {
            "event_type": "play_summary",
            "search_id": new_id(),
            "track_id": "x",
            "seconds_listened": 50,
            "track_duration": 100,
            "listen_ratio": 0.99,  # mentira del cliente
        }
    )
    assert evento["listen_ratio"] == 0.5


def test_la_proporcion_se_acota_a_uno():
    evento = validate_event(
        {
            "event_type": "play_summary",
            "search_id": new_id(),
            "track_id": "x",
            "seconds_listened": 200,
            "track_duration": 100,
        }
    )
    assert evento["listen_ratio"] == 1.0


def test_el_sobre_lo_pone_el_servidor():
    evento = validate_event(
        {
            "event_type": "result_clicked",
            "search_id": new_id(),
            "track_id": "x",
            "timestamp": "1999-01-01T00:00:00Z",
            "index_version": "mentira",
        },
        index_version="index-v009",
    )
    assert evento["index_version"] == "index-v009"
    assert not evento["timestamp"].startswith("1999")


# --------------------------------------------------------------------------
# Feedback
# --------------------------------------------------------------------------

def test_el_ultimo_feedback_es_el_que_vale():
    """Append-only: un 'No' corregido a 'Sí' se resuelve como 'Sí' al exportar."""
    eventos = [
        {"event_type": "feedback_no_match", "search_id": "s1", "track_id": "t1", "timestamp": "2026-08-28T10:00:00Z"},
        {"event_type": "feedback_match", "search_id": "s1", "track_id": "t1", "timestamp": "2026-08-28T10:00:05Z"},
    ]
    assert resolve_feedback(eventos) == {("s1", "t1"): "feedback_match"}


def test_tambien_al_reves():
    eventos = [
        {"event_type": "feedback_match", "search_id": "s1", "track_id": "t1", "timestamp": "2026-08-28T10:00:00Z"},
        {"event_type": "feedback_no_match", "search_id": "s1", "track_id": "t1", "timestamp": "2026-08-28T10:00:05Z"},
    ]
    assert resolve_feedback(eventos) == {("s1", "t1"): "feedback_no_match"}


# --------------------------------------------------------------------------
# Búsqueda e instantánea
# --------------------------------------------------------------------------

def test_una_busqueda_guarda_su_instantanea(tmp_path):
    servicio = servicio_con_telemetria(tmp_path, store_raw_query=True)
    respuesta, _ = servicio.search({"query": "believe"})

    eventos = load_events(servicio.telemetry.writer.files())
    busqueda = eventos[0]

    assert busqueda["event_type"] == "search_performed"
    assert busqueda["search_id"] == respuesta["search_id"]
    assert busqueda["result_count"] == len(respuesta["results"])
    # La instantánea guarda las alternativas que se mostraron, con sus scores.
    primero = busqueda["results"][0]
    assert {"track_id", "rank", "semantic_score", "hybrid_score", "match_reasons"} <= set(primero)
    # Las etiquetas se guardan resueltas, no vacías: son parte del "por qué".
    assert primero["match_reasons"]
    assert "embedding" not in json.dumps(busqueda)


def test_sin_store_raw_query_no_se_guarda_el_texto(tmp_path):
    servicio = servicio_con_telemetria(tmp_path, store_raw_query=False)
    servicio.search({"query": "algo muy personal"})

    busqueda = load_events(servicio.telemetry.writer.files())[0]
    assert "query" not in busqueda
    assert busqueda["query_length"] == 3  # sí se guarda la longitud


def test_la_respuesta_incluye_el_search_id(tmp_path):
    servicio = servicio_con_telemetria(tmp_path)
    respuesta, _ = servicio.search({"query": "believe"})
    assert respuesta["search_id"]


def test_sin_telemetria_el_search_id_es_nulo():
    servicio = SearchService(build_index(), FakeEncoder(), FakeTranslator())
    respuesta, _ = servicio.search({"query": "believe"})
    assert respuesta["search_id"] is None


# --------------------------------------------------------------------------
# Fiabilidad
# --------------------------------------------------------------------------

def test_un_fallo_de_telemetria_no_rompe_la_busqueda(tmp_path):
    class ColeccionadorRoto:
        def record_search(self, **kwargs):
            raise OSError("disco lleno")

    servicio = SearchService(
        build_index(), FakeEncoder(), FakeTranslator(), telemetry=ColeccionadorRoto()
    )
    respuesta, _ = servicio.search({"query": "believe"})

    assert respuesta["results"]          # la búsqueda funciona igual
    assert respuesta["search_id"] is None


def test_sin_telemetria_el_endpoint_de_eventos_lo_dice():
    servicio = SearchService(build_index(), FakeEncoder(), FakeTranslator())
    with pytest.raises(TelemetryUnavailable):
        servicio.record_event({"event_type": "result_clicked"})


def test_un_evento_invalido_da_error_de_contrato(tmp_path):
    servicio = servicio_con_telemetria(tmp_path)
    with pytest.raises(InvalidEvent):
        servicio.record_event({"event_type": "inventado"})


# --------------------------------------------------------------------------
# Exportación
# --------------------------------------------------------------------------

def test_el_conjunto_de_datos_une_todas_las_senales(tmp_path):
    servicio = servicio_con_telemetria(tmp_path, store_raw_query=True)
    respuesta, _ = servicio.search({"query": "believe"})
    search_id = respuesta["search_id"]
    pista = respuesta["results"][0]["track_id"]

    servicio.record_event({"event_type": "result_clicked", "search_id": search_id, "track_id": pista, "rank": 1})
    servicio.record_event(
        {
            "event_type": "play_summary",
            "search_id": search_id,
            "track_id": pista,
            "seconds_listened": 40,
            "track_duration": 100,
        }
    )
    servicio.record_event({"event_type": "feedback_no_match", "search_id": search_id, "track_id": pista})
    servicio.record_event({"event_type": "feedback_match", "search_id": search_id, "track_id": pista})

    filas = build_dataset(load_events(servicio.telemetry.writer.files()))
    fila = next(f for f in filas if f["track_id"] == pista)

    assert fila["clicked"] is True
    assert fila["listen_ratio"] == 0.4
    assert fila["explicit_match"] is True      # el 'No' quedó superado
    assert fila["explicit_no_match"] is False
    assert fila["query"] == "believe"
    # Las alternativas mostradas también salen, sin señales.
    assert len(filas) == len(respuesta["results"])


def test_la_escucha_mas_larga_gana_no_la_suma(tmp_path):
    """Sumar exageraría el interés de quien oye, salta y vuelve."""
    from music_intelligence_v2.telemetry import consolidate_listening

    eventos = [
        {"event_type": "play_summary", "search_id": "s", "track_id": "t", "seconds_listened": 30, "listen_ratio": 0.3},
        {"event_type": "play_summary", "search_id": "s", "track_id": "t", "seconds_listened": 20, "listen_ratio": 0.2},
    ]
    assert consolidate_listening(eventos)[("s", "t")]["seconds_listened"] == 30


def test_el_salto_rapido_y_la_repeticion_se_conservan():
    from music_intelligence_v2.telemetry import consolidate_listening

    eventos = [
        {"event_type": "quick_skip", "search_id": "s", "track_id": "t", "seconds_listened": 4},
        {"event_type": "replay", "search_id": "s", "track_id": "t"},
        {"event_type": "replay", "search_id": "s", "track_id": "t"},
    ]
    resultado = consolidate_listening(eventos)[("s", "t")]
    assert resultado["quick_skip"] is True and resultado["replayed"] == 2


def test_el_resumen_cuenta_lo_que_importa(tmp_path):
    servicio = servicio_con_telemetria(tmp_path)
    respuesta, _ = servicio.search({"query": "believe"})
    pista = respuesta["results"][0]["track_id"]
    servicio.record_event(
        {"event_type": "result_clicked", "search_id": respuesta["search_id"], "track_id": pista, "rank": 1}
    )

    resumen = summarize(load_events(servicio.telemetry.writer.files()))
    assert resumen["searches"] == 1 and resumen["result_clicks"] == 1


def test_las_busquedas_a_medio_teclear_se_marcan():
    """Escribir 'música relajante' deja varios eventos; sólo uno es la búsqueda."""
    from music_intelligence_v2.telemetry import mark_superseded

    eventos = [
        {"event_type": "search_performed", "search_id": "s1", "anon_session_id": "a", "timestamp": "2026-08-28T19:57:26Z"},
        {"event_type": "search_performed", "search_id": "s2", "anon_session_id": "a", "timestamp": "2026-08-28T19:57:28Z"},
        {"event_type": "search_performed", "search_id": "s3", "anon_session_id": "a", "timestamp": "2026-08-28T19:57:33Z"},
        {"event_type": "result_clicked", "search_id": "s3", "track_id": "t", "timestamp": "2026-08-28T19:57:42Z"},
    ]
    assert mark_superseded(eventos) == {"s1", "s2"}


def test_una_busqueda_con_interaccion_nunca_se_marca():
    from music_intelligence_v2.telemetry import mark_superseded

    eventos = [
        {"event_type": "search_performed", "search_id": "s1", "anon_session_id": "a", "timestamp": "2026-08-28T19:00:00Z"},
        {"event_type": "result_clicked", "search_id": "s1", "track_id": "t", "timestamp": "2026-08-28T19:00:01Z"},
        {"event_type": "search_performed", "search_id": "s2", "anon_session_id": "a", "timestamp": "2026-08-28T19:00:03Z"},
    ]
    assert mark_superseded(eventos) == set()


def test_dos_busquedas_separadas_en_el_tiempo_son_dos_busquedas():
    from music_intelligence_v2.telemetry import mark_superseded

    eventos = [
        {"event_type": "search_performed", "search_id": "s1", "anon_session_id": "a", "timestamp": "2026-08-28T19:00:00Z"},
        {"event_type": "search_performed", "search_id": "s2", "anon_session_id": "a", "timestamp": "2026-08-28T19:05:00Z"},
    ]
    assert mark_superseded(eventos) == set()


def test_el_resumen_separa_busquedas_de_pasos_al_teclear():
    eventos = [
        {"event_type": "search_performed", "search_id": "s1", "anon_session_id": "a", "timestamp": "2026-08-28T19:57:26Z"},
        {"event_type": "search_performed", "search_id": "s2", "anon_session_id": "a", "timestamp": "2026-08-28T19:57:33Z"},
        {"event_type": "result_clicked", "search_id": "s2", "track_id": "t", "timestamp": "2026-08-28T19:57:42Z"},
    ]
    resumen = summarize(eventos)
    assert resumen["settled_searches"] == 1 and resumen["typing_steps"] == 1


def test_varios_resumenes_de_la_misma_escucha_no_se_suman():
    """Pausar escribe un resumen; reanudar y parar escribe otro. Gana el mayor."""
    from music_intelligence_v2.telemetry import consolidate_listening

    eventos = [
        {"event_type": "play_summary", "search_id": "s", "track_id": "t", "seconds_listened": 80, "listen_ratio": 0.5},
        {"event_type": "play_summary", "search_id": "s", "track_id": "t", "seconds_listened": 162, "listen_ratio": 1.0},
    ]
    assert consolidate_listening(eventos)[("s", "t")]["seconds_listened"] == 162


def test_exportar_no_altera_el_jsonl(tmp_path):
    servicio = servicio_con_telemetria(tmp_path)
    servicio.search({"query": "believe"})
    fichero = servicio.telemetry.writer.files()[0]
    antes = fichero.read_bytes()

    build_dataset(load_events([fichero]))

    assert fichero.read_bytes() == antes
