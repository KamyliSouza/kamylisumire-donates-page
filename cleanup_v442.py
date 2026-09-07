#!/usr/bin/env python3
"""
V44.2 — fechamento do saneamento.

Escopo estrito:
- remove resíduos temporários conhecidos deixados pela aplicação V44/V44.1;
- reforça FORBIDDEN_PATHS no validador;
- registra V44.2 em CHANGELOG.md e docs/SANEAMENTO-V44.md;
- remove os próprios arquivos temporários desta aplicação;
- executa o validador final.

Não altera HTML, CSS, JavaScript funcional, JSON editorial, Worker, API,
ranking, Agenda, Lives ou assets de produção.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


VERSION = "V44.2"

LEGACY_RESIDUES = (
    "APLICAR-V44-1.txt",
    "APLICAR-V44.txt",
    "REMOVER-V44.txt",
    "V43-7-3-HOTFIX.txt",
    "V44-MANIFEST.json",
    "cleanup_v44.py",
)

APPLICATOR_RESIDUES = (
    "APLICAR-V44-2.txt",
    "cleanup_v442.py",
)

FORBIDDEN_TO_ADD = (
    *LEGACY_RESIDUES,
    *APPLICATOR_RESIDUES,
)


def locate_root() -> Path:
    script_path = Path(__file__).resolve()
    candidates = [Path.cwd().resolve(), script_path.parent]

    seen = set()
    for candidate in candidates:
        for root in (candidate, *candidate.parents):
            if root in seen:
                continue
            seen.add(root)

            if (
                (root / "CNAME").is_file()
                and (root / ".github/scripts/validate-content.py").is_file()
                and (root / "CHANGELOG.md").is_file()
                and (root / "docs/SANEAMENTO-V44.md").is_file()
            ):
                try:
                    cname = (root / "CNAME").read_text(
                        encoding="utf-8"
                    ).strip()
                except OSError:
                    continue

                if cname == "kamylisumire.com":
                    return root

    raise SystemExit(
        "Raiz do repositório não encontrada. "
        "Extraia o ZIP V44.2 na raiz do projeto."
    )


def write_text(path: Path, value: str) -> None:
    path.write_text(value, encoding="utf-8", newline="\n")


def patch_validator(root: Path) -> bool:
    path = root / ".github/scripts/validate-content.py"
    text = path.read_text(encoding="utf-8")
    original = text

    marker = "FORBIDDEN_PATHS = (\n"
    if marker not in text:
        raise RuntimeError(
            "Estrutura FORBIDDEN_PATHS não reconhecida no validador."
        )

    missing = [
        rel
        for rel in FORBIDDEN_TO_ADD
        if f'    "{rel}",' not in text
    ]

    if missing:
        insertion = "".join(
            f'    "{rel}",\n'
            for rel in missing
        )
        text = text.replace(
            marker,
            marker + insertion,
            1,
        )

    # Atualiza apenas a descrição textual da geração do saneamento.
    text = text.replace(
        "impedir o retorno de resíduos/hotfixes removidos no saneamento V44.",
        "impedir o retorno de resíduos/hotfixes removidos no saneamento V44/V44.2.",
        1,
    )

    if text != original:
        write_text(path, text)
        return True

    return False


CHANGELOG_SECTION = """## V44.2 — fechamento do saneamento

- remove os artefatos temporários usados para aplicar V44 e V44.1;
- remove o documento residual `V43-7-3-HOTFIX.txt`;
- remove o manifesto temporário `V44-MANIFEST.json`;
- reforça `FORBIDDEN_PATHS` para impedir o retorno desses resíduos;
- os próprios arquivos de aplicação V44.2 também são proibidos após o uso;
- não altera HTML, CSS, JavaScript funcional, JSON editorial, Worker/API,
  ranking, Agenda, Lives ou assets.

