import numpy as np
import pytest
from service_fixtures import FakeEncoder, FakeTranslator, build_index

from music_intelligence_v2.service.hybrid import (
    apply_relevance,
    classify_intent,
    effective_intent,
    match_reasons,
)
from music_intelligence_v2.service.pipeline import SearchService
from music_intelligence_v2.service.textmatch import normalize, score_literal, tokenize

SIN_CORTE = {"strategy": "none"}


def servicio(**overrides):
    return SearchService(
        overrides.pop("index", build_index()),
        overrides.pop("encoder", FakeEncoder()),
        overrides.pop("translator", FakeTranslator()),
        **overrides,
    )


def titulos(respuesta):
    return [r["title"] for r in respuesta["results"]]


# --------------------------------------------------------------------------
# Normalización
# --------------------------------------------------------------------------

@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("The Guide Girl", "the guide girl"),
        ("  GUIDE  ", "guide"),
        ("Re-encarnación", "re encarnacion"),
        ("¿Dónde?  ¡Aquí!", "donde aqui"),
    ],
)
def test_normalizacion_es_determinista(entrada, esperado):
    assert normalize(entrada) == esperado


def test_tokenizacion_separa_por_palabras():
    assert tokenize("The Guide Girl") == ["the", "guide", "girl"]


# --------------------------------------------------------------------------
# Clases de coincidencia literal
# --------------------------------------------------------------------------

def test_titulo_exacto():
    m = score_literal("the guide girl", "The Guide Girl", "Once Upon a Tale")
    assert m.match_type == "exact_title" and m.title_score == 1.0


def test_palabra_completa_en_el_titulo():
    m = score_literal("guide", "The Guide Girl", "Once Upon a Tale")
    assert m.match_type == "all_tokens_title"
    assert m.title_score > 0.7


def test_prefijo_del_titulo():
    m = score_literal("the guide", "The Guide Girl", "Once Upon a Tale")
    assert m.match_type in {"prefix_title", "all_tokens_title"}
    assert m.title_score > 0.7


def test_coincidencia_parcial_puntua_por_cobertura():
    """Media consulta encontrada vale menos que la consulta entera."""
    parcial = score_literal("dark guide", "The Guide Girl", "X")
    completa = score_literal("guide girl", "The Guide Girl", "X")
    assert parcial.match_type == "partial_title"
    assert parcial.title_score < completa.title_score


def test_coincidencia_de_album_puntua_por_debajo_del_titulo():
    album = score_literal("dragon rage", "Some Other Song", "Dragon Rage")
    titulo = score_literal("dragon rage", "Dragon Rage", "Other Album")
    assert album.album_score > 0
    assert album.score < titulo.score


def test_sin_coincidencia_no_inventa_puntuacion():
    m = score_literal("soft medieval flute", "Dragon Rage", "Dragon Rage")
    assert m.score == 0.0 and m.match_type is None


def test_las_palabras_vacias_no_bastan_para_coincidir():
    m = score_literal("the", "The Guide Girl", "X")
    # 'the' sola no debe comportarse como un acierto de título.
    assert m.match_type != "exact_title"


# --------------------------------------------------------------------------
# Intención
# --------------------------------------------------------------------------

@pytest.mark.parametrize("consulta", ["guide", "avalon", "dragon rage", "the guide girl"])
def test_consultas_cortas_son_identificadores(consulta):
    assert classify_intent(consulta) == "identifier"


@pytest.mark.parametrize(
    "consulta",
    [
        "music for exploring ancient ruins",
        "dark but peaceful fantasy music",
        "something heroic but reflective",
        "musica para explorar unas ruinas antiguas",
    ],
)
def test_consultas_largas_son_descriptivas(consulta):
    assert classify_intent(consulta) == "descriptive"


