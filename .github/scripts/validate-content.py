#!/usr/bin/env python3
"""Validação editorial/semântica do site Kamyli Sumire — V42.3.3.

Sem dependências externas: usa somente a biblioteca padrão do Python.
"""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

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

LEGACY_ROOT_FILES = [
    "ARQUIVOS-MANTER.txt",
    "LIMPEZA-V28.txt",
    "README-MIGRACAO.md",
    "V33-APLICACAO.txt",
    "V34-APLICACAO.txt",
    "V35-APLICACAO.txt",
    "V36-APLICACAO.txt",
    "V37-APLICACAO.txt",
    "V38-APLICACAO.txt",
    "V39-APLICACAO.txt",
    "V39-1-APLICACAO.txt",
    "V39-2-APLICACAO.txt",
    "V40-APLICACAO.txt",
    "V40-REMOVER.txt",
    "V41-FONTE.txt",
    "V41-REMOVER.txt",
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
        raise ValidationError(
            f"{path.relative_to(ROOT)}: {exc}"
        ) from exc


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
    data = load_json_strict(ROOT / "data/agenda.json")

    if not isinstance(data, dict):
        raise ValidationError(
            "data/agenda.json deve conter um objeto"
        )

    updated = require_string(
        data,
        "ultimaAtualizacao",
        "agenda",
    )

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

    ids = [
        day.get("id")
        for day in days
        if isinstance(day, dict)
    ]

    if ids != EXPECTED_DAY_IDS:
        raise ValidationError(
            "agenda.dias deve conter exatamente, nesta ordem: "
            + ", ".join(EXPECTED_DAY_IDS)
        )

    if len(set(ids)) != len(ids):
        raise ValidationError(
            "agenda.dias possui IDs duplicados"
        )

    for index, day in enumerate(days):
        context = f"agenda.dias[{index}]"

        if not isinstance(day, dict):
            raise ValidationError(
                f"{context} deve ser um objeto"
            )

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

        date_value = require_string(
            day,
            "data",
            context,
        )
        time_value = require_string(
            day,
            "horario",
            context,
        )
        title = require_string(
            day,
            "titulo",
            context,
        )
        description = require_string(
            day,
            "descricao",
            context,
        )

        try:
            parsed = datetime.strptime(
                date_value,
                "%Y-%m-%d",
            )
        except ValueError as exc:
            raise ValidationError(
                f"{context}.data deve ser uma data real em AAAA-MM-DD"
            ) from exc

        if parsed.strftime("%Y-%m-%d") != date_value:
            raise ValidationError(
                f"{context}.data deve preservar zero à esquerda "
                "em AAAA-MM-DD"
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
            or any(
                not isinstance(item, str)
                or not item.strip()
                for item in platforms
            )
        ):
            raise ValidationError(
                f"{context}.plataformas deve ser um array "
                "não vazio de strings"
            )

        if day["temLive"]:
            if not title.strip():
                raise ValidationError(
                    f"{context}.titulo deve ser preenchido "
                    "quando temLive=true"
                )
        elif any(
            value.strip()
            for value in (
                time_value,
                title,
                description,
            )
        ):
            raise ValidationError(
                f"{context}: horario/titulo/descricao "
                "devem ficar vazios quando temLive=false"
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
        self.text_by_id = {
            key: []
            for key in self.target_ids
        }
        self.stack = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        element_id = attrs_dict.get("id")
        self.stack.append((tag, element_id))

        if tag == "meta":
            key = (
                attrs_dict.get("name")
                or attrs_dict.get("property")
            )
            content = attrs_dict.get("content")

            if key and content is not None:
                self.meta[key] = content

    def handle_startendtag(self, tag, attrs):
        if tag == "meta":
            attrs_dict = dict(attrs)
            key = (
                attrs_dict.get("name")
                or attrs_dict.get("property")
            )
            content = attrs_dict.get("content")

            if key and content is not None:
                self.meta[key] = content

    def handle_endtag(self, tag):
        for index in range(
            len(self.stack) - 1,
            -1,
            -1,
        ):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        for _, element_id in reversed(self.stack):
            if element_id in self.target_ids:
                self.text_by_id[element_id].append(data)
                break


def validate_hero_sync() -> None:
    hero = load_json_strict(
        ROOT / "data/content/hero.json"
    )

    title_obj = hero.get("titulo")

    if not isinstance(title_obj, dict):
        raise ValidationError(
            "hero.titulo deve ser um objeto"
        )

    expected_title = normalize_text(
        require_string(
            title_obj,
            "prefixo",
            "hero.titulo",
        )
        + require_string(
            title_obj,
            "destaque",
            "hero.titulo",
        )
        + require_string(
            title_obj,
            "sufixo",
            "hero.titulo",
        )
    )

    expected_description = normalize_text(
        require_string(
            hero,
            "descricao",
            "hero",
        )
    )

    parser = HomeHTMLParser()
    parser.feed(
        (ROOT / "index.html").read_text(
            encoding="utf-8"
        )
    )

    visible_title = normalize_text(
        "".join(
            parser.text_by_id["heroTitlePrefix"]
        )
        + "".join(
            parser.text_by_id["heroTitleHighlight"]
        )
        + "".join(
            parser.text_by_id["heroTitleSuffix"]
        )
    )

    visible_description = normalize_text(
        "".join(
            parser.text_by_id["heroDescription"]
        )
    )

    comparisons = {
        "Hero visível (título)": (
            visible_title,
            expected_title,
        ),
        "Hero visível (descrição)": (
            visible_description,
            expected_description,
        ),
        "og:title": (
            normalize_text(
                parser.meta.get("og:title", "")
            ),
            expected_title,
        ),
        "og:description": (
            normalize_text(
                parser.meta.get(
                    "og:description",
                    "",
                )
            ),
            expected_description,
        ),
        "twitter:title": (
            normalize_text(
                parser.meta.get(
                    "twitter:title",
                    "",
                )
            ),
            expected_title,
        ),
        "twitter:description": (
            normalize_text(
                parser.meta.get(
                    "twitter:description",
                    "",
                )
            ),
            expected_description,
        ),
        "meta description": (
            normalize_text(
                parser.meta.get(
                    "description",
                    "",
                )
            ),
            expected_description,
        ),
    }

    failures = [
        (
            f"{label}: esperado {expected!r}, "
            f"encontrado {actual!r}"
        )
        for label, (actual, expected)
        in comparisons.items()
        if actual != expected
    ]

    if failures:
        raise ValidationError(
            "Hero/SEO/preview fora de sincronia:\n- "
            + "\n- ".join(failures)
        )

    print(
        "✓ Hero, fallback HTML, SEO e preview "
        "estão sincronizados"
    )


def validate_visual_assets() -> None:
    required_webp = {
        "avatar-192":
            ROOT / "assets/avatar-192.webp",
        "avatar-384":
            ROOT / "assets/avatar-384.webp",
        "favicon":
            ROOT / "assets/favicon.webp",
        "fundo":
            ROOT / "assets/fundo.webp",
        "logo":
            ROOT / "assets/logo.webp",
    }

    required_avif = {
        "fundo":
            ROOT / "assets/fundo.avif",
        "fundo-mobile":
            ROOT / "assets/fundo-mobile.avif",
    }

    missing = [
        str(path.relative_to(ROOT))
        for path in [
            *required_webp.values(),
            *required_avif.values(),
        ]
        if not path.exists()
    ]

    if missing:
        raise ValidationError(
            "assets otimizados obrigatórios ausentes: "
            + ", ".join(missing)
        )

    for label, path in required_webp.items():
        data = path.read_bytes()

        if (
            len(data) < 12
            or data[:4] != b"RIFF"
            or data[8:12] != b"WEBP"
        ):
            raise ValidationError(
                f"{path.relative_to(ROOT)} "
                "não parece ser um arquivo WebP válido"
            )

        print(
            f"✓ WebP válido: {label} "
            f"({path.relative_to(ROOT)}, "
            f"{len(data) / 1024:.1f} KiB)"
        )

    for label, path in required_avif.items():
        data = path.read_bytes()
        probe = data[8:40]

        if (
            len(data) < 16
            or data[4:8] != b"ftyp"
            or (
                b"avif" not in probe
                and b"avis" not in probe
            )
        ):
            raise ValidationError(
                f"{path.relative_to(ROOT)} "
                "não parece ser um arquivo AVIF válido"
            )

        print(
            f"✓ AVIF válido: {label} "
            f"({path.relative_to(ROOT)}, "
            f"{len(data) / 1024:.1f} KiB)"
        )

    home = (
        ROOT / "index.html"
    ).read_text(encoding="utf-8")

    donations = (
        ROOT / "doacoes/index.html"
    ).read_text(encoding="utf-8")

    not_found = (
        ROOT / "404.html"
    ).read_text(encoding="utf-8")

    global_css = (
        ROOT / "css/core/global.css"
    ).read_text(encoding="utf-8")

    navbar_css = (
        ROOT / "css/core/navbar.css"
    ).read_text(encoding="utf-8")

    preferences_js = (
        ROOT / "js/core/preferences.js"
    ).read_text(encoding="utf-8")

    loader_js = (
        ROOT / "js/core/loader.js"
    ).read_text(encoding="utf-8")

    home_js = (
        ROOT / "js/pages/home/home.js"
    ).read_text(encoding="utf-8")

    loader_start = global_css.find(
        ".site-loader {"
    )
    loader_end = global_css.find(
        ".site-loader-inner",
        loader_start,
    )

    loader_css = (
        global_css[loader_start:loader_end]
        if loader_start >= 0
        and loader_end > loader_start
        else ""
    )

    expectations = {
        "Home usa avatar responsivo 192/384":
            "assets/avatar-192.webp 192w" in home
            and "assets/avatar-384.webp 384w" in home,

        "Doações usa avatar responsivo 192/384":
            "../assets/avatar-192.webp 192w"
            in donations
            and "../assets/avatar-384.webp 384w"
            in donations,

        "Home mantém avatar.png fallback":
            'src="assets/avatar.png"' in home,

        "Doações mantém avatar.png fallback":
            'src="../assets/avatar.png"'
            in donations,

        "Home usa favicon.webp":
            "assets/favicon.webp" in home,

        "Doações usa favicon.webp":
            "../assets/favicon.webp" in donations,

        "Background desktop prioriza fundo.avif":
            "assets/fundo.avif" in global_css,

        "Background mobile prioriza fundo-mobile.avif":
            "assets/fundo-mobile.avif" in global_css,

        "Background mantém fundo.webp":
            "assets/fundo.webp" in global_css,

        "Background mantém fundo.png":
            "assets/fundo.png" in global_css,

        "Navbar usa logo.webp":
            "assets/logo.webp" in navbar_css,

        "Loader usa logo.webp":
            "assets/logo.webp" in global_css,

        "Loader segue superfície e blur dos cards":
            "background-color: var(--card-bg)" in loader_css
            and "backdrop-filter: blur(var(--blur-card))" in loader_css
            and "assets/fundo." not in loader_css,

        "Perfil de performance é exposto":
            "dataset.performance"
            in preferences_js,

        "Motivo de performance é exposto":
            "dataset.performanceReason"
            in preferences_js,

        "Save-Data pode remover fundo decorativo":
            'data-performance-reason="save-data"'
            in global_css,

        "Home possui bootstrap crítico":
            "KAMYLI_UI_BOOTSTRAP_STATE"
            in home,

        "Doações possui bootstrap crítico":
            "KAMYLI_UI_BOOTSTRAP_STATE"
            in donations,

        "404 possui bootstrap crítico":
            "KAMYLI_UI_BOOTSTRAP_STATE"
            in not_found,

        "Home não bloqueia head com preferences.js":
            home.find(
                'src="js/core/preferences.js"'
            ) > home.find("</head>"),

        "Doações não bloqueia head com preferences.js":
            donations.find(
                'src="../js/core/preferences.js"'
            ) > donations.find("</head>"),

        "404 não bloqueia head com preferences.js":
            not_found.find(
                'src="js/core/preferences.js"'
            ) > not_found.find("</head>"),

        "Loader V42 mantém mínimo estético de 1 segundo":
            "site-loading-pending"
            in loader_js
            and "MIN_DISPLAY_MS = 1000"
            in loader_js,

        "Loader V42 sempre participa do reveal":
            "site-loading-visible"
            in loader_js
            and "beginReveal"
            in loader_js,

        "Agenda agrupa renderização":
            "createDocumentFragment"
            in home_js
            and "replaceChildren(fragment)"
            in home_js,

        "Agenda reutiliza métricas":
            "agendaMetrics"
            in home_js
            and "scheduleCarouselMeasure"
            in home_js,
    }

    failures = [
        label
        for label, ok in expectations.items()
        if not ok
    ]

    if failures:
        raise ValidationError(
            "integração de assets/performance "
            "incompleta: "
            + ", ".join(failures)
        )

    forbidden_v41 = [
        ".github/scripts/build-css.py",
        "docs/V40-CSS-BUNDLES.md",
    ]

    forbidden_present = [
        rel
        for rel in forbidden_v41
        if (ROOT / rel).exists()
    ]

    if (ROOT / "css/build").exists():
        forbidden_present.append(
            "css/build/"
        )

    if forbidden_present:
        raise ValidationError(
            "resíduos do bundle CSS rejeitado: "
            + ", ".join(forbidden_present)
        )

    if (
        ROOT / "assets/avatar.webp"
    ).exists():
        raise ValidationError(
            "assets/avatar.webp é legado "
            "e deve permanecer removido"
        )

    print(
        "✓ Assets responsivos, loader atrasado "
        "e performance V39/V40 integrados"
    )


def validate_production_files() -> None:
    cname = (
        ROOT / "CNAME"
    ).read_text(encoding="utf-8").strip()

    if cname != "kamylisumire.com":
        raise ValidationError(
            "CNAME deve conter somente "
            "kamylisumire.com"
        )

    headers_path = ROOT / "_headers"

    if not headers_path.exists():
        raise ValidationError(
            "_headers ausente: previews do "
            "Cloudflare Pages devem permanecer noindex"
        )

    headers = headers_path.read_text(
        encoding="utf-8"
    )

    if (
        "X-Robots-Tag: noindex"
        not in headers
    ):
        raise ValidationError(
            "_headers deve aplicar "
            "X-Robots-Tag: noindex aos previews"
        )

    print(
        "✓ Arquivos de produção/preview coerentes"
    )


class LocalReferenceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.robots = ""

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if (
            tag in {"script", "img"}
            and attrs_dict.get("src")
        ):
            self.references.append(
                (tag, attrs_dict["src"])
            )

        if tag == "source":
            if attrs_dict.get("src"):
                self.references.append(
                    (
                        tag,
                        attrs_dict["src"],
                    )
                )

            srcset = attrs_dict.get(
                "srcset",
                "",
            )

            for candidate in srcset.split(","):
                url = (
                    candidate.strip()
                    .split(" ", 1)[0]
                )

                if url:
                    self.references.append(
                        ("srcset", url)
                    )

        if (
            tag in {"a", "link"}
            and attrs_dict.get("href")
        ):
            self.references.append(
                (
                    tag,
                    attrs_dict["href"],
                )
            )

        if (
            tag == "meta"
            and attrs_dict.get("name")
            == "robots"
        ):
            self.robots = attrs_dict.get(
                "content",
                "",
            )


def local_target(
    source: Path,
    raw_value: str,
):
    value = str(
        raw_value or ""
    ).strip()

    if (
        not value
        or value.startswith("#")
        or value.startswith("//")
        or value.startswith("data:")
        or value.startswith("mailto:")
        or value.startswith("tel:")
        or value.startswith("javascript:")
    ):
        return None

    parsed = urlsplit(value)

    if (
        parsed.scheme
        or parsed.netloc
        or not parsed.path
    ):
        return None

    if parsed.path.startswith("/"):
        return (
            ROOT
            / parsed.path.lstrip("/")
        ).resolve()

    return (
        source.parent
        / parsed.path
    ).resolve()


def validate_local_references() -> None:
    failures = []

    for html_path in [
        ROOT / "index.html",
        ROOT / "doacoes/index.html",
        ROOT / "404.html",
    ]:
        parser = LocalReferenceParser()
        parser.feed(
            html_path.read_text(
                encoding="utf-8"
            )
        )

        for kind, value in parser.references:
            target = local_target(
                html_path,
                value,
            )

            if target is None:
                continue

            try:
                target.relative_to(
                    ROOT.resolve()
                )
            except ValueError:
                failures.append(
                    f"{html_path.relative_to(ROOT)}: "
                    f"{value!r} sai da raiz"
                )
                continue

            if not target.exists():
                failures.append(
                    f"{html_path.relative_to(ROOT)}: "
                    f"referência {kind} ausente: "
                    f"{value}"
                )

    css_url_re = re.compile(
        r"url\(\s*(['\"]?)(.*?)\1\s*\)",
        re.IGNORECASE,
    )

    for css_path in sorted(
        (ROOT / "css").rglob("*.css")
    ):
        css = css_path.read_text(
            encoding="utf-8"
        )

        for _, value in css_url_re.findall(
            css
        ):
            target = local_target(
                css_path,
                value,
            )

            if target is None:
                continue

            try:
                target.relative_to(
                    ROOT.resolve()
                )
            except ValueError:
                failures.append(
                    f"{css_path.relative_to(ROOT)}: "
                    f"url {value!r} sai da raiz"
                )
                continue

            if not target.exists():
                failures.append(
                    f"{css_path.relative_to(ROOT)}: "
                    f"url ausente: {value}"
                )

    if failures:
        raise ValidationError(
            "referências locais quebradas:\n- "
            + "\n- ".join(failures)
        )

    print(
        "✓ Referências locais de HTML/CSS válidas"
    )


def validate_seo_files() -> None:
    robots_path = ROOT / "robots.txt"
    sitemap_path = ROOT / "sitemap.xml"

    if (
        not robots_path.exists()
        or not sitemap_path.exists()
    ):
        raise ValidationError(
            "robots.txt e sitemap.xml "
            "são obrigatórios"
        )

    robots = robots_path.read_text(
        encoding="utf-8"
    )

    if (
        "User-agent: *" not in robots
        or "Allow: /" not in robots
    ):
        raise ValidationError(
            "robots.txt deve permitir rastreamento"
        )

    expected_sitemap = (
        "Sitemap: "
        "https://kamylisumire.com/sitemap.xml"
    )

    if expected_sitemap not in robots:
        raise ValidationError(
            "robots.txt deve conter "
            + expected_sitemap
        )

    try:
        tree = ET.parse(sitemap_path)
    except ET.ParseError as exc:
        raise ValidationError(
            f"sitemap.xml inválido: {exc}"
        ) from exc

    ns = {
        "sm":
            "http://www.sitemaps.org/"
            "schemas/sitemap/0.9"
    }

    locations = [
        (element.text or "").strip()
        for element in tree.findall(
            ".//sm:loc",
            ns,
        )
    ]

    expected = [
        "https://kamylisumire.com/",
        "https://kamylisumire.com/doacoes/",
    ]

    if locations != expected:
        raise ValidationError(
            "sitemap.xml deve conter somente, "
            "nesta ordem: "
            + ", ".join(expected)
        )

    parser = LocalReferenceParser()
    parser.feed(
        (
            ROOT / "404.html"
        ).read_text(encoding="utf-8")
    )

    if (
        "noindex"
        not in parser.robots.lower()
    ):
        raise ValidationError(
            "404.html deve permanecer noindex"
        )

    print(
        "✓ robots, sitemap e 404 noindex coerentes"
    )


def validate_repository_hygiene() -> None:
    leftovers = [
        rel
        for rel in LEGACY_ROOT_FILES
        if (ROOT / rel).exists()
    ]

    if leftovers:
        raise ValidationError(
            "resíduos históricos ainda presentes: "
            + ", ".join(leftovers)
        )

    required_docs = [
        "README.md",
        "AGENTS.md",
        "DESIGN-SYSTEM.md",
        "CHANGELOG.md",
        "assets/README.md",
        "docs/PRODUCAO.md",
        "docs/V40-AUDITORIA.md",
        "docs/V41-FONTES-TRANSICOES.md",
        "docs/V42-CONFIGURACOES-LOADER.md",
    ]

    missing = [
        rel
        for rel in required_docs
        if not (ROOT / rel).exists()
    ]

    if missing:
        raise ValidationError(
            "documentação V40 ausente: "
            + ", ".join(missing)
        )

    if (
        ROOT / "assets/avatar.webp"
    ).exists():
        raise ValidationError(
            "assets/avatar.webp é legado "
            "e deve permanecer removido"
        )

    runtime_files = [
        ROOT / "index.html",
        ROOT / "doacoes/index.html",
        ROOT / "404.html",
        *sorted(
            (ROOT / "css").rglob("*.css")
        ),
        *sorted(
            (ROOT / "js").rglob("*.js")
        ),
        *sorted(
            (ROOT / "data").rglob("*.json")
        ),
    ]

    references = []

    for path in runtime_files:
        text = path.read_text(
            encoding="utf-8"
        )

        if re.search(
            r"(?<![-\w])avatar\.webp(?![-\w])",
            text,
        ):
            references.append(
                str(path.relative_to(ROOT))
            )

    if references:
        raise ValidationError(
            "runtime ainda referencia "
            "avatar.webp legado: "
            + ", ".join(references)
        )

    print(
        "✓ Higiene do repositório V42 válida"
    )


def validate_v42_interface() -> None:
    font_path = (
        ROOT /
        "assets/fonts/nunito-variable.woff2"
    )

    license_path = (
        ROOT /
        "assets/fonts/OFL.txt"
    )

    if not font_path.exists():
        raise ValidationError(
            "Nunito local ausente: "
            "assets/fonts/nunito-variable.woff2"
        )

    data = font_path.read_bytes()

    if (
        len(data) < 4
        or data[:4] != b"wOF2"
    ):
        raise ValidationError(
            "Nunito local não possui "
            "assinatura WOFF2"
        )

    if not license_path.exists():
        raise ValidationError(
            "assets/fonts/OFL.txt ausente"
        )

    license_text = license_path.read_text(
        encoding="utf-8"
    ).upper()

    if (
        "SIL OPEN FONT LICENSE"
        not in license_text
        or "VERSION 1.1"
        not in license_text
    ):
        raise ValidationError(
            "OFL.txt não parece ser OFL 1.1"
        )

    variables_css = (
        ROOT / "css/core/variables.css"
    ).read_text(encoding="utf-8")

    global_css = (
        ROOT / "css/core/global.css"
    ).read_text(encoding="utf-8")

    loader_js = (
        ROOT / "js/core/loader.js"
    ).read_text(encoding="utf-8")

    transition_path = (
        ROOT / "js/core/page-transitions.js"
    )

    if not transition_path.exists():
        raise ValidationError(
            "page-transitions.js ausente"
        )

    transition_js = transition_path.read_text(
        encoding="utf-8"
    )

    if (
        "@font-face" not in variables_css
        or 'font-family: "Nunito"'
            not in variables_css
        or "nunito-variable.woff2"
            not in variables_css
        or "font-display: swap"
            not in variables_css
    ):
        raise ValidationError(
            "Nunito local não está "
            "declarada corretamente"
        )

    pages = {
        "index.html": (
            "assets/fonts/nunito-variable.woff2",
            [
                "css/core/variables.css",
                "css/core/global.css",
                "css/core/navbar.css",
                "css/pages/home.css",
            ],
            "js/core/page-transitions.js",
        ),
        "doacoes/index.html": (
            "../assets/fonts/nunito-variable.woff2",
            [
                "../css/core/variables.css",
                "../css/core/global.css",
                "../css/core/navbar.css",
                "../css/pages/doacoes.css",
                "../css/components/ranking.css",
            ],
            "../js/core/page-transitions.js",
        ),
        "404.html": (
            "assets/fonts/nunito-variable.woff2",
            [
                "css/core/variables.css",
                "css/core/global.css",
                "css/core/navbar.css",
                "css/pages/404.css",
            ],
            None,
        ),
    }

    for rel, (
        preload,
        stylesheets,
        transition_script,
    ) in pages.items():
        html = (
            ROOT / rel
        ).read_text(encoding="utf-8")

        if (
            "fonts.googleapis.com" in html
            or "fonts.gstatic.com" in html
        ):
            raise ValidationError(
                f"{rel} ainda usa Google Fonts"
            )

        if (
            f'href="{preload}"'
            not in html
            or 'as="font"' not in html
            or 'type="font/woff2"'
            not in html
        ):
            raise ValidationError(
                f"{rel} não faz preload "
                "da Nunito local"
            )

        if "css/build/" in html:
            raise ValidationError(
                f"{rel} ainda usa css/build/"
            )

        for stylesheet in stylesheets:
            marker = (
                f'<link rel="stylesheet" '
                f'href="{stylesheet}">'
            )

            if marker not in html:
                raise ValidationError(
                    f"{rel} não carrega "
                    f"{stylesheet}"
                )

        if (
            transition_script
            and (
                f'src="{transition_script}"'
                not in html
            )
        ):
            raise ValidationError(
                f"{rel} não carrega "
                "page-transitions.js"
            )

    expectations = {
        "saída Home -> Doações":
            "site-page-leaving"
            in transition_js
            and 'currentRoute !== "home"'
            in transition_js
            and 'targetRoute !== "doacoes"'
            in transition_js,

        "chegada":
            "site-page-arriving"
            in transition_js,

        "sessionStorage":
            "kamyli:page-transition"
            in transition_js,

        "reduced motion":
            "prefers-reduced-motion: reduce"
            in transition_js,

        "performance reduzida":
            'dataset.performance !== "reduced"'
            in transition_js,

        "loader integra chegada da transição":
            "site-page-arriving"
            in loader_js
            and "pageTransition"
            in loader_js,

        "CSS entrada direcional":
            "site-page-enter-forward"
            in global_css,

        "CSS saída direcional":
            "site-page-exit-forward"
            in global_css,

        "CSS reduced motion":
            "prefers-reduced-motion: reduce"
            in global_css,

        "CSS performance reduzida":
            'data-performance="reduced"'
            in global_css,
    }

    failures = [
        label
        for label, ok
        in expectations.items()
        if not ok
    ]

    if failures:
        raise ValidationError(
            "integração V42 incompleta: "
            + ", ".join(failures)
        )

    print(
        "✓ Nunito local e transições V41 preservadas"
    )

    preferences_js = (
        ROOT / "js/core/preferences.js"
    ).read_text(encoding="utf-8")

    navbar_js = (
        ROOT / "js/core/navbar.js"
    ).read_text(encoding="utf-8")

    footer_js = (
        ROOT / "js/core/footer.js"
    ).read_text(encoding="utf-8")

    navbar_css = (
        ROOT / "css/core/navbar.css"
    ).read_text(encoding="utf-8")

    v42_expectations = {
        "tema possui auto/claro/escuro":
            "themePreference" in preferences_js
            and "THEME_AUTO" in preferences_js
            and "THEME_LIGHT" in preferences_js
            and "THEME_DARK" in preferences_js,

        "tema automático acompanha sistema":
            "prefers-color-scheme: dark"
            in preferences_js
            and "resolveTheme" in preferences_js,

        "blur possui auto/on/off":
            "BLUR_AUTO" in preferences_js
            and "BLUR_ON" in preferences_js
            and "BLUR_OFF" in preferences_js,

        "navbar remove toggles antigos":
            "themeToggle" not in navbar_js
            and "blurToggle" not in navbar_js,

        "navbar fixa botão Apoiar fora do scroll":
            "site-nav-support-wrap" in navbar_js
            and "site-nav-support" in navbar_css
            and ">Apoiar<"
                in navbar_js.replace("\n", ""),

        "footer possui botão de configurações":
            "footerSettingsToggle" in footer_js
            and "footerSettingsPopover" in footer_js,

        "footer oferece três opções de tema":
            'name="site-theme-preference"' in footer_js
            and 'value="auto"' in footer_js
            and 'value="light"' in footer_js
            and 'value="dark"' in footer_js,

        "footer oferece três opções de blur":
            'name="site-blur-preference"' in footer_js
            and 'value="on"' in footer_js
            and 'value="off"' in footer_js,

        "footer exibe copyright antes dos créditos":
            footer_js.find(
                '<p class="site-footer-meta">'
            ) >= 0
            and footer_js.find(
                '<p class="site-footer-credits">'
            ) >= 0
            and footer_js.find(
                '<p class="site-footer-meta">'
            ) < footer_js.find(
                '<p class="site-footer-credits">'
            ),

        "loader dura no mínimo 1 segundo":
            "MIN_DISPLAY_MS = 1000" in loader_js,

        "loader usa superfície dos cards":
            "background-color: var(--card-bg)"
            in global_css
            and "backdrop-filter: blur(var(--blur-card))"
            in global_css,

        "loader respeita blur desligado":
            ':root[data-blur="off"] .site-loader'
            in global_css
            and "backdrop-filter: none"
            in global_css,

        "loader pulsa logo.webp":
            "site-loader-logo-pulse" in global_css
            and "assets/logo.webp" in global_css,

        "404 também usa loader V42":
            'id="site-loader"' in (
                ROOT / "404.html"
            ).read_text(encoding="utf-8")
            and 'src="js/core/loader.js"' in (
                ROOT / "404.html"
            ).read_text(encoding="utf-8"),
    }

    v42_failures = [
        label
        for label, ok
        in v42_expectations.items()
        if not ok
    ]

    if v42_failures:
        raise ValidationError(
            "interface V42 incompleta: "
            + ", ".join(v42_failures)
        )

    for rel in [
        "index.html",
        "doacoes/index.html",
        "404.html",
    ]:
        html = (ROOT / rel).read_text(
            encoding="utf-8"
        )

        if (
            "themePreference" not in html
            or 'savedTheme === "auto"' not in html
        ):
            raise ValidationError(
                f"{rel} não possui bootstrap "
                "de tema automático V42"
            )

    print(
        "✓ Configurações, footer e loader V42.3 integrados"
    )

def main() -> int:
    checks = [
        validate_all_json_files,
        validate_agenda,
        validate_hero_sync,
        validate_visual_assets,
        validate_production_files,
        validate_local_references,
        validate_seo_files,
        validate_v42_interface,
        validate_repository_hygiene,
    ]

    try:
        for check in checks:
            check()
    except (
        ValidationError,
        FileNotFoundError,
        OSError,
    ) as exc:
        print(
            f"\nERRO: {exc}",
            file=sys.stderr,
        )
        return 1

    print(
        "\nTodas as validações passaram."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
