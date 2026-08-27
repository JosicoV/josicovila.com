"""Descarga los modelos fijados en los registros, una sola vez.

Se ejecuta a mano al preparar una máquina nueva:

    docker compose run --rm --env HF_HUB_OFFLINE=0 --env TRANSFORMERS_OFFLINE=0 \
        music-search python fetch_models.py

Después el servicio arranca siempre en modo offline: las revisiones están
clavadas, así que lo descargado es reproducible y no vuelve a salir a la red.

Descarga:
  - MuQ-MuLan y sus dependencias, a la caché de HuggingFace (HF_HOME).
  - OPUS-MT es->en, al directorio local que espera el registro de traducción.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))


def leer(ruta: Path):
    return json.loads(ruta.read_text(encoding="utf-8-sig"))


def descargar_traductor() -> Path:
    from transformers import MarianMTModel, MarianTokenizer

    config = leer(SERVICE_ROOT / "config" / "translation_registry.json")["opus_es_en"]
    destino = (REPOSITORY_ROOT / config["local_path"]).resolve()
    destino.mkdir(parents=True, exist_ok=True)

    print(f"OPUS-MT {config['checkpoint']} @ {config['revision']} -> {destino}")
    tokenizer = MarianTokenizer.from_pretrained(config["checkpoint"], revision=config["revision"])
    model = MarianMTModel.from_pretrained(config["checkpoint"], revision=config["revision"])
    tokenizer.save_pretrained(destino)
    model.save_pretrained(destino)

    # El repositorio original arrastra pesos de TensorFlow y un .bin que no se
    # usan (~600 MB). Sólo se descartan si de verdad hay safetensors que los
    # sustituya: sin esa comprobación se podría dejar el modelo sin pesos.
    if (destino / "model.safetensors").is_file():
        for sobrante in ("tf_model.h5", "pytorch_model.bin"):
            archivo = destino / sobrante
            if archivo.exists():
                archivo.unlink()
                print(f"  descartado {sobrante}")
    else:
        print("  aviso: no hay model.safetensors, se conservan los pesos originales")
    return destino


def descargar_recuperador() -> None:
    from muq import MuQMuLan

    config = leer(SERVICE_ROOT / "config" / "model_registry.json")["muq_mulan"]
    print(f"MuQ-MuLan {config['checkpoint']} @ {config['revision']} -> {os.environ.get('HF_HOME', '~/.cache/huggingface')}")
    modelo = MuQMuLan.from_pretrained(config["checkpoint"], revision=config["revision"])

    # La torre de texto crea su tokenizer XLM-R de forma perezosa; forzamos la
    # descarga ahora para que el primer arranque offline no falle buscándolo.
    codificador = modelo.mulan_module.text
    from transformers import AutoTokenizer

    AutoTokenizer.from_pretrained(
        codificador.model_name,
        trust_remote_code=True,
        cache_dir=codificador.hf_hub_cache_dir,
    )
    print("  torre de texto lista")


def main() -> int:
    if os.environ.get("HF_HUB_OFFLINE") == "1" or os.environ.get("TRANSFORMERS_OFFLINE") == "1":
        print(
            "El modo offline está activo: no se puede descargar nada.\n"
            "Vuelve a lanzarlo con HF_HUB_OFFLINE=0 y TRANSFORMERS_OFFLINE=0.",
            file=sys.stderr,
        )
        return 1

    descargar_traductor()
    descargar_recuperador()
    print("\nModelos listos. El servicio ya puede arrancar en modo offline.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
