V45.2.2 — DELAY ENTRE LOADER E PÁGINA
=======================================

Sequência visual:
1. loader visível;
2. página escondida;
3. loader fade-out: 320 ms;
4. loader removido;
5. pausa: 150 ms;
6. página inicia reveal.

Mantido:
- loader translúcido com blur;
- tema claro/escuro;
- blur off;
- preload/decode do fundo;
- API, Worker, Helper e conteúdo sem mudanças.

Limitação aceita:
Pode existir um pequeno ajuste de composição do blur dos cards depois do
reveal. Esta versão prioriza impedir que a página apareça atrás do loader.
