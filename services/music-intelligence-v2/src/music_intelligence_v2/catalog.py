from __future__ import annotations

import html
import re
import unicodedata
from pathlib import Path
from typing import Any


class PhpArrayParseError(ValueError):
    pass


class PhpArrayParser:
    def __init__(self, source: str) -> None:
        self.source = source
        self.position = 0

    def parse_assignment(self, variable: str) -> Any:
        match = re.search(rf"\${re.escape(variable)}\s*=", self.source)
        if not match:
            raise PhpArrayParseError(f"PHP variable ${variable} not found")
        self.position = match.end()
        value = self._parse_value()
        return value

    def _skip_ignored(self) -> None:
        while self.position < len(self.source):
            if self.source[self.position].isspace():
                self.position += 1
            elif self.source.startswith("//", self.position) or self.source.startswith("#", self.position):
                newline = self.source.find("\n", self.position)
                self.position = len(self.source) if newline < 0 else newline + 1
            elif self.source.startswith("/*", self.position):
                end = self.source.find("*/", self.position + 2)
                if end < 0:
                    raise PhpArrayParseError("Unterminated PHP block comment")
                self.position = end + 2
            else:
                break

    def _parse_value(self) -> Any:
        self._skip_ignored()
        if self.position >= len(self.source):
            raise PhpArrayParseError("Unexpected end of PHP source")
        character = self.source[self.position]
        if character == "[":
            return self._parse_array()
        if character in {'"', "'"}:
            return self._parse_string(character)
        raise PhpArrayParseError(f"Unsupported token at offset {self.position}")

    def _parse_string(self, quote: str) -> str:
        self.position += 1
        result = []
        escapes = {"n": "\n", "r": "\r", "t": "\t", "\\": "\\", quote: quote, "$": "$"}
        while self.position < len(self.source):
            character = self.source[self.position]
            self.position += 1
            if character == quote:
                return "".join(result)
            if character == "\\" and self.position < len(self.source):
                escaped = self.source[self.position]
                self.position += 1
                result.append(escapes.get(escaped, f"\\{escaped}"))
            else:
                result.append(character)
        raise PhpArrayParseError("Unterminated PHP string")

    def _parse_array(self) -> list[Any] | dict[str, Any]:
        self.position += 1
        sequential: list[Any] = []
        associative: dict[str, Any] = {}
        mode = None
        while True:
            self._skip_ignored()
            if self.position >= len(self.source):
                raise PhpArrayParseError("Unterminated PHP array")
            if self.source[self.position] == "]":
                self.position += 1
                return associative if mode == "associative" else sequential

            first = self._parse_value()
            self._skip_ignored()
            if self.source.startswith("=>", self.position):
                if mode == "sequential" or not isinstance(first, str):
                    raise PhpArrayParseError("Mixed or non-string PHP array key")
                mode = "associative"
                self.position += 2
                associative[first] = self._parse_value()
            else:
                if mode == "associative":
                    raise PhpArrayParseError("Mixed PHP arrays are unsupported")
                mode = "sequential"
                sequential.append(first)

            self._skip_ignored()
            if self.position < len(self.source) and self.source[self.position] == ",":
                self.position += 1
                continue
            if self.position < len(self.source) and self.source[self.position] == "]":
                continue
            raise PhpArrayParseError(f"Expected comma or closing bracket at offset {self.position}")


def text_from_html(value: str) -> str:
    without_tags = re.sub(r"<[^>]+>", " ", value)
    return " ".join(html.unescape(without_tags).split())


def route_track_id(route: str) -> str:
    stem = Path(route).with_suffix("").as_posix()
    normalized = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    if not slug:
        raise ValueError(f"Unable to create track id from route: {route}")
    return slug


