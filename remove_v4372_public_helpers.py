#!/usr/bin/env python3
"""
V43.7.2 — remove os JSON Helpers do repositório público.

Execute a partir da raiz do repositório:

    python remove_v4372_public_helpers.py

O script remove SOMENTE os arquivos conhecidos da V43.6.2/V43.7.1.
Arquivos inesperados dentro de tools/json-helpers/ não são apagados.
"""

from __future__ import annotations

from pathlib import Path
import shutil
import sys


ROOT = Path.cwd()

HELPER_ROOT = ROOT / "tools/json-helpers"

KNOWN_FILES = (
    "README.md",
    "agenda.html",
    "creditos.html",
    "doacoes.html",
    "footer.html",
    "helper-core.js",
    "helper.css",
    "hero.html",
    "home-doacoes.html",
    "index.html",
    "lives.html",
    "ranking.html",
    "regras.html",
    "schemas.js",
)

ROOT_MARKERS = (
    "index.html",
    "data/content/lives.json",
    ".github/scripts/validate-content.py",
)


def fail(message: str) -> int:
    print(f"ERRO: {message}", file=sys.stderr)
    return 1


def main() -> int:
    missing_markers = [
        marker
        for marker in ROOT_MARKERS
        if not (ROOT / marker).exists()
    ]

    if missing_markers:
        return fail(
            "execute este script na raiz do repositório. "
            "Marcadores ausentes: "
            + ", ".join(missing_markers)
        )

    if not HELPER_ROOT.exists():
        print(
            "OK: tools/json-helpers/ já não existe. "
            "Nenhuma remoção necessária."
        )
        return 0

    removed = []

    for filename in KNOWN_FILES:
        path = HELPER_ROOT / filename

        if path.is_file() or path.is_symlink():
            path.unlink()
            removed.append(
                str(path.relative_to(ROOT))
            )
        elif path.exists():
            return fail(
                "caminho conhecido não é arquivo: "
                + str(path.relative_to(ROOT))
            )

    unexpected = sorted(
        path.relative_to(HELPER_ROOT)
        for path in HELPER_ROOT.rglob("*")
        if path.is_file() or path.is_symlink()
    )

    if unexpected:
        print(
            "ATENÇÃO: arquivos inesperados foram preservados:",
            file=sys.stderr,
        )

        for rel in unexpected:
            print(
                f"  - tools/json-helpers/{rel}",
                file=sys.stderr,
            )

        print(
            "\nOs arquivos conhecidos foram removidos, "
            "mas tools/json-helpers/ foi mantido para não apagar "
            "conteúdo que não pertence ao hotfix.",
            file=sys.stderr,
        )

        return 2

    # Remove empty directories only.
    for directory in sorted(
        [
            path
            for path in HELPER_ROOT.rglob("*")
            if path.is_dir()
        ],
        key=lambda path: len(path.parts),
        reverse=True,
    ):
        try:
            directory.rmdir()
        except OSError:
            pass

    try:
        HELPER_ROOT.rmdir()
    except OSError:
        return fail(
            "tools/json-helpers/ não ficou vazio após a remoção."
        )

    tools_root = ROOT / "tools"

    if tools_root.exists():
        try:
            tools_root.rmdir()
        except OSError:
            # Preserve unrelated tools.
            pass

    if removed:
        print("Arquivos removidos:")

        for rel in removed:
            print(f"  - {rel}")

    print(
        "\nOK: JSON Helpers removidos do repositório público."
    )

    print(
        "A cópia privada deve permanecer somente no projeto "
        "Cloudflare Pages protegido por Access."
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
