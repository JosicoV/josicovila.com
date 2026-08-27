# Despliegue del hero de búsqueda en el VPS

Procedimiento manual, pensado para poder parar y volver atrás en cualquier
punto. La idea es **probar la rama en el VPS antes de tocar `main`**, porque un
push a `main` dispara el workflow y ya no hay marcha atrás cómoda.

Sustituye `USUARIO@HOST` por los valores de tus secrets de GitHub.

---

## 0. Comprobar el swap

```bash
free -h    # la fila Swap debe mostrar 4,0Gi
swapon --show
```

Si `swapon --show` no devuelve nada, el swap no está activo: `sudo swapon /swapfile`.

---

## 1. Subir los dos artefactos que no se pueden descargar

Todo lo demás (MuQ, OPUS-MT) lo baja el propio VPS en el paso 4. Estos dos no:
el logo no es público y el índice está generado a partir de tu música.

Desde la raíz del repositorio, en tu máquina. **Un comando por línea**: si
usas PowerShell, las barras `\` de continuación no funcionan y parte el
comando en trozos.

`/opt/containers/josicovila-com/` es de root, así que los directorios se crean
con `sudo` y se ceden a tu usuario. Así las siguientes veces que regeneres el
índice podrás subirlo sin `sudo`; los contenedores corren como root y siguen
leyéndolo sin problema.

```bash
ssh -t USUARIO@HOST "sudo mkdir -p /opt/containers/josicovila-com/data/3Dassets /opt/containers/josicovila-com/data/music-intelligence-v2/index && sudo chown -R USUARIO:USUARIO /opt/containers/josicovila-com/data/3Dassets /opt/containers/josicovila-com/data/music-intelligence-v2"
```

```bash
scp data/3Dassets/logo3D.glb USUARIO@HOST:/opt/containers/josicovila-com/data/3Dassets/
```

```bash
scp data/music-intelligence-v2/index/index.npz data/music-intelligence-v2/index/index_meta.json USUARIO@HOST:/opt/containers/josicovila-com/data/music-intelligence-v2/index/
```

Son ~5 MB. Cuelgan del directorio padre, fuera del repositorio, así que
`git pull` no los tocará nunca.

---

## 2. Llevar el código al VPS sin desplegar

Primero publica la rama desde tu máquina (esto **no** dispara el workflow, que
sólo escucha `main` y `master`):

```bash
git push -u origin feature/music-intelligence-v2
```

Y en el VPS, cambia el repositorio a esa rama a mano:

```bash
cd /opt/containers/josicovila-com/repo
git fetch origin
git checkout feature/music-intelligence-v2
```

Todavía no se ha reconstruido nada: la web sigue sirviendo la imagen anterior.

---

## 3. Aplicar los cambios al compose de producción

El compose vive fuera del repositorio, así que hay que editarlo a mano. Copia
de seguridad primero:

```bash
cd /opt/containers/josicovila-com
cp docker-compose.yml docker-compose.yml.bak
```

Los cambios están en `repo/deploy/vps-docker-compose.reference.yml`. Son tres:

1. En `web`, añadir el montaje del logo:
   `- ./data/3Dassets:/var/www/html/data/3Dassets`
2. En `web`, añadir `environment: MUSIC_SEARCH_URL: http://music-search:8100`
   y meterlo también en la red `interna`.
3. Añadir el servicio `music-search`, la red `interna` y el volumen `hf-cache`.

Verifica que el YAML es válido antes de seguir:

```bash
docker compose config >/dev/null && echo "compose correcto"
```

---

## 4. Descargar los modelos (una sola vez, ~5 GB)

Construye la imagen del servicio y lanza la descarga. Es el paso largo:
la imagen tarda unos minutos y los modelos otro tanto.

```bash
cd /opt/containers/josicovila-com
docker compose build music-search

docker compose run --rm \
  -e HF_HUB_OFFLINE=0 -e TRANSFORMERS_OFFLINE=0 \
  music-search python fetch_models.py
```

Debe terminar con `Modelos listos`. A partir de aquí el servicio arranca
siempre offline, con las revisiones fijadas.

---

## 5. Levantar todo

```bash
docker compose up -d --build
```

El servicio tarda ~60 s en estar listo (carga MuQ y OPUS). Mientras tanto la
web funciona con búsqueda literal, no hay pantalla rota.

---

## 6. Verificar

```bash
# el servicio se ve sano
docker compose exec music-search python -c \
  "import urllib.request,json; print(json.load(urllib.request.urlopen('http://127.0.0.1:8100/health')))"

# NO debe publicar puertos: la salida tiene que estar vacía
docker compose port music-search 8100 || echo "sin puerto publicado, correcto"

# el logo 3D se sirve
curl -sI https://josicovila.com/data/3Dassets/logo3D.glb | head -1

# la búsqueda semántica responde de punta a punta
curl -s -X POST https://josicovila.com/includes/ajax.semanticSearch.php \
     -d "query=musica epica con coro&limit=3"

# memoria: el servicio debe rondar los 3,9 GB
free -h
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}'
```

En la web, comprueba a ojo: el logo dentro de la esfera, una búsqueda en
español con su aviso *Searched in English as…*, y que al pulsar un resultado
suena sin bajar al álbum.

---

## 7. Consolidar en `main`

Sólo cuando lo anterior esté verificado:

```bash
# en tu máquina
git checkout main
git merge feature/music-intelligence-v2
git push origin main
```

El workflow hará `git checkout main` en el VPS y reconstruirá. Es el mismo
código que ya estabas sirviendo, así que no debería cambiar nada.

---

## Volver atrás

En cualquier momento antes del paso 7:

```bash
cd /opt/containers/josicovila-com
cp docker-compose.yml.bak docker-compose.yml
cd repo && git checkout main
cd .. && docker compose up -d --build
```

La web vuelve al estado anterior. Los artefactos de `data/` pueden quedarse
donde están: no molestan y ahorran repetir el paso 1.

Si el problema es sólo el servicio de búsqueda, basta con pararlo: la web
degrada sola a búsqueda literal.

```bash
docker compose stop music-search
```
