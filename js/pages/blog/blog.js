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
        searchField: document.getElementById("blogSearchField"),
        filters: document.getElementById("blogFilters"),
        list: document.getElementById("blogPostList")
    };

    let posts = [];
    let activeTag = "";

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
            field: elements.searchField?.value || "todos",
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
        elements.searchField?.addEventListener("change", () => renderList(config));
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
