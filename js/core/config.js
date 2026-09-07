/*
 * CONFIGURAÇÃO CENTRAL DO SITE / APLICAÇÕES
 *
 * A Home permanece totalmente estática.
 * Somente /doacoes/ consome a API do ranking.
 *
 * Enquanto o domínio customizado da API não for ativado deliberadamente,
 * mantenha useCustomDomain = false.
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
