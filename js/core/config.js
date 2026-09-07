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

/*
 * V43.7.3
 * Bootstrap estritamente limitado à Home.
 *
 * Mantém KAMYLI_CONFIG e KAMYLI_SITE_PATH inalterados e apenas carrega
 * os arquivos isolados desta versão quando #inicio existe na página.
 */
(() => {
    if (!document.getElementById("inicio")) return;

    const styleId = "kamyli-v43-7-3-style";
    const scriptId = "kamyli-v43-7-3-script";

    if (!document.getElementById(styleId)) {
        const link = document.createElement("link");
        link.id = styleId;
        link.rel = "stylesheet";
        link.href = "css/pages/v43-7-3.css";
        document.head.appendChild(link);
    }

    if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "js/pages/home/v43-7-3.js";
        script.async = false;
        document.head.appendChild(script);
    }
})();
