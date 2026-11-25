/*
 * V48.5.2 — Preferência de visualização (padrão ou compacto) da Agenda e de Jogos.
 *
 * - Guarda só a escolha do visitante, em `localStorage`, uma chave por página:
 *   `kamyli:ui-view-agenda` (standard | compact) e `kamyli:ui-view-jogos` (poster | compact).
 * - Valor ausente, inválido ou storage indisponível (modo privado, bloqueio): usa o modo padrão
 *   da página, e a escolha continua valendo na sessão porque a página a guarda em memória.
 * - Nunca é lido por rede nem enviado a lugar nenhum; ver a seção 6 da Política de Privacidade.
 */
(() => {
    "use strict";

    const PAGES = Object.freeze({
        agenda: Object.freeze({ key: "kamyli:ui-view-agenda", modes: Object.freeze(["standard", "compact"]) }),
        jogos: Object.freeze({ key: "kamyli:ui-view-jogos", modes: Object.freeze(["poster", "compact"]) })
    });

    function get(page) {
        const config = PAGES[page];
        if (!config) return null;
        let saved = null;
        try {
            saved = localStorage.getItem(config.key);
        } catch {
            saved = null;
        }
        return config.modes.includes(saved) ? saved : config.modes[0];
    }

    function set(page, mode) {
        const config = PAGES[page];
        if (!config || !config.modes.includes(mode)) return get(page);
        try {
            localStorage.setItem(config.key, mode);
        } catch {
            // Sem storage a escolha vale só nesta visita.
        }
        return mode;
    }

    window.KAMYLI_VIEW_MODE = Object.freeze({ get, set });
})();
