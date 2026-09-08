# JV Studio — Especificación inicial para Codex

**Proyecto:** JV Studio
**Nombre visible provisional:** JV Studio  
**URL prevista:** `https://josicovila.com/jvstudio/`
**Estado:** MVP / primera implementación  
**Objetivo:** Construir un DAW web ligero orientado a composición MIDI, ejecutado principalmente en el navegador del usuario.

---

## 1. Objetivo general

Crear un DAW web sencillo pero funcional, integrado en el ecosistema de `josicovila.com`, que permita:

1. Crear un proyecto musical.
2. Añadir varias pistas MIDI.
3. Asignar instrumentos virtuales.
4. Crear y editar clips MIDI.
5. Editar notas mediante un piano roll.
6. Reproducir el proyecto sincronizado mediante un transporte común.
7. Ajustar volumen, mute y solo por pista.
8. Guardar y recuperar proyectos localmente.
9. Exportar el resultado a WAV.
10. Mantener una arquitectura preparada para añadir posteriormente mixer avanzado, efectos, automatizaciones, MIDI externo, MP3, SoundFonts y otras funciones.

El MVP NO debe intentar competir con Cubase, Reaper, Ableton o FL Studio.

La meta inicial es:

> Poder componer una pieza MIDI completa con varios instrumentos virtuales y exportarla a WAV desde el navegador.

---

## 2. Principios de arquitectura

### 2.1. Procesamiento en cliente

Todo el procesamiento musical pesado debe realizarse en el navegador.

El VPS NO debe encargarse de:

- mezclar pistas;
- sintetizar audio;
- procesar efectos;
- renderizar WAV;
- ejecutar FFmpeg para cada usuario;
- mantener procesos persistentes específicos del DAW.

Arquitectura deseada:

```text
VPS / Apache
    │
    ├── HTML
    ├── CSS
    ├── JS compilado
    ├── assets
    └── instrumentos / samples estáticos
            │
            ▼
        Navegador
            │
            ├── UI
            ├── Project Engine
            ├── Web Audio API
            ├── Tone.js
            ├── instrumentos
            ├── mixer básico
            └── OfflineAudioContext
                    │
                    ▼
                  WAV
```

### 2.2. Tecnología propuesta

```text
TypeScript
Vite
HTML
CSS
Web Audio API
Tone.js
IndexedDB
```

Evaluar para fases posteriores:

```text
@tonejs/midi
SpessaSynth
SoundFonts SF2/SF3
ffmpeg.wasm
Web MIDI API
```

No introducir estas dependencias posteriores en el MVP salvo que sean necesarias.

---

## 3. Restricción importante: alcance MVP

Las imágenes de referencia visual existentes representan una versión futura más completa de JV Studio.

NO deben interpretarse como lista de funcionalidades obligatorias del MVP.

El MVP debe implementar únicamente:

```text
Project
Transport
Tracks
Clips MIDI
Arranger
Piano Roll
Instrumentos básicos
Volume
Mute
Solo
Save / Load local
Export WAV
```

NO implementar todavía:

```text
Mixer profesional
EQ
Compressor
Reverb avanzada
Delay
Automation lanes
Audio tracks
Waveform editing
Microphone recording
MIDI keyboard recording
MP3 export
FLAC export
Bounce stems
Plugin system
VST / VST3
User accounts
Cloud projects
AI
```

La arquitectura sí debe evitar bloquear estas funciones futuras.

---

## 4. Diseño visual

Mantener la línea visual actual de `josicovila.com`:

```text
#0a0f1a
#111827
#3b82f6
#06b6d4
#ffffff
```

Estética:

- fondo azul muy oscuro / navy;
- paneles charcoal;
- acentos azul eléctrico y cyan;
- tipografía limpia;
- bordes discretos;
- esquinas ligeramente redondeadas;
- interfaz espaciosa;
- aspecto moderno;
- evitar exceso de elementos o ventanas flotantes.

Desktop-first.

---

## 5. Layout principal MVP

```text
┌───────────────────────────────────────────────────────────────┐
│ JV STUDIO    Proyecto        Transport    BPM     Save Export │
├───────────────┬───────────────────────────────────────────────┤
│               │                                               │
│ TRACK LIST    │                 ARRANGER                      │
│               │                                               │
│ Strings       │ [ Clip A ][ Clip B ]                         │
│ Piano         │       [ Clip C ][ Clip D ]                   │
│ Bass          │ [          Clip E          ]                 │
│ Drums         │ [ Beat ][ Beat ][ Fill ]                     │
│               │                                               │
├───────────────┴───────────────────────────────────────────────┤
│                       PIANO ROLL                              │
│                                                               │
│ C5 ─────■■■■──────────────■■■■──────────────────────────────  │
│ B4 ─────────■■■■────────────────────────────────────────────  │
│ A4 ───────────────■■■■──────────────────────────────────────  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ Instrument        Volume        Mute        Solo               │
└───────────────────────────────────────────────────────────────┘
```

El piano roll puede abrirse:

- debajo del arranger;
- o como panel principal que sustituya temporalmente al arranger.

Elegir la opción más sencilla y mantenible.

---

## 6. Header / Transport

Debe incluir como mínimo:

```text
JV Studio
Nombre del proyecto

Stop
Play
Loop

BPM
Time Signature

New
Open
Save
Export WAV
```

MVP:

- BPM editable.
- Time signature inicialmente `4/4`.
- No hardcodear toda la arquitectura exclusivamente para 4/4.
- Playhead sincronizado con Tone.Transport.
- Stop coherente y predecible.
- Loop global por rango de compases si no complica demasiado la primera iteración.

---

## 7. Modelo de datos

El proyecto debe representarse en JSON.

Ejemplo:

```json
{
  "version": 1,
  "id": "uuid",
  "name": "Untitled Project",
  "bpm": 120,
  "timeSignature": [4, 4],
  "lengthBars": 16,
  "tracks": []
}
```

### 7.1. Track

```json
{
  "id": "track-uuid",
  "name": "Piano",
  "type": "instrument",
  "instrumentId": "basic-piano",
  "volume": 0.8,
  "pan": 0,
  "muted": false,
  "solo": false,
  "color": "#06b6d4",
  "clips": []
}
```

MVP:

- `pan` puede estar definido aunque la UI se deje para después.
- mantener IDs estables;
- no usar índices como identificador principal.

### 7.2. Clip MIDI

```json
{
  "id": "clip-uuid",
  "name": "Piano Intro",
  "startBeat": 0,
  "lengthBeats": 16,
  "notes": []
}
```

Debe ser posible:

- seleccionar;
- mover;
- duplicar;
- eliminar;
- abrir en piano roll.

### 7.3. Note

```json
{
  "id": "note-uuid",
  "midi": 60,
  "startBeat": 0,
  "durationBeats": 1,
  "velocity": 0.8
}
```

Rangos:

```text
midi: 0..127
velocity: 0..1
startBeat >= 0
durationBeats > 0
```

---

## 8. Arranger

Funciones MVP:

- grid horizontal por compases;
- lista vertical de pistas;
- playhead;
- clips coloreados;
- seleccionar clip;
- arrastrar clip horizontalmente;
- duplicar clip;
- eliminar clip;
- doble clic o botón para editar clip;
- zoom horizontal básico si resulta sencillo.

Snap inicial:

```text
1 bar
1/2
1/4
1/8
1/16
```

---

## 9. Piano Roll

Función central.

Debe incluir:

- teclado vertical;
- grid horizontal;
- pitch vertical;
- tiempo horizontal;
- crear nota;
- seleccionar nota;
- mover nota;
- cambiar duración arrastrando borde;
- borrar nota;
- velocity editable;
- snap configurable;
- playhead sincronizado;
- scroll vertical;
- scroll horizontal;
- zoom horizontal.

Controles:

```text
Select
Draw
Erase

Snap:
1/4
1/8
1/16
1/32
```

MVP recomendado:

- clic / drag para crear;
- drag para mover;
- drag del extremo derecho para resize;
- Supr/Delete para borrar;
- selección múltiple si no retrasa demasiado el núcleo.

---

## 10. Instrumentos MVP

No empezar con una librería grande.

Objetivo inicial:

```text
1. Basic Piano
2. Soft Piano
3. Strings
4. Bass
5. Synth Pad
6. Lead Synth
7. Drum Kit
8. Simple Choir / Pad
```

No es obligatorio que todos sean sampleados.

Preferencia:

```text
Tone.Synth
Tone.PolySynth
Tone.FMSynth
Tone.MembraneSynth
Tone.NoiseSynth
Tone.Sampler
```

Usar samples únicamente cuando aporten valor claro.

---

## 11. Licencias de instrumentos

REQUISITO:

No incorporar SoundFonts, samples ni audio de terceros sin registrar explícitamente:

```text
Nombre
Autor
Fuente
Licencia
Permiso de redistribución
Permiso de modificación
Permiso de uso comercial
Fecha de revisión
```

Crear:

```text
docs/licenses/instruments.md
```

Si existe cualquier duda de licencia: NO incluir ese banco en producción.

Para el MVP se priorizan sintetizadores propios con Tone.js y samples claramente licenciados.

---

## 12. Motor de audio

Cada track debe tener conceptualmente:

```text
Notes
  │
  ▼
Instrument
  │
  ▼
Gain
  │
  ▼
Pan (opcional MVP)
  │
  ▼
Master
```

Implementación sugerida:

```text
Tone.Transport
Tone.Part / Tone.Sequence
Tone.PolySynth / Tone.Sampler
Tone.Gain
Tone.Panner
```

Debe existir separación clara entre:

```text
UI
Project State
Audio Engine
Storage
Export
```

NO acoplar la UI directamente a Tone.js por todas partes.

---

## 13. Arquitectura de módulos

Propuesta:

```text
src/
├── app/
│   ├── App.ts
│   └── state/
│
├── audio/
│   ├── AudioEngine.ts
│   ├── TransportEngine.ts
│   ├── TrackEngine.ts
│   ├── InstrumentFactory.ts
│   └── RenderEngine.ts
│
├── project/
│   ├── Project.ts
│   ├── Track.ts
│   ├── Clip.ts
│   ├── Note.ts
│   └── serializers/
│
├── ui/
│   ├── transport/
│   ├── arranger/
│   ├── piano-roll/
│   ├── track-list/
│   ├── inspector/
│   └── instrument-selector/
│
├── storage/
│   ├── IndexedDbStorage.ts
│   └── FileProjectStorage.ts
│
├── export/
│   └── WavExporter.ts
│
└── utils/
```

No es obligatorio seguir literalmente esta estructura, pero mantener separación equivalente.

---

## 14. Estado global

Evitar un framework de estado complejo inicialmente.

Mantener un `ProjectStore` claro:

```ts
createProject()
loadProject()
saveProject()

addTrack()
removeTrack()
updateTrack()

addClip()
moveClip()
duplicateClip()
removeClip()

addNote()
updateNote()
removeNote()
```

Preparar arquitectura para Undo/Redo futuro, pero no es obligatorio en MVP.

---

## 15. Persistencia

Primera fase:

```text
IndexedDB
```

Funciones:

- autosave local;
- guardar proyecto;
- cargar proyecto;
- listado de proyectos locales.

Además:

```text
Export Project
Import Project
```

Formato provisional:

```text
.jvstudio.json
```

Internamente JSON.

El archivo NO debe incluir bancos de instrumentos.

---

## 16. Exportación WAV

REQUISITO MVP.

Flujo:

```text
Project
   │
   ▼
OfflineAudioContext / Tone.Offline
   │
   ▼
AudioBuffer
   │
   ▼
WAV Encoder
   │
   ▼
Download
```

Debe renderizar:

- todas las pistas;
- volumen;
- mute;
- solo;
- instrumentos;
- duración completa del proyecto.

Para MVP:

```text
44.1 kHz
stereo
16-bit o 24-bit
```

Elegir primero la opción más estable.

NO ejecutar render en el VPS.

---

## 17. Mixer MVP

No implementar la pantalla Mixer avanzada todavía.

Cada pista debe disponer en su cabecera o inspector de:

```text
Volume
Mute
Solo
Instrument
```

Pan puede añadirse si es sencillo.

---

## 18. Efectos MVP

NO son requisito inicial.

Si se implementa alguno para validar arquitectura:

```text
Master Gain
Track Gain
Simple Reverb
```

pero no retrasar Arranger/Piano Roll/Export por ello.

---

## 19. Rendimiento

Objetivo razonable:

```text
8-16 pistas
varios cientos / pocos miles de notas
16-64 compases
```

Usar:

- requestAnimationFrame para playhead / animaciones;
- evitar rerender continuo innecesario;
- no recalcular todo el proyecto ante cada movimiento;
- lazy load de samples;
- cache de instrumentos cargados.

---

## 20. Canvas / SVG / DOM

Codex debe evaluar la mejor opción.

Preferencia:

```text
DOM/CSS para paneles y controles
Canvas o SVG para grids y notas si mejora rendimiento
```

No crear una solución excesivamente sofisticada antes de comprobar necesidades reales.

---

## 21. Responsive

MVP:

```text
Desktop first
```

Resoluciones objetivo:

```text
1920×1080
1440×900
1366×768
```

Tablet posteriormente.

No diseñar inicialmente el piano roll para teléfono móvil.

En móvil se puede mostrar:

> JV Studio is currently designed for desktop browsers.

---

## 22. Integración futura con josicovila.com

URL prevista:

```text
https://josicovila.com/jvstudio/
```

La home de `.com` tendrá en el futuro:

```text
Buscador musical principal
+
CTA "Open JV Studio"
```

No implementar cambios en la home salvo instrucción posterior.

JV Studio debe funcionar como SPA independiente dentro de `/jvstudio/` y respetar rutas relativas.

---

## 23. Seguridad

- validar JSON importado;
- limitar tamaños de archivo `.jvstudio.json`;
- validar números y rangos;
- no permitir URLs arbitrarias para cargar samples;
- no ejecutar contenido de usuario;
- preparar compatibilidad futura con CSP.

---

## 24. Tests mínimos

Crear pruebas para:

```text
Project serialization
Track operations
Clip operations
Note operations
Timing conversions
MIDI note range
Quantization
WAV render smoke test
```

Pruebas manuales:

```text
Chrome
Edge
Firefox
```

Safari posteriormente.

---

## 25. Definition of Done — MVP

JV Studio MVP se considera funcional cuando se puede:

1. Abrir `/jvstudio/`.
2. Crear un proyecto.
3. Cambiar BPM.
4. Añadir al menos 4 pistas.
5. Elegir un instrumento por pista.
6. Crear clips en el arranger.
7. Abrir un clip en piano roll.
8. Crear varias notas.
9. Mover notas.
10. Cambiar duración.
11. Cambiar velocity.
12. Reproducir el proyecto sincronizado.
13. Ajustar volumen.
14. Mutear una pista.
15. Usar Solo.
16. Guardar en IndexedDB.
17. Recargar el navegador.
18. Recuperar el proyecto.
19. Exportar `.jvstudio.json`.
20. Importar `.jvstudio.json`.
21. Renderizar WAV.
22. Descargar el WAV.
23. Hacerlo sin procesamiento de audio en el VPS.

---

## 26. Fases de implementación recomendadas

### Fase 0 — Scaffold

- Vite + TypeScript;
- estructura modular;
- base `/jvstudio/`;
- CSS base;
- layout principal;
- proyecto demo vacío.

### Fase 1 — Motor y transporte

- Tone.js;
- AudioEngine;
- Transport;
- BPM;
- play;
- stop;
- loop;
- pista de prueba;
- synth simple.

Objetivo:

```text
una nota puede sonar sincronizada con el transporte
```

### Fase 2 — Modelo de proyecto

- Project;
- Track;
- Clip;
- Note;
- ProjectStore;
- serializer JSON.

### Fase 3 — Arranger

- track list;
- timeline;
- clips;
- playhead;
- seleccionar;
- mover;
- crear;
- borrar.

### Fase 4 — Piano Roll

- grid;
- teclado;
- notas;
- select;
- draw;
- move;
- resize;
- delete;
- velocity;
- snap.

### Fase 5 — Instrumentos

