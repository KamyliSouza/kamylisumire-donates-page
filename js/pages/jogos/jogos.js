(() => {
    "use strict";

    const DATA_URL = "/data/content/jogos.json";
    const CONFIG_URL = "/data/content/jogos-config.json";
    const EDITORIAL_URL = "/data/content/jogos-editorial.json";
    const DEFAULT_PAGE_SIZE = 15;
    const MAX_PAGE_SIZE = 60;
    const MAX_VISIBLE_PAGES = 5;
    const EPISODES_COLLAPSED = 5;
    const YOUTUBE_HOSTS = ["www.youtube.com", "youtube.com"];
    const RECOMMENDATION_LABELS = {
        recommended: "Recomendado por Kamyli",
        mixed: "Recomendação com ressalvas",
        "not-recommended": "Não recomendado"
    };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const horizontalScroll = window.KamyliHorizontalScroll;
    const safeHttpUrl = window.KamyliSanitize?.safeHttpUrl;
    const state = {
        data: null,
        editorialByGameId: new Map(),
        listId: "all",
        query: "",
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        viewMode: "poster",
        lastTrigger: null,
        dialogImageGeneration: 0
    };
    const els = {
        tools: document.getElementById("jogosTools"),
        filters: document.getElementById("jogosFilters"),
        search: document.getElementById("jogosSearch"),
        grid: document.getElementById("jogosGrid"),
        pagination: document.getElementById("jogosPagination"),
        status: document.getElementById("jogosState"),
        resultsStatus: document.getElementById("jogosResultsStatus"),
        posterMode: document.getElementById("jogosViewPoster"),
        compactMode: document.getElementById("jogosViewCompact"),
        dialog: document.getElementById("jogoDialog"),
        dialogPanel: document.getElementById("jogoDialogPanel"),
        dialogClose: document.getElementById("jogoDialogClose"),
        dialogImage: document.getElementById("jogoDialogImage"),
        dialogPlaceholder: document.getElementById("jogoDialogPlaceholder"),
        dialogActions: document.getElementById("jogoDialogActions"),
        dialogTitle: document.getElementById("jogoDialogTitle"),
        dialogStatus: document.getElementById("jogoDialogStatus"),
        dialogReviewSection: document.getElementById("jogoDialogReviewSection"),
        dialogScore: document.getElementById("jogoDialogScore"),
        dialogRating: document.getElementById("jogoDialogRating"),
        dialogRecommendation: document.getElementById("jogoDialogRecommendation"),
        dialogScoreCaption: document.getElementById("jogoDialogScoreCaption"),
        dialogReview: document.getElementById("jogoDialogReview"),
        dialogSpoilers: document.getElementById("jogoDialogSpoilers"),
        dialogSpoilerReview: document.getElementById("jogoDialogSpoilerReview"),
        dialogHistorySection: document.getElementById("jogoDialogHistorySection"),
        dialogFirst: document.getElementById("jogoDialogFirst"),
        dialogLast: document.getElementById("jogoDialogLast"),
        dialogTotal: document.getElementById("jogoDialogTotal"),
        dialogEpisodes: document.getElementById("jogoDialogEpisodes"),
        dialogMore: document.getElementById("jogoDialogMore"),
        dialogLinksSection: document.getElementById("jogoDialogLinksSection"),
        dialogLinks: document.getElementById("jogoDialogLinks"),
        dialogEmpty: document.getElementById("jogoDialogEmpty")
    };

    const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

    function normalizePageSize(value) {
        return Number.isInteger(value) && value >= 1 && value <= MAX_PAGE_SIZE ? value : DEFAULT_PAGE_SIZE;
    }

    async function loadEditorialPageSize() {
        try {
            const response = await fetch(CONFIG_URL, { cache: "no-cache" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const config = await response.json();
            if (config?.version !== 1) throw new Error("Contrato de configuração de Jogos inválido");
            return normalizePageSize(config.jogosPorPagina);
        } catch (error) {
            console.warn(`Falha ao carregar configuração editorial de Jogos; usando ${DEFAULT_PAGE_SIZE} jogos por página:`, error);
            return DEFAULT_PAGE_SIZE;
        }
    }

    function animateResults(node) {
        if (!node || reducedMotion.matches || typeof node.animate !== "function") return;
        node.animate(
            [
                { opacity: .58, transform: "translateY(6px)" },
                { opacity: 1, transform: "translateY(0)" }
            ],
            { duration: 180, easing: "cubic-bezier(.2,.7,.3,1)" }
        );
    }

    function safeHttpsUrl(value, allowedHosts = null) {
        if (typeof safeHttpUrl !== "function") return "";
        return safeHttpUrl(value, {
            httpsOnly: true,
            ...(Array.isArray(allowedHosts) ? { allowedHosts } : {})
        });
    }

    async function loadEditorialData() {
        try {
            const response = await fetch(EDITORIAL_URL, { cache: "no-cache" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const editorial = await response.json();
            if (editorial?.version !== 1 || !Array.isArray(editorial.games)) {
                throw new Error("Contrato editorial de Jogos inválido");
            }
            state.editorialByGameId = new Map(
                editorial.games
                    .filter(item => item && typeof item.gameId === "string")
                    .map(item => [item.gameId, item])
            );
        } catch (error) {
            // A ausência do arquivo editorial não pode bloquear o catálogo do Trello.
            state.editorialByGameId = new Map();
            console.warn("Ficha editorial de Jogos indisponível; exibindo apenas o catálogo:", error);
        }
    }

    function createExternalLink(label, rawUrl, allowedHosts = null) {
        const url = safeHttpsUrl(rawUrl, allowedHosts);
        if (!url) return null;
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = label;
        return link;
    }

    function clearDialogContent() {
        for (const node of [els.dialogActions, els.dialogEpisodes, els.dialogLinks]) node?.replaceChildren();
        for (const node of [
            els.dialogTitle, els.dialogStatus, els.dialogRating, els.dialogRecommendation,
            els.dialogReview, els.dialogSpoilerReview, els.dialogFirst, els.dialogLast, els.dialogTotal
        ]) {
            if (node) node.textContent = "";
        }
        for (const node of [
            els.dialogActions, els.dialogScore, els.dialogRating, els.dialogReviewSection,
            els.dialogReview, els.dialogSpoilers, els.dialogHistorySection, els.dialogMore,
            els.dialogLinksSection, els.dialogEmpty
        ]) {
            if (node) node.hidden = true;
        }
        if (els.dialogSpoilers) els.dialogSpoilers.open = false;
        if (els.dialogMore) {
            els.dialogMore.onclick = null;
            els.dialogMore.setAttribute("aria-expanded", "false");
        }
        state.dialogImageGeneration += 1;
        if (els.dialogImage) {
            els.dialogImage.removeAttribute("src");
            els.dialogImage.onerror = null;
            els.dialogImage.hidden = true;
        }
        if (els.dialogPlaceholder) els.dialogPlaceholder.hidden = false;
    }

    function formatDate(iso) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "";
        const [year, month, day] = iso.split("-");
        return `${day}/${month}/${year}`;
    }

    function hasEditorialContent(editorial) {
        if (!editorial || typeof editorial !== "object") return false;
        const review = typeof editorial.review === "string" && editorial.review.trim() !== "";
        const rating = typeof editorial.rating === "number" && Number.isFinite(editorial.rating);
        const recommendation = ["recommended", "mixed", "not-recommended"].includes(editorial.recommendation);
        const playlist = typeof editorial.playlistUrl === "string" && editorial.playlistUrl.trim() !== "";
        const episodes = Array.isArray(editorial.episodes) && editorial.episodes.length > 0;
        const links = Array.isArray(editorial.links) && editorial.links.length > 0;
        return review || rating || recommendation || playlist || episodes || links;
    }

    function addDialogAction(label, rawUrl, allowedHosts, primary = false) {
        const link = createExternalLink(label, rawUrl, allowedHosts);
        if (!link) return null;
        link.className = primary ? "jogo-dialog-action is-primary" : "jogo-dialog-action";
        els.dialogActions.append(link);
        els.dialogActions.hidden = false;
        return link;
    }

    function renderDialogEpisodes(rawEpisodes) {
        const valid = rawEpisodes
            .map((episode, order) => ({ episode, order }))
            .filter(({ episode }) => /^[A-Za-z0-9_-]{11}$/.test(episode?.videoId || ""))
            .sort((a, b) => String(a.episode.date || "").localeCompare(String(b.episode.date || "")) || a.order - b.order)
            .map(({ episode }) => episode);

        const items = [];
        valid.forEach((episode, index) => {
            const url = `https://www.youtube.com/watch?v=${episode.videoId}`;
            const link = createExternalLink(episode.title?.trim() || `Transmissão ${index + 1}`, url, YOUTUBE_HOSTS);
            if (!link) return;
            const item = document.createElement("li");
            const number = document.createElement("span");
            number.className = "jogo-dialog-episode-number";
            number.setAttribute("aria-hidden", "true");
            number.textContent = String(items.length + 1).padStart(2, "0");
            item.append(number, link);
            const date = formatDate(episode.date);
            if (date) {
                const time = document.createElement("span");
                time.className = "jogo-dialog-episode-date";
                time.textContent = date;
                item.append(time);
            }
            const go = document.createElement("span");
            go.className = "jogo-dialog-episode-go";
            go.setAttribute("aria-hidden", "true");
            go.textContent = "↗";
            item.append(go);
            items.push({ item, episode, url });
        });
        if (!items.length) return null;

        els.dialogEpisodes.replaceChildren(...items.map(entry => entry.item));
        els.dialogFirst.textContent = formatDate(items[0].episode.date) || "—";
        els.dialogLast.textContent = formatDate(items[items.length - 1].episode.date) || "—";
        els.dialogTotal.textContent = String(items.length);
        els.dialogHistorySection.hidden = false;

        // Listas longas ficam recolhidas; "Última transmissão" já leva direto ao vídeo mais recente.
        if (items.length > EPISODES_COLLAPSED + 1) {
            const setExpanded = expanded => {
                items.forEach((entry, index) => { entry.item.hidden = !expanded && index >= EPISODES_COLLAPSED; });
                els.dialogMore.setAttribute("aria-expanded", String(expanded));
                els.dialogMore.textContent = expanded ? "Mostrar menos" : `Mostrar todas as ${items.length} transmissões`;
            };
            els.dialogMore.hidden = false;
            els.dialogMore.onclick = () => setExpanded(els.dialogMore.getAttribute("aria-expanded") !== "true");
            setExpanded(false);
        }
        return items[items.length - 1];
    }

    function openGameDialog(game, trigger) {
        if (!els.dialog || typeof els.dialog.showModal !== "function") return;
        const editorial = state.editorialByGameId.get(game.id) || null;
        state.lastTrigger = trigger || document.activeElement;
        clearDialogContent();

        els.dialogTitle.textContent = game.name;
        els.dialogStatus.textContent = game.listName || "Status não informado";
        els.dialogStatus.hidden = !game.listName;

        const imageGeneration = ++state.dialogImageGeneration;
        const artworkUrl = safeHttpsUrl(game.artwork?.url, [
            "cdn.cloudflare.steamstatic.com",
            "shared.fastly.steamstatic.com"
        ]);
        if (artworkUrl) {
            els.dialogImage.src = artworkUrl;
            els.dialogImage.alt = `Capa de ${game.name}`;
            els.dialogImage.hidden = false;
            els.dialogPlaceholder.hidden = true;
            els.dialogImage.onerror = () => {
                if (imageGeneration !== state.dialogImageGeneration) return;
                els.dialogImage.hidden = true;
                els.dialogPlaceholder.hidden = false;
            };
        }

        // Ações externas ficam juntas, ao lado da capa: Steam, playlist e vídeo mais recente.
        const steamUrl = typeof safeHttpUrl === "function"
            ? safeHttpUrl(game.steamUrl, { httpsOnly: true, allowedHosts: ["store.steampowered.com"] })
            : "";
        addDialogAction("Ver na Steam\u00a0↗", steamUrl, ["store.steampowered.com"], true);

        const playlistUrl = (() => {
            const url = safeHttpsUrl(editorial?.playlistUrl, YOUTUBE_HOSTS);
            try {
                const parsed = new URL(url);
                return parsed.pathname === "/playlist" && parsed.searchParams.get("list") ? url : "";
            } catch { return ""; }
        })();
        addDialogAction("Playlist completa\u00a0↗", playlistUrl, YOUTUBE_HOSTS);

        const latest = renderDialogEpisodes(Array.isArray(editorial?.episodes) ? editorial.episodes : []);
        if (latest) addDialogAction("Última transmissão\u00a0↗", latest.url, YOUTUBE_HOSTS);

        const hasRating = typeof editorial?.rating === "number" && Number.isFinite(editorial.rating);
        const recommendation = RECOMMENDATION_LABELS[editorial?.recommendation];
        if (hasRating || recommendation) {
            els.dialogReviewSection.hidden = false;
            els.dialogScore.hidden = false;
            if (hasRating) {
                els.dialogRating.textContent = editorial.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
                els.dialogRating.hidden = false;
            }
            els.dialogRecommendation.textContent = recommendation || "Nota da Kamyli";
            els.dialogScoreCaption.hidden = !hasRating;
        }

        const review = typeof editorial?.review === "string" ? editorial.review.trim() : "";
        if (review) {
            els.dialogReviewSection.hidden = false;
            if (editorial.containsSpoilers === true) {
                els.dialogSpoilers.hidden = false;
                els.dialogSpoilerReview.textContent = review;
            } else {
                els.dialogReview.hidden = false;
                els.dialogReview.textContent = review;
            }
        }

        const extraLinks = Array.isArray(editorial?.links) ? editorial.links : [];
        for (const entry of extraLinks) {
            const link = createExternalLink(`${entry?.label?.trim() || "Link externo"}\u00a0↗`, entry?.url);
            if (link) {
                const item = document.createElement("li");
                item.append(link);
                els.dialogLinks.append(item);
            }
        }
        if (els.dialogLinks.childElementCount) els.dialogLinksSection.hidden = false;

        // Jogo sem ficha: nenhuma seção vazia; só avisa quando não há nada além do título.
        els.dialogEmpty.hidden = els.dialogActions.childElementCount > 0 || hasEditorialContent(editorial);

        els.dialogPanel.scrollTop = 0;
        els.dialog.showModal();
        els.dialogClose?.focus({ preventScroll: true });
    }

    function setViewMode(mode) {
        state.viewMode = mode === "compact" ? "compact" : "poster";
        els.grid.classList.toggle("is-compact", state.viewMode === "compact");
        els.posterMode?.setAttribute("aria-pressed", String(state.viewMode === "poster"));
        els.compactMode?.setAttribute("aria-pressed", String(state.viewMode === "compact"));
    }

    function makeFilter(id, label, count) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "jogos-filter";
        button.dataset.listId = id;
        button.setAttribute("aria-pressed", String(state.listId === id));
        button.textContent = `${label} (${count})`;
        button.addEventListener("click", () => {
            if (state.listId === id) return;
            state.listId = id;
            state.page = 1;
            els.filters.querySelectorAll(".jogos-filter").forEach(node => {
                node.setAttribute("aria-pressed", String(node === button));
            });
            horizontalScroll?.revealItem(els.filters, button, {
                behavior: reducedMotion.matches ? "auto" : "smooth"
            });
            renderGames({ animate: true });
        });
        return button;
    }

    function renderFilters() {
        els.filters.replaceChildren();
        const games = state.data?.games || [];
        els.filters.append(makeFilter("all", "Todos", games.length));
        for (const list of state.data?.lists || []) {
            const count = games.filter(game => game.listId === list.id).length;
            els.filters.append(makeFilter(list.id, list.name, count));
        }
    }

    function makeCard(game) {
        const article = document.createElement("article");
        article.className = "glass-panel jogo-card";
        if (state.viewMode === "compact") article.classList.add("is-compact");

        const media = document.createElement("div");
        media.className = "jogo-card-media";
        const placeholder = document.createElement("div");
        placeholder.className = "jogo-card-placeholder";
        placeholder.setAttribute("aria-hidden", "true");
        const placeholderMark = document.createElement("span");
        placeholderMark.className = "jogo-card-placeholder-mark";
        const placeholderText = document.createElement("span");
        placeholderText.className = "jogo-card-placeholder-text";
        placeholderText.textContent = "Imagem indisponível";
        placeholder.append(placeholderMark, placeholderText);
        media.append(placeholder);

        const artworkUrl = safeHttpsUrl(game.artwork?.url, [
            "cdn.cloudflare.steamstatic.com",
            "shared.fastly.steamstatic.com"
        ]);
        if (artworkUrl) {
            const image = document.createElement("img");
            image.src = artworkUrl;
            image.alt = "";
            image.loading = "lazy";
            image.decoding = "async";
            image.referrerPolicy = "no-referrer";
            image.addEventListener("error", () => image.remove(), { once: true });
            media.append(image);
        }

        const shade = document.createElement("div");
        shade.className = "jogo-card-shade";
        shade.setAttribute("aria-hidden", "true");

        const content = document.createElement("div");
        content.className = "jogo-card-content";
        const title = document.createElement("h2");
        title.className = "jogo-card-title";
        title.textContent = game.name;
        const list = document.createElement("span");
        list.className = "jogo-card-status";
        list.textContent = game.listName;
        const editorial = state.editorialByGameId.get(game.id);
        content.append(title, list);
        if (hasEditorialContent(editorial)) {
            const marker = document.createElement("span");
            marker.className = "jogo-card-editorial-marker";
            marker.textContent = "Ficha editorial";
            content.append(marker);
        }

        // O botão cobre o cartão inteiro e fica fora do <h2>/<div>: o título continua sendo
        // um heading real (navegável por leitor de tela) e o cartão inteiro é clicável.
        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "jogo-card-open";
        openButton.setAttribute("aria-haspopup", "dialog");
        openButton.setAttribute("aria-label", `Ver detalhes de ${game.name}`);
        openButton.addEventListener("click", () => openGameDialog(game, openButton));

        article.append(media, shade, content, openButton);

        const steamUrl = typeof safeHttpUrl === "function"
            ? safeHttpUrl(game.steamUrl, { httpsOnly: true, allowedHosts: ["store.steampowered.com"] })
            : "";
        if (steamUrl) {
            const steamLink = createExternalLink("Steam ↗", steamUrl, ["store.steampowered.com"]);
            if (steamLink) {
                steamLink.className = "jogo-card-steam";
                steamLink.setAttribute("aria-label", `Ver ${game.name} na Steam`);
                article.append(steamLink);
            }
        }
        return article;
    }

    function getVisiblePages(totalPages) {
        if (totalPages <= MAX_VISIBLE_PAGES) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        const middleCount = MAX_VISIBLE_PAGES - 2;
        const maxStart = totalPages - middleCount;
        const start = Math.min(Math.max(state.page - 1, 2), maxStart);
        const middle = Array.from({ length: middleCount }, (_, index) => start + index);
        return [1, ...middle, totalPages];
    }

    function changePage(page) {
        if (state.page === page) return;
        state.page = page;
        renderGames({ animate: true });
        els.pagination.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
        els.grid.scrollIntoView({
            behavior: reducedMotion.matches ? "auto" : "smooth",
            block: "start"
        });
    }

    function makePageButton(page) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "jogos-page-button";
        button.textContent = String(page);
        button.setAttribute("aria-label", `Ir para a página ${page}`);
        button.setAttribute("aria-current", state.page === page ? "page" : "false");
        button.addEventListener("click", () => changePage(page));
        return button;
    }

    function makeArrow(direction, totalPages) {
        const previous = direction === "previous";
        const target = previous ? state.page - 1 : state.page + 1;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "jogos-page-button jogos-pagination-arrow";
        button.textContent = previous ? "‹" : "›";
        button.setAttribute("aria-label", previous ? "Página anterior" : "Próxima página");
        button.disabled = target < 1 || target > totalPages;
        button.addEventListener("click", () => changePage(target));
        return button;
    }

    function renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / state.pageSize);
        els.pagination.replaceChildren();
        els.pagination.hidden = totalPages <= 1;
        if (totalPages <= 1) return;

        const label = document.createElement("span");
        label.className = "jogos-pagination-label";
        label.textContent = "Página";
        els.pagination.append(label, makeArrow("previous", totalPages));

        const pages = getVisiblePages(totalPages);
        pages.forEach((page, index) => {
            const previousPage = pages[index - 1];
            if (index > 0 && page - previousPage > 1) {
                const gap = document.createElement("span");
                gap.className = "jogos-pagination-gap";
                gap.textContent = "…";
                gap.setAttribute("aria-hidden", "true");
                els.pagination.append(gap);
            }
            els.pagination.append(makePageButton(page));
        });

        els.pagination.append(makeArrow("next", totalPages));
    }

    function announceResultCount(count) {
        if (!els.resultsStatus) return;
        els.resultsStatus.textContent = count === 1
            ? "1 jogo encontrado."
            : `${count} jogos encontrados.`;
    }

    function renderGames({ animate = false } = {}) {
        const query = normalize(state.query.trim());
        const games = (state.data?.games || []).filter(game => {
            if (state.listId !== "all" && game.listId !== state.listId) return false;
            return !query || normalize(game.name).includes(query) || normalize(game.listName).includes(query);
        });
        const totalPages = Math.max(1, Math.ceil(games.length / state.pageSize));
        state.page = Math.min(state.page, totalPages);
        const start = (state.page - 1) * state.pageSize;
        const visibleGames = games.slice(start, start + state.pageSize);
        els.grid.classList.toggle("is-compact", state.viewMode === "compact");
        els.grid.replaceChildren(...visibleGames.map(makeCard));
        renderPagination(games.length);
        announceResultCount(games.length);
        if (animate) animateResults(els.grid);
        els.status.hidden = games.length > 0;
        if (!games.length) {
            els.status.textContent = state.data?.games?.length ? "Nenhum jogo encontrado com esses filtros." : "A lista de jogos ainda não foi sincronizada.";
        }
    }

    async function init() {
        try {
            const [response, pageSize] = await Promise.all([
                fetch(DATA_URL, { cache: "no-cache" }),
                loadEditorialPageSize(),
                loadEditorialData()
            ]);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data?.version !== 1 || !Array.isArray(data.lists) || !Array.isArray(data.games)) throw new Error("Contrato de jogos inválido");
            state.data = data;
            state.pageSize = pageSize;
            els.tools.hidden = false;
            setViewMode("poster");
            renderFilters();
            horizontalScroll?.enableClickDrag(els.filters);
            renderGames();
        } catch (error) {
            console.error("Falha ao carregar jogos:", error);
            els.status.hidden = false;
            els.status.textContent = "Não foi possível carregar a lista de jogos agora.";
            if (els.resultsStatus) els.resultsStatus.textContent = "Não foi possível carregar a lista de jogos.";
        }
    }

    els.posterMode?.addEventListener("click", () => {
        if (state.viewMode === "poster") return;
        setViewMode("poster");
        renderGames({ animate: true });
    });
    els.compactMode?.addEventListener("click", () => {
        if (state.viewMode === "compact") return;
        setViewMode("compact");
        renderGames({ animate: true });
    });
    els.dialogClose?.addEventListener("click", () => els.dialog?.close());
    let pressStartedOnBackdrop = false;
    els.dialog?.addEventListener("pointerdown", event => {
        pressStartedOnBackdrop = event.target === els.dialog;
    });
    els.dialog?.addEventListener("click", event => {
        // Selecionar texto dentro do painel e soltar sobre o fundo não deve fechar o popup.
        if (event.target === els.dialog && pressStartedOnBackdrop) els.dialog.close();
        pressStartedOnBackdrop = false;
    });
    els.dialog?.addEventListener("close", () => {
        const trigger = state.lastTrigger;
        state.lastTrigger = null;
        if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
    });

    els.search?.addEventListener("input", event => {
        state.query = event.currentTarget.value;
        state.page = 1;
        renderGames();
    });

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
