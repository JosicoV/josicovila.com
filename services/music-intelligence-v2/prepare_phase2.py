from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from music_intelligence_v2.catalog import build_catalog, extract_english_queries, extract_spanish_queries


DEFAULT_OUTPUT_ROOT = REPOSITORY_ROOT / "benchmarks" / "music-intelligence-v2" / "phase2"


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare the isolated Phase 2 full-catalog inputs")
    parser.add_argument(
        "--catalog-source",
        type=Path,
        default=REPOSITORY_ROOT / "app" / "includes" / "musica.estructura-datos.php",
    )
    parser.add_argument("--audio-root", type=Path, default=REPOSITORY_ROOT / "data" / "musica")
    parser.add_argument("--query-source", type=Path, default=REPOSITORY_ROOT / "docs" / "SEARCH_BENCHMARK_V2.md")
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    args = parser.parse_args()

    catalog = build_catalog(args.catalog_source, args.audio_root, REPOSITORY_ROOT)
    queries = extract_english_queries(args.query_source)
    spanish_queries = extract_spanish_queries(args.query_source)
    write_json(args.output_root / "full_catalog.json", catalog)
    write_json(args.output_root / "queries_en.json", queries)
    write_json(args.output_root / "queries_es.json", spanish_queries)
    report = "\n".join(
        [
            "# Phase 2 preparation",
            "",
            f"- Albums: {catalog['album_count']}.",
            f"- Tracks: {catalog['track_count']}.",
            f"- English validation queries: {len(queries)}.",
            f"- Spanish validation queries: {len(spanish_queries)}.",
            "- Source audio: referenced in place; no MP3 was copied or modified.",
            "- Production code: read only; no endpoint, frontend or Docker change.",
            "",
        ]
    )
    (args.output_root / "PREPARATION.md").write_text(report, encoding="utf-8")
    print(f"Prepared {catalog['track_count']} tracks and {len(queries)} queries in {args.output_root}")


if __name__ == "__main__":
    main()
