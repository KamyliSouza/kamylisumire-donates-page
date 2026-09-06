(() => {
    const mount =
        document.getElementById("site-footer");

    if (!mount) return;

    const content = window.KamyliContent;
    const year = new Date().getFullYear();

    /*
     * Fallback obrigatório:
     * os créditos de fundo e avatar continuam visíveis mesmo
     * quando footer.json não puder ser carregado.
     */
    const fallback = {
        creditos: {
            fundo: {
                prefixo: "Arte do fundo por",
                nome: "@h0wl_oficial",
                url: "https://www.instagram.com/h0wl_oficial/"
            },
            avatar: {
                prefixo: "Avatar por",
                nome: "@maililac",
                url: "https://bsky.app/profile/maililac.bsky.social"
            }
        },
        copyright: {
            nome: "Kamyli Sumire",
            texto: "Todos os direitos reservados."
        },
        codigoFonte: {
            texto: "Ver código fonte",
            url: "https://github.com/KamyliSouza/kamylisumire-donates-page"
        }
    };

    function safeUrl(value, fallbackValue) {
        try {
            const parsed =
                new URL(value, window.location.href);

            if (
                parsed.protocol === "https:" ||
                parsed.protocol === "http:"
            ) {
                return parsed.href;
            }
        } catch {
            // Usa fallback.
        }

        return fallbackValue;
    }

    function render(data) {
        const fundo = {
            ...fallback.creditos.fundo,
            ...(data?.creditos?.fundo || {})
        };

        const avatar = {
            ...fallback.creditos.avatar,
            ...(data?.creditos?.avatar || {})
        };

        const copyright = {
            ...fallback.copyright,
            ...(data?.copyright || {})
        };

        const codigoFonte = {
            ...fallback.codigoFonte,
            ...(data?.codigoFonte || {})
        };

        const fundoUrl = safeUrl(
            fundo.url,
            fallback.creditos.fundo.url
        );

        const avatarUrl = safeUrl(
            avatar.url,
            fallback.creditos.avatar.url
        );

        const sourceUrl = safeUrl(
            codigoFonte.url,
            fallback.codigoFonte.url
        );

        mount.innerHTML = `
            <div class="site-footer-content">
                <p class="site-footer-credits">
                    <span>
                        ${escapeHtml(fundo.prefixo)}
                        <a
                            href="${escapeAttribute(fundoUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${escapeHtml(fundo.nome)}
                        </a>
                    </span>

                    <span
                        class="site-footer-separator"
                        aria-hidden="true"
                    >
                        ·
                    </span>

                    <span>
                        ${escapeHtml(avatar.prefixo)}
                        <a
                            href="${escapeAttribute(avatarUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${escapeHtml(avatar.nome)}
                        </a>
                    </span>
                </p>

                <p class="site-footer-meta">
                    <span>
                        © ${year}
                        ${escapeHtml(copyright.nome)}.
                        ${escapeHtml(copyright.texto)}
                    </span>

                    <span
                        class="site-footer-separator"
                        aria-hidden="true"
                    >
                        ·
                    </span>

                    <a
                        href="${escapeAttribute(sourceUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${escapeHtml(codigoFonte.texto)}
                    </a>
                </p>
            </div>
        `;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

    /*
     * Renderiza primeiro o fallback para que os créditos
     * apareçam imediatamente.
     */
    render(fallback);

    if (!content) return;

    content
        .getJSON("/data/content/footer.json")
        .then(render)
        .catch(error => {
            console.error(
                "Erro ao carregar footer.json:",
                error
            );
        });
})();
