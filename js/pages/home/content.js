(() => {
    const MAX_VISIBLE_ITEMS = 5;

    const content = window.KamyliContent;

    if (!content) {
        console.error("KamyliContent não foi carregado.");
        return;
    }

    const regrasElements = {
        eyebrow: document.getElementById("regrasEyebrow"),
        titulo: document.getElementById("regrasTitulo"),
        descricao: document.getElementById("regrasDescricao"),
        lista: document.getElementById("regrasLista")
    };

    const creditosElements = {
        eyebrow: document.getElementById("creditosEyebrow"),
        titulo: document.getElementById("creditosTitulo"),
        descricao: document.getElementById("creditosDescricao"),
        lista: document.getElementById("creditosLista")
    };

    const blogElements = {
        section: document.getElementById("homeBlogSection"),
        eyebrow: document.getElementById("homeBlogEyebrow"),
        title: document.getElementById("homeBlogTitle"),
        description: document.getElementById("homeBlogDescription"),
        list: document.getElementById("homeBlogList"),
        allLink: document.getElementById("homeBlogAllLink")
    };

    const escapeHtml = window.KamyliSanitize?.escapeHtml;

if (typeof escapeHtml !== "function") {
    throw new Error("KamyliSanitize.escapeHtml não foi carregado.");
}

    const homeLayout = document.getElementById("homeLayout");
    const buttonIcons = window.KamyliButtonIcons;
    const BUILTIN_HOME_CARDS = Object.freeze({
        hero: "inicio",
        lives: "lives",
        agenda: "agenda",
        blog: "homeBlogSection",
        regras: "regras",
        creditos: "creditos",
        apoio: "homeDonationCard"
    });
    const HOME_CARD_SIZES = new Set(["compacto", "grande"]);
    const HOME_CARD_VARIANTS = new Set(["padrao", "suave", "destaque"]);
    const HOME_CARD_ALIGNMENTS = new Set(["esquerda", "centro"]);
    const HOME_CARD_BUTTON_STYLES = new Set(["primario", "contorno"]);

    function internalOrHttpUrl(value) {
        const url = String(value || "").trim();
        if (!url) return "";
        if (url.startsWith("/") && !url.startsWith("//")) {
            return (window.KAMYLI_SITE_PATH || (path => path))(url);
        }
        try {
            const parsed = new URL(url);
            return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
        } catch {
            return "";
        }
    }

    function setHomeCardPresentation(node, card) {
        if (!node) return;
        const size = HOME_CARD_SIZES.has(card?.tamanho) ? card.tamanho : "grande";
        const variant = HOME_CARD_VARIANTS.has(card?.variante) ? card.variante : "padrao";
        const visible = card?.visivel !== false;

        node.classList.add("home-card");
        node.dataset.homeCardSize = size;
        node.dataset.homeCardVariant = variant;
        node.dataset.homeCardVisible = visible ? "true" : "false";
        node.hidden = !visible;
    }

    function appendConfiguredIcon(parent, iconName, className) {
        if (!parent || !buttonIcons?.create) return;
        const icon = buttonIcons.create(iconName, className);
        if (icon) parent.appendChild(icon);
    }

    function createCustomHomeCard(card) {
        const contentData = card?.conteudo && typeof card.conteudo === "object"
            ? card.conteudo
            : {};
        const cardId = String(card?.id || "card").replace(/[^a-z0-9-]/g, "-");
        const section = document.createElement("section");
        section.className = "glass-panel section-panel home-card home-custom-card";
        section.dataset.homeGenerated = "true";
        section.dataset.homeCardId = cardId;
        section.dataset.homeCardAlign = HOME_CARD_ALIGNMENTS.has(card?.alinhamento)
            ? card.alinhamento
            : "esquerda";
        setHomeCardPresentation(section, card);

        const iconName = buttonIcons?.allowed?.includes(contentData.icone)
            ? contentData.icone
            : "none";
        if (iconName !== "none") {
            const iconWrap = document.createElement("span");
            iconWrap.className = "home-custom-card__icon";
            iconWrap.setAttribute("aria-hidden", "true");
            appendConfiguredIcon(iconWrap, iconName, "home-custom-card__icon-svg");
            section.appendChild(iconWrap);
        }

        const eyebrow = String(contentData.eyebrow || "").trim();
        if (eyebrow) {
            const node = document.createElement("span");
            node.className = "eyebrow";
            node.textContent = eyebrow;
            section.appendChild(node);
        }

        const title = document.createElement("h2");
        title.id = `homeCustomTitle-${cardId}`;
        title.textContent = String(contentData.titulo || "Card").trim() || "Card";
        section.setAttribute("aria-labelledby", title.id);
        section.appendChild(title);

        const description = String(contentData.descricao || "").trim();
        if (description) {
            const node = document.createElement("p");
            node.className = "body-copy home-custom-card__description";
            node.textContent = description;
            section.appendChild(node);
        }

        const action = contentData.acao && typeof contentData.acao === "object"
            ? contentData.acao
            : null;
        const href = internalOrHttpUrl(action?.url);
        const label = String(action?.texto || "").trim();
        if (href && label) {
            const link = document.createElement("a");
            const buttonStyle = HOME_CARD_BUTTON_STYLES.has(action?.estilo)
                ? action.estilo
                : "contorno";
            link.className = `button ${buttonStyle === "primario" ? "button-primary" : "button-outline"} home-custom-card__action`;
            link.href = href;

            try {
                const parsed = new URL(href, window.location.href);
                if (parsed.origin !== window.location.origin) {
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                }
            } catch {
                // O contrato editorial já limita os protocolos aceitos.
            }

            const iconNameAction = buttonIcons?.allowed?.includes(action?.icone)
                ? action.icone
                : "none";
            if (iconNameAction !== "none") {
                const slot = document.createElement("span");
                slot.className = "button-config-icon";
                slot.setAttribute("aria-hidden", "true");
                appendConfiguredIcon(slot, iconNameAction, "home-custom-card__action-icon");
                link.appendChild(slot);
            }

            const text = document.createElement("span");
            text.textContent = label;
            link.appendChild(text);
            section.appendChild(link);
        }

        return section;
    }

    function applyHomeCards(data) {
        if (!homeLayout || !data || !Array.isArray(data.cards)) return;

        homeLayout.querySelectorAll('[data-home-generated="true"]').forEach(node => node.remove());

        const builtinNodes = Object.fromEntries(
            Object.entries(BUILTIN_HOME_CARDS).map(([type, id]) => [type, document.getElementById(id)])
        );

        data.cards.forEach(card => {
            const type = String(card?.tipo || "");
            if (Object.prototype.hasOwnProperty.call(builtinNodes, type)) {
                const node = builtinNodes[type];
                if (!node) return;
                setHomeCardPresentation(node, card);
                homeLayout.appendChild(node);
                return;
            }

            if (type === "personalizado") {
                const node = createCustomHomeCard(card);
                homeLayout.appendChild(node);
            }
        });

        homeLayout.dataset.homeLayoutReady = "true";
    }

    function applyScrollableState(list, itemCount) {
        if (!list) return;

        const shouldScroll =
            itemCount > MAX_VISIBLE_ITEMS;

        list.classList.toggle(
            "is-scrollable",
            shouldScroll
        );

        if (shouldScroll) {
            list.setAttribute("tabindex", "0");
            list.setAttribute(
                "aria-label",
                `${list.getAttribute("aria-label") || "Lista"}. Use a rolagem para ver todos os itens.`
            );
        } else {
            list.removeAttribute("tabindex");
        }
    }

    function renderHero(data) {
        content.setText("heroEyebrow", data.eyebrow);

        content.setText(
            "heroTitlePrefix",
            data.titulo?.prefixo
        );

        content.setText(
            "heroTitleHighlight",
            data.titulo?.destaque
        );

        content.setText(
            "heroTitleSuffix",
            data.titulo?.sufixo
        );

        content.setText(
            "heroDescription",
            data.descricao
        );

    }

    function renderHomeDonation(data) {
        content.setText(
            "homeDonationEyebrow",
            data.eyebrow
        );

        content.setText(
            "homeDonationTitle",
            data.titulo
        );

        content.setText(
            "homeDonationDescription",
            data.descricao
        );

    }

    function renderHomeBlog(config, index) {
        if (!blogElements.section || !blogElements.list) return;

        const posts = content.getPublishedBlogPosts(index);
        const maxItems = Math.min(
            5,
            Math.max(1, Number(config.home?.maxItems) || 3)
        );

        content.setText(blogElements.eyebrow, config.home?.eyebrow);
        content.setText(blogElements.title, config.home?.titulo);
        content.setText(blogElements.description, config.home?.descricao);

        if (blogElements.allLink) {
            blogElements.allLink.href =
                (window.KAMYLI_SITE_PATH || (value => value))("/blog/");
        }

        if (!posts.length) {
            const empty = document.createElement("p");
            empty.className = "blog-empty";
            empty.textContent = config.page?.vazio ||
                "Nenhuma publicação disponível no momento.";
            blogElements.list.replaceChildren(empty);
            blogElements.section.hidden = false;
            return;
        }

        const fragment = document.createDocumentFragment();

        posts.slice(0, maxItems).forEach(post => {
            const link = document.createElement("a");
            link.className = "blog-post-row";
            link.href = content.getBlogPostUrl(post);

            const copy = document.createElement("div");

            const meta = document.createElement("p");
            meta.className = "blog-post-meta";
            meta.textContent = content.getBlogPostMeta(post);

            const title = document.createElement("h3");
            title.className = "blog-post-title";
            title.textContent = post.title;

            const summary = document.createElement("p");
            summary.className = "blog-post-summary";
            summary.textContent = post.summary;

            const tags = document.createElement("div");
            tags.className = "blog-post-tags";
            post.tags.slice(0, 3).forEach(value => {
                const tag = document.createElement("span");
                tag.className = "blog-post-tag";
                tag.textContent = value;
                tags.appendChild(tag);
            });

            const arrow = document.createElement("span");
            arrow.className = "blog-post-arrow";
            arrow.setAttribute("aria-hidden", "true");
            arrow.textContent = "→";

            copy.append(meta, title, summary, tags);
            link.append(copy, arrow);
            fragment.appendChild(link);
        });

        blogElements.list.replaceChildren(fragment);
        blogElements.section.hidden = false;
    }

    function renderSectionHeader(elements, data) {
        content.setText(
            elements.eyebrow,
            data.eyebrow
        );

        content.setText(
            elements.titulo,
            data.titulo
        );

        if (elements.descricao) {
            const descricao =
                String(data.descricao || "").trim();

            elements.descricao.textContent =
                descricao;

            elements.descricao.hidden =
                !descricao;
        }
    }

    function renderRegras(data) {
        const itens = Array.isArray(data.itens)
            ? data.itens
            : [];

        renderSectionHeader(
            regrasElements,
            data
        );

        if (!regrasElements.lista) return;

        regrasElements.lista.innerHTML = "";

        if (!itens.length) {
            regrasElements.lista.innerHTML = `
                <p class="editable-empty">
                    Nenhuma regra cadastrada.
                </p>
            `;

            applyScrollableState(
                regrasElements.lista,
                0
            );

            return;
        }

        const fragment =
            document.createDocumentFragment();

        itens.forEach((item, index) => {
            const card =
                document.createElement("div");

            card.className =
                "editable-list-item rule-item";

            const titulo =
                item.titulo ||
                `Regra ${index + 1}`;

            const descricao =
                item.descricao || "";

            card.innerHTML = `
                <span
                    class="editable-item-index"
                    aria-hidden="true"
                >
                    ${index + 1}
                </span>

                <span class="editable-item-copy">
                    <strong>${escapeHtml(titulo)}</strong>
                    ${
                        descricao
                            ? `<span>${escapeHtml(descricao)}</span>`
                            : ""
                    }
                </span>
            `;

            fragment.appendChild(card);
        });

        regrasElements.lista.appendChild(
            fragment
        );

        applyScrollableState(
            regrasElements.lista,
            itens.length
        );
    }

    function renderCreditos(data) {
        const itens = Array.isArray(data.itens)
            ? data.itens
            : [];

        renderSectionHeader(
            creditosElements,
            data
        );

        if (!creditosElements.lista) return;

        creditosElements.lista.innerHTML = "";

        if (!itens.length) {
            creditosElements.lista.innerHTML = `
                <p class="editable-empty">
                    Nenhum crédito cadastrado.
                </p>
            `;

            applyScrollableState(
                creditosElements.lista,
                0
            );

            return;
        }

        const fragment =
            document.createDocumentFragment();

        itens.forEach(item => {
            const nome =
                item.nome ||
                item.titulo ||
                "Crédito";

            const descricao =
                item.descricao || "";

            const url =
                typeof item.url === "string"
                    ? item.url.trim()
                    : "";

            const element = url
                ? document.createElement("a")
                : document.createElement("div");

            element.className =
                "editable-list-item credit-item";

            if (url) {
                element.href = url;
                element.target = "_blank";
                element.rel =
                    "noopener noreferrer";
            }

            element.innerHTML = `
                <span class="editable-item-copy">
                    <strong>${escapeHtml(nome)}</strong>
                    ${
                        descricao
                            ? `<span>${escapeHtml(descricao)}</span>`
                            : ""
                    }
                </span>

                ${
                    url
                        ? `
                            <svg
                                class="editable-item-arrow"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path d="M9 5l7 7-7 7"></path>
                            </svg>
                        `
                        : ""
                }
            `;

            fragment.appendChild(element);
        });

        creditosElements.lista.appendChild(
            fragment
        );

        applyScrollableState(
            creditosElements.lista,
            itens.length
        );
    }

    function renderLoadError(
        elements,
        label
    ) {
        if (!elements.lista) return;

        elements.lista.innerHTML = `
            <p class="editable-empty">
                Não foi possível carregar ${escapeHtml(label)} agora.
            </p>
        `;

        applyScrollableState(
            elements.lista,
            0
        );
    }

    async function loadHomeContent() {
        const results =
            await Promise.allSettled([
                content.getJSON(
                    "/data/content/hero.json"
                ),
                content.getJSON(
                    "/data/content/home-doacoes.json"
                ),
                content.getJSON(
                    "/data/content/regras.json"
                ),
                content.getJSON(
                    "/data/content/creditos.json"
                ),
                content.getJSON(
                    "/data/blog/config.json"
                ),
                content.getJSON(
                    "/data/content/home-cards.json"
                ),
                Promise.resolve(window.KAMYLI_GLOBAL_UI_PROMISE)
            ]);

        const [
            heroResult,
            homeDonationResult,
            regrasResult,
            creditosResult,
            blogConfigResult,
            homeCardsResult,
            globalResult
        ] = results;

        if (heroResult.status === "fulfilled") {
            renderHero(heroResult.value);
        } else {
            console.error(
                "Erro ao carregar Hero:",
                heroResult.reason
            );
        }

        if (
            homeDonationResult.status ===
            "fulfilled"
        ) {
            renderHomeDonation(
                homeDonationResult.value
            );
        } else {
            console.error(
                "Erro ao carregar CTA de doações:",
                homeDonationResult.reason
            );
        }

        if (
            regrasResult.status ===
            "fulfilled"
        ) {
            renderRegras(regrasResult.value);
        } else {
            console.error(
                "Erro ao carregar regras:",
                regrasResult.reason
            );

            renderLoadError(
                regrasElements,
                "as regras"
            );
        }

        if (
            creditosResult.status ===
            "fulfilled"
        ) {
            renderCreditos(
                creditosResult.value
            );
        } else {
            console.error(
                "Erro ao carregar créditos:",
                creditosResult.reason
            );

            renderLoadError(
                creditosElements,
                "os créditos"
            );
        }

        if (
            blogConfigResult.status === "fulfilled" &&
            globalResult.status === "fulfilled"
        ) {
            renderHomeBlog(
                blogConfigResult.value || {},
                globalResult.value?.blogPosts || {}
            );
        } else if (blogElements.section) {
            blogElements.section.hidden = false;
        }

        if (homeCardsResult.status === "fulfilled") {
            applyHomeCards(homeCardsResult.value);
        } else {
            console.error(
                "Erro ao carregar layout de cards da Home:",
                homeCardsResult.reason
            );
        }
    }

    function signalContentReady() {
        window.KAMYLI_PAGE_CONTENT_READY = true;

        window.dispatchEvent(
            new CustomEvent(
                "kamyli:loader-ready",
                {
                    detail: {
                        key: "page-content"
                    }
                }
            )
        );
    }

    loadHomeContent()
        .catch(error => {
            console.error(
                "Erro inesperado ao montar conteúdo da Home:",
                error
            );
        })
        .finally(signalContentReady);
})();
