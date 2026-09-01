<div align="center">

# JosicoVila.com

**Reproductor 3D · Discografía completa en inglés**

[![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?style=flat-square&logo=php&logoColor=white)](https://www.php.net/)
[![Three.js](https://img.shields.io/badge/Three.js-r168-black?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Apache](https://img.shields.io/badge/Apache-2.4-D22128?style=flat-square&logo=apache&logoColor=white)](https://httpd.apache.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![CI/CD](https://img.shields.io/badge/GitHub_Actions-autodeploy-2088FF?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Live](https://img.shields.io/badge/Live-josicovila.com-4CAF50?style=flat-square&logo=firefox&logoColor=white)](https://josicovila.com)

</div>

---

## ¿Qué es esto?

El código fuente de [josicovila.com](https://josicovila.com) — un reproductor de música inmersivo construido con Three.js. Contiene toda mi discografía en inglés y presenta una **esfera 3D que se deforma en tiempo real al ritmo de la música**, creando una experiencia audiovisual única en el navegador.

---

## Características

- **Esfera 3D reactiva** — malla Three.js que analiza el audio y deforma su geometría con el ritmo y la frecuencia
- **Discografía completa** — todas las pistas en inglés organizadas y reproducibles desde el navegador
- **Sin dependencias de framework** — JavaScript vanilla puro salvo Three.js
- **Reproductor completo** — play/pause, navegación entre pistas y visualización en tiempo real
- **Escena propia por tema** — cada una de las 115 pistas cambia el paisaje del hero y la miniatura del reproductor

---

## Stack técnico

```
Frontend   →  PHP 8.2 (sin framework), HTML5, CSS3, JS vanilla
3D Engine  →  Three.js + WebGL + Web Audio API
Servidor   →  Apache 2.4 + mod_rewrite + mod_headers
Contenedor →  Docker + Docker Compose
CI/CD      →  GitHub Actions → SSH → VPS
```

---

## Estructura del repositorio

```
josicovila.com/
├── app/                        # Código fuente servido por Apache
│   ├── index.php               # Reproductor principal
│   ├── .htaccess               # Routing con mod_rewrite
│   ├── css/                    # Estilos
│   └── js/                     # Lógica del reproductor y esfera 3D
├── data/                       # Archivos de audio (montados como volúmenes)
├── docker/
│   └── apache-vhost.conf       # VirtualHost de Apache
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/
    └── deploy.yml              # Autodeploy al VPS vía SSH
```

> **Nota:** Los archivos de audio no están en el repositorio. Se montan como volúmenes Docker en el servidor y se gestionan por separado.

---

## Arrancar en local

Necesitas **Docker Desktop** instalado.

```bash
# 1. Clona el repositorio
git clone https://github.com/JosicoV/josicovila.com.git
cd josicovila.com

# 2. Levanta el contenedor
docker compose up -d --build

# 3. Abre en el navegador
open http://localhost:8082
```

> El reproductor necesita los volúmenes de audio para funcionar. Sin ellos, la interfaz carga pero no hay pistas disponibles.

### Importar imágenes aprobadas

La aplicación local `music-image-generator/` mantiene los originales y el historial fuera del repositorio web. Después de exportar allí las versiones aprobadas, se publican los WebP y su manifiesto con:

```powershell
.\music-image-generator\.venv\Scripts\python.exe scripts\import_approved_track_images.py
```

El importador exige exactamente 115 pistas, comprueba álbum, orden, título, formato y rutas duplicadas, y escribe los recursos públicos en `app/img/track-scenes/`.
Esta carpeta no se versiona: se copia por `scp` al mismo destino dentro del checkout del VPS antes de desplegar el código que la consume.

---

## Autodeploy

Cada push a `main` lanza el workflow de GitHub Actions:

```
push → main
  └─ SSH al VPS
       ├─ git pull --ff-only
       └─ DOCKER_BUILDKIT=0 docker compose up -d --build
```

Las credenciales del servidor se configuran como **GitHub Secrets** — nunca están en el código.

---

## Licencia

El **código** de este repositorio está bajo licencia [MIT](LICENSE).

El **contenido** (música, letras, imágenes) es © Josico Vila — todos los derechos reservados.
