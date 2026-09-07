# V36 — Performance adaptativa + fundo AVIF

## Objetivos

1. usar o novo `assets/fundo.avif` sem remover os fallbacks existentes;
2. impedir que o loader force o download precoce do background;
3. aproveitar os sinais já usados pelo blur adaptativo para reduzir repaints e
   transferência em condições limitadas;
4. manter a escolha manual de blur independente da política de performance.

## Background

Ordem:

```css
background-image: image-set(
    url('../../assets/fundo.avif') type('image/avif'),
    url('../../assets/fundo.webp') type('image/webp'),
    url('../../assets/fundo.png') type('image/png')
);
```

O PNG também permanece como declaração de fallback anterior ao `image-set()`.

Não há preload da arte do fundo.

## Loader

O loader não usa mais nenhuma das imagens:

```text
fundo.avif
fundo.webp
fundo.png
```

Em vez disso, usa:

```text
var(--bg-color)
+ radial-gradient CSS
+ favicon.webp
```

Isso evita que uma imagem decorativa dispute prioridade com avatar, fontes,
JSONs e scripts da primeira renderização.

## Perfil adaptativo

`preferences.js` calcula um perfil separado do estado de blur:

```text
data-performance="normal|reduced"
data-performance-reason="standard|save-data|low-memory|low-cpu"
```

Política:

```text
Save-Data                 → reduced / remove imagem de fundo
deviceMemory <= 2 GB      → reduced / background scroll
hardwareConcurrency <= 2  → reduced / background scroll
demais casos              → normal
```

O perfil é recalculado em `pageshow` e em mudanças da API de conexão quando
disponível.

Mesmo que o usuário force blur ON/OFF manualmente, o perfil de performance
continua funcionando.

## CI

`validate-content.py` passa a exigir:

```text
assets/fundo.avif
```

e valida:

- `ftyp` ISO-BMFF;
- brand `avif` ou `avis`;
- quatro WebPs existentes;
- AVIF/WebP/PNG referenciados no background;
- loader sem fundo pesado;
- atributos de performance expostos por `preferences.js`.

## Não alterado

```text
workers.js
js/core/api.js
js/core/config.js
OAuth
KV RANKINGS
CORS
DNS
canonical
sitemap
```
