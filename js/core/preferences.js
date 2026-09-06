(() => {
    const THEME_KEY = "kamyli:ui-theme";
    const BLUR_KEY = "kamyli:ui-blur";

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

    function normalizeBlur(value) {
        return value === "off" ? "off" : "on";
    }

    let theme = normalizeTheme(safeGet(THEME_KEY));
    let blur = normalizeBlur(safeGet(BLUR_KEY));

    function apply() {
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.blur = blur;
        document.documentElement.style.colorScheme = theme;
    }

    function setTheme(value, persist = true) {
        theme = normalizeTheme(value);

        if (persist) {
            safeSet(THEME_KEY, theme);
        }

        apply();

        window.dispatchEvent(
            new CustomEvent("kamyli:ui-preference-change", {
                detail: { theme, blur }
            })
        );
    }

    function setBlur(value, persist = true) {
        blur = normalizeBlur(value);

        if (persist) {
            safeSet(BLUR_KEY, blur);
        }

        apply();

        window.dispatchEvent(
            new CustomEvent("kamyli:ui-preference-change", {
                detail: { theme, blur }
            })
        );
    }

    function toggleTheme() {
        setTheme(theme === "dark" ? "light" : "dark");
    }

    function toggleBlur() {
        setBlur(blur === "on" ? "off" : "on");
    }

    function getState() {
        return { theme, blur };
    }

    apply();

    window.KAMYLI_UI_PREFS = Object.freeze({
        getState,
        setTheme,
        setBlur,
        toggleTheme,
        toggleBlur
    });
})();
