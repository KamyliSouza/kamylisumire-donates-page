# CHANGELOG

## V29 — aviso global de links externos

- aviso de redirecionamento removido de `navbar.js`;
- novo `js/core/external-links.js`;
- confirmação aplicada a todos os links externos `http/https`;
- funciona também em links inseridos dinamicamente por JSON;
- preserva `target="_blank"` e intenção de nova aba;
- links internos continuam sem confirmação;
- Home, Doações e 404 carregam o mesmo módulo;
- suporte opcional a `data-external-warning="skip"` para exceções futuras;
- Worker/API/OAuth/KV/CORS não alterados.

## V28 — saneamento e documentação

- 404 atualizada;
- removido `api.js` da Home;
- removido CSS morto do fade antigo;
- breakpoints duplicados consolidados;
- seletor obsoleto `agenda-heading-actions` removido;
- fundo mobile com `background-attachment: scroll`;
- documentação reescrita;
- README principal adicionado;
- workflow para validar JSONs;
- Worker/API/OAuth/KV/CORS não alterados.

## V25–V27

- conteúdo editorial em `data/content/`;
- `KamyliContent`;
- footer global;
- loader com favicon;
- favicon da navbar em cor primária;
- toggle de blur com gota SVG.

## V18–V24

- claro/escuro;
- blur on/off;
- Doações normalizada;
- LivePix/Pixie em SVG;
- aviso alinhado.

## V10–V17

- carrossel;
- cards da agenda reorganizados;
- scrollspy;
- rolagem natural;
- correções mobile.

## Base modular

- Home/Doações isoladas;
- core/components/pages;
- agenda local;
- API encapsulada;
- Worker/KV preservados.
