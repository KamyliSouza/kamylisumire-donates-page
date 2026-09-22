/*
 * SANITIZAÇÃO COMPARTILHADA
 *
 * Usado pelos módulos que montam HTML via innerHTML a partir de conteúdo
 * editorial (data/content/*.json) e pelos módulos que recebem URLs de JSON/API.
 *
 * Uso:
 *   window.KamyliSanitize.escapeHtml(valor)
 *   window.KamyliSanitize.safeHttpUrl(valor, { httpsOnly, allowedHosts })
 */
(() => {
    "use strict";

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function safeHttpUrl(value, options = {}) {
        const source = String(value ?? "").trim();
        if (!source) return "";

        let parsed;
        try {
            parsed = new URL(source, options.baseUrl || window.location.href);
        } catch {
            return "";
        }

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return "";
        }

        if (options.httpsOnly === true && parsed.protocol !== "https:") {
            return "";
        }

        if (Array.isArray(options.allowedHosts) && options.allowedHosts.length) {
            const allowedHosts = new Set(
                options.allowedHosts
                    .map(host => String(host || "").trim().toLowerCase())
                    .filter(Boolean)
            );

            if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
                return "";
            }
        }

        return parsed.href;
    }

    window.KamyliSanitize = Object.freeze({
        escapeHtml,
        safeHttpUrl
    });
})();
