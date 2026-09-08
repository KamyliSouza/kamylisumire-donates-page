V45.2.3 — HOTFIX DE TIMING DO LOADER
=====================================

Arquivo para ajuste manual
--------------------------
js/core/loader.js

Procure:
    const PAGE_REVEAL_DELAY_MS = 150;
    const PAGE_REVEAL_OVERLAP_MS = 0;

PAGE_REVEAL_DELAY_MS
--------------------
Pausa REAL depois que o loader já desapareceu e foi removido.

0   = página entra imediatamente
100 = espera 100 ms
250 = espera 250 ms
500 = espera 500 ms

PAGE_REVEAL_OVERLAP_MS
----------------------
Entrada da página ANTES do loader terminar.

0   = sem overlap
100 = página começa 100 ms antes do fim do loader
150 = página começa 150 ms antes do fim do loader

Se OVERLAP > 0, o delay pós-loader é ignorado.

Confirmação no DevTools
-----------------------
Inspecione a tag <html>. Ela deve mostrar:
    data-loader-timing-version="45.2.3"
    data-page-reveal-delay-ms="150"
    data-page-reveal-overlap-ms="0"

Se isso não aparecer, o loader novo não foi carregado.

Cache-buster
------------
Home, Doações e 404 passam a carregar:
    loader.js?v=45.2.3

Se editar loader.js manualmente depois e notar cache antigo, incremente esse
parâmetro nos três HTMLs (ex.: ?v=45.2.4).
