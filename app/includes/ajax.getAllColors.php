<?php
header('Content-Type: application/json; charset=UTF-8');
include_once 'musica.estructura-datos.php';

$all = [];
foreach ($disco as $album) {
    $all[] = $album['coloresalpha']['color1'];
    $all[] = $album['coloresalpha']['color2'];
    $all[] = $album['coloresalpha']['color3'];
}

// Eliminamos duplicados (opcional)
$all = array_values(array_unique($all));

echo json_encode(['colors' => $all]);