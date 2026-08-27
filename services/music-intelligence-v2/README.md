# Music Intelligence v2

Arnés aislado para comparar modelos de recuperación texto-música antes de elegir
la arquitectura definitiva. No está conectado con la aplicación PHP de producción.

## Entorno

- Python: 3.11.9, aislado en `.venv/`.
- PyTorch: 2.10.0 + CUDA 13.0.
- GPU local detectada: NVIDIA GeForce RTX 4060, 8 GB.
- Audio original: se referencia desde `data/musica/`; nunca se modifica ni duplica.

Preparación reproducible desde la raíz del repositorio:

```powershell
uv venv services\music-intelligence-v2\.venv --python 3.11 --seed
uv pip install --python services\music-intelligence-v2\.venv\Scripts\python.exe `
  torch==2.10.0 torchaudio==2.10.0 `
  --index-url https://download.pytorch.org/whl/cu130
uv pip install --python services\music-intelligence-v2\.venv\Scripts\python.exe `
  -r services\music-intelligence-v2\requirements\base.txt
```

## Ejecución

```powershell
services\music-intelligence-v2\.venv\Scripts\python.exe `
  services\music-intelligence-v2\benchmark.py `
  --models muq_mulan laion_clap figma `
  --modes global segment hybrid
```

La ejecución admite un subconjunto de modelos y modos. Un fallo se registra en
`benchmarks/music-intelligence-v2/MODEL_STATUS.md` y no bloquea los demás.

## Revisión humana en el navegador

La aplicación local permite recorrer los resultados, escuchar la pista completa
o únicamente el segmento recuperado y guardar las valoraciones directamente en
`benchmarks/music-intelligence-v2/human_review_phase1.csv`.

Desde la raíz del repositorio:

```powershell
services\music-intelligence-v2\.venv\Scripts\python.exe `
  services\music-intelligence-v2\review_app.py
```

Después abre `http://127.0.0.1:8091`. El servidor solo escucha en localhost. El
primer guardado crea `human_review_phase1.csv.bak`, y cada cambio posterior se
escribe de forma atómica. Los archivos de audio de `data/musica/` son de solo
lectura para esta aplicación.

La vista predeterminada es **Rápida · 45 escuchas**. Compara únicamente el top 1
de FIGMA y MuQ-MuLan en Segmento e Híbrido y agrupa resultados con la misma
consulta, pista e intervalo. Una puntuación se propaga a todas las filas
equivalentes del CSV. La vista completa de 1.440 filas sigue disponible en el
selector `Plan de revisión` para auditorías puntuales.

Para probar con una copia del CSV sin tocar las valoraciones reales:

```powershell
services\music-intelligence-v2\.venv\Scripts\python.exe `
  services\music-intelligence-v2\review_app.py `
  --csv ruta\a\una-copia.csv
```

## Diseño

- `src/music_intelligence_v2/adapters/`: interfaz común y adaptadores de modelos.
- `src/music_intelligence_v2/preprocessing/`: lectura no destructiva y segmentación.
- `src/music_intelligence_v2/retrieval/`: ranking global, por segmento e híbrido.
- `src/music_intelligence_v2/cache/`: caché versionada de embeddings.
- `src/music_intelligence_v2/service/`: índice serializado, contrato, tubería de
  búsqueda, errores, registro y capa HTTP del servicio de Fase 3.
- `config/model_registry.json`: checkpoints y comportamiento por modelo.
- `requirements/`: dependencias directas y versión de PyTorch.
- `tests/`: pruebas que no descargan ni cargan modelos.
- `review_app.py` y `review_app/`: servidor local e interfaz de revisión humana.

## Límites de Fase 1

No genera metadatos finales, no procesa las 115 pistas, no traduce consultas y no
modifica el frontend, endpoints PHP, reproductor, Docker ni despliegue.

## Fase 2: catálogo completo

MuQ-MuLan Segment, elegido tras las 45 escuchas humanas, se ejecuta sobre las
115 pistas con ventanas de 25 segundos y un solape del 50 %. La preparación y
la indexación siguen aisladas de la web de producción:

```powershell
services\music-intelligence-v2\.venv\Scripts\python.exe `
  services\music-intelligence-v2\prepare_phase2.py

$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
services\music-intelligence-v2\.venv\Scripts\python.exe `
  services\music-intelligence-v2\phase2_full_catalog.py
```

Los embeddings reanudables se guardan en
`data/music-intelligence-v2/embeddings-phase2/`; el catálogo, las 60 consultas,
los rankings y los informes se guardan en
`benchmarks/music-intelligence-v2/phase2/`. La ejecución no escribe en los MP3,
PHP, Docker ni en ningún servicio de producción.

## Diversificación y benchmark español

La siguiente validación agrupa versiones de una misma composición mediante tres
condiciones simultáneas —título, duración y similitud acústica— y compara las
consultas españolas traducidas localmente con una referencia inglesa y con el
embedding directo del español:

```powershell
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
services\music-intelligence-v2\.venv\Scripts\python.exe `
  services\music-intelligence-v2\phase2_multilingual.py
```

El traductor fijado es `Helsinki-NLP/opus-mt-es-en`, revisión
`c96e2c5399ebfae4fc43d9669556b9afa74bb69d`, con licencia Apache-2.0. Sus pesos
locales se esperan en `data/music-intelligence-v2/models/opus-mt-es-en/` y no se
incluyen en Git. Los resultados se generan en
`benchmarks/music-intelligence-v2/phase2/multilingual-results/`.

## Fase 3: servicio de búsqueda aislado

El contrato público está en [`SEARCH_SERVICE_CONTRACT.md`](SEARCH_SERVICE_CONTRACT.md).
Sigue sin conexión con el frontend, Docker ni el despliegue.

### 1. Construir el índice serializado

Consolida la caché validada de Fase 2 en un único artefacto de ejecución. No
abre ningún MP3 ni carga ningún modelo:

```powershell
services\music-intelligence-v2\.venv\Scripts\python.exe `
  services\music-intelligence-v2\build_index.py
```

Genera `data/music-intelligence-v2/index/index.npz` (3,0 MB) e
`index_meta.json`. El servicio rechaza el índice si cambia la versión de
esquema, la dimensión de embedding, el recuento de pistas o segmentos, el
checksum del `.npz` o el checkpoint/revisión del modelo de recuperación.

`composition_id` se calcula una sola vez aquí, en construcción, y queda grabado
en los metadatos: en ejecución no se reagrupa nada.

### 2. Levantar el servicio

```powershell
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
services\music-intelligence-v2\.venv\Scripts\python.exe `
  services\music-intelligence-v2\serve.py --port 8100
```

Escucha solo en `127.0.0.1`. Carga índice, traductor y MuQ-MuLan al arrancar,
de modo que `/health` responde `ok` únicamente cuando los tres están listos.
`--skip-models` carga solo el índice para probar el contrato sin GPU;
`--log-queries` activa el registro del texto del usuario, desactivado por
defecto.

### 3. Medir latencia

```powershell
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
services\music-intelligence-v2\.venv\Scripts\python.exe `
  services\music-intelligence-v2\benchmark_latency.py
```

El informe se escribe en `benchmarks/music-intelligence-v2/phase3/`.
