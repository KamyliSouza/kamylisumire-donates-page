(() => {
    "use strict";

    const DATA_URL = "/data/content/jogos.json";
    const state = { data: null, listId: "all", query: "" };
    const els = {
        tools: document.getElementById("jogosTools"),
        filters: document.getElementById("jogosFilters"),
        search: document.getElementById("jogosSearch"),
        grid: document.getElementById("jogosGrid"),
        status: document.getElementById("jogosState")
    };

    const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

    function makeFilter(id, label, count) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "jogos-filter";
        button.dataset.listId = id;
        button.setAttribute("aria-pressed", String(state.listId === id));
        button.textContent = `${label} (${count})`;
        button.addEventListener("click", () => {
            state.listId = id;
            renderFilters();
            renderGames();
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
            steamLink.textContent = "Ver na Steam";
            steamLink.setAttribute("aria-label", `Ver ${game.name} na Steam`);
            content.append(steamLink);
        }
        article.append(media, shade, content);
        return article;
    }

    function renderGames() {
        const query = normalize(state.query.trim());
        const games = (state.data?.games || []).filter(game => {
            if (state.listId !== "all" && game.listId !== state.listId) return false;
            return !query || normalize(game.name).includes(query) || normalize(game.listName).includes(query);
        });
        els.grid.replaceChildren(...games.map(makeCard));
        els.status.hidden = games.length > 0;
        if (!games.length) {
            els.status.textContent = state.data?.games?.length ? "Nenhum jogo encontrado com esses filtros." : "A lista de jogos ainda não foi sincronizada.";
        }
    }

    async function init() {
        try {
            const response = await fetch(DATA_URL, { cache: "no-cache" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data?.version !== 1 || !Array.isArray(data.lists) || !Array.isArray(data.games)) throw new Error("Contrato de jogos inválido");
            state.data = data;
            els.tools.hidden = false;
            renderFilters();
            renderGames();
        } catch (error) {
            console.error("Falha ao carregar jogos:", error);
            els.status.hidden = false;
            els.status.textContent = "Não foi possível carregar a lista de jogos agora.";
        }
    }

    els.search?.addEventListener("input", event => {
        state.query = event.currentTarget.value;
        renderGames();
    });

    init();
})();
