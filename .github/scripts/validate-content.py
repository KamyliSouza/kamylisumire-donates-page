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
    "blog/index.html",
    "artes/index.html",
    "privacidade/index.html",
    "uso-de-ia/index.html",
    "data/blog/config.json",
    "data/blog/posts.json",
    "data/content/artes.json",
    "data/content/buttons.json",
    "js/core/button-icons.js",
    "js/core/sanitize.js",
    "js/core/buttons.js",
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
    "js/pages/home/carousel.js",
    "js/pages/home/lives.js",
    "js/pages/home/twitch-live.js",
    "js/pages/home/home-interactions.js",
    "js/pages/blog/blog.js",
    "js/pages/artes/artes.js",
    "js/pages/doacoes/doacoes.js",
    "js/pages/doacoes/content.js",
    "js/pages/doacoes/ranking.js",
    "css/pages/home.css",
    "css/pages/blog.css",
    "css/pages/artes.css",
    "css/pages/doacoes.css",
    "css/components/blog.css",
    "css/components/carousels.css",
    "css/components/lives.css",
    "css/components/ranking.css",
    "css/components/home-interactions.css",
    "assets/fonts/nunito-variable.woff2",
    "assets/fonts/OFL.txt",
    "docs/PRODUCAO.md",
    "docs/ARQUITETURA.md",
    "docs/SANEAMENTO-V44.md",
    "docs/VALIDACAO.md",
    "docs/GUIA-TWITCH-V47.4.md",
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



SECURITY_CSP_REQUIRED_DIRECTIVES = (
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https:",
    "font-src 'self'",
    "connect-src 'self' https://api.kamylisumire.com https://delicate-waterfall-52e1-api-donates-kamyli.annakamyli.workers.dev https://assets.kamylisumire.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
)

BUTTON_ICON_NAMES = {
    "none", "heart", "youtube", "arrow-right", "arrow-left",
    "chevron-left", "chevron-right", "home", "pix", "globe",
    "calendar", "trophy", "tag", "x", "external-link", "settings",
}

REQUIRED_BUTTON_KEYS = {
    "navbarSupport", "heroSupport", "heroLive", "livesChannel",
    "homeBlogAll", "homeDonation", "notFoundHome", "donationLivepix",
    "donationPixie", "rankingMonthly", "rankingAllTime", "blogFilterAll",
    "blogArticleBack", "externalCancel", "externalContinue", "settingsOpen",
    "settingsClose", "livesPrev", "livesNext", "agendaPrev", "agendaNext",
}

BUTTON_KEYS_ALLOW_EMPTY_TEXT = {
    "settingsClose", "livesPrev", "livesNext", "agendaPrev", "agendaNext",
}

BLOG_METADATA_KEYS = (
    "slug", "title", "date", "summary", "tags", "readMinutes", "published",
)

ALLOWED_DOCS = {
    "ARQUITETURA.md",
    "PRODUCAO.md",
    "SANEAMENTO-V44.md",
    "VALIDACAO.md",
    "GUIA-TWITCH-V47.4.md",
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
        for key in ("eyebrow", "titulo", "descricao"):
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

    donation = load_json("data/content/home-doacoes.json")
    if not isinstance(donation, dict):
        return

    for key in ("eyebrow", "titulo", "descricao"):
        if not isinstance(donation.get(key), str) or not donation[key].strip():
            error(f"data/content/home-doacoes.json: {key} deve ser texto não vazio.")


def validate_artes() -> None:
    data = load_json("data/content/artes.json")
    if not isinstance(data, dict):
        return

    if data.get("version") != 2:
        error("data/content/artes.json: version deve permanecer 2.")

    page = data.get("page")
    if not isinstance(page, dict):
        error("data/content/artes.json: page deve ser objeto.")
    else:
        for key in ("eyebrow", "titulo", "descricao", "buscaPlaceholder", "vazio", "erro"):
            if not isinstance(page.get(key), str) or not page[key].strip():
                error(f"data/content/artes.json: page.{key} deve ser texto não vazio.")

    items = data.get("itens")
    if not isinstance(items, list):
        error("data/content/artes.json: itens deve ser lista.")
        return

    seen_ids = set()
    for index, item in enumerate(items):
        label = f"data/content/artes.json: itens[{index}]"
        if not isinstance(item, dict):
            error(f"{label} deve ser objeto.")
            continue
        allowed = {"id", "titulo", "artista", "creditoUrl", "preview", "imagem", "alt", "data", "categoria", "tags", "largura", "altura"}
        unknown = set(item) - allowed
        if unknown:
            error(f"{label}: chaves não reconhecidas: {', '.join(sorted(unknown))}.")
        for key in ("id", "titulo", "artista", "preview", "imagem", "alt", "data", "categoria"):
            if not isinstance(item.get(key), str) or not item[key].strip():
                error(f"{label}.{key} deve ser texto não vazio.")
        item_id = item.get("id")
        if isinstance(item_id, str):
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item_id):
                error(f"{label}.id deve usar minúsculas, números e hífens.")
            elif item_id in seen_ids:
                error(f"{label}.id duplicado: {item_id}.")
            else:
                seen_ids.add(item_id)
        preview = item.get("preview")
        if isinstance(preview, str):
            parsed = urlparse(preview)
            if parsed.scheme != "https" or not parsed.netloc:
                error(f"{label}.preview deve usar URL HTTPS absoluta.")
        imagem = item.get("imagem")
        if isinstance(imagem, str):
            parsed = urlparse(imagem)
            if parsed.scheme != "https" or not parsed.netloc:
                error(f"{label}.imagem deve usar URL HTTPS absoluta.")
        credito = item.get("creditoUrl", "")
        if credito not in (None, ""):
            parsed = urlparse(str(credito))
            if parsed.scheme != "https" or not parsed.netloc:
                error(f"{label}.creditoUrl deve usar URL HTTPS absoluta ou ficar vazio.")
        if not is_iso_date(item.get("data")):
            error(f"{label}.data deve usar YYYY-MM-DD válido.")
        tags = item.get("tags", [])
        if not isinstance(tags, list) or not all(isinstance(tag, str) and tag.strip() for tag in tags):
            error(f"{label}.tags deve ser lista de textos não vazios.")
        for key in ("largura", "altura"):
            value = item.get(key)
            if value is not None and (not isinstance(value, int) or isinstance(value, bool) or value <= 0):
                error(f"{label}.{key} deve ser inteiro positivo quando informado.")


