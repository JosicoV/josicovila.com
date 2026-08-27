<?php
/**
 * Proxy hacia el servicio de búsqueda semántica (music-intelligence-v2).
 *
 * El navegador nunca habla con el servicio Python: así no hace falta CORS ni
 * abrir un puerto público. Este archivo traduce además la respuesta del
 * servicio al formato que ya consume el frontend (album + número de pista),
 * de modo que playSongResult() funciona igual que con la búsqueda literal.
 *
 * No modifica ajax.searchSongs.php: la búsqueda literal sigue disponible.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/musica.estructura-datos.php';

const SEARCH_TIMEOUT_SECONDS = 8;
const SEARCH_MAX_LIMIT = 8;

/** Responde con un error estable y termina. El detalle técnico no sale de aquí. */
function responder_error(string $codigo, string $mensaje, int $estado): void
{
    http_response_code($estado);
    echo json_encode(['error' => ['code' => $codigo, 'message' => $mensaje]]);
    exit;
}

function url_del_servicio(): string
{
    $url = getenv('MUSIC_SEARCH_URL');
    if (is_string($url) && $url !== '') {
        return rtrim($url, '/');
    }
    // Docker Desktop: el servicio corre en la máquina anfitriona.
    return 'http://host.docker.internal:8100';
}

/**
 * Índice ruta-de-audio -> posición en el catálogo.
 *
 * El servicio devuelve audio_url como "musica/<ruta>"; el catálogo PHP guarda
 * "<ruta>". Emparejamos por ahí porque es el único identificador que ambos
 * lados comparten sin duplicar metadatos.
 */
function indice_por_ruta(array $discos): array
{
    $indice = [];
    foreach ($discos as $album) {
        $numero = 0;
        foreach ($album['canciones'] as $cancion) {
            $clave = mb_strtolower(str_replace('\\', '/', $cancion['ruta']), 'UTF-8');
            $indice[$clave] = [
                'songCode'         => $cancion['nombrejs'],
                'songName'         => $cancion['nombre'],
                'songSrc'          => $cancion['ruta'],
                'songnumber'       => $numero,
                'albumCode'        => $album['nombrejs'],
                'albumName'        => $album['nombre'],
                'cover'            => $album['imagen'],
                'albumDescription' => $album['texto'],
            ];
            $numero++;
        }
    }
    return $indice;
}

$consulta = isset($_POST['query']) ? trim((string) $_POST['query']) : '';
if ($consulta === '') {
    responder_error('empty_query', 'Escribe algo para buscar.', 400);
}

$limite = isset($_POST['limit']) ? (int) $_POST['limit'] : SEARCH_MAX_LIMIT;
if ($limite < 1 || $limite > SEARCH_MAX_LIMIT) {
    $limite = SEARCH_MAX_LIMIT;
}

$peticion = json_encode([
    'query'    => $consulta,
    'language' => 'auto',
    'limit'    => $limite,
], JSON_UNESCAPED_UNICODE);

$curl = curl_init(url_del_servicio() . '/search');
curl_setopt_array($curl, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $peticion,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => SEARCH_TIMEOUT_SECONDS,
    CURLOPT_CONNECTTIMEOUT => 3,
]);
$cuerpo = curl_exec($curl);
$estado = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$fallo  = curl_error($curl);
curl_close($curl);

if ($cuerpo === false || $estado === 0) {
    error_log('semanticSearch: servicio inalcanzable: ' . $fallo);
    responder_error('search_unavailable', 'La búsqueda no está disponible ahora mismo.', 503);
}

$datos = json_decode($cuerpo, true);
if (!is_array($datos)) {
    error_log('semanticSearch: respuesta no JSON del servicio (HTTP ' . $estado . ')');
    responder_error('search_unavailable', 'La búsqueda no está disponible ahora mismo.', 503);
}

if ($estado >= 400) {
    $codigo = $datos['error']['code'] ?? 'search_failed';
    // Los errores de validación son culpa de la petición; el resto, del servicio.
    $estadoPublico = $estado < 500 ? 400 : 503;
    $mensaje = $estadoPublico === 400
        ? 'No he podido interpretar esa búsqueda.'
        : 'La búsqueda no está disponible ahora mismo.';
    error_log('semanticSearch: el servicio devolvió ' . $estado . ' (' . $codigo . ')');
    responder_error($codigo, $mensaje, $estadoPublico);
}

$indice = indice_por_ruta($disco);
$resultados = [];
foreach (($datos['results'] ?? []) as $resultado) {
    $ruta = (string) ($resultado['audio_url'] ?? '');
    $clave = mb_strtolower(preg_replace('#^musica/#i', '', $ruta), 'UTF-8');
    if (!isset($indice[$clave])) {
        // Índice y catálogo PHP han divergido: se omite en vez de romper la lista.
        error_log('semanticSearch: pista del índice ausente del catálogo: ' . $ruta);
        continue;
    }
    $resultados[] = $indice[$clave] + [
        'rank'             => $resultado['rank'] ?? null,
        'bestSegmentStart' => $resultado['match']['best_segment_start'] ?? null,
    ];
}

echo json_encode([
    'query'            => $consulta,
    'detectedLanguage' => $datos['detected_language'] ?? null,
    'normalizedQuery'  => $datos['query_normalized_en'] ?? null,
    'results'          => $resultados,
], JSON_UNESCAPED_UNICODE);
