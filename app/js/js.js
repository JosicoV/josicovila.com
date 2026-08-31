import * as AUDIO3D from 'app-3d';

import { applyTranslations, text as uiText } from 'app-i18n';

applyTranslations();

function initMusicPlatforms() {
  const menu = document.querySelector('#music-platforms');
  const toggle = menu?.querySelector('.music-platforms-toggle');
  const panel = menu?.querySelector('.music-platforms-panel');
  if (!menu || !toggle || !panel) return;

  const setOpen = open => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    panel.toggleAttribute('inert', !open);
  };

  toggle.addEventListener('click', () => {
    setOpen(!menu.classList.contains('is-open'));
  });

  document.addEventListener('click', event => {
    if (!menu.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      setOpen(false);
      toggle.focus();
    }
  });

  panel.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });
}

initMusicPlatforms();

/**
 * Gestiona un tooltip global para las descripciones de las canciones.
 * Se crea un Ãºnico tooltip en el body y se mueve/actualiza dinÃ¡micamente.
 */
function initTooltips() {
  // 1. Crear el elemento tooltip una sola vez si no existe
  let tooltipEl = document.getElementById('song-tooltip-global');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'song-tooltip-global';
    tooltipEl.className = 'song-tooltip'; // Usamos la misma clase para los estilos
    document.body.appendChild(tooltipEl);
  }

  // 2. AÃ±adir listeners a todos los iconos de info
  document.querySelectorAll('.info-icon').forEach(icon => {
    const description = icon.dataset.description;

    // Evita aÃ±adir el mismo listener mÃºltiples veces
    if (icon.dataset.tooltipInitialized) return;
    icon.dataset.tooltipInitialized = 'true';

    icon.addEventListener('mouseenter', (e) => {
      if (!description) return;
      // Actualizar contenido y posiciÃ³n del tooltip
      tooltipEl.innerHTML = description;
      const iconRect = e.target.getBoundingClientRect();
      tooltipEl.style.left = `${iconRect.left + (iconRect.width / 2) + window.scrollX}px`;
      tooltipEl.style.top = `${iconRect.top + window.scrollY - 10}px`; // 10px de margen
      tooltipEl.style.visibility = 'visible';
      tooltipEl.style.opacity = '1';
    });

    icon.addEventListener('mouseleave', () => {
      // Ocultar tooltip
      tooltipEl.style.visibility = 'hidden';
      tooltipEl.style.opacity = '0';
    });
  });
}

let titleScrollInterval = null;
const originalTitle = document.title;

/**
 * Detiene la animaciÃ³n de scroll del tÃ­tulo y lo restaura.
 */
function stopTitleScroll() {
  if (titleScrollInterval) {
    clearInterval(titleScrollInterval);
    titleScrollInterval = null;
  }
  document.title = originalTitle;
}

/**
 * Inicia una animaciÃ³n de scroll en el tÃ­tulo de la ventana si el texto es largo.
 * @param {string} text - El texto a mostrar.
 */
function startTitleScroll(text) {
  stopTitleScroll(); // Detiene cualquier animaciÃ³n anterior
  document.title = text;

  // Solo animamos si el texto es largo
  if (text.length > 25) {
    let position = 0;
    const fullText = text + ' ... ';
    titleScrollInterval = setInterval(() => {
      document.title = fullText.substring(position) + fullText.substring(0, position);
      position++;
      if (position >= fullText.length) {
        position = 0;
      }
    }, 300); // Velocidad del scroll (en milisegundos)
  }
}

document.addEventListener('click', (e) => {
  if (document.querySelector('#container-click-firma').contains(e.target)) {
      document.querySelector('#wrapper-glass-forms').style.display = 'none';
  }
});

document.querySelector('#firma').addEventListener('click', () => {
  document.querySelector('#wrapper-glass-forms').style.display = 'block';
  formasGlassForm();
})
function formasGlassForm() {
  const container = document.getElementById('container-glass-forms');
  const W = container.clientWidth, H = container.clientHeight;
  const N = 20; // tantas formas como quieras

  // 1) Pedimos todos los colores de todos los discos
  fetch('includes/ajax.getAllColors.php')
    .then(res => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .then(({ colors: allColors }) => {
      // 2) Definimos las formas
      const forms = [
        el => el.style.borderRadius = '50%', // cÃ­rculo
        el => el.style.clipPath = 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)', // hex
        el => {
          el.style.width = '0'; el.style.height = '0';
          el.style.borderLeft  = '50px solid transparent';
          el.style.borderRight = '50px solid transparent';
          el.style.borderBottom= '100px solid';
        },
        el => el.style.clipPath = 'path("M60,0 C90,0 120,30 120,60 C120,90 90,120 60,120 C30,120 0,90 0,60 C0,30 30,0 60,0 Z")'
      ];

      // 3) Creamos N formas
      const items = [];
      for (let i = 0; i < N; i++) {
        const el = document.createElement('div');
        el.classList.add('glass-form');
        // tamaÃ±o aleatorio
        const size = 60 + Math.random() * 80;
        el.style.width  = size + 'px';
        el.style.height = size + 'px';

        // color aleatorio de allColors
        const col = allColors[Math.floor(Math.random() * allColors.length)];
        el.style.background = col;

        // forma aleatoria
        forms[Math.floor(Math.random() * forms.length)](el);

        // posiciÃ³n y velocidad inicial
        const x  = Math.random() * (W - size),
              y  = Math.random() * (H - size),
              vx = (Math.random() - 0.5) * 2,
              vy = (Math.random() - 0.5) * 2,
              vr = (Math.random() - 0.5) * 0.5;
        el.style.left = x + 'px';
        el.style.top  = y + 'px';

        container.appendChild(el);
        items.push({ el, x, y, vx, vy, r:0, vr });
      }

      // 4) Bucle de animaciÃ³n
      (function animate() {
        for (const o of items) {
          o.x += o.vx; o.y += o.vy; o.r += o.vr;
          const sz = o.el.clientWidth;
          // rebotes
          if (o.x < 0 || o.x + sz > W) o.vx *= -1;
          if (o.y < 0 || o.y + sz > H) o.vy *= -1;
          o.el.style.transform =
            `translate(${o.x}px,${o.y}px) rotate(${o.r}deg)`;
        }
        requestAnimationFrame(animate);
      })();

      // 5) Al redimensionar, ajustamos W,H y recortamos
      window.addEventListener('resize', () => {
        const w2 = container.clientWidth, h2 = container.clientHeight;
        items.forEach(o => {
          o.x = Math.min(o.x, w2 - o.el.clientWidth);
          o.y = Math.min(o.y, h2 - o.el.clientHeight);
        });
      });
    })
    .catch(err => console.error('Error cargando colores:', err));
}