- InstrumentFactory;
- presets básicos;
- piano;
- strings/pad;
- bass;
- synth;
- drums.

### Fase 6 — Mezcla mínima

- volume;
- mute;
- solo;
- opcional pan.

### Fase 7 — Persistencia

- IndexedDB;
- autosave;
- open;
- save;
- import/export `.jvstudio.json`.

### Fase 8 — Render WAV

- render offline;
- encode WAV;
- descarga;
- pruebas con varias pistas.

### Fase 9 — Pulido

- shortcuts;
- zoom;
- selección múltiple;
- performance;
- errores;
- empty states;
- tooltips.

---

## 27. Backlog posterior

### JV Studio 0.2

```text
Undo/Redo
Copy/Paste
Metronome
Pan
Reverb
Delay
EQ básico
Import MIDI
Export MIDI
Más instrumentos
```

### JV Studio 0.3

```text
Mixer completo
Automation
Web MIDI
MIDI recording
SoundFonts
SpessaSynth
Custom SoundFonts
MP3
FLAC
```

### JV Studio 0.4+

```text
Audio tracks
Microphone recording
Waveform editor
Audio clips
Fades
Time stretching
Pitch shifting
Stems
Cloud projects
User login
```

No implementar adelantadamente estas funciones salvo necesidad arquitectónica clara.

---

## 28. Referencias visuales

Existen mockups conceptuales de:

```text
Arranger
Piano Roll
Mixer
Instrument Browser + Export
```

IMPORTANTE:

Las imágenes deben utilizarse como:

```text
REFERENCIA DE DISEÑO
+
VISIÓN FUTURA
```

NO como especificación exacta del MVP.

Elementos NO requeridos en MVP:

- mixer completo;
- EQ visual;
- compresores;
- sends;
- cadenas avanzadas de efectos;
- nombres de plugins comerciales;
- decenas de instrumentos;
- FLAC;
- bounce stems;
- export video;
- automatización completa.

Se recomienda entregar a Codex mockups específicos simplificados del MVP además de este documento.

---

## 29. Plugins comerciales mostrados en mockups

Algunas referencias visuales contienen nombres como:

```text
Valhalla Room
Pro-Q
Ozone
CLA Drums
```

Son únicamente referencias visuales.

NO usar sus nombres, marcas, interfaces, plugins ni assets.

Para efectos propios usar nombres provisionales como:

```text
JV Reverb
JV EQ
JV Compressor
JV Delay
JV Limiter
```

---

## 30. Criterios de calidad

Prioridad:

```text
1. Timing correcto
2. Audio estable
3. Modelo de proyecto sólido
4. Piano Roll usable
5. Persistencia fiable
6. Export WAV correcto
7. UI limpia
8. Funciones adicionales
```

No sacrificar estabilidad musical por efectos visuales.

---

## 31. Primera tarea para Codex

Antes de implementar todo:

1. revisar esta especificación;
2. crear la estructura inicial;
3. señalar ajustes técnicos importantes;
4. implementar Fase 0;
5. implementar una prueba mínima de Fase 1.

Primer milestone:

```text
/jvstudio/
   ↓
abre JV Studio
   ↓
crea AudioContext tras interacción del usuario
   ↓
Play
   ↓
Tone.Transport funciona
   ↓
una pista con un synth reproduce un pequeño patrón
   ↓
Stop funciona
   ↓
BPM puede modificarse
```

No avanzar al piano roll completo hasta que esta base esté estable.

---

## 32. Documentación de continuidad

Mantener:

```text
docs/STATUS.md
```

con:

```text
Implemented
In progress
Pending
Known issues
Architecture decisions
Next milestone
```

Y:

```text
docs/DECISIONS.md
```

para decisiones técnicas relevantes que no deben perderse entre sesiones de Codex.

---

## 33. Resultado esperado de la primera sesión

Al finalizar el primer bloque de trabajo debería existir:

```text
JV Studio
├── layout principal
├── transport funcional
├── BPM
├── proyecto demo
├── una pista
├── un instrumento synth
├── patrón simple
└── reproducción sincronizada
```

Nada más.

Primero demostrar que:

> el navegador puede ser el motor del DAW.

Después construiremos el editor encima.