def validate_lives() -> None:
    content = load_json("data/content/lives.json")
    if not isinstance(content, dict):
        return

    example = load_json("data/content/lives.example.json")
    if isinstance(example, dict):
        for key in LEGACY_LIVES_KEYS:
            if key in example:
                error(
                    "data/content/lives.example.json: "
                    f"chave legada deve ser removida: {key}"
                )

    for key in LEGACY_LIVES_KEYS:
        if key in content:
            error(f"data/content/lives.json: chave legada deve ser removida: {key}")

    required = (
        "eyebrow",
        "titulo",
        "descricao",
        "defaultPlatform",
        "twitchCanalUrl",
        "canalUrl",
        "maxItems",
        "videos",
    )
    for key in required:
        if key not in content:
            error(f"data/content/lives.json: campo obrigatório ausente: {key}")

    if not isinstance(content.get("maxItems"), int) or not 1 <= content["maxItems"] <= 20:
        error("data/content/lives.json: maxItems deve ser inteiro entre 1 e 20.")

    if content.get("defaultPlatform") != "twitch":
        error("data/content/lives.json: defaultPlatform deve permanecer 'twitch' na V47.4.")

    twitch_channel = content.get("twitchCanalUrl")
    if not isinstance(twitch_channel, str) or not twitch_channel.startswith("https://www.twitch.tv/"):
        error("data/content/lives.json: twitchCanalUrl deve apontar para HTTPS da Twitch.")

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


def parse_blog_markdown(rel: str):
    text = read_text(rel)
    if not text:
        return None

    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = normalized.split("\n")
    if not lines or lines[0].strip() != "---":
        error(f"{rel}: front matter deve começar com ---.")
        return None

    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        error(f"{rel}: front matter sem fechamento ---.")
        return None

    meta = {}
    for line_number, raw in enumerate(lines[1:end], start=2):
        if not raw.strip():
            continue
        match = re.fullmatch(r"([A-Za-z][A-Za-z0-9]*):\s*(.+)", raw)
        if not match:
            error(f"{rel}:{line_number}: front matter inválido.")
            continue
        key, value = match.groups()
        if key in meta:
            error(f"{rel}:{line_number}: chave duplicada no front matter: {key}.")
            continue
        try:
            meta[key] = json.loads(value)
        except json.JSONDecodeError:
            error(
                f"{rel}:{line_number}: valor de {key} deve ser literal JSON "
                "(texto entre aspas, array, número ou booleano)."
            )

    unknown = set(meta) - set(BLOG_METADATA_KEYS)
    if unknown:
        error(f"{rel}: chaves desconhecidas no front matter: {', '.join(sorted(unknown))}.")

    body = "\n".join(lines[end + 1:]).strip()
    if not body:
        error(f"{rel}: corpo Markdown está vazio.")

    return meta, body


def markdown_word_count(body: str) -> int:
    text = re.sub(r"```.*?```", " ", body, flags=re.S)
    text = re.sub(r"!?\[([^\]]*)\]\([^\)]*\)", r" \1 ", text)
    text = re.sub(r"[`*_>#~-]", " ", text)
    return len(re.findall(r"\b[\wÀ-ÖØ-öø-ÿ]+\b", text, flags=re.UNICODE))


def validate_markdown_body(rel: str, body: str) -> None:
    if re.search(r"<\/?[A-Za-z][^>]*>", body):
        error(f"{rel}: HTML bruto não é permitido no Markdown.")

    image_pattern = re.compile(
        r'!\[([^\]]*)\]\(([^\s\)]+)(?:\s+"([^"]*)")?\)'
    )
    for alt, image_url, _caption in image_pattern.findall(body):
        if not alt.strip():
            error(f"{rel}: toda imagem Markdown deve possuir texto alternativo.")
        parsed = urlparse(image_url)
        if parsed.scheme != "https" or not parsed.netloc:
            error(f"{rel}: imagem externa deve usar URL https:// válida: {image_url}")

    linked_image_pattern = re.compile(
        r'\[!\[[^\]]+\]\([^\)]+\)\]\(([^\s\)]+)\)'
    )
    for target in linked_image_pattern.findall(body):
        parsed = urlparse(target)
        if parsed.scheme != "https" or not parsed.netloc:
            error(f"{rel}: link de imagem deve usar https:// válido: {target}")

    unsafe_link = re.compile(r'(?<!!)\[[^\]]+\]\((javascript:|data:|vbscript:)', re.I)
    if unsafe_link.search(body):
        error(f"{rel}: protocolo inseguro encontrado em link Markdown.")


