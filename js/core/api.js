/*
 * CAMADA CENTRAL DE API
 *
 * Uso em qualquer módulo/página futura:
 *   const data = await KamyliAPI.getJSON("/endpoint");
 *
 * Enquanto useCustomDomain=false, o endpoint primário continua sendo o
 * workers.dev atual. Depois, api.kamylisumire.com pode virar o primário
 * sem alterar os módulos consumidores.
 */
window.KamyliAPI = (() => {
    const config = window.KAMYLI_CONFIG?.api || {};

    function joinUrl(baseUrl, endpoint = "/") {
        const base = String(baseUrl || "").replace(/\/+$/, "");
        const path = String(endpoint || "/").startsWith("/")
            ? String(endpoint || "/")
            : `/${endpoint}`;
        return `${base}${path}`;
    }

    function getCandidates() {
        const candidates = [];

        if (config.useCustomDomain && config.customDomainUrl) {
            candidates.push(config.customDomainUrl);
        }

        if (!config.useCustomDomain || config.fallbackToWorkersDev) {
            candidates.push(config.workersDevUrl);
        }

        return [...new Set(candidates.filter(Boolean))];
    }

    async function request(endpoint = "/", options = {}) {
        let lastError = null;

        for (const baseUrl of getCandidates()) {
            const controller = new AbortController();
            const timeoutMs = options.timeoutMs ?? config.defaultTimeoutMs ?? 8000;
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const { timeoutMs: _ignored, ...fetchOptions } = options;
                const response = await fetch(joinUrl(baseUrl, endpoint), {
                    ...fetchOptions,
                    signal: controller.signal,
                    headers: {
                        Accept: "application/json",
                        ...(fetchOptions.headers || {})
                    }
                });

                clearTimeout(timer);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                console.info(`API atendida por: ${baseUrl}`);
                return response;
            } catch (error) {
                clearTimeout(timer);
                console.warn(`Falha ao consultar ${baseUrl}:`, error);
                lastError = error;
            }
        }

        throw lastError || new Error("Nenhum endpoint da API disponível.");
    }

    async function getJSON(endpoint = "/", options = {}) {
        const response = await request(endpoint, { ...options, method: "GET" });
        return response.json();
    }

    return Object.freeze({ request, getJSON });
})();
