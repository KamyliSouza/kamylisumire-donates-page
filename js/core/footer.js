(() => {
    const mount =
        document.getElementById("site-footer");

    if (!mount) return;

    const content = window.KamyliContent;
    const year = new Date().getFullYear();

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
        },
        privacidade: {
            texto: "Política de Privacidade",
            url: "/privacidade/"
        },
        usoIA: {
            texto: "Uso de IA",
            url: "/uso-de-ia/"
        }
    };

    const escapeHtml = window.KamyliSanitize?.escapeHtml;
    const safeHttpUrl = window.KamyliSanitize?.safeHttpUrl;

if (typeof escapeHtml !== "function" || typeof safeHttpUrl !== "function") {
    throw new Error("KamyliSanitize não foi carregado por completo.");
}

    function safeUrl(value, fallbackValue) {
        return safeHttpUrl(value) || safeHttpUrl(fallbackValue) || "#";
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
            ...(data?.creditos?.codigoFonte || data?.codigoFonte || {})
        };

        const privacidade = {
            ...fallback.privacidade,
            ...(data?.privacidade || {})
        };

        const usoIA = {
            ...fallback.usoIA,
            ...(data?.usoIA || {})
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

        const privacyUrl = safeUrl(
            privacidade.url,
            fallback.privacidade.url
        );

        const aiUseUrl = safeUrl(
            usoIA.url,
            fallback.usoIA.url
        );

        mount.innerHTML = `
            <div class="site-footer-content">
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
                        href="${escapeHtml(sourceUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${escapeHtml(codigoFonte.texto)}
                    </a>

                    <span
                        class="site-footer-separator"
                        aria-hidden="true"
                    >
                        ·
                    </span>

                    <a href="${escapeHtml(privacyUrl)}">
                        ${escapeHtml(privacidade.texto)}
                    </a>

                    <span
                        class="site-footer-separator"
                        aria-hidden="true"
                    >
                        ·
                    </span>

                    <a href="${escapeHtml(aiUseUrl)}">
                        ${escapeHtml(usoIA.texto)}
                    </a>
                </p>

                <p class="site-footer-credits">
                    <span>
                        ${escapeHtml(fundo.prefixo)}
                        <a
                            href="${escapeHtml(fundoUrl)}"
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
                            href="${escapeHtml(avatarUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ${escapeHtml(avatar.nome)}
                        </a>
                    </span>
                </p>
            </div>
        `;
    }

    render(fallback);

    function signalFooterReady() {
        window.KAMYLI_FOOTER_READY = true;

        window.dispatchEvent(
            new CustomEvent(
                "kamyli:loader-ready",
                {
                    detail: {
                        key: "footer"
                    }
                }
            )
        );
    }

    if (!content) {
        signalFooterReady();
        return;
    }

    content
        .getJSON("/data/content/footer.json")
        .then(render)
        .catch(error => {
            console.error(
                "Erro ao carregar footer.json:",
                error
            );
        })
        .finally(signalFooterReady);
})();
