V45.1 — BLUR PRIMING FIX
=========================

Escopo
------
Correção isolada do atraso perceptível do blur após a saída do loader.

Arquivos alterados
------------------
- js/core/loader.js
- CHANGELOG.md

O CSS global NÃO precisa ser substituído nesta versão.
A correção usa as classes atuais (.glass-panel, .site-nav, .site-footer)
e controla o ciclo temporário de composição pelo loader.

Mudança principal
-----------------
V45:
  primava .site-nav + main + footer
  removia will-change depois de 2 frames

V45.1:
  prima .site-nav + TODAS as .glass-panel + .site-footer
  mantém os contêineres de reveal quase invisíveis atrás do loader
  aguarda 3 frames
  mantém will-change durante todo o reveal
  limpa will-change somente depois dos 420 ms da animação

Restrições preservadas
----------------------
- blur desligado: sem priming
- data-performance="reduced": sem priming
- prefers-reduced-motion: sem priming
- tempo mínimo do loader: continua 1000 ms
- nenhuma mudança em conteúdo/API/Worker/Helper
