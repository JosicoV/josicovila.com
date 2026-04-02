<?php

include_once 'musica.estructura-datos.php';

$label = $_POST['label'];



foreach ($disco as $album) {
    if ($album['nombrejs'] == $label) {
        $canciones = $album['canciones'];
        break;
    }
}

if (isset($canciones)) {
    $i = " active";
    foreach ($canciones as $cancion) {
        // Usamos un bloque HEREDOC para que el HTML sea más legible y fácil de mantener
        echo <<<HTML
        <div class="cancion{$i}" data-label="{$cancion['nombrejs']}" data-ruta="{$cancion['ruta']}" itemprop="track" itemscope itemtype="https://schema.org/MusicRecording">
            <div class="play-button"></div> 
            <div class="titulo-cancion" itemprop="name">
                <span>{$cancion['nombre']}</span>
                <svg class="info-icon" data-description="{$cancion['texto']}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"></path></svg>
            </div>
            <canvas id="visualizador2d" class="canvas-{$cancion['nombrejs']}"></canvas><meta itemprop="duration" content="PT0M0S" />
        </div>
HTML;
        $i = "";
    }
} else {
    echo '<div class="error">No se encontraron canciones para el álbum seleccionado.</div>';
}
?>