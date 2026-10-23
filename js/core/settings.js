/*
 * CONFIGURAÇÕES DO SITE — V48.3.66
 *
 * O botão (só o ícone de engrenagem) fica na barra superior, no slot
 * #site-nav-settings-slot criado por navbar.js, para que as pessoas não
 * precisem descer a página até o rodapé. O painel é montado em <body>:
 *
 *   - .site-nav usa backdrop-filter e, por isso, viraria o containing block
 *     de um painel position: fixed e também um backdrop root do blur dele;
 *   - no celular o painel se registra no controlador de overlays
 *     (mobile-overlay.js), então Menu, Redes e Configurações nunca ficam
 *     abertos juntos e o botão Voltar do navegador fecha o painel aberto.
 *
 * Os textos abaixo são o fallback em português. Quando
 * data/content/interface.json carrega, content.js reaplica a cópia editorial
 * (applySettings) sobre este mesmo DOM.
 */
(() => {
    "use strict";

    const slot = document.getElementById("site-nav-settings-slot");

    if (!slot || document.getElementById("siteSettingsPopover")) return;

    const uiPrefs = window.KAMYLI_UI_PREFS;
    const mobileOverlay = window.KamyliMobileOverlay;
    const OVERLAY_NAME = "settings";
    const mobileQuery = window.matchMedia("(max-width: 767px)");

    function blurReasonLabel(reason) {
        const labels = {
            "unsupported": "não suportado pelo navegador",
            "reduced-transparency": "redução de transparência",
            "save-data": "economia de dados",
            "low-memory": "memória limitada",
            "low-cpu": "processamento limitado",
            "supported": "condições adequadas",
            "manual": "escolha manual",
            "reading": "modo leitura"
        };

        return labels[reason] || "condições do dispositivo";
    }

    slot.innerHTML = `
        <button
            class="site-settings-toggle"
            id="siteSettingsToggle"
            data-button-key="settingsOpen"
            type="button"
            title="Configurações"
            aria-label="Abrir configurações"
            aria-expanded="false"
            aria-controls="siteSettingsPopover"
            aria-haspopup="dialog"
        >
            <span data-button-icon aria-hidden="true"></span>
            <span data-button-label hidden></span>
        </button>
    `;

    const popover = document.createElement("div");
    popover.className = "site-settings-popover";
    popover.id = "siteSettingsPopover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-modal", "false");
    popover.setAttribute("aria-labelledby", "siteSettingsTitle");
    popover.hidden = true;

    popover.innerHTML = `
        <div class="site-settings-header">
            <h2 id="siteSettingsTitle">Configurações</h2>

            <button
                class="site-settings-close"
                id="siteSettingsClose"
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
                    <input type="radio" name="site-theme-preference" value="auto">
                    <span>Automático</span>
                </label>

                <label class="site-settings-option">
                    <input type="radio" name="site-theme-preference" value="light">
                    <span>Claro</span>
                </label>

                <label class="site-settings-option">
                    <input type="radio" name="site-theme-preference" value="dark">
                    <span>Escuro</span>
                </label>
            </div>

            <p
                class="site-settings-status"
                id="siteThemeStatus"
                aria-live="polite"
            ></p>
        </fieldset>

        <fieldset class="site-settings-group">
            <legend>Leitura</legend>

            <div class="site-settings-options site-settings-options-two">
                <label class="site-settings-option">
                    <input type="radio" name="site-reading-preference" value="off">
                    <span>Normal</span>
                </label>

                <label class="site-settings-option">
                    <input type="radio" name="site-reading-preference" value="on">
                    <span>Modo leitura</span>
                </label>
            </div>

            <p
                class="site-settings-status"
                id="siteReadingStatus"
                aria-live="polite"
            ></p>

            <p
                class="site-settings-subtitle"
                id="siteReadingSizeLabel"
            >
                Tamanho do texto
            </p>

            <div
                class="site-settings-options"
                role="group"
                aria-labelledby="siteReadingSizeLabel"
            >
                <label class="site-settings-option">
                    <input type="radio" name="site-reading-size" value="normal">
                    <span>Padrão</span>
                </label>

                <label class="site-settings-option">
                    <input type="radio" name="site-reading-size" value="large">
                    <span>Grande</span>
                </label>

                <label class="site-settings-option">
                    <input type="radio" name="site-reading-size" value="xlarge">
                    <span>Maior</span>
                </label>
            </div>

            <p
                class="site-settings-status"
                id="siteReadingSizeStatus"
                aria-live="polite"
            ></p>
        </fieldset>

        <fieldset class="site-settings-group">
            <legend>Blur</legend>

            <div class="site-settings-options">
                <label class="site-settings-option">
                    <input type="radio" name="site-blur-preference" value="auto">
                    <span>Automático</span>
                </label>

                <label class="site-settings-option">
                    <input type="radio" name="site-blur-preference" value="on">
                    <span>Ligado</span>
                </label>

                <label class="site-settings-option">
                    <input type="radio" name="site-blur-preference" value="off">
                    <span>Desligado</span>
                </label>
            </div>

            <p
                class="site-settings-status"
                id="siteBlurStatus"
                aria-live="polite"
            ></p>
        </fieldset>
    `;

    document.body.appendChild(popover);

    const toggle = slot.querySelector("#siteSettingsToggle");
    const closeButton = popover.querySelector("#siteSettingsClose");
    const themeStatus = popover.querySelector("#siteThemeStatus");
    const blurStatus = popover.querySelector("#siteBlurStatus");
    const readingStatus = popover.querySelector("#siteReadingStatus");
    const readingSizeStatus = popover.querySelector("#siteReadingSizeStatus");

    const radios = name => [
        ...popover.querySelectorAll(`input[name="${name}"]`)
    ];

    const themeInputs = radios("site-theme-preference");
    const blurInputs = radios("site-blur-preference");
    const readingInputs = radios("site-reading-preference");
    const readingSizeInputs = radios("site-reading-size");

    function setOpen(open, { returnFocus = false, focusInside = true } = {}) {
        popover.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));

        if (open) {
            if (focusInside) {
                const target =
                    popover.querySelector(
                        "input:checked:not(:disabled)"
                    ) || closeButton;

                window.requestAnimationFrame(() => target?.focus());
            }
        } else if (returnFocus) {
            toggle.focus();
        }
    }

    function isOpen() {
        return !popover.hidden;
    }

    /*
     * No celular o controlador de overlays é o dono do estado (histórico,
     * exclusão mútua com Menu/Redes). No desktop o painel é independente.
     */
    function viaOverlay() {
        return Boolean(mobileOverlay) && mobileQuery.matches;
    }

    function requestOpen() {
        if (viaOverlay()) {
            mobileOverlay.open(OVERLAY_NAME, { focus: true });
        } else {
            setOpen(true);
        }
    }

    function requestClose(returnFocus = false) {
        if (!isOpen()) return;

        if (viaOverlay() && mobileOverlay.isOpen(OVERLAY_NAME)) {
            mobileOverlay.close(OVERLAY_NAME, { restoreFocus: returnFocus });
        } else {
            setOpen(false, { returnFocus });
        }
    }

    function updateControls() {
        if (!uiPrefs) {
            toggle.disabled = true;
            toggle.title = "Preferências indisponíveis";
            return;
        }

        toggle.disabled = false;

        const state = uiPrefs.getState();
        const reading = state.reading === "on";

        themeInputs.forEach(input => {
            input.checked = input.value === state.themePreference;
        });

        blurInputs.forEach(input => {
            input.checked = input.value === state.blurPreference;

            // O modo leitura desliga o blur; a escolha fica salva.
            input.disabled =
                reading ||
                (input.value === "on" && !state.blurSupported);
        });

        readingInputs.forEach(input => {
            input.checked = input.value === state.reading;
        });

        readingSizeInputs.forEach(input => {
            input.checked = input.value === state.readingSize;
            input.disabled = !reading;
        });

        if (readingStatus) {
            readingStatus.textContent = reading
                ? "Modo leitura ligado: sem blur nem fundo decorativo, com texto e contraste reforçados."
                : "Modo leitura desligado.";
        }

        if (readingSizeStatus) {
            const sizeNames = {
                normal: "padrão",
                large: "grande",
                xlarge: "maior"
            };

            readingSizeStatus.textContent = reading
                ? `Tamanho do texto: ${
                    sizeNames[state.readingSize] || sizeNames.normal
                }.`
                : "O tamanho do texto vale quando o modo leitura está ligado.";
        }

        if (themeStatus) {
            if (state.themePreference === "auto") {
                themeStatus.textContent =
                    `Automático • sistema em modo ${
                        state.theme === "dark" ? "escuro" : "claro"
                    }.`;
            } else {
                themeStatus.textContent =
                    state.theme === "dark"
                        ? "Modo escuro selecionado."
                        : "Modo claro selecionado.";
            }
        }

        if (blurStatus) {
            if (reading) {
                blurStatus.textContent =
                    "Blur desligado pelo modo leitura.";
            } else if (!state.blurSupported) {
                blurStatus.textContent =
                    "Blur indisponível neste navegador; o efeito permanece desligado.";
            } else if (state.blurPreference === "auto") {
                blurStatus.textContent =
                    `Automático • atualmente ${
                        state.blur === "on" ? "ligado" : "desligado"
                    } (${blurReasonLabel(state.blurReason)}).`;
            } else {
                blurStatus.textContent =
                    state.blur === "on"
                        ? "Blur ligado manualmente."
                        : "Blur desligado manualmente.";
            }
        }
    }

    function bindRadios(inputs, apply) {
        inputs.forEach(input => {
            input.addEventListener("change", () => {
                if (input.checked) apply(input.value);
            });
        });
    }

    bindRadios(themeInputs, value => uiPrefs?.setTheme(value));
    bindRadios(blurInputs, value => uiPrefs?.setBlur(value));
    bindRadios(readingInputs, value => uiPrefs?.setReading(value));
    bindRadios(readingSizeInputs, value => uiPrefs?.setReadingSize(value));

    toggle.addEventListener("click", () => {
        if (isOpen()) {
            requestClose(true);
        } else {
            requestOpen();
        }
    });

    closeButton?.addEventListener("click", () => requestClose(true));

    document.addEventListener("pointerdown", event => {
        if (
            isOpen() &&
            event.target instanceof Node &&
            !popover.contains(event.target) &&
            !toggle.contains(event.target)
        ) {
            requestClose(false);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && isOpen()) {
            event.preventDefault();
            requestClose(true);
        }
    });

    // Ao cruzar o breakpoint o painel fecha, para não ficar órfão do controlador.
    mobileQuery.addEventListener?.("change", () => {
        if (isOpen()) setOpen(false);
    });

    window.addEventListener("pagehide", () => {
        if (isOpen()) setOpen(false);
    });

    window.addEventListener(
        "kamyli:ui-preference-change",
        updateControls
    );

    mobileOverlay?.register(OVERLAY_NAME, {
        isOpen,
        open: () => setOpen(true),
        close: () => setOpen(false),
        focusTrigger: () => toggle.focus()
    });

    updateControls();
})();
