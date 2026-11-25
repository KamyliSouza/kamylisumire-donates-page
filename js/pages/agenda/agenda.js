/*
 * Página /agenda/ — desenha a semana publicada em data/agenda.json.
 *
 * - Navbar, footer, redes, tema e loader continuam sendo montados pelos
 *   scripts globais; esta página só preenche o seu próprio conteúdo.
 * - O navegador nunca consulta Trello nem a Steam Web API. As artes vêm das
 *   URLs já publicadas em data/content/jogos-artwork.json (ver agenda-model.js).
 * - Todo texto entra por textContent; nenhum HTML vindo de JSON é interpretado.
 */
(() => {
    "use strict";

    const AGENDA_URL = "/data/agenda.json";
    const MANIFEST_URL = "/data/content/jogos-artwork.json";
    const model = window.KamyliAgendaModel;
    const contrast = window.KamyliAgendaContrast;
    const viewPrefs = window.KAMYLI_VIEW_MODE;

    const els = {
        panel: document.getElementById("agendaPanel"),
        art: document.getElementById("agendaPanelArt"),
        period: document.getElementById("agendaPeriod"),
        grid: document.getElementById("agendaGrid"),
        note: document.getElementById("agendaNote"),
        updated: document.getElementById("agendaUpdated"),
        status: document.getElementById("agendaStatus"),
        standardMode: document.getElementById("agendaViewStandard"),
        compactMode: document.getElementById("agendaViewCompact")
    };

    /*
     * V48.5.2 — Modo compacto: uma linha por dia (dia, horário, jogo, plataformas) sem descrição e com
     * a arte do jogo só numa faixa à direita que se dissolve na superfície do card (V48.5.3), para ver a semana
     * inteira de relance sem texto sobre imagem. A escolha fica salva neste navegador
     * (`KAMYLI_VIEW_MODE`, chave `kamyli:ui-view-agenda`); sem storage vale só nesta visita.
     */
    const state = { week: null, viewMode: "standard" };

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    /*
     * Tenta as URLs em ordem; se nenhuma carregar, remove a imagem e o fundo
     * padrão do componente (gradiente da marca) continua legível.
     */
    function artImage(urls, { eager = false, onLoad = null } = {}) {
        const image = document.createElement("img");
        image.alt = "";
        image.decoding = "async";
        image.loading = eager ? "eager" : "lazy";
        image.referrerPolicy = "no-referrer";
        if (typeof onLoad === "function") {
            image.addEventListener("load", () => onLoad(image));
        }
        let attempt = 0;
        const load = () => { image.src = urls[attempt]; };
        image.addEventListener("error", () => {
            attempt += 1;
            if (attempt < urls.length) load();
            else image.remove();
        });
        load();
        return image;
    }

    /*
     * Contraste adaptativo: lê duas pequenas regiões da capa (topo e base) numa
     * cópia reduzida, sem alterar a imagem exibida, e pede ao
     * `agenda-contrast.js` o tom do texto e o menor véu que dê leitura.
     * Sem CORS/canvas, ou sem o módulo, o card mantém o véu leve padrão do CSS.
     */
    const CANVAS_WIDTH = 64;
    const CANVAS_HEIGHT = 32;
    const RESIZE_DELAY = 150;

    function applyContrastPlan(card, plan) {
        card.dataset.artTopText = plan.top.tone;
        card.dataset.artBottomText = plan.bottom.tone;
        card.style.setProperty("--ag-art-veil-top", String(plan.top.alpha));
        card.style.setProperty("--ag-art-veil-bottom", String(plan.bottom.alpha));
    }

    function sampleCard(probe, card) {
        const rect = card.getBoundingClientRect();
        const boxWidth = rect.width || 478;
        const boxHeight = rect.height || 238;
        /* Mesmo recorte de `object-fit: cover; object-position: center 44%`. */
        const scale = Math.max(boxWidth / probe.naturalWidth, boxHeight / probe.naturalHeight);
        const cropWidth = boxWidth / scale;
        const cropHeight = boxHeight / scale;
        const sourceX = (probe.naturalWidth - cropWidth) * 0.5;
        const sourceY = (probe.naturalHeight - cropHeight) * 0.44;
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return null;
        context.drawImage(probe, sourceX, sourceY, cropWidth, cropHeight, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const pixels = context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
        return contrast.planCard(pixels, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    /* O recorte muda com o tamanho do card (colunas, rotação): reanalisa com debounce. */
    function watchCardSize(card, run) {
        if (typeof ResizeObserver !== "function") return;
        let width = card.clientWidth;
        let height = card.clientHeight;
        let timer = 0;
        const observer = new ResizeObserver(() => {
            if (!card.isConnected) {
                observer.disconnect();
                return;
            }
            if (Math.abs(card.clientWidth - width) < 3 && Math.abs(card.clientHeight - height) < 3) return;
            width = card.clientWidth;
            height = card.clientHeight;
            window.clearTimeout(timer);
            timer = window.setTimeout(run, RESIZE_DELAY);
        });
        observer.observe(card);
    }

    function analyzeCardArtwork(visibleImage, card) {
        const source = visibleImage.currentSrc || visibleImage.src;
        if (!source || !contrast) return;

        const probe = new Image();
        probe.crossOrigin = "anonymous";
        probe.referrerPolicy = "no-referrer";
        probe.onload = () => {
            const run = () => {
                try {
                    const plan = sampleCard(probe, card);
                    if (plan) applyContrastPlan(card, plan);
                } catch {
                    /* Falha de CORS/canvas é não crítica: preserva o contraste padrão. */
                }
            };
            run();
            watchCardSize(card, run);
        };
        probe.src = source;
    }

    /* Save-Data e perfil reduzido preservam só o conteúdo: o fundo do painel é decorativo. */
    function skipDecorativeArt() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return Boolean(connection && connection.saveData) ||
            document.documentElement.dataset.performance === "reduced";
    }

    function renderDay(day, compact = false) {
        const multiple = day.lives.length > 1;
        const card = element(
            "article",
            `agenda-day ${day.hasLive ? "has-live" : "no-live"}${multiple ? " has-multiple-lives" : ""}`
        );
        card.setAttribute("aria-label", day.ariaLabel);

        if (day.hasLive && day.art.length) {
            const media = element("div", "agenda-day-art");
            media.setAttribute("aria-hidden", "true");
            /* Na linha compacta o texto fica sobre a superfície do card, fora da faixa de arte: sem análise de contraste. */
            media.append(artImage(day.art, {
                onLoad: compact ? null : image => analyzeCardArtwork(image, card)
            }));
            card.append(media);
        }

        const top = element("div", "agenda-day-top");
        const heading = element("div");
        heading.append(element("h3", "agenda-day-name", day.name));
        const date = element("time", "agenda-day-date", day.dateLabel);
        date.dateTime = day.iso;
        heading.append(date);
        const chip = element(
            "span",
            "agenda-chip",
            !day.hasLive ? "SEM LIVE" : multiple ? `${day.lives.length} LIVES` : "LIVE"
        );
        top.append(heading, chip);
        card.append(top);

        if (!day.hasLive) {
            const placeholder = element("div", "agenda-day-placeholder");
            const mark = element("span", "agenda-day-mark");
            mark.setAttribute("aria-hidden", "true");
            const copy = element("div", "agenda-day-placeholder-copy");
            copy.append(element("p", "agenda-event-title", "Dia livre"));
            if (!compact) copy.append(element("p", "agenda-event-description", "Nenhuma transmissão prevista."));
            placeholder.append(mark, copy);
            card.append(placeholder);
            return card;
        }

        const info = element("div", "agenda-event-info");
        day.lives.forEach(live => {
            const item = element("div", "agenda-event");
            const line = element("div", "agenda-event-line");
            line.append(
                element("span", "agenda-time", live.time),
                element("p", "agenda-event-title", live.title)
            );
            item.append(line);
            if (!compact && live.description && !multiple) {
                item.append(element("p", "agenda-event-description", live.description));
            }
            if (live.platforms.length) {
                item.append(element("p", "agenda-platforms", live.platforms.join(" · ")));
            }
            info.append(item);
        });
        card.append(info);
        return card;
    }

    function renderDays() {
        const compact = state.viewMode === "compact";
        els.grid.classList.toggle("is-compact", compact);
        els.grid.replaceChildren(...state.week.days.map(day => renderDay(day, compact)));
    }

    function setViewMode(mode) {
        state.viewMode = mode === "compact" ? "compact" : "standard";
        els.standardMode?.setAttribute("aria-pressed", String(state.viewMode === "standard"));
        els.compactMode?.setAttribute("aria-pressed", String(state.viewMode === "compact"));
        if (state.week) renderDays();
    }

    function chooseViewMode(mode) {
        if (state.viewMode === mode) return;
        setViewMode(mode);
        viewPrefs?.set("agenda", mode);
    }

    els.standardMode?.addEventListener("click", () => chooseViewMode("standard"));
    els.compactMode?.addEventListener("click", () => chooseViewMode("compact"));

    function render(week) {
        state.week = week;
        setViewMode(viewPrefs?.get("agenda") ?? "standard");
        els.period.textContent = week.period;
        els.note.textContent = week.note;
        els.note.hidden = !week.note;
        els.updated.textContent = week.updated
            ? `Horário de Brasília · Atualizada em ${week.updated}`
            : "Horário de Brasília";

        els.art.replaceChildren();
        if (week.background && !skipDecorativeArt()) {
            els.art.append(artImage(week.background.urls, { eager: true }));
        }
        els.status.hidden = true;
        els.panel.hidden = false;
    }

    async function fetchJson(url) {
        const response = await fetch(url, { cache: "no-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    async function init() {
        try {
            if (!model) throw new Error("Modelo da agenda não carregado.");
            /* O manifesto de artes é opcional: sem ele a agenda aparece com o fundo padrão. */
            const [agenda, manifest] = await Promise.all([
                fetchJson(AGENDA_URL),
                fetchJson(MANIFEST_URL).catch(error => {
                    console.warn("Manifesto de artes indisponível; a agenda será exibida sem imagens:", error);
                    return null;
                })
            ]);
            render(model.buildWeek(agenda, manifest));
        } catch (error) {
            console.error("Falha ao carregar a agenda:", error);
            els.panel.hidden = true;
            els.status.hidden = false;
            els.status.textContent = "Não foi possível carregar a agenda agora. Tente novamente em instantes.";
        }
    }

    function signalContentReady() {
        window.KAMYLI_PAGE_CONTENT_READY = true;
        window.dispatchEvent(
            new CustomEvent("kamyli:loader-ready", {
                detail: { key: "page-content" }
            })
        );
    }

    init().finally(signalContentReady);
})();
