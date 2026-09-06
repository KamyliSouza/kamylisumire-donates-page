# ALTERACOES-NAVBAR-SCROLLSPY-V9.md

## Scroll da navbar acompanhando a seção ativa

A navbar agora usa um comportamento de `scrollspy`.

Na Home:

- `Início`, `Agenda`, `Regras` e `Créditos` acompanham a rolagem da página;
- a seção visível recebe automaticamente `.is-active`;
- quando o item ativo está fora da área visível da navbar horizontal, a barra desliza suavemente para centralizá-lo;
- clicar diretamente em um link também atualiza o estado ativo imediatamente.

Em `/doacoes/`:

- o item `Doações` recebe `.is-active` ao carregar;
- a navbar horizontal se posiciona automaticamente para manter `Doações` visível.

## Técnica usada

```text
IntersectionObserver
        ↓
detecta seção atual
        ↓
adiciona .is-active
        ↓
scrollTo() na .site-nav-links
        ↓
item ativo permanece visível/centralizado
```

Não há listeners pesados de `scroll` na página.

## Links externos

O aviso de redirecionamento externo da V8 continua preservado.

## Arquivo alterado

```text
js/core/navbar.js
```
