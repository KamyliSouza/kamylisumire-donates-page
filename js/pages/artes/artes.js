(() => {
    "use strict";

    const grid = document.getElementById("artesGrid");
    const tools = document.getElementById("artesTools");
    const filters = document.getElementById("artesFilters");
    const search = document.getElementById("artesSearch");
    const searchFieldRoot = document.querySelector("[data-artes-search-field]");
    const searchField = document.getElementById("artesSearchField");
    const searchFieldValue = document.getElementById("artesSearchFieldValue");
    const searchFieldMenu = document.getElementById("artesSearchFieldMenu");
    const searchFieldOptions = [...document.querySelectorAll(".artes-search-field-option")];
    const searchFieldControl = searchField?.closest(".artes-search-field-control") || null;
    const searchFieldMenuHome = searchFieldMenu?.parentElement || null;
    const state = document.getElementById("artesState");
    const dialog = document.getElementById("arteDialog");
    const dialogImage = document.getElementById("arteDialogImage");
    const dialogTitle = document.getElementById("arteDialogTitle");
    const dialogArtist = document.getElementById("arteDialogArtist");
    const dialogMeta = document.getElementById("arteDialogMeta");
    const dialogCredit = document.getElementById("arteDialogCredit");
    const dialogClose = document.getElementById("arteDialogClose");

    if (!grid || !state) return;

    let items = [];
    let activeCategory = "todas";
    let activeSearchField = "todos";

    function ready(detail = {}) {
        window.KAMYLI_PAGE_CONTENT_READY = true;
        window.dispatchEvent(new CustomEvent("kamyli:loader-ready", { detail }));
    }

    function normalize(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    const SEARCH_PREFIXES = Object.freeze({
        "artista:": "artista",
        "artist:": "artista",
        "titulo:": "titulo",
        "título:": "titulo",
        "categoria:": "categoria",
        "tag:": "tags",
        "tags:": "tags"
    });

    function parseSearch(rawValue) {
        const raw = String(rawValue || "").trim();
        const normalized = normalize(raw);

        for (const [prefix, field] of Object.entries(SEARCH_PREFIXES)) {
            const normalizedPrefix = normalize(prefix);
            if (normalized.startsWith(normalizedPrefix)) {
                return {
                    field,
                    query: normalized.slice(normalizedPrefix.length).trim()
                };
            }
        }

        return {
            field: activeSearchField,
            query: normalized
        };
    }

    function validHttpsUrl(value) {
        try {
            return new URL(String(value || "")).protocol === "https:";
        } catch {
            return false;
        }
    }

    function formatDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
        if (!match) return "";
        const [, year, month, day] = match;
        return `${day}/${month}/${year}`;
    }

    function createText(tag, className, value) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = value;
        return node;
    }

    function getPreviewUrl(item) {
        return validHttpsUrl(item.preview) ? item.preview : item.imagem;
    }

    function renderDialogMeta(item) {
        if (!dialogMeta) return;
        dialogMeta.replaceChildren();

        const details = [
            ["Categoria", item.categoria],
            ["Data", formatDate(item.data)],
            ["Tags", Array.isArray(item.tags) ? item.tags.filter(Boolean).join(", ") : ""]
        ];

        for (const [label, value] of details) {
            if (!value) continue;
            const detail = document.createElement("span");
            detail.className = "arte-dialog-detail";
            detail.append(
                createText("span", "arte-dialog-detail-label", `${label}:`),
                createText("span", "", value)
            );
            dialogMeta.appendChild(detail);
        }

        dialogMeta.hidden = dialogMeta.childElementCount === 0;
    }

    function openDialog(item) {
        if (!dialog || !dialogImage) return;

        const previewUrl = getPreviewUrl(item);
        const fullUrl = item.imagem;
        const media = dialog.querySelector(".arte-dialog-media");
        const fullLoader = dialog.querySelector(".arte-dialog-loader");

        dialogImage.src = previewUrl;
        dialogImage.alt = item.alt;
        dialogImage.classList.remove("is-full");
        media?.classList.add("is-loading-full");
        fullLoader?.removeAttribute("hidden");
        if (dialogTitle) dialogTitle.textContent = item.titulo;
        if (dialogArtist) dialogArtist.textContent = `por ${item.artista}`;
        renderDialogMeta(item);
        if (dialogCredit) {
            if (validHttpsUrl(item.creditoUrl)) {
                dialogCredit.hidden = false;
                dialogCredit.href = item.creditoUrl;
                dialogCredit.textContent = "Ver crédito original";
            } else {
                dialogCredit.hidden = true;
                dialogCredit.removeAttribute("href");
            }
        }
        dialog.showModal();

        if (previewUrl === fullUrl) {
            media?.classList.remove("is-loading-full");
            fullLoader?.setAttribute("hidden", "");
            dialogImage.classList.add("is-full");
            return;
        }

        const fullImage = new Image();
        fullImage.decoding = "async";
        fullImage.addEventListener("load", () => {
            dialogImage.src = fullUrl;
            dialogImage.classList.add("is-full");
            media?.classList.remove("is-loading-full");
            fullLoader?.setAttribute("hidden", "");
        }, { once: true });
        fullImage.addEventListener("error", () => {
            media?.classList.remove("is-loading-full");
            fullLoader?.setAttribute("hidden", "");
        }, { once: true });
        fullImage.src = fullUrl;
    }

    function createCard(item) {
        const article = document.createElement("article");
        article.className = "arte-item";
        article.dataset.category = normalize(item.categoria);
        article.dataset.searchTitle = normalize(item.titulo);
        article.dataset.searchArtist = normalize(item.artista);
        article.dataset.searchCategory = normalize(item.categoria);
        article.dataset.searchTags = normalize((item.tags || []).join(" "));

        const button = document.createElement("button");
        button.className = "arte-card";
        button.type = "button";
        button.setAttribute("aria-label", `Abrir arte ${item.titulo}, por ${item.artista}`);

        const media = document.createElement("span");
        media.className = "arte-media";

        const loader = document.createElement("span");
        loader.className = "arte-image-loader";
        loader.setAttribute("aria-hidden", "true");
        const loaderLogo = document.createElement("span");
        loaderLogo.className = "site-loader-logo";
        loader.appendChild(loaderLogo);

        const image = document.createElement("img");
        image.src = getPreviewUrl(item);
        image.alt = item.alt;
        image.loading = "lazy";
        image.decoding = "async";
        if (Number.isInteger(item.largura) && item.largura > 0) image.width = item.largura;
        if (Number.isInteger(item.altura) && item.altura > 0) image.height = item.altura;
        image.addEventListener("load", () => media.classList.add("is-loaded"), { once: true });
        image.addEventListener("error", () => media.classList.add("is-error"), { once: true });

        const error = createText("span", "arte-error", "Imagem indisponível");
        const shade = document.createElement("span");
        shade.className = "arte-shade";
        shade.setAttribute("aria-hidden", "true");

        const info = document.createElement("span");
        info.className = "arte-info";
        info.append(
            createText("strong", "arte-title", item.titulo),
            createText("span", "arte-artist", `por ${item.artista}`)
        );

        media.append(loader, image, error, shade, info);
        button.appendChild(media);
        button.addEventListener("click", () => openDialog(item));
        article.appendChild(button);
        return article;
    }

    function renderFilters() {
        if (!filters) return;
        filters.textContent = "";
        const categories = [...new Set(items.map(item => item.categoria).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "pt-BR"));
        const values = ["Todas", ...categories];
        for (const value of values) {
            const button = createText("button", "artes-filter", value);
            button.type = "button";
            button.dataset.category = normalize(value);
            if (value === "Todas") button.classList.add("is-active");
            button.addEventListener("click", () => {
                activeCategory = normalize(value);
                filters.querySelectorAll(".artes-filter").forEach(node => {
                    node.classList.toggle("is-active", node === button);
                });
                applyFilters();
            });
            filters.appendChild(button);
        }
    }

    function getSearchValue(node, field) {
        switch (field) {
            case "artista": return node.dataset.searchArtist || "";
            case "titulo": return node.dataset.searchTitle || "";
            case "categoria": return node.dataset.searchCategory || "";
            case "tags": return node.dataset.searchTags || "";
            default:
                return [
                    node.dataset.searchTitle,
                    node.dataset.searchArtist,
                    node.dataset.searchCategory,
                    node.dataset.searchTags
                ].filter(Boolean).join(" ");
        }
    }

    function applyFilters() {
        const { field, query } = parseSearch(search?.value);
        let visible = 0;
        grid.querySelectorAll(".arte-item").forEach(node => {
            const categoryOk = activeCategory === "todas" || node.dataset.category === activeCategory;
            const searchOk = !query || getSearchValue(node, field).includes(query);
            node.hidden = !(categoryOk && searchOk);
            if (!node.hidden) visible += 1;
        });
        if (items.length && visible === 0) {
            state.hidden = false;
            state.textContent = "Nenhuma arte encontrada para este filtro.";
        } else if (items.length) {
            state.hidden = true;
        }
    }

    function positionSearchFieldMenu() {
        if (!searchFieldMenu || searchFieldMenu.hidden || !searchFieldControl) return;

        const rect = searchFieldControl.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
        const margin = 12;
        const width = Math.min(Math.max(rect.width, 240), Math.max(160, viewportWidth - margin * 2));
        let left = rect.right - width;
        left = Math.max(margin, Math.min(left, viewportWidth - width - margin));

        let top = rect.bottom + 8;
        const menuHeight = searchFieldMenu.offsetHeight;
        if (top + menuHeight > viewportHeight - margin && rect.top - menuHeight - 8 >= margin) {
            top = rect.top - menuHeight - 8;
        }

        searchFieldMenu.style.left = `${Math.round(left)}px`;
        searchFieldMenu.style.top = `${Math.round(top)}px`;
        searchFieldMenu.style.width = `${Math.round(width)}px`;
    }

    function portalSearchFieldMenu() {
        if (!searchFieldMenu || searchFieldMenu.parentElement === document.body) return;
        document.body.appendChild(searchFieldMenu);
        searchFieldMenu.classList.add("is-portaled");
    }

    function restoreSearchFieldMenu() {
        if (!searchFieldMenu) return;
        searchFieldMenu.classList.remove("is-portaled");
        searchFieldMenu.style.removeProperty("left");
        searchFieldMenu.style.removeProperty("top");
        searchFieldMenu.style.removeProperty("width");
        if (searchFieldMenuHome && searchFieldMenu.parentElement !== searchFieldMenuHome) {
            searchFieldMenuHome.appendChild(searchFieldMenu);
        }
    }

    function closeSearchFieldMenu({ restoreFocus = false } = {}) {
        if (!searchField || !searchFieldMenu) return;
        searchFieldMenu.hidden = true;
        searchField.setAttribute("aria-expanded", "false");
        searchFieldRoot?.classList.remove("is-menu-open");
        restoreSearchFieldMenu();
        if (restoreFocus) searchField.focus();
    }

    function focusSearchFieldOption(index) {
        if (!searchFieldOptions.length) return;
        const normalizedIndex = (index + searchFieldOptions.length) % searchFieldOptions.length;
        searchFieldOptions[normalizedIndex]?.focus();
    }

    function openSearchFieldMenu(focusIndex = null) {
        if (!searchField || !searchFieldMenu) return;
        portalSearchFieldMenu();
        searchFieldMenu.hidden = false;
        searchField.setAttribute("aria-expanded", "true");
        searchFieldRoot?.classList.add("is-menu-open");
        positionSearchFieldMenu();

        const selectedIndex = searchFieldOptions.findIndex(option => option.dataset.value === activeSearchField);
        const targetIndex = focusIndex ?? (selectedIndex >= 0 ? selectedIndex : 0);
        requestAnimationFrame(() => {
            positionSearchFieldMenu();
            focusSearchFieldOption(targetIndex);
        });
    }

    function selectSearchField(option, { restoreFocus = true } = {}) {
        const value = option?.dataset.value;
        if (!value) return;

        activeSearchField = value;
        if (searchFieldValue) searchFieldValue.textContent = option.textContent.trim();
        searchFieldOptions.forEach(node => {
            node.setAttribute("aria-selected", String(node === option));
        });
        closeSearchFieldMenu({ restoreFocus });
        applyFilters();
    }

    function setupSearchFieldMenu() {
        if (!searchField || !searchFieldMenu || !searchFieldOptions.length) return;

        searchField.addEventListener("click", () => {
            if (searchFieldMenu.hidden) openSearchFieldMenu();
            else closeSearchFieldMenu();
        });

        searchField.addEventListener("keydown", event => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                openSearchFieldMenu();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                openSearchFieldMenu(searchFieldOptions.length - 1);
            } else if (event.key === "Escape") {
                closeSearchFieldMenu();
            }
        });

        searchFieldOptions.forEach((option, index) => {
            option.tabIndex = -1;
            option.addEventListener("click", () => selectSearchField(option));
            option.addEventListener("keydown", event => {
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusSearchFieldOption(index + 1);
                } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusSearchFieldOption(index - 1);
                } else if (event.key === "Home") {
                    event.preventDefault();
                    focusSearchFieldOption(0);
                } else if (event.key === "End") {
                    event.preventDefault();
                    focusSearchFieldOption(searchFieldOptions.length - 1);
                } else if (event.key === "Escape") {
                    event.preventDefault();
                    closeSearchFieldMenu({ restoreFocus: true });
                } else if (event.key === "Tab") {
                    closeSearchFieldMenu();
                }
            });
        });

        document.addEventListener("pointerdown", event => {
            if (!searchFieldRoot?.contains(event.target) && !searchFieldMenu?.contains(event.target)) {
                closeSearchFieldMenu();
            }
        });
        window.addEventListener("resize", positionSearchFieldMenu, { passive: true });
        window.addEventListener("scroll", positionSearchFieldMenu, { passive: true, capture: true });
    }

    async function load() {
        try {
            const response = await fetch("../data/content/artes.json", { cache: "no-cache" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            const page = data?.page || {};
            const title = document.getElementById("artesTitle");
            const eyebrow = document.getElementById("artesEyebrow");
            const description = document.getElementById("artesDescription");
            if (title && page.titulo) title.textContent = page.titulo;
            if (eyebrow && page.eyebrow) eyebrow.textContent = page.eyebrow;
            if (description && page.descricao) description.textContent = page.descricao;
            if (search && page.buscaPlaceholder) search.placeholder = page.buscaPlaceholder;

            items = Array.isArray(data?.itens)
                ? data.itens.filter(item =>
                    item &&
                    validHttpsUrl(item.imagem) &&
                    (!item.preview || validHttpsUrl(item.preview))
                )
                : [];

            grid.textContent = "";
            items.forEach(item => grid.appendChild(createCard(item)));

            if (!items.length) {
                state.hidden = false;
                state.textContent = page.vazio || "Nenhuma arte disponível no momento.";
                if (tools) tools.hidden = true;
            } else {
                state.hidden = true;
                if (tools) tools.hidden = false;
                renderFilters();
            }
            ready({ page: "artes", count: items.length });
        } catch (error) {
            state.hidden = false;
            state.textContent = "Não foi possível carregar a galeria agora. Tente novamente mais tarde.";
            if (tools) tools.hidden = true;
            ready({ page: "artes", error: String(error?.message || error) });
        }
    }

    search?.addEventListener("input", applyFilters);
    setupSearchFieldMenu();
    dialogClose?.addEventListener("click", () => dialog?.close());
    dialog?.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
    });

    load();
})();
