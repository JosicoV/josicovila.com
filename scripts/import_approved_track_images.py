from __future__ import annotations

import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GENERATOR_ROOT = ROOT / "music-image-generator"
SOURCE_ROOT = GENERATOR_ROOT / "exports" / "approved"
SOURCE_MANIFEST = SOURCE_ROOT / "manifest.json"
SOURCE_CATALOG = GENERATOR_ROOT / "data" / "catalog_source.json"
DESTINATION = ROOT / "app" / "img" / "track-scenes"
DESTINATION_MANIFEST = DESTINATION / "manifest.json"


def normalized_title(value: str) -> str:
    return " ".join(value.casefold().split())


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    export = load_json(SOURCE_MANIFEST)
    catalog = load_json(SOURCE_CATALOG)
    exported_albums = {
        normalized_title(album["title"]): album for album in export.get("albums", [])
    }

    expected: list[dict] = []
    for album in catalog:
        exported_album = exported_albums.get(normalized_title(album["nombre"]))
        if exported_album is None:
            raise RuntimeError(f"Album absent from approved export: {album['nombre']}")

        exported_tracks = exported_album.get("tracks", [])
        if len(exported_tracks) != len(album["canciones"]):
            raise RuntimeError(
                f"Track count mismatch for {album['nombre']}: "
                f"catalog={len(album['canciones'])}, export={len(exported_tracks)}"
            )

        for track_number, (track, exported_track) in enumerate(
            zip(album["canciones"], exported_tracks, strict=True), start=1
        ):
            if normalized_title(track["nombre"]) != normalized_title(exported_track["title"]):
                raise RuntimeError(
                    f"Track mismatch in {album['nombre']} #{track_number}: "
                    f"catalog={track['nombre']!r}, export={exported_track['title']!r}"
                )
            source = SOURCE_ROOT / exported_track["image"]
            if not source.is_file():
                raise FileNotFoundError(source)
            with Image.open(source) as image:
                if image.format != "WEBP":
                    raise RuntimeError(f"Expected WebP image: {source}")
                width, height = image.size
            expected.append(
                {
                    "audio": track["ruta"].replace("\\", "/"),
                    "albumCode": album["nombrejs"],
                    "songCode": track["nombrejs"],
                    "album": album["nombre"],
                    "title": track["nombre"],
                    "image": f"img/track-scenes/{source.name}",
                    "filename": source.name,
                    "generationId": exported_track["generation_id"],
                    "width": width,
                    "height": height,
                    "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                    "source": source,
                }
            )

    if len(expected) != 115:
        raise RuntimeError(f"Expected 115 approved tracks, found {len(expected)}")
    audio_paths = [item["audio"].casefold() for item in expected]
    if len(set(audio_paths)) != len(audio_paths):
        raise RuntimeError("Duplicate audio path in track image manifest")

    DESTINATION.mkdir(parents=True, exist_ok=True)
    expected_files = {item["filename"] for item in expected}
    stale_files = {
        path.name for path in DESTINATION.glob("*.webp") if path.name not in expected_files
    }
    if stale_files:
        raise RuntimeError(
            "Unexpected WebP files already exist in destination: "
            + ", ".join(sorted(stale_files))
        )

    for item in expected:
        shutil.copy2(item.pop("source"), DESTINATION / item["filename"])

    manifest = {
        "schemaVersion": 1,
        "generatedAt": export.get("generated_at"),
        "trackCount": len(expected),
        "tracks": expected,
    }
    DESTINATION_MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Imported {len(expected)} approved track images into {DESTINATION.relative_to(ROOT)}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
