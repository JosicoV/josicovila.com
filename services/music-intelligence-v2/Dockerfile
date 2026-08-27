# Servicio de búsqueda musical — imagen de ejecución (CPU).
#
# La estructura de directorios dentro del contenedor imita a la del repositorio
# a propósito: serve.py deduce la raíz con `Path(__file__).parents[2]`, así que
# colocando el código en /srv/services/music-intelligence-v2 todas las rutas
# por defecto (índice, traductor) funcionan sin pasar un solo argumento.

FROM python:3.11-slim

# libsndfile lo pide soundfile al importarse, aunque en ejecución no se abra
# ningún audio: la cadena de imports de muq/librosa pasa por ahí.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libsndfile1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/services/music-intelligence-v2

# Las dependencias van antes que el código para que un cambio en el servicio
# no invalide la capa de pip, que es la cara de reconstruir.
COPY requirements/torch-cpu.txt requirements/base.txt requirements/
RUN pip install --no-cache-dir -r requirements/torch-cpu.txt \
 && pip install --no-cache-dir -r requirements/base.txt

COPY src/ src/
COPY config/ config/
COPY serve.py build_index.py fetch_models.py ./

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/models/hf \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1

# Sin EXPOSE público: el servicio vive en la red interna del compose y sólo
# lo consume el contenedor web. Nunca se publica un puerto al exterior.
CMD ["python", "serve.py", "--host", "0.0.0.0", "--port", "8100", "--device", "cpu"]
