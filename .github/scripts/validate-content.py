#!/usr/bin/env python3
"""Validação estrutural do site público Kamyli Sumire.

Objetivos:
- validar JSON editorial;
- impedir regressões arquiteturais conhecidas;
- validar referências locais, SEO básico e arquivos de produção;
- impedir o retorno de resíduos/hotfixes removidos no saneamento V44/V44.2.

O validador não altera nenhum arquivo.
"""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
ERRORS: list[str] = []
WARNINGS: list[str] = []

REQUIRED_FILES = (
    "index.html",
    "doacoes/index.html",
    "404.html",
    "CNAME",
    ".nojekyll",
    "_headers",
    "robots.txt",
    "sitemap.xml",
    "workers.js",
    "js/core/config.js",
    "js/pages/home/home.js",
    "js/pages/home/content.js",
    "js/pages/home/lives.js",
    "js/pages/home/home-interactions.js",
    "js/pages/doacoes/doacoes.js",
    "js/pages/doacoes/content.js",
    "js/pages/doacoes/ranking.js",
    "css/pages/home.css",
    "css/pages/doacoes.css",
    "css/components/lives.css",
    "css/components/ranking.css",
    "css/components/home-interactions.css",
    "assets/fonts/nunito-variable.woff2",
    "assets/fonts/OFL.txt",
    "docs/PRODUCAO.md",
    "docs/ARQUITETURA.md",
    "docs/SANEAMENTO-V44.md",
    "docs/VALIDACAO.md",
)

FORBIDDEN_PATHS = (
    "APLICAR-V44-1.txt",
    "APLICAR-V44.txt",
    "REMOVER-V44.txt",
    "V43-7-3-HOTFIX.txt",
    "V44-MANIFEST.json",
    "cleanup_v44.py",
    "APLICAR-V44-2.txt",
    "cleanup_v442.py",
    "V43-7-HOTFIX.txt",
    "V43-7-1-HOTFIX.txt",
    "V43-7-2-HOTFIX.txt",
    "V43-7-REMOVER.txt",
    "remove_v4372_public_helpers.py",
    "css/pages/v43-7-3.css",
    "js/pages/home/v43-7-3.js",
    ".github/scripts/__pycache__",
    "assets/avatar.png",
    "assets/favicon.png",
    "assets/fundo.png",
    "assets/preview.png",
)

LEGACY_LIVES_KEYS = {
    "playlistId",
    "mensagemCarregando",
    "mensagemSemPlaylist",
    "mensagemErro",
    "modalTitulo",
}

ALLOWED_DOCS = {
    "ARQUITETURA.md",
    "PRODUCAO.md",
    "SANEAMENTO-V44.md",
    "VALIDACAO.md",
}

EXPECTED_DAYS = (
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
)

HEART_PATH = (
    "M12 21s-7.2-4.35-9.6-8.35C.65 9.95 1.5 6.4 4.6 5.1c2-.85 "
    "4.25-.3 5.65 1.35L12 8.5l1.75-2.05c1.4-1.65 3.65-2.2 "
    "5.65-1.35 3.1 1.3 3.95 4.85 2.2 7.55C19.2 16.65 12 21 12 21Z"
)


def error(message: str) -> None:
    ERRORS.append(message)


def warn(message: str) -> None:
    WARNINGS.append(message)


def read_text(rel: str) -> str:
    path = ROOT / rel
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        error(f"{rel}: não foi possível ler ({exc}).")
        return ""


def strict_object_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"chave JSON duplicada: {key!r}")
        result[key] = value
    return result


def load_json(rel: str):
    text = read_text(rel)
    if not text:
        return None
    try:
        return json.loads(text, object_pairs_hook=strict_object_pairs)
    except (json.JSONDecodeError, ValueError) as exc:
        error(f"{rel}: JSON inválido ({exc}).")
        return None


def is_iso_date(value) -> bool:
    if not isinstance(value, str):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def validate_required_and_forbidden() -> None:
    for rel in REQUIRED_FILES:
        if not (ROOT / rel).is_file():
            error(f"arquivo obrigatório ausente: {rel}")

    for rel in FORBIDDEN_PATHS:
        if (ROOT / rel).exists():
            error(f"resíduo de saneamento ainda presente: {rel}")

    docs = ROOT / "docs"
    if docs.is_dir():
        for path in docs.iterdir():
            if path.is_file() and path.name not in ALLOWED_DOCS:
                error(f"documentação histórica não consolidada: docs/{path.name}")

    for cache in ROOT.rglob("__pycache__"):
        error(f"cache Python versionado/presente: {cache.relative_to(ROOT)}")

    for pyc in ROOT.rglob("*.py[co]"):
        error(f"bytecode Python presente: {pyc.relative_to(ROOT)}")


