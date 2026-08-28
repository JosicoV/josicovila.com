<?php
/**
 * Proxy de eventos de telemetría hacia el servicio de búsqueda.
 *
 * El navegador no escribe nada en disco ni conoce dónde se guardan los
 * eventos: manda el evento aquí y el servicio lo valida, lo completa con los
 * campos que decide el servidor (marca de tiempo, versión de índice) y lo
 * añade a su fichero JSONL, que vive fuera de la raíz web.
 *
 * La telemetría no es crítica: si esto falla, la búsqueda y el reproductor
 * siguen funcionando igual. El frontend ignora los errores de este endpoint.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

const EVENT_TIMEOUT_SECONDS = 3;
const MAX_EVENT_BYTES = 8192;

function responder_error(string $codigo, int $estado): void
{
    http_response_code($estado);
    echo json_encode(['error' => ['code' => $codigo]]);
    exit;
}

function url_del_servicio(): string
{
    $url = getenv('MUSIC_SEARCH_URL');
    if (is_string($url) && $url !== '') {
        return rtrim($url, '/');
    }
    return 'http://host.docker.internal:8100';
}

$crudo = file_get_contents('php://input');
if ($crudo === false || $crudo === '' || strlen($crudo) > MAX_EVENT_BYTES) {
    responder_error('malformed_request', 400);
}

// Se comprueba que sea JSON válido antes de reenviarlo, pero no se interpreta
// su contenido: quien valida el esquema es el servicio, que además conoce las
// pistas y las búsquedas reales.
$evento = json_decode($crudo, true);
if (!is_array($evento) || !isset($evento['event_type'])) {
    responder_error('malformed_request', 400);
}

$curl = curl_init(url_del_servicio() . '/events');
curl_setopt_array($curl, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $crudo,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => EVENT_TIMEOUT_SECONDS,
    CURLOPT_CONNECTTIMEOUT => 2,
]);
$cuerpo = curl_exec($curl);
$estado = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$fallo  = curl_error($curl);
curl_close($curl);

if ($cuerpo === false || $estado === 0) {
    error_log('telemetry: servicio inalcanzable: ' . $fallo);
    responder_error('telemetry_unavailable', 503);
}

// Se devuelve tal cual el acuse del servicio: {"ok":true,"event_id":"..."}.
http_response_code($estado);
echo $cuerpo;
