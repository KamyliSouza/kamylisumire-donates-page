(() => {
    "use strict";

    const grid = document.getElementById("artesGrid");
    const tools = document.getElementById("artesTools");
    const filters = document.getElementById("artesFilters");
    const search = document.getElementById("artesSearch");
    const state = document.getElementById("artesState");
    const dialog = document.getElementById("arteDialog");
    const dialogImage = document.getElementById("arteDialogImage");
    const dialogTitle = document.getElementById("arteDialogTitle");
    const dialogArtist = document.getElementById("arteDialogArtist");
    const dialogCredit = document.getElementById("arteDialogCredit");
    const dialogClose = document.getElementById("arteDialogClose");

    if (!grid || !state) return;

    let items = [];
    let activeCategory = "todas";

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
        dialogTitle.textContent = item.titulo;
        dialogArtist.textContent = `por ${item.artista}`;
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
        article.dataset.search = normalize(`${item.titulo} ${item.artista} ${item.categoria} ${(item.tags || []).join(" ")}`);

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
        const meta = document.createElement("span");
        meta.className = "arte-meta";
        meta.append(
            createText("span", "arte-category", item.categoria),
            createText("span", "", formatDate(item.data))
        );
        info.append(
            meta,
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

    function applyFilters() {
        const query = normalize(search?.value);
        let visible = 0;
        grid.querySelectorAll(".arte-item").forEach(node => {
            const categoryOk = activeCategory === "todas" || node.dataset.category === activeCategory;
            const searchOk = !query || node.dataset.search.includes(query);
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
    dialogClose?.addEventListener("click", () => dialog?.close());
    dialog?.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
    });

    load();
})();
