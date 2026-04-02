<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">    
    <title>Josico Vila | Epic and Fantastic Instrumental Music</title>

    <!-- SEO: Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://josicovila.com/">
    <meta property="og:title" content="Josico Vila | Epic and Fantastic Instrumental Music">
    <meta property="og:description" content="Listen to all the instrumental music from Josico Vila. All the epic albums since 2018.">
    <meta property="og:image" content="https://josicovila.com/img/social-share.png">

    <!-- SEO: Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://josicovila.com/">
    <meta property="twitter:title" content="Josico Vila | Epic and Fantastic Instrumental Music">
    <meta property="twitter:description" content="Listen to all the instrumental music from Josico Vila. All the epic albums since 2018.">
    <meta property="twitter:image" content="https://josicovila.com/img/social-share.png">

    <meta name="description" content="Listen to all the instrumental music from Josico Vila. All the epic albums since 2018.">
    <link rel="icon" type="image/png" href="img/tercero.png" />
    <link rel="stylesheet" href="css/styles.css">
    <script type="importmap">
        {
          "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js"
          }
        }
    </script>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-QM2HCYG8MN"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-QM2HCYG8MN');
    </script>
</head>
<body>
    <?php
        include_once 'includes/musica.estructura-datos.php';
    ?>
    <header>
        <!-- SEO: AÃ±adido atributo alt para describir la imagen a los buscadores -->
        <img id="firma" src="img/firma-blanca.png" alt="Firma de Josico Vila">
        <div id="busqueda">
            <div id="searchContainer">   
              <input type="text" id="songSearch" class="glass-form" placeholder="Search for a song...">
              <div id="searchResults"></div>
            </div>
            <div class="custom-select" id="miSelect">
                <div class="selected">
                  <span>Select an album...</span>
                </div>
                <div class="options">
                  <?php
                    foreach ($disco as $album) {
                  ?>     
                  <div class="option" data-label="<?= $album['nombrejs']?>" data-img="musica/DISCOS/<?= $album['imagen']?>" data-title="<?= $album['nombre']?>" data-description="<?= htmlspecialchars($album['texto']) ?>">
                    <img src="musica/DISCOS/<?= $album['imagen']?>" alt="<?= $album['nombre']?>" title="<?= $album['nombre']?>"> <?= $album['nombre']?>
                  </div>
                  <?php
                    }
                  ?>
                </div>
            </div>
            <div class="ojoCanvas">
              <svg id="ojo" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 576 512">
                <path d="M572.52 241.4C518.6 135.5 407.6 64 288 64S57.4 135.5 3.48 241.4a48.11 48.11 0 0 0 0 29.2C57.4 376.5 168.4 448 288 448s230.6-71.5 284.52-177.4a48.11 48.11 0 0 0 0-29.2zM288 400c-97 0-185.16-56.16-233.6-144C102.84 168.16 191 112 288 112s185.16 56.16 233.6 144C473.16 343.84 385 400 288 400zm0-272a128 128 0 1 0 128 128 128.15 128.15 0 0 0-128-128zm0 208a80 80 0 1 1 80-80 80.09 80.09 0 0 1-80 80z"/>
              </svg>
              <svg id="camera" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 512 512">
                <path d="M149.1 64.1L123.3 96H48C21.5 96 0 117.5 0 144v256c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V144c0-26.5-21.5-48-48-48h-75.3l-25.8-31.9c-5.5-6.8-14.6-10.1-23.5-8.2l-48 10.7c-9.3 2.1-17.3 9.2-20.4 18.4L273 128H239l-37.9-73.8c-3.1-9.2-11.1-16.3-20.4-18.4l-48-10.7c-8.9-2-18 1.4-23.5 8.2zM256 176c61.9 0 112 50.1 112 112s-50.1 112-112 112S144 349.9 144 288s50.1-112 112-112zm0 176c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64z"/>
              </svg>
            </div>
        </div>
        <div>
    </header>
    <div class="sphereRanges" style="display: none; flex-direction: column; align-items: center;gap: 20px; right: 20px; top: 20px; position: absolute; z-index:5000;">
         <div style="display:flex; gap:20px;"><label>Radius</label><input id="radius" type="range" min="10" max="140" value="20" /></div>
         <div style="display:flex; gap:20px;"><label>Deform</label><input id="deform" type="range" min="0" max="40" value="10" /></div>
    </div>
    <div class="disco">
        <!-- SEO: AÃ±adido itemscope y itemtype para definir esta secciÃ³n como un Ãlbum de MÃºsica -->
        <div class="portada img-difuminada" itemscope itemtype="https://schema.org/MusicAlbum">
          <div itemprop="byArtist" itemscope itemtype="https://schema.org/Person">
            <meta itemprop="name" content="Josico Vila" />
          </div>
          <img itemprop="image"> <!-- SEO: itemprop="image" para la portada -->
        </div>
        
        <div class="lista-disco">          
          <?php
          
          echo '<h1 class="album-title" itemprop="name">' . $disco[0]['nombre'] . '</h1>';
          echo '<p class="album-description">' . $disco[0]['texto'] . '</p>';
          $canciones = $disco[0]['canciones'];
          $i=0;
          foreach ($canciones as $cancion) {

          ?>
            <!-- SEO: AÃ±adido itemscope y itemtype para definir cada canciÃ³n como una GrabaciÃ³n Musical -->
            <div class="cancion <?php if($i==0) echo "active" ?>" data-label="<?= $cancion['nombrejs']?>" data-ruta="<?= $cancion['ruta']?>" itemprop="track" itemscope itemtype="https://schema.org/MusicRecording">
              <div class="play-button"></div> 
              <div class="titulo-cancion" itemprop="name">
                <span><?= $cancion['nombre'] ?></span>
                <svg class="info-icon" data-description="<?= htmlspecialchars($cancion['texto']) ?>" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"></path></svg>
              </div>
              <canvas id="visualizador2d" class="canvas-<?= $cancion['nombrejs']?>"></canvas><meta itemprop="duration" content="PT0M0S" /> <!-- DuraciÃ³n, idealmente actualizada con JS -->
            </div>
          <?php
            $i++;
          }
          
          
          ?>            
        </div>
    </div>
    <div id="container-track-time">
      <div class="time" style="display: flex;">
        <span style="margin-right: 40px" class="track-time">00:00/00:00</span>
        <div id="container-slider">
          <div id="slider"></div>
          <div id="progress-tooltip"></div>
        </div>
      </div>
    </div>

    
    <div id="wrapper-glass-forms">
      <div id="container-glass-forms"></div>
      <div id="container-click-firma">
        <div id="click-firma" class="glass-form">
          <div id="texto-firma">            
            <!-- SEO: Usar h2 para el titular de la biografía -->
            <h2>About the artist</h2>
            <h3>José "Josico" Vila Villa-Ceballos</h3>
            A Spanish music composer who has learned on his own everything he knows about music.<br>
            <br>
            He loves computers for all the potential they have. And he likes, apart from composing music on them, designing and programming his own web sites and attending to his social media.<br>
            <br>
            He has written four books and thirteen short stories that can be read at josicovila.es (Spanish).<br>
            <div class="social-links-firma">
              <a href="https://www.facebook.com/JosicoVila78" target="_blank" rel="noopener noreferrer">Facebook</a>
              <a href="https://www.instagram.com/josicovila/" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://www.linkedin.com/in/josico-vila/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://www.youtube.com/@josicovila" target="_blank" rel="noopener noreferrer">YouTube</a>
            </div>
          </div>
          <!-- SEO: AÃ±adido atributo alt para describir la imagen -->
          <img id='imagen-firma' src="img/defrente.png" alt="Foto de Josico Vila" />
        </div>
      </div>
    </div>
    <script type="module" src="./js/3D.module.js"></script>
    <script type="module" src="js/js.js"></script>

    <div id="cookieConsentBanner">
        <p>This website uses cookies to enhance your experience and for analytics purposes. By clicking 'Accept', you consent to the use of cookies. Read our <a href="privacy-policy.html" target="_blank">Privacy Policy</a> for more information.</p>
        <button id="acceptCookieConsent">Accept</button>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const consentBanner = document.getElementById('cookieConsentBanner');
            const acceptButton = document.getElementById('acceptCookieConsent');

            if (!localStorage.getItem('cookieConsentAccepted')) {
                consentBanner.style.display = 'block';
            }

            acceptButton.addEventListener('click', function() {
                localStorage.setItem('cookieConsentAccepted', 'true');
                consentBanner.style.display = 'none';
            });
        });
    </script>
</body>
</html>

