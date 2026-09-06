(() => {
    const THEME_KEY = "kamyli:ui-theme";
    const BLUR_KEY = "kamyli:ui-blur";

    const BLUR_AUTO = "auto";
    const BLUR_ON = "on";
    const BLUR_OFF = "off";

    const LOW_MEMORY_GB = 2;
    const LOW_CPU_THREADS = 2;

    function safeGet(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    function safeSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch {
            // Preferência continua válida durante a sessão mesmo sem storage.
        }
    }

    function safeRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch {
            // O modo automático continua válido durante a sessão sem storage.
        }
    }

    function getSystemTheme() {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }

    function normalizeTheme(value) {
        return value === "dark" || value === "light"
            ? value
            : getSystemTheme();
    }

    function normalizeBlurPreference(value) {
        return value === BLUR_ON || value === BLUR_OFF
            ? value
            : BLUR_AUTO;
    }

    function supportsBackdropBlur() {
        if (!window.CSS || typeof window.CSS.supports !== "function") {
            return false;
        }

        return (
            window.CSS.supports("backdrop-filter", "blur(8px)") ||
            window.CSS.supports("-webkit-backdrop-filter", "blur(8px)")
        );
    }

    function mediaMatches(query) {
        try {
            return window.matchMedia(query).matches;
        } catch {
            return false;
        }
    }

    function getConnection() {
        return (
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection ||
            null
        );
    }

    function evaluateAutomaticBlur() {
        if (!supportsBackdropBlur()) {
            return {
                blur: BLUR_OFF,
                reason: "unsupported"
            };
        }

        if (mediaMatches("(prefers-reduced-transparency: reduce)")) {
            return {
                blur: BLUR_OFF,
                reason: "reduced-transparency"
            };
        }

        const connection = getConnection();
        if (connection?.saveData) {
            return {
                blur: BLUR_OFF,
                reason: "save-data"
            };
        }

        if (
            typeof navigator.deviceMemory === "number" &&
            navigator.deviceMemory <= LOW_MEMORY_GB
        ) {
            return {
                blur: BLUR_OFF,
                reason: "low-memory"
            };
        }

        if (
            typeof navigator.hardwareConcurrency === "number" &&
            navigator.hardwareConcurrency <= LOW_CPU_THREADS
        ) {
            return {
                blur: BLUR_OFF,
                reason: "low-cpu"
            };
        }

        return {
            blur: BLUR_ON,
            reason: "supported"
        };
    }

    let theme = normalizeTheme(safeGet(THEME_KEY));
    let blurPreference = normalizeBlurPreference(safeGet(BLUR_KEY));
    let blur = BLUR_ON;
    let blurReason = "supported";
    let blurSupported = supportsBackdropBlur();

    function resolveBlur() {
        blurSupported = supportsBackdropBlur();

        if (blurPreference === BLUR_AUTO) {
            const automatic = evaluateAutomaticBlur();
            blur = automatic.blur;
            blurReason = automatic.reason;
            return;
        }

        if (!blurSupported) {
            blur = BLUR_OFF;
            blurReason = "unsupported";
            return;
        }

        blur = blurPreference;
        blurReason = "manual";
    }

    function getBlurMode() {
        return blurPreference === BLUR_AUTO
            ? "auto"
            : "manual";
    }

    function apply() {
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.blur = blur;
        document.documentElement.dataset.blurMode = getBlurMode();
        document.documentElement.dataset.blurPreference = blurPreference;
        document.documentElement.dataset.blurReason = blurReason;
        document.documentElement.style.colorScheme = theme;
    }

    function getState() {
        return {
            theme,
            blur,
            blurMode: getBlurMode(),
            blurPreference,
            blurReason,
            blurSupported
        };
    }

    function dispatchPreferenceChange() {
        window.dispatchEvent(
            new CustomEvent("kamyli:ui-preference-change", {
                detail: getState()
            })
        );
    }

    function refreshAutomaticBlur(notify = true) {
        if (blurPreference !== BLUR_AUTO) return;

        const previousBlur = blur;
        const previousReason = blurReason;
        const previousSupport = blurSupported;

        resolveBlur();
        apply();

        if (
            notify &&
            (
                blur !== previousBlur ||
                blurReason !== previousReason ||
                blurSupported !== previousSupport
            )
        ) {
            dispatchPreferenceChange();
        }
    }

    function setTheme(value, persist = true) {
        theme = normalizeTheme(value);

        if (persist) {
            safeSet(THEME_KEY, theme);
        }

        apply();
        dispatchPreferenceChange();
    }

    function setBlur(value, persist = true) {
        blurPreference = normalizeBlurPreference(value);

        if (persist) {
            if (blurPreference === BLUR_AUTO) {
                safeRemove(BLUR_KEY);
            } else {
                safeSet(BLUR_KEY, blurPreference);
            }
        }

        resolveBlur();
        apply();
        dispatchPreferenceChange();
    }

    function toggleTheme() {
        setTheme(theme === "dark" ? "light" : "dark");
    }

    function toggleBlur() {
        setBlur(blur === BLUR_ON ? BLUR_OFF : BLUR_ON);
    }

    function resetBlurToAuto() {
        setBlur(BLUR_AUTO);
    }

    function listenForAutomaticConditionChanges() {
        const transparencyQuery = window.matchMedia(
            "(prefers-reduced-transparency: reduce)"
        );

        if (typeof transparencyQuery.addEventListener === "function") {
            transparencyQuery.addEventListener(
                "change",
                () => refreshAutomaticBlur()
            );
        } else if (typeof transparencyQuery.addListener === "function") {
            transparencyQuery.addListener(
                () => refreshAutomaticBlur()
            );
        }

        const connection = getConnection();
        if (typeof connection?.addEventListener === "function") {
            connection.addEventListener(
                "change",
                () => refreshAutomaticBlur()
            );
        }

        window.addEventListener(
            "pageshow",
            () => refreshAutomaticBlur()
        );
    }

    resolveBlur();
    apply();
    listenForAutomaticConditionChanges();

    window.KAMYLI_UI_PREFS = Object.freeze({
        getState,
        setTheme,
        setBlur,
        toggleTheme,
        toggleBlur,
        resetBlurToAuto,
        refreshAutomaticBlur
    });
})();
