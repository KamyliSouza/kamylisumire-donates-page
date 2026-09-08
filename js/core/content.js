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
        navbar: {"ariaLabel": "Navegação principal", "brandAriaLabel": "Ir para a página inicial", "links": {"inicio": "Início", "lives": "Lives", "agenda": "Agenda", "jogos": {"texto": "Jogos", "url": "https://trello.com/b/IfgV0jXS/jogos-das-lives"}, "regras": "Regras", "creditos": "Créditos"}, "apoio": {"texto": "Apoiar", "ariaLabel": "Apoiar a Kamyli"}},
        interface: {"loader": {"ariaLabel": "Carregando o site"}, "footer": {"ariaLabel": "Créditos e informações do site"}, "linksExternos": {"titulo": "Abrir link externo?", "antesHost": "Você está saindo deste site e será direcionado para ", "hostFallback": "outro site", "depoisHost": ".", "cancelar": "Cancelar", "continuar": "Continuar"}, "configuracoes": {"abrir": "Configurações", "titulo": "Configurações", "fecharAriaLabel": "Fechar configurações", "aparencia": "Aparência", "temaAutomatico": "Automático", "temaClaro": "Claro", "temaEscuro": "Escuro", "blur": "Blur", "blurAutomatico": "Automático", "blurLigado": "Ligado", "blurDesligado": "Desligado", "preferenciasIndisponiveis": "Preferências indisponíveis", "temaStatusAutomatico": "Automático • sistema em modo {tema}.", "temaStatusEscuro": "Modo escuro selecionado.", "temaStatusClaro": "Modo claro selecionado.", "blurStatusIndisponivel": "Blur indisponível neste navegador; o efeito permanece desligado.", "blurStatusAutomatico": "Automático • atualmente {estado} ({motivo}).", "blurStatusLigado": "Blur ligado manualmente.", "blurStatusDesligado": "Blur desligado manualmente.", "motivosBlur": {"unsupported": "não suportado pelo navegador", "reduced-transparency": "redução de transparência", "save-data": "economia de dados", "low-memory": "memória limitada", "low-cpu": "processamento limitado", "supported": "condições adequadas", "manual": "escolha manual", "fallback": "condições do dispositivo"}}, "homeFallback": {"livesAnteriorAria": "Mostrar live anterior", "livesProximaAria": "Mostrar próxima live", "livesTrackAria": "Lives recentes no YouTube", "livesCarregando": "Carregando últimas lives...", "agendaEyebrow": "Programação", "agendaTitulo": "Agenda da semana", "agendaAnteriorAria": "Mostrar dia anterior", "agendaProximoAria": "Mostrar próximo dia", "agendaTrackAria": "Dias da semana", "agendaCarregando": "Carregando agenda...", "regrasListaAria": "Regras da comunidade", "regrasCarregando": "Carregando regras...", "creditosListaAria": "Créditos de artistas e assets", "creditosCarregando": "Carregando créditos..."}},
        notFound: {"eyebrow": "Página não encontrada", "codigo": "404", "titulo": "Essa página não existe.", "descricao": "Talvez o link tenha mudado ou você tenha chegado aqui por engano.", "botao": "Voltar para o início", "documentTitle": "Página não encontrada · Kamyli Sumire", "metaDescription": "A página solicitada não foi encontrada."},
        seo: {"compartilhado": {"siteName": "Kamyli Sumire", "imagem": "https://assets.kamylisumire.com/preview.png"}, "home": {"documentTitle": "Kamyli Sumire | Lives, agenda e comunidade", "description": "Faço lives de joguinhos enquanto troco uma ideia com você. Por aqui você encontra minha agenda, minhas redes e todas as formas de acompanhar o conteúdo.", "ogTitle": "Oiê! Eu sou a Kamyli ✨", "ogDescription": "Faço lives de joguinhos enquanto troco uma ideia com você. Por aqui você encontra minha agenda, minhas redes e todas as formas de acompanhar o conteúdo.", "imageAlt": "Kamyli Sumire"}, "doacoes": {"documentTitle": "Doações | Kamyli Sumire — LivePix e Pixie", "description": "Apoie as lives da Kamyli Sumire pelo LivePix ou Pixie e acompanhe o ranking de apoiadores.", "ogTitle": "Apoie a Kamyli Sumire ✨", "ogDescription": "Escolha entre LivePix ou Pixie para apoiar as lives!", "imageAlt": "Apoie a Kamyli Sumire"}}
    };

    let globalData = defaults;
    let observer = null;
    let scheduled = false;

    function safeHttpUrl(value, fallback) {
        try {
            const parsed = new URL(value, window.location.href);
            if (parsed.protocol === "http:" || parsed.protocol === "https:") {
                return parsed.href;
            }
        } catch {}
        return fallback;
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

        const map = {
            inicio: data.links?.inicio,
            lives: data.links?.lives,
            agenda: data.links?.agenda,
            regras: data.links?.regras,
            creditos: data.links?.creditos
        };

        Object.entries(map).forEach(([section, value]) => {
            setText(
                nav.querySelector(`[data-nav-section="${section}"]`),
                value
            );
        });

        const games = nav.querySelector('.site-nav-links a[href*="trello.com"]');
        if (games) {
            setText(games, data.links?.jogos?.texto);
            games.href = safeHttpUrl(
                data.links?.jogos?.url,
                games.href
            );
        }

        const support = nav.querySelector('[data-nav-page="doacoes"]');
        setText(support?.querySelector("span"), data.apoio?.texto);
        setAttribute(support, "aria-label", data.apoio?.ariaLabel);

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

        setText(dialog.querySelector(".site-external-cancel"), copy.cancelar);
        setText(dialog.querySelector(".site-external-continue"), copy.continuar);

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
        setText(toggle?.querySelector("span"), copy.abrir);
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
        setText(card.querySelector("a.button"), data.botao);

        if (data.documentTitle) document.title = data.documentTitle;

        const metaDescription =
            document.querySelector('meta[name="description"]');
        if (metaDescription && data.metaDescription) {
            metaDescription.content = data.metaDescription;
        }
    }

    function applyRuntimeSeo(data) {
        const page =
            window.location.pathname.includes("/doacoes")
                ? data.doacoes
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
        applyGlobalContent
    });

    window.KAMYLI_GLOBAL_UI_PROMISE = loadGlobalEditorial();
})();
