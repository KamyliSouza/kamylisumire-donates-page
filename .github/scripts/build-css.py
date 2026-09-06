#!/usr/bin/env python3
"""
Gera os bundles CSS usados em produção.

Os arquivos em css/core, css/components e css/pages continuam sendo a fonte
de verdade. Nunca editar css/build/*.css manualmente.

Uso:
    python .github/scripts/build-css.py
    python .github/scripts/build-css.py --check
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[2]

BUNDLES: dict[str, tuple[str, ...]] = {
    "home.css": (
        "css/core/variables.css",
        "css/core/global.css",
        "css/core/navbar.css",
        "css/pages/home.css",
    ),
    "doacoes.css": (
        "css/core/variables.css",
        "css/core/global.css",
        "css/core/navbar.css",
        "css/pages/doacoes.css",
        "css/components/ranking.css",
    ),
    "404.css": (
        "css/core/variables.css",
        "css/core/global.css",
        "css/core/navbar.css",
        "css/pages/404.css",
    ),
}


def minify_css(css: str) -> str:
    """
    Minificação conservadora e determinística.

    - remove comentários CSS;
    - preserva strings;
    - normaliza whitespace fora de strings;
    - mantém espaços quando fazem parte da gramática, como em calc().
    """
    out: list[str] = []
    i = 0
    quote: str | None = None
    escape = False
    pending_space = False

    punctuation = set("{}:;,>+~()")

    while i < len(css):
        char = css[i]

        if quote is not None:
            out.append(char)

            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == quote:
                quote = None

            i += 1
            continue

        if char in ("'", '"'):
            if pending_space and out and out[-1] not in punctuation:
                out.append(" ")
            pending_space = False
            quote = char
            out.append(char)
            i += 1
            continue

        if char == "/" and i + 1 < len(css) and css[i + 1] == "*":
            end = css.find("*/", i + 2)
            if end == -1:
                raise ValueError("Comentário CSS não fechado")
            i = end + 2
            pending_space = True
            continue

        if char.isspace():
            pending_space = True
            i += 1
            continue

        if char in punctuation:
            if out and out[-1] == " ":
                out.pop()
            out.append(char)
            pending_space = False
            i += 1
            continue

        if pending_space and out and out[-1] not in punctuation:
            out.append(" ")

        pending_space = False
        out.append(char)
        i += 1

    result = "".join(out).strip()

    # Espaço imediatamente depois de pontuação não é necessário.
    # Não mexemos em operadores matemáticos de calc(), como + e -.
    for token in ("{", "}", ":", ";", ",", "(", ")"):
        result = result.replace(token + " ", token)

    return result + "\n"


def render_bundle(name: str, sources: tuple[str, ...]) -> str:
    missing = [
        source
        for source in sources
        if not (ROOT / source).is_file()
    ]

    if missing:
        raise FileNotFoundError(
            "Fontes CSS ausentes: " + ", ".join(missing)
        )

    combined = "\n".join(
        (ROOT / source).read_text(encoding="utf-8")
        for source in sources
    )

    compiled = minify_css(combined)
    digest = hashlib.sha256(compiled.encode("utf-8")).hexdigest()

    source_lines = "\n".join(
        f" * - {source}"
        for source in sources
    )

    header = (
        "/*\n"
        " * ARQUIVO GERADO — NÃO EDITAR MANUALMENTE.\n"
        " * Execute: python .github/scripts/build-css.py\n"
        f" * Bundle: css/build/{name}\n"
        " * Fontes:\n"
        f"{source_lines}\n"
        f" * SHA-256 do CSS compilado: {digest}\n"
        " */\n"
    )

    return header + compiled


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="não grava; falha se algum bundle estiver ausente/desatualizado",
    )
    args = parser.parse_args()

    build_dir = ROOT / "css/build"
    build_dir.mkdir(parents=True, exist_ok=True)

    stale: list[str] = []

    for name, sources in BUNDLES.items():
        destination = build_dir / name
        expected = render_bundle(name, sources)

        if args.check:
            current = (
                destination.read_text(encoding="utf-8")
                if destination.exists()
                else None
            )

            if current != expected:
                stale.append(str(destination.relative_to(ROOT)))
            else:
                print(f"✓ Bundle atualizado: {destination.relative_to(ROOT)}")
            continue

        destination.write_text(expected, encoding="utf-8")
        print(f"✓ Gerado: {destination.relative_to(ROOT)}")

    if stale:
        print(
            "\nERRO: bundles CSS ausentes ou desatualizados:\n- "
            + "\n- ".join(stale),
            file=sys.stderr,
        )
        print(
            "\nExecute `python .github/scripts/build-css.py` "
            "e faça commit dos arquivos em css/build/.",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
