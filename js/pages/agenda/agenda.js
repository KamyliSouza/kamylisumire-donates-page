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

    const els = {
        panel: document.getElementById("agendaPanel"),
        art: document.getElementById("agendaPanelArt"),
        period: document.getElementById("agendaPeriod"),
        grid: document.getElementById("agendaGrid"),
        note: document.getElementById("agendaNote"),
        updated: document.getElementById("agendaUpdated"),
        status: document.getElementById("agendaStatus")
    };

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
     * Lê somente duas pequenas regiões da capa, sem alterar a imagem exibida.
     * Se a origem não liberar CORS, mantém a paleta padrão sem afetar o card.
     */
    function averageLuminance(pixels, width, height, bounds) {
        const startX = Math.max(0, Math.floor(width * bounds.x1));
        const endX = Math.min(width, Math.ceil(width * bounds.x2));
        const startY = Math.max(0, Math.floor(height * bounds.y1));
        const endY = Math.min(height, Math.ceil(height * bounds.y2));
        let total = 0;
        let count = 0;

        for (let y = startY; y < endY; y += 1) {
            for (let x = startX; x < endX; x += 1) {
                const offset = (y * width + x) * 4;
                const channels = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
                    .map(value => value / 255)
                    .map(value => value <= 0.04045
                        ? value / 12.92
                        : ((value + 0.055) / 1.055) ** 2.4);
                total += channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
                count += 1;
            }
        }

        return count ? total / count : 1;
    }

    function analyzeCardArtwork(visibleImage, card) {
        const source = visibleImage.currentSrc || visibleImage.src;
        if (!source) return;

        const probe = new Image();
        probe.crossOrigin = "anonymous";
        probe.referrerPolicy = "no-referrer";
        probe.onload = () => {
            try {
                const rect = card.getBoundingClientRect();
                const boxWidth = rect.width || 478;
                const boxHeight = rect.height || 238;
                const scale = Math.max(boxWidth / probe.naturalWidth, boxHeight / probe.naturalHeight);
                const cropWidth = boxWidth / scale;
                const cropHeight = boxHeight / scale;
                const sourceX = (probe.naturalWidth - cropWidth) * 0.5;
                const sourceY = (probe.naturalHeight - cropHeight) * 0.44;
                const canvas = document.createElement("canvas");
                canvas.width = 48;
                canvas.height = 24;
                const context = canvas.getContext("2d", { willReadFrequently: true });
                if (!context) return;

                context.drawImage(
                    probe,
                    sourceX, sourceY, cropWidth, cropHeight,
                    0, 0, canvas.width, canvas.height
                );
                const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
                const top = averageLuminance(pixels, canvas.width, canvas.height, {
                    x1: 0, x2: 0.78, y1: 0.02, y2: 0.34
                });
                const bottom = averageLuminance(pixels, canvas.width, canvas.height, {
                    x1: 0, x2: 1, y1: 0.52, y2: 0.98
                });

                card.dataset.artTopTone = top < 0.42 ? "dark" : "light";
                card.dataset.artBottomTone = bottom < 0.42 ? "dark" : "light";
            } catch {
                /* Falha de CORS/canvas é não crítica: preserva o contraste padrão. */
            }
        };
        probe.src = source;
    }

    /* Save-Data e perfil reduzido preservam só o conteúdo: o fundo do painel é decorativo. */
    function skipDecorativeArt() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return Boolean(connection && connection.saveData) ||
            document.documentElement.dataset.performance === "reduced";
    }

    function renderDay(day) {
        const multiple = day.lives.length > 1;
        const card = element(
            "article",
            `agenda-day ${day.hasLive ? "has-live" : "no-live"}${multiple ? " has-multiple-lives" : ""}`
        );
        card.setAttribute("aria-label", day.ariaLabel);

        if (day.hasLive && day.art.length) {
            const media = element("div", "agenda-day-art");
            media.setAttribute("aria-hidden", "true");
            media.append(artImage(day.art, {
                onLoad: image => analyzeCardArtwork(image, card)
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
            copy.append(
                element("p", "agenda-event-title", "Dia livre"),
                element("p", "agenda-event-description", "Nenhuma transmissão prevista.")
            );
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
            if (live.description && !multiple) {
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

    function render(week) {
        els.period.textContent = week.period;
        els.grid.replaceChildren(...week.days.map(renderDay));
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
