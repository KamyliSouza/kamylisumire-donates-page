# V39.1 — Hotfix de documentação e CI

## Escopo

Este hotfix não altera comportamento visual nem funcional.

Corrige apenas:

- documentação de assets;
- registro da V39 no changelog/documentação;
- validação dos avatares responsivos;
- validação do AVIF desktop/mobile;
- disparo e checagem sintática dos JavaScripts da V39.

## AVIF

`assets/fundo.avif` já existe na `main` e é o asset de desktop/tablet em
produção. Não deve ser tratado como pré-requisito pendente.

O CI verifica:

```text
fundo.avif
fundo-mobile.avif
```

por presença e assinatura AVIF.

Nenhum limite rígido de tamanho é imposto, permitindo substituir
`fundo.avif` por versões mais comprimidas mantendo o mesmo caminho.

## Avatares

São obrigatórios na V39:

```text
avatar-192.webp
avatar-384.webp
```

`avatar.webp` permanece apenas por compatibilidade/histórico.

## JavaScript

O workflow executa:

```bash
node --check js/core/loader.js
node --check js/pages/home/home.js
```

e também é acionado quando esses arquivos mudam.
