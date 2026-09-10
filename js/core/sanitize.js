/*
 * SANITIZAÇÃO COMPARTILHADA
 *
 * Usado pelos módulos que montam HTML via innerHTML a partir de conteúdo
 * editorial (data/content/*.json) para evitar que caracteres especiais
 * quebrem o markup ou permitam injeção. Antes desta versão, a mesma
 * implementação estava duplicada em footer.js, home.js e
 * js/pages/home/content.js.
 *
 * Uso:
 *   window.KamyliSanitize.escapeHtml(valor)
 */
window.KamyliSanitize = Object.freeze({
    escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
});
