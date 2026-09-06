(() => {
    const mount = document.getElementById("site-navbar");
    if (!mount) return;

    const path = window.location.pathname;
    const onDonations = path.includes("/doacoes");
    const sitePath = window.KAMYLI_SITE_PATH || (value => value);

    mount.innerHTML = `
        <nav class="site-nav" aria-label="Navegação principal">
            <div class="site-nav-inner">
                <a
                    class="site-brand"
                    href="${sitePath("/")}"
                    aria-label="Ir para a página inicial"
                >
                    <img
                        class="site-brand-logo"
                        src="${sitePath("/assets/favicon.png")}"
                        alt=""
                        width="40"
                        height="40"
                        draggable="false"
                    >
                </a>

                <span class="site-nav-divider" aria-hidden="true"></span>

                <div class="site-nav-links">
                    <a
                        class="site-nav-link ${!onDonations ? "is-active" : ""}"
                        href="${sitePath("/")}"
                    >
                        Início
                    </a>

                    <a class="site-nav-link" href="${sitePath("/#agenda")}">
                        Agenda
                    </a>

                    <a
                        class="site-nav-link"
                        href="https://trello.com/b/IfgV0jXS/jogos-das-lives"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Jogos
                    </a>

                    <a class="site-nav-link" href="${sitePath("/#regras")}">
                        Regras
                    </a>

                    <a class="site-nav-link" href="${sitePath("/#creditos")}">
                        Créditos
                    </a>

                    <a
                        class="site-nav-link site-nav-donate ${onDonations ? "is-active" : ""}"
                        href="${sitePath("/doacoes/")}"
                    >
                        Doações
                    </a>
                </div>
            </div>
        </nav>
    `;
})();
