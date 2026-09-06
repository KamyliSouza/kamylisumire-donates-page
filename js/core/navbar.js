(() => {
    const mount = document.getElementById("site-navbar");
    if (!mount) return;

    const path = window.location.pathname;
    const onDonations = path.includes("/doacoes");
    const sitePath = window.KAMYLI_SITE_PATH || (value => value);

    mount.innerHTML = `
        <nav class="site-nav" aria-label="Navegação principal">
            <div class="site-nav-inner">
                <a class="site-brand" href="${sitePath("/")}" aria-label="Ir para a página inicial">
                    <img
                        class="site-brand-logo"
                        src="${sitePath("/assets/favicon.png")}"
                        alt=""
                        width="42"
                        height="42"
                        draggable="false"
                    >
                </a>

                <div class="site-nav-links" id="siteNavLinks">
                    <a
                        class="site-nav-link ${!onDonations ? "is-active" : ""}"
                        href="${sitePath("/")}"
                    >
                        Início
                    </a>

                    <a
                        class="site-nav-link"
                        href="${sitePath("/#agenda")}"
                    >
                        Agenda
                    </a>

                    <div class="site-nav-dropdown">
                        <button
                            class="site-nav-link site-nav-dropdown-toggle"
                            type="button"
                            aria-expanded="false"
                            aria-haspopup="true"
                        >
                            Links úteis
                            <span class="site-nav-caret" aria-hidden="true">⌄</span>
                        </button>

                        <div class="site-nav-dropdown-menu">
                            <a
                                class="site-nav-dropdown-link"
                                href="https://trello.com/b/IfgV0jXS/jogos-das-lives"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span aria-hidden="true">🎮</span>
                                <span>
                                    <strong>Jogos das lives</strong>
                                    <small>Lista e planejamento</small>
                                </span>
                            </a>

                            <a
                                class="site-nav-dropdown-link"
                                href="${sitePath("/#regras")}"
                            >
                                <span aria-hidden="true">📋</span>
                                <span>
                                    <strong>Regras</strong>
                                    <small>Comunidade e chat</small>
                                </span>
                            </a>

                            <a
                                class="site-nav-dropdown-link"
                                href="${sitePath("/#creditos")}"
                            >
                                <span aria-hidden="true">🎨</span>
                                <span>
                                    <strong>Créditos</strong>
                                    <small>Artistas e assets</small>
                                </span>
                            </a>
                        </div>
                    </div>

                    <a
                        class="site-nav-link site-nav-donate ${onDonations ? "is-active" : ""}"
                        href="${sitePath("/doacoes/")}"
                    >
                        Doações 💜
                    </a>
                </div>

                <button
                    class="nav-toggle"
                    type="button"
                    aria-label="Abrir menu"
                    aria-expanded="false"
                    aria-controls="siteNavLinks"
                >
                    ☰
                </button>
            </div>
        </nav>
    `;

    const toggle = mount.querySelector(".nav-toggle");
    const links = mount.querySelector(".site-nav-links");
    const dropdown = mount.querySelector(".site-nav-dropdown");
    const dropdownToggle = mount.querySelector(".site-nav-dropdown-toggle");

    const closeDropdown = () => {
        dropdown?.classList.remove("is-open");
        dropdownToggle?.setAttribute("aria-expanded", "false");
    };

    const closeMobileMenu = () => {
        links?.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");

        if (toggle) {
            toggle.textContent = "☰";
        }
    };

    toggle?.addEventListener("click", () => {
        const open = links.classList.toggle("is-open");

        toggle.setAttribute("aria-expanded", String(open));
        toggle.textContent = open ? "✕" : "☰";

        if (!open) {
            closeDropdown();
        }
    });

    dropdownToggle?.addEventListener("click", event => {
        event.stopPropagation();

        const open = dropdown.classList.toggle("is-open");
        dropdownToggle.setAttribute("aria-expanded", String(open));
    });

    links?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            closeDropdown();
            closeMobileMenu();
        });
    });

    document.addEventListener("click", event => {
        if (!dropdown?.contains(event.target)) {
            closeDropdown();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        closeDropdown();
        closeMobileMenu();
    });
})();
