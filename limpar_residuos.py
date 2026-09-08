#!/usr/bin/env python3
"""
Limpador seguro de resíduos do repositório Kamyli Sumire.

Uso recomendado no PowerShell:

    py limpar_residuos.py
    py limpar_residuos.py --apply

Por padrão o script funciona em DRY-RUN: apenas mostra o que seria removido.

Opções:
    --apply             Remove de fato os resíduos encontrados.
    --include-history   Inclui READMEs/hotfixes históricos antigos.
    --root CAMINHO      Define manualmente a raiz do repositório.
    --yes               Não pede confirmação ao usar --apply.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


SCRIPT_NAME = Path(__file__).name

# Diretórios que nunca devem ser percorridos/removidos.
PROTECTED_DIRS = {
    ".git",
    ".github",
}

# Diretórios de cache/resíduos que podem ser removidos em qualquer nível,
# exceto dentro dos diretórios protegidos.
TRASH_DIR_NAMES = {
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
}

# Arquivos temporários seguros para limpeza em qualquer nível.
TRASH_FILE_NAMES = {
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
}

TRASH_FILE_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".swp",
    ".swo",
    ".tmp",
    ".rej",
    ".orig",
}

# Resíduos de instalação/patch gerados nas conversas e copiados para a raiz.
ROOT_GLOBS = (
    "*.patch",
    "APLICAR-*.txt",
    "GITHUB-*.zip",
    "CLOUDFLARE-*.zip",
    "*-PATCH-RAIZ.zip",
    "*-FUNCIONAL-RAIZ.zip",
    "DOCUMENTACAO-*.zip",
    "AUDITORIA-*.md",
)

ROOT_EXACT = {
    "DOCUMENTACAO-MANIFESTO.json",
}

# Arquivos históricos que não são necessários ao runtime/CI, mas são
# preservados por padrão para evitar apagar documentação sem intenção.
HISTORY_ROOT_GLOBS = (
    "README-V*.txt",
    "README-45*.txt",
)

HISTORY_EXACT = {
    # Adicione outros arquivos históricos aqui se decidir arquivá-los.
}


@dataclass(frozen=True)
class Candidate:
    path: Path
    reason: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Remove patches, pacotes de instalação, caches e temporários "
            "sem tocar no código-fonte do projeto."
        )
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="apaga os resíduos; sem esta opção apenas simula",
    )
    parser.add_argument(
        "--include-history",
        action="store_true",
        help="inclui READMEs/hotfixes históricos antigos",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="raiz do repositório (padrão: pasta atual)",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="não pede confirmação ao usar --apply",
    )
    return parser.parse_args()


def looks_like_repo(root: Path) -> bool:
    required = (
        root / "index.html",
        root / "workers.js",
        root / "js",
        root / "css",
        root / "data",
    )
    return all(path.exists() for path in required)


def is_protected(path: Path, root: Path) -> bool:
    try:
        relative = path.relative_to(root)
    except ValueError:
        return True

    parts = relative.parts
    return bool(parts and parts[0] in PROTECTED_DIRS)


def iter_tree(root: Path) -> Iterable[Path]:
    for current, dirs, files in os.walk(root):
        current_path = Path(current)

        dirs[:] = [
            name
            for name in dirs
            if name not in PROTECTED_DIRS
        ]

        for name in dirs:
            yield current_path / name

        for name in files:
            yield current_path / name


def add_candidate(
    found: dict[Path, Candidate],
    path: Path,
    reason: str,
    root: Path,
) -> None:
    if not path.exists():
        return

    if path.name == SCRIPT_NAME:
        return

    if is_protected(path, root):
        return

    found[path.resolve()] = Candidate(
        path=path.resolve(),
        reason=reason,
    )


def collect_candidates(
    root: Path,
    include_history: bool,
) -> list[Candidate]:
    found: dict[Path, Candidate] = {}

    # Resíduos específicos da raiz.
    for pattern in ROOT_GLOBS:
        for path in root.glob(pattern):
            add_candidate(
                found,
                path,
                f"resíduo da raiz ({pattern})",
                root,
            )

    for name in ROOT_EXACT:
        add_candidate(
            found,
            root / name,
            "arquivo gerado de documentação",
            root,
        )

    if include_history:
        for pattern in HISTORY_ROOT_GLOBS:
            for path in root.glob(pattern):
                add_candidate(
                    found,
                    path,
                    "documentação histórica opcional",
                    root,
                )

        for name in HISTORY_EXACT:
            add_candidate(
                found,
                root / name,
                "documentação histórica opcional",
                root,
            )

    # Caches e temporários internos.
    for path in iter_tree(root):
        if is_protected(path, root):
            continue

        if path.is_dir() and path.name in TRASH_DIR_NAMES:
            add_candidate(
                found,
                path,
                "diretório de cache",
                root,
            )
            continue

        if not path.is_file():
            continue

        if path.name in TRASH_FILE_NAMES:
            add_candidate(
                found,
                path,
                "arquivo temporário do sistema",
                root,
            )
            continue

        if path.suffix.lower() in TRASH_FILE_SUFFIXES:
            add_candidate(
                found,
                path,
                f"arquivo temporário ({path.suffix})",
                root,
            )
            continue

        if path.name.endswith("~"):
            add_candidate(
                found,
                path,
                "backup temporário de editor",
                root,
            )

    # Se um diretório inteiro já será apagado, não precisamos listar seus
    # arquivos internos separadamente.
    candidate_paths = set(found)
    filtered: list[Candidate] = []

    for candidate in found.values():
        parent = candidate.path.parent
        nested = False

        while parent != root.parent:
            if parent in candidate_paths:
                nested = True
                break
            if parent == root:
                break
            parent = parent.parent

        if not nested:
            filtered.append(candidate)

    return sorted(
        filtered,
        key=lambda item: (
            item.path.is_file(),
            str(item.path).lower(),
        ),
    )


def path_size(path: Path) -> int:
    if path.is_file():
        try:
            return path.stat().st_size
        except OSError:
            return 0

    total = 0

    if path.is_dir():
        for child in path.rglob("*"):
            if child.is_file():
                try:
                    total += child.stat().st_size
                except OSError:
                    pass

    return total


def human_size(size: int) -> str:
    value = float(size)

    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            if unit == "B":
                return f"{int(value)} {unit}"
            return f"{value:.1f} {unit}"
        value /= 1024

    return f"{size} B"


def remove_path(path: Path) -> None:
    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(path)
    else:
        path.unlink()


def print_candidates(
    candidates: list[Candidate],
    root: Path,
) -> int:
    if not candidates:
        print("Nenhum resíduo conhecido encontrado.")
        return 0

    total = sum(
        path_size(item.path)
        for item in candidates
    )

    print()
    print("Resíduos encontrados:")
    print("-" * 72)

    for item in candidates:
        try:
            relative = item.path.relative_to(root)
        except ValueError:
            relative = item.path

        kind = "DIR " if item.path.is_dir() else "FILE"
        size = human_size(path_size(item.path))

        print(
            f"[{kind}] {relative} "
            f"({size})"
        )
        print(f"       motivo: {item.reason}")

    print("-" * 72)
    print(
        f"Total: {len(candidates)} item(ns), "
        f"aprox. {human_size(total)}"
    )

    return total


def main() -> int:
    args = parse_args()
    root = args.root.expanduser().resolve()

    print("Kamyli Sumire — limpador de resíduos")
    print(f"Raiz: {root}")

    if not root.is_dir():
        print(
            "ERRO: a raiz informada não existe.",
            file=sys.stderr,
        )
        return 2

    if not looks_like_repo(root):
        print(
            "ERRO: a pasta não parece ser a raiz do "
            "kamylisumire-donates-page.",
            file=sys.stderr,
        )
        print(
            "Esperados: index.html, workers.js, js/, css/ e data/.",
            file=sys.stderr,
        )
        return 2

    candidates = collect_candidates(
        root,
        include_history=args.include_history,
    )

    print_candidates(candidates, root)

    if not candidates:
        return 0

    if not args.apply:
        print()
        print("DRY-RUN: nenhum arquivo foi apagado.")
        print(
            "Para executar a limpeza:"
        )
        print(
            f"  py {SCRIPT_NAME} --apply"
        )

        if not args.include_history:
            print()
            print(
                "Os READMEs históricos foram preservados. "
                "Para incluí-los:"
            )
            print(
                f"  py {SCRIPT_NAME} "
                "--include-history"
            )

        return 0

    if not args.yes:
        print()
        answer = input(
            "Apagar os itens listados? "
            "Digite LIMPAR para confirmar: "
        ).strip()

        if answer != "LIMPAR":
            print("Operação cancelada.")
            return 1

    failures: list[tuple[Path, Exception]] = []
    removed = 0

    # Arquivos antes de diretórios não é obrigatório, mas paths já foram
    # filtrados para não conter filhos de diretórios selecionados.
    for item in candidates:
        try:
            remove_path(item.path)
            removed += 1
        except Exception as exc:  # noqa: BLE001
            failures.append(
                (item.path, exc)
            )

    print()
    print(
        f"Limpeza concluída: {removed} "
        "item(ns) removido(s)."
    )

    if failures:
        print(
            f"Falhas: {len(failures)}",
            file=sys.stderr,
        )

        for path, error in failures:
            print(
                f"- {path}: {error}",
                file=sys.stderr,
            )

        return 1

    print("Nenhum arquivo de código-fonte foi alvo da limpeza.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