def validate_buttons() -> None:
    data = load_json("data/content/buttons.json")
    if not isinstance(data, dict):
        return

    missing = REQUIRED_BUTTON_KEYS - set(data)
    if missing:
        error(
            "data/content/buttons.json: botões obrigatórios ausentes: "
            + ", ".join(sorted(missing))
        )

    unknown = set(data) - REQUIRED_BUTTON_KEYS
    if unknown:
        warn(
            "data/content/buttons.json: chaves extras não reconhecidas: "
            + ", ".join(sorted(unknown))
        )

    for key in sorted(REQUIRED_BUTTON_KEYS & set(data)):
        entry = data[key]
        label = f"data/content/buttons.json: {key}"
        if not isinstance(entry, dict):
            error(f"{label} deve ser objeto.")
            continue

        text = entry.get("text")
        if not isinstance(text, str):
            error(f"{label}.text deve ser texto.")
        elif key not in BUTTON_KEYS_ALLOW_EMPTY_TEXT and not text.strip():
            error(f"{label}.text não pode ficar vazio.")

        icon = entry.get("icon")
        if icon not in BUTTON_ICON_NAMES:
            error(f"{label}.icon inválido: {icon!r}.")

        aria = entry.get("ariaLabel")
        if aria is not None and not isinstance(aria, str):
            error(f"{label}.ariaLabel deve ser texto quando informado.")
        if key in BUTTON_KEYS_ALLOW_EMPTY_TEXT and not isinstance(aria, str):
            error(f"{label}.ariaLabel é obrigatório para botão sem texto padrão.")
        elif key in BUTTON_KEYS_ALLOW_EMPTY_TEXT and not aria.strip():
            error(f"{label}.ariaLabel não pode ficar vazio para botão sem texto padrão.")

        serialized = json.dumps(entry, ensure_ascii=False)
        if re.search(r"<\/?(?:svg|script|style|iframe)\b", serialized, re.I):
            error(f"{label}: HTML/SVG bruto não é permitido.")


