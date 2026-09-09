/*
 * CONFIGURAÇÃO CENTRAL DO SITE / APLICAÇÕES
 *
 * A Home permanece majoritariamente local.
 * Desde a V47.4, somente a aba Twitch de Lives e /doacoes/ consomem a API.
 *
 * V44.4:
 * - api.kamylisumire.com é o endpoint primário de produção;
 * - workers.dev permanece como fallback temporário de segurança;
 * - OAuth/CORS/segredos continuam configurados fora do frontend.
 */
window.KAMYLI_CONFIG = Object.freeze({
    repository: {
        githubPagesHost: "kamylisouza.github.io",
        repositoryName: "kamylisumire-donates-page"
    },
    api: {
        useCustomDomain: true,
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