def test_sin_titulo_fuerte_se_rebaja_la_intencion():
    """Dos palabras sueltas no convierten la búsqueda en una de título."""
    assert effective_intent("identifier", False) == "mixed"
    assert effective_intent("identifier", True) == "identifier"
    assert effective_intent("descriptive", True) == "descriptive"


# --------------------------------------------------------------------------
# Ranking híbrido
# --------------------------------------------------------------------------

def test_el_titulo_exacto_sube_al_primer_puesto():
    respuesta, telemetria = servicio(relevance=SIN_CORTE).search({"query": "dragon rage"})
    assert titulos(respuesta)[0] == "Dragon Rage"
    assert telemetria["query_intent"] == "identifier"


def test_una_consulta_descriptiva_no_la_decide_el_titulo():
    """El peso literal se apaga cuando el usuario está describiendo música."""
    encoder = FakeEncoder()
    peticion = {"query": "calm and melancholic music for a quiet evening", "language": "en"}

    con_hibrida, telemetria = servicio(encoder=encoder, relevance=SIN_CORTE).search(peticion)
    sin_hibrida, _ = servicio(encoder=encoder, hybrid=False, relevance=SIN_CORTE).search(peticion)

    assert telemetria["query_intent"] == "descriptive"
    assert titulos(con_hibrida)[0] == titulos(sin_hibrida)[0]


def test_una_palabra_de_titulo_en_una_frase_larga_no_secuestra_el_ranking():
    encoder = FakeEncoder()
    peticion = {"query": "a dragon crossing a calm and melancholic valley at dawn", "language": "en"}

    con_hibrida, _ = servicio(encoder=encoder, relevance=SIN_CORTE).search(peticion)
    sin_hibrida, _ = servicio(encoder=encoder, hybrid=False, relevance=SIN_CORTE).search(peticion)

    # 'dragon' aparece, pero manda la música.
    assert titulos(con_hibrida)[0] == titulos(sin_hibrida)[0]


def test_un_titulo_fuera_del_top_n_semantico_entra_igualmente():
    """Sin esto, `avalon` nunca encontraría 'Quest for Avalon': MuQ lo deja lejos."""
    servicio_estrecho = servicio(semantic_pool=1, relevance=SIN_CORTE)
    respuesta, _ = servicio_estrecho.search({"query": "quiet forest", "language": "en"})

    assert "Quiet Forest" in titulos(respuesta)


def test_la_agrupacion_de_versiones_se_mantiene():
    respuesta, _ = servicio(relevance=SIN_CORTE).search({"query": "believe"})
    composiciones = [r["composition_id"] for r in respuesta["results"]]

    assert titulos(respuesta)[0] == "Believe"
    assert len(composiciones) == len(set(composiciones))


def test_el_pipeline_espanol_sigue_funcionando():
    traductor = FakeTranslator("calm and melancholic music")
    respuesta, _ = servicio(translator=traductor, relevance=SIN_CORTE).search(
        {"query": "musica tranquila y melancolica"}
    )

    assert respuesta["detected_language"] == "es"
    assert respuesta["query_normalized_en"] == "calm and melancholic music"
    assert traductor.calls == ["musica tranquila y melancolica"]


def test_el_titulo_en_ingles_se_encuentra_con_el_detector_en_espanol():
    """La coincidencia literal usa la consulta original, no la traducida."""
    respuesta, _ = servicio(
        translator=FakeTranslator("something else entirely"), relevance=SIN_CORTE
    ).search({"query": "musica de Dragon Rage"})

    assert titulos(respuesta)[0] == "Dragon Rage"


# --------------------------------------------------------------------------
# Explicaciones
# --------------------------------------------------------------------------

def test_las_etiquetas_son_legibles_y_sin_porcentajes():
    respuesta, _ = servicio(relevance=SIN_CORTE).search({"query": "dragon rage"})
    razones = respuesta["results"][0]["match_reasons"]

    assert "Exact title match" in razones
    assert all("%" not in r for r in razones)


