import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader }     from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, composer, mesh, analyser, dataArray, vertices;
let logoMesh = null;            // el logo 3D dentro de la esfera
let logoBaseScale = 1;          // escala en reposo, base del latido con la música
let entornoLogo = null;         // mapa de reflexión del logo
const materialesLogo = [];      // materiales a los que aplicar el entorno

/**
 * Asigna el mapa de entorno a los materiales del logo.
 * El .glb y la textura del entorno cargan por su cuenta y en cualquier orden,
 * así que esto se llama desde ambos sitios y actúa cuando ya hay las dos cosas.
 */
function aplicarEntornoAlLogo() {
  if (!entornoLogo || !materialesLogo.length) return;
  for (const material of materialesLogo) {
    material.envMap = entornoLogo;
    material.needsUpdate = true;
  }
}

/**
 * El logo es una pieza extruida y plana: un giro completo lo dejaría de canto
 * e invisible media vuelta de cada dos. Se mece en un arco corto para dar
 * volumen sin dejar de leerse nunca.
 */
function oscilarLogo() {
  if (!logoMesh) return;
  const t = performance.now() / 1000;
  logoMesh.rotation.y = Math.sin(t * 0.45) * 0.32;
  logoMesh.rotation.x = Math.sin(t * 0.3) * 0.06;
}
const R = 50, SEG = 64;

  // Escena y cámara
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 1, 1000);
  camera.position.set(0, 0, 150);
  // Sin fondo propio: detrás va el paisaje del hero, que se vería tapado por
  // un color de escena opaco.
  scene.background = null;

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,                // dejamos ver el fondo del hero
    preserveDrawingBuffer: true // preservamos el buffer tras cada frame
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  // FIX: Reemplaza la propiedad obsoleta 'physicallyCorrectLights'.
  renderer.useLegacyLights = false;
  document.body.appendChild(renderer.domElement);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0px';
  renderer.domElement.style.left = '0px';
  renderer.domElement.style.zIndex = '-1';
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.margin = 0;
  renderer.domElement.style.padding = 0;
  renderer.domElement.style.position = "fixed";


  //capturtar escena
  // 1. Obtén referencia a tu renderer y su canvas
  // const renderer = /* tu WebGLRenderer */;
  const canvas3D = renderer.domElement;  // normalmente creado en init

  // 2. Función para descargar la imagen
  export function descargarCanvas() {
    // El canvas es transparente para dejar ver el paisaje, así que toDataURL
    // por sí solo devolvería la esfera sobre un fondo vacío. Componemos el
    // fondo del hero y encima el render antes de exportar.
    const compuesto = document.createElement('canvas');
    compuesto.width  = canvas3D.width;
    compuesto.height = canvas3D.height;
    const ctx = compuesto.getContext('2d');

    const exportar = () => {
      // Mismo modo de fusión que aplica el CSS al canvas en pantalla.
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(canvas3D, 0, 0, compuesto.width, compuesto.height);
      ctx.globalCompositeOperation = 'source-over';
      const enlace = document.createElement('a');
      enlace.href = compuesto.toDataURL('image/png');
      enlace.download = 'JosicoVila.com.png';  // nombre por defecto
      // Necesario para Firefox: añadir al DOM, disparar click, luego quitar
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
    };

    const fondo = getComputedStyle(document.body).backgroundImage;
    const url = fondo && fondo.startsWith('url(') ? fondo.slice(5, -2) : null;
    if (!url) {
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, compuesto.width, compuesto.height);
      exportar();
      return;
    }

    const imagen = new Image();
    // Si la imagen no cargase, exportamos igualmente sobre color plano.
    imagen.onload = () => {
      // "cover": recorta lo que sobre en vez de deformar el paisaje.
      const escala = Math.max(compuesto.width / imagen.width, compuesto.height / imagen.height);
      const ancho = imagen.width * escala;
      const alto  = imagen.height * escala;
      ctx.drawImage(imagen, (compuesto.width - ancho) / 2, (compuesto.height - alto) / 2, ancho, alto);
      exportar();
    };
    imagen.onerror = () => {
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, compuesto.width, compuesto.height);
      exportar();
    };
    imagen.src = url;
  }

  // 3. Llama a descargarCanvas() cuando quieras abrir el diálogo
  //    por ejemplo, en un botón:
  // const btnExport = document.getElementById('exportBtn');
  // btnExport.addEventListener('click', descargarCanvas);


  // Postprocesado Bloom
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 1.5, 0.4, 0.85);
  bloom.threshold = 0.1;
  bloom.strength = 1.2;
  bloom.radius   = 0.5;
  composer.addPass(bloom);

  // Luces
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(100,100,100);
  scene.add(dir);

  // Esfera: aristas en azul oscuro.
  const geo = new THREE.SphereGeometry(R, SEG, SEG);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: false,
    wireframe: true,
    color: 0x2c5a94,
    emissive: 0x14305c,
    emissiveIntensity: 0.75
  });

  const basePos = geo.attributes.position.array.slice(); // clonamos posiciones
  const originalVectors = [];
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const x = basePos[i*3], y = basePos[i*3+1], z = basePos[i*3+2];
    const v = new THREE.Vector3(x,y,z).normalize();
    originalVectors.push(v);
  }

  mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // Vértices en plata. Comparten la MISMA geometría que la esfera, así que se
  // deforman con la música sin ningún trabajo extra.
  // Puntos pequeños a propósito: la esfera tiene los vértices muy juntos en los
  // polos y con tamaño grande se convierten en anillos macizos que tapan las
  // aristas.
  vertices = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.5,
    color: 0xc9d3de,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  }));
  scene.add(vertices);

  // Mapa de reflexión del logo: el propio paisaje del hero.
  // Un metal refleja su entorno; con una escena vacía y negra quedaría negro.
  // Usando el fondo real, el logo recoge el azul del cielo, el resplandor
  // cálido de la luna y la oscuridad del valle, que es lo creíble aquí.
  // Se prefiltra con PMREM para que la rugosidad difumine el reflejo bien.
  (function cargarEntorno() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new THREE.TextureLoader().load(
      'img/hero-desktop.webp',
      (textura) => {
        textura.mapping = THREE.EquirectangularReflectionMapping;
        entornoLogo = pmrem.fromEquirectangular(textura).texture;
        textura.dispose();
        pmrem.dispose();
        aplicarEntornoAlLogo();
      },
      undefined,
      () => {
        // Sin entorno el logo sigue viéndose por su color y su emisivo.
        pmrem.dispose();
      }
    );
  })();

  // Luz de contra fría: recorta el canto del logo contra la esfera y da un
  // brillo especular que un entorno tan oscuro no llega a producir solo.
  const contra = new THREE.DirectionalLight(0x9ec4ff, 1.1);
  contra.position.set(-90, 40, -60);
  scene.add(contra);

  // Logo 3D dentro de la esfera.
  // Se carga aparte y de forma tolerante: si el .glb no está servido, la
  // escena sigue funcionando exactamente igual que antes.
  new GLTFLoader().load(
    'data/3Dassets/logo3D.glb',
    (gltf) => {
      const modelo = gltf.scene;

      // Centrar en el origen y escalar para que quepa holgado dentro de la esfera.
      const caja = new THREE.Box3().setFromObject(modelo);
      const centro = caja.getCenter(new THREE.Vector3());
      const tamano = caja.getSize(new THREE.Vector3());
      modelo.position.sub(centro);

      const ladoMayor = Math.max(tamano.x, tamano.y) || 1;
      const escala = (R * 0.95) / ladoMayor;

      logoBaseScale = escala;
      logoMesh = new THREE.Group();
      logoMesh.add(modelo);
      logoMesh.scale.setScalar(escala);

      // Material luminoso: el bloom del composer hace el resto.
      modelo.traverse((hijo) => {
        if (!hijo.isMesh) return;
        // Plata vieja: metal de verdad, con el paisaje como reflejo.
        // `color` tiñe el reflejo (en un metal no hay componente difusa), de ahí
        // el gris cálido apagado en vez de un blanco.
        // `envMapIntensity` alto compensa lo oscura que es la escena: sin ello
        // el reflejo sería fiel pero prácticamente negro.
        // El emisivo queda como suelo mínimo para que nunca desaparezca del todo.
        hijo.material = new THREE.MeshStandardMaterial({
          color: 0xc2c6c9,
          emissive: 0x24405e,
          emissiveIntensity: 0.16,
          metalness: 0.95,
          roughness: 0.22,
          envMapIntensity: 3.2,
        });
        materialesLogo.push(hijo.material);
      });

      aplicarEntornoAlLogo();
      scene.add(logoMesh);
    },
    undefined,
    (error) => console.warn('No se pudo cargar el logo 3D:', error)
  );

  


  /**
   * En pantallas estrechas la esfera se sale por los lados: con el mismo FOV,
   * el ancho visible depende del alto. Alejamos la cámara para que quepa.
   */
  function encuadrar() {
    camera.position.z = innerWidth < 860 ? 260 : 150;
  }

  // Ajuste en resize
  window.addEventListener('resize', ()=>{
    camera.aspect = innerWidth/innerHeight;
    encuadrar();
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });
  encuadrar();


