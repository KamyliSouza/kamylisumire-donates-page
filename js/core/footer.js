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

            /*
             * V42.5: o footer já possui backdrop-filter.
             * Enquanto o popover estiver aberto, removemos temporariamente
             * esse backdrop root do ancestral para o card de configurações
             * poder borrar diretamente o conteúdo atrás dele.
             */
            mount.classList.toggle(
                "site-settings-open",
                open
            );

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

            mount.classList.remove(
                "site-settings-open"
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

                <div class="site-footer-settings">
                    <button
                        class="site-footer-settings-toggle"
                        id="footerSettingsToggle"
                        data-button-key="settingsOpen"
                        type="button"
                        aria-expanded="false"
                        aria-controls="footerSettingsPopover"
                        aria-haspopup="dialog"
                    >
                        <span data-button-icon aria-hidden="true"></span>
                        <span data-button-label>Configurações</span>
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
                            <h2 id="footerSettingsTitle">Configurações</h2>

                            <button
                                class="site-settings-close"
                                id="footerSettingsClose"
                                data-button-key="settingsClose"
                                type="button"
                                aria-label="Fechar configurações"
                            >
                                <span data-button-icon aria-hidden="true">×</span>
                                <span data-button-label hidden></span>
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
