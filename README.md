# josicovila.com

Official website for `josicovila.com`, built with PHP, JavaScript, HTML, and CSS.

This repository has been reorganized to make local testing easier with Docker and to prepare a smoother migration from shared hosting to a VPS.

## Project structure

```text
.
|-- app/                # Website source code
|-- data/               # Persistent, non-versioned data
|   `-- musica/         # MP3 files and other heavy assets
|-- docker/             # Apache config for Docker
|-- Dockerfile
|-- docker-compose.yml
|-- .gitignore
|-- README.md
```

## Run locally

Requirements:

- Docker
- Docker Compose

Start the project:

```bash
docker compose up -d --build
```

The site will be available at:

```text
http://localhost:8080
```

Stop the environment:

```bash
docker compose down
```

## Docker mounts

The container serves:

- `./app` as `/var/www/html`
- `./data/musica` as `/var/www/html/musica`

This keeps code and persistent media separated:

- source code and configuration go into Git
- heavy audio assets stay outside the repository

## About `data/musica`

The `data/musica` directory contains the audio files and other large assets used by the website.

It is excluded from version control through [`.gitignore`](./.gitignore), so it is not pushed to GitHub.

Local path:

```text
data/musica/
```

The VPS should follow the same structure so deployment stays simple and predictable.

## VPS-oriented deployment

Planned workflow:

1. Clone this repository on the VPS.
2. Copy `data/musica` to the server using SFTP, `scp`, or `rsync`.
3. Start the containers with Docker Compose.

This way, future deployments only update code and configuration without re-uploading the full music library every time.

## Notes

- The app runs on Apache + PHP using the `php:8.2-apache` image.
- The `.htaccess` file is active inside the container.
- HTTPS is not forced on `localhost`, but the production redirect behavior is preserved.