document.querySelector('#firma').addEventListener('click', () => {
  document.querySelector('#container-click-firma').style.display = "flex";
})



const customSelect = document.getElementById('miSelect');
const selected = customSelect.querySelector('.selected');
const options = customSelect.querySelector('.options');
let slider = document.querySelector('#slider');
const results = document.getElementById('searchResults');
const input   = document.getElementById('songSearch');
let currentIndex = null;

/************************ TELEMETRÍA ***************************************
 * Señales anónimas de búsqueda y escucha para poder mejorar el ranking más
 * adelante. Nada de esto puede romper la web: todos los envíos fallan en
 * silencio y ninguna respuesta se espera.
 *
 * El identificador de sesión vive en sessionStorage: muere al cerrar la
 * pestaña, así que no es seguimiento persistente y no requiere consentimiento
 * de cookies. Si algún día se moviera a localStorage habría que añadirlo al
 * banner y a la política de privacidad.
 **************************************************************************/
const TELEMETRIA = (() => {
  const CLAVE_SESION = 'jv_anon_session';
  const SALTO_RAPIDO_SEGUNDOS = 8;

  let sesion = null;
  try {
    sesion = sessionStorage.getItem(CLAVE_SESION);
    if (!sesion) {
      // crypto.randomUUID no existe en navegadores antiguos ni fuera de HTTPS.
      sesion = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()) + Date.now())
        .replace(/-/g, '').slice(0, 32);
      sessionStorage.setItem(CLAVE_SESION, sesion);
    }
  } catch (e) {
    // Modo privado o almacenamiento bloqueado: se sigue sin sesión.
    sesion = null;
  }

  let busquedaActual = null;   // search_id de la última búsqueda
  let escucha = null;          // pista sonando y cuánto lleva

  function enviar(evento) {
    if (!busquedaActual) return;   // sin búsqueda asociada no hay nada que anotar
    try {
      fetch('includes/ajax.telemetry.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...evento, search_id: busquedaActual, anon_session_id: sesion || undefined }),
        keepalive: true,   // sobrevive a que el usuario cierre la pestaña
      }).catch(() => {});
    } catch (e) { /* la telemetría nunca interrumpe */ }
  }

  return {
    get sesion() { return sesion; },

    /** Hay telemetría si el servicio devolvió un search_id al que referirse. */
    get activa() { return Boolean(busquedaActual); },

    busquedaNueva(searchId) {
      cerrarEscucha();
      busquedaActual = searchId || null;
    },

    clic(trackId, rank) {
      enviar({ event_type: 'result_clicked', track_id: trackId, rank });
    },

    feedback(trackId, rank, voto) {
      enviar({ event_type: voto === 'match' ? 'feedback_match' : 'feedback_no_match', track_id: trackId, rank });
    },

    /** Empieza a contar una escucha. Si es la misma pista otra vez, es repetición. */
    empiezaEscucha(trackId, rank) {
      const repetida = escucha && escucha.trackId === trackId;
      cerrarEscucha();
      escucha = { trackId, rank, desde: Date.now(), acumulado: 0 };
      enviar({ event_type: repetida ? 'replay' : 'play_started', track_id: trackId, rank });
    },

    /**
     * Pausar ES dejar de escuchar, así que el resumen se escribe ya.
     * Antes sólo se acumulaba en memoria y se volcaba al cambiar de búsqueda o
     * al cerrar la pestaña: quien pausaba y se marchaba perdía el dato, que es
     * justo el más informativo (cuánto aguantó antes de parar).
     * Si luego reanuda se emitirá otro resumen; al consolidar gana el mayor,
     * así que duplicar no falsea nada.
     */
    pausa() { emitirResumen(); },
    reanuda() { if (escucha) escucha.desde = Date.now(); },

    completa(duracion) {
      if (!escucha) return;
      acumular();
      enviar({
        event_type: 'play_completed',
        track_id: escucha.trackId,
        rank: escucha.rank,
        seconds_listened: escucha.acumulado,
        track_duration: duracion || 0,
        completed: true,
      });
      escucha = null;
    },

    cierra: cerrarEscucha,
  };

  function acumular() {
    if (!escucha || !escucha.desde) return;
    escucha.acumulado += (Date.now() - escucha.desde) / 1000;
    escucha.desde = null;
  }

  /**
   * Emite el resumen de lo escuchado hasta ahora. Un evento por parada, no uno
   * por segundo: el disco no debe llenarse de ruido.
   */
  function emitirResumen() {
    if (!escucha) return;
    acumular();
    const segundos = Math.round(escucha.acumulado * 10) / 10;
    if (segundos <= 0.5) return;
    enviar({
      // Un salto muy temprano es señal negativa débil, nunca un "no" explícito:
      // puede ser que el usuario ya conociera la canción.
      event_type: segundos < SALTO_RAPIDO_SEGUNDOS ? 'quick_skip' : 'play_summary',
      track_id: escucha.trackId,
      rank: escucha.rank,
      seconds_listened: segundos,
      track_duration: AUDIO3D.audioElB.duration || 0,
      completed: false,
    });
  }

  /** Cierra definitivamente la escucha en curso. */
  function cerrarEscucha() {
    if (!escucha) return;
    emitirResumen();
    escucha = null;
  }
})();

// Al cerrar la pestaña se cierra la escucha en curso, si da tiempo.
window.addEventListener('pagehide', () => TELEMETRIA.cierra());

const tiempoActualSpan = document.querySelector('.track-time-current');
const tiempoTotalSpan  = document.querySelector('.track-time-total');

/** Refresca los dos contadores y el ancho de la barra de progreso. */
function actualizarTiempos() {
  const audio = AUDIO3D.audioElB;
  if (tiempoActualSpan) tiempoActualSpan.textContent = formatTime(audio.currentTime);
  if (tiempoTotalSpan)  tiempoTotalSpan.textContent  = formatTime(audio.duration);
  if (slider && audio.duration) {
    slider.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
  }
}

selected.addEventListener('click', () => {
  options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
});

// Iniciar colores del primer disco.
const firstAlbumLabel = document.querySelector('.options .option').dataset.label;
conseguirColores(firstAlbumLabel);

// El disco vive ahora en su propia sección bajo el hero, así que se muestra
// desde el principio: quien baja espera encontrar algo.
document.querySelector('.portada').style.opacity = 1;
document.querySelector('.lista-disco').style.opacity = 1;

function seleccionarDisco(option) {
  options.style.display = 'none';
  const album = Array.from(document.querySelectorAll('.album'))
    .find(item => item.dataset.album === option.dataset.label);
  if (!album) return;

  const temas = Array.from(album.querySelectorAll('.album-track'));
  cargarAlbumEnElHero(album, temas, 0);
}

customSelect.querySelectorAll('.option').forEach(option => {
  option.addEventListener('click', () => seleccionarDisco(option));
});

// Cerrar si haces clic fuera
document.addEventListener('click', (e) => {
if (!customSelect.contains(e.target)) {
    options.style.display = 'none';
}
});

function buscarCanciones(label, songnumber=null) {
    
    const data = new FormData();
    data.append('label', label);
      
    fetch('includes/ajax.buscarCanciones.php', {
        method: 'POST',
        body: data
    })
    .then(res => {
        if (!res.ok) throw new Error('Error AJAX: ' + res.statusText);
        return res.text(); // convertimos a texto
    })
    .then(respuesta => {
        //let listaCanciones = document.querySelector('.disco .lista-disco');
        /*
        const viejo = listaCanciones;
        // clonamos la estructura (con hijos) pero **sin** listeners ni datos extra
        const nuevo = viejo.cloneNode(true);
        // reemplazamos viejo por nuevo
        viejo.parentNode.replaceChild(nuevo, viejo);
        */
        const listaDisco = document.querySelector('.disco .lista-disco');
        const albumTitleElement = listaDisco.querySelector('.album-title'); // Guardamos el H1
        const albumDescElement = listaDisco.querySelector('.album-description'); // Guardamos la descripciÃ³n
        listaDisco.dataset.album = label;
        listaDisco.innerHTML = respuesta; // Insertamos las nuevas canciones
        listaDisco.prepend(albumTitleElement); // Volvemos a colocar el H1 al principio
        albumTitleElement.after(albumDescElement); // Volvemos a colocar la descripciÃ³n despuÃ©s del H1
        //Cambiar el boton de play a pause
        /*
        let playBtn = document.querySelector('.disco .lista-disco .cancion .play-button');
        playBtn.classList.remove('play-button');
        playBtn.classList.add('pause-button');
        */
        if(songnumber == 0) currentIndex = null;
        playByIndex(songnumber);
        
        
        
        // Re-inicializamos los listeners para los tooltips de las nuevas canciones
        initTooltips();
        //let label2d = document.querySelector('.disco .lista-disco .cancion').dataset.label;
        //AUDIO3D.initCanvas2D(document.querySelector('.canvas-'+ label2d ));
    }).catch(err => {
        console.error(err);
    });
}

function conseguirColores(label) {
    const data = new FormData();
    data.append('label', label);
      
    fetch('includes/ajax.buscarColores.php', {
        method: 'POST',
        body: data
    })
    .then(res => {
        if (!res.ok) throw new Error('Error AJAX: ' + res.statusText);
        return res.text(); // convertimos a texto
    })
    .then(respuesta => {
        let colores = respuesta.split('-');
        
        // Fondo lista de canciones
        let listaCanciones = document.querySelector('.disco .lista-disco');
        listaCanciones.style.background = "linear-gradient(45deg, "+colores[3]+", "+colores[4]+", "+colores[5]+")";
        // TÃ­tulos de canciones, timeout para ver si no se quedan en blanco de vez en cuando
        setTimeout(() => {     
          document.querySelectorAll('.titulo-cancion span').forEach(tituloSpan => {
              tituloSpan.style.backgroundImage = "linear-gradient(135deg, "+colores[0]+", "+colores[1]+", "+colores[2]+")";
          });
        },1000);
        // Esfera
        AUDIO3D.aplicarGradienteTresColores(colores[0], colores[1], colores[2]);

        //CancionRange
        slider.style.background = 'linear-gradient(to right, '+colores[0]+' 0%, '+colores[1]+' 50%, '+colores[2]+' 100%)';

        //Barras 2D
        AUDIO3D.aplicarTresColores2D(colores[0], colores[1], colores[2])
        
        

    }).catch(err => {
        console.error(err);
    });
}





function playByIndex(idx) {
  const tracks = Array.from(
    document.querySelectorAll('.disco .lista-disco .cancion')
  );
  if (!tracks[idx]) return;
  ;
  // pausa y limpia pista anterior
  if (currentIndex !== null) {
    stopTitleScroll(); // Detiene la animaciÃ³n del tÃ­tulo de la canciÃ³n anterior
  }

  AUDIO3D.audioElB.pause();
  const prevIdx = currentIndex;
  if (prevIdx !== null && tracks[prevIdx] != undefined) {
    const prevBtn = tracks[prevIdx].querySelector('.pause-button');
    if (prevBtn) prevBtn.classList.replace('pause-button','play-button');
  }

  // carga la nueva
  const track = tracks[idx];
  const songName = track.querySelector('.titulo-cancion span').textContent;
  const albumName = document.querySelector('.album-title').textContent;
  const albumCode = document.querySelector('.disco .lista-disco').dataset.album;

  marcarTemaEnAcordeon(albumCode, idx);
  
  // Inicia la animaciÃ³n del tÃ­tulo con la nueva canciÃ³n
  startTitleScroll(`▶ ${songName} - ${albumName}`);

  AUDIO3D.setAudio(`musica/${track.dataset.ruta}`);
  
  //canvas 2d y 3d
  AUDIO3D.initCanvas2D(document.querySelector('.canvas-'+track.dataset.label));

  // actualiza botÃ³n y currentIndex
  const btn = track.querySelector('.play-button');
  if (btn) btn.classList.replace('play-button','pause-button');
  currentIndex = idx;

  // Refleja la pista en la barra inferior
  const portadaActual = document.querySelector('.portada img');
  const playerCover = document.querySelector('#player-cover');
  const playerTitle = document.querySelector('#player-title');
  if (playerTitle) playerTitle.textContent = songName;
  if (playerCover && portadaActual && portadaActual.src) playerCover.src = portadaActual.src;
  marcarReproduciendo(true);
}

// Formatea segundos a mm:ss
function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2,'0');
  return `${m}:${s}`;
}
// Formatea segundos a formato ISO 8601 (ej: PT4M33S) para Schema.org
function formatDurationISO(sec) {
  if (isNaN(sec)) return 'PT0M0S';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `PT${m}M${s}S`;
}


function initReproductor() {
  const tracks = Array.from(
    document.querySelectorAll('.disco .lista-disco .cancion')
  );

  // Actualiza los contadores de tiempo y la barra
  AUDIO3D.audioElB.addEventListener('timeupdate', actualizarTiempos);
  AUDIO3D.audioElB.addEventListener('loadedmetadata', () => {
    actualizarTiempos();

    // SEO: Actualizar la duraciÃ³n en los datos estructurados
    const currentTrackEl = document.querySelector(`.cancion.active`);
    if (currentTrackEl) {
      const metaDuration = currentTrackEl.querySelector('meta[itemprop="duration"]');
      if (metaDuration) metaDuration.content = formatDurationISO(AUDIO3D.audioElB.duration);
    }
  });
  
   

  const lista = document.querySelector('.disco .lista-disco');
  // evita mÃºltiples bindings
  if (lista._reproductorInit) return;
  lista._reproductorInit = true;

  // click en play/pause
  lista.addEventListener('click', e => {
    const btn = e.target.closest('.play-button, .pause-button');
    if (!btn) return;
    const trackEl = btn.parentElement;
    // FIX: Calculamos el Ã­ndice basado solo en los elementos .cancion, no en todos los hijos.
    const allSongs = Array.from(lista.querySelectorAll('.cancion'));
    const idx = allSongs.indexOf(trackEl);

    if (btn.classList.contains('play-button')) {
      // Pulsar una canción de la lista del disco también sale de la cola.
      salirDeLaColaDeResultados();
      playByIndex(idx);
    } else {
      AUDIO3D.audioElB.pause();
      stopTitleScroll(); // Detiene la animaciÃ³n del tÃ­tulo al pausar
      btn.classList.replace('pause-button','play-button');
      currentIndex = null;
    }
  });

  
}


initReproductor();



/************************ CONTROLES DE LA BARRA INFERIOR *******************/

const btnPlay    = document.querySelector('#btn-play');
const btnPrev    = document.querySelector('#btn-prev');
const btnNext    = document.querySelector('#btn-next');
const btnShuffle = document.querySelector('#btn-shuffle');
const btnRepeat  = document.querySelector('#btn-repeat');
const btnMute    = document.querySelector('#btn-mute');
const volumeSlider = document.querySelector('#volume-slider');

let aleatorio = false;
let repetir   = false;

/** Alterna los iconos play/pausa de la barra. */
function marcarReproduciendo(sonando) {
  const iconoPlay  = document.querySelector('#icon-play');
  const iconoPausa = document.querySelector('#icon-pause');
  if (!iconoPlay || !iconoPausa) return;
  iconoPlay.style.display  = sonando ? 'none' : '';
  iconoPausa.style.display = sonando ? '' : 'none';
  if (btnPlay) {
    btnPlay.setAttribute('aria-label', sonando ? uiText('pause', 'Pause') : uiText('play', 'Play'));
  }
}

function pistasActuales() {
  return Array.from(document.querySelectorAll('.disco .lista-disco .cancion'));
}

/** Siguiente índice según aleatorio/repetir. Devuelve null si toca cambiar de disco. */
function siguienteIndice(total) {
  if (repetir) return currentIndex;
  if (aleatorio) {
    if (total < 2) return currentIndex;
    let candidato = currentIndex;
    // Evita repetir la misma pista dos veces seguidas.
    while (candidato === currentIndex) candidato = Math.floor(Math.random() * total);
    return candidato;
  }
  return currentIndex + 1 < total ? currentIndex + 1 : null;
}

if (btnPlay) btnPlay.addEventListener('click', () => {
  const audio = AUDIO3D.audioElB;
  if (!audio.src) {
    // El motor se sirve vacío para no duplicar el catálogo en el HTML. En el
    // primer Play cargamos el primer disco por la misma ruta que el selector.
    if (pistasActuales().length) {
      playByIndex(0);
    } else {
      const primerDisco = customSelect.querySelector('.option');
      if (primerDisco) seleccionarDisco(primerDisco);
    }
    return;
  }
  if (audio.paused) {
    audio.play().catch(err => console.warn('No se pudo reproducir:', err));
    marcarReproduciendo(true);
  } else {
    audio.pause();
    marcarReproduciendo(false);
  }
});

if (btnPrev) btnPrev.addEventListener('click', () => {
  const audio = AUDIO3D.audioElB;
  // Convención habitual: si ya han sonado 3 s, "anterior" reinicia la pista.
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (colaResultados) return void reproducirDeLaCola(colaResultados.indice - 1);
  if (currentIndex === null) return;
  if (currentIndex > 0) playByIndex(currentIndex - 1);
  else audio.currentTime = 0;
});

if (btnNext) btnNext.addEventListener('click', () => {
  if (colaResultados) return void reproducirDeLaCola(colaResultados.indice + 1);
  const total = pistasActuales().length;
  if (currentIndex === null || !total) return;
  const siguiente = aleatorio ? siguienteIndice(total) : currentIndex + 1;
  if (siguiente !== null && siguiente < total) playByIndex(siguiente);
  else buscarSiguienteDisco(document.querySelector('.selected span').textContent);
});

if (btnShuffle) btnShuffle.addEventListener('click', () => {
  aleatorio = !aleatorio;
  btnShuffle.setAttribute('aria-pressed', String(aleatorio));
});

if (btnRepeat) btnRepeat.addEventListener('click', () => {
  repetir = !repetir;
  btnRepeat.setAttribute('aria-pressed', String(repetir));
});

if (volumeSlider) volumeSlider.addEventListener('input', () => {
  const valor = Number(volumeSlider.value) / 100;
  AUDIO3D.audioElB.volume = valor;
  AUDIO3D.audioElB.muted = valor === 0;
  marcarSilencio(AUDIO3D.audioElB.muted);
});

function marcarSilencio(silenciado) {
  const iconoVol   = document.querySelector('#icon-volume');
  const iconoMudo  = document.querySelector('#icon-muted');
  if (!iconoVol || !iconoMudo) return;
  iconoVol.style.display  = silenciado ? 'none' : '';
  iconoMudo.style.display = silenciado ? '' : 'none';
}

if (btnMute) btnMute.addEventListener('click', () => {
  const audio = AUDIO3D.audioElB;
  audio.muted = !audio.muted;
  marcarSilencio(audio.muted);
  if (volumeSlider) volumeSlider.value = audio.muted ? 0 : Math.round(audio.volume * 100);
});

AUDIO3D.audioElB.addEventListener('play',  () => { marcarReproduciendo(true); TELEMETRIA.reanuda(); });
AUDIO3D.audioElB.addEventListener('pause', () => { marcarReproduciendo(false); TELEMETRIA.pausa(); });

// Esto se ejecuta UNA sola vez
AUDIO3D.audioElB.addEventListener('ended', () => {
  TELEMETRIA.completa(AUDIO3D.audioElB.duration);

  // Si venimos de una búsqueda, la cola es la lista de resultados y da la
  // vuelta al llegar al final; no se salta al disco de la última canción.
  if (colaResultados) {
    const total = colaResultados.elementos.length;
    if (repetir) return reproducirDeLaCola(colaResultados.indice);
    const siguiente = aleatorio && total > 1
      ? (colaResultados.indice + 1 + Math.floor(Math.random() * (total - 1))) % total
      : colaResultados.indice + 1;
    reproducirDeLaCola(siguiente);
    return;
  }

  const tracks = pistasActuales();
  const siguiente = siguienteIndice(tracks.length);

  if (siguiente !== null) {
    playByIndex(siguiente);
  } else {
    const tituloDisco = document.querySelector('.selected span').textContent;
    buscarSiguienteDisco(tituloDisco)
      //.then(() => {
        // tras inyectar la nueva lista y resetear currentIndex a null:
        playByIndex(0);
      //});
  }
});



function changeAlbumAnimation() {
    let listaCanciones = document.querySelector('.disco .lista-disco');
    listaCanciones.classList.add('change-album');
    setTimeout(() => {
        listaCanciones.classList.remove('change-album');
    }, 3100);
    let caratula = document.querySelector('.disco .img-difuminada');
    caratula.classList.add('change-album2');
    setTimeout(() => {
        caratula.classList.remove('change-album2');
    }, 3100);
}

function buscarSiguienteDisco(nombreDisco) { //nombre del disco
  const data = new FormData();
  data.append('label', nombreDisco);
    
  fetch('includes/ajax.buscarSiguienteDisco.php', {
      method: 'POST',
      body: data
  })
  .then(res => {
      if (!res.ok) throw new Error('Error AJAX: ' + res.statusText);
      return res.text(); // convertimos a texto
  })
  .then(respuesta => {
      let datos = respuesta.split('=')
      changeAlbumAnimation();
      selected.innerHTML = `<img src="musica/DISCOS/${datos[1]}" alt=""> <span>${datos[2]}</span>`;
      //document.querySelector('.portada').style.backgroundImage = "url('musica/DISCOS/"+datos[1]+"')";
      document.querySelector('.portada img').src = "musica/DISCOS/"+datos[1];
      // SEO: Actualizamos el h1 visible con el nombre del siguiente disco.
      document.querySelector('.album-title').textContent = datos[2];
      // Actualizamos la descripciÃ³n del Ã¡lbum
      document.querySelector('.album-description').innerHTML = datos[3];
      buscarCanciones(datos[0], 0);
      conseguirColores(datos[0]);
      currentIndex = null;
  }).catch(err => {
      console.error(err);
  });
}

/************************ COLA DE REPRODUCCIÓN *****************************
 * Al buscar, lo que suena es la LISTA DE RESULTADOS, en orden y en bucle.
 * Antes se reproducía el resultado elegido y al terminar seguía por el disco
 * al que pertenecía, que puede no tener nada que ver con lo buscado.
 *
 * Se vuelve al modo disco al elegir un álbum o al pulsar una canción de la
 * lista del disco.
 **************************************************************************/
let colaResultados = null;   // { elementos: [...], indice: n }

function salirDeLaColaDeResultados() {
  colaResultados = null;
}

/** Reproduce el resultado que ocupa `indice` en la cola, con vuelta al inicio. */
function reproducirDeLaCola(indice) {
  if (!colaResultados || !colaResultados.elementos.length) return false;
  const total = colaResultados.elementos.length;
  const destino = ((indice % total) + total) % total;   // envuelve por los dos lados
  playSongResult(colaResultados.elementos[destino], { porEleccion: false });
  return true;
}

/** Mantiene sincronizado el indicador "SONANDO" del acordeón. */
function marcarTemaEnAcordeon(albumCode, songNumber) {
  const albums = Array.from(document.querySelectorAll('.album'));
  const activeAlbum = albums.find(album => album.dataset.album === albumCode) || null;

  albums.forEach(album => album.classList.toggle('is-playing', album === activeAlbum));
  document.querySelectorAll('.album-track').forEach(track => track.classList.remove('is-playing'));

  if (!activeAlbum) return;

  const activeTrack = Array.from(activeAlbum.querySelectorAll('.album-track'))
    .find(track => Number(track.dataset.songnumber) === Number(songNumber));
  if (activeTrack) activeTrack.classList.add('is-playing');
}

/**
 * @param {boolean} opciones.porEleccion  false cuando la cola avanza sola. Un
 *   avance automático no es un clic del usuario y no debe registrarse como tal.
 */
function playSongResult(result, { porEleccion = true } = {}) {
  // La cola pasa a ser la lista de resultados visible, empezando por el elegido.
  const filas = Array.from(results.querySelectorAll('.result'));
  const posicion = filas.indexOf(result);
  if (posicion !== -1) colaResultados = { elementos: filas, indice: posicion };

  if (result.dataset.trackid) {
    const rank = Number(result.dataset.rank) || null;
    // Clic en un resultado: señal positiva débil, sólo si lo eligió el usuario.
    if (porEleccion) TELEMETRIA.clic(result.dataset.trackid, rank);
    TELEMETRIA.empiezaEscucha(result.dataset.trackid, rank);
  }

  const songnumber = parseInt(result.dataset.songnumber);
  const albumlabel = result.dataset.albumlabel;
  const albumcover = result.dataset.cover;
  const albumname  = result.dataset.albumname;

  //Cambio de disco
  document.querySelector('.portada').style.opacity = 1;
  document.querySelector('.lista-disco').style.opacity = 1;
  changeAlbumAnimation();
  selected.innerHTML = `<img src="musica/DISCOS/${albumcover}" alt=""> <span>${albumname}</span>`;
  //document.querySelector('.portada').style.backgroundImage = "url('musica/DISCOS/"+albumcover+"')";
  document.querySelector('.portada img').src="musica/DISCOS/"+albumcover;
  // SEO: Actualizamos el h1 visible con el nombre del Ã¡lbum desde los resultados de bÃºsqueda.
  document.querySelector('.album-title').textContent = albumname;
  // Actualizamos la descripciÃ³n del Ã¡lbum
  const albumdescription = result.dataset.albumdescription ? decodeURIComponent(result.dataset.albumdescription) : "";
  document.querySelector('.album-description').innerHTML = albumdescription;
  buscarCanciones(albumlabel, songnumber);
  conseguirColores(albumlabel);

  // La lista se queda abierta a propósito. Antes se cerraba al elegir, pero
  // entonces el feedback ("¿Encaja?") desaparecía justo cuando el usuario podía
  // opinar: hay que escuchar la canción para saber si acierta. Además permite
  // probar varios resultados de la misma búsqueda sin volver a escribir.
  results.querySelectorAll('.result').forEach(r => r.classList.remove('is-playing'));
  result.classList.add('is-playing');

  tooltip.style.visibility = 'hidden';

  // No se baja al álbum a propósito: la esfera reacciona al audio y es lo que
  // el usuario quiere ver al empezar a sonar. La lista queda ya actualizada
  // ahí abajo para quien busque la ficha completa.
}

//OJO Y CÃMARA CANVAS 3D

function ojo(){
  const ojocerradopath = '<path d="M320 400c-97 0-185.16-56.16-233.6-144a263.03 263.03 0 0 1 61.66-76.62L55.69 89.18a16 16 0 0 1 22.63-22.63l572 572a16 16 0 0 1-22.63 22.63L454.47 379.16A263.03 263.03 0 0 1 320 400zm0-288c97 0 185.16 56.16 233.6 144a263.03 263.03 0 0 1-61.66 76.62L584.31 422.82a16 16 0 0 1-22.63 22.63l-572-572a16 16 0 1 1 22.63-22.63l95.17 95.17A263.03 263.03 0 0 1 320 112z"/>';
  const ojoabiertopath = '<path d="M572.52 241.4C518.6 135.5 407.6 64 288 64S57.4 135.5 3.48 241.4a48.11 48.11 0 0 0 0 29.2C57.4 376.5 168.4 448 288 448s230.6-71.5 284.52-177.4a48.11 48.11 0 0 0 0-29.2zM288 400c-97 0-185.16-56.16-233.6-144C102.84 168.16 191 112 288 112s185.16 56.16 233.6 144C473.16 343.84 385 400 288 400zm0-272a128 128 0 1 0 128 128 128.15 128.15 0 0 0-128-128zm0 208a80 80 0 1 1 80-80 80.09 80.09 0 0 1-80 80z"/>';

  /**
   * Modo captura: la pantalla debe enseñar EXACTAMENTE lo que saldrá en el PNG
   * —fondo, esfera tal como está en ese momento y logo— y nada más.
   *
   * Se hace con una clase en <body> en vez de apagar elementos uno a uno: así
   * no se queda nada visible por olvido, que era lo que pasaba con el titular,
   * la lista de resultados y la sección de discos.
   */
  let abierto = true;
  document.querySelector('#ojo').addEventListener('click', () => {
    abierto = !abierto;
    document.querySelector('#ojo').innerHTML = abierto ? ojoabiertopath : ojocerradopath;
    document.body.classList.toggle('modo-captura', !abierto);
    if (!abierto) window.scrollTo({ top: 0, behavior: 'auto' });
  });
}
ojo();

document.querySelector('#camera').addEventListener('click', AUDIO3D.descargarCanvas);

const containerSlider = document.querySelector('#container-slider');
const bar = document.querySelector('#slider');

containerSlider.addEventListener('click', e => {
  const rect = containerSlider.getBoundingClientRect();
  // posiciÃ³n X del click dentro de la caja
  const x = e.clientX - rect.left;
  const pct = x / rect.width;
  // Salta al porcentaje de la duraciÃ³n
  AUDIO3D.audioElB.currentTime = pct * AUDIO3D.audioElB.duration;
  // Opcional: actualizar inmediatamente la barra
  bar.style.width = (pct * 100) + '%';

});

//progress tooltip
  const tooltip = document.querySelector('#progress-tooltip');
   // mostrar y mover tooltip en mousemove
   containerSlider.addEventListener('mousemove', e => {
    const rect = containerSlider.getBoundingClientRect();
    const x    = (e.clientX - rect.left);
    const pct  = Math.min(Math.max(x / rect.width, 0), 1);
    const time = pct * (AUDIO3D.audioElB.duration || 0);
    // posicionar tooltip
    tooltip.style.left = `${x}px`;
    tooltip.textContent = formatTime(time);
    tooltip.style.visibility = 'visible';
  });

  // ocultar tooltip al salir
containerSlider.addEventListener('mouseleave', () => {
  tooltip.style.visibility = 'hidden';
});

 /************************ BÚSQUEDA EN LENGUAJE NATURAL *********************
  * Consulta el servicio semántico a través del proxy PHP. Si el servicio no
  * está disponible, cae a la búsqueda literal por título de siempre, para que
  * el buscador nunca se quede muerto.
  **************************************************************************/
 (function(){
  let timer;
  let peticionEnCurso = 0;
  const hero = document.querySelector('#hero');
  const header = document.querySelector('header');
  const searchField = document.querySelector('#searchField');

  function actualizarPosicionBusqueda() {
    if (!hero?.classList.contains('busqueda-activa') || !header || !searchField) return;
    const desplazamientoActual = Number.parseFloat(hero.style.getPropertyValue('--search-shift')) || 0;
    const posicionSinDesplazar = searchField.getBoundingClientRect().top - desplazamientoActual;
    const margen = window.innerWidth <= 860 ? 16 : 18;
    const destino = header.getBoundingClientRect().bottom + margen;
    hero.style.setProperty('--search-shift', `${destino - posicionSinDesplazar}px`);
  }

  /** Abre o cierra el panel y activa su disposición elevada bajo la cabecera. */
  function mostrarPanel(visible) {
    results.style.display = visible ? 'flex' : 'none';
    if (!hero) return;

    hero.classList.toggle('con-resultados', visible);
    hero.classList.toggle('busqueda-activa', visible);
    if (visible) {
      requestAnimationFrame(actualizarPosicionBusqueda);
    } else {
      hero.style.removeProperty('--search-shift');
    }
  }

  window.addEventListener('resize', actualizarPosicionBusqueda);

  /** Motivos legibles devueltos por el vocabulario cerrado de la API. */
  const MOTIVOS_LITERALES = /title|album/i;
  const MOTIVOS_TRADUCIDOS = {
    'Exact title match': 'reasonExactTitle',
    'Title match': 'reasonTitle',
    'Partial title match': 'reasonPartialTitle',
    'Similar title': 'reasonSimilarTitle',
    'Album match': 'reasonAlbum',
    'Partial album match': 'reasonPartialAlbum',
    'Strong musical match': 'reasonStrongMusical',
    'Musical similarity': 'reasonMusicalSimilarity',
  };

  function etiquetasDeCoincidencia(motivos) {
    if (!Array.isArray(motivos)) return '';
    const utiles = motivos.filter(m => MOTIVOS_TRADUCIDOS[m]);
    if (!utiles.length) return '';
    return `<div class="reasons">${utiles
      .map(m => {
        const tipo = MOTIVOS_LITERALES.test(m) ? 'reason-literal' : 'reason-musical';
        return `<span class="reason ${tipo}">${uiText(MOTIVOS_TRADUCIDOS[m], m)}</span>`;
      })
      .join('')}</div>`;
  }

  /**
   * Botones de feedback explícito. Es la señal más valiosa que se recoge:
   * un juicio directo del usuario, no una inferencia sobre su comportamiento.
   * Opcionales por completo; la búsqueda funciona igual si nadie los pulsa.
   */
  function botonesDeFeedback(trackId, rank) {
    // Sin telemetría el voto no llegaría a ninguna parte: mejor no ofrecerlo
    // que mostrar unos botones que no hacen nada.
    if (!trackId || !TELEMETRIA.activa) return '';
    return `
      <div class="feedback" data-trackid="${trackId}" data-rank="${rank || ''}">
        <span class="feedback-q">${uiText('goodMatch', 'Good match?')}</span>
        <button type="button" class="feedback-btn" data-vote="match" aria-label="${uiText('yesMatchAria', 'Yes, this matches what I was looking for')}">${uiText('yes', 'Yes')}</button>
        <button type="button" class="feedback-btn" data-vote="no_match" aria-label="${uiText('noMatchAria', 'No, this does not match')}">${uiText('no', 'No')}</button>
      </div>`;
  }

  function pintarResultados(lista, nota) {
    // Resultados nuevos: la cola anterior apunta a filas que ya no existen.
    salirDeLaColaDeResultados();
    results.classList.remove('cola-de-album');
    if (!lista.length) {
      results.innerHTML = `<div class="no-results">${uiText('noResults', 'No matching music found.')}</div>`;
      return;
    }
    const cabecera = nota
      ? `<div class="search-note">${uiText('searchedInEnglishAs', 'Searched in English as')} <em>${nota}</em></div>`
      : '';
    results.innerHTML = cabecera + lista.map(item => `
      <div class="result" data-albumlabel="${item.albumCode}" data-cover="${item.cover}" data-albumname="${item.albumName}" data-songnumber="${item.songnumber}" data-trackid="${item.trackId || ''}" data-rank="${item.rank || ''}" data-albumdescription="${encodeURIComponent(item.albumDescription || "")}">
        <img src="musica/DISCOS/${item.cover}" alt="${item.albumName}">
        <div class="info">
          <div class="song">${item.songName}</div>
          <div class="meta">${item.albumName}</div>
        </div>
        ${etiquetasDeCoincidencia(item.matchReasons)}
        ${botonesDeFeedback(item.trackId, item.rank)}
      </div>
    `).join('');

    results.querySelectorAll('.result').forEach(result => {
      result.addEventListener('click', (e) => {
        // Los botones de feedback viven dentro de la fila: pulsarlos no debe
        // reproducir la canción.
        if (e.target.closest('.feedback')) return;
        const item = e.target.closest('.result');
        if (!item) return;
        playSongResult(item);
      });
    });

    results.querySelectorAll('.feedback-btn').forEach(boton => {
      boton.addEventListener('click', (e) => {
        e.stopPropagation();
        const caja = boton.closest('.feedback');
        const voto = boton.dataset.vote;
        TELEMETRIA.feedback(caja.dataset.trackid, Number(caja.dataset.rank) || null, voto);
        // Se puede cambiar de opinión: el histórico guarda ambos y al exportar
        // vale el último.
        caja.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('is-selected'));
        boton.classList.add('is-selected');
        caja.classList.add('has-vote');
      });
    });
  }

  /** Búsqueda literal de respaldo, la que existía antes del servicio. */
  function busquedaLiteral(q, token) {
    const form = new FormData();
    form.append('query', q);
    return fetch('includes/ajax.searchSongs.php', { method: 'POST', body: form })
      .then(res => res.ok ? res.json() : Promise.reject(new Error(res.statusText)))
      .then(data => {
        if (token !== peticionEnCurso) return;
        pintarResultados(data.slice(0, 8), null);
      });
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = '';
      mostrarPanel(false);
      salirDeLaColaDeResultados();
      return;
    }
    // espera tras la última letra: cada consulta cuesta una inferencia
    timer = setTimeout(() => {
      const token = ++peticionEnCurso;
      const form = new FormData();
      form.append('query', q);
      form.append('limit', '8');
      if (TELEMETRIA.sesion) form.append('session', TELEMETRIA.sesion);

      mostrarPanel(true);
      results.innerHTML = `<div class="no-results">${uiText('listening', 'Listening to your words...')}</div>`;

      fetch('includes/ajax.semanticSearch.php', { method: 'POST', body: form })
        .then(res => res.json().then(cuerpo => ({ ok: res.ok, cuerpo })))
        .then(({ ok, cuerpo }) => {
          // Una respuesta vieja no debe pisar a la última que escribió el usuario.
          if (token !== peticionEnCurso) return;
          if (!ok) throw new Error(cuerpo?.error?.code || 'search_failed');
          TELEMETRIA.busquedaNueva(cuerpo.searchId);
          const traducida = cuerpo.detectedLanguage === 'es' ? cuerpo.normalizedQuery : null;
          pintarResultados(cuerpo.results || [], traducida);
        })
        .catch(err => {
          if (token !== peticionEnCurso) return;
          console.warn('Búsqueda semántica no disponible, usando búsqueda literal:', err.message);
          busquedaLiteral(q, token).catch(() => {
            if (token !== peticionEnCurso) return;
            results.innerHTML = `<div class="no-results">${uiText('searchUnavailable', 'Search is unavailable right now.')}</div>`;
          });
        });
    }, 350);
  });
})();

