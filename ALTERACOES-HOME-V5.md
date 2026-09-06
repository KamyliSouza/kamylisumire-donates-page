# ALTERACOES-HOME-V5.md

Atualização de UX da Home para a `site-v2`.

## Navbar

A navegação passa a usar:

```text
[logo] | Início  Agenda  Jogos  Regras  Créditos  Doações
```

- sem dropdown;
- sem título textual ao lado da logo;
- logo usa `assets/favicon.png`;
- logo fica à esquerda dos botões;
- uma barra vertical separa a logo da lista;
- em telas estreitas a lista continua no topo e possui rolagem horizontal;
- o botão `Doações` não possui coração.

## Agenda

Os sete dias continuam sendo lidos de `data/agenda.json`, mas agora são exibidos como carrossel horizontal.

Recursos:

- `scroll-snap`;
- botões anterior/próximo;
- gesto de scroll horizontal/touch;
- teclas `←` e `→` quando o carrossel está focado;
- cards responsivos;
- nenhum dado da agenda foi movido para o HTML.

## Hero

- avatar permanece responsivo;
- redes sociais ficam reunidas em botões circulares;
- todos os ícones usam `--primary-color`;
- não existem cores específicas de YouTube, Twitch, Instagram etc.;
- os botões de doação/apoio não possuem coração.

## Arquivos deste pacote

```text
index.html
css/core/navbar.css
css/pages/home.css
js/core/navbar.js
js/pages/home/home.js
ALTERACOES-HOME-V5.md
```

## Não alterado

```text
workers.js
js/core/api.js
js/core/config.js
js/pages/doacoes/*
css/pages/doacoes.css
css/components/ranking.css
data/agenda.json
assets/*
CNAME
```

## Aplicação

Extraia o pacote sobre a raiz da branch `site-v2` e substitua os arquivos existentes.

```bash
git add -A
git commit -m "style: adiciona carrossel e reorganiza navbar"
git push
```
