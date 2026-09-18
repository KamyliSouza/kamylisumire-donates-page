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

import base64
import hashlib
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
    "jogos/index.html",
    "privacidade/index.html",
    "uso-de-ia/index.html",
    "data/blog/config.json",
    "data/blog/posts.json",
    "data/content/artes.json",
    "data/content/jogos.json",
    "data/content/jogos-artwork-cache.json",
    "data/content/buttons.json",
    "data/content/home-cards.json",
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
    ".github/scripts/sync-agenda.mjs",
    ".github/workflows/sync-agenda.yml",
    "js/pages/blog/blog.js",
    "js/pages/artes/artes.js",
    "js/pages/jogos/jogos.js",
    "js/pages/doacoes/doacoes.js",
    "js/pages/doacoes/content.js",
    "js/pages/doacoes/ranking.js",
    "css/pages/home.css",
    "css/pages/blog.css",
    "css/pages/artes.css",
    "css/pages/jogos.css",
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
    "docs/PRIVACIDADE-RANKING.md",
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
    "script-src 'self'",
    "style-src 'self'",
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
    "heroSupport", "heroLive", "livesChannel",
    "homeBlogAll", "homeDonation", "notFoundHome", "donationLivepix",
    "donationPixie", "rankingMonthly", "rankingAllTime", "blogFilterAll",
    "blogArticleBack", "externalCancel", "externalContinue", "settingsOpen",
    "settingsClose", "livesPrev", "livesNext", "agendaPrev", "agendaNext",
}

BUTTON_KEYS_ALLOW_EMPTY_TEXT = {
    "settingsClose", "livesPrev", "livesNext", "agendaPrev", "agendaNext",
}

NAVBAR_LINK_KEYS = (
    "inicio", "lives", "agenda", "artes", "blog",
    "jogos", "regras", "creditos", "apoio",
)

HOME_CARD_BUILTIN_TYPES = (
    "hero", "lives", "agenda", "blog", "regras", "creditos", "apoio",
)
HOME_CARD_TYPES = set(HOME_CARD_BUILTIN_TYPES) | {"personalizado"}
HOME_CARD_SIZES = {"compacto", "grande"}
HOME_CARD_VARIANTS = {"padrao", "suave", "destaque"}
HOME_CARD_ALIGNMENTS = {"esquerda", "centro"}
HOME_CARD_BUTTON_STYLES = {"primario", "contorno"}

BLOG_METADATA_KEYS = (
    "slug", "title", "date", "summary", "tags", "readMinutes", "published",
)

ALLOWED_DOCS = {
    "ARQUITETURA.md",
    "PRODUCAO.md",
    "SANEAMENTO-V44.md",
    "VALIDACAO.md",
    "GUIA-TWITCH-V47.4.md",
    "PRIVACIDADE-RANKING.md",
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


def validate_home_cards() -> None:
    data = load_json("data/content/home-cards.json")
    if not isinstance(data, dict):
        return

    if data.get("version") != 1:
        error("data/content/home-cards.json: version deve permanecer 1.")

    unknown_root = set(data) - {"version", "cards"}
    if unknown_root:
        error(
            "data/content/home-cards.json: chaves raiz desconhecidas: "
            + ", ".join(sorted(unknown_root))
        )

    cards = data.get("cards")
    if not isinstance(cards, list):
        error("data/content/home-cards.json: cards deve ser lista.")
        return
    if len(cards) > 24:
        error("data/content/home-cards.json: cards aceita no máximo 24 itens.")

    ids = set()
    builtin_seen = set()

    for index, card in enumerate(cards):
        label = f"data/content/home-cards.json: cards[{index}]"
        if not isinstance(card, dict):
            error(f"{label} deve ser objeto.")
            continue

        card_id = card.get("id")
        if not isinstance(card_id, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", card_id):
            error(f"{label}.id deve usar minúsculas, números e hífens.")
        elif card_id in ids:
            error(f"{label}.id duplicado: {card_id}.")
        else:
            ids.add(card_id)

        card_type = card.get("tipo")
        if card_type not in HOME_CARD_TYPES:
            error(f"{label}.tipo inválido: {card_type!r}.")

        if not isinstance(card.get("visivel"), bool):
            error(f"{label}.visivel deve ser booleano.")
        if card.get("tamanho") not in HOME_CARD_SIZES:
            error(f"{label}.tamanho deve ser compacto ou grande.")
        if card.get("variante") not in HOME_CARD_VARIANTS:
            error(f"{label}.variante deve ser padrao, suave ou destaque.")

        if card_type in HOME_CARD_BUILTIN_TYPES:
            builtin_seen.add(card_type)
            if card_id != card_type:
                error(f"{label}.id deve permanecer igual ao tipo nativo ({card_type}).")
            extras = set(card) - {"id", "tipo", "visivel", "tamanho", "variante"}
            if extras:
                error(f"{label}: card nativo possui chaves desconhecidas: {', '.join(sorted(extras))}.")
            continue

        extras = set(card) - {
            "id", "tipo", "visivel", "tamanho", "variante", "alinhamento", "conteudo"
        }
        if extras:
            error(f"{label}: chaves desconhecidas: {', '.join(sorted(extras))}.")

        if card.get("alinhamento") not in HOME_CARD_ALIGNMENTS:
            error(f"{label}.alinhamento deve ser esquerda ou centro.")

        content = card.get("conteudo")
        if not isinstance(content, dict):
            error(f"{label}.conteudo deve ser objeto para card personalizado.")
            continue
        content_extras = set(content) - {"eyebrow", "titulo", "descricao", "icone", "acao"}
        if content_extras:
            error(f"{label}.conteudo: chaves desconhecidas: {', '.join(sorted(content_extras))}.")
        for key in ("eyebrow", "descricao"):
            if not isinstance(content.get(key, ""), str):
                error(f"{label}.conteudo.{key} deve ser texto.")
        if not isinstance(content.get("titulo"), str) or not content["titulo"].strip():
            error(f"{label}.conteudo.titulo deve ser texto não vazio.")
        if content.get("icone") not in BUTTON_ICON_NAMES:
            error(f"{label}.conteudo.icone inválido: {content.get('icone')!r}.")

        action = content.get("acao")
        if not isinstance(action, dict):
            error(f"{label}.conteudo.acao deve ser objeto.")
            continue
        action_extras = set(action) - {"texto", "url", "icone", "estilo"}
        if action_extras:
            error(f"{label}.conteudo.acao: chaves desconhecidas: {', '.join(sorted(action_extras))}.")
        for key in ("texto", "url"):
            if not isinstance(action.get(key, ""), str):
                error(f"{label}.conteudo.acao.{key} deve ser texto.")
        if action.get("icone") not in BUTTON_ICON_NAMES:
            error(f"{label}.conteudo.acao.icone inválido: {action.get('icone')!r}.")
        if action.get("estilo") not in HOME_CARD_BUTTON_STYLES:
            error(f"{label}.conteudo.acao.estilo deve ser primario ou contorno.")

        url = action.get("url", "")
        text = action.get("texto", "")
        if bool(str(url).strip()) != bool(str(text).strip()):
            error(f"{label}.conteudo.acao exige texto e url juntos, ou ambos vazios.")
        if isinstance(url, str) and url.strip():
            if url.startswith("/"):
                if url.startswith("//"):
                    error(f"{label}.conteudo.acao.url não deve usar URL protocol-relative.")
            else:
                parsed = urlparse(url)
                if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                    error(f"{label}.conteudo.acao.url deve ser caminho interno iniciado por / ou URL HTTP(S).")

        serialized = json.dumps(card, ensure_ascii=False)
        if re.search(r"<\/?(?:svg|script|style|iframe)\b", serialized, re.I):
            error(f"{label}: HTML/SVG bruto não é permitido.")

    missing = set(HOME_CARD_BUILTIN_TYPES) - builtin_seen
    if missing:
        error(
            "data/content/home-cards.json: cards nativos obrigatórios ausentes: "
            + ", ".join(sorted(missing))
        )

    duplicates = [
        card_type for card_type in HOME_CARD_BUILTIN_TYPES
        if sum(1 for card in cards if isinstance(card, dict) and card.get("tipo") == card_type) != 1
    ]
    if duplicates:
        error(
            "data/content/home-cards.json: cada tipo nativo deve aparecer exatamente uma vez: "
            + ", ".join(duplicates)
        )


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


def validate_navbar() -> None:
    data = load_json("data/content/navbar.json")
    if not isinstance(data, dict):
        return

    if data.get("version") != 2:
        error("data/content/navbar.json: version deve permanecer 2.")

    for key in ("ariaLabel", "brandAriaLabel"):
        value = data.get(key)
        if not isinstance(value, str) or not value.strip():
            error(f"data/content/navbar.json: {key} deve ser texto não vazio.")

    apoio_fixo = data.get("apoioFixoNoFim")
    if apoio_fixo is not None and not isinstance(apoio_fixo, bool):
        error("data/content/navbar.json: apoioFixoNoFim deve ser booleano quando informado.")

    ordem = data.get("ordem")
    if not isinstance(ordem, list):
        error("data/content/navbar.json: ordem deve ser lista.")
    else:
        if len(ordem) != len(NAVBAR_LINK_KEYS):
            error("data/content/navbar.json: ordem deve conter exatamente os nove itens da Navbar.")
        if len(set(ordem)) != len(ordem):
            error("data/content/navbar.json: ordem não pode conter itens duplicados.")
        if set(ordem) != set(NAVBAR_LINK_KEYS):
            error("data/content/navbar.json: ordem deve conter exatamente as chaves estáveis da Navbar.")

    links = data.get("links")
    if not isinstance(links, dict):
        error("data/content/navbar.json: links deve ser objeto.")
        return

    missing = set(NAVBAR_LINK_KEYS) - set(links)
    if missing:
        error(
            "data/content/navbar.json: links obrigatórios ausentes: "
            + ", ".join(sorted(missing))
        )

    unknown = set(links) - set(NAVBAR_LINK_KEYS)
    if unknown:
        error(
            "data/content/navbar.json: links desconhecidos: "
            + ", ".join(sorted(unknown))
        )

    for key in NAVBAR_LINK_KEYS:
        entry = links.get(key)
        label = f"data/content/navbar.json: links.{key}"
        if not isinstance(entry, dict):
            error(f"{label} deve ser objeto.")
            continue

        extra = set(entry) - {"texto", "icone", "url"}
        if extra:
            error(f"{label}: chaves desconhecidas: {', '.join(sorted(extra))}.")

        texto = entry.get("texto")
        if not isinstance(texto, str) or not texto.strip():
            error(f"{label}.texto deve ser texto não vazio.")

        icone = entry.get("icone")
        if icone not in BUTTON_ICON_NAMES:
            error(f"{label}.icone inválido: {icone!r}.")

        url = entry.get("url")
        if not isinstance(url, str) or not url.strip():
            error(f"{label}.url deve ser texto não vazio.")
            continue

        if url.startswith("/"):
            if url.startswith("//"):
                error(f"{label}.url não deve usar URL protocol-relative.")
        else:
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                error(f"{label}.url deve ser caminho interno iniciado por / ou URL HTTP(S).")

        serialized = json.dumps(entry, ensure_ascii=False)
        if re.search(r"<\/?(?:svg|script|style|iframe)\b", serialized, re.I):
            error(f"{label}: HTML/SVG bruto não é permitido.")



def validate_jogos() -> None:
    data = load_json("data/content/jogos.json")
    if not isinstance(data, dict):
        return
    if data.get("version") != 1:
        error("data/content/jogos.json: version deve permanecer 1.")
    board = data.get("board")
    if not isinstance(board, dict) or board.get("id") != "IfgV0jXS":
        error("data/content/jogos.json: board.id deve permanecer IfgV0jXS.")
    lists = data.get("lists")
    games = data.get("games")
    if not isinstance(lists, list) or not isinstance(games, list):
        error("data/content/jogos.json: lists e games devem ser listas.")
        return
    list_ids = set()
    for item in lists:
        if not isinstance(item, dict) or not all(k in item for k in ("id", "name", "pos")):
            error("data/content/jogos.json: cada lista deve ter id, name e pos.")
            continue
        if item["id"] in list_ids:
            error("data/content/jogos.json: IDs de listas não podem se repetir.")
        list_ids.add(item["id"])
    game_ids = set()
    for game in games:
        if not isinstance(game, dict) or not all(k in game for k in ("id", "name", "listId", "listName", "pos", "artwork")):
            error("data/content/jogos.json: jogo com contrato incompleto.")
            continue
        if game["id"] in game_ids:
            error("data/content/jogos.json: IDs de jogos não podem se repetir.")
        game_ids.add(game["id"])
        if game["listId"] not in list_ids:
            error(f"data/content/jogos.json: jogo {game['id']} referencia lista inexistente.")
        artwork = game.get("artwork")
        if artwork is not None:
            if not isinstance(artwork, dict) or artwork.get("provider") != "steam-original":
                error(f"data/content/jogos.json: artwork inválido em {game['id']}.")
            elif not isinstance(artwork.get("url"), str) or not artwork["url"].startswith("https://"):
                error(f"data/content/jogos.json: artwork.url deve ser HTTPS em {game['id']}.")
        steam_app_id = game.get("steamAppId")
        steam_url = game.get("steamUrl")
        if steam_app_id is not None and (not isinstance(steam_app_id, int) or isinstance(steam_app_id, bool) or steam_app_id <= 0):
            error(f"data/content/jogos.json: steamAppId inválido em {game['id']}.")

        icon = game.get("icon")
        if icon is not None:
            if not isinstance(steam_app_id, int) or isinstance(steam_app_id, bool) or steam_app_id <= 0:
                error(f"data/content/jogos.json: icon exige steamAppId confirmado em {game['id']}.")
            elif not isinstance(icon, dict) or icon.get("provider") != "steam-original":
                error(f"data/content/jogos.json: icon inválido em {game['id']}.")
            elif icon.get("steamAppId") != steam_app_id:
                error(f"data/content/jogos.json: icon.steamAppId deve corresponder ao steamAppId em {game['id']}.")
            elif not isinstance(icon.get("url"), str):
                error(f"data/content/jogos.json: icon.url deve ser texto HTTPS em {game['id']}.")
            else:
                parsed_icon = urlparse(icon["url"])
                icon_filename = parsed_icon.path.rsplit("/", 1)[-1]
                valid_icon = (
                    parsed_icon.scheme == "https"
                    and parsed_icon.hostname == "cdn.cloudflare.steamstatic.com"
                    and parsed_icon.path.startswith(f"/steamcommunity/public/images/apps/{steam_app_id}/")
                    and re.fullmatch(r"[a-f0-9]{40}\.jpg", icon_filename, flags=re.I) is not None
                )
                if not valid_icon:
                    error(f"data/content/jogos.json: icon deve usar o ícone oficial da Steam em {game['id']}.")
        legacy_artwork_app_id = artwork.get("steamAppId") if isinstance(artwork, dict) and artwork.get("provider") == "steam-original" else None
        effective_app_id = steam_app_id if isinstance(steam_app_id, int) and not isinstance(steam_app_id, bool) else legacy_artwork_app_id
        if steam_url is not None:
            if not isinstance(steam_url, str) or not re.fullmatch(r"https://store\.steampowered\.com/app/[0-9]+/", steam_url):
                error(f"data/content/jogos.json: steamUrl inválida em {game['id']}.")
            if not isinstance(effective_app_id, int) or isinstance(effective_app_id, bool):
                error(f"data/content/jogos.json: steamUrl exige steamAppId confirmado em {game['id']}.")
            elif steam_url != f"https://store.steampowered.com/app/{effective_app_id}/":
                error(f"data/content/jogos.json: steamUrl não corresponde ao steamAppId em {game['id']}.")
        if isinstance(artwork, dict) and artwork.get("provider") == "steam-original":
            if not isinstance(legacy_artwork_app_id, int):
                error(f"data/content/jogos.json: artwork Steam exige steamAppId em {game['id']}.")
            elif steam_app_id is not None and legacy_artwork_app_id != steam_app_id:
                error(f"data/content/jogos.json: artwork Steam deve corresponder ao steamAppId do jogo em {game['id']}.")
            else:
                parsed_artwork = urlparse(artwork.get("url", ""))
                legacy_prefix = f"/steam/apps/{legacy_artwork_app_id}/"
                modern_prefix = f"/store_item_assets/steam/apps/{legacy_artwork_app_id}/"
                valid_legacy = (
                    parsed_artwork.scheme == "https"
                    and parsed_artwork.hostname == "cdn.cloudflare.steamstatic.com"
                    and parsed_artwork.path.startswith(legacy_prefix)
                    and parsed_artwork.path.rsplit("/", 1)[-1] in {"library_600x900.jpg", "library_600x900_2x.jpg"}
                )
                valid_modern = (
                    parsed_artwork.scheme == "https"
                    and parsed_artwork.hostname == "shared.fastly.steamstatic.com"
                    and parsed_artwork.path.startswith(modern_prefix)
                    and parsed_artwork.path.rsplit("/", 1)[-1] in {
                        "library_capsule.jpg", "library_capsule_2x.jpg",
                        "library_600x900.jpg", "library_600x900_2x.jpg",
                    }
                )
                if not (valid_legacy or valid_modern):
                    error(f"data/content/jogos.json: asset Steam original deve usar uma Library Capsule oficial em {game['id']}.")

    navbar = load_json("data/content/navbar.json")
    jogos_link = navbar.get("links", {}).get("jogos", {}) if isinstance(navbar, dict) else {}
    if jogos_link.get("url") != "/jogos/" or jogos_link.get("icone") != "none":
        error("data/content/navbar.json: Jogos deve apontar internamente para /jogos/ sem ícone externo.")

    navbar_js = read_text("js/core/navbar.js")
    if 'data-nav-key="jogos" data-nav-page="jogos"' not in navbar_js or 'sitePath("/jogos/")' not in navbar_js:
        error("js/core/navbar.js: link Jogos deve permanecer interno e reconhecido como página.")


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

        schedule = item.get("horario", "")
        if schedule and not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", schedule):
            error(f"{label}.horario deve ser HH:MM ou vazio.")

        platforms = item.get("plataformas")
        allowed_platforms = {"YouTube", "Twitch"}
        if not isinstance(platforms, list) or not all(isinstance(value, str) and value.strip() for value in platforms):
            error(f"{label}.plataformas deve ser uma lista de textos não vazios.")
        elif any(value not in allowed_platforms for value in platforms):
            error(f"{label}.plataformas aceita somente YouTube e Twitch.")

        lives = item.get("lives")
        if lives is not None:
            if not isinstance(lives, list):
                error(f"{label}.lives deve ser uma lista quando presente.")
                continue

            if item.get("temLive") is False and lives:
                warn(f"{label}.lives será ignorado porque temLive=false; isso pode ocorrer após edição por Helper legado.")

            for live_index, live in enumerate(lives):
                live_label = f"{label}.lives[{live_index}]"
                if not isinstance(live, dict):
                    error(f"{live_label} deve ser objeto.")
                    continue

                live_schedule = live.get("horario", "")
                if live_schedule and not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", live_schedule):
                    error(f"{live_label}.horario deve ser HH:MM ou vazio.")
                if not isinstance(live.get("titulo"), str) or not live.get("titulo", "").strip():
                    error(f"{live_label}.titulo deve ser texto não vazio.")
                if not isinstance(live.get("descricao", ""), str):
                    error(f"{live_label}.descricao deve ser texto.")
                live_platforms = live.get("plataformas")
                if not isinstance(live_platforms, list) or not live_platforms or not all(isinstance(value, str) and value.strip() for value in live_platforms):
                    error(f"{live_label}.plataformas deve conter ao menos uma plataforma.")
                elif len(set(live_platforms)) != len(live_platforms):
                    error(f"{live_label}.plataformas não deve conter duplicatas.")
                elif any(value not in allowed_platforms for value in live_platforms):
                    error(f"{live_label}.plataformas aceita somente YouTube e Twitch.")

                steam_app_id = live.get("steamAppId")
                if steam_app_id is not None and (
                    not isinstance(steam_app_id, int) or isinstance(steam_app_id, bool) or steam_app_id <= 0
                ):
                    error(f"{live_label}.steamAppId deve ser inteiro positivo quando informado.")

                icon = live.get("icon")
                if icon is not None:
                    if not isinstance(steam_app_id, int) or isinstance(steam_app_id, bool) or steam_app_id <= 0:
                        error(f"{live_label}.icon exige steamAppId válido.")
                    elif not isinstance(icon, dict) or icon.get("provider") != "steam-original":
                        error(f"{live_label}.icon deve ser um asset steam-original.")
                    elif icon.get("steamAppId") != steam_app_id:
                        error(f"{live_label}.icon.steamAppId deve corresponder ao steamAppId da live.")
                    elif not isinstance(icon.get("url"), str):
                        error(f"{live_label}.icon.url deve ser texto HTTPS.")
                    else:
                        parsed_icon = urlparse(icon["url"])
                        icon_filename = parsed_icon.path.rsplit("/", 1)[-1]
                        valid_icon = (
                            parsed_icon.scheme == "https"
                            and parsed_icon.hostname == "cdn.cloudflare.steamstatic.com"
                            and parsed_icon.path.startswith(f"/steamcommunity/public/images/apps/{steam_app_id}/")
                            and re.fullmatch(r"[a-f0-9]{40}\.jpg", icon_filename, flags=re.I) is not None
                        )
                        if not valid_icon:
                            error(f"{live_label}.icon deve usar o ícone oficial da Steam.")

                # Compatibilidade transitória com agendas geradas antes da V48.3.28.
                # A Home não renderiza mais essa capa, e o próximo sync a remove.
                artwork = live.get("artwork")
                if artwork is not None:
                    if not isinstance(steam_app_id, int) or isinstance(steam_app_id, bool) or steam_app_id <= 0:
                        error(f"{live_label}.artwork exige steamAppId válido.")
                    elif not isinstance(artwork, dict) or artwork.get("provider") != "steam-original":
                        error(f"{live_label}.artwork deve ser um asset steam-original.")
                    elif artwork.get("steamAppId") != steam_app_id:
                        error(f"{live_label}.artwork.steamAppId deve corresponder ao steamAppId da live.")
                    elif not isinstance(artwork.get("url"), str):
                        error(f"{live_label}.artwork.url deve ser texto HTTPS.")
                    else:
                        parsed_artwork = urlparse(artwork["url"])
                        filename = parsed_artwork.path.rsplit("/", 1)[-1]
                        valid_legacy = (
                            parsed_artwork.scheme == "https"
                            and parsed_artwork.hostname == "cdn.cloudflare.steamstatic.com"
                            and parsed_artwork.path.startswith(f"/steam/apps/{steam_app_id}/")
                            and filename in {"library_600x900.jpg", "library_600x900_2x.jpg"}
                        )
                        valid_modern = (
                            parsed_artwork.scheme == "https"
                            and parsed_artwork.hostname == "shared.fastly.steamstatic.com"
                            and parsed_artwork.path.startswith(f"/store_item_assets/steam/apps/{steam_app_id}/")
                            and filename in {
                                "library_capsule.jpg", "library_capsule_2x.jpg",
                                "library_600x900.jpg", "library_600x900_2x.jpg",
                            }
                        )
                        if not (valid_legacy or valid_modern):
                            error(f"{live_label}.artwork deve usar uma Library Capsule oficial da Steam.")

            if lives and item.get("temLive") is True:
                first = lives[0]
                if any(item.get(field) != first.get(field) for field in ("horario", "titulo", "descricao", "plataformas")):
                    warn(f"{label}: campos legados divergem da primeira entrada de lives; a Home prioriza os campos legados para compatibilidade com Helpers antigos.")

        if item.get("temLive") is False:
            for field in ("horario", "titulo", "descricao"):
                if item.get(field, "") not in ("", None):
                    error(f"{label}.{field} deve ficar vazio quando temLive=false.")

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
    jogos_index = read_text("jogos/index.html")
    artes_css = read_text("css/pages/artes.css")
    blog_css = read_text("css/pages/blog.css")
    jogos_css = read_text("css/pages/jogos.css")
    blog_js = read_text("js/pages/blog/blog.js")
    artes_js = read_text("js/pages/artes/artes.js")
    horizontal_scroll_js = read_text("js/core/horizontal-scroll.js")
    sync_jogos_js = read_text(".github/scripts/sync-jogos.mjs")
    sync_jogos_workflow = read_text(".github/workflows/sync-jogos.yml")
    sync_agenda_js = read_text(".github/scripts/sync-agenda.mjs")
    sync_agenda_workflow = read_text(".github/workflows/sync-agenda.yml")
    jogos_js = read_text("js/pages/jogos/jogos.js")
    not_found = read_text("404.html")
    config = read_text("js/core/config.js")
    lives_js = read_text("js/pages/home/lives.js")
    twitch_live_js = read_text("js/pages/home/twitch-live.js")
    carousel_js = read_text("js/pages/home/carousel.js")
    interactions = read_text("js/pages/home/home-interactions.js")
    navbar = read_text("js/core/navbar.js")
    content_js = read_text("js/core/content.js")
    page_transitions = read_text("js/core/page-transitions.js")
    buttons_js = read_text("js/core/buttons.js")
    button_icons_js = read_text("js/core/button-icons.js")
    worker_js = read_text("workers.js")
    ranking_js = read_text("js/pages/doacoes/ranking.js")
    privacy_html = read_text("privacidade/index.html")
    ranking_privacy_doc = read_text("docs/PRIVACIDADE-RANKING.md")

    for element_id in (
        'id="inicio"',
        'id="heroSupportButton"',
        'id="homeDonationButton"',
        'id="livesTrack"',
        'id="agendaGrid"',
    ):
        if element_id not in index:
            error(f"index.html: elemento obrigatório ausente: {element_id}")

    # V48.2.0: a Home usa grade editorial para ordenar, ocultar e dimensionar cards.
    for needle in (
        'id="homeLayout"',
        'data-home-card-id="hero"',
        'data-home-card-id="lives"',
        'data-home-card-id="agenda"',
        'data-home-card-id="blog"',
        'data-home-card-id="regras"',
        'data-home-card-id="creditos"',
        'data-home-card-id="apoio"',
    ):
        if needle not in index:
            error(f"index.html: contrato de cards da Home V48.2.0 ausente: {needle}")
    if 'class="two-column-section"' in index:
        error("index.html: regras/créditos não devem voltar ao wrapper fixo two-column-section; a grade editorial controla o tamanho.")

    home_css = read_text("css/pages/home.css")
    home_content_js = read_text("js/pages/home/content.js")
    home_js = read_text("js/pages/home/home.js")
    for needle in (
        '.home-layout {',
        'grid-template-columns: repeat(2, minmax(0, 1fr))',
        '.home-layout > .home-card[data-home-card-size="grande"]',
        '.home-layout > .home-card[data-home-card-size="compacto"]',
        '.home-card[data-home-card-visible="false"]',
        '.home-custom-card {',
    ):
        if needle not in home_css:
            error(f"css/pages/home.css: regra de cards da Home V48.2.0 ausente: {needle}")
    for needle in (
        '"/data/content/home-cards.json"',
        'function applyHomeCards(data)',
        'type === "personalizado"',
        'data-home-generated',
        'HOME_CARD_BUTTON_STYLES',
    ):
        if needle not in home_content_js:
            error(f"js/pages/home/content.js: runtime de cards da Home V48.2.0 ausente: {needle}")

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

    if "css/pages/home.css?v=48.3.28" not in index:
        error("index.html: cache-buster V48.3.28 ausente para css/pages/home.css.")
    if "js/pages/home/content.js?v=48.2.0" not in index:
        error("index.html: cache-buster V48.2.0 ausente para js/pages/home/content.js.")
    if "js/pages/home/home.js?v=48.3.28" not in index:
        error("index.html: cache-buster V48.3.28 ausente para js/pages/home/home.js.")

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
        'class="artes-search-field-control"',
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
        'class="blog-search-field-control"',
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
        (r"\.blog-intro h1\s*\{([^}]*)\}", ("color: var(--primary-color)",)),
        (r"\.blog-search-field\s*\{([^}]*)\}", ("min-height: 44px", "min-width: 248px", "background: var(--nav-bg)", "border-radius: 14px", "backdrop-filter: blur(calc(var(--blur-card) + 6px))")),
        (r"\.blog-search-field-control\s*\{([^}]*)\}", ("position: relative", "flex: 1 1 auto", "min-width: 0")),
        (r"\.blog-search-field-toggle\s*\{([^}]*)\}", ("width: 100%",)),
        (r"\.blog-search-field-menu\s*\{([^}]*)\}", ("right: 0", "background: var(--nav-bg)", "border-radius: 16px", "box-shadow: var(--shadow-card)", "backdrop-filter: blur(calc(var(--blur-card) + 8px))")),
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

    # V48.3.7: contraste AA para texto normal sem escurecer títulos grandes/ícones.
    variables_css = read_text("css/core/variables.css")
    if "--primary-text: #9b4d97;" not in variables_css:
        error("css/core/variables.css: --primary-text claro V48.3.7 ausente/incorreto.")
    if variables_css.count("--primary-text: #d178cd;") < 2:
        error("css/core/variables.css: --primary-text escuro V48.3.7 ausente no tema escuro/automático.")

    large_title_rules = (
        (read_text("css/pages/home.css"), "Home", r"\.hero-copy h1\s*\{([^}]*)\}"),
        (artes_css, "Galeria", r"\.artes-intro h1\s*\{([^}]*)\}"),
        (blog_css, "Blog", r"\.blog-intro h1\s*\{([^}]*)\}"),
        (read_text("css/pages/404.css"), "404", r"\.not-found-card h1\s*\{([^}]*)\}"),
        (read_text("css/pages/doacoes.css"), "Doações", r"\.donation-card h1\s*\{([^}]*)\}"),
    )
    for css_text, label, pattern in large_title_rules:
        match = re.search(pattern, css_text, flags=re.S)
        if not match or "color: var(--primary-color)" not in match.group(1):
            error(f"V48.3.7: título grande de {label} deve preservar --primary-color.")

    normal_text_rules = (
        (read_text("css/core/global.css"), "global", ".eyebrow"),
        (read_text("css/components/ranking.css"), "ranking", ".ranking-amount"),
        (artes_css, "artes", ".artes-search-field-option:hover"),
        (blog_css, "blog", ".blog-article-body a"),
        (read_text("css/pages/privacidade.css"), "privacidade", ".privacy-section a:not(.button)"),
    )
    for css_text, label, selector in normal_text_rules:
        pos = css_text.find(selector)
        end = css_text.find("}", pos) if pos >= 0 else -1
        if pos < 0 or end < 0 or "color: var(--primary-text)" not in css_text[pos:end]:
            error(f"V48.3.7: uso de --primary-text ausente em {label}: {selector}.")

    for needle in (
        'const normalizedIndex = (index + elements.searchFieldOptions.length) % elements.searchFieldOptions.length',
        'elements.searchField.setAttribute("aria-expanded", "true")',
        'document.addEventListener("pointerdown"',
        'setupSearchFieldMenu(config)',
    ):
        if needle not in blog_js:
            error(f"js/pages/blog/blog.js: interação do drop-down V48.1.3 ausente: {needle}")

    # V48.3.3: o menu deve ser ancorado ao controle do valor, não ao bloco
    # inteiro "Buscar em + valor", para manter alinhamento consistente.
    gallery_selector_rules = (
        (r"\.artes-search-field-control\s*\{([^}]*)\}", ("position: relative", "flex: 1 1 auto", "min-width: 0")),
        (r"\.artes-search-field-toggle\s*\{([^}]*)\}", ("width: 100%",)),
        (r"\.artes-search-field-menu\s*\{([^}]*)\}", ("right: 0", "box-sizing: border-box")),
    )
    for pattern, required_declarations in gallery_selector_rules:
        match = re.search(pattern, artes_css, flags=re.S)
        if not match:
            error(f"css/pages/artes.css: correção de ancoragem V48.3.3 ausente: {pattern}")
            continue
        block = match.group(1)
        for declaration in required_declarations:
            if declaration not in block:
                error(f"css/pages/artes.css: seletor V48.3.3 incompleto: {declaration}")

    # V48.3.10: o pai continua sem backdrop-filter para não virar Backdrop Root.
    # A superfície ::before avança 2 px sob a moldura e passa a desenhar a borda;
    # assim o próprio border-box da superfície participa do backdrop-filter.
    selector_blur_rules = (
        (artes_css, "artes", r"\.artes-tools\s*\{([^}]*)\}", ("isolation: isolate", "background-color: transparent", "border-color: transparent", "backdrop-filter: none")),
        (artes_css, "artes", r"\.artes-tools::before\s*\{([^}]*)\}", ("inset: -2px", "border: 2px solid var(--card-border)", "border-radius: var(--radius-card)", "background: var(--card-bg)", "color-mix(in srgb, var(--card-bg) 72%, transparent)", "backdrop-filter: blur(var(--blur-card))", "pointer-events: none")),
        (artes_css, "artes", r"\.artes-search-field\s*\{([^}]*)\}", ("color-mix(in srgb, var(--nav-bg) 68%, transparent)", "backdrop-filter: blur(calc(var(--blur-card) + 6px)) saturate(115%)")),
        (artes_css, "artes", r"\.artes-search-field-menu\s*\{([^}]*)\}", ("color-mix(in srgb, var(--nav-bg) 66%, transparent)", "backdrop-filter: blur(calc(var(--blur-card) + 8px)) saturate(120%)")),
        (artes_css, "artes", r"\.artes-search-field-menu\.is-portaled\s*\{([^}]*)\}", ("position: fixed", "z-index: 1300", "max-width: calc(100vw - 24px)")),
        (blog_css, "blog", r"\.blog-tools\s*\{([^}]*)\}", ("isolation: isolate", "background-color: transparent", "border-color: transparent", "backdrop-filter: none")),
        (blog_css, "blog", r"\.blog-tools::before\s*\{([^}]*)\}", ("inset: -2px", "border: 2px solid var(--card-border)", "border-radius: var(--radius-card)", "background: var(--card-bg)", "color-mix(in srgb, var(--card-bg) 72%, transparent)", "backdrop-filter: blur(var(--blur-card))", "pointer-events: none")),
        (blog_css, "blog", r"\.blog-search-field\s*\{([^}]*)\}", ("color-mix(in srgb, var(--nav-bg) 68%, transparent)", "backdrop-filter: blur(calc(var(--blur-card) + 6px)) saturate(115%)")),
        (blog_css, "blog", r"\.blog-search-field-menu\s*\{([^}]*)\}", ("color-mix(in srgb, var(--nav-bg) 66%, transparent)", "backdrop-filter: blur(calc(var(--blur-card) + 8px)) saturate(120%)")),
        (blog_css, "blog", r"\.blog-search-field-menu\.is-portaled\s*\{([^}]*)\}", ("position: fixed", "z-index: 1300", "max-width: calc(100vw - 24px)")),
    )
    for css_text, label, pattern, required_declarations in selector_blur_rules:
        match = re.search(pattern, css_text, flags=re.S)
        if not match:
            error(f"css/pages/{label}.css: regra de blur V48.3.10 ausente: {pattern}")
            continue
        block = match.group(1)
        for declaration in required_declarations:
            if declaration not in block:
                error(f"css/pages/{label}.css: blur V48.3.10 incompleto: {declaration}")

    selector_portal_rules = (
        (artes_js, "artes", ("positionSearchFieldMenu", "portalSearchFieldMenu", "restoreSearchFieldMenu", "document.body.appendChild(searchFieldMenu)", 'classList.add("is-portaled")', "getBoundingClientRect()")),
        (blog_js, "blog", ("positionSearchFieldMenu", "portalSearchFieldMenu", "restoreSearchFieldMenu", "document.body.appendChild(elements.searchFieldMenu)", 'classList.add("is-portaled")', "getBoundingClientRect()")),
    )
    for js_text, label, needles in selector_portal_rules:
        for needle in needles:
            if needle not in js_text:
                error(f"js/pages/{label}/{label}.js: portal do seletor V48.3.5 ausente: {needle}")

    # V48.1.2: o painel de ferramentas precisa permanecer explicitamente acima
    # da masonry para o menu não ser coberto pelos cards/imagens da primeira linha.
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
        if "loader.js?v=48.3.6" not in html:
            error(f"{rel}: cache-buster do loader V48.3.6 ausente.")
        if "global.css?v=48.3.7" not in html:
            error(f"{rel}: cache-buster do CSS global V48.3.7 ausente.")

    if "loader.js?v=48.3.6" not in not_found:
        error("404.html: cache-buster do loader V48.3.6 ausente.")
    if "global.css?v=48.3.7" not in not_found:
        error("404.html: cache-buster do CSS global V48.3.7 ausente.")

    # O domínio próprio é a configuração deliberada desde V44.4.
    if "https://api.kamylisumire.com" not in config:
        error(
            "js/core/config.js: domínio principal api.kamylisumire.com "
            "não reconhecido."
        )

    for rel, html in (("index.html", index), ("doacoes/index.html", donations), ("blog/index.html", blog_index), ("404.html", not_found)):
        if "js/core/button-icons.js?v=47.2" not in html or "js/core/buttons.js?v=48.3.6" not in html:
            error(f"{rel}: módulos de botões/navbar V48.3.6 não carregados.")

    for rel, html in (("index.html", index), ("doacoes/index.html", donations), ("blog/index.html", blog_index), ("404.html", not_found)):
        for asset in (
            "js/core/content.js?v=48.3.6",
            "js/core/navbar.js?v=48.3.14",
            "js/core/external-links.js?v=47",
            "js/core/footer.js?v=47",
            "css/core/navbar.css?v=48.3.7",
        ):
            if asset not in html:
                error(f"{rel}: cache-buster V47 ausente para {asset.split('?')[0]}.")

    for asset in (
        "js/pages/home/content.js?v=48.2.0",
        "js/pages/home/lives.js?v=47.4.3",
        "js/pages/home/twitch-live.js?v=48.3.7",
        "js/pages/home/home-interactions.js?v=47",
        "css/components/home-interactions.css?v=47",
    ):
        if asset not in index:
            error(f"index.html: cache-buster V47 ausente para {asset.split('?')[0]}.")

    if "js/pages/doacoes/content.js?v=47" not in donations:
        error("doacoes/index.html: cache-buster V47 ausente para js/pages/doacoes/content.js.")

    if "js/pages/blog/blog.js?v=48.3.19" not in blog_index:
        error("blog/index.html: cache-buster V48.3.19 ausente para js/pages/blog/blog.js.")
    if "css/pages/blog.css?v=48.3.22" not in blog_index:
        error("blog/index.html: cache-buster V48.3.22 ausente para css/pages/blog.css.")
    if "js/pages/artes/artes.js?v=48.3.19" not in artes_index:
        error("artes/index.html: cache-buster V48.3.19 ausente para js/pages/artes/artes.js.")
    if "css/pages/artes.css?v=48.3.22" not in artes_index:
        error("artes/index.html: cache-buster V48.3.22 ausente para css/pages/artes.css.")

    if "css/pages/jogos.css?v=48.3.22" not in jogos_index:
        error("jogos/index.html: cache-buster V48.3.22 ausente para css/pages/jogos.css.")
    if "js/pages/jogos/jogos.js?v=48.3.19" not in jogos_index:
        error("jogos/index.html: cache-buster V48.3.19 ausente para js/pages/jogos/jogos.js.")

    # V48.3.18: filtros de Jogos, Blog e Galeria permanecem em uma única linha
    # rolável, sem aumentar a altura da barra conforme novas categorias/tags surgem.
    scrollable_filter_contracts = (
        ("Jogos", jogos_css, ".jogos-filters", ".jogos-filter"),
        ("Blog", blog_css, ".blog-filters", ".blog-filter"),
        ("Galeria", artes_css, ".artes-filters", ".artes-filter"),
    )
    for label, css, container_selector, item_selector in scrollable_filter_contracts:
        container_match = re.search(
            rf"{re.escape(container_selector)}\s*\{{(?P<body>.*?)\}}",
            css,
            re.DOTALL,
        )
        item_match = re.search(
            rf"{re.escape(item_selector)}\s*\{{(?P<body>.*?)\}}",
            css,
            re.DOTALL,
        )
        if not container_match or not item_match:
            error(f"css/pages: contrato V48.3.18 de filtros ausente em {label}.")
            continue

        container_body = container_match.group("body")
        item_body = item_match.group("body")
        for declaration in (
            "min-width: 0;",
            "max-width: 100%;",
            "flex-wrap: nowrap;",
            "overflow-x: auto;",
            "overscroll-behavior-inline: contain;",
            "scrollbar-width: none;",
        ):
            if declaration not in container_body:
                error(f"css/pages: {label} sem '{declaration}' no filtro rolável V48.3.18.")
        if "flex: 0 0 auto;" not in item_body:
            error(f"css/pages: {label} permite encolher tags/categorias no filtro V48.3.18.")

    # V48.3.18: paginação de Jogos usa no máximo cinco páginas numéricas visíveis,
    # preserva primeira/última e oferece navegação anterior/próxima. Filtros e
    # trocas de página usam transição curta, respeitando prefers-reduced-motion.
    for token in (
        "const MAX_VISIBLE_PAGES = 5;",
        "function getVisiblePages(totalPages)",
        "function makeArrow(direction, totalPages)",
        'className = "jogos-pagination-gap"',
        'renderGames({ animate: true })',
        'window.matchMedia("(prefers-reduced-motion: reduce)")',
    ):
        if token not in jogos_js:
            error(f"js/pages/jogos/jogos.js: contrato V48.3.18 ausente: {token}")

    for token in (
        ".jogos-pagination-arrow",
        ".jogos-pagination-gap",
        ".jogos-page-button:disabled",
        "@media (prefers-reduced-motion: reduce)",
    ):
        if token not in jogos_css:
            error(f"css/pages/jogos.css: paginação/transição V48.3.18 ausente: {token}")

    for label, script, trigger in (
        ("Galeria", artes_js, "applyFilters({ animate: true })"),
        ("Blog", blog_js, "renderList(data, { animate: true })"),
    ):
        if "function animateResults(node)" not in script or trigger not in script:
            error(f"{label}: transição de filtro V48.3.18 ausente ou incompleta.")
        if 'window.matchMedia("(prefers-reduced-motion: reduce)")' not in script:
            error(f"{label}: transição V48.3.18 não respeita prefers-reduced-motion.")

    # V48.3.19: a faixa rolável preserva a geometria mobile e reutiliza o
    # padrão click + arrasta de Lives/Agenda sem mover a viewport inteira.
    for label, html in (("Jogos", jogos_index), ("Blog", blog_index), ("Galeria", artes_index)):
        if "js/core/horizontal-scroll.js?v=48.3.21" not in html:
            error(f"{label}: helper horizontal V48.3.21 ausente do HTML.")

    for token in (
        "const DRAG_THRESHOLD = 5;",
        "event.pointerType === \"touch\"",
        'track.classList.add("horizontal-click-drag")',
        'track.classList.add("is-click-dragging")',
        "suppressClickUntil",
        "function revealItem(track, item",
        "track.scrollTo({ left: target, behavior })",
    ):
        if token not in horizontal_scroll_js:
            error(f"js/core/horizontal-scroll.js: contrato V48.3.19 ausente: {token}")

    for label, script, container in (
        ("Jogos", jogos_js, "els.filters"),
        ("Blog", blog_js, "elements.filters"),
        ("Galeria", artes_js, "filters"),
    ):
        if f"horizontalScroll?.enableClickDrag({container})" not in script:
            error(f"{label}: click + arrasta V48.3.19 não foi habilitado na faixa de filtros.")
        if f"horizontalScroll?.revealItem({container}, button" not in script:
            error(f"{label}: seleção ainda pode deslocar a viewport em vez da faixa V48.3.19.")
        if "scrollIntoView({" in script and f"revealItem({container}, button" not in script:
            error(f"{label}: scrollIntoView regressivo detectado nos filtros V48.3.19.")

    for label, css, container_selector in (
        ("Jogos", jogos_css, ".jogos-filters"),
        ("Blog", blog_css, ".blog-filters"),
        ("Galeria", artes_css, ".artes-filters"),
    ):
        container_match = re.search(
            rf"{re.escape(container_selector)}\s*\{{(?P<body>.*?)\}}",
            css,
            re.DOTALL,
        )
        if not container_match:
            error(f"{label}: faixa V48.3.19 ausente.")
            continue
        body = container_match.group("body")
        if "overflow-y: hidden;" not in body:
            error(f"{label}: contenção vertical da faixa V48.3.19 ausente.")
        for token in (".is-click-dragging", ".horizontal-click-drag"):
            if token not in css:
                error(f"{label}: estado visual de arraste V48.3.19 ausente: {token}")

    # V48.3.22: setas continuam sobrepostas e os fades passam a usar máscara
    # na própria faixa rolável, evitando blocos visíveis sobre o vidro.
    filter_arrow_contracts = (
        ("Jogos", jogos_index, jogos_css, ".jogos-filter-scroll", ".jogos-filters", ".jogos-filter-arrow", '.jogos-filter[aria-pressed="true"]'),
        ("Blog", blog_index, blog_css, ".blog-filter-scroll", ".blog-filters", ".blog-filter-arrow", ".blog-filter.is-active"),
        ("Galeria", artes_index, artes_css, ".artes-filter-scroll", ".artes-filters", ".artes-filter-arrow", ".artes-filter.is-active"),
    )
    for label, html, css, shell_selector, track_selector, arrow_selector, active_selector in filter_arrow_contracts:
        for token in (
            "data-horizontal-scroll-shell",
            "data-horizontal-scroll-prev",
            "data-horizontal-scroll-next",
        ):
            if token not in html:
                error(f"{label}: controle lateral V48.3.22 ausente do HTML: {token}.")
        if shell_selector not in css or arrow_selector not in css:
            error(f"{label}: shell/setas V48.3.22 ausentes do CSS.")
        for declaration in (
            "padding-block: 14px;",
            "padding-inline: 6px;",
            "scroll-padding-inline: 48px;",
        ):
            if declaration not in css:
                error(f"{label}: respiro de sombra V48.3.22 ausente: {declaration}")
        for token in (
            f"{shell_selector}.can-scroll-prev {track_selector}",
            f"{shell_selector}.can-scroll-next {track_selector}",
            f"{shell_selector}.can-scroll-prev.can-scroll-next {track_selector}",
            "-webkit-mask-image: linear-gradient(",
            "mask-image: linear-gradient(",
            "position: absolute;",
            active_selector,
            "inset 0 0 0 1px",
        ):
            if token not in css:
                error(f"{label}: máscara/realce V48.3.22 ausente: {token}")
        for obsolete in (
            f"{shell_selector}::before",
            f"{shell_selector}::after",
        ):
            if obsolete in css:
                error(f"{label}: camada de fade antiga V48.3.21 ainda presente: {obsolete}")

    for token in (
        "function enableOverflowControls(track)",
        'track.closest("[data-horizontal-scroll-shell]")',
        'shell.classList.toggle("has-horizontal-overflow", hasOverflow)',
        'shell.classList.toggle("can-scroll-prev", canScrollPrevious)',
        'shell.classList.toggle("can-scroll-next", canScrollNext)',
        "const OVERLAY_SAFE_INLINE_INSET = 48;",
        "track.scrollBy({ left: amount * direction, behavior })",
        'enableOverflowControls(track);',
        "enableOverflowControls,",
    ):
        if token not in horizontal_scroll_js:
            error(f"js/core/horizontal-scroll.js: contrato de setas/fades V48.3.21 ausente: {token}")

    # V48.3.23: override gratuito pelo marcador SteamAppID na descrição do card.
    # A descrição é consultada somente pelo Action e nunca entra no JSON público.
    for token in (
        "function getSteamAppIdFromDescription(card)",
        '.split(/\\r?\\n/)',
        '/^steam\\s*app\\s*id\\s*:/i',
        'fields: "id,name,idList,pos,closed,desc"',
        "let steamAppId = getSteamAppIdFromDescription(card);",
        "if (steamAppId) {",
        "Steam via descrição do Trello:",
    ):
        if token not in sync_jogos_js:
            error(f".github/scripts/sync-jogos.mjs: override Steam/Trello V48.3.23 ausente: {token}")

    for obsolete in (
        "findSteamAppIdField(customFields)",
        "getSteamAppIdFromCard(card, field)",
        'trelloUrl(`/boards/${BOARD_ID}/customFields`)',
        'customFieldItems: "true"',
    ):
        if obsolete in sync_jogos_js:
            error(f".github/scripts/sync-jogos.mjs: dependência paga de Custom Fields ainda presente: {obsolete}")

    # V48.3.25: a identificação automática é Steam-only e usa a Web API pública
    # documentada. A chave fica somente no GitHub Actions e segue via header.
    for token in (
        'const STEAM_WEB_API_KEY = process.env.STEAM_WEB_API_KEY;',
        'const steamApiHeaders = { "x-webapi-key": STEAM_WEB_API_KEY };',
        'IStoreService/GetAppList/v1/',
        'include_games: true',
        'max_results: 50000',
        'function buildSteamNameIndex(apps)',
        'function findSteamApp(name, index)',
        'function migrateArtworkCache(raw)',
        'version: 3, entries: {}',
        'source: "steam-original"',
        'function getSteamLookupNames(name)',
    ):
        if token not in sync_jogos_js:
            error(f".github/scripts/sync-jogos.mjs: integração Steam Web API V48.3.25 ausente: {token}")

    for obsolete in (
        "STEAMGRIDDB_API_KEY",
        "SteamGridDB",
        "steamgriddb.com",
        "store.steampowered.com/api/storesearch/",
    ):
        if obsolete in sync_jogos_js or obsolete in sync_jogos_workflow:
            error(f"Jogos V48.3.25: dependência antiga removida ainda presente: {obsolete}")

    for token in (
        'STEAM_WEB_API_KEY: ${{ secrets.STEAM_WEB_API_KEY }}',
        '- name: Sync Trello and Steam',
    ):
        if token not in sync_jogos_workflow:
            error(f".github/workflows/sync-jogos.yml: configuração Steam-only V48.3.25 ausente: {token}")

    # Library Capsules modernas podem usar caminho versionado/hash. A identificação
    # vem de IStoreService/GetAppList; a consulta de assets permanece restrita à Steam.
    for token in (
        'IStoreBrowseService/GetItems/v1/',
        'data_request: { include_assets: true }',
        'assets.library_capsule_2x',
        'assets.library_capsule',
        'shared.fastly.steamstatic.com/store_item_assets/',
        'library_600x900_2x.jpg',
        'library_600x900.jpg',
        'reason: "no-steam-library-capsule"',
    ):
        if token not in sync_jogos_js:
            error(f".github/scripts/sync-jogos.mjs: resolução de Library Capsule V48.3.25 ausente: {token}")

    # V48.3.28: o catálogo publica o ícone quadrado oficial da Steam como
    # enriquecimento opcional para a Agenda, sem alterar a Library Capsule de Jogos.
    for token in (
        'const STEAM_COMMUNITY_ICON_BASE = "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/";',
        'function buildSteamCommunityIconUrl(appId, hash)',
        'async function getSteamCommunityIcons(appIds)',
        'item?.assets?.community_icon',
        'icon: null',
        'game.icon = steamCommunityIcons.get(game.steamAppId) || null;',
    ):
        if token not in sync_jogos_js:
            error(f".github/scripts/sync-jogos.mjs: ícone Steam V48.3.28 ausente: {token}")

    for token in (
        'datetime="2026-09-18"',
        "Última atualização: 18 de setembro de 2026 · V48.3.28",
        "Steam Web API",
        "A Agenda e a página de Jogos são preparadas",
        "não são feitas pelo navegador do visitante",
        "da Steam permanece somente no ambiente protegido do GitHub Actions",
        "pode exibir o ícone oficial do jogo",
        "referenciador",
    ):
        if token not in privacy_html:
            error(f"privacidade/index.html: transparência Trello/Steam V48.3.28 ausente: {token}")

    for token in (
        "A identificação automática e as capas disponíveis usam dados e assets oficiais da Steam.",
        "no estado em que se encontram e conforme disponíveis",
        "não é afiliado, patrocinado ou endossado pela Valve Corporation, Steam",
    ):
        if token not in jogos_index:
            error(f"jogos/index.html: aviso Steam V48.3.25 ausente: {token}")

    # V48.3.26: Agenda aceita múltiplas lives por dia e é sincronizada por
    # Trello sem alterar os campos legados consumidos pelos Helpers antigos.
    for token in (
        'const BOARD_ID = process.env.TRELLO_AGENDA_BOARD_ID;',
        'const GAMES = "data/content/jogos.json";',
        'fields: "id,name,idList,pos,closed,desc"',
        'Semana: YYYY-MM-DD',
        'function parseSteamAppId(value, cardName)',
        'function loadGameIconIndex()',
        'function officialSteamIcon(icon, appId)',
        'function parseCard(card)',
        'function compareLives(a, b)',
        'if (item.steamAppId) live.steamAppId = item.steamAppId;',
        'if (item.icon) live.icon = item.icon;',
        'lives,',
        'horario: first?.horario || ""',
        'titulo: first?.titulo || ""',
        'descricao: first?.descricao || ""',
        'plataformas: first?.plataformas || ["YouTube", "Twitch"]',
    ):
        if token not in sync_agenda_js:
            error(f".github/scripts/sync-agenda.mjs: contrato Trello/múltiplas lives V48.3.26 ausente: {token}")

    for token in (
        'TRELLO_AGENDA_BOARD_ID: ${{ vars.TRELLO_AGENDA_BOARD_ID }}',
        '- name: Sync agenda from Trello',
        'git add data/agenda.json',
    ):
        if token not in sync_agenda_workflow:
            error(f".github/workflows/sync-agenda.yml: configuração V48.3.26 ausente: {token}")

    for token in (
        "function normalizeAgendaIcon(value, steamAppId)",
        "function legacyLiveFromDay(dia)",
        "function storedLivesFromDay(dia)",
        "function getDayLives(dia)",
        "if (legacy.titulo !== stored[0].titulo)",
        "first.icon = null",
        "return [first, ...stored.slice(1)]",
        "function renderLiveContent(live, { showTime = false } = {})",
        'referrerpolicy="no-referrer"',
        "has-multiple-lives",
        "agenda-live-list",
        "agenda-live-layout",
        "has-icon",
        "agenda-game-icon",
        "agenda-live-time",
    ):
        if token not in home_js and token not in home_css:
            error(f"Agenda V48.3.26: suporte de múltiplas lives ausente: {token}")

    # V48.3.27: cards da Agenda mantêm a altura original mesmo quando um dia
    # possui várias lives; o conteúdo excedente rola dentro do próprio card.
    for token in (
        "height: 210px;",
        "align-self: flex-start;",
        "overflow: hidden;",
        "min-height: 0;",
        "overflow-y: auto;",
        ".agenda-card-content:focus-visible",
        ".agenda-card-content::-webkit-scrollbar",
    ):
        if token not in home_css:
            error(f"Agenda V48.3.27: geometria estável dos cards ausente: {token}")

    if 'tabindex="0" aria-label="Lives de ${escapeHtml(dia.nome)}"' not in home_js:
        error("Agenda V48.3.27: região rolável de múltiplas lives precisa permanecer acessível por teclado.")

    # V48.3.28: Agenda usa ícone quadrado oficial da Steam em vez da capa
    # vertical, preservando a geometria compacta dos cards.
    for token in (
        "function normalizeAgendaIcon(value, steamAppId)",
        'url.pathname.startsWith(`/steamcommunity/public/images/apps/${steamAppId}/`)',
        'class="agenda-game-icon"',
        'width="48"',
        'height="48"',
        'image.classList.contains("agenda-game-icon")',
        '.agenda-live-layout.has-icon',
        'grid-template-columns: 48px minmax(0, 1fr);',
        '.agenda-game-icon',
        'aspect-ratio: 1;',
    ):
        if token not in home_js and token not in home_css:
            error(f"Agenda V48.3.28: ícone compacto Steam ausente: {token}")

    if "agenda-game-cover" in home_js or ".agenda-game-cover" in home_css or "has-artwork" in home_css:
        error("Agenda V48.3.28: capa vertical antiga não deve continuar no frontend da Agenda.")

    # V48.3.13: Galeria e Blog compartilham o mesmo ritmo tipográfico do header.
    artes_header_rules = (
        "padding: 30px;",
        "margin: 10px 0 7px;",
        "font-size: clamp(2.1rem, 5vw, 3.25rem);",
        "font-weight: 900;",
        "line-height: 1.05;",
        "max-width: 720px;",
        "font-size: .96rem;",
        "line-height: 1.62;",
        ".artes-intro h1 { font-size: 2.15rem; }",
    )
    for declaration in artes_header_rules:
        if declaration not in artes_css:
            error(f"css/pages/artes.css: paridade visual V48.3.13 ausente: {declaration}")

    # V48.3.7: todo asset CSS/JS alterado pelo hardening precisa invalidar cache.
    v4837_assets = {
        "index.html": (
            "css/core/variables.css?v=48.3.7",
            "css/pages/home.css?v=48.3.28",
            "css/components/lives.css?v=48.3.7",
            "css/components/blog.css?v=48.3.7",
            "js/pages/home/twitch-live.js?v=48.3.7",
        ),
        "doacoes/index.html": (
            "css/core/variables.css?v=48.3.7",
            "css/pages/doacoes.css?v=48.3.7",
            "css/components/ranking.css?v=48.3.11",
            "js/pages/doacoes/ranking.js?v=48.3.8",
        ),
        "blog/index.html": (
            "css/core/variables.css?v=48.3.7",
            "css/components/blog.css?v=48.3.7",
        ),
        "artes/index.html": ("css/core/variables.css?v=48.3.7",),
        "privacidade/index.html": (
            "css/core/variables.css?v=48.3.7",
            "css/pages/privacidade.css?v=48.3.7",
        ),
        "uso-de-ia/index.html": (
            "css/core/variables.css?v=48.3.7",
            "css/pages/privacidade.css?v=48.3.7",
        ),
        "404.html": ("css/core/variables.css?v=48.3.7",),
    }
    for rel, assets in v4837_assets.items():
        html = read_text(rel)
        for asset in assets:
            if asset not in html:
                error(f"{rel}: cache-buster V48.3.7 ausente para {asset.split('?')[0]}.")

    if "data/content/buttons.json" not in buttons_js:
        error("js/core/buttons.js: configuração central de botões não carregada.")
    if "KamyliButtonIcons" not in button_icons_js:
        error("js/core/button-icons.js: biblioteca segura de ícones ausente.")

    # V48.3.6: observers continuam existindo, mas não podem reagir a toda mutação
    # do documento nem reescrever a Navbar a cada frame. Navegação direta por hash
    # permanece responsabilidade de navbar.js e deve continuar estabilizando a seção.
    for token in (
        "mutationNeedsGlobalApply",
        "mutationAddsConfigurableButton",
        "sameOrder",
        "navKeysIn",
    ):
        if token not in content_js and token not in buttons_js:
            error(f"V48.3.6: proteção de performance ausente: {token}.")

    if "new MutationObserver(scheduleApply)" in content_js or "new MutationObserver(scheduleApply)" in buttons_js:
        error("V48.3.6: observers globais não devem reagir indiscriminadamente a toda mutação.")

    if "KAMYLI_AGENDA_READY" in loader_js:
        error("V48.3.6: Agenda não deve bloquear o reveal inicial do site.")
    if "await prepareVisualBackdrop()" in loader_js:
        error("V48.3.6: fundo decorativo não deve bloquear o reveal inicial.")
    for token in (
        "const INITIAL_MIN_DISPLAY_MS = 500",
        "const INITIAL_MAX_WAIT_MS = 2500",
        'loaderTimingVersion = "48.3.6"',
    ):
        if token not in loader_js:
            error(f"V48.3.6: timing otimizado do loader ausente: {token}.")

    for token in (
        "runAfterSiteReveal",
        'window.addEventListener("hashchange"',
        "startSectionStabilization",
        "SECTION_STABILIZATION_MS",
    ):
        if token not in navbar:
            error(f"V48.3.6: navegação direta/estabilização de seção deve ser preservada: {token}.")

    # V48.3.2: Navbar reordenável com slot histórico opcional para o CTA Apoiar.
    for key in NAVBAR_LINK_KEYS:
        if f'data-nav-key="{key}"' not in navbar:
            error(f"js/core/navbar.js: link editorial da navbar ausente: {key}.")
    if 'data-button-key="navbarSupport"' in navbar or "navbarSupport" in buttons_js:
        error("V48.2.0: navbarSupport não deve mais depender de buttons.json.")
    if 'data-nav-key="blog"' not in navbar:
        error("V48.2.0: Blog deve permanecer presente na navbar mesmo sem posts.")
    for runtime_token in (
        "normalizeNavbarOrder",
        "applyNavbarOrder",
        'data.ordem',
        "apoioFixoNoFim",
        "site-nav-support-wrap",
        "site-nav-support-divider",
        "pinSupport",
    ):
        if runtime_token not in content_js and runtime_token not in navbar:
            error(f"V48.3.2: runtime/slot de ordem da Navbar ausente: {runtime_token}.")
    if 'class="site-nav-divider site-nav-support-divider"' not in navbar or 'class="site-nav-support-wrap"' not in navbar:
        error("V48.3.2: slot histórico opcional de Apoiar ausente em navbar.js.")
    if "blogElements.section.hidden = true" in read_text("js/pages/home/content.js"):
        error("V48.2.0: seção do Blog na Home não deve ser ocultada quando não há posts.")
    if 'id="homeBlogSection"' in index and re.search(r'id="homeBlogSection"[^>]*\shidden(?:\s|>)', index, re.I | re.S):
        error("index.html: seção do Blog deve iniciar visível na V48.2.0.")

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

    if "css/components/lives.css?v=48.3.7" not in index:
        error("index.html: cache-buster V48.3.7 ausente para css/components/lives.css.")

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

    # V48.3.8: política precisa refletir o mapa de dados real e expor canal LGPD.
    # Normaliza whitespace para não acoplar a validação semântica à quebra visual do HTML/Markdown.
    privacy_text = " ".join(privacy_html.split())
    donations_text = " ".join(donations.split())
    ranking_privacy_text = " ".join(ranking_privacy_doc.split())

    for needle in (
        "Kamyli Souza",
        "contato@kamylisumire.com",
        "Responsável pelo tratamento e contato",
        "Doações e ranking de apoiadores",
        "Serviços externos e transferências internacionais",
        "Armazenamento e retenção",
        "Seus direitos pela LGPD",
        "Segurança e incidentes",
        "cache local do Top 5 do ranking é mantido por no máximo 30 minutos",
        "Pixie oferece, inclusive, ranking público de apoiadores",
        "LivePix oferece alertas e integrações",
        "não é tratada pelo projeto como consentimento específico",
        "identificador de exibição é autodeclarado",
        "Pessoas diferentes podem utilizar o mesmo texto",
        "somente a coincidência com o identificador exibido não é suficiente",
        "Uma contestação plausível pode resultar preventivamente",
        "Miniaturas exibidas podem",
        "infraestrutura da Twitch",
    ):
        if needle not in privacy_text:
            error(f"privacidade/index.html: transparência LGPD V48.3.8 ausente: {needle}")

    if 'id="rankingPrivacyNotice"' not in donations:
        error("doacoes/index.html: aviso contextual do ranking V48.3.8 ausente.")

    for needle in (
        "Os identificadores informados nas contribuições podem ser utilizados neste ranking",
        "não representam identidades verificadas",
        "../privacidade/#ranking",
    ):
        if needle not in donations_text:
            error(f"doacoes/index.html: aviso contextual do ranking V48.3.8 ausente: {needle}")

    for needle in (
        "identificador de exibição autodeclarado e não autenticado",
        "Pixie oferece ranking público de apoiadores como recurso nativo",
        "LivePix oferece alertas/integrações",
        "não deve ser descrito como uma autorização irrestrita",
        "não é autenticação suficiente",
        "não solicitar documento civil por padrão",
        "RANKING_PRIVATE_NAMES",
    ):
        if needle not in ranking_privacy_text:
            error(f"docs/PRIVACIDADE-RANKING.md: governança V48.3.8 ausente: {needle}")

    for needle in (
        "donation.name é um identificador de exibição autodeclarado",
        "não autentica titularidade nem altera",
    ):
        if needle not in worker_js:
            error(f"workers.js: semântica de identidade do ranking V48.3.8 ausente: {needle}")

    for needle in (
        'RANKING_CACHE_KEY = "kamyli-ranking-cache-v4"',
        'RANKING_CACHE_TTL_MS = 30 * 60 * 1000',
        'LEGACY_RANKING_CACHE_KEYS = ["kamyli-ranking-cache-v3"]',
        'localStorage.removeItem(key)',
        'age > RANKING_CACHE_TTL_MS',
        'clearLegacyRankingCaches();',
    ):
        if needle not in ranking_js:
            error(f"js/pages/doacoes/ranking.js: retenção local V48.3.8 ausente: {needle}")

    for forbidden in (
        "allowExpired",
        "staleCache",
        "mostrar o último cache conhecido",
    ):
        if forbidden in ranking_js:
            error(f"js/pages/doacoes/ranking.js: fallback expirado V48.3.8 não permitido: {forbidden}")

    # V48.3.11: nomes de exibição arbitrariamente longos não podem alargar o card/página.
    ranking_css = read_text("css/components/ranking.css")
    ranking_overflow_rules = (
        (r"\.ranking-list\s*\{([^}]*)\}", ("width: 100%", "max-width: 100%", "min-width: 0")),
        (r"\.ranking-item\s*\{([^}]*)\}", ("width: 100%", "max-width: 100%", "min-width: 0", "overflow: hidden")),
        (r"\.ranking-name\s*\{([^}]*)\}", ("flex: 1 1 0", "width: 0", "min-width: 0", "max-width: 100%", "overflow: hidden", "text-overflow: ellipsis", "white-space: nowrap")),
    )
    for pattern, required_declarations in ranking_overflow_rules:
        match = re.search(pattern, ranking_css, flags=re.S)
        if not match:
            error(f"css/components/ranking.css: contenção V48.3.11 ausente: {pattern}")
            continue
        block = match.group(1)
        for declaration in required_declarations:
            if declaration not in block:
                error(f"css/components/ranking.css: contenção V48.3.11 incompleta: {declaration}")

    for forbidden in (
        "nome verificado do doador",
        "informando o nome ou pseudônimo utilizado na contribuição",
    ):
        if forbidden in privacy_html or forbidden in donations:
            error(f"ranking V48.3.8: linguagem de identidade insegura presente: {forbidden}")

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
    artes_index = read_text("artes/index.html")

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
        (
            artes_index,
            'rel="canonical" href="https://kamylisumire.com/artes/"',
            "Artes canonical",
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
        "https://kamylisumire.com/privacidade/",
        "https://kamylisumire.com/uso-de-ia/",
    }

    artes = load_json("data/content/artes.json")
    art_items = artes.get("itens", []) if isinstance(artes, dict) else []
    has_public_art = isinstance(art_items, list) and any(
        isinstance(item, dict) for item in art_items
    )

    blog = load_json("data/blog/posts.json")
    published = []
    if isinstance(blog, dict) and isinstance(blog.get("posts"), list):
        published = [
            post for post in blog["posts"]
            if isinstance(post, dict) and post.get("published") is True
        ]
    has_public_blog = bool(published)

    def robots_tokens(html: str, rel: str) -> set[str]:
        for tag in re.findall(r"<meta\b[^>]*>", html, re.I):
            if not re.search(r"\bname\s*=\s*[\"']robots[\"']", tag, re.I):
                continue
            match = re.search(r"\bcontent\s*=\s*[\"']([^\"']+)[\"']", tag, re.I)
            if not match:
                error(f"{rel}: meta robots sem atributo content.")
                return set()
            return {token.strip().lower() for token in match.group(1).split(",") if token.strip()}
        error(f"{rel}: meta robots ausente.")
        return set()

    def validate_collection_indexing(rel: str, html: str, url: str, should_index: bool) -> None:
        tokens = robots_tokens(html, rel)
        if should_index:
            if "index" not in tokens or "noindex" in tokens or "follow" not in tokens:
                error(f"{rel}: conteúdo público existe; esperado meta robots index, follow.")
            expected.add(url)
        else:
            if "noindex" not in tokens or "follow" not in tokens or "index" in tokens:
                error(f"{rel}: coleção vazia; esperado meta robots noindex, follow.")
            if url in urls:
                error(f"sitemap.xml: {url} deve ficar fora do sitemap enquanto a coleção estiver vazia.")

    validate_collection_indexing(
        "artes/index.html",
        artes_index,
        "https://kamylisumire.com/artes/",
        has_public_art,
    )
    validate_collection_indexing(
        "blog/index.html",
        blog_index,
        "https://kamylisumire.com/blog/",
        has_public_blog,
    )

    for post in published:
        slug = post.get("slug")
        if isinstance(slug, str):
            expected.add(f"https://kamylisumire.com/blog/{slug}/")

    if not expected.issubset(urls):
        missing = sorted(expected - urls)
        error(f"sitemap.xml: URLs públicas obrigatórias estão ausentes: {', '.join(missing)}")



def _csp_hash(body: str) -> str:
    digest = hashlib.sha256(body.encode("utf-8")).digest()
    encoded = base64.b64encode(digest).decode("ascii")
    return f"'sha256-{encoded}'"


def _inline_csp_hashes(html: str) -> tuple[set[str], set[str]]:
    script_hashes: set[str] = set()
    style_hashes: set[str] = set()

    for match in re.finditer(r"<script\b([^>]*)>([\s\S]*?)</script>", html, re.I):
        attrs, body = match.group(1), match.group(2)
        if re.search(r"\bsrc\s*=", attrs, re.I):
            continue
        type_match = re.search(r"\btype\s*=\s*[\"']([^\"']+)[\"']", attrs, re.I)
        if type_match:
            script_type = type_match.group(1).strip().lower()
            if script_type not in {"text/javascript", "application/javascript", "module"}:
                continue
        script_hashes.add(_csp_hash(body))

    for match in re.finditer(r"<style\b[^>]*>([\s\S]*?)</style>", html, re.I):
        style_hashes.add(_csp_hash(match.group(1)))

    return script_hashes, style_hashes


class _InlineAttributePolicyParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.inline_style = False
        self.inline_handler = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, _value in attrs:
            lowered = name.lower()
            if lowered == "style":
                self.inline_style = True
            elif lowered.startswith("on"):
                self.inline_handler = True

    handle_startendtag = handle_starttag


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
        if "'unsafe-inline'" in csp:
            error(f"{rel}: CSP V48.3.7 não deve reintroduzir unsafe-inline.")
        if "frame-ancestors" in csp:
            error(f"{rel}: frame-ancestors não deve ser declarado via meta CSP; use header HTTP quando disponível.")
        if "upgrade-insecure-requests" in csp:
            error(f"{rel}: upgrade-insecure-requests não deve ser usado na meta CSP; o repositório preserva teste/desenvolvimento local por HTTP.")

        # V48.3.7: hashes devem corresponder aos bytes reais dos blocos inline.
        # Assim qualquer whitespace alterado sem atualizar a CSP falha na CI.
        raw_html = path.read_bytes().decode("utf-8")
        script_hashes, style_hashes = _inline_csp_hashes(raw_html)
        for expected_hash in sorted(script_hashes):
            if expected_hash not in csp:
                error(f"{rel}: hash CSP de script inline ausente/desatualizado: {expected_hash}")
        for expected_hash in sorted(style_hashes):
            if expected_hash not in csp:
                error(f"{rel}: hash CSP de style inline ausente/desatualizado: {expected_hash}")

        policy_parser = _InlineAttributePolicyParser()
        policy_parser.feed(raw_html)
        if policy_parser.inline_handler:
            error(f"{rel}: handler inline on*= é incompatível com a CSP sem unsafe-inline.")
        if policy_parser.inline_style:
            error(f"{rel}: atributo style= é incompatível com a CSP sem unsafe-inline.")

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
    validate_navbar()
    validate_home_cards()
    validate_home_content()
    validate_artes()
    validate_jogos()
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
