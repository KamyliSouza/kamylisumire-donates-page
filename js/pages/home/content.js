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

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
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

        content.setText(
            "heroSupportButton",
            data.botoes?.apoio
        );

        content.setText(
            "heroLiveButton",
            data.botoes?.live
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

        content.setText(
            "homeDonationButton",
            data.botao
        );
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
                )
            ]);

        const [
            heroResult,
            homeDonationResult,
            regrasResult,
            creditosResult
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
    }

    loadHomeContent();
})();
