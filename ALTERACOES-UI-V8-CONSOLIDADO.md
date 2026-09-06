# ALTERACOES-UI-V8-CONSOLIDADO.md

Este pacote consolida as últimas alterações de interface da `site-v2`.

## Incluído

### Home

- agenda em carrossel horizontal;
- botões anterior/próximo;
- suporte a touch, scroll-snap e teclado;
- redes sociais em ícones circulares usando `--primary-color`;
- avatar responsivo;
- botões de apoio/doações sem coração.

### Navbar

- barra fixa no topo;
- conjunto `logo + divisória + links` centralizado no desktop;
- logo utiliza `assets/favicon.png`;
- lista completa de páginas no topo, sem dropdown;
- rolagem horizontal em telas pequenas;
- botão de doações sem coração.

### Página de doações

- avatar centralizado por wrapper de layout;
- imagem responsiva com `object-fit: contain`;
- coração de "Muito obrigada" convertido de emoji para SVG;
- coração usa `fill: currentColor`, acompanhando `--primary-color`.

### Aviso de links externos

Links externos localizados na navbar são detectados automaticamente.

Ao clicar em um link externo, como o Trello de `Jogos`, o site exibe um modal:

```text
Abrir link externo?

Você está saindo deste site e será direcionado para trello.com.

[ Cancelar ] [ Continuar ]
```

O comportamento é genérico: futuros links externos adicionados à navbar também recebem o aviso automaticamente.

O modal:

- usa o design system existente;
- mostra o hostname de destino;
- abre o destino em nova aba;
- usa `noopener,noreferrer`;
- pode ser fechado com Cancelar, Escape ou clique no fundo;
- usa `<dialog>` nativo com fallback para `window.confirm()`.

## Arquivos substituídos

```text
index.html
doacoes/index.html

css/core/navbar.css
css/pages/home.css
css/pages/doacoes.css

js/core/navbar.js
js/pages/home/home.js
```

## Não alterado

```text
workers.js
js/core/api.js
js/core/config.js
js/pages/doacoes/*
css/components/ranking.css
data/agenda.json
assets/*
CNAME
```

## Aplicação

Extraia este ZIP sobre a raiz da branch `site-v2` e permita a substituição dos arquivos.

```bash
git add -A
git commit -m "style: consolida UI e adiciona aviso externo"
git push
```
