<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">    
    <title>Josico Vila | Epic and Fantastic Instrumental Music</title>

    <!-- SEO: Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://josicovila.com/">
    <meta property="og:title" content="Josico Vila | Epic and Fantastic Instrumental Music" data-i18n-content="pageTitle">
    <meta property="og:description" content="Listen to all the instrumental music from Josico Vila. All the epic albums since 2018." data-i18n-content="pageDescription">
    <meta property="og:image" content="https://josicovila.com/img/social-share.png">

    <!-- SEO: Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://josicovila.com/">
    <meta property="twitter:title" content="Josico Vila | Epic and Fantastic Instrumental Music" data-i18n-content="pageTitle">
    <meta property="twitter:description" content="Listen to all the instrumental music from Josico Vila. All the epic albums since 2018." data-i18n-content="pageDescription">
    <meta property="twitter:image" content="https://josicovila.com/img/social-share.png">

    <meta name="description" content="Listen to all the instrumental music from Josico Vila. All the epic albums since 2018." data-i18n-content="pageDescription">
    <link rel="icon" type="image/png" href="img/tercero.png" />
    <link rel="preload" as="image" href="img/hero-desktop.webp" media="(min-width: 861px)">
    <link rel="preload" as="image" href="img/hero-mobile.webp" media="(max-width: 860px)">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/hero.css?v=<?= filemtime(__DIR__ . '/css/hero.css') ?>">
    <script type="importmap">
        {
          "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js",
            "app-3d": "./js/3D.module.js?v=<?= filemtime(__DIR__ . '/js/3D.module.js') ?>"
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
        <img id="firma" src="img/firma-blanca.png" alt="Josico Vila signature" data-i18n-alt="signatureAlt">
        <div id="busqueda">
            <div class="custom-select" id="miSelect" data-current-label="CURRENT ALBUM">
                <div class="selected">
                  <span data-i18n="selectAlbum">Select an album...</span>
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
              <!-- Cámara redibujada: cuerpo, saliente del visor y lente hueca
                   (fill-rule evenodd). La anterior costaba reconocerla. -->
              <svg id="camera" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill-rule="evenodd">
                <path d="M9.1 2.6h5.8l1.4 2.2H20a2.4 2.4 0 0 1 2.4 2.4v11A2.4 2.4 0 0 1 20 20.6H4a2.4 2.4 0 0 1-2.4-2.4v-11A2.4 2.4 0 0 1 4 4.8h3.7l1.4-2.2zM12 8.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8zm0 1.9a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/>
              </svg>
            </div>
    </header>

    <main id="scroll-root">
      <section id="hero">
        <div id="hero-content">
          <h1 class="hero-title" data-i18n="heroTitle">Find the music you imagine.</h1>
          <p class="hero-subtitle" data-i18n="heroSubtitle">Explore my discography: search by title, name an instrument, or describe an idea.</p>
          <div id="searchContainer">
            <div id="searchField">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
                <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
              </svg>
              <!-- autocapitalize/autocorrect desactivados: los teclados de movil
                   capitalizan la primera letra y autocorrigen por su cuenta, y
                   eso hacia que la misma busqueda diera resultados distintos en
                   movil y en escritorio. -->
              <input type="text" id="songSearch" placeholder="epic with choir, music for dragons, soft medieval flute..." data-i18n-placeholder="searchPlaceholder" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="Search music by mood, scene or story" data-i18n-aria="searchAria">
              <!-- Rombo tallado, como una tachuela. Sustituye a la estrella de
                   destellos, demasiado parecida a la de Gemini. -->
              <svg class="gem-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.2 21.8 12 12 21.8 2.2 12z"/>
                <path class="gem-facet" d="M12 2.2 21.8 12H2.2z"/>
              </svg>
            </div>
            <div id="searchResults"></div>
          </div>
        </div>
        <div id="scroll-hint" aria-hidden="true">
          <span data-i18n="browseAlbums">Browse the albums</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 16.5l-6-6 1.4-1.4 4.6 4.6 4.6-4.6L18 10.5z"/></svg>
        </div>
      </section>

      <section id="album-section">
        <div class="albumes-cabecera">
          <h2 data-i18n="albumsTitle">The albums</h2>
          <p data-i18n="albumsIntro">Fifteen records. Pick one and it plays from the top.</p>
        </div>

        <?php
        /* Los quince discos se renderizan AQUÍ, en el servidor.
           Antes solo salía el primero y los demás llegaban por AJAX, así que
           para un buscador la página tenía un disco y diez temas. Ahora están
           los 115 con sus descripciones en el HTML; el acordeón sólo los pliega
           con CSS, y eso Google lo indexa igual. */
        foreach ($disco as $indice => $album):
            $abierto = $indice === 0;
            $panelId = 'album-panel-' . $indice;
        ?>
        <article class="album<?= $abierto ? ' is-open' : '' ?>"
                 itemscope itemtype="https://schema.org/MusicAlbum"
                 data-album="<?= htmlspecialchars($album['nombrejs']) ?>"
                 data-cover="<?= htmlspecialchars($album['imagen']) ?>"
                 data-title="<?= htmlspecialchars($album['nombre']) ?>"
                 data-description="<?= htmlspecialchars($album['texto']) ?>">
          <meta itemprop="byArtist" content="Josico Vila">

          <button type="button" class="album-head" aria-expanded="<?= $abierto ? 'true' : 'false' ?>" aria-controls="<?= $panelId ?>">
            <img class="album-cover" src="musica/DISCOS/<?= $album['imagen'] ?>" alt="<?= htmlspecialchars($album['nombre']) ?>" loading="lazy" itemprop="image">
            <span class="album-info">
              <span class="album-name" itemprop="name"><?= $album['nombre'] ?></span>
              <span class="album-text" itemprop="description"><?= strip_tags($album['texto']) ?></span>
              <span class="album-count"><span><?= count($album['canciones']) ?></span> <span data-i18n="tracks">tracks</span></span>
            </span>
            <span class="album-playing" aria-hidden="true" data-i18n="nowPlaying">Now playing</span>
            <svg class="album-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5l-6-6L7.4 8l4.6 4.6L16.6 8 18 9.5z"/></svg>
          </button>

          <div class="album-panel" id="<?= $panelId ?>">
            <ol class="album-tracks">
              <?php foreach ($album['canciones'] as $n => $cancion): ?>
              <li class="album-track"
                  itemprop="track" itemscope itemtype="https://schema.org/MusicRecording"
                  data-ruta="<?= htmlspecialchars($cancion['ruta']) ?>"
                  data-label="<?= htmlspecialchars($cancion['nombrejs']) ?>"
                  data-songnumber="<?= $n ?>">
                <span class="track-number"><?= $n + 1 ?></span>
                <span class="track-body">
                  <span class="track-name" itemprop="name"><?= $cancion['nombre'] ?></span>
                  <span class="track-text"><?= strip_tags($cancion['texto']) ?></span>
                </span>
                <span class="track-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </span>
                <meta itemprop="duration" content="PT0M0S">
              </li>
              <?php endforeach; ?>
            </ol>
          </div>
        </article>
        <?php endforeach; ?>

    <!-- Motor de reproducción por álbum. Oculto y vacío: lo rellena
         buscarCanciones() bajo demanda. Se deja fuera del HTML servido para no
         duplicar el contenido que ya está arriba en el acordeón. -->
    <div class="disco disco-motor" aria-hidden="true">
        <!-- Andamiaje minimo que espera el reproductor. Se rellena bajo
             demanda con ajax.buscarCanciones.php; se sirve vacio para no
             duplicar el contenido que ya esta en el acordeon de arriba. -->
        <div class="portada img-difuminada"><img alt=""></div>
        <div class="lista-disco">
          <span class="album-title"></span>
          <span class="album-description"></span>
        </div>
    </div>
      </section>
    </main>

    <!-- Controles de la esfera, sólo visibles en modo captura. La posición y la
         visibilidad se llevan desde hero.css: en línea ganaban a la hoja de
         estilos y caían justo encima del ojo. -->
    <div class="sphereRanges">
         <div class="sphere-range"><label for="radius" data-i18n="radius">Radius</label><input id="radius" type="range" min="10" max="140" value="20" /></div>
         <div class="sphere-range"><label for="deform" data-i18n="deform">Deform</label><input id="deform" type="range" min="0" max="40" value="10" /></div>
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
          <button type="button" id="btn-shuffle" class="player-btn" aria-label="Shuffle" data-i18n-aria="shuffle" aria-pressed="false">
            <svg viewBox="0 0 24 24"><path d="M17 3l4 4-4 4V8h-2.2l-2.1 3-1.2-1.7L13.6 6H17V3zM3 6h4.6l6.2 9H17v-3l4 4-4 4v-3h-3.6L7.2 8H3V6zm0 10h4.2l1.7-2.4L10.1 15l-2.2 3H3v-2z"/></svg>
          </button>
          <button type="button" id="btn-prev" class="player-btn" aria-label="Previous track" data-i18n-aria="previousTrack">
            <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/></svg>
          </button>
          <button type="button" id="btn-play" class="player-btn player-btn-main" aria-label="Play" data-i18n-aria="play">
            <svg id="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg id="icon-pause" viewBox="0 0 24 24" style="display:none"><path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z"/></svg>
          </button>
          <button type="button" id="btn-next" class="player-btn" aria-label="Next track" data-i18n-aria="nextTrack">
            <svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2V6zM6 6l8.5 6L6 18V6z"/></svg>
          </button>
          <button type="button" id="btn-repeat" class="player-btn" aria-label="Repeat" data-i18n-aria="repeat" aria-pressed="false">
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
          <button type="button" id="btn-mute" class="player-btn" aria-label="Mute" data-i18n-aria="mute">
            <svg id="icon-volume" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a6.8 6.8 0 0 1 0 13.4v2.1a8.9 8.9 0 0 0 0-17.6z"/></svg>
            <svg id="icon-muted" viewBox="0 0 24 24" style="display:none"><path d="M3 9v6h4l5 5V4L7 9H3zm18.5-1.1L20.1 6.5 17.6 9l-2.5-2.5-1.4 1.4L16.2 10.4l-2.5 2.5 1.4 1.4 2.5-2.5 2.5 2.5 1.4-1.4-2.5-2.5 2.5-2.5z"/></svg>
          </button>
          <input type="range" id="volume-slider" min="0" max="100" value="100" aria-label="Volume" data-i18n-aria="volume">
        </div>
      </div>
    </div>

    
    <div id="wrapper-glass-forms">
      <div id="container-glass-forms"></div>
      <div id="container-click-firma">
        <div id="click-firma" class="glass-form">
          <div id="texto-firma">            
            <!-- SEO: Usar h2 para el titular de la biografía -->
            <h2 data-i18n="aboutTitle">About the artist</h2>
            <h3>José "Josico" Vila Villa-Ceballos</h3>
            <span data-i18n="aboutParagraph1">A Spanish music composer who has learned on his own everything he knows about music.</span><br>
            <br>
            <span data-i18n="aboutParagraph2">He loves computers for all the potential they have. And he likes, apart from composing music on them, designing and programming his own web sites and attending to his social media.</span><br>
            <br>
            <span data-i18n="aboutParagraph3">He has written four books and thirteen short stories that can be read at josicovila.es (Spanish).</span><br>
            <div class="social-links-firma">
              <a href="https://www.facebook.com/JosicoVila78" target="_blank" rel="noopener noreferrer">Facebook</a>
              <a href="https://www.instagram.com/josicovila/" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://www.linkedin.com/in/josico-vila/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://www.youtube.com/@josicovila" target="_blank" rel="noopener noreferrer">YouTube</a>
            </div>
          </div>
          <!-- SEO: AÃ±adido atributo alt para describir la imagen -->
          <img id='imagen-firma' src="img/defrente.png" alt="Photo of Josico Vila" data-i18n-alt="artistPhotoAlt" />
        </div>
      </div>
    </div>
    <script type="module" src="js/js.js?v=<?= filemtime(__DIR__ . '/js/js.js') ?>"></script>

    <div id="cookieConsentBanner">
        <p><span data-i18n="cookieTextBefore">This website uses cookies to enhance your experience and for analytics purposes. By clicking 'Accept', you consent to the use of cookies. Read our</span> <a href="privacy-policy.html" target="_blank" data-i18n="privacyPolicy">Privacy Policy</a> <span data-i18n="cookieTextAfter">for more information.</span></p>
        <button id="acceptCookieConsent" data-i18n="acceptCookies">Accept</button>
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