def build_catalog(php_path: Path, audio_root: Path, repository_root: Path) -> dict[str, Any]:
    albums = PhpArrayParser(php_path.read_text(encoding="utf-8-sig")).parse_assignment("disco")
    if not isinstance(albums, list):
        raise PhpArrayParseError("$disco must be a sequential array")

    audio_files = sorted(audio_root.rglob("*.mp3"))
    by_casefold = {
        path.relative_to(audio_root).as_posix().casefold(): path
        for path in audio_files
    }
    tracks = []
    referenced_paths = set()
    for album_index, album in enumerate(albums, 1):
        if not isinstance(album, dict) or not isinstance(album.get("canciones"), list):
            raise PhpArrayParseError(f"Invalid album entry at position {album_index}")
        for track_index, track in enumerate(album["canciones"], 1):
            if not isinstance(track, dict):
                raise PhpArrayParseError(f"Invalid track entry in album {album_index}")
            route = str(track["ruta"]).replace("\\", "/")
            actual_path = by_casefold.get(route.casefold())
            if actual_path is None:
                raise FileNotFoundError(f"Catalog route has no MP3: {route}")
            relative_audio = actual_path.relative_to(repository_root).as_posix()
            referenced_paths.add(actual_path.resolve())
            tracks.append(
                {
                    "track_id": route_track_id(route),
                    "title": track["nombre"],
                    "track_code": track.get("nombrejs", ""),
                    "description": text_from_html(track.get("texto", "")),
                    "album": album["nombre"],
                    "album_code": album.get("nombrejs", ""),
                    "album_cover": album.get("imagen", ""),
                    "catalog_order": len(tracks) + 1,
                    "album_track_number": track_index,
                    "web_audio_route": route,
                    "audio_path": relative_audio,
                    "audio_bytes": actual_path.stat().st_size,
                }
            )

    track_ids = [track["track_id"] for track in tracks]
    routes = [track["web_audio_route"].casefold() for track in tracks]
    if len(track_ids) != len(set(track_ids)):
        raise ValueError("Generated track ids are not unique")
    if len(routes) != len(set(routes)):
        raise ValueError("Catalog contains duplicate audio routes")
    orphans = [path.relative_to(repository_root).as_posix() for path in audio_files if path.resolve() not in referenced_paths]
    if orphans:
        raise ValueError(f"MP3 files missing from PHP catalog: {', '.join(orphans)}")

    return {
        "schema_version": 1,
        "source": php_path.relative_to(repository_root).as_posix(),
        "audio_root": audio_root.relative_to(repository_root).as_posix(),
        "album_count": len(albums),
        "track_count": len(tracks),
        "tracks": tracks,
    }


def extract_english_queries(markdown_path: Path) -> list[dict[str, str]]:
    source = markdown_path.read_text(encoding="utf-8-sig")
    try:
        block = source.split("# Core English queries", 1)[1].split("# Spanish input benchmark", 1)[0]
    except IndexError as error:
        raise ValueError("English query section not found") from error
    category = "uncategorized"
    queries = []
    for line in block.splitlines():
        heading = re.fullmatch(r"##\s+(.+)", line.strip())
        if heading:
            category = heading.group(1).strip()
            continue
        match = re.fullmatch(r"\d+\.\s+`(.+)`", line.strip())
        if match:
            queries.append(
                {
                    "query_id": f"en{len(queries) + 1:03d}",
                    "text": match.group(1),
                    "category": category,
                    "language": "en",
                }
            )
    if len(queries) != 60:
        raise ValueError(f"Expected 60 English queries, found {len(queries)}")
    return queries


def extract_spanish_queries(markdown_path: Path) -> list[dict[str, str]]:
    source = markdown_path.read_text(encoding="utf-8-sig")
    try:
        block = source.split("# Spanish input benchmark", 1)[1].split("## Translation test", 1)[0]
    except IndexError as error:
        raise ValueError("Spanish query section not found") from error
    queries = []
    for line in block.splitlines():
        match = re.fullmatch(r"(\d+)\.\s+`(.+)`", line.strip())
        if match:
            queries.append(
                {
                    "query_id": f"es{int(match.group(1)):03d}",
                    "text": match.group(2),
                    "category": "Spanish input benchmark",
                    "language": "es",
                }
            )
    if len(queries) != 10:
        raise ValueError(f"Expected 10 Spanish queries, found {len(queries)}")
    return queries