/**
 * La esfera tiene ahora una paleta fija: aristas azul oscuro y vértices plata.
 * Se conserva la función porque js.js la llama en cada cambio de disco, pero ya
 * no tiñe la esfera con la paleta del álbum. Las barras 2D y los títulos de las
 * canciones sí siguen usando los colores de cada disco.
 */
export function aplicarGradienteTresColores(colA, colB, colC) {
    return;
}

function aplicarGradienteTresColoresDesactivado(colA, colB, colC) {
    const geom = mesh.geometry;
    const pos = geom.attributes.position.array;
    const cnt = geom.attributes.position.count;
    const colors = [];

    // Convertir a THREE.Color
    const cA = new THREE.Color(colA);
    const cB = new THREE.Color(colB);
    const cC = new THREE.Color(colC);
  
    // Para cada vértice...
    for (let i = 0; i < cnt; i++) {
      const ix = i * 3;
      // Vector normalizado desde el centro
      const v = new THREE.Vector3(pos[ix], pos[ix+1], pos[ix+2]).normalize();
      // Usamos la componente Y para obtener un valor en [-1,1], y lo normalizamos a [0,1]
      const t = (v.y + 1) * 0.5;
  
      // Interpolación en dos fases
      let col = new THREE.Color();
      if (t < 0.5) {
        // 0 ≤ t < 0.5 → de A a B
        col.lerpColors(cA, cB, t / 0.5);
      } else {
        // 0.5 ≤ t ≤ 1 → de B a C
        col.lerpColors(cB, cC, (t - 0.5) / 0.5);
      }
  
      colors.push(col.r, col.g, col.b);
    }
  
    // Asignar el atributo de color y forzar actualización
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.attributes.color.needsUpdate = true;
  
    // Asegurarse de que el material use vertexColors
    if (!mesh.material.vertexColors) {
      mesh.material.vertexColors = true;
      mesh.material.needsUpdate = true;
    }
  }

  // Sliders de depuración: opcionales, el módulo no debe caerse sin ellos.
  let radius = 50;
  const radiusInput = document.querySelector('#radius');
  if (radiusInput) radiusInput.addEventListener('input', (e) => {
    radius = (Number(e.target.value) || 50);
  });

  let deform = 10;
  const deformInput = document.querySelector('#deform');
  if (deformInput) deformInput.addEventListener('input', (e) => {
    deform = (Number(e.target.value) || 10);
  });
  
  