def validate_blog() -> None:
    legacy_sources = sorted((ROOT / "data/blog/posts").glob("*.json"))
    for source in legacy_sources:
        error(
            f"{source.relative_to(ROOT).as_posix()}: fonte JSON legada; "
            "V47 exige Markdown (.md)."
        )

    config = load_json("data/blog/config.json")
    index_data = load_json("data/blog/posts.json")

    if not isinstance(config, dict):
        return

    for key in ("page", "home", "article"):
        if key not in config:
            error(f"data/blog/config.json: campo obrigatório ausente: {key}")

    page = config.get("page")
    if not isinstance(page, dict):
        error("data/blog/config.json: page deve ser objeto.")
    else:
        for key in (
            "eyebrow", "titulo", "descricao", "buscaPlaceholder",
            "vazio", "minutosLeitura",
        ):
            if not isinstance(page.get(key), str) or not page[key].strip():
                error(f"data/blog/config.json: page.{key} deve ser texto não vazio.")
        if (
            isinstance(page.get("minutosLeitura"), str)
            and "{minutos}" not in page["minutosLeitura"]
        ):
            error("data/blog/config.json: page.minutosLeitura deve conter {minutos}.")

    home = config.get("home")
    if not isinstance(home, dict):
        error("data/blog/config.json: home deve ser objeto.")
    else:
        for key in ("eyebrow", "titulo", "descricao"):
            if not isinstance(home.get(key), str) or not home[key].strip():
                error(f"data/blog/config.json: home.{key} deve ser texto não vazio.")
        max_items = home.get("maxItems")
        if not isinstance(max_items, int) or not 1 <= max_items <= 5:
            error("data/blog/config.json: home.maxItems deve ser inteiro entre 1 e 5.")

    article = config.get("article")
    if not isinstance(article, dict):
        error("data/blog/config.json: article deve ser objeto.")
    else:
        for key in ("eyebrow",):
            if not isinstance(article.get(key), str) or not article[key].strip():
                error(f"data/blog/config.json: article.{key} deve ser texto não vazio.")

    if not isinstance(index_data, dict):
        return

    if index_data.get("version") != 1:
        error("data/blog/posts.json: version deve ser 1.")

    posts = index_data.get("posts")
    if not isinstance(posts, list):
        error("data/blog/posts.json: posts deve ser lista.")
        return

    slugs = set()
    published = []
    metadata_keys = (
        "slug", "title", "date", "summary",
        "tags", "readMinutes", "published",
    )

    def validate_metadata(post, label):
        if not isinstance(post, dict):
            error(f"{label} deve ser objeto.")
            return None

        slug = post.get("slug")
        if not isinstance(slug, str) or not re.fullmatch(
            r"[a-z0-9]+(?:-[a-z0-9]+)*", slug or ""
        ):
            error(f"{label}.slug deve usar minúsculas, números e hífens.")

        for key in ("title", "summary"):
            if not isinstance(post.get(key), str) or not post[key].strip():
                error(f"{label}.{key} deve ser texto não vazio.")

        if not is_iso_date(post.get("date")):
            error(f"{label}.date deve ser YYYY-MM-DD.")

        tags = post.get("tags")
        if (
            not isinstance(tags, list)
            or not tags
            or not all(isinstance(tag, str) and tag.strip() for tag in tags)
        ):
            error(f"{label}.tags deve conter ao menos um texto não vazio.")

        read_minutes = post.get("readMinutes")
        if not isinstance(read_minutes, int) or not 1 <= read_minutes <= 120:
            error(f"{label}.readMinutes deve ser inteiro entre 1 e 120.")

        if not isinstance(post.get("published"), bool):
            error(f"{label}.published deve ser booleano.")

        return slug

    for item_index, post in enumerate(posts):
        label = f"data/blog/posts.json: posts[{item_index}]"
        slug = validate_metadata(post, label)
        if not isinstance(slug, str):
            continue

        if slug in slugs:
            error(f"{label}.slug está duplicado: {slug}")
        else:
            slugs.add(slug)

        source_rel = f"data/blog/posts/{slug}.md"
        source_path = ROOT / source_rel
        if not source_path.is_file():
            error(f"{label}: fonte Markdown ausente: {source_rel}")
            continue

        parsed_source = parse_blog_markdown(source_rel)
        if not parsed_source:
            continue

        source, body = parsed_source
        validate_metadata(source, source_rel)

        for key in metadata_keys:
            if source.get(key) != post.get(key):
                error(f"{source_rel}: {key} diverge de data/blog/posts.json.")

        validate_markdown_body(source_rel, body)

        expected_minutes = max(1, (markdown_word_count(body) + 219) // 220)
        if source.get("readMinutes") != expected_minutes:
            error(
                f"{source_rel}: readMinutes deve ser {expected_minutes} "
                "para o corpo Markdown atual (220 palavras/min)."
            )

        article_rel = f"blog/{slug}/index.html"
        article_path = ROOT / article_rel
        if post.get("published") is True:
            published.append(post)
            if not article_path.is_file():
                error(f"{label}: post publicado sem página estática: {article_rel}")
            else:
                article_html = read_text(article_rel)
                if "data-blog-post" not in article_html:
                    error(f"{article_rel}: marcador data-blog-post ausente.")
                canonical = (
                    'rel="canonical" '
                    f'href="https://kamylisumire.com/blog/{slug}/"'
                )
                if canonical not in article_html:
                    error(f"{article_rel}: canonical ausente/incorreto.")
                if "js/core/api.js" in article_html or "ranking.js" in article_html:
                    error(f"{article_rel}: artigo não deve carregar API/ranking.")

    if published:
        home_html = read_text("index.html")
        content_js = read_text("js/core/content.js")
        if 'id="homeBlogSection"' not in home_html:
            error("index.html: seção condicional do Blog ausente.")
        if 'data-nav-page="blog"' not in content_js:
            error("js/core/content.js: link condicional do Blog não reconhecido.")


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
    blog_index = read_text("blog/index.html")
    artes_index = read_text("artes/index.html")
    artes_css = read_text("css/pages/artes.css")
    blog_css = read_text("css/pages/blog.css")
    blog_js = read_text("js/pages/blog/blog.js")
    artes_js = read_text("js/pages/artes/artes.js")
    not_found = read_text("404.html")
    config = read_text("js/core/config.js")
    lives_js = read_text("js/pages/home/lives.js")
    twitch_live_js = read_text("js/pages/home/twitch-live.js")
    carousel_js = read_text("js/pages/home/carousel.js")
    interactions = read_text("js/pages/home/home-interactions.js")
    navbar = read_text("js/core/navbar.js")
    page_transitions = read_text("js/core/page-transitions.js")
    buttons_js = read_text("js/core/buttons.js")
    button_icons_js = read_text("js/core/button-icons.js")
    worker_js = read_text("workers.js")
    privacy_html = read_text("privacidade/index.html")

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

    if "css/components/carousels.css" not in index:
        error("index.html: carousels.css compartilhado não está carregado.")

    if "js/pages/home/carousel.js" not in index:
        error("index.html: carousel.js compartilhado não está carregado.")

    if re.search(
        r'id="homeDonationButton"[^>]*>\s*Ir para doações\s*</a>',
        index,
        re.I,
    ):
        error('index.html: fallback do CTA "Gostou das lives?" ainda é antigo.')

    if "ranking.js" in index:
        error("index.html: Home não deve carregar ranking.js.")

    if "js/core/api.js?v=47.3" not in index:
        error("index.html: Home V47.4 deve carregar api.js para a aba Twitch de Lives.")

    if "js/core/api.js" in blog_index or "ranking.js" in blog_index:
        error("blog/index.html: Blog não deve carregar API/ranking.")

    for expected in (
        "css/components/blog.css",
        "css/pages/blog.css",
        "js/pages/blog/blog.js",
        "js/core/page-transitions.js",
    ):
        if expected not in blog_index:
            error(f"blog/index.html: recurso obrigatório ausente: {expected}")

    if "css/components/blog.css" not in index:
        error("index.html: blog.css compartilhado não está carregado.")

    # Busca por campo: Galeria e Blog mantêm UI consistente sem alterar schemas.
    for rel, html, field_id in (
        ("artes/index.html", artes_index, "artesSearchField"),
        ("blog/index.html", blog_index, "blogSearchField"),
    ):
        if f'id="{field_id}"' not in html:
            error(f"{rel}: seletor de campo da busca ausente: {field_id}.")

    # V48.1.1: a Galeria usa drop-down próprio para manter a identidade visual.
    for needle in (
        'aria-haspopup="listbox"',
        'id="artesSearchFieldMenu"',
        'role="listbox"',
        'class="artes-search-field-option"',
        'data-value="todos"',
        'data-value="artista"',
        'data-value="titulo"',
        'data-value="categoria"',
        'data-value="tags"',
    ):
        if needle not in artes_index:
            error(f"artes/index.html: drop-down V48.1.1 incompleto: {needle}")
    if '<select id="artesSearchField"' in artes_index:
        error("artes/index.html: seletor nativo antigo da Galeria não deve retornar na V48.1.1.")

    # V48.1.3: o Blog compartilha o mesmo contrato visual/interativo da busca da Galeria.
    for needle in (
        'aria-haspopup="listbox"',
        'id="blogSearchFieldMenu"',
        'role="listbox"',
        'class="blog-search-field-option"',
        'data-value="todos"',
        'data-value="titulo"',
        'data-value="resumo"',
        'data-value="tags"',
    ):
        if needle not in blog_index:
            error(f"blog/index.html: drop-down V48.1.3 incompleto: {needle}")
    if '<select id="blogSearchField"' in blog_index:
        error("blog/index.html: seletor nativo antigo do Blog não deve retornar na V48.1.3.")

    if 'class="glass-panel blog-tools"' not in blog_index:
        error("blog/index.html: V48.1.4 exige glass-panel envolvendo filtros e busca do Blog.")

    blog_visual_rules = (
        (r"\.blog-tools\s*\{([^}]*)\}", ("position: relative", "z-index: 40", "justify-content: space-between", "gap: 12px", "padding: 14px", "margin-bottom: 18px", "overflow: visible")),
        (r"\.blog-search-field\s*\{([^}]*)\}", ("min-height: 44px", "min-width: 248px", "background: var(--card-bg)", "border-radius: 14px")),
        (r"\.blog-search-field-menu\s*\{([^}]*)\}", ("background: var(--card-bg)", "border-radius: 16px", "box-shadow: var(--shadow-card)", "backdrop-filter: blur(var(--blur-card))")),
        (r"\.blog-search\s*\{([^}]*)\}", ("min-height: 44px", "background: var(--card-bg)", "border-radius: 14px")),
    )
    for pattern, required_declarations in blog_visual_rules:
        match = re.search(pattern, blog_css, flags=re.S)
        if not match:
            error(f"css/pages/blog.css: regra visual V48.1.3 ausente: {pattern}")
            continue
        block = match.group(1)
        for declaration in required_declarations:
            if declaration not in block:
                error(f"css/pages/blog.css: paridade visual V48.1.3 ausente: {declaration}")

    for needle in (
        'const normalizedIndex = (index + elements.searchFieldOptions.length) % elements.searchFieldOptions.length',
        'elements.searchField.setAttribute("aria-expanded", "true")',
        'document.addEventListener("pointerdown"',
        'setupSearchFieldMenu(config)',
    ):
        if needle not in blog_js:
            error(f"js/pages/blog/blog.js: interação do drop-down V48.1.3 ausente: {needle}")

    # V48.1.2: o backdrop-filter do glass-panel cria stacking context; o painel
    # de ferramentas precisa ficar explicitamente acima da masonry para o menu
    # não ser coberto pelos cards/imagens da primeira linha.
    stacking_rules = (
        (r"\.artes-tools\s*\{([^}]*)\}", ("position: relative", "z-index: 40", "overflow: visible")),
        (r"\.artes-grid\s*\{([^}]*)\}", ("position: relative", "z-index: 0")),
    )
    for pattern, required_declarations in stacking_rules:
        match = re.search(pattern, artes_css, flags=re.S)
        if not match:
            error(f"css/pages/artes.css: regra de stacking V48.1.2 ausente: {pattern}")
            continue
        block = match.group(1)
        for declaration in required_declarations:
            if declaration not in block:
                error(f"css/pages/artes.css: proteção de stacking V48.1.2 ausente: {declaration}")

    for needle in ('"artista:": "artista"', '"titulo:": "titulo"', '"tag:": "tags"'):
        if needle not in artes_js:
            error(f"js/pages/artes/artes.js: prefixo de busca ausente: {needle}")

    # Cards mostram só título/artista; metadados completos ficam no dialog.
    for forbidden in (
        'meta.className = "arte-meta"',
        'createText("span", "arte-category", item.categoria)',
    ):
        if forbidden in artes_js:
            error(f"js/pages/artes/artes.js: metadado antigo voltou para a preview: {forbidden}")
    for needle in (
        'const dialogMeta = document.getElementById("arteDialogMeta")',
        '["Categoria", item.categoria]',
        '["Data", formatDate(item.data)]',
        '["Tags", Array.isArray(item.tags)',
    ):
        if needle not in artes_js:
            error(f"js/pages/artes/artes.js: detalhe do dialog V48.1.1 ausente: {needle}")

    for needle in ('"titulo:": "titulo"', '"resumo:": "resumo"', '"tag:": "tags"'):
        if needle not in blog_js:
            error(f"js/pages/blog/blog.js: prefixo de busca ausente: {needle}")


    for expected in ("js/core/api.js", "js/pages/doacoes/ranking.js"):
        if expected not in donations:
            error(f"doacoes/index.html: script obrigatório ausente: {expected}")

    if 'name="robots"' not in not_found or "noindex" not in not_found:
        error("404.html: deve permanecer noindex.")

    if "v43-7-3" in config.lower() or "home-interactions" in config:
        error("js/core/config.js: configuração central não deve carregar hotfix/Home.")

    global_css = read_text("css/core/global.css")
    loader_js = read_text("js/core/loader.js")

    # V45.2.2: esconder main durante o loader é deliberado para impedir que
    # a página apareça por trás da superfície translúcida.
    if not re.search(
        r"site-loading-pending[\s\S]{0,320}body\s*>\s*main[\s\S]{0,180}opacity\s*:\s*0",
        global_css,
        re.I,
    ):
        error(
            "css/core/global.css: V45.2.2 espera body > main invisível "
            "durante o loader."
        )

    if "PAGE_REVEAL_DELAY_MS" not in loader_js:
        error(
            "js/core/loader.js: delay entre loader e página não reconhecido."
        )

    if "site-page-delay" not in loader_js:
        error(
            "js/core/loader.js: estado site-page-delay não reconhecido."
        )

    # V45.2.1: backdrop-filter no loader fullscreen voltou a ser uma
    # escolha visual deliberada. Não tratar como erro de arquitetura.
    loader_block_match = re.search(
        r"(?m)^\.site-loader\s*\{([\s\S]*?)\n\}",
        global_css,
        re.I,
    )
    if loader_block_match:
        loader_block = loader_block_match.group(1)
        if (
            "background-color: var(--card-bg)" not in loader_block
            or not re.search(
                r"backdrop-filter\s*:\s*blur\(",
                loader_block,
                re.I,
            )
        ):
            warn(
                "css/core/global.css: loader não está usando a superfície "
                "translúcida/blur esperada pela V45.2.1."
            )

    # Warm-up dos glass panels deixou de ser requisito na V45.2.2;
    # a pequena diferença de composição do blur foi aceita.

    if "KAMYLI_BACKDROP_ASSET_URL" not in loader_js:
        error("js/core/loader.js: preparo do fundo crítico não reconhecido.")

    # V46.3: o loader permanece reutilizável e faz a ponte entre documentos.
    for needle in (
        "window.KamyliLoader",
        "showForNavigation",
        "resetNavigationState",
        "NAVIGATION_MIN_DISPLAY_MS",
        "NAVIGATION_ENTER_MS",
        "site-navigation-loading",
    ):
        if needle not in loader_js:
            error(
                "js/core/loader.js: contrato do loader-ponte V46.3 "
                f"não reconhecido: {needle}"
            )

    if re.search(r"\bloader\.remove\s*\(", loader_js):
        error(
            "js/core/loader.js: V46.3 exige manter o loader no DOM "
            "para reutilização entre páginas."
        )

    if "site-navigation-loading" not in global_css:
        error(
            "css/core/global.css: estado do loader de navegação V46.3 ausente."
        )

    for needle in (
        "KAMYLI_PAGE_TRANSITION_ARRIVAL",
        "showForNavigation",
        "MAX_LOADER_COVER_WAIT_MS",
    ):
        if needle not in page_transitions:
            error(
                "js/core/page-transitions.js: integração com loader V46.3 "
                f"não reconhecida: {needle}"
            )

    for rel, html in (
        ("index.html", index),
        ("doacoes/index.html", donations),
        ("blog/index.html", blog_index),
    ):
        if "page-transitions.js?v=46.3" not in html:
            error(f"{rel}: cache-buster de page-transitions V46.3 ausente.")
        if "loader.js?v=46.3" not in html:
            error(f"{rel}: cache-buster do loader V46.3 ausente.")
        if "global.css?v=47.1" not in html:
            error(f"{rel}: cache-buster do CSS global V47.1 ausente.")

    if "loader.js?v=46.3" not in not_found:
        error("404.html: cache-buster do loader V46.3 ausente.")
    if "global.css?v=47.1" not in not_found:
        error("404.html: cache-buster do CSS global V47.1 ausente.")

    # O domínio próprio é a configuração deliberada desde V44.4.
    if "https://api.kamylisumire.com" not in config:
        error(
            "js/core/config.js: domínio principal api.kamylisumire.com "
            "não reconhecido."
        )

    for rel, html in (("index.html", index), ("doacoes/index.html", donations), ("blog/index.html", blog_index), ("404.html", not_found)):
        if "js/core/button-icons.js?v=47.2" not in html or "js/core/buttons.js?v=47" not in html:
            error(f"{rel}: módulos de botões V47/V47.2 não carregados.")

    for rel, html in (("index.html", index), ("doacoes/index.html", donations), ("blog/index.html", blog_index), ("404.html", not_found)):
        for asset in (
            "js/core/content.js?v=47",
            "js/core/navbar.js?v=47",
            "js/core/external-links.js?v=47",
            "js/core/footer.js?v=47",
            "css/core/navbar.css?v=47",
        ):
            if asset not in html:
                error(f"{rel}: cache-buster V47 ausente para {asset.split('?')[0]}.")

    for asset in (
        "js/pages/home/content.js?v=47",
        "js/pages/home/lives.js?v=47.4.3",
        "js/pages/home/twitch-live.js?v=47.4.3",
        "js/pages/home/home-interactions.js?v=47",
        "css/components/home-interactions.css?v=47",
    ):
        if asset not in index:
            error(f"index.html: cache-buster V47 ausente para {asset.split('?')[0]}.")

    if "js/pages/doacoes/content.js?v=47" not in donations:
        error("doacoes/index.html: cache-buster V47 ausente para js/pages/doacoes/content.js.")

    if "js/pages/blog/blog.js?v=48.1.3" not in blog_index:
        error("blog/index.html: cache-buster V48.1.3 ausente para js/pages/blog/blog.js.")
    if "css/pages/blog.css?v=48.1.4" not in blog_index:
        error("blog/index.html: cache-buster V48.1.4 ausente para css/pages/blog.css.")
    if "js/pages/artes/artes.js?v=48.1.1" not in artes_index:
        error("artes/index.html: cache-buster V48.1.1 ausente para js/pages/artes/artes.js.")
    if "css/pages/artes.css?v=48.1.2" not in artes_index:
        error("artes/index.html: cache-buster V48.1.2 ausente para css/pages/artes.css.")

    if "data/content/buttons.json" not in buttons_js:
        error("js/core/buttons.js: configuração central de botões não carregada.")
    if "KamyliButtonIcons" not in button_icons_js:
        error("js/core/button-icons.js: biblioteca segura de ícones ausente.")

    # V47.2: o ícone de configurações usa engrenagem geométrica simétrica.
    legacy_settings_path = "M19.4 15a1.7 1.7 0 0 0 .34 1.88"
    if legacy_settings_path in button_icons_js:
        error("js/core/button-icons.js: glyph legado/descentrado de settings ainda presente.")
    if '["polygon", { points: "9.17,5.16 10.34,4.79' not in button_icons_js:
        error("js/core/button-icons.js: engrenagem simétrica V47.2 de settings ausente.")

    # V47.1: geometria interna dos botões configuráveis.
    for needle in (
        "--button-config-icon-size",
        ".button[data-button-key]",
        ".donation-btn[data-button-key]",
        ".blog-filter[data-button-key]",
        ".ranking-tabs .tab-btn[data-button-key]",
        ".site-settings-close[data-button-key]",
        ".lives-carousel-button[data-button-key]",
    ):
        if needle not in global_css:
            error(
                "css/core/global.css: contrato de alinhamento V47.1 ausente: "
                f"{needle}"
            )

    if "margin-right: 5px" in global_css and ".blog-filter [data-button-icon]" in global_css:
        error(
            "css/core/global.css: espaçamento legado de ícones em filtros/abas "
            "não deve voltar na V47.1."
        )

    if "useCustomDomain: true" not in config:
        error(
            "js/core/config.js: useCustomDomain deve permanecer true "
            "enquanto o domínio próprio for o endpoint principal."
        )

    # V46.2: Lives e Agenda compartilham controlador e setas.
    for needle in (
        "scrollTo({",
        'behavior: reducedMotion() ? "auto" : "smooth"',
        "ResizeObserver",
        'event.key !== "ArrowLeft"',
        'event.key !== "ArrowRight"',
    ):
        if needle not in carousel_js:
            error(
                "js/pages/home/carousel.js: contrato de carrossel "
                f"não reconhecido: {needle}"
            )

    home_css = read_text("css/pages/home.css")
    lives_css = read_text("css/components/lives.css")
    carousel_css = read_text("css/components/carousels.css")

    if re.search(
        r"@media\s*\(max-width:\s*520px\)[\s\S]{0,300}"
        r"\.lives-carousel-button[\s\S]{0,120}display\s*:\s*none",
        lives_css + "\n" + carousel_css,
        re.I,
    ):
        error(
            "Lives: setas não devem ser escondidas no mobile na V46.2."
        )

    if "window.KamyliCarousel" not in lives_js:
        error("js/pages/home/lives.js: controlador compartilhado ausente.")

    if "css/components/lives.css?v=47.4" not in index:
        error("index.html: cache-buster V47.4 ausente para css/components/lives.css.")

    for element_id in ('id="livesTabTwitch"', 'id="livesTabYoutube"'):
        if element_id not in index:
            error(f"index.html: seletor de plataforma V47.4 ausente: {element_id}")

    for needle in ("window.KamyliAPI", '"/twitch/videos"', 'defaultPlatform'):
        if needle not in lives_js:
            error(f"js/pages/home/lives.js: contrato Twitch V47.4 ausente: {needle}")

    home_js = read_text("js/pages/home/home.js")
    if "window.KamyliCarousel" not in home_js:
        error("js/pages/home/home.js: controlador compartilhado ausente.")

    for needle in (
        "TWITCH_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000",
        "'/twitch/videos'",
        "'/debug/twitch-sync'",
        "syncTwitchVideosIfDue(env)",
        "type', 'archive'",
        "twitch:videos",
        "TWITCH_CLIENT_SECRET",
    ):
        if needle not in worker_js:
            error(f"workers.js: contrato Twitch V47.4 ausente: {needle}")


    # V47.4.3: status ao vivo da Twitch isolado do snapshot diário de VODs.
    for element_id in (
        'id="heroViewTabs"',
        'id="heroTabAbout"',
        'id="heroTabLive"',
        'id="heroLivePanel"',
        'id="heroAvatarFrame"',
    ):
        if element_id not in index:
            error(f"index.html: Hero ao vivo V47.4.3 ausente: {element_id}")

    for needle in (
        '"/twitch/live"',
        'heroAvatarFrame',
        'heroLivePanel',
        'setSelectedView("live")',
    ):
        if needle not in twitch_live_js:
            error(f"js/pages/home/twitch-live.js: contrato V47.4.3 ausente: {needle}")

    for needle in (
        "TWITCH_LIVE_REFRESH_INTERVAL_MS = 10 * 60 * 1000",
        "'/twitch/live'",
        "'/debug/twitch-live-sync'",
        "syncTwitchLiveIfDue(env)",
        "`${TWITCH_API}/streams`",
        "twitch:live",
        "caches.default",
    ):
        if needle not in worker_js:
            error(f"workers.js: contrato Twitch Live V47.4.3 ausente: {needle}")

    # V47.4.5: conformidade OAuth Twitch/Streamlabs e retenção curta de metadata.
    for needle in (
        "TWITCH_OAUTH_VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate'",
        "TWITCH_TOKEN_VALIDATE_INTERVAL_MS = 50 * 60 * 1000",
        "TWITCH_USER_CACHE_TTL_SECONDS = 24 * 60 * 60",
        "twitch:app_access_token_validated_at",
        "expirationTtl: TWITCH_USER_CACHE_TTL_SECONDS",
        "createStreamlabsOAuthState(env)",
        "validateStreamlabsOAuthState(env, state)",
        "authUrl.searchParams.set('state'",
        "DEFAULT_ALLOWED_ORIGINS",
    ):
        if needle not in worker_js:
            error(f"workers.js: contrato de conformidade V47.4.5 ausente: {needle}")

    if "env.ALLOWED_ORIGIN || '*" in worker_js or "env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || '*'" in worker_js:
        error("workers.js: CORS não deve voltar ao wildcard implícito na V47.4.5.")

    for needle in (
        "V47.4.5",
        "miniaturas exibidas podem ser carregadas diretamente",
        "infraestrutura",
        "Twitch",
    ):
        if needle not in privacy_html:
            error(f"privacidade/index.html: transparência Twitch V47.4.5 ausente: {needle}")

    for route in ('"home"', '"doacoes"', '"blog"'):
        if route not in page_transitions:
            error(
                "js/core/page-transitions.js: rota padronizada ausente: "
                f"{route}"
            )

    if "site-page-leaving-forward" in page_transitions:
        error(
            "js/core/page-transitions.js: estado forward legado ainda presente."
        )

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
        "livesTrack",
        "agendaGrid",
    ):
        if element_id not in interactions:
            error(f"home-interactions.js: alvo ausente: {element_id}")

    for event_name in ("pointerdown", "pointermove", "pointerup"):
        if event_name not in interactions:
            error(f"home-interactions.js: evento de arraste ausente: {event_name}")


