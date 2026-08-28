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
    <link rel="preload" as="image" href="img/hero-desktop.webp" media="(min-width: 861px)">
    <link rel="preload" as="image" href="img/hero-mobile.webp" media="(max-width: 860px)">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/hero.css">
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
        </div>
            <div class="ojoCanvas">
              <svg id="ojo" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 576 512">
                <path d="M572.52 241.4C518.6 135.5 407.6 64 288 64S57.4 135.5 3.48 241.4a48.11 48.11 0 0 0 0 29.2C57.4 376.5 168.4 448 288 448s230.6-71.5 284.52-177.4a48.11 48.11 0 0 0 0-29.2zM288 400c-97 0-185.16-56.16-233.6-144C102.84 168.16 191 112 288 112s185.16 56.16 233.6 144C473.16 343.84 385 400 288 400zm0-272a128 128 0 1 0 128 128 128.15 128.15 0 0 0-128-128zm0 208a80 80 0 1 1 80-80 80.09 80.09 0 0 1-80 80z"/>
              </svg>
              <svg id="camera" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 512 512">
                <path d="M149.1 64.1L123.3 96H48C21.5 96 0 117.5 0 144v256c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V144c0-26.5-21.5-48-48-48h-75.3l-25.8-31.9c-5.5-6.8-14.6-10.1-23.5-8.2l-48 10.7c-9.3 2.1-17.3 9.2-20.4 18.4L273 128H239l-37.9-73.8c-3.1-9.2-11.1-16.3-20.4-18.4l-48-10.7c-8.9-2-18 1.4-23.5 8.2zM256 176c61.9 0 112 50.1 112 112s-50.1 112-112 112S144 349.9 144 288s50.1-112 112-112zm0 176c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64z"/>
              </svg>
            </div>
    </header>

    <main id="scroll-root">
      <section id="hero">
        <div id="hero-content">
          <h1 class="hero-title">Type a feeling. Discover a world.</h1>
          <p class="hero-subtitle">Describe a mood, a scene, or a story &mdash; and find the music behind it.</p>
          <div id="searchContainer">
            <div id="searchField">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
                <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
              </svg>
              <!-- autocapitalize/autocorrect desactivados: los teclados de movil
                   capitalizan la primera letra y autocorrigen por su cuenta, y
                   eso hacia que la misma busqueda diera resultados distintos en
                   movil y en escritorio. -->
              <input type="text" id="songSearch" placeholder="epic with choir, music for dragons, soft medieval flute..." autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="Search music by mood, scene or story">
              <svg class="sparkle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l1.9 5.6c.3.9 1 1.6 1.9 1.9L21.4 12l-5.6 1.9c-.9.3-1.6 1-1.9 1.9L12 21.4l-1.9-5.6c-.3-.9-1-1.6-1.9-1.9L2.6 12l5.6-1.9c.9-.3 1.6-1 1.9-1.9L12 2z"/>
              </svg>
            </div>
            <div id="searchResults"></div>
          </div>
        </div>
        <div id="scroll-hint" aria-hidden="true">
          <span>Browse the albums</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 16.5l-6-6 1.4-1.4 4.6 4.6 4.6-4.6L18 10.5z"/></svg>
        </div>
      </section>

      <section id="album-section">
    <div class="disco">
        <!-- SEO: AÃ±adido itemscope y itemtype para definir esta secciÃ³n como un Ãlbum de MÃºsica -->
        <div class="portada img-difuminada" itemscope itemtype="https://schema.org/MusicAlbum">
          <div itemprop="byArtist" itemscope itemtype="https://schema.org/Person">
            <meta itemprop="name" content="Josico Vila" />
          </div>
          <!-- Portada del primer disco: la sección ya es visible al cargar. -->
          <img itemprop="image" src="musica/DISCOS/<?= $disco[0]['imagen'] ?>" alt="<?= htmlspecialchars($disco[0]['nombre']) ?>">
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
      </section>
    </main>

    <div class="sphereRanges" style="display: none; flex-direction: column; align-items: center;gap: 20px; right: 20px; top: 20px; position: absolute; z-index:5000;">
         <div style="display:flex; gap:20px;"><label>Radius</label><input id="radius" type="range" min="10" max="140" value="20" /></div>
         <div style="display:flex; gap:20px;"><label>Deform</label><input id="deform" type="range" min="0" max="40" value="10" /></div>
    </div>

    <div id="container-track-time">
      <div class="time">
        <div class="player-now">
          <img id="player-cover" alt="" src="musica/DISCOS/<?= $disco[0]['imagen'] ?>">
          <div class="player-meta">
            <span id="player-title"><?= htmlspecialchars($disco[0]['canciones'][0]['nombre']) ?></span>
            <span class="player-artist">Josico Vila</span>
          </div>
        </div>

        <div class="player-controls">
          <button type="button" id="btn-shuffle" class="player-btn" aria-label="Shuffle" aria-pressed="false">
            <svg viewBox="0 0 24 24"><path d="M17 3l4 4-4 4V8h-2.2l-2.1 3-1.2-1.7L13.6 6H17V3zM3 6h4.6l6.2 9H17v-3l4 4-4 4v-3h-3.6L7.2 8H3V6zm0 10h4.2l1.7-2.4L10.1 15l-2.2 3H3v-2z"/></svg>
          </button>
          <button type="button" id="btn-prev" class="player-btn" aria-label="Previous track">
            <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/></svg>
          </button>
          <button type="button" id="btn-play" class="player-btn player-btn-main" aria-label="Play">
            <svg id="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg id="icon-pause" viewBox="0 0 24 24" style="display:none"><path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z"/></svg>
          </button>
          <button type="button" id="btn-next" class="player-btn" aria-label="Next track">
            <svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2V6zM6 6l8.5 6L6 18V6z"/></svg>
          </button>
          <button type="button" id="btn-repeat" class="player-btn" aria-label="Repeat" aria-pressed="false">
            <svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
          </button>
        </div>

        <div class="player-progress">
          <span class="track-time-current">0:00</span>
          <div id="container-slider">
            <div id="slider"></div>
            <div id="progress-tooltip"></div>
          </div>
          <span class="track-time-total">0:00</span>
        </div>

        <div class="player-volume">
          <button type="button" id="btn-mute" class="player-btn" aria-label="Mute">
            <svg id="icon-volume" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a6.8 6.8 0 0 1 0 13.4v2.1a8.9 8.9 0 0 0 0-17.6z"/></svg>
            <svg id="icon-muted" viewBox="0 0 24 24" style="display:none"><path d="M3 9v6h4l5 5V4L7 9H3zm18.5-1.1L20.1 6.5 17.6 9l-2.5-2.5-1.4 1.4L16.2 10.4l-2.5 2.5 1.4 1.4 2.5-2.5 2.5 2.5 1.4-1.4-2.5-2.5 2.5-2.5z"/></svg>
          </button>
          <input type="range" id="volume-slider" min="0" max="100" value="100" aria-label="Volume">
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

