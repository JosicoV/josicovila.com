<?php
header('Content-Type: application/json; charset=UTF-8');

include_once 'musica.estructura-datos.php';


$query = '';
if (isset($_POST['query'])) {
    $query = mb_strtolower(trim($_POST['query']), 'UTF-8');
}

$results = [];

// Buscar en cada disco y sus canciones
foreach ($disco as $album) {
    $songnumber = 0;
    foreach ($album['canciones'] as $song) {
        if ($query === '' 
            || mb_stripos($song['nombre'], $query, 0, 'UTF-8') !== false
            || mb_stripos($album['nombre'], $query, 0, 'UTF-8') !== false
        ) {
            $results[] = [
                'songCode'  => $song['nombrejs'],
                'songName'  => $song['nombre'],
                'songSrc'   => $song['ruta'],
                'songnumber'=> $songnumber,
                'albumCode' => $album['nombrejs'],
                'albumName' => $album['nombre'],
                'cover'     => $album['imagen'],
            ];
            
        }
        $songnumber++;
    }
}

// Devolver JSON
echo json_encode($results);

?>