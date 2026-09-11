(() => {
    "use strict";

    const memoryCache = new Map();

    function resolvePath(path) {
        if (window.KAMYLI_SITE_PATH) return window.KAMYLI_SITE_PATH(path);
        return path;
    }

    async function getJSON(path, options = {}) {
        const {
            useMemoryCache = true,
            fetchCache = "no-cache"
        } = options;
        const key = String(path);

        if (useMemoryCache && memoryCache.has(key)) {
            return memoryCache.get(key);
        }

        const request = fetch(resolvePath(path), {
            cache: fetchCache,
            headers: { "Accept": "application/json" }
        }).then(async response => {
            if (!response.ok) {
                throw new Error(
                    `Não foi possível carregar ${path} (HTTP ${response.status}).`
                );
            }
            return response.json();
        });

        if (useMemoryCache) memoryCache.set(key, request);

        try {
            return await request;
        } catch (error) {
            memoryCache.delete(key);
            throw error;
        }
    }

    function setText(elementOrId, value) {
        const element =
            typeof elementOrId === "string"
                ? document.getElementById(elementOrId)
                : elementOrId;

        if (!element || value === undefined || value === null) return false;
        element.textContent = String(value);
        return true;
    }

    function setAttribute(element, name, value) {
        if (!element || value === undefined || value === null) return false;
        element.setAttribute(name, String(value));
        return true;
    }

    function merge(base, extra) {
        if (!extra || typeof extra !== "object" || Array.isArray(extra)) {
            return base;
        }

        const result = {
            ...(base && typeof base === "object" && !Array.isArray(base)
                ? base
                : {})
        };

        Object.entries(extra).forEach(([key, value]) => {
            result[key] =
                value &&
                typeof value === "object" &&
                !Array.isArray(value)
                    ? merge(result[key], value)
                    : value;
        });

        return result;
    }

    const defaults = {
        navbar: {"version":2,"ariaLabel":"Navegação principal","brandAriaLabel":"Ir para a página inicial","links":{"inicio":{"texto":"Início","icone":"home","url":"/"},"lives":{"texto":"Lives","icone":"youtube","url":"/#lives"},"agenda":{"texto":"Agenda","icone":"calendar","url":"/#agenda"},"artes":{"texto":"Artes","icone":"none","url":"/artes/"},"blog":{"texto":"Blog","icone":"none","url":"/blog/"},"jogos":{"texto":"Jogos","icone":"external-link","url":"https://trello.com/b/IfgV0jXS/jogos-das-lives"},"regras":{"texto":"Regras","icone":"none","url":"/#regras"},"creditos":{"texto":"Créditos","icone":"none","url":"/#creditos"},"apoio":{"texto":"Apoiar","icone":"heart","url":"/doacoes/"}}},
        blogConfig: {"page": {"eyebrow": "Blog", "titulo": "Publicações", "descricao": "Textos, pensamentos, bastidores e novidades em uma lista simples, sem imagens de capa.", "buscaPlaceholder": "Buscar por título, resumo ou tag...", "vazio": "Nenhuma publicação disponível no momento.", "minutosLeitura": "{minutos} min de leitura"}, "home": {"eyebrow": "Blog", "titulo": "Últimas publicações", "descricao": "Textos recentes publicados por aqui.", "maxItems": 3}, "article": {"eyebrow": "Blog"}},
        blogPosts: {"version": 1, "posts": []},
        interface: {"loader": {"ariaLabel": "Carregando o site"}, "footer": {"ariaLabel": "Créditos e informações do site"}, "linksExternos": {"titulo": "Abrir link externo?", "antesHost": "Você está saindo deste site e será direcionado para ", "hostFallback": "outro site", "depoisHost": "."}, "configuracoes": {"titulo": "Configurações", "fecharAriaLabel": "Fechar configurações", "aparencia": "Aparência", "temaAutomatico": "Automático", "temaClaro": "Claro", "temaEscuro": "Escuro", "blur": "Blur", "blurAutomatico": "Automático", "blurLigado": "Ligado", "blurDesligado": "Desligado", "preferenciasIndisponiveis": "Preferências indisponíveis", "temaStatusAutomatico": "Automático • sistema em modo {tema}.", "temaStatusEscuro": "Modo escuro selecionado.", "temaStatusClaro": "Modo claro selecionado.", "blurStatusIndisponivel": "Blur indisponível neste navegador; o efeito permanece desligado.", "blurStatusAutomatico": "Automático • atualmente {estado} ({motivo}).", "blurStatusLigado": "Blur ligado manualmente.", "blurStatusDesligado": "Blur desligado manualmente.", "motivosBlur": {"unsupported": "não suportado pelo navegador", "reduced-transparency": "redução de transparência", "save-data": "economia de dados", "low-memory": "memória limitada", "low-cpu": "processamento limitado", "supported": "condições adequadas", "manual": "escolha manual", "fallback": "condições do dispositivo"}}, "homeFallback": {"livesAnteriorAria": "Mostrar live anterior", "livesProximaAria": "Mostrar próxima live", "livesTrackAria": "Lives recentes no YouTube", "livesCarregando": "Carregando últimas lives...", "agendaEyebrow": "Programação", "agendaTitulo": "Agenda da semana", "agendaAnteriorAria": "Mostrar dia anterior", "agendaProximoAria": "Mostrar próximo dia", "agendaTrackAria": "Dias da semana", "agendaCarregando": "Carregando agenda...", "regrasListaAria": "Regras da comunidade", "regrasCarregando": "Carregando regras...", "creditosListaAria": "Créditos de artistas e assets", "creditosCarregando": "Carregando créditos..."}},
        notFound: {"eyebrow": "Página não encontrada", "codigo": "404", "titulo": "Essa página não existe.", "descricao": "Talvez o link tenha mudado ou você tenha chegado aqui por engano.", "documentTitle": "Página não encontrada · Kamyli Sumire", "metaDescription": "A página solicitada não foi encontrada."},
        seo: {"compartilhado": {"siteName": "Kamyli Sumire", "imagem": "https://assets.kamylisumire.com/preview.png"}, "home": {"documentTitle": "Kamyli Sumire | Lives, agenda e comunidade", "description": "Faço lives de joguinhos enquanto troco uma ideia com você. Por aqui você encontra minha agenda, minhas redes e todas as formas de acompanhar o conteúdo.", "ogTitle": "Oiê! Eu sou a Kamyli ✨", "ogDescription": "Faço lives de joguinhos enquanto troco uma ideia com você. Por aqui você encontra minha agenda, minhas redes e todas as formas de acompanhar o conteúdo.", "imageAlt": "Kamyli Sumire"}, "doacoes": {"documentTitle": "Doações | Kamyli Sumire — LivePix e Pixie", "description": "Apoie as lives da Kamyli Sumire pelo LivePix ou Pixie e acompanhe o ranking de apoiadores.", "ogTitle": "Apoie a Kamyli Sumire ✨", "ogDescription": "Escolha entre LivePix ou Pixie para apoiar as lives!", "imageAlt": "Apoie a Kamyli Sumire"}, "blog": {"documentTitle": "Blog | Kamyli Sumire", "description": "Textos, pensamentos, bastidores e novidades publicados por Kamyli Sumire.", "ogTitle": "Blog da Kamyli Sumire", "ogDescription": "Textos, pensamentos, bastidores e novidades publicados por Kamyli Sumire.", "imageAlt": "Blog da Kamyli Sumire"}, "artes": {"documentTitle": "Galeria de Artes | Kamyli Sumire", "description": "Veja fanarts, ilustrações e artes da comunidade da Kamyli Sumire, com créditos para cada artista.", "ogTitle": "Galeria de Artes da Kamyli Sumire ✨", "ogDescription": "Um espaço para reunir fanarts, ilustrações e artes da comunidade da Kamyli Sumire.", "imageAlt": "Galeria de Artes da Kamyli Sumire"}}
    };

    let globalData = JSON.parse(JSON.stringify(defaults));
    let observer = null;
    let scheduled = false;

    const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const BLOG_MONTHS = [
        "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
        "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"
    ];

    function getPublishedBlogPosts(data = globalData.blogPosts) {
        const posts = Array.isArray(data?.posts)
            ? data.posts
            : [];

        return posts
            .filter(post => (
                post &&
                post.published === true &&
                typeof post.slug === "string" &&
                BLOG_SLUG_PATTERN.test(post.slug) &&
                typeof post.title === "string" &&
                post.title.trim() &&
                typeof post.summary === "string" &&
                post.summary.trim() &&
                /^\d{4}-\d{2}-\d{2}$/.test(String(post.date || ""))
            ))
            .map(post => ({
                slug: post.slug,
                title: post.title.trim(),
                summary: post.summary.trim(),
                date: post.date,
                readMinutes: Math.max(1, Number(post.readMinutes) || 1),
                tags: Array.isArray(post.tags)
                    ? post.tags
                        .filter(tag => typeof tag === "string" && tag.trim())
                        .map(tag => tag.trim())
                    : []
            }))
            .sort((a, b) => (
                b.date.localeCompare(a.date) ||
                a.title.localeCompare(b.title, "pt-BR")
            ));
    }

    function getBlogPostUrl(post) {
        return resolvePath(`/blog/${post.slug}/`);
    }

    function formatBlogDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
        if (!match) return String(value || "");

        const [, year, month, day] = match;
        const monthLabel = BLOG_MONTHS[Number(month) - 1] || month;
        return `${day} ${monthLabel} ${year}`;
    }

    function getBlogPostMeta(post) {
        const template =
            globalData.blogConfig?.page?.minutosLeitura ||
            "{minutos} min de leitura";

        const reading = template.replace(
            "{minutos}",
            String(post.readMinutes)
        );

        return `${formatBlogDate(post.date)} · ${reading}`;
    }

    function safeNavbarHref(value, fallback) {
        const raw = String(value || "").trim();
        if (!raw) return fallback;

        if (raw.startsWith("/") && !raw.startsWith("//")) {
            return resolvePath(raw);
        }

        try {
            const parsed = new URL(raw);
            if (parsed.protocol === "http:" || parsed.protocol === "https:") {
                return parsed.href;
            }
        } catch {}

        return fallback;
    }

    function applyNavbarIcon(link, iconName) {
        const slot = link?.querySelector("[data-nav-icon]");
        if (!slot) return;

        const icons = window.KamyliButtonIcons;
        if (!icons) return;

        const name = icons.allowed.includes(iconName) ? iconName : "none";
        const svg = icons.create(name, "site-nav-item-icon-svg");
        slot.replaceChildren();
        slot.hidden = !svg;
        if (svg) slot.appendChild(svg);
    }

    function configureNavbarLink(link, key, entry) {
        if (!link || !entry || typeof entry !== "object") return;

        const label = link.querySelector("[data-nav-label]");
        setText(label || link, entry.texto);

        const href = safeNavbarHref(entry.url, link.href);
        link.href = href;
        applyNavbarIcon(link, entry.icone);

        let target;
        try {
            target = new URL(href, window.location.href);
        } catch {
            target = null;
        }

        if (target && target.origin !== window.location.origin) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        } else {
            link.removeAttribute("target");
            link.removeAttribute("rel");
        }

        const home = new URL(resolvePath("/"), window.location.href);
        if (
            target &&
            target.origin === home.origin &&
            target.pathname === home.pathname
        ) {
            const sectionId = target.hash.replace(/^#/, "") ||
                (key === "inicio" ? "inicio" : "");
            if (sectionId) link.dataset.navSection = sectionId;
            else delete link.dataset.navSection;
        } else {
            delete link.dataset.navSection;
        }
    }

    function setRadioLabel(name, value, text) {
        const input = document.querySelector(
            `input[name="${name}"][value="${value}"]`
        );
        const span = input?.closest("label")?.querySelector("span");
        setText(span, text);
    }

    function applyNavbar(data) {
        const nav = document.querySelector("#site-navbar .site-nav");
        if (!nav) return false;

        setAttribute(nav, "aria-label", data.ariaLabel);
        setAttribute(
            nav.querySelector(".site-brand"),
            "aria-label",
            data.brandAriaLabel
        );

        const links = data.links && typeof data.links === "object"
            ? data.links
            : {};

        for (const key of [
            "inicio", "lives", "agenda", "artes", "blog",
            "jogos", "regras", "creditos", "apoio"
        ]) {
            configureNavbarLink(
                nav.querySelector(`[data-nav-key="${key}"]`),
                key,
                links[key]
            );
        }

        if (!document.getElementById("inicio")) {
            nav.querySelectorAll(".site-nav-link").forEach(link => {
                let target;
                try {
                    target = new URL(link.href, window.location.href);
                } catch {
                    target = null;
                }

                const current = Boolean(
                    target &&
                    target.origin === window.location.origin &&
                    target.pathname === window.location.pathname &&
                    !target.hash
                );

                link.classList.toggle("is-active", current);
                if (current) link.setAttribute("aria-current", "page");
                else if (link.getAttribute("aria-current") === "page") {
                    link.removeAttribute("aria-current");
                }
            });
        }

        return true;
    }

    function applyExternalDialog(copy) {
        const dialog = document.querySelector(".site-external-dialog");
        if (!dialog) return false;

        setText(dialog.querySelector("#externalDialogTitle"), copy.titulo);

        const paragraph = dialog.querySelector("#externalDialogText");
        const host = dialog.querySelector("#externalDialogHost");

        if (paragraph && host) {
            const textNodes = [...paragraph.childNodes].filter(
                node => node.nodeType === Node.TEXT_NODE
            );

            if (textNodes[0]) {
                textNodes[0].nodeValue = copy.antesHost;
            } else {
                paragraph.insertBefore(
                    document.createTextNode(copy.antesHost),
                    host
                );
            }

            setText(host, copy.hostFallback);

            if (host.nextSibling?.nodeType === Node.TEXT_NODE) {
                host.nextSibling.nodeValue = copy.depoisHost;
            } else {
                host.after(document.createTextNode(copy.depoisHost));
            }
        }

        return true;
    }

    function format(template, values) {
        return String(template || "").replace(
            /\{([a-zA-Z0-9_-]+)\}/g,
            (_, key) => values[key] ?? `{${key}}`
        );
    }

    function applyPreferenceStatus(copy) {
        const prefs = window.KAMYLI_UI_PREFS;
        if (!prefs?.getState) return;

        const state = prefs.getState();
        const themeStatus = document.getElementById("footerThemeStatus");
        const blurStatus = document.getElementById("footerBlurStatus");

        if (themeStatus) {
            if (state.themePreference === "auto") {
                themeStatus.textContent = format(
                    copy.temaStatusAutomatico,
                    {
                        tema:
                            state.theme === "dark"
                                ? String(copy.temaEscuro).toLowerCase()
                                : String(copy.temaClaro).toLowerCase()
                    }
                );
            } else {
                themeStatus.textContent =
                    state.theme === "dark"
                        ? copy.temaStatusEscuro
                        : copy.temaStatusClaro;
            }
        }

        if (blurStatus) {
            if (!state.blurSupported) {
                blurStatus.textContent = copy.blurStatusIndisponivel;
            } else if (state.blurPreference === "auto") {
                const reasons = copy.motivosBlur || {};
                blurStatus.textContent = format(
                    copy.blurStatusAutomatico,
                    {
                        estado:
                            state.blur === "on"
                                ? String(copy.blurLigado).toLowerCase()
                                : String(copy.blurDesligado).toLowerCase(),
                        motivo:
                            reasons[state.blurReason] ||
                            reasons.fallback ||
                            "condições do dispositivo"
                    }
                );
            } else {
                blurStatus.textContent =
                    state.blur === "on"
                        ? copy.blurStatusLigado
                        : copy.blurStatusDesligado;
            }
        }
    }

    function applyFooter(copy) {
        const footer = document.getElementById("site-footer");
        if (!footer) return false;

        setAttribute(
            footer,
            "aria-label",
            globalData.interface.footer?.ariaLabel
        );

        const toggle = footer.querySelector("#footerSettingsToggle");
        setText(footer.querySelector("#footerSettingsTitle"), copy.titulo);
        setAttribute(
            footer.querySelector("#footerSettingsClose"),
            "aria-label",
            copy.fecharAriaLabel
        );

        const legends = footer.querySelectorAll(".site-settings-group legend");
        setText(legends[0], copy.aparencia);
        setText(legends[1], copy.blur);

        setRadioLabel("site-theme-preference", "auto", copy.temaAutomatico);
        setRadioLabel("site-theme-preference", "light", copy.temaClaro);
        setRadioLabel("site-theme-preference", "dark", copy.temaEscuro);
        setRadioLabel("site-blur-preference", "auto", copy.blurAutomatico);
        setRadioLabel("site-blur-preference", "on", copy.blurLigado);
        setRadioLabel("site-blur-preference", "off", copy.blurDesligado);

        if (toggle?.disabled && copy.preferenciasIndisponiveis) {
            toggle.title = copy.preferenciasIndisponiveis;
        }

        requestAnimationFrame(() => applyPreferenceStatus(copy));

        return Boolean(footer.querySelector(".site-footer-content"));
    }

    function applyHomeFallback(copy) {
        if (!document.getElementById("inicio")) return;

        setAttribute(
            document.getElementById("livesPrev"),
            "aria-label",
            copy.livesAnteriorAria
        );
        setAttribute(
            document.getElementById("livesNext"),
            "aria-label",
            copy.livesProximaAria
        );
        setAttribute(
            document.getElementById("livesTrack"),
            "aria-label",
            copy.livesTrackAria
        );

        const livesMessage = document.getElementById("livesMessage");
        if (livesMessage && /carregando/i.test(livesMessage.textContent || "")) {
            setText(livesMessage, copy.livesCarregando);
        }

        const agenda = document.getElementById("agenda");
        if (agenda) {
            setText(
                agenda.querySelector(".section-heading .eyebrow"),
                copy.agendaEyebrow
            );
            setText(
                agenda.querySelector(".section-heading h2"),
                copy.agendaTitulo
            );
        }

        setAttribute(
            document.getElementById("agendaPrev"),
            "aria-label",
            copy.agendaAnteriorAria
        );
        setAttribute(
            document.getElementById("agendaNext"),
            "aria-label",
            copy.agendaProximoAria
        );
        setAttribute(
            document.getElementById("agendaGrid"),
            "aria-label",
            copy.agendaTrackAria
        );

        const agendaLoading =
            document.querySelector("#agendaGrid .loading-message");
        if (agendaLoading) setText(agendaLoading, copy.agendaCarregando);

        const regrasLista = document.getElementById("regrasLista");
        setAttribute(regrasLista, "aria-label", copy.regrasListaAria);
        const regrasLoading = regrasLista?.querySelector(".editable-loading");
        if (regrasLoading) setText(regrasLoading, copy.regrasCarregando);

        const creditosLista = document.getElementById("creditosLista");
        setAttribute(creditosLista, "aria-label", copy.creditosListaAria);

        const creditosDescription =
            document.getElementById("creditosDescricao");
        if (
            creditosDescription &&
            /carregando/i.test(creditosDescription.textContent || "")
        ) {
            setText(creditosDescription, copy.creditosCarregando);
        }
    }

    function applyNotFound(data) {
        const card = document.querySelector(".not-found-card");
        if (!card) return;

        setText(card.querySelector(".eyebrow"), data.eyebrow);
        setText(card.querySelector("h1"), data.codigo);
        setText(card.querySelector("h2"), data.titulo);
        setText(card.querySelector("p"), data.descricao);

        if (data.documentTitle) document.title = data.documentTitle;

        const metaDescription =
            document.querySelector('meta[name="description"]');
        if (metaDescription && data.metaDescription) {
            metaDescription.content = data.metaDescription;
        }
    }

    function applyRuntimeSeo(data) {
        if (
            document.querySelector(".not-found-card") ||
            document.querySelector("[data-blog-post]")
        ) {
            return;
        }

        const path = window.location.pathname;
        const page =
            path.includes("/doacoes")
                ? data.doacoes
                : path.includes("/artes")
                    ? data.artes
                    : path.includes("/blog")
                        ? data.blog
                        : data.home;

        if (!page) return;

        if (page.documentTitle) document.title = page.documentTitle;

        const description =
            document.querySelector('meta[name="description"]');
        if (description && page.description) {
            description.content = page.description;
        }
    }

    function applyGlobalContent() {
        applyNavbar(globalData.navbar);
        applyFooter(globalData.interface.configuracoes);
        applyExternalDialog(globalData.interface.linksExternos);

        setAttribute(
            document.getElementById("site-loader"),
            "aria-label",
            globalData.interface.loader?.ariaLabel
        );

        applyHomeFallback(globalData.interface.homeFallback || {});
        applyNotFound(globalData.notFound);
        applyRuntimeSeo(globalData.seo);
    }

    function scheduleApply() {
        if (scheduled) return;
        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;
            applyGlobalContent();
        });
    }

    function essentialUiMounted() {
        const navbar = document.getElementById("site-navbar");
        const footer = document.getElementById("site-footer");

        return (
            (!navbar || Boolean(navbar.querySelector(".site-nav"))) &&
            (!footer || Boolean(footer.querySelector(".site-footer-content")))
        );
    }

    async function waitUntilMounted(timeoutMs = 1600) {
        const started = performance.now();

        while (
            !essentialUiMounted() &&
            performance.now() - started < timeoutMs
        ) {
            await new Promise(resolve => requestAnimationFrame(resolve));
            applyGlobalContent();
        }
    }

    async function loadGlobalEditorial() {
        window.KAMYLI_GLOBAL_UI_READY = false;

        const files = {
            navbar: "/data/content/navbar.json",
            blogConfig: "/data/blog/config.json",
            blogPosts: "/data/blog/posts.json",
            interface: "/data/content/interface.json",
            notFound: "/data/content/404.json",
            seo: "/data/content/seo.json"
        };

        const results = await Promise.all(
            Object.entries(files).map(async ([key, path]) => {
                try {
                    return [key, await getJSON(path)];
                } catch (error) {
                    console.warn(
                        `Conteúdo global: usando fallback para ${path}.`,
                        error
                    );
                    return [key, null];
                }
            })
        );

        results.forEach(([key, value]) => {
            if (value) globalData[key] = merge(globalData[key], value);
        });

        window.KAMYLI_GLOBAL_CONTENT = Object.freeze(globalData);

        applyGlobalContent();

        observer = new MutationObserver(scheduleApply);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        await waitUntilMounted();
        applyGlobalContent();

        window.KAMYLI_GLOBAL_UI_READY = true;

        window.dispatchEvent(
            new CustomEvent("kamyli:global-ui-ready", {
                detail: globalData
            })
        );
        window.dispatchEvent(new CustomEvent("kamyli:loader-ready"));

        setTimeout(() => {
            observer?.disconnect();
            observer = null;
        }, 3500);

        return globalData;
    }

    window.addEventListener(
        "kamyli:ui-preference-change",
        () => requestAnimationFrame(
            () => applyFooter(globalData.interface.configuracoes)
        )
    );

    window.KamyliContent = Object.freeze({
        getJSON,
        setText,
        getPublishedBlogPosts,
        getBlogPostUrl,
        getBlogPostMeta
    });

    window.KAMYLI_GLOBAL_UI_PROMISE = loadGlobalEditorial();
})();
