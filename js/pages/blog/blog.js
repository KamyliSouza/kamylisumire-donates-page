(() => {
    "use strict";

    const content = window.KamyliContent;

    if (!content) {
        console.error("KamyliContent não foi carregado.");
        window.KAMYLI_PAGE_CONTENT_READY = true;
        window.dispatchEvent(new CustomEvent("kamyli:loader-ready"));
        return;
    }

    const elements = {
        eyebrow: document.getElementById("blogEyebrow"),
        title: document.getElementById("blogTitle"),
        description: document.getElementById("blogDescription"),
        tools: document.getElementById("blogTools"),
        search: document.getElementById("blogSearch"),
        searchFieldRoot: document.querySelector("[data-blog-search-field]"),
        searchField: document.getElementById("blogSearchField"),
        searchFieldValue: document.getElementById("blogSearchFieldValue"),
        searchFieldMenu: document.getElementById("blogSearchFieldMenu"),
        searchFieldOptions: [...document.querySelectorAll(".blog-search-field-option")],
        searchFieldControl: document.querySelector(".blog-search-field-control"),
        filters: document.getElementById("blogFilters"),
        list: document.getElementById("blogPostList")
    };

    let posts = [];
    let activeTag = "";
    let activeSearchField = "todos";
    const searchFieldMenuHome = elements.searchFieldMenu?.parentElement || null;

    const SEARCH_PREFIXES = Object.freeze({
        "titulo:": "titulo",
        "título:": "titulo",
        "resumo:": "resumo",
        "tag:": "tags",
        "tags:": "tags"
    });

    function normalize(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("pt-BR");
    }

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

    function getPostSearchValue(post, field) {
        switch (field) {
            case "titulo": return normalize(post.title);
            case "resumo": return normalize(post.summary);
            case "tags": return normalize(post.tags.join(" "));
            default:
                return normalize([post.title, post.summary, ...post.tags].join(" "));
        }
    }

    function createTag(text) {
        const tag = document.createElement("span");
        tag.className = "blog-post-tag";
        tag.textContent = text;
        return tag;
    }

    function createPostRow(post) {
        const link = document.createElement("a");
        link.className = "blog-post-row";
        link.href = content.getBlogPostUrl(post);

        const copy = document.createElement("div");

        const meta = document.createElement("p");
        meta.className = "blog-post-meta";
        meta.textContent = content.getBlogPostMeta(post);

        const title = document.createElement("h2");
        title.className = "blog-post-title";
        title.textContent = post.title;

        const summary = document.createElement("p");
        summary.className = "blog-post-summary";
        summary.textContent = post.summary;

        const tags = document.createElement("div");
        tags.className = "blog-post-tags";
        post.tags.forEach(tag => tags.appendChild(createTag(tag)));

        const arrow = document.createElement("span");
        arrow.className = "blog-post-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";

        copy.append(meta, title, summary, tags);
        link.append(copy, arrow);

        return link;
    }

    function createEmpty(text) {
        const empty = document.createElement("p");
        empty.className = "blog-empty";
        empty.textContent = text;
        return empty;
    }

    function renderList(data) {
        const { field, query } = parseSearch(elements.search?.value);

        const visible = posts.filter(post => {
            const tagMatch =
                !activeTag || post.tags.includes(activeTag);

            if (!tagMatch) return false;
            if (!query) return true;

            return getPostSearchValue(post, field).includes(query);
        });

        elements.list.replaceChildren();

        if (!visible.length) {
            elements.list.appendChild(
                createEmpty(data.page?.vazio || "Nenhuma publicação encontrada.")
            );
            return;
        }

        const fragment = document.createDocumentFragment();
        visible.forEach(post => fragment.appendChild(createPostRow(post)));
        elements.list.appendChild(fragment);
    }

    function renderFilters(data) {
        elements.filters.replaceChildren();

        const all = document.createElement("button");
        all.type = "button";
        all.className = "blog-filter is-active";
        all.dataset.buttonKey = "blogFilterAll";
        all.dataset.tag = "";

        const allIcon = document.createElement("span");
        allIcon.dataset.buttonIcon = "";
        allIcon.setAttribute("aria-hidden", "true");

        const allLabel = document.createElement("span");
        allLabel.dataset.buttonLabel = "";
        allLabel.textContent = data.page?.todos || "Todos";

        all.append(allIcon, allLabel);
        elements.filters.appendChild(all);

        const tags = [...new Set(posts.flatMap(post => post.tags))]
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

        tags.forEach(tag => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "blog-filter";
            button.textContent = tag;
            button.dataset.tag = tag;
            elements.filters.appendChild(button);
        });

        elements.filters.addEventListener("click", event => {
            const button = event.target.closest("button[data-tag]");
            if (!button) return;

            activeTag = button.dataset.tag || "";

            elements.filters.querySelectorAll(".blog-filter")
                .forEach(item => item.classList.toggle(
                    "is-active",
                    item === button
                ));

            renderList(data);
        });
    }

    function positionSearchFieldMenu() {
        if (!elements.searchFieldMenu || elements.searchFieldMenu.hidden || !elements.searchFieldControl) return;

        const rect = elements.searchFieldControl.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
        const margin = 12;
        const width = Math.min(Math.max(rect.width, 240), Math.max(160, viewportWidth - margin * 2));
        let left = rect.right - width;
        left = Math.max(margin, Math.min(left, viewportWidth - width - margin));

        let top = rect.bottom + 8;
        const menuHeight = elements.searchFieldMenu.offsetHeight;
        if (top + menuHeight > viewportHeight - margin && rect.top - menuHeight - 8 >= margin) {
            top = rect.top - menuHeight - 8;
        }

        elements.searchFieldMenu.style.left = `${Math.round(left)}px`;
        elements.searchFieldMenu.style.top = `${Math.round(top)}px`;
        elements.searchFieldMenu.style.width = `${Math.round(width)}px`;
    }

    function portalSearchFieldMenu() {
        if (!elements.searchFieldMenu || elements.searchFieldMenu.parentElement === document.body) return;
        document.body.appendChild(elements.searchFieldMenu);
        elements.searchFieldMenu.classList.add("is-portaled");
    }

    function restoreSearchFieldMenu() {
        if (!elements.searchFieldMenu) return;
        elements.searchFieldMenu.classList.remove("is-portaled");
        elements.searchFieldMenu.style.removeProperty("left");
        elements.searchFieldMenu.style.removeProperty("top");
        elements.searchFieldMenu.style.removeProperty("width");
        if (searchFieldMenuHome && elements.searchFieldMenu.parentElement !== searchFieldMenuHome) {
            searchFieldMenuHome.appendChild(elements.searchFieldMenu);
        }
    }

    function closeSearchFieldMenu({ restoreFocus = false } = {}) {
        if (!elements.searchField || !elements.searchFieldMenu) return;
        elements.searchFieldMenu.hidden = true;
        elements.searchField.setAttribute("aria-expanded", "false");
        elements.searchFieldRoot?.classList.remove("is-menu-open");
        restoreSearchFieldMenu();
        if (restoreFocus) elements.searchField.focus();
    }

    function focusSearchFieldOption(index) {
        if (!elements.searchFieldOptions.length) return;
        const normalizedIndex = (index + elements.searchFieldOptions.length) % elements.searchFieldOptions.length;
        elements.searchFieldOptions[normalizedIndex]?.focus();
    }

    function openSearchFieldMenu(focusIndex = null) {
        if (!elements.searchField || !elements.searchFieldMenu) return;
        portalSearchFieldMenu();
        elements.searchFieldMenu.hidden = false;
        elements.searchField.setAttribute("aria-expanded", "true");
        elements.searchFieldRoot?.classList.add("is-menu-open");
        positionSearchFieldMenu();

        const selectedIndex = elements.searchFieldOptions.findIndex(
            option => option.dataset.value === activeSearchField
        );
        const targetIndex = focusIndex ?? (selectedIndex >= 0 ? selectedIndex : 0);
        requestAnimationFrame(() => {
            positionSearchFieldMenu();
            focusSearchFieldOption(targetIndex);
        });
    }

    function selectSearchField(option, config, { restoreFocus = true } = {}) {
        const value = option?.dataset.value;
        if (!value) return;

        activeSearchField = value;
        if (elements.searchFieldValue) {
            elements.searchFieldValue.textContent = option.textContent.trim();
        }
        elements.searchFieldOptions.forEach(node => {
            node.setAttribute("aria-selected", String(node === option));
        });
        closeSearchFieldMenu({ restoreFocus });
        renderList(config);
    }

    function setupSearchFieldMenu(config) {
        if (!elements.searchField || !elements.searchFieldMenu || !elements.searchFieldOptions.length) return;

        elements.searchField.addEventListener("click", () => {
            if (elements.searchFieldMenu.hidden) openSearchFieldMenu();
            else closeSearchFieldMenu();
        });

        elements.searchField.addEventListener("keydown", event => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                openSearchFieldMenu();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                openSearchFieldMenu(elements.searchFieldOptions.length - 1);
            } else if (event.key === "Escape") {
                closeSearchFieldMenu();
            }
        });

        elements.searchFieldOptions.forEach((option, index) => {
            option.tabIndex = -1;
            option.addEventListener("click", () => selectSearchField(option, config));
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
                    focusSearchFieldOption(elements.searchFieldOptions.length - 1);
                } else if (event.key === "Escape") {
                    event.preventDefault();
                    closeSearchFieldMenu({ restoreFocus: true });
                } else if (event.key === "Tab") {
                    closeSearchFieldMenu();
                }
            });
        });

        document.addEventListener("pointerdown", event => {
            if (!elements.searchFieldRoot?.contains(event.target) && !elements.searchFieldMenu?.contains(event.target)) {
                closeSearchFieldMenu();
            }
        });
        window.addEventListener("resize", positionSearchFieldMenu, { passive: true });
        window.addEventListener("scroll", positionSearchFieldMenu, { passive: true, capture: true });
    }

    function render(config, index) {
        content.setText(elements.eyebrow, config.page?.eyebrow);
        content.setText(elements.title, config.page?.titulo);
        content.setText(elements.description, config.page?.descricao);

        if (elements.search) {
            elements.search.placeholder =
                config.page?.buscaPlaceholder ||
                "Buscar publicações...";
        }

        posts = content.getPublishedBlogPosts(index);

        if (!posts.length) {
            elements.tools.hidden = true;
            elements.list.replaceChildren(
                createEmpty(config.page?.vazio || "Nenhuma publicação disponível no momento.")
            );
            return;
        }

        elements.tools.hidden = false;
        renderFilters(config);
        renderList(config);

        elements.search.addEventListener("input", () => renderList(config));
        setupSearchFieldMenu(config);
    }

    function signalReady() {
        window.KAMYLI_PAGE_CONTENT_READY = true;
        window.dispatchEvent(
            new CustomEvent("kamyli:loader-ready", {
                detail: { key: "blog-content" }
            })
        );
    }

    Promise.all([
        content.getJSON("/data/blog/config.json"),
        Promise.resolve(window.KAMYLI_GLOBAL_UI_PROMISE)
    ])
        .then(([config, globalData]) => {
            render(
                config || {},
                globalData?.blogPosts || {}
            );
        })
        .catch(error => {
            console.error("Erro ao montar o Blog:", error);
            elements.tools.hidden = true;
            elements.list.replaceChildren(
                createEmpty("Não foi possível carregar as publicações agora.")
            );
        })
        .finally(signalReady);
})();