/**
 * Lanza en bucle la animación sincronizada de:
 *   1) La malla 3D (esfera) deformada por las frecuencias
 *   2) El visualizador 2D de barras
 *   3) El renderizado 3D con bloom
 *
 * @param {AnalyserNode} analyser     — nodo AnalyserNode conectado al AudioContext
 * @param {Uint8Array}  dataArray     — array donde vuelcan los datos de frecuencia
 * @param {THREE.Mesh}  mesh          — la esfera 3D a deformar (SphereGeometry con vertexColors)
 * @param {EffectComposer} composer   — el composer que contiene el RenderPass + BloomPass
 * @param {CanvasRenderingContext2D} ctx2d  — contexto 2D del canvas overlay
 * @param {Object} opts               — opciones de configuración:
 *   opts.width       — ancho real del canvas 2D
 *   opts.height      — alto real del canvas 2D
 *   opts.barCount    — número de barras (por defecto 10)
 *   opts.radius      — radio base de la esfera (p.ej. 50)
 *   opts.deformScale — divisor para la deformación (p.ej. 8)
 */
function animateVisualizers(analyser, dataArray, mesh, composer, ctx2d, opts) {
    const W         = opts.width;
    const H         = opts.height;
    const BAR_COUNT = opts.barCount    || 10;
    const R         = opts.radius      || 50;
    const S         = opts.deformScale || 8;
    const barWidth  = (W / BAR_COUNT) * 1;
    const barGap    = (W / BAR_COUNT) * 0;
    const generation = animationGeneration;
    let previousFrameTime = null;
  
    // Bucle de animación
    function draw(frameTime) {
      // Una animación sustituida no puede volver a engancharse aunque su
      // callback ya estuviera en la cola del navegador.
      if (generation !== animationGeneration) return;
      lastRaf = requestAnimationFrame(draw);
      const deltaSeconds = frameDeltaSeconds(frameTime, previousFrameTime);
      previousFrameTime = frameTime;
  
      // 1) Obtener datos de frecuencia
      analyser.getByteFrequencyData(dataArray);
      
      
      // 2) Deformar la esfera radialmente
      const pos = mesh.geometry.attributes.position.array;
      const cnt = mesh.geometry.attributes.position.count;
      for (let i = 0; i < cnt; i++) {
        const ix = i * 3;
        const v  = originalVectors[i]; //new THREE.Vector3(pos[ix], pos[ix+1], pos[ix+2]).normalize();
        const f  = dataArray[i % dataArray.length];
        const d  = (radius) + f / (deform); 
        pos[ix]   = v.x * d;
        pos[ix+1] = v.y * d;
        pos[ix+2] = v.z * d;
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
  
      // 3) Dibujar barras 2D en el overlay
      
      ctx2d.clearRect(0, 0, W, H);
      for (let i = 0; i < BAR_COUNT; i++) {
        const idx    = Math.floor(i * dataArray.length / BAR_COUNT);
        const value  = dataArray[idx] / 255;        // normalizado 0..1
        const height = value * H;
        const x      = i * (barWidth + barGap);
        const y      = H - height;
  
        // Gradiente vertical de color
        const grad = ctx2d.createLinearGradient(x, y, x, H);
        //grad.addColorStop(0, 'lime');
        //grad.addColorStop(1, 'red');
        //rgba(255,255,255, 1), rgba(238, 133, 60, 1),rgba(0, 0, 0, 1)
        if(color1 && color2 && color3) {
          grad.addColorStop(0, color1);
          grad.addColorStop(0.5, color2);
          grad.addColorStop(1, color3);
        } else {
          grad.addColorStop(0, 'rgba(255,255,255, 1)');
          grad.addColorStop(0.5, 'rgba(238, 133, 60, 1)');
          grad.addColorStop(1, 'rgba(238, 133, 60, 1)');
        }

        ctx2d.fillStyle = grad;
        ctx2d.fillRect(x, y, barWidth, height);
      }
      

      avanzarRotacionEsfera(deltaSeconds);

      if (logoMesh) {
        // Vaivén, no giro completo: el logo es plano y de canto desaparecería.
        oscilarLogo();
        // Latido sutil con los graves, sin llegar a deformar la letra.
        const graves = (dataArray[0] + dataArray[1] + dataArray[2]) / 3 / 255;
        logoMesh.scale.setScalar(logoBaseScale * (1 + graves * 0.06));
      }
      // 4) Renderizar la escena 3D con bloom
      composer.render();
    }

    lastRaf = requestAnimationFrame(draw);
    
  }
  

  // Supongamos que ya tienes:
const audioCtx = new AudioContext();
analyser = audioCtx.createAnalyser();
analyser.fftSize = 64;
dataArray = new Uint8Array(analyser.frequencyBinCount);
export let audioElB = new Audio();
export function setAudio(audioUrl) {
  // 1) Pausar y limpiar la anterior animación/barras
  stopPrevious();

  // 2) Cambiar la fuente y resetear posición
  //audioElB.pause();
  audioElB.src         = audioUrl;
  //audioElB.currentTime = 0;
  audioElB.volume      = 1;

  // 3) Asegurarnos de que el AudioContext esté resumed
  audioCtx.resume()
    .then(() => {
      // 4) Intentar reproducir (está dentro de un gesto de usuario)
      return audioElB.play();
    })
    .catch(err => {
      console.warn('No se pudo reproducir automáticamente:', err);
    });
}
// Sólo una vez, en el primer click:
/*
document.body.addEventListener('click', () => {
    audioCtx.resume();      // dispara el AudioContext
    audioElB.play().catch(e => {
      console.warn("No se pudo reproducir automáticamente:", e);
    });
}, { once: true });
*/
const srcB = audioCtx.createMediaElementSource(audioElB);
srcB.connect(analyser);
analyser.connect(audioCtx.destination);

//const mesh     = /* tu THREE.Mesh de la esfera */;
//const renderer; /* tu THREE.WebGLRenderer */;
//const scene; /* tu THREE.Scene */;
//const camera;   = /* tu THREE.Camera */;
//let canvas2d;  // tu <canvas>

let lastRaf = null;
let lastCanvas = null;
let animationGeneration = 0;
const SPHERE_ROTATION_SPEED = 0.24; // radianes/segundo; equivale a 0.004 a 60 FPS
const MAX_FRAME_DELTA = 0.05;       // evita saltos al volver de una pestaña inactiva

function frameDeltaSeconds(frameTime, previousFrameTime) {
  if (previousFrameTime === null) return 0;
  return Math.min(Math.max((frameTime - previousFrameTime) / 1000, 0), MAX_FRAME_DELTA);
}

function avanzarRotacionEsfera(deltaSeconds) {
  const step = SPHERE_ROTATION_SPEED * deltaSeconds;
  mesh.rotation.y += step;
  mesh.rotation.x += step;
  vertices.rotation.copy(mesh.rotation);
}

function stopPrevious() {
  animationGeneration += 1;
  if (lastRaf !== null) {
    cancelAnimationFrame(lastRaf);
    lastRaf = null;
  }
  if (lastCanvas) {
    const ctx = lastCanvas.getContext('2d');
    ctx.clearRect(0, 0, lastCanvas.width, lastCanvas.height);
    lastCanvas = null;
  }
}

let color1, color2, color3 = '';
export function aplicarTresColores2D(c1, c2, c3){
  color1 = c1;
  color2 = c2;
  color3 = c3;
}


export function initCanvas2D(canvas2d){

// Esta función es la única puerta de entrada a la animación musical: antes de
// crearla invalida cualquier bucle anterior y conserva la orientación actual.
stopPrevious();

lastCanvas = canvas2d;

// 2) Ajusta su buffer al tamaño de la ventana:
canvas2d.width  = 150;
canvas2d.height = 30;

// 3) (Opcional) también actualiza el CSS para que no se desequilibre:
canvas2d.style.width  = 150 + 'px';
canvas2d.style.height = 30 + 'px';

// 4) Ahora sí obtén el contexto 2D:
const ctx2d = canvas2d.getContext('2d');



// Configuración
const opts = {
  width: canvas2d.width,
  height: canvas2d.height,
  barCount: 100,
  radius: radius,       // radio base de tu esfera
  deformScale: deform    // cuánto escala la deformación (ajusta a tu gusto)
};
animateVisualizers(analyser, dataArray, mesh, composer, ctx2d, opts);
}

/**
 * Inicia un bucle de renderizado estático para la carga inicial.
 * Se cancelará cuando comience la animación con música.
 */
let staticPreviousFrameTime = null;
function startStaticRender(frameTime) {
  // Si ya hay una animación musical, no hacemos nada.
  if (lastRaf !== null) return;

  const deltaSeconds = frameDeltaSeconds(frameTime, staticPreviousFrameTime);
  staticPreviousFrameTime = frameTime;
  avanzarRotacionEsfera(deltaSeconds);
  oscilarLogo();
  composer.render();
  requestAnimationFrame(startStaticRender);
}

// Inicia el renderizado estático en la carga de la página.
requestAnimationFrame(startStaticRender);
