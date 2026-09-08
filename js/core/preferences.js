(() => {
    const THEME_KEY = "kamyli:ui-theme";
    const BLUR_KEY = "kamyli:ui-blur";

    const THEME_AUTO = "auto";
    const THEME_LIGHT = "light";
    const THEME_DARK = "dark";

    const BLUR_AUTO = "auto";
    const BLUR_ON = "on";
    const BLUR_OFF = "off";

    const PERFORMANCE_NORMAL = "normal";
    const PERFORMANCE_REDUCED = "reduced";

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
            // A preferência continua válida durante a sessão sem storage.
        }
    }

    function getSystemTheme() {
        return mediaMatches("(prefers-color-scheme: dark)")
            ? THEME_DARK
            : THEME_LIGHT;
    }

    function normalizeThemePreference(value) {
        return (
            value === THEME_AUTO ||
            value === THEME_LIGHT ||
            value === THEME_DARK
        )
            ? value
            : THEME_AUTO;
    }

    function normalizeBlurPreference(value) {
        return (
            value === BLUR_AUTO ||
            value === BLUR_ON ||
            value === BLUR_OFF
        )
            ? value
            : BLUR_AUTO;
    }

    function supportsBackdropBlur() {
        if (
            !window.CSS ||
            typeof window.CSS.supports !== "function"
        ) {
            return false;
        }

        return (
            window.CSS.supports(
                "backdrop-filter",
                "blur(8px)"
            ) ||
            window.CSS.supports(
                "-webkit-backdrop-filter",
                "blur(8px)"
            )
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

    function evaluatePerformance() {
        const connection = getConnection();

        if (connection?.saveData) {
            return {
                profile: PERFORMANCE_REDUCED,
                reason: "save-data"
            };
        }

        if (
            typeof navigator.deviceMemory === "number" &&
            navigator.deviceMemory <= LOW_MEMORY_GB
        ) {
            return {
                profile: PERFORMANCE_REDUCED,
                reason: "low-memory"
            };
        }

        if (
            typeof navigator.hardwareConcurrency === "number" &&
            navigator.hardwareConcurrency <= LOW_CPU_THREADS
        ) {
            return {
                profile: PERFORMANCE_REDUCED,
                reason: "low-cpu"
            };
        }

        return {
            profile: PERFORMANCE_NORMAL,
            reason: "standard"
        };
    }

    function evaluateAutomaticBlur() {
        if (!supportsBackdropBlur()) {
            return {
                blur: BLUR_OFF,
                reason: "unsupported"
            };
        }

        if (
            mediaMatches(
                "(prefers-reduced-transparency: reduce)"
            )
        ) {
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

    let themePreference =
        normalizeThemePreference(
            safeGet(THEME_KEY)
        );

    let theme = THEME_LIGHT;

    let blurPreference =
        normalizeBlurPreference(
            safeGet(BLUR_KEY)
        );

    let blur = BLUR_ON;
    let blurReason = "supported";
    let blurSupported = supportsBackdropBlur();

    let performanceProfile = PERFORMANCE_NORMAL;
    let performanceReason = "standard";

    function resolveTheme() {
        theme =
            themePreference === THEME_AUTO
                ? getSystemTheme()
                : themePreference;
    }

    function getThemeMode() {
        return themePreference === THEME_AUTO
            ? "auto"
            : "manual";
    }

    function resolvePerformance() {
        const evaluation = evaluatePerformance();

        performanceProfile = evaluation.profile;
        performanceReason = evaluation.reason;
    }

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
        const root = document.documentElement;

        root.dataset.theme = theme;
        root.dataset.themeMode = getThemeMode();
        root.dataset.themePreference = themePreference;

        root.dataset.blur = blur;
        root.dataset.blurMode = getBlurMode();
        root.dataset.blurPreference = blurPreference;
        root.dataset.blurReason = blurReason;

        root.dataset.performance = performanceProfile;
        root.dataset.performanceReason = performanceReason;

        root.style.colorScheme = theme;
    }

    function getState() {
        return {
            theme,
            themeMode: getThemeMode(),
            themePreference,
            systemTheme: getSystemTheme(),
            blur,
            blurMode: getBlurMode(),
            blurPreference,
            blurReason,
            blurSupported,
            performance: performanceProfile,
            performanceReason
        };
    }

    function dispatchPreferenceChange() {
        window.dispatchEvent(
            new CustomEvent(
                "kamyli:ui-preference-change",
                {
                    detail: getState()
                }
            )
        );
    }

    function refreshAdaptiveConditions(notify = true) {
        const previous = getState();

        resolveTheme();
        resolvePerformance();
        resolveBlur();
        apply();

        const current = getState();

        if (
            notify &&
            (
                current.theme !== previous.theme ||
                current.blur !== previous.blur ||
                current.blurReason !== previous.blurReason ||
                current.blurSupported !== previous.blurSupported ||
                current.performance !== previous.performance ||
                current.performanceReason !== previous.performanceReason
            )
        ) {
            dispatchPreferenceChange();
        }
    }

    function refreshAutomaticBlur(notify = true) {
        refreshAdaptiveConditions(notify);
    }

    function setTheme(value, persist = true) {
        themePreference =
            normalizeThemePreference(value);

        if (persist) {
            safeSet(
                THEME_KEY,
                themePreference
            );
        }

        resolveTheme();
        apply();
        dispatchPreferenceChange();
    }

    function setBlur(value, persist = true) {
        blurPreference =
            normalizeBlurPreference(value);

        if (persist) {
            safeSet(
                BLUR_KEY,
                blurPreference
            );
        }

        resolveBlur();
        apply();
        dispatchPreferenceChange();
    }

    function toggleTheme() {
        setTheme(
            theme === THEME_DARK
                ? THEME_LIGHT
                : THEME_DARK
        );
    }

    function toggleBlur() {
        setBlur(
            blur === BLUR_ON
                ? BLUR_OFF
                : BLUR_ON
        );
    }

    function resetThemeToAuto() {
        setTheme(THEME_AUTO);
    }

    function resetBlurToAuto() {
        setBlur(BLUR_AUTO);
    }

    function addMediaChangeListener(query, callback) {
        if (!query) return;

        if (
            typeof query.addEventListener === "function"
        ) {
            query.addEventListener(
                "change",
                callback
            );
            return;
        }

        if (
            typeof query.addListener === "function"
        ) {
            query.addListener(callback);
        }
    }

    function listenForAutomaticConditionChanges() {
        const themeQuery = window.matchMedia(
            "(prefers-color-scheme: dark)"
        );

        addMediaChangeListener(
            themeQuery,
            () => {
                if (
                    themePreference !== THEME_AUTO
                ) {
                    return;
                }

                const previousTheme = theme;

                resolveTheme();
                apply();

                if (theme !== previousTheme) {
                    dispatchPreferenceChange();
                }
            }
        );

        const transparencyQuery = window.matchMedia(
            "(prefers-reduced-transparency: reduce)"
        );

        addMediaChangeListener(
            transparencyQuery,
            () => refreshAdaptiveConditions()
        );

        const connection = getConnection();

        if (
            typeof connection?.addEventListener === "function"
        ) {
            connection.addEventListener(
                "change",
                () => refreshAdaptiveConditions()
            );
        }

        window.addEventListener(
            "pageshow",
            () => refreshAdaptiveConditions()
        );
    }

    resolveTheme();
    resolvePerformance();
    resolveBlur();
    apply();
    listenForAutomaticConditionChanges();

    window.KAMYLI_UI_PREFS = Object.freeze({
        getState,
        setTheme,
        setBlur,
        toggleTheme,
        toggleBlur,
        resetThemeToAuto,
        resetBlurToAuto,
        refreshAutomaticBlur,
        refreshAdaptiveConditions
    });
})();
