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
                        class="site-nav-link"
                        data-nav-section="inicio"
                        href="${sitePath("/")}"
                    >
                        Início
                    </a>

                    <a
                        class="site-nav-link"
                        data-nav-section="agenda"
                        href="${sitePath("/#agenda")}"
                    >
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

                    <a
                        class="site-nav-link"
                        data-nav-section="regras"
                        href="${sitePath("/#regras")}"
                    >
                        Regras
                    </a>

                    <a
                        class="site-nav-link"
                        data-nav-section="creditos"
                        href="${sitePath("/#creditos")}"
                    >
                        Créditos
                    </a>

                    <a
                        class="site-nav-link site-nav-donate"
                        data-nav-page="doacoes"
                        href="${sitePath("/doacoes/")}"
                    >
                        Doações
                    </a>
                </div>
            </div>
        </nav>
    `;

    const navLinksContainer = mount.querySelector(".site-nav-links");
    const navSectionLinks = [
        ...mount.querySelectorAll("[data-nav-section]")
    ];
    const donationsLink = mount.querySelector('[data-nav-page="doacoes"]');

    function keepActiveLinkVisible(link, behavior = "smooth") {
        if (!link || !navLinksContainer) return;

        const containerRect = navLinksContainer.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();

        const targetLeft =
            navLinksContainer.scrollLeft +
            (linkRect.left - containerRect.left) -
            (containerRect.width / 2) +
            (linkRect.width / 2);

        navLinksContainer.scrollTo({
            left: Math.max(0, targetLeft),
            behavior
        });
    }

    function setActiveLink(link, behavior = "smooth") {
        mount.querySelectorAll(".site-nav-link").forEach(item => {
            item.classList.toggle("is-active", item === link);
        });

        if (link) {
            keepActiveLinkVisible(link, behavior);
        }
    }

    if (onDonations) {
        setActiveLink(donationsLink, "auto");
    } else {
        const sectionMap = new Map();

        navSectionLinks.forEach(link => {
            const sectionId = link.dataset.navSection;
            const section = document.getElementById(sectionId);

            if (section) {
                sectionMap.set(section, link);
            }
        });

        const visibleSections = new Map();

        function chooseActiveSection() {
            if (!visibleSections.size) return;

            const entries = [...visibleSections.entries()]
                .filter(([, value]) => value.isIntersecting)
                .sort((a, b) => {
                    const aTop = Math.abs(a[1].boundingClientRect.top);
                    const bTop = Math.abs(b[1].boundingClientRect.top);
                    return aTop - bTop;
                });

            if (!entries.length) return;

            const [section] = entries[0];
            const link = sectionMap.get(section);

            setActiveLink(link);
        }

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                visibleSections.set(entry.target, entry);
            });

            chooseActiveSection();
        }, {
            root: null,
            rootMargin: "-22% 0px -58% 0px",
            threshold: [0, 0.05, 0.2, 0.5]
        });

        sectionMap.forEach((link, section) => {
            observer.observe(section);
        });

        // Estado inicial: hash explícito ou Início.
        const initialHash = window.location.hash.replace("#", "");
        const initialLink =
            navSectionLinks.find(link =>
                link.dataset.navSection === initialHash
            ) ||
            navSectionLinks.find(link =>
                link.dataset.navSection === "inicio"
            );

        setActiveLink(initialLink, "auto");

        // Ao clicar em uma seção da própria Home, atualiza imediatamente.
        navSectionLinks.forEach(link => {
            link.addEventListener("click", () => {
                if (window.location.pathname === new URL(link.href).pathname) {
                    setActiveLink(link);
                }
            });
        });
    }

    // -----------------------------------------------------------------
    // Aviso para links externos da navbar
    // -----------------------------------------------------------------
    const dialog = document.createElement("dialog");
    dialog.className = "site-external-dialog";
    dialog.setAttribute("aria-labelledby", "externalDialogTitle");
    dialog.setAttribute("aria-describedby", "externalDialogText");

    dialog.innerHTML = `
        <div class="site-external-dialog-content">
            <div class="site-external-dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M14 5h5v5M19 5l-8 8"></path>
                    <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"></path>
                </svg>
            </div>

            <div class="site-external-dialog-copy">
                <h2 id="externalDialogTitle">Abrir link externo?</h2>
                <p id="externalDialogText">
                    Você está saindo deste site e será direcionado para
                    <strong id="externalDialogHost">outro site</strong>.
                </p>
            </div>

            <div class="site-external-dialog-actions">
                <button
                    class="button button-outline site-external-cancel"
                    type="button"
                >
                    Cancelar
                </button>

                <button
                    class="button button-primary site-external-continue"
                    type="button"
                >
                    Continuar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    const cancelButton = dialog.querySelector(".site-external-cancel");
    const continueButton = dialog.querySelector(".site-external-continue");
    const hostLabel = dialog.querySelector("#externalDialogHost");

    let pendingExternalUrl = null;

    function closeExternalDialog() {
        pendingExternalUrl = null;

        if (dialog.open) {
            dialog.close();
        }
    }

    function openExternalDialog(url) {
        pendingExternalUrl = url.href;
        hostLabel.textContent = url.hostname.replace(/^www\./, "");

        if (typeof dialog.showModal === "function") {
            dialog.showModal();
            cancelButton.focus();
        } else {
            const confirmed = window.confirm(
                `Você está saindo deste site e será direcionado para ${url.hostname}. Deseja continuar?`
            );

            if (confirmed) {
                window.open(
                    pendingExternalUrl,
                    "_blank",
                    "noopener,noreferrer"
                );
            }

            pendingExternalUrl = null;
        }
    }

    mount.querySelectorAll('a[href]').forEach(link => {
        let targetUrl;

        try {
            targetUrl = new URL(link.href, window.location.href);
        } catch {
            return;
        }

        const isExternal =
            targetUrl.protocol.startsWith("http") &&
            targetUrl.origin !== window.location.origin;

        if (!isExternal) return;

        link.dataset.externalWarning = "true";

        link.addEventListener("click", event => {
            event.preventDefault();
            openExternalDialog(targetUrl);
        });
    });

    cancelButton.addEventListener("click", closeExternalDialog);

    continueButton.addEventListener("click", () => {
        if (!pendingExternalUrl) {
            closeExternalDialog();
            return;
        }

        const url = pendingExternalUrl;
        closeExternalDialog();

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );
    });

    dialog.addEventListener("click", event => {
        if (event.target === dialog) {
            closeExternalDialog();
        }
    });

    dialog.addEventListener("cancel", event => {
        event.preventDefault();
        closeExternalDialog();
    });
})();