def validate_all_json() -> None:
    for path in sorted(ROOT.glob("data/**/*.json")):
        rel = path.relative_to(ROOT).as_posix()
        load_json(rel)


def validate_home_content() -> None:
    hero = load_json("data/content/hero.json")
    if isinstance(hero, dict):
        for key in ("eyebrow", "titulo", "descricao", "botoes"):
            if key not in hero:
                error(f"data/content/hero.json: campo obrigatório ausente: {key}")

        title = hero.get("titulo")
        if not isinstance(title, dict):
            error("data/content/hero.json: titulo deve ser objeto.")
        else:
            for key in ("prefixo", "destaque", "sufixo"):
                if not isinstance(title.get(key), str):
                    error(
                        f"data/content/hero.json: titulo.{key} deve ser texto."
                    )

        buttons = hero.get("botoes")
        if not isinstance(buttons, dict):
            error("data/content/hero.json: botoes deve ser objeto.")
        else:
            if buttons.get("apoio") != "Apoiar":
                error(
                    'data/content/hero.json: botoes.apoio deve ser "Apoiar".'
                )
            if not isinstance(buttons.get("live"), str) or not buttons["live"].strip():
                error(
                    "data/content/hero.json: botoes.live deve ser texto não vazio."
                )

    donation = load_json("data/content/home-doacoes.json")
    if not isinstance(donation, dict):
        return

    for key in ("eyebrow", "titulo", "descricao", "botao"):
        if not isinstance(donation.get(key), str) or not donation[key].strip():
            error(f"data/content/home-doacoes.json: {key} deve ser texto não vazio.")

    if donation.get("botao") != "Apoiar":
        error('data/content/home-doacoes.json: "botao" deve ser "Apoiar".')


def validate_lives() -> None:
    content = load_json("data/content/lives.json")
    if not isinstance(content, dict):
        return

    for key in LEGACY_LIVES_KEYS:
        if key in content:
            error(f"data/content/lives.json: chave legada deve ser removida: {key}")

    required = (
        "eyebrow",
        "titulo",
        "descricao",
        "canalUrl",
        "botaoCanal",
        "maxItems",
        "videos",
    )
    for key in required:
        if key not in content:
            error(f"data/content/lives.json: campo obrigatório ausente: {key}")

    if not isinstance(content.get("maxItems"), int) or not 1 <= content["maxItems"] <= 20:
        error("data/content/lives.json: maxItems deve ser inteiro entre 1 e 20.")

    channel = content.get("canalUrl")
    if not isinstance(channel, str) or not channel.startswith("https://"):
        error("data/content/lives.json: canalUrl deve usar HTTPS.")

    videos = content.get("videos")
    if not isinstance(videos, list):
        error("data/content/lives.json: videos deve ser uma lista.")
        return

    seen_ids = set()
    previous_date = None
    today = date.today()

    for index, video in enumerate(videos):
        label = f"data/content/lives.json: videos[{index}]"
        if not isinstance(video, dict):
            error(f"{label} deve ser objeto.")
            continue

        for key in ("videoId", "title", "date"):
            if not isinstance(video.get(key), str) or not video[key].strip():
                error(f"{label}.{key} deve ser texto não vazio.")

        video_id = video.get("videoId", "")
        if not re.fullmatch(r"[A-Za-z0-9_-]{6,20}", video_id):
            error(f"{label}.videoId possui formato inesperado.")
        elif video_id in seen_ids:
            error(f"{label}.videoId está duplicado.")
        seen_ids.add(video_id)

        value = video.get("date")
        if is_iso_date(value):
            parsed = date.fromisoformat(value)
            if parsed > today:
                warn(f"{label}.date está no futuro ({value}); revisar editorialmente.")
            if previous_date and parsed > previous_date:
                warn(
                    f"{label}.date ({value}) quebra a ordem decrescente das Lives; "
                    "não foi corrigido automaticamente."
                )
            previous_date = parsed
        else:
            error(f"{label}.date deve ser YYYY-MM-DD.")

        title = video.get("title", "")
        if "cite" in title or "" in title:
            warn(f"{label}.title contém marcador de citação incomum; revisar editorialmente.")


