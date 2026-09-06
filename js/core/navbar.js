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
            // Fallback para navegadores muito antigos.
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
