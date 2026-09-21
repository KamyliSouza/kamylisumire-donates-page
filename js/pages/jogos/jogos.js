(() => {
    "use strict";

    const DATA_URL = "/data/content/jogos.json";
    const CONFIG_URL = "/data/content/jogos-config.json";
    const DEFAULT_PAGE_SIZE = 15;
    const MAX_PAGE_SIZE = 60;
    const MAX_VISIBLE_PAGES = 5;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const horizontalScroll = window.KamyliHorizontalScroll;
    const state = { data: null, listId: "all", query: "", page: 1, pageSize: DEFAULT_PAGE_SIZE };
    const els = {
        tools: document.getElementById("jogosTools"),
        filters: document.getElementById("jogosFilters"),
        search: document.getElementById("jogosSearch"),
        grid: document.getElementById("jogosGrid"),
        pagination: document.getElementById("jogosPagination"),
        status: document.getElementById("jogosState")
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
        if (game.artwork?.url) {
            const image = document.createElement("img");
            image.src = game.artwork.url;
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
        title.textContent = game.name;
        const list = document.createElement("span");
        list.className = "jogo-card-status";
        list.textContent = game.listName;
        content.append(title, list);
        if (game.steamUrl) {
            const steamLink = document.createElement("a");
            steamLink.className = "jogo-card-steam";
            steamLink.href = game.steamUrl;
            steamLink.target = "_blank";
            steamLink.rel = "noopener noreferrer";
            steamLink.textContent = "Ver na Steam ↗";
            steamLink.setAttribute("aria-label", `Ver ${game.name} na Steam`);
            content.append(steamLink);
        }
        article.append(media, shade, content);
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
        els.grid.replaceChildren(...visibleGames.map(makeCard));
        renderPagination(games.length);
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
                loadEditorialPageSize()
            ]);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data?.version !== 1 || !Array.isArray(data.lists) || !Array.isArray(data.games)) throw new Error("Contrato de jogos inválido");
            state.data = data;
            state.pageSize = pageSize;
            els.tools.hidden = false;
            renderFilters();
            horizontalScroll?.enableClickDrag(els.filters);
            renderGames();
        } catch (error) {
            console.error("Falha ao carregar jogos:", error);
            els.status.hidden = false;
            els.status.textContent = "Não foi possível carregar a lista de jogos agora.";
        }
    }

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
