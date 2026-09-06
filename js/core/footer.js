(() => {
    const mount =
        document.getElementById("site-footer");

    if (!mount) return;

    const content = window.KamyliContent;
    const year = new Date().getFullYear();
    const uiPrefs = window.KAMYLI_UI_PREFS;

    let cleanupSettings = null;

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

    function blurReasonLabel(reason) {
        const labels = {
            "unsupported": "não suportado pelo navegador",
            "reduced-transparency": "redução de transparência",
            "save-data": "economia de dados",
            "low-memory": "memória limitada",
            "low-cpu": "processamento limitado",
            "supported": "condições adequadas",
            "manual": "escolha manual"
        };

        return labels[reason] || "condições do dispositivo";
    }

    function bindSettings() {
        const wrapper = mount.querySelector(
            ".site-footer-settings"
        );
        const toggle = mount.querySelector(
            "#footerSettingsToggle"
        );
        const popover = mount.querySelector(
            "#footerSettingsPopover"
        );
        const closeButton = mount.querySelector(
            "#footerSettingsClose"
        );
        const themeStatus = mount.querySelector(
            "#footerThemeStatus"
        );
        const blurStatus = mount.querySelector(
            "#footerBlurStatus"
        );
        const themeInputs = [
            ...mount.querySelectorAll(
                'input[name="site-theme-preference"]'
            )
        ];
        const blurInputs = [
            ...mount.querySelectorAll(
                'input[name="site-blur-preference"]'
            )
        ];

        if (
            !wrapper ||
            !toggle ||
            !popover
        ) {
            return () => {};
        }

        function setOpen(open, returnFocus = false) {
            popover.hidden = !open;
            toggle.setAttribute(
                "aria-expanded",
                String(open)
            );

            if (open) {
                const checked =
                    mount.querySelector(
                        '.site-settings-popover input:checked:not(:disabled)'
                    ) || closeButton;

                window.requestAnimationFrame(
                    () => checked?.focus()
                );
            } else if (returnFocus) {
                toggle.focus();
            }
        }

        function updateControls() {
            if (!uiPrefs) {
                toggle.disabled = true;
                toggle.title =
                    "Preferências indisponíveis";
                return;
            }

            toggle.disabled = false;

            const state = uiPrefs.getState();

            themeInputs.forEach(input => {
                input.checked =
                    input.value ===
                    state.themePreference;
            });

            blurInputs.forEach(input => {
                input.checked =
                    input.value ===
                    state.blurPreference;

                if (input.value === "on") {
                    input.disabled =
                        !state.blurSupported;
                }
            });

            if (themeStatus) {
                if (
                    state.themePreference === "auto"
                ) {
                    themeStatus.textContent =
                        `Automático • sistema em modo ${
                            state.theme === "dark"
                                ? "escuro"
                                : "claro"
                        }.`;
                } else {
                    themeStatus.textContent =
                        state.theme === "dark"
                            ? "Modo escuro selecionado."
                            : "Modo claro selecionado.";
                }
            }

            if (blurStatus) {
                if (!state.blurSupported) {
                    blurStatus.textContent =
                        "Blur indisponível neste navegador; o efeito permanece desligado.";
                } else if (
                    state.blurPreference === "auto"
                ) {
                    blurStatus.textContent =
                        `Automático • atualmente ${
                            state.blur === "on"
                                ? "ligado"
                                : "desligado"
                        } (${blurReasonLabel(state.blurReason)}).`;
                } else {
                    blurStatus.textContent =
                        state.blur === "on"
                            ? "Blur ligado manualmente."
                            : "Blur desligado manualmente.";
                }
            }
        }

        function onToggleClick() {
            setOpen(popover.hidden);
        }

        function onCloseClick() {
            setOpen(false, true);
        }

        function onThemeChange(event) {
            if (
                event.target instanceof HTMLInputElement &&
                event.target.checked
            ) {
                uiPrefs?.setTheme(
                    event.target.value
                );
            }
        }

        function onBlurChange(event) {
            if (
                event.target instanceof HTMLInputElement &&
                event.target.checked
            ) {
                uiPrefs?.setBlur(
                    event.target.value
                );
            }
        }

        function onDocumentPointerDown(event) {
            if (
                !popover.hidden &&
                !wrapper.contains(event.target)
            ) {
                setOpen(false);
            }
        }

        function onDocumentKeyDown(event) {
            if (
                event.key === "Escape" &&
                !popover.hidden
            ) {
                event.preventDefault();
                setOpen(false, true);
            }
        }

        toggle.addEventListener(
            "click",
            onToggleClick
        );

        closeButton?.addEventListener(
            "click",
            onCloseClick
        );

        themeInputs.forEach(input => {
            input.addEventListener(
                "change",
                onThemeChange
            );
        });

        blurInputs.forEach(input => {
            input.addEventListener(
                "change",
                onBlurChange
            );
        });

        document.addEventListener(
            "pointerdown",
            onDocumentPointerDown
        );

        document.addEventListener(
            "keydown",
            onDocumentKeyDown
        );

        window.addEventListener(
            "kamyli:ui-preference-change",
            updateControls
        );

        updateControls();

        return () => {
            toggle.removeEventListener(
                "click",
                onToggleClick
            );

            closeButton?.removeEventListener(
                "click",
                onCloseClick
            );

            themeInputs.forEach(input => {
                input.removeEventListener(
                    "change",
                    onThemeChange
                );
            });

            blurInputs.forEach(input => {
                input.removeEventListener(
                    "change",
                    onBlurChange
                );
            });

            document.removeEventListener(
                "pointerdown",
                onDocumentPointerDown
            );

            document.removeEventListener(
                "keydown",
                onDocumentKeyDown
            );

            window.removeEventListener(
                "kamyli:ui-preference-change",
                updateControls
            );
        };
    }

    function render(data) {
        cleanupSettings?.();
        cleanupSettings = null;

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

                <div class="site-footer-settings">
                    <button
                        class="site-footer-settings-toggle"
                        id="footerSettingsToggle"
                        type="button"
                        aria-expanded="false"
                        aria-controls="footerSettingsPopover"
                        aria-haspopup="dialog"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.55V20.3h-3v-.09a1.7 1.7 0 0 0-1.04-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.55-1.04H5.3v-3h.15A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88L6.6 7.98l2.12-2.12.06.06A1.7 1.7 0 0 0 10.66 6.26 1.7 1.7 0 0 0 11.7 4.7V4.6h3v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1.04h.15v3h-.15A1.7 1.7 0 0 0 19.4 15Z"></path>
                        </svg>
                        <span>Configurações</span>
                    </button>

                    <div
                        class="site-settings-popover"
                        id="footerSettingsPopover"
                        role="dialog"
                        aria-modal="false"
                        aria-labelledby="footerSettingsTitle"
                        hidden
                    >
                        <div class="site-settings-header">
                            <div>
                                <span class="site-settings-eyebrow">Preferências</span>
                                <h2 id="footerSettingsTitle">Configurações</h2>
                            </div>

                            <button
                                class="site-settings-close"
                                id="footerSettingsClose"
                                type="button"
                                aria-label="Fechar configurações"
                            >
                                ×
                            </button>
                        </div>

                        <fieldset class="site-settings-group">
                            <legend>Aparência</legend>

                            <div class="site-settings-options">
                                <label class="site-settings-option">
                                    <input
                                        type="radio"
                                        name="site-theme-preference"
                                        value="auto"
                                    >
                                    <span>Automático</span>
                                </label>

                                <label class="site-settings-option">
                                    <input
                                        type="radio"
                                        name="site-theme-preference"
                                        value="light"
                                    >
                                    <span>Claro</span>
                                </label>

                                <label class="site-settings-option">
                                    <input
                                        type="radio"
                                        name="site-theme-preference"
                                        value="dark"
                                    >
                                    <span>Escuro</span>
                                </label>
                            </div>

                            <p
                                class="site-settings-status"
                                id="footerThemeStatus"
                                aria-live="polite"
                            ></p>
                        </fieldset>

                        <fieldset class="site-settings-group">
                            <legend>Blur</legend>

                            <div class="site-settings-options">
                                <label class="site-settings-option">
                                    <input
                                        type="radio"
                                        name="site-blur-preference"
                                        value="auto"
                                    >
                                    <span>Automático</span>
                                </label>

                                <label class="site-settings-option">
                                    <input
                                        type="radio"
                                        name="site-blur-preference"
                                        value="on"
                                    >
                                    <span>Ligado</span>
                                </label>

                                <label class="site-settings-option">
                                    <input
                                        type="radio"
                                        name="site-blur-preference"
                                        value="off"
                                    >
                                    <span>Desligado</span>
                                </label>
                            </div>

                            <p
                                class="site-settings-status"
                                id="footerBlurStatus"
                                aria-live="polite"
                            ></p>
                        </fieldset>
                    </div>
                </div>
            </div>
        `;

        cleanupSettings = bindSettings();
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
