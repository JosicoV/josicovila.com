import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, composer, mesh, analyser, dataArray, particles;
const R = 50, SEG = 64;

  // Escena y cámara
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 1, 1000);
  camera.position.set(0, 0, 150);
  scene.background = new THREE.Color(0x000000);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,               // desactivamos transparencia
    preserveDrawingBuffer: true // preservamos el buffer tras cada frame
  });
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
    // Solicita el data URL en PNG
    const dataURL = canvas3D.toDataURL('image/png');

    // Crea un enlace temporal
    const enlace = document.createElement('a');
    enlace.href = dataURL;
    enlace.download = 'JosicoVila.com.png';  // nombre por defecto

    // Necesario para Firefox: añadir al DOM, disparar click, luego quitar
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
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

  // Esfera
  const geo = new THREE.SphereGeometry(R, SEG, SEG);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    wireframe: true,
    emissive: 0x000000,
    emissiveIntensity: 0.3
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

  // Partículas
  const ptGeo = new THREE.BufferGeometry();
  const count = 10000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Dispersión en una esfera de radio R*2
    const r = R * 2;
    positions[i*3]   = (Math.random()-0.5)*r;
    positions[i*3+1] = (Math.random()-0.5)*r;
    positions[i*3+2] = (Math.random()-0.5)*r;
  }
  ptGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const ptMat = new THREE.PointsMaterial({
    size: 0.5,
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  particles = new THREE.Points(ptGeo, ptMat);
  scene.add(particles);

  


  // Ajuste en resize
  window.addEventListener('resize', ()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });


export function aplicarGradienteTresColores(colA, colB, colC) {
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

  let radius = 50;
  document.querySelector('#radius').addEventListener('input', (e) => {
    radius = (Number(e.target.value) || 50);
  });
  
  let deform = 10;
  document.querySelector('#deform').addEventListener('input', (e) => {
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
  
    // Bucle de animación
    (function draw() {
      lastRaf = requestAnimationFrame(draw);

      
  
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
      

      mesh.rotation.y += 0.004; // Rotación de la esfera
      mesh.rotation.x += 0.004; // Rotación de la esfera
      particles.rotation.y += 0.002; // Rotación de las partículas (un poco más lenta)
      // 4) Renderizar la escena 3D con bloom
      composer.render();
    })();
    
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

function stopPrevious() {
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
function startStaticRender() {
  // Si ya hay una animación musical, no hacemos nada.
  if (lastRaf !== null) return;

  mesh.rotation.y += 0.004; // Rotación unificada
  mesh.rotation.x += 0.004;
  particles.rotation.y += 0.002; // Rotación de partículas unificada
  composer.render();
  requestAnimationFrame(startStaticRender);
}

// Inicia el renderizado estático en la carga de la página.
startStaticRender();
