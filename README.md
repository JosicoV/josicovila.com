# josicovila.es

Official website and interactive 3D world for `josicovila.es`, built with PHP, JavaScript, HTML, CSS, and Vite-generated frontend assets.

This repository has been reorganized to support local development with Docker and to prepare a cleaner migration from shared hosting to a VPS.

## Project structure

```text
.
|-- app/                # Versioned website code and public files
|-- data/               # Persistent, non-versioned heavy assets
|-- docker/             # Apache config for Docker
|-- Dockerfile
|-- docker-compose.yml
|-- .gitignore
|-- README.md
```

## Main areas inside `app/`

- `index.php`: blog and content homepage
- `index-juego.php`: 3D world entry point
- `api/`: PHP endpoints and data structures
- `assets/` and `.vite/`: Vite build output currently used by the site
- `CRISTAL/`, `RELATOS/`, `LIBROS/`, `media/`, `intro/`: site sections and shared assets

## Persistent data moved outside Git

The following directories now live under `data/` and are mounted back into the container at their original public paths:

- `data/cristal-musica` -> `/var/www/html/CRISTAL/musica`
- `data/relatos-audios` -> `/var/www/html/RELATOS/relatos/audios`
- `data/relatos-videos` -> `/var/www/html/RELATOS/relatos/videos`
- `data/relatos-pdf` -> `/var/www/html/RELATOS/relatos/pdf`
- `data/blog-media` -> `/var/www/html/BLOG_media`
- `data/media-videos` -> `/var/www/html/media/videos`
- `data/media-sounds` -> `/var/www/html/media/sounds`
- `data/intro-video` -> `/var/www/html/intro/video`
- `data/intro-mp3` -> `/var/www/html/intro/mp3`
- `data/js-model` -> `/var/www/html/js/model`

This keeps the repository lighter and makes VPS deployments easier, because code and heavy media can be managed separately.

## Run locally

Requirements:

- Docker
- Docker Compose

Start the project:

```bash
docker compose up -d --build
```

Expected local URL:

```text
http://localhost:8081
```

Stop the environment:

```bash
docker compose down
```

## Docker behavior

The container uses:

- Apache + PHP through `php:8.2-apache`
- `.htaccess` rules enabled inside the container
- bind mounts for `app/` and each persistent folder under `data/`

## VPS-oriented deployment

Recommended deployment flow:

1. Clone the repository on the VPS.
2. Restore or copy every required folder inside `data/`.
3. Start the stack with Docker Compose.

This allows future deployments to update code without re-uploading all audio, video, PDF, and 3D model assets.

## Current note

The Docker configuration for this project is already written, but the last local startup attempt failed because Docker Desktop returned an internal engine error (`500`). The repository structure and Compose file are ready; once Docker is healthy again, the stack should be testable locally.