def validate_seo_and_deployment() -> None:
    cname = read_text("CNAME").strip()
    if cname != "kamylisumire.com":
        error("CNAME: esperado kamylisumire.com.")

    index = read_text("index.html")
    donations = read_text("doacoes/index.html")

    blog_index = read_text("blog/index.html")

    checks = (
        (index, 'rel="canonical" href="https://kamylisumire.com/"', "Home canonical"),
        (
            donations,
            'rel="canonical" href="https://kamylisumire.com/doacoes/"',
            "Doações canonical",
        ),
        (
            blog_index,
            'rel="canonical" href="https://kamylisumire.com/blog/"',
            "Blog canonical",
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
        "https://kamylisumire.com/artes/",
        "https://kamylisumire.com/privacidade/",
        "https://kamylisumire.com/uso-de-ia/",
    }

    blog = load_json("data/blog/posts.json")
    published = []
    if isinstance(blog, dict) and isinstance(blog.get("posts"), list):
        published = [
            post for post in blog["posts"]
            if isinstance(post, dict) and post.get("published") is True
        ]

    if published:
        expected.add("https://kamylisumire.com/blog/")
        for post in published:
            slug = post.get("slug")
            if isinstance(slug, str):
                expected.add(f"https://kamylisumire.com/blog/{slug}/")

    if not expected.issubset(urls):
        error("sitemap.xml: URLs públicas obrigatórias estão ausentes.")



def validate_security_contracts() -> None:
    sanitize_rel = "js/core/sanitize.js"
    sanitize_js = read_text(sanitize_rel)
    if "window.KamyliSanitize" not in sanitize_js or "escapeHtml" not in sanitize_js:
        error(f"{sanitize_rel}: namespace compartilhado KamyliSanitize.escapeHtml ausente.")

    # CSP via <meta> protege as páginas estáticas nos hosts atuais.
    # frame-ancestors não é válido nesse modo e, portanto, não faz parte do contrato.
    for path in sorted(ROOT.rglob("*.html")):
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        match = re.search(
            r'<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"',
            text,
            re.I,
        )
        if not match:
            error(f"{rel}: Content-Security-Policy via meta ausente.")
            continue
        csp = match.group(1)
        for directive in SECURITY_CSP_REQUIRED_DIRECTIVES:
            if directive not in csp:
                error(f"{rel}: CSP obrigatória ausente/incompleta: {directive}")
        if "frame-ancestors" in csp:
            error(f"{rel}: frame-ancestors não deve ser declarado via meta CSP; use header HTTP quando disponível.")
        if "upgrade-insecure-requests" in csp:
            error(f"{rel}: upgrade-insecure-requests não deve ser usado na meta CSP; o repositório preserva teste/desenvolvimento local por HTTP.")

        # Qualquer página que use footer.js deve carregar sanitize.js antes dele.
        footer_match = re.search(r'<script[^>]+src=["\']([^"\']*js/core/footer\.js[^"\']*)["\']', text, re.I)
        if footer_match:
            sanitize_pos = text.find("js/core/sanitize.js")
            footer_pos = text.find("js/core/footer.js")
            if sanitize_pos < 0:
                error(f"{rel}: sanitize.js deve ser carregado antes de footer.js.")
            elif sanitize_pos > footer_pos:
                error(f"{rel}: sanitize.js está após footer.js; a ordem deve ser invertida.")

    # Os consumidores conhecidos não devem voltar a manter cópias locais do escape.
    for rel in ("js/core/footer.js", "js/pages/home/home.js", "js/pages/home/content.js"):
        text = read_text(rel)
        if "window.KamyliSanitize?.escapeHtml" not in text:
            error(f"{rel}: deve consumir window.KamyliSanitize.escapeHtml.")
        if re.search(r"function\s+escapeHtml\s*\(", text):
            error(f"{rel}: não deve duplicar implementação local de escapeHtml.")

    worker = read_text("workers.js")
    for needle in ("function timingSafeEqual", "crypto.subtle.timingSafeEqual", "timingSafeEqual(provided, expected)"):
        if needle not in worker:
            error(f"workers.js: hardening timing-safe ausente: {needle}")

def main() -> int:
    validate_required_and_forbidden()
    validate_all_json()
    validate_buttons()
    validate_home_content()
    validate_artes()
    validate_lives()
    validate_blog()
    validate_agenda()
    validate_security_contracts()

    # Valide referências locais de toda página HTML versionada. Isso cobre
    # páginas institucionais aninhadas e futuros artigos estáticos sem depender
    # de uma lista manual que possa ficar desatualizada.
    for path in sorted(ROOT.rglob("*.html")):
        validate_html_local_refs(path.relative_to(ROOT).as_posix())

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