"""


def patch_changelog(root: Path) -> bool:
    path = root / "CHANGELOG.md"
    text = path.read_text(encoding="utf-8")

    if "## V44.2 — fechamento do saneamento" in text:
        return False

    anchor = "## V44 — saneamento e consolidação"
    position = text.find(anchor)

    if position < 0:
        raise RuntimeError(
            "CHANGELOG.md não contém a seção V44 esperada."
        )

    updated = (
        text[:position]
        + CHANGELOG_SECTION
        + text[position:]
    )

    write_text(path, updated)
    return True


SANEAMENTO_SECTION = """## Fechamento V44.2

Após a publicação da V44, permaneceram na raiz alguns arquivos usados apenas
durante a aplicação do saneamento. A V44.2 encerra essa migração removendo:

- `APLICAR-V44-1.txt`;
- `APLICAR-V44.txt`;
- `REMOVER-V44.txt`;
- `V43-7-3-HOTFIX.txt`;
- `V44-MANIFEST.json`;
- `cleanup_v44.py`.

Os arquivos temporários usados para aplicar a própria V44.2 também não fazem
parte do estado final do repositório.

O validador passa a bloquear explicitamente todos esses caminhos. Assim, a CI
falha se um artefato de aplicação/hotfix for reintroduzido no futuro.

A V44.2 não modifica comportamento do site, conteúdo editorial ou backend.

"""


def patch_saneamento_doc(root: Path) -> bool:
    path = root / "docs/SANEAMENTO-V44.md"
    text = path.read_text(encoding="utf-8")

    if "## Fechamento V44.2" in text:
        return False

    anchor = "## Observação editorial"
    position = text.find(anchor)

    if position < 0:
        # Fallback seguro: acrescenta ao fim, sem reordenar outra documentação.
        updated = text.rstrip() + "\n\n" + SANEAMENTO_SECTION
    else:
        updated = (
            text[:position]
            + SANEAMENTO_SECTION
            + text[position:]
        )

    write_text(path, updated)
    return True


def remove_known_files(root: Path, relpaths) -> list[str]:
    removed = []

    for rel in relpaths:
        path = root / rel

        if path.is_file() or path.is_symlink():
            path.unlink()
            removed.append(rel)

    return removed


def validate_final_state(root: Path) -> None:
    validator = root / ".github/scripts/validate-content.py"

    subprocess.run(
        [sys.executable, str(validator)],
        cwd=root,
        check=True,
    )


def main() -> int:
    root = locate_root()
    script_path = Path(__file__).resolve()

    print(f"Aplicando {VERSION} em: {root}")

    try:
        validator_changed = patch_validator(root)
        changelog_changed = patch_changelog(root)
        doc_changed = patch_saneamento_doc(root)

        removed = remove_known_files(
            root,
            LEGACY_RESIDUES,
        )

        # Remove os temporários desta própria versão antes da validação.
        # O .py já foi carregado pelo interpretador e pode ser removido.
        self_cleanup = []

        instruction = root / "APLICAR-V44-2.txt"
        if instruction.is_file():
            instruction.unlink()
            self_cleanup.append("APLICAR-V44-2.txt")

        if script_path.is_file():
            script_path.unlink()
            try:
                rel = script_path.relative_to(root).as_posix()
            except ValueError:
                rel = script_path.name
            self_cleanup.append(rel)

        print(
            "Validador atualizado:",
            "sim" if validator_changed else "já estava final",
        )
        print(
            "CHANGELOG atualizado:",
            "sim" if changelog_changed else "já estava final",
        )
        print(
            "SANEAMENTO-V44 atualizado:",
            "sim" if doc_changed else "já estava final",
        )

        if removed:
            print("Resíduos removidos:")
            for rel in removed:
                print(f"- {rel}")
        else:
            print("Resíduos V44/V44.1: já estavam ausentes.")

        if self_cleanup:
            print("Temporários V44.2 removidos:")
            for rel in self_cleanup:
                print(f"- {rel}")

        print("\nValidando estado final...")
        validate_final_state(root)

    except Exception as exc:
        print(
            f"\n{VERSION} interrompida: {exc}",
            file=sys.stderr,
        )
        print(
            "Revise o estado do repositório antes de commit/push.",
            file=sys.stderr,
        )
        return 1

    print(f"\n{VERSION} concluída.")
    print("O estado final não contém arquivos de aplicação V44/V44.1/V44.2.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
