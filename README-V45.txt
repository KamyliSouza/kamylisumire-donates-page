V45 — SISTEMA EDITORIAL GLOBAL

NOVO
- navbar.json
- interface.json
- 404.json
- seo.json
- js/core/content.js com conteúdo global e sinal KAMYLI_GLOBAL_UI_READY
- js/core/loader.js com blur priming antes da animação

MANTIDO
- Hero, Lives, Agenda, Regras, Créditos, CTA, Doações, Ranking e Footer
  continuam usando seus JSONs existentes.
- api.kamylisumire.com permanece primária, com workers.dev fallback.

SEO
O Helper V45 gera HTML estático para Open Graph/Twitter/WhatsApp.
Não depende de JavaScript de runtime para preview social.