def validate_agenda() -> None:
    agenda = load_json("data/agenda.json")
    if not isinstance(agenda, dict):
        return

    days = agenda.get("dias")
    if not isinstance(days, list) or len(days) != 7:
        error("data/agenda.json: dias deve conter exatamente 7 itens.")
        return

    ids = []
    for index, item in enumerate(days):
        label = f"data/agenda.json: dias[{index}]"
        if not isinstance(item, dict):
            error(f"{label} deve ser objeto.")
            continue

        day_id = item.get("id")
        ids.append(day_id)

        if not isinstance(item.get("temLive"), bool):
            error(f"{label}.temLive deve ser booleano.")

        if item.get("temLive") is False:
            for field in ("horario", "titulo", "descricao"):
                if item.get(field, "") not in ("", None):
                    error(
                        f"{label}.{field} deve ficar vazio quando temLive=false."
                    )

        schedule = item.get("horario", "")
        if schedule and not re.fullmatch(r"[0-2]\d:[0-5]\d", schedule):
            error(f"{label}.horario deve ser HH:MM ou vazio.")

    if tuple(ids) != EXPECTED_DAYS:
        error(
            "data/agenda.json: ordem/ids devem ser domingo, segunda, terca, "
            "quarta, quinta, sexta, sabado."
        )


class RefParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for attr in ("src", "href"):
            value = attrs.get(attr)
            if value:
                self.refs.append((tag, attr, value))


def is_external_ref(value: str) -> bool:
    if value.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
        return True
    parsed = urlparse(value)
    return bool(parsed.scheme or parsed.netloc or value.startswith("//"))


def validate_html_local_refs(rel: str) -> None:
    text = read_text(rel)
    if not text:
        return

    parser = RefParser()
    try:
        parser.feed(text)
    except Exception as exc:
        error(f"{rel}: HTML não pôde ser analisado ({exc}).")
        return

    base = (ROOT / rel).parent
    for tag, attr, value in parser.refs:
        clean = value.split("#", 1)[0].split("?", 1)[0]
        if not clean or is_external_ref(clean):
            continue

        if clean.startswith("/"):
            target = ROOT / clean.lstrip("/")
        else:
            target = base / clean

        if not target.exists():
            error(f"{rel}: referência local ausente em {tag}[{attr}]: {value}")


def validate_css_local_refs() -> None:
    pattern = re.compile(r"url\(\s*(['\"]?)([^'\"\)]+)\1\s*\)", re.I)
    for path in ROOT.glob("css/**/*.css"):
        text = path.read_text(encoding="utf-8")
        for _, value in pattern.findall(text):
            value = value.strip()
            if not value or value.startswith(("data:", "http://", "https://", "//", "#")):
                continue
            target = (path.parent / value.split("#", 1)[0].split("?", 1)[0]).resolve()
            if not target.exists():
                error(
                    f"{path.relative_to(ROOT)}: url() local ausente: {value}"
                )


