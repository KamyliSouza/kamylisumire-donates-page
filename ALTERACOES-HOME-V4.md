# ALTERACOES-HOME-V4.md

Atualização de UX da Home solicitada para a `site-v2`.

## Alterações

### Navbar

- remove o texto "Kamyli Sumire";
- usa somente `assets/favicon.png` como logo;
- centraliza os links no desktop;
- mantém `Início`, `Agenda` e `Doações`;
- transforma `Links úteis` em dropdown;
- dropdown contém Jogos das lives, Regras e Créditos;
- dropdown e menu mobile possuem suporte a Escape, clique externo e `aria-expanded`.

### Hero

- avatar passa a usar frame responsivo com `clamp()`;
- imagem usa `object-fit: contain`, evitando corte indevido;
- redes sociais entram no próprio hero;
- redes aparecem como botões circulares;
- ícones são SVG inline, sem CDN ou dependência externa;
- seção grande separada de Redes sociais foi removida.

### Organização

- seção visual `Links úteis` foi removida da Home;
- Regras e Créditos continuam como conteúdo da página e são acessados pelo dropdown;
- não há alteração em Worker, API, ranking, agenda ou assets.

## Arquivos substituídos

```text
index.html
js/core/navbar.js
css/core/navbar.css
css/pages/home.css
DESIGN-SYSTEM.md
```

## Aplicação

Extraia na raiz da branch `site-v2` e substitua os arquivos existentes.

Depois:

```bash
git add -A
git commit -m "style: otimiza home e navbar"
git push
```
