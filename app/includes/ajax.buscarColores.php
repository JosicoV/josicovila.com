<?php

include_once 'musica.estructura-datos.php';

$label = $_POST['label'];

foreach ($disco as $album) {
    if ($album['nombrejs'] == $label) {
        $coloresalpha = $album['coloresalpha'];
        $colores = $album['colores'];
        break;
    }
}

if (isset($colores)) {
    foreach ($colores as $color) {
        echo $color.'-'; 
    }
} else {
    echo '<div class="error">No se encontraron colores para el álbum seleccionado.</div>';
}

if (isset($coloresalpha)) {
    foreach ($coloresalpha as $color) {
        echo $color.'-'; 
    }
} else {
    echo '<div class="error">No se encontraron colores para el álbum seleccionado.</div>';
}