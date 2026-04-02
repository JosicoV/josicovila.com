import * as AUDIO3D from './3D.module.js';


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
let currentTimeSpan = document.querySelector('.track-time');

selected.addEventListener('click', () => {
  options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
  results.style.display = 'none';
  input.value = '';
});

//Inciar colores primer disco
let label = document.querySelector('.options .option').dataset.label;
conseguirColores(label);

//NO mostramos el disco por defecto
document.querySelector('.portada').style.opacity = 0;
document.querySelector('.lista-disco').style.opacity = 0;

customSelect.querySelectorAll('.option').forEach(option => {
  
option.addEventListener('click', () => {
    //Mostramos el primer disco seleccionado
    document.querySelector('.portada').style.opacity = 1;
    document.querySelector('.lista-disco').style.opacity = 1;
    const img = option.dataset.img;
    label = option.dataset.label;
    const title = option.dataset.title;    
    const description = option.dataset.description;
    selected.innerHTML = `<img src="${img}" alt=""> <span>${title}</span>`;
    options.style.display = 'none';

    // Animation Change Album
    changeAlbumAnimation();    
   
    // Cambiar informacion del nuevo album: portada, lista de canciones, etc.
    let portada = document.querySelector('.disco .portada');
    setTimeout(() => {
        setTimeout(() => {
            //portada.style.backgroundImage = `url(${img})`;
            portada.querySelector('img').src = img;
            // SEO: Actualizamos el contenido del h1 visible con el tÃ­tulo del nuevo Ã¡lbum.
            document.querySelector('.album-title').textContent = title;
            document.querySelector('.album-description').innerHTML = description;
            buscarCanciones(label, 0);
            // Si es la primera vez que se selecciona un disco, iniciamos la reproducciÃ³n.
            if (currentIndex === null) {
              playByIndex(0);
            }
            setTimeout(() => {
                conseguirColores(label);
            }, 500);                    
        },10)
    },800)
    
});
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
        listaDisco.innerHTML = respuesta; // Insertamos las nuevas canciones
        listaDisco.prepend(albumTitleElement); // Volvemos a colocar el H1 al principio
        albumTitleElement.after(albumDescElement); // Volvemos a colocar la descripciÃ³n despuÃ©s del H1
        //Play la primera cancion del album

        // FIX: Iniciar el canvas 2D para la primera canciÃ³n DESPUÃ‰S de cargar la lista.
        let primeraCancionLabel = document.querySelector('.disco .lista-disco .cancion:first-of-type').dataset.label;
        AUDIO3D.initCanvas2D(document.querySelector('.canvas-'+ primeraCancionLabel));
        //let ruta = document.querySelector('.disco .lista-disco .cancion').dataset.ruta;
        

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
  
  // Inicia la animaciÃ³n del tÃ­tulo con la nueva canciÃ³n
  startTitleScroll(`â–¶ ${songName} - ${albumName}`);

  AUDIO3D.setAudio(`musica/${track.dataset.ruta}`);
  
  //canvas 2d y 3d
  AUDIO3D.initCanvas2D(document.querySelector('.canvas-'+track.dataset.label));

  // actualiza botÃ³n y currentIndex
  const btn = track.querySelector('.play-button');
  if (btn) btn.classList.replace('play-button','pause-button');
  currentIndex = idx;
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

  // Actualiza el tiempo en el span actual
  AUDIO3D.audioElB.addEventListener('timeupdate', () => {
    if (currentTimeSpan) {
      currentTimeSpan.textContent =
        `${formatTime(AUDIO3D.audioElB.currentTime)} / ${formatTime(AUDIO3D.audioElB.duration)}`;
      let tiempocancion = (AUDIO3D.audioElB.currentTime / AUDIO3D.audioElB.duration) * 100;
      slider.style.width = tiempocancion + '%';
    }
  });
  AUDIO3D.audioElB.addEventListener('loadedmetadata', () => {
    if (currentTimeSpan) {
      currentTimeSpan.textContent =
        `${formatTime(AUDIO3D.audioElB.currentTime)} / ${formatTime(AUDIO3D.audioElB.duration)}`;

        // SEO: Actualizar la duraciÃ³n en los datos estructurados
        const currentTrackEl = document.querySelector(`.cancion.active`);
        if (currentTrackEl) {
          const metaDuration = currentTrackEl.querySelector('meta[itemprop="duration"]');
          if (metaDuration) metaDuration.content = formatDurationISO(AUDIO3D.audioElB.duration);
        }
        let tiempocancion = (AUDIO3D.audioElB.currentTime / AUDIO3D.audioElB.duration) * 100;
        slider.style.width = tiempocancion + '%';
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



// Esto se ejecuta UNA sola vez
AUDIO3D.audioElB.addEventListener('ended', () => {
  const tracks = Array.from(
    document.querySelectorAll('.disco .lista-disco .cancion')
  );
  
  if (currentIndex + 1 < tracks.length) {
    playByIndex(currentIndex + 1);
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

function playSongResult(result) {
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

  //Cerrar lista results
  results.style.display = 'none';
  document.querySelector('#songSearch').value = '';

  tooltip.style.visibility = 'hidden';
}

//OJO Y CÃMARA CANVAS 3D

function ojo(){
  const ojocerradopath = '<path d="M320 400c-97 0-185.16-56.16-233.6-144a263.03 263.03 0 0 1 61.66-76.62L55.69 89.18a16 16 0 0 1 22.63-22.63l572 572a16 16 0 0 1-22.63 22.63L454.47 379.16A263.03 263.03 0 0 1 320 400zm0-288c97 0 185.16 56.16 233.6 144a263.03 263.03 0 0 1-61.66 76.62L584.31 422.82a16 16 0 0 1-22.63 22.63l-572-572a16 16 0 1 1 22.63-22.63l95.17 95.17A263.03 263.03 0 0 1 320 112z"/>';
  const ojoabiertopath = '<path d="M572.52 241.4C518.6 135.5 407.6 64 288 64S57.4 135.5 3.48 241.4a48.11 48.11 0 0 0 0 29.2C57.4 376.5 168.4 448 288 448s230.6-71.5 284.52-177.4a48.11 48.11 0 0 0 0-29.2zM288 400c-97 0-185.16-56.16-233.6-144C102.84 168.16 191 112 288 112s185.16 56.16 233.6 144C473.16 343.84 385 400 288 400zm0-272a128 128 0 1 0 128 128 128.15 128.15 0 0 0-128-128zm0 208a80 80 0 1 1 80-80 80.09 80.09 0 0 1-80 80z"/>';

  let abierto = true;
  document.querySelector('#ojo').addEventListener('click', () => {
    
    if(abierto){ //cerrado
      abierto=false;
      document.querySelector('#ojo').innerHTML = ojocerradopath;
      document.querySelector('#firma').style.opacity = 0;
      document.querySelector('#miSelect').style.opacity = 0;
      document.querySelector('#searchContainer').style.opacity = 0;
      document.querySelector('.portada').style.opacity = 0;
      document.querySelector('.lista-disco').style.opacity = 0;
      document.querySelector('#container-track-time').style.opacity = 0;
      document.querySelector('.sphereRanges').style.display = 'flex';
    } else { //abierto
      abierto=true;
      document.querySelector('#ojo').innerHTML = ojoabiertopath;
      document.querySelector('#firma').style.opacity = 1;
      document.querySelector('#miSelect').style.opacity = 1;
      document.querySelector('#searchContainer').style.opacity = 1;
      document.querySelector('.portada').style.opacity = 1;
      document.querySelector('.lista-disco').style.opacity = 1;
      document.querySelector('#container-track-time').style.opacity = 1;
      document.querySelector('.sphereRanges').style.display = 'none';
    }
  })
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

 /************************BUSQUEDA DE lista de canciones por input*/
 (function(){  
  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = '';
      results.style.display = 'none';
      return;
    }
    // espera 300ms tras la Ãºltima letra
    timer = setTimeout(() => {
      const form = new FormData();
      form.append('query', q);

      fetch('includes/ajax.searchSongs.php', {
        method: 'POST',
        body: form
      })
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        results.style.display = "flex";
        if (!data.length) {
          results.innerHTML = '<div class="no-results">No se encontraron canciones.</div>';
          return;
        }
        results.innerHTML = data.map(item => `
          <div class="result" data-albumlabel="${item.albumCode}" data-cover="${item.cover}" data-albumname="${item.albumName}" data-songnumber="${item.songnumber}" data-albumdescription="${encodeURIComponent(item.albumDescription || "")}">
            <img src="musica/DISCOS/${item.cover}" alt="${item.albumName}">
            <div class="info">
              <div class="song">${item.songName}</div>
              <div class="meta">${item.albumName}</div>
            </div>
          </div>
        `).join('');

        document.querySelectorAll('.result').forEach(result => {
          result.addEventListener('click', (e) => {
            const item = e.target.closest('.result');
            if (!item) return;
            playSongResult(item);
          });
        });
      })
      .catch(err => {
        console.error(err);
        results.innerHTML = '<div class="no-results">Error al buscar.</div>';
      });
    }, 300);
  });
})();

initTooltips();




