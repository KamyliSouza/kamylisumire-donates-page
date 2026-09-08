V45.2.1 — LOADER COM BLUR RESTAURADO

Esta versão restaura o visual translúcido do loader.

Mantido:
- conteúdo real continua renderizável atrás do loader;
- preload/decode do fundo da V45.2;
- warm-up de .glass-panel/.site-nav/.site-footer;
- tema claro/escuro;
- blur desligado continua removendo o filtro.

Restaurado:
- background-color: var(--card-bg)
- backdrop-filter: blur(var(--blur-card))

Limitação conhecida:
Pode existir um pequeno intervalo perceptível entre a saída do loader e a
composição final do blur em alguns navegadores/dispositivos. Esse comportamento
é aceito nesta versão e não será tratado como falha de validação.
