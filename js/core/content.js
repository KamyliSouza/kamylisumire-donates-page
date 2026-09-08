(() => {
    const memoryCache = new Map();

    function resolvePath(path) {
        if (window.KAMYLI_SITE_PATH) {
            return window.KAMYLI_SITE_PATH(path);
        }

        return path;
    }

    async function getJSON(path, options = {}) {
        const {
            useMemoryCache = true,
            fetchCache = "no-cache"
        } = options;

        const key = String(path);

        if (useMemoryCache && memoryCache.has(key)) {
            return memoryCache.get(key);
        }

        const request = fetch(resolvePath(path), {
            cache: fetchCache,
            headers: {
                "Accept": "application/json"
            }
        }).then(async response => {
            if (!response.ok) {
                throw new Error(
                    `Não foi possível carregar ${path} (HTTP ${response.status}).`
                );
            }

            return response.json();
        });

        if (useMemoryCache) {
            memoryCache.set(key, request);
        }

        try {
            return await request;
        } catch (error) {
            memoryCache.delete(key);
            throw error;
        }
    }

    function setText(elementOrId, value) {
        const element =
            typeof elementOrId === "string"
                ? document.getElementById(elementOrId)
                : elementOrId;

        if (!element || value === undefined || value === null) {
            return false;
        }

        element.textContent = String(value);
        return true;
    }

    window.KamyliContent = Object.freeze({
        getJSON,
        setText
    });
})();
