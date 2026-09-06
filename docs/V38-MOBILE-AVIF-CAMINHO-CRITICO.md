# V38 — Fundo mobile AVIF e caminho crítico

## Objetivos

1. Evitar que celulares usem como primeira opção o fundo desktop.
2. Remover a requisição síncrona de `preferences.js` do caminho crítico.

## Background

```text
desktop/tablet:
fundo.avif
  ↓
fundo.webp
  ↓
fundo.png

mobile <= 760 px:
fundo-mobile.avif
  ↓
fundo.webp
  ↓
fundo.png
```

`Save-Data` continua prevalecendo e remove a imagem decorativa.

## Preferências

Antes da V38:

```text
HTML
↓
preferences.js externo síncrono
↓
Google Fonts/CSS
```

Na V38:

```text
HTML
↓
bootstrap inline pequeno
↓
Google Fonts/CSS
↓
conteúdo
↓
preferences.js completo
↓
navbar e módulos
```

O bootstrap aplica imediatamente:

```text
data-theme
data-blur
data-blur-mode
data-blur-preference
data-blur-reason
data-performance
data-performance-reason
```

Isso preserva o estado visual inicial sem exigir uma requisição JavaScript
antes da descoberta dos stylesheets.

## Compatibilidade

O módulo completo `preferences.js` continua sendo a fonte de verdade para:

- persistência;
- toggles;
- listeners;
- reavaliação adaptativa;
- API `KAMYLI_UI_PREFS`.

## Pré-requisito

Adicionar ao repositório o arquivo real:

```text
assets/fundo-mobile.avif
```

Nenhum placeholder é fornecido pela V38.
