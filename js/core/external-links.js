(() => {
    /*
     * Aviso global de links externos.
     *
     * A delegação no document também cobre links inseridos
     * posteriormente por JSON, Footer, Créditos e outros módulos.
     *
     * Para uma exceção futura:
     * data-external-warning="skip"
     */
    const dialog = document.createElement("dialog");
    dialog.className = "site-external-dialog";
    dialog.setAttribute(
        "aria-labelledby",
        "externalDialogTitle"
    );
    dialog.setAttribute(
        "aria-describedby",
        "externalDialogText"
    );

    dialog.innerHTML = `
        <div class="site-external-dialog-content">
            <div
                class="site-external-dialog-icon"
                aria-hidden="true"
            >
                <svg viewBox="0 0 24 24">
                    <path d="M14 5h5v5M19 5l-8 8"></path>
                    <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"></path>
                </svg>
            </div>

            <div class="site-external-dialog-copy">
                <h2 id="externalDialogTitle">
                    Abrir link externo?
                </h2>

                <p id="externalDialogText">
                    Você está saindo deste site e será
                    direcionado para
                    <strong id="externalDialogHost">
                        outro site
                    </strong>.
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

    const cancelButton =
        dialog.querySelector(
            ".site-external-cancel"
        );

    const continueButton =
        dialog.querySelector(
            ".site-external-continue"
        );

    const hostLabel =
        dialog.querySelector(
            "#externalDialogHost"
        );

    let pendingNavigation = null;

    function isHttpProtocol(url) {
        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );
    }

    function getExternalLink(target) {
        if (!(target instanceof Element)) {
            return null;
        }

        const link = target.closest("a[href]");

        if (!link) {
            return null;
        }

        if (
            link.dataset.externalWarning ===
            "skip"
        ) {
            return null;
        }

        let url;

        try {
            url = new URL(
                link.href,
                window.location.href
            );
        } catch {
            return null;
        }

        if (!isHttpProtocol(url)) {
            return null;
        }

        if (
            url.origin ===
            window.location.origin
        ) {
            return null;
        }

        return {
            link,
            url
        };
    }

    function navigate({
        url,
        target = "_self"
    }) {
        if (
            target &&
            target !== "_self"
        ) {
            window.open(
                url.href,
                target,
                "noopener,noreferrer"
            );

            return;
        }

        window.location.assign(url.href);
    }

    function closeExternalDialog() {
        pendingNavigation = null;

        if (dialog.open) {
            dialog.close();
        }
    }

    function openExternalDialog(
        url,
        target
    ) {
        pendingNavigation = {
            url,
            target
        };

        hostLabel.textContent =
            url.hostname.replace(/^www\./, "");

        if (
            typeof dialog.showModal ===
            "function"
        ) {
            dialog.showModal();
            cancelButton.focus();
            return;
        }

        const confirmed =
            window.confirm(
                `Você está saindo deste site e será direcionado para ${url.hostname}. Deseja continuar?`
            );

        if (confirmed) {
            navigate(pendingNavigation);
        }

        pendingNavigation = null;
    }

    function handleExternalLink(event) {
        if (event.defaultPrevented) {
            return;
        }

        const external =
            getExternalLink(event.target);

        if (!external) {
            return;
        }

        /*
         * Preserva a intenção de abrir em nova aba quando
         * o link já usa target="_blank" ou quando o usuário
         * usa Ctrl/Cmd/Shift.
         */
        const forceNewTab =
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey;

        const target =
            forceNewTab
                ? "_blank"
                : (
                    external.link.target ||
                    "_self"
                );

        event.preventDefault();

        openExternalDialog(
            external.url,
            target
        );
    }

    /*
     * "click" funciona para mouse, touch e ativação por teclado.
     * A delegação evita precisar registrar listener em cada link.
     */
    document.addEventListener(
        "click",
        handleExternalLink
    );

    cancelButton.addEventListener(
        "click",
        closeExternalDialog
    );

    continueButton.addEventListener(
        "click",
        () => {
            if (!pendingNavigation) {
                closeExternalDialog();
                return;
            }

            const navigation =
                pendingNavigation;

            closeExternalDialog();
            navigate(navigation);
        }
    );

    dialog.addEventListener(
        "click",
        event => {
            if (event.target === dialog) {
                closeExternalDialog();
            }
        }
    );

    dialog.addEventListener(
        "cancel",
        event => {
            event.preventDefault();
            closeExternalDialog();
        }
    );
})();