def validate_architecture() -> None:
    index = read_text("index.html")
    donations = read_text("doacoes/index.html")
    not_found = read_text("404.html")
    config = read_text("js/core/config.js")
    lives_js = read_text("js/pages/home/lives.js")
    interactions = read_text("js/pages/home/home-interactions.js")
    navbar = read_text("js/core/navbar.js")

    for element_id in (
        'id="inicio"',
        'id="heroSupportButton"',
        'id="homeDonationButton"',
        'id="livesTrack"',
        'id="agendaGrid"',
    ):
        if element_id not in index:
            error(f"index.html: elemento obrigatório ausente: {element_id}")

    if "css/components/home-interactions.css" not in index:
        error("index.html: home-interactions.css não está carregado.")
    if "js/pages/home/home-interactions.js" not in index:
        error("index.html: home-interactions.js não está carregado.")

    if re.search(
        r'id="homeDonationButton"[^>]*>\s*Ir para doações\s*</a>',
        index,
        re.I,
    ):
        error('index.html: fallback do CTA "Gostou das lives?" ainda é antigo.')

    if "js/core/api.js" in index or "ranking.js" in index:
        error("index.html: Home não deve carregar API/ranking.")

    for expected in ("js/core/api.js", "js/pages/doacoes/ranking.js"):
        if expected not in donations:
            error(f"doacoes/index.html: script obrigatório ausente: {expected}")

    if 'name="robots"' not in not_found or "noindex" not in not_found:
        error("404.html: deve permanecer noindex.")

    if "v43-7-3" in config.lower() or "home-interactions" in config:
        error("js/core/config.js: configuração central não deve carregar hotfix/Home.")

    if "useCustomDomain: false" not in config:
        warn("js/core/config.js: useCustomDomain não está false; confirmar mudança deliberada.")

    forbidden_youtube = (
        "YT.Player",
        "iframe_api",
        "youtube.com/embed",
        "cuePlaylist",
        "getPlaylist",
    )
    for needle in forbidden_youtube:
        if needle in lives_js:
            error(f"js/pages/home/lives.js: integração legada detectada: {needle}")

    # A URL do vídeo pode ser montada de duas formas equivalentes:
    # 1. string direta: https://www.youtube.com/watch?v=<id>
    # 2. URL API: new URL("https://www.youtube.com/watch") +
    #    url.searchParams.set("v", videoId)
    has_youtube_watch_url = (
        "youtube.com/watch?v=" in lives_js
        or (
            "https://www.youtube.com/watch" in lives_js
            and re.search(
                r"""\.searchParams\.set\(\s*["']v["']\s*,""",
                lives_js,
            )
        )
    )

    if not has_youtube_watch_url:
        error(
            "js/pages/home/lives.js: construção do link direto do YouTube "
            "não foi reconhecida."
        )

    if "i.ytimg.com/vi/" not in lives_js:
        error(
            "js/pages/home/lives.js: thumbnail oficial do YouTube "
            "não foi reconhecida."
        )

    for element_id in (
        "heroSupportButton",
        "homeDonationButton",
        "livesTrack",
        "agendaGrid",
    ):
        if element_id not in interactions:
            error(f"home-interactions.js: alvo ausente: {element_id}")

    for event_name in ("pointerdown", "pointermove", "pointerup"):
        if event_name not in interactions:
            error(f"home-interactions.js: evento de arraste ausente: {event_name}")

    if HEART_PATH not in interactions:
        error("home-interactions.js: path do coração esperado não encontrado.")

    if navbar and HEART_PATH not in navbar:
        warn(
            "navbar.js: não foi possível confirmar por texto o mesmo path SVG do coração; "
            "revisar se a navbar foi redesenhada deliberadamente."
        )


def validate_seo_and_deployment() -> None:
    cname = read_text("CNAME").strip()
    if cname != "kamylisumire.com":
        error("CNAME: esperado kamylisumire.com.")

    index = read_text("index.html")
    donations = read_text("doacoes/index.html")

    checks = (
        (index, 'rel="canonical" href="https://kamylisumire.com/"', "Home canonical"),
        (
            donations,
            'rel="canonical" href="https://kamylisumire.com/doacoes/"',
            "Doações canonical",
        ),
    )
    for text, needle, label in checks:
        if needle not in text:
            error(f"{label}: canonical ausente/incorreto.")

    headers = read_text("_headers")
    if "pages.dev" not in headers or "X-Robots-Tag" not in headers:
        error("_headers: preview Cloudflare deve continuar protegido por noindex.")

    robots = read_text("robots.txt")
    if "https://kamylisumire.com/sitemap.xml" not in robots:
        error("robots.txt: referência ao sitemap ausente.")

    sitemap_path = ROOT / "sitemap.xml"
    try:
        tree = ET.parse(sitemap_path)
        urls = {
            node.text.strip()
            for node in tree.findall(".//{*}loc")
            if node.text
        }
    except (ET.ParseError, OSError) as exc:
        error(f"sitemap.xml: XML inválido ({exc}).")
        return

    expected = {
        "https://kamylisumire.com/",
        "https://kamylisumire.com/doacoes/",
    }
    if not expected.issubset(urls):
        error("sitemap.xml: Home e /doacoes/ precisam estar presentes.")


def main() -> int:
    validate_required_and_forbidden()
    validate_all_json()
    validate_home_content()
    validate_lives()
    validate_agenda()

    for rel in ("index.html", "doacoes/index.html", "404.html"):
        validate_html_local_refs(rel)

    validate_css_local_refs()
    validate_architecture()
    validate_seo_and_deployment()

    if WARNINGS:
        print("AVISOS:")
        for item in WARNINGS:
            print(f"- {item}")
        print()

    if ERRORS:
        print("ERROS:")
        for item in ERRORS:
            print(f"- {item}")
        print(f"\nFalha: {len(ERRORS)} erro(s), {len(WARNINGS)} aviso(s).")
        return 1

    print(f"Validação concluída: 0 erros, {len(WARNINGS)} aviso(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