def test_una_coincidencia_solo_musical_se_etiqueta_como_tal():
    razones = match_reasons(score_literal("nada", "Otro", "Otro"), 0.2)
    assert razones == ["Musical similarity"]


# --------------------------------------------------------------------------
# Recuento dinámico de resultados
# --------------------------------------------------------------------------

def test_limit_es_un_maximo_no_una_cuota():
    respuesta, _ = servicio().search({"query": "dragon rage", "limit": 8})
    assert 0 < len(respuesta["results"]) < 8


def test_el_corte_puede_devolver_menos_que_el_limite():
    puntuaciones = [0.9, 0.85, 0.2, 0.1]
    assert apply_relevance(puntuaciones, {"strategy": "relative", "relative_ratio": 0.55}) == 2


def test_sin_corte_se_devuelven_todos():
    assert apply_relevance([0.9, 0.1], {"strategy": "none"}) == 2


def test_el_corte_por_codo_detecta_la_caida():
    assert apply_relevance([0.86, 0.83, 0.79, 0.76, 0.48], {"strategy": "elbow", "elbow_drop": 0.28}) == 4


def test_el_corte_absoluto_usa_el_minimo():
    assert apply_relevance([0.9, 0.5, 0.1], {"strategy": "absolute", "absolute_minimum": 0.4}) == 2


def test_siempre_se_devuelve_al_menos_un_resultado():
    assert apply_relevance([0.01, 0.001], {"strategy": "absolute", "absolute_minimum": 0.9}) == 1


def test_sin_candidatos_no_se_inventa_ninguno():
    assert apply_relevance([], {"strategy": "relative"}) == 0


def test_una_busqueda_por_titulo_puede_devolver_un_solo_resultado():
    """Un título exacto tiene una respuesta: rellenar seria meter ruido."""
    puntuaciones = [2.4, 0.5, 0.4, 0.3]
    assert apply_relevance(puntuaciones, None, intent="identifier") == 1


def test_una_busqueda_descriptiva_no_se_queda_en_uno():
    """Descubrir con un solo resultado se siente roto, aunque destaque mucho."""
    puntuaciones = [1.0, 0.5, 0.45, 0.4, 0.3]
    assert apply_relevance(puntuaciones, None, intent="identifier") == 1
    assert apply_relevance(puntuaciones, None, intent="descriptive") == 4
    assert apply_relevance(puntuaciones, None, intent="mixed") == 3


def test_el_minimo_no_puede_superar_a_los_candidatos():
    assert apply_relevance([1.0, 0.2], None, intent="descriptive") == 2


def test_un_minimo_explicito_manda_sobre_el_de_la_intencion():
    assert apply_relevance([1.0, 0.5, 0.4, 0.3], {"minimum_results": 2}, intent="descriptive") == 2


def test_copiar_la_configuracion_por_defecto_no_anula_el_minimo_por_intencion():
    """Expandir DEFAULT_RELEVANCE para cambiar otra cosa no debe romper la regla."""
    from music_intelligence_v2.service.hybrid import DEFAULT_RELEVANCE

    config = {**DEFAULT_RELEVANCE, "strategy": "relative"}
    assert apply_relevance([1.0, 0.5, 0.45, 0.4, 0.3], config, intent="descriptive") == 4


# --------------------------------------------------------------------------
# Diagnóstico
# --------------------------------------------------------------------------

def test_las_puntuaciones_internas_solo_salen_si_se_piden():
    s = servicio(relevance=SIN_CORTE)
    normal, _ = s.search({"query": "dragon rage"})
    detallada, _ = s.search({"query": "dragon rage"}, diagnostics=True)

    assert "diagnostics" not in normal["results"][0]
    d = detallada["results"][0]["diagnostics"]
    assert set(d) == {
        "semantic_score",
        "semantic_normalized",
        "literal_title_score",
        "literal_album_score",
        "literal_match_type",
        "hybrid_score",
    }