/************************ ESFERA Y SCROLL **********************************
 * El canvas 3D es fijo y ocuparía también la sección de álbum. Se atenúa al
 * salir del hero para no competir con la lista de canciones.
 **************************************************************************/
(function(){
  const canvas3D = document.querySelector('body > canvas');
  const hero = document.querySelector('#hero');
  if (!canvas3D || !hero) return;

  canvas3D.style.transition = 'opacity 0.4s ease';
  let visible = true;

  const observador = new IntersectionObserver(([entrada]) => {
    const debeVerse = entrada.intersectionRatio > 0.35;
    if (debeVerse === visible) return;
    visible = debeVerse;
    canvas3D.style.opacity = debeVerse ? '1' : '0';
  }, { threshold: [0, 0.35, 1] });

  observador.observe(hero);
})();

initTooltips();





/************************ ACORDEÓN DE DISCOS *******************************
 * Los quince discos vienen renderizados del servidor; aquí sólo se pliegan.
 * Al elegir un tema, la lista del disco se convierte en la cola y sube al
 * hero: allí es donde la esfera reacciona y desde donde se salta entre temas.
 **************************************************************************/
(function(){
  const seccion = document.querySelector('#album-section');
  if (!seccion) return;

  seccion.querySelectorAll('.album-head').forEach(cabecera => {
    cabecera.addEventListener('click', () => {
      const album = cabecera.closest('.album');
      const abrir = !album.classList.contains('is-open');
      // Acordeón de uno en uno: con quince discos, varios abiertos son
      // kilómetros de scroll.
      seccion.querySelectorAll('.album').forEach(otro => {
        const activo = otro === album && abrir;
        otro.classList.toggle('is-open', activo);
        otro.querySelector('.album-head').setAttribute('aria-expanded', String(activo));
      });
    });
  });

  seccion.querySelectorAll('.album-track').forEach(tema => {
    tema.addEventListener('click', () => {
      const album = tema.closest('.album');
      const temas = [...album.querySelectorAll('.album-track')];
      cargarAlbumEnElHero(album, temas, temas.indexOf(tema));
    });
  });
})();

/**
 * Vuelca los temas de un disco en el panel del hero y reproduce el elegido.
 *
 * El panel deja de ser "resultados de búsqueda" para ser LA COLA: da igual que
 * venga de buscar o de un disco, porque funcionalmente es lo mismo, una lista
 * ordenada de la que se elige y que suena en bucle.
 */
function cargarAlbumEnElHero(album, temas, indice) {
  const cover = album.dataset.cover;
  const albumName = album.dataset.title;
  const albumCode = album.dataset.album;
  const descripcion = album.dataset.description || '';

  results.innerHTML =
    `<div class="search-note cola-origen">
       <img class="cola-portada" src="musica/DISCOS/${cover}" alt="">
       <span>${uiText('fromAlbum', 'From the album')} <em>${albumName}</em></span>
     </div>` +
    temas.map((t, n) => `
      <div class="result" data-albumlabel="${albumCode}" data-cover="${cover}" data-albumname="${albumName}"
           data-songnumber="${t.dataset.songnumber}" data-rank="${n + 1}"
           data-albumdescription="${encodeURIComponent(descripcion)}">
        <span class="cola-numero">${n + 1}</span>
        <div class="info">
          <div class="song">${t.querySelector('.track-name').textContent}</div>
          <div class="meta">${t.querySelector('.track-text').textContent}</div>
        </div>
      </div>`).join('');

  results.querySelectorAll('.result').forEach(fila => {
    fila.addEventListener('click', e => {
      const item = e.target.closest('.result');
      if (item) playSongResult(item);
    });
  });

  document.querySelector('#songSearch').value = '';
  results.classList.add('cola-de-album');
  results.style.display = 'flex';
  const hero = document.querySelector('#hero');
  if (hero) {
    hero.classList.remove('busqueda-activa');
    hero.style.removeProperty('--search-shift');
    hero.classList.add('con-resultados');
  }

  const filas = results.querySelectorAll('.result');
  if (filas[indice]) playSongResult(filas[indice]);

  // Sube al hero: es donde la esfera responde y donde vive el reproductor.
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
