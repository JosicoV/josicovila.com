<?php

include_once 'musica.estructura-datos.php';

$label = $_POST['label'];

$idx = 0;
forEach($disco as $album){
    $idx++;
    if($label == $album['nombre']){
        if($idx < count($disco)) {
            echo $disco[$idx]['nombrejs'].'='.$disco[$idx]['imagen'].'='.$disco[$idx]['nombre'];
            break;
        } else {
            echo $disco[0]['nombrejs'].'='.$disco[0]['imagen'].'='.$disco[0]['nombre'];
            break;
        }
    }
}

?>