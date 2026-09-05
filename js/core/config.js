/*
 * CONFIGURAÇÃO CENTRAL DO SITE / APLICAÇÕES
 *
 * Durante a primeira fase da migração, mantenha useCustomDomain = false.
 * Assim o ranking continua usando exatamente a URL workers.dev atual.
 *
 * Depois que https://api.kamylisumire.com estiver testado, altere somente:
 * useCustomDomain: true
 *
 * O workers.dev continuará sendo usado como fallback.
 */
window.KAMYLI_CONFIG = Object.freeze({
    repository: {
        githubPagesHost: "kamylisouza.github.io",
        repositoryName: "kamylisumire-donates-page"
    },

    api: {
        useCustomDomain: false,
        customDomainUrl: "https://api.kamylisumire.com",
        workersDevUrl: "https://delicate-waterfall-52e1-api-donates-kamyli.annakamyli.workers.dev",
        fallbackToWorkersDev: true,
        defaultTimeoutMs: 8000
    }
});

window.KAMYLI_SITE_PATH = function(path) {
    const config = window.KAMYLI_CONFIG.repository;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    if (window.location.hostname === config.githubPagesHost) {
        return `/${config.repositoryName}${cleanPath}`;
    }

    return cleanPath;
};
