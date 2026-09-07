#!/usr/bin/env python3
"""Finaliza o saneamento V44 após sobrepor o ZIP na raiz do repositório.

Ações:
- adiciona as referências sem versão no index.html;
- normaliza o fallback do CTA para "Apoiar";
- remove somente resíduos conhecidos/listados;
- remove somente chaves legadas conhecidas de lives.json;
- executa a validação V44.

Não altera vídeos editoriais, Worker, ranking, agenda ou credenciais.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

REMOVE_FILES = (
    "V43-7-HOTFIX.txt",
    "V43-7-1-HOTFIX.txt",
    "V43-7-2-HOTFIX.txt",
    "V43-7-REMOVER.txt",
    "remove_v4372_public_helpers.py",
    "css/pages/v43-7-3.css",
    "js/pages/home/v43-7-3.js",
    "assets/avatar.png",
    "assets/favicon.png",
    "assets/fundo.png",
    "assets/preview.png",
)

REMOVE_DOCS = (
    "docs/SANEAMENTO-V28.md",
    "docs/V29-LINKS-EXTERNOS.md",
    "docs/V30-SOCIAL-PREVIEW.md",
    "docs/V31-SEO-MIGRACAO.md",
    "docs/V32-PREVIEW-NOINDEX.md",
    "docs/V33-ESTABILIZACAO-POS-MIGRACAO.md",
    "docs/V34-PERFORMANCE-WEBP.md",
    "docs/V35-BLUR-ADAPTATIVO.md",
    "docs/V36-PERFORMANCE-ADAPTATIVA.md",
    "docs/V37-ENTRADA-SUAVE.md",
    "docs/V38-MOBILE-AVIF-CAMINHO-CRITICO.md",
    "docs/V39-1-HOTFIX-DOC-CI.md",
    "docs/V39-PERFORMANCE-LCP-AGENDA.md",
    "docs/V40-AUDITORIA.md",
    "docs/V41-FONTES-TRANSICOES.md",
    "docs/V42-CONFIGURACOES-LOADER.md",
    "docs/V43-3-RITMO-CARDS.md",
    "docs/V43-4-BORDA-LIVES.md",
    "docs/V43-5-ALINHAMENTO-CARROSSEIS.md",
    "docs/V43-6-1-LIVES-MANUAIS.md",
    "docs/V43-6-2-JSON-HELPERS.md",
    "docs/V43-6-CONFORMIDADE-YOUTUBE.md",
    "docs/V43-7-1-ESTABILIZACAO.md",
    "docs/V43-7-2-HELPERS-PRIVADOS.md",
    "docs/V43-7-ASSETS-CLOUDFLARE-PAGES.md",
    "docs/V43-YOUTUBE-EMBED.md",
)

LEGACY_LIVES_KEYS = (
    "playlistId",
    "mensagemCarregando",
    "mensagemSemPlaylist",
    "mensagemErro",
    "modalTitulo",
)


def locate_root() -> Path:
    candidates = [Path.cwd().resolve(), Path(__file__).resolve().parent]
    seen = set()

    for candidate in candidates:
        for root in (candidate, *candidate.parents):
            if root in seen:
                continue
            seen.add(root)

            if (
                (root / "index.html").is_file()
                and (root / "CNAME").is_file()
                and (root / "js/core/config.js").is_file()
            ):
                cname = (root / "CNAME").read_text(encoding="utf-8").strip()
                if cname == "kamylisumire.com":
                    return root

    raise SystemExit(
        "Raiz do repositório não encontrada. "
        "Extraia o ZIP na raiz de kamylisumire-donates-page."
    )


def ensure_v44_files(root: Path) -> None:
    required = (
        "js/pages/home/home-interactions.js",
        "css/components/home-interactions.css",
        "docs/ARQUITETURA.md",
        "docs/SANEAMENTO-V44.md",
        ".github/scripts/validate-content.py",
    )
    missing = [rel for rel in required if not (root / rel).is_file()]
    if missing:
        raise SystemExit(
            "Arquivos V44 não foram sobrepostos antes da limpeza: "
            + ", ".join(missing)
        )


def patch_index(root: Path) -> bool:
    path = root / "index.html"
    text = path.read_text(encoding="utf-8")
    original = text

    css_ref = '<link rel="stylesheet" href="css/components/home-interactions.css">'
    if css_ref not in text:
        anchor = '<link rel="stylesheet" href="css/components/lives.css">'
        if anchor not in text:
            raise RuntimeError("Âncora de CSS não encontrada em index.html.")
        text = text.replace(anchor, anchor + "\n    " + css_ref, 1)

    js_ref = '<script src="js/pages/home/home-interactions.js"></script>'
    if js_ref not in text:
        anchor = '<script src="js/pages/home/lives.js"></script>'
        if anchor not in text:
            raise RuntimeError("Âncora de JS não encontrada em index.html.")
        text = text.replace(anchor, anchor + "\n    " + js_ref, 1)

    pattern = re.compile(
        r'(<a\b[^>]*\bid="homeDonationButton"[^>]*>)(.*?)(</a>)',
        re.I | re.S,
    )
    match = pattern.search(text)
    if not match:
        raise RuntimeError('CTA id="homeDonationButton" não encontrado.')

    body = match.group(2)
    if "Apoiar" not in re.sub(r"<[^>]+>", "", body):
        indent_match = re.search(r"\n([ \t]+)\S", body)
        indent = indent_match.group(1) if indent_match else "                "
        replacement = f"\n{indent}Apoiar\n            "
        text = text[: match.start(2)] + replacement + text[match.end(2) :]

    if text != original:
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def clean_lives_json(root: Path) -> list[str]:
    path = root / "data/content/lives.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError("lives.json não é objeto JSON.")

    removed = []
    for key in LEGACY_LIVES_KEYS:
        if key in data:
            data.pop(key)
            removed.append(key)

    if removed:
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
            newline="\n",
        )
    return removed


def remove_known_residue(root: Path) -> list[str]:
    removed = []
    for rel in (*REMOVE_FILES, *REMOVE_DOCS):
        path = root / rel
        if path.is_file() or path.is_symlink():
            path.unlink()
            removed.append(rel)

    for cache in list(root.rglob("__pycache__")):
        if cache.is_dir():
            shutil.rmtree(cache)
            removed.append(cache.relative_to(root).as_posix() + "/")

    for compiled in list(root.rglob("*.pyc")) + list(root.rglob("*.pyo")):
        if compiled.is_file():
            compiled.unlink()
            removed.append(compiled.relative_to(root).as_posix())

    return removed


def run_validation(root: Path) -> None:
    subprocess.run(
        [sys.executable, ".github/scripts/validate-content.py"],
        cwd=root,
        check=True,
    )

    node = shutil.which("node")
    if not node:
        print("Aviso: Node.js não encontrado; node --check será executado pela CI.")
        return

    for js in sorted((root / "js").rglob("*.js")):
        subprocess.run([node, "--check", str(js)], cwd=root, check=True)


def main() -> int:
    root = locate_root()
    ensure_v44_files(root)

    print(f"Aplicando saneamento V44 em: {root}")

    try:
        index_changed = patch_index(root)
        legacy_keys = clean_lives_json(root)
        removed = remove_known_residue(root)

        print(f"index.html atualizado: {'sim' if index_changed else 'já estava final'}")

        if legacy_keys:
            print("Chaves legadas removidas de lives.json:")
            for key in legacy_keys:
                print(f"- {key}")

        if removed:
            print("Resíduos removidos:")
            for rel in removed:
                print(f"- {rel}")

        print("\nValidando estado final...")
        run_validation(root)

    except Exception as exc:
        print(f"\nV44 interrompido: {exc}", file=sys.stderr)
        print(
            "O repositório está sob Git; revise `git diff`/`git status` antes de continuar.",
            file=sys.stderr,
        )
        return 1

    print("\nSaneamento V44 concluído.")
    print("Revise com: git status && git diff --check")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
