/*
 * CAMADA CENTRAL DE API
 *
 * Uso:
 *   const data = await KamyliAPI.getJSON("/endpoint");
 *
 * V48.3.61:
 * - api.kamylisumire.com continua como endpoint primário;
 * - workers.dev é usado somente em falha de transporte/timeout;
 * - respostas HTTP válidas (inclusive 4xx/5xx) não disparam fallback;
 * - o AbortController permanece ativo até o corpo JSON terminar de ser lido.
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

    function isTransportFailure(error, signal) {
        if (signal?.aborted) return true;
        if (error?.name === "AbortError") return true;

        // fetch() e falhas de leitura do stream usam TypeError nos navegadores.
        // SyntaxError de JSON inválido e erros HTTP criados abaixo não entram aqui.
        return error?.name === "TypeError";
    }

    async function request(endpoint = "/", options = {}, consumeResponse = response => response) {
        let lastTransportError = null;

        for (const baseUrl of getCandidates()) {
            const controller = new AbortController();
            const timeoutMs =
                options.timeoutMs ??
                config.defaultTimeoutMs ??
                8000;

            const timer = setTimeout(
                () => controller.abort(),
                timeoutMs
            );

            try {
                const {
                    timeoutMs: _ignored,
                    ...fetchOptions
                } = options;

                const response = await fetch(
                    joinUrl(baseUrl, endpoint),
                    {
                        ...fetchOptions,
                        signal: controller.signal,
                        headers: {
                            Accept: "application/json",
                            ...(fetchOptions.headers || {})
                        }
                    }
                );

                if (!response.ok) {
                    const httpError = new Error(`HTTP ${response.status}`);
                    httpError.name = "KamyliHTTPError";
                    throw httpError;
                }

                // O timer continua armado enquanto o corpo é consumido. Em um
                // Response real, abortar o signal interrompe response.json().
                return await consumeResponse(response);
            } catch (error) {
                if (!isTransportFailure(error, controller.signal)) {
                    throw error;
                }

                console.warn(
                    `Falha de transporte ao consultar ${baseUrl}:`,
                    error
                );
                lastTransportError = error;
            } finally {
                clearTimeout(timer);
            }
        }

        throw (
            lastTransportError ||
            new Error("Nenhum endpoint da API disponível.")
        );
    }

    async function getJSON(endpoint = "/", options = {}) {
        return request(
            endpoint,
            {
                ...options,
                method: "GET"
            },
            response => response.json()
        );
    }

    return Object.freeze({
        getJSON
    });
})();
