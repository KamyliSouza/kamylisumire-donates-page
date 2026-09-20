(() => {
    "use strict";

    const HISTORY_KEY = "__kamyliMobileOverlay";
    const MOBILE_QUERY = "(max-width: 767px)";
    const providers = new Map();
    const mobileQuery = window.matchMedia(MOBILE_QUERY);

    let activeName = null;
    let pendingClose = null;
    let queuedOpen = null;

    function historyOverlayName() {
        const value = window.history.state?.[HISTORY_KEY];
        return typeof value === "string" && value ? value : null;
    }

    function historyStateWith(name) {
        const current =
            window.history.state && typeof window.history.state === "object"
                ? window.history.state
                : {};
        const next = { ...current };

        if (name) next[HISTORY_KEY] = name;
        else delete next[HISTORY_KEY];

        return next;
    }

    function syncRootState() {
        document.documentElement.classList.toggle(
            "site-mobile-overlay-open",
            Boolean(activeName)
        );
        if (activeName) {
            document.documentElement.dataset.mobileOverlay = activeName;
        } else {
            delete document.documentElement.dataset.mobileOverlay;
        }
    }

    function closeProvider(name, { restoreFocus = false } = {}) {
        const provider = providers.get(name);
        if (!provider) return;
        provider.close?.({ restoreFocus, fromController: true });
    }

    function openProvider(name, { focus = false } = {}) {
        const provider = providers.get(name);
        if (!provider) return false;

        if (activeName && activeName !== name) {
            closeProvider(activeName);
        }

        activeName = name;
        provider.open?.({ focus, fromController: true });
        syncRootState();
        return true;
    }

    function pushOrReplaceHistory(name) {
        const currentOverlay = historyOverlayName();
        const state = historyStateWith(name);

        if (currentOverlay) {
            window.history.replaceState(state, "");
        } else {
            window.history.pushState(state, "");
        }
    }

    function open(name, { focus = false } = {}) {
        if (!mobileQuery.matches || !providers.has(name)) return;

        if (pendingClose) {
            queuedOpen = { name, focus };
            return;
        }

        if (activeName === name) {
            providers.get(name)?.open?.({ focus, fromController: true });
            return;
        }

        pushOrReplaceHistory(name);
        openProvider(name, { focus });
    }

    function completePendingClose() {
        const pending = pendingClose;
        pendingClose = null;

        if (pending) {
            if (pending.restoreFocus) {
                providers.get(pending.name)?.focusTrigger?.();
            }
            pending.afterClose?.();
        }

        if (queuedOpen) {
            const next = queuedOpen;
            queuedOpen = null;
            open(next.name, { focus: next.focus });
        }
    }

    function close(name = activeName, {
        restoreFocus = false,
        afterClose = null
    } = {}) {
        if (!name || activeName !== name) {
            afterClose?.();
            return;
        }

        closeProvider(name);
        activeName = null;
        syncRootState();

        if (historyOverlayName() === name) {
            pendingClose = { name, restoreFocus, afterClose };
            window.history.back();
            return;
        }

        if (restoreFocus) providers.get(name)?.focusTrigger?.();
        afterClose?.();
    }

    function toggle(name, options = {}) {
        if (activeName === name) {
            close(name, { restoreFocus: true });
        } else {
            open(name, options);
        }
    }

    function reconcileFromHistory() {
        const desired = mobileQuery.matches ? historyOverlayName() : null;

        if (desired && providers.has(desired)) {
            pendingClose = null;
            queuedOpen = null;
            openProvider(desired, { focus: false });
            return;
        }

        if (activeName) {
            closeProvider(activeName);
            activeName = null;
            syncRootState();
        }

        completePendingClose();
    }

    function register(name, provider) {
        if (!name || !provider || providers.has(name)) return false;
        providers.set(name, provider);

        if (mobileQuery.matches && historyOverlayName() === name) {
            openProvider(name, { focus: false });
        }
        return true;
    }

    function clearOverlayHistoryWithoutNavigation() {
        if (!historyOverlayName()) return;
        window.history.replaceState(historyStateWith(null), "");
    }

    function isTextInputActive() {
        const active = document.activeElement;
        return Boolean(
            active instanceof HTMLElement &&
            (active.matches("input, textarea, select") || active.isContentEditable)
        );
    }

    function syncVirtualKeyboardState() {
        const viewport = window.visualViewport;
        const keyboardLikelyOpen = Boolean(
            mobileQuery.matches &&
            viewport &&
            isTextInputActive() &&
            (window.innerHeight - viewport.height) > 120
        );
        document.documentElement.classList.toggle(
            "site-mobile-keyboard-open",
            keyboardLikelyOpen
        );
    }

    window.addEventListener("popstate", reconcileFromHistory);

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape" || !activeName) return;
        event.preventDefault();
        close(activeName, { restoreFocus: true });
    });

    mobileQuery.addEventListener?.("change", event => {
        if (!event.matches) {
            clearOverlayHistoryWithoutNavigation();
            if (activeName) closeProvider(activeName);
            activeName = null;
            pendingClose = null;
            queuedOpen = null;
            syncRootState();
        } else {
            reconcileFromHistory();
        }
        syncVirtualKeyboardState();
    });

    window.visualViewport?.addEventListener("resize", syncVirtualKeyboardState);
    document.addEventListener("focusin", syncVirtualKeyboardState);
    document.addEventListener("focusout", () => {
        window.setTimeout(syncVirtualKeyboardState, 0);
    });

    window.KamyliMobileOverlay = Object.freeze({
        register,
        open,
        close,
        toggle,
        current: () => activeName,
        isOpen: name => activeName === name
    });
})();
