#!/usr/bin/env python3
"""Validação editorial/semântica do site Kamyli Sumire.

Sem dependências externas: usa somente a biblioteca padrão do Python.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_DAY_IDS = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
]


class ValidationError(Exception):
    pass


def normalize_text(value: str) -> str:
    return " ".join(str(value).split())


def no_duplicate_object(pairs):
    result = {}

    for key, value in pairs:
        if key in result:
            raise ValidationError(
                f"chave duplicada encontrada: {key!r}"
            )
        result[key] = value

    return result


def load_json_strict(path: Path):
    try:
        return json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=no_duplicate_object,
        )
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ValidationError(f"{path.relative_to(ROOT)}: {exc}") from exc


def validate_all_json_files() -> None:
    json_files = sorted((ROOT / "data").rglob("*.json"))

    if not json_files:
        raise ValidationError("nenhum JSON encontrado em data/")

    for path in json_files:
        load_json_strict(path)
        print(f"✓ JSON válido: {path.relative_to(ROOT)}")


def require_string(obj, key: str, context: str) -> str:
    value = obj.get(key)

    if not isinstance(value, str):
        raise ValidationError(
            f"{context}.{key} deve ser uma string"
        )

    return value


def validate_agenda() -> None:
    path = ROOT / "data/agenda.json"
    data = load_json_strict(path)

    if not isinstance(data, dict):
        raise ValidationError("data/agenda.json deve conter um objeto")

    updated = require_string(data, "ultimaAtualizacao", "agenda")
    try:
        datetime.strptime(updated, "%d/%m/%Y")
    except ValueError as exc:
        raise ValidationError(
            "agenda.ultimaAtualizacao deve usar DD/MM/AAAA"
        ) from exc

    require_string(data, "observacao", "agenda")

    days = data.get("dias")
    if not isinstance(days, list):
        raise ValidationError("agenda.dias deve ser um array")

    ids = [day.get("id") for day in days if isinstance(day, dict)]

    if ids != EXPECTED_DAY_IDS:
        raise ValidationError(
            "agenda.dias deve conter exatamente, nesta ordem: "
            + ", ".join(EXPECTED_DAY_IDS)
        )

    if len(set(ids)) != len(ids):
        raise ValidationError("agenda.dias possui IDs duplicados")

    for index, day in enumerate(days):
        context = f"agenda.dias[{index}]"

        if not isinstance(day, dict):
            raise ValidationError(f"{context} deve ser um objeto")

        required = {
            "id",
            "nome",
            "data",
            "temLive",
            "horario",
            "titulo",
            "descricao",
            "plataformas",
        }

        missing = required - day.keys()
        if missing:
            raise ValidationError(
                f"{context} sem campos obrigatórios: "
                + ", ".join(sorted(missing))
            )

        require_string(day, "id", context)
        require_string(day, "nome", context)
        date_value = require_string(day, "data", context)
        time_value = require_string(day, "horario", context)
        title = require_string(day, "titulo", context)
        description = require_string(day, "descricao", context)

        try:
            parsed = datetime.strptime(date_value, "%Y-%m-%d")
        except ValueError as exc:
            raise ValidationError(
                f"{context}.data deve ser uma data real em AAAA-MM-DD"
            ) from exc

        if parsed.strftime("%Y-%m-%d") != date_value:
            raise ValidationError(
                f"{context}.data deve preservar zero à esquerda em AAAA-MM-DD"
            )

        if time_value and not re.fullmatch(
            r"(?:[01]\d|2[0-3]):[0-5]\d",
            time_value,
        ):
            raise ValidationError(
                f"{context}.horario deve ser vazio ou HH:MM"
            )

        if not isinstance(day.get("temLive"), bool):
            raise ValidationError(
                f"{context}.temLive deve ser booleano"
            )

        platforms = day.get("plataformas")
        if (
            not isinstance(platforms, list)
            or not platforms
            or any(not isinstance(item, str) or not item.strip() for item in platforms)
        ):
            raise ValidationError(
                f"{context}.plataformas deve ser um array não vazio de strings"
            )

        if day["temLive"]:
            if not title.strip():
                raise ValidationError(
                    f"{context}.titulo deve ser preenchido quando temLive=true"
                )
        else:
            if any(value.strip() for value in (time_value, title, description)):
                raise ValidationError(
                    f"{context}: horario/titulo/descricao devem ficar vazios quando temLive=false"
                )

    print("✓ Agenda semanticamente válida")


class HomeHTMLParser(HTMLParser):
    target_ids = {
        "heroDescription",
        "heroTitlePrefix",
        "heroTitleHighlight",
        "heroTitleSuffix",
    }

    def __init__(self):
        super().__init__()
        self.meta = {}
        self.text_by_id = {key: [] for key in self.target_ids}
        self.stack = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        element_id = attrs_dict.get("id")
        self.stack.append((tag, element_id))

        if tag == "meta":
            key = attrs_dict.get("name") or attrs_dict.get("property")
            content = attrs_dict.get("content")
            if key and content is not None:
                self.meta[key] = content

    def handle_startendtag(self, tag, attrs):
        if tag == "meta":
            attrs_dict = dict(attrs)
            key = attrs_dict.get("name") or attrs_dict.get("property")
            content = attrs_dict.get("content")
            if key and content is not None:
                self.meta[key] = content

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        for _, element_id in reversed(self.stack):
            if element_id in self.target_ids:
                self.text_by_id[element_id].append(data)
                break


def validate_hero_sync() -> None:
    hero_path = ROOT / "data/content/hero.json"
    hero = load_json_strict(hero_path)

    title_obj = hero.get("titulo")
    if not isinstance(title_obj, dict):
        raise ValidationError("hero.titulo deve ser um objeto")

    expected_title = normalize_text(
        require_string(title_obj, "prefixo", "hero.titulo")
        + require_string(title_obj, "destaque", "hero.titulo")
        + require_string(title_obj, "sufixo", "hero.titulo")
    )
    expected_description = normalize_text(
        require_string(hero, "descricao", "hero")
    )

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    parser = HomeHTMLParser()
    parser.feed(html)

    visible_title = normalize_text(
        "".join(parser.text_by_id["heroTitlePrefix"])
        + "".join(parser.text_by_id["heroTitleHighlight"])
        + "".join(parser.text_by_id["heroTitleSuffix"])
    )
    visible_description = normalize_text(
        "".join(parser.text_by_id["heroDescription"])
    )

    comparisons = {
        "Hero visível (título)": (visible_title, expected_title),
        "Hero visível (descrição)": (
            visible_description,
            expected_description,
        ),
        "og:title": (
            normalize_text(parser.meta.get("og:title", "")),
            expected_title,
        ),
        "og:description": (
            normalize_text(parser.meta.get("og:description", "")),
            expected_description,
        ),
        "twitter:title": (
            normalize_text(parser.meta.get("twitter:title", "")),
            expected_title,
        ),
        "twitter:description": (
            normalize_text(parser.meta.get("twitter:description", "")),
            expected_description,
        ),
        "meta description": (
            normalize_text(parser.meta.get("description", "")),
            expected_description,
        ),
    }

    failures = [
        f"{label}: esperado {expected!r}, encontrado {actual!r}"
        for label, (actual, expected) in comparisons.items()
        if actual != expected
    ]

    if failures:
        raise ValidationError(
            "Hero/SEO/preview fora de sincronia:\n- "
            + "\n- ".join(failures)
        )

    print("✓ Hero, fallback HTML, SEO e preview estão sincronizados")




def validate_visual_assets() -> None:
    required_webp = {
        "avatar-192": ROOT / "assets/avatar-192.webp",
        "avatar-384": ROOT / "assets/avatar-384.webp",
        "favicon": ROOT / "assets/favicon.webp",
        "fundo": ROOT / "assets/fundo.webp",
        "logo": ROOT / "assets/logo.webp",
    }

    required_avif = {
        "fundo": ROOT / "assets/fundo.avif",
        "fundo-mobile": ROOT / "assets/fundo-mobile.avif",
    }

    missing = [
        str(path.relative_to(ROOT))
        for path in [*required_webp.values(), *required_avif.values()]
        if not path.exists()
    ]

    if missing:
        raise ValidationError(
            "assets otimizados obrigatórios ausentes: "
            + ", ".join(missing)
        )

    for label, path in required_webp.items():
        data = path.read_bytes()

        if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            raise ValidationError(
                f"{path.relative_to(ROOT)} não parece ser um arquivo WebP válido"
            )

        size_kib = len(data) / 1024
        print(
            f"✓ WebP válido: {label} "
            f"({path.relative_to(ROOT)}, {size_kib:.1f} KiB)"
        )

    for label, path in required_avif.items():
        avif_data = path.read_bytes()
        avif_probe = avif_data[8:40]

        if (
            len(avif_data) < 16
            or avif_data[4:8] != b"ftyp"
            or (b"avif" not in avif_probe and b"avis" not in avif_probe)
        ):
            raise ValidationError(
                f"{path.relative_to(ROOT)} não parece ser um arquivo AVIF válido"
            )

        print(
            f"✓ AVIF válido: {label} "
            f"({path.relative_to(ROOT)}, {len(avif_data) / 1024:.1f} KiB)"
        )

    home_html = (ROOT / "index.html").read_text(encoding="utf-8")
    donations_html = (ROOT / "doacoes/index.html").read_text(encoding="utf-8")
    not_found_html = (ROOT / "404.html").read_text(encoding="utf-8")
    global_css = (ROOT / "css/core/global.css").read_text(encoding="utf-8")
    navbar_css = (ROOT / "css/core/navbar.css").read_text(encoding="utf-8")
    preferences_js = (ROOT / "js/core/preferences.js").read_text(encoding="utf-8")
    loader_js = (ROOT / "js/core/loader.js").read_text(encoding="utf-8")
    home_js = (ROOT / "js/pages/home/home.js").read_text(encoding="utf-8")

    loader_start = global_css.find(".site-loader {")
    loader_end = global_css.find(".site-loader-inner", loader_start)
    loader_css = (
        global_css[loader_start:loader_end]
        if loader_start >= 0 and loader_end > loader_start
        else ""
    )

    expectations = {
        "Home usa avatar responsivo 192/384":
            "assets/avatar-192.webp 192w" in home_html
            and "assets/avatar-384.webp 384w" in home_html,
        "Doações usa avatar responsivo 192/384":
            "../assets/avatar-192.webp 192w" in donations_html
            and "../assets/avatar-384.webp 384w" in donations_html,
        "Home usa favicon.webp": "assets/favicon.webp" in home_html,
        "Doações usa favicon.webp": "../assets/favicon.webp" in donations_html,
        "Background desktop prioriza fundo.avif": "assets/fundo.avif" in global_css,
        "Background mobile prioriza fundo-mobile.avif":
            "assets/fundo-mobile.avif" in global_css,
        "Background mantém fundo.webp": "assets/fundo.webp" in global_css,
        "Background mantém fundo.png": "assets/fundo.png" in global_css,
        "Navbar usa logo.webp": "assets/logo.webp" in navbar_css,
        "Loader usa favicon.webp": "assets/favicon.webp" in global_css,
        "Loader não usa fundo pesado": "assets/fundo." not in loader_css,
        "Perfil de performance é exposto": "dataset.performance" in preferences_js,
        "Motivo de performance é exposto":
            "dataset.performanceReason" in preferences_js,
        "Save-Data pode remover fundo decorativo":
            'data-performance-reason="save-data"' in global_css,
        "Home possui bootstrap crítico de preferências":
            "KAMYLI_UI_BOOTSTRAP_STATE" in home_html,
        "Doações possui bootstrap crítico de preferências":
            "KAMYLI_UI_BOOTSTRAP_STATE" in donations_html,
        "404 possui bootstrap crítico de preferências":
            "KAMYLI_UI_BOOTSTRAP_STATE" in not_found_html,
        "Home não bloqueia head com preferences.js":
            home_html.find('src="js/core/preferences.js"') > home_html.find("</head>"),
        "Doações não bloqueia head com preferences.js":
            donations_html.find('src="../js/core/preferences.js"') > donations_html.find("</head>"),
        "404 não bloqueia head com preferences.js":
            not_found_html.find('src="js/core/preferences.js"') > not_found_html.find("</head>"),
        "Loader usa estado pendente atrasado":
            "site-loading-pending" in loader_js
            and "SHOW_DELAY_MS = 180" in loader_js,
        "Loader rápido pode não aparecer":
            "finishWithoutShowingLoader" in loader_js,
        "Agenda agrupa renderização em DocumentFragment":
            "createDocumentFragment" in home_js
            and "replaceChildren(fragment)" in home_js,
        "Agenda reutiliza métricas de layout":
            "agendaMetrics" in home_js
            and "scheduleCarouselMeasure" in home_js,
    }

    failures = [label for label, ok in expectations.items() if not ok]

    if failures:
        raise ValidationError(
            "integração de assets/performance incompleta: "
            + ", ".join(failures)
        )

    print("✓ Assets responsivos, loader atrasado e performance V39 integrados")


def validate_production_files() -> None:
    cname = (ROOT / "CNAME").read_text(encoding="utf-8").strip()
    if cname != "kamylisumire.com":
        raise ValidationError(
            "CNAME deve conter somente kamylisumire.com"
        )

    headers_path = ROOT / "_headers"
    if not headers_path.exists():
        raise ValidationError(
            "_headers ausente: previews do Cloudflare Pages devem permanecer noindex"
        )

    headers = headers_path.read_text(encoding="utf-8")
    if "X-Robots-Tag: noindex" not in headers:
        raise ValidationError(
            "_headers deve aplicar X-Robots-Tag: noindex aos previews"
        )

    print("✓ Arquivos de produção/preview coerentes")


def main() -> int:
    checks = [
        validate_all_json_files,
        validate_agenda,
        validate_hero_sync,
        validate_visual_assets,
        validate_production_files,
    ]

    try:
        for check in checks:
            check()
    except ValidationError as exc:
        print(f"\nERRO: {exc}", file=sys.stderr)
        return 1

    print("\nTodas as validações passaram.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
