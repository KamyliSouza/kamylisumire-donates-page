# AGENTS.md — Referência para agentes de IA

Este arquivo descreve como o site da Kamyli Sumire está organizado e quais regras devem ser respeitadas por qualquer agente de IA que edite, revise ou estenda o projeto.

---

## 1. Objetivo do projeto

O projeto é um site estático modular hospedável em GitHub Pages e utilizável em Cloudflare Pages para previews.

Estrutura funcional esperada:

- `kamylisumire.com/` → página inicial.
- `kamylisumire.com/doacoes/` → página de doações.
- `donate.kamylisumire.com` → futuramente deve redirecionar com HTTP 301 para `/doacoes/`.
- A API atualmente continua hospedada em um endereço `workers.dev`.
- Futuramente a API poderá usar `https://api.kamylisumire.com`, mas o endereço `workers.dev` deve permanecer funcional como fallback enquanto essa transição estiver ativa.

O projeto deve continuar simples, estático e modular. Não introduza frameworks ou sistemas de build sem necessidade explícita.

---

## 2. Princípios de arquitetura

A estrutura segue três níveis.

### Core

Código e estilos compartilhados globalmente:

- configuração;
- API;
- navbar;
- variáveis de tema;
- estilos globais.

### Components

Elementos reutilizáveis que não pertencem exclusivamente a uma página.

Exemplo atual:

- ranking.

### Pages

Código e estilos específicos de cada página.

Exemplos atuais:

- Home;
- Doações.

Regra principal:

> Uma funcionalidade específica de uma página não deve ser colocada em `core` sem uma razão real de reutilização.

---

## 3. Estrutura de diretórios

```text
/
├── index.html
├── 404.html
├── CNAME
├── .nojekyll
├── workers.js
│
├── avatar.png
├── favicon.png
├── fundo.png
├── preview.png
│
├── doacoes/
│   └── index.html
│
├── css/
│   ├── core/
│   │   ├── variables.css
│   │   ├── global.css
│   │   └── navbar.css
│   │
│   ├── components/
│   │   └── ranking.css
│   │
│   └── pages/
│       ├── home.css
│       └── doacoes.css
│
├── js/
│   ├── core/
│   │   ├── config.js
│   │   ├── api.js
│   │   └── navbar.js
│   │
│   └── pages/
│       ├── home/
│       │   └── home.js
│       │
│       └── doacoes/
│           ├── doacoes.js
│           └── ranking.js
│
└── data/
    └── agenda.json
```

---

## 4. Responsabilidades

### `/index.html`

Página inicial.

Responsabilidades:

- apresentação da Kamyli;
- agenda semanal;
- redes sociais;
- links úteis;
- regras;
- créditos;
- CTA para `/doacoes/`.

Não deve conter lógica de ranking ou lógica específica de doações.

### `/doacoes/index.html`

Página isolada de doações.

Responsabilidades:

- links do LivePix/Pixie;
- ranking de apoiadores;
- apresentação específica da página de apoio.

Não deve depender de `home.js` ou `home.css`.

### `/css/core/variables.css`

Tokens visuais globais:

- cores;
- sombras;
- bordas;
- tema claro/escuro;
- variáveis de design.

### `/css/core/global.css`

Somente estilos realmente compartilhados:

- reset;
- `body`;
- fundo;
- tipografia;
- botões genéricos;
- painéis;
- footer;
- utilidades.

Não colocar estilos exclusivos de agenda, ranking ou doações aqui.

### `/css/core/navbar.css`

Somente estilos da navegação compartilhada.

### `/css/components/ranking.css`

Estilos do componente de ranking.

### `/css/pages/home.css`

Somente estilos da Home.

### `/css/pages/doacoes.css`

Somente estilos da página de doações.

### `/js/core/config.js`

Fonte central de configuração.

A configuração atual deve começar com:

```js
useCustomDomain: false
```

Isso mantém a API usando o endereço `workers.dev`.

Também contém:

- URL futura `https://api.kamylisumire.com`;
- URL atual `workers.dev`;
- fallback;
- dados necessários para compatibilidade com GitHub Pages.

Regra:

> URLs de infraestrutura compartilhadas não devem ser duplicadas em arquivos de página.

### `/js/core/api.js`

Camada única de acesso à API.

Páginas devem usar:

```js
const data = await KamyliAPI.getJSON("/endpoint");
```

ou:

```js
const response = await KamyliAPI.request("/endpoint", options);
```

A página não deve montar manualmente a URL do Worker.

Responsabilidades:

- escolher domínio customizado ou `workers.dev`;
- fallback;
- timeout;
- headers comuns.

### `/js/core/navbar.js`

Gera a barra de navegação compartilhada.

Responsabilidades:

- links principais;
- página ativa;
- menu mobile;
- compatibilidade com domínio customizado e GitHub Pages.

Ao adicionar uma nova página ao menu principal, alterar este arquivo.

### `/js/pages/home/home.js`

Responsável pela agenda.

Carrega:

```text
/data/agenda.json
```

A agenda não deve usar o Worker.

### `/js/pages/doacoes/doacoes.js`

Comportamentos específicos da página de doações.

### `/js/pages/doacoes/ranking.js`

Responsável pelo ranking.

Deve consumir a API exclusivamente por `KamyliAPI`.

Não armazenar diretamente a URL do `workers.dev`.

### `/data/agenda.json`

Arquivo editável da programação semanal.

Deve conter os sete dias da semana.

Exemplo com live:

```json
{
  "id": "segunda",
  "nome": "Segunda-feira",
  "data": "2026-09-07",
  "temLive": true,
  "horario": "20:00",
  "titulo": "Minecraft",
  "descricao": "Continuando nossa survival!",
  "plataformas": ["YouTube", "Twitch"]
}
```

Exemplo sem live:

```json
{
  "temLive": false,
  "horario": "",
  "titulo": "",
  "descricao": "",
  "plataformas": []
}
```

### `/workers.js`

Código do Cloudflare Worker utilizado pela API/ranking.

Dependências importantes:

- binding KV `RANKINGS`;
- `STREAMLABS_CLIENT_ID`;
- `STREAMLABS_CLIENT_SECRET`;
- `OAUTH_SETUP_TOKEN`;
- `REDIRECT_URI`;
- `ALLOWED_ORIGIN` ou `ALLOWED_ORIGINS`.

Regra crítica:

> Não crie um Worker novo apenas para reorganizar ou estender o site. O Worker existente deve ser preservado.

---

## 5. Invariantes

### API atual

O endpoint atual `workers.dev` deve continuar funcional.

A migração para:

```text
https://api.kamylisumire.com
```

deve ocorrer apenas após criação e teste do Custom Domain.

Durante a migração:

```js
fallbackToWorkersDev: true
```

deve permanecer habilitado.

### Home independente

A Home deve continuar funcionando mesmo com a API indisponível.

Agenda:

```text
/data/agenda.json
```

e não Worker.

### Home e Doações isoladas

Evitar:

- `home.js` em `/doacoes/`;
- `ranking.js` na Home;
- `home.css` em `/doacoes/`;
- `doacoes.css` na Home.

Compartilhar apenas o que pertence ao `core`.

### Navbar única

Não copiar menus diferentes em múltiplos HTMLs.

Usar:

```text
/js/core/navbar.js
```

### Assets oficiais

Não substituir automaticamente:

- `avatar.png`;
- `favicon.png`;
- `fundo.png`;
- `preview.png`.

### Branches

Fluxo esperado:

```text
main
└── produção

site-v2
└── preview/desenvolvimento
```

Alterações experimentais devem ir primeiro para `site-v2`.

---

## 6. Preview no Cloudflare Pages

Configuração planejada:

- repositório GitHub conectado;
- Production branch: `main`;
- Preview branch: `site-v2`;
- Framework: `None`;
- Build command: `exit 0`;
- Root directory: raiz;
- Output directory: `.`;
- Preview usando domínio `pages.dev`.

Não apontar `kamylisumire.com` para o preview.

---

## 7. CORS

A página `/doacoes/` chama o Worker a partir de outro domínio.

Origens que podem precisar estar autorizadas:

```text
https://donate.kamylisumire.com
https://kamylisumire.com
https://www.kamylisumire.com
https://site-v2.<projeto>.pages.dev
```

O Worker foi preparado para múltiplas origens através de:

```text
ALLOWED_ORIGINS
```

separadas por vírgula.

Exemplo:

```text
https://donate.kamylisumire.com,https://kamylisumire.com,https://www.kamylisumire.com,https://site-v2.kamylisumire-site.pages.dev
```

---

## 8. Como adicionar uma nova página/aplicação

Exemplo:

```text
/sorteio/
```

Criar:

```text
sorteio/
└── index.html

css/pages/
└── sorteio.css

js/pages/
└── sorteio/
    └── sorteio.js
```

No HTML carregar o core e o CSS da página.

Exemplo para `/sorteio/`:

```html
<link rel="stylesheet" href="../css/core/variables.css">
<link rel="stylesheet" href="../css/core/global.css">
<link rel="stylesheet" href="../css/core/navbar.css">
<link rel="stylesheet" href="../css/pages/sorteio.css">
```

Scripts:

```html
<script src="../js/core/config.js"></script>
<script src="../js/core/api.js"></script>
<script src="../js/core/navbar.js"></script>
<script src="../js/pages/sorteio/sorteio.js"></script>
```

Se precisar do backend:

```js
const data = await KamyliAPI.getJSON("/sorteio");
```

Se não precisar, não adicionar chamadas de API.

---

## 9. Quando criar um componente

Use `css/components/` e, quando necessário, uma futura pasta `js/components/` quando o elemento:

- for usado por mais de uma página;
- tiver comportamento próprio;
- não pertencer ao `core`.

Exemplos:

```text
components/
├── ranking
├── modal
├── toast
├── cards
└── player
```

Não transformar algo exclusivo de uma página em componente apenas por estética organizacional.

---

## 10. URLs esperadas

Após a migração:

```text
https://kamylisumire.com/
https://kamylisumire.com/doacoes/
https://api.kamylisumire.com
```

Compatibilidade:

```text
https://donate.kamylisumire.com
    301 →
https://kamylisumire.com/doacoes/
```

O endereço `workers.dev` deve continuar disponível durante a transição da API.

---

## 11. Domínio personalizado da API

Quando `api.kamylisumire.com` for configurado, ele deve apontar para o mesmo Worker existente.

Não criar um Worker novo.

Depois que o domínio estiver funcional e testado:

```js
useCustomDomain: true
```

em:

```text
/js/core/config.js
```

O fallback para `workers.dev` deve permanecer inicialmente.

---

## 12. Caminhos e GitHub Pages

O projeto pode ser testado também em:

```text
kamylisouza.github.io/kamylisumire-donates-page/
```

`window.KAMYLI_SITE_PATH()` existe para resolver caminhos nesse cenário.

Ao gerar links internos via JavaScript, preferir:

```js
KAMYLI_SITE_PATH("/alguma-rota/")
```

quando necessário.

---

## 13. Segurança

Nunca colocar no frontend:

- `STREAMLABS_CLIENT_SECRET`;
- tokens OAuth;
- `OAUTH_SETUP_TOKEN`;
- credenciais;
- segredos Cloudflare;
- chaves privadas.

Esses valores pertencem exclusivamente às secrets/variables do Worker.

---

## 14. Boas práticas para agentes de IA

Antes de editar:

1. identificar se a alteração pertence a `core`, `components` ou `pages`;
2. verificar se já existe módulo responsável;
3. evitar duplicação;
4. preservar compatibilidade com `site-v2`;
5. preservar Worker e endpoint atuais;
6. não alterar DNS/domínios sem solicitação explícita.

Ao criar uma funcionalidade:

1. manter CSS específico na página;
2. manter JS específico na página;
3. mover para componente apenas se houver reutilização real;
4. usar `KamyliAPI` para backend;
5. usar `KAMYLI_SITE_PATH` quando necessário;
6. evitar dependências externas desnecessárias.

---

## 15. Não fazer sem autorização explícita

- Não migrar todo o site para React/Vue/Svelte.
- Não substituir GitHub Pages como produção.
- Não desativar `workers.dev`.
- Não recriar o Worker.
- Não substituir/recriar o KV `RANKINGS`.
- Não alterar OAuth do Streamlabs sem necessidade.
- Não remover fallback da API durante a migração.
- Não fazer mudanças DNS implícitas.
- Não misturar Home e Doações num único módulo.
- Não mover agenda para o Worker sem necessidade.
- Não incluir secrets no repositório.

---

## 16. Estado planejado da migração

A base arquitetural pretende manter:

- estrutura modular;
- Home separada;
- `/doacoes/` separada;
- navbar compartilhada;
- agenda em JSON;
- API encapsulada em `js/core/api.js`;
- endpoint `workers.dev` preservado;
- suporte futuro a `api.kamylisumire.com`;
- preview pelo Cloudflare Pages.

Fluxo esperado:

1. subir esta estrutura em `site-v2`;
2. configurar Preview Deployment;
3. testar Home, agenda, navbar e `/doacoes/`;
4. ajustar CORS se necessário;
5. migrar o domínio principal somente após testes;
6. adicionar o domínio personalizado da API posteriormente.

---

## 17. Regra final

Se uma alteração puder quebrar:

- produção;
- endpoint `workers.dev`;
- OAuth;
- KV;
- domínio;
- ranking;
- redirect legado;

trate-a como uma alteração de infraestrutura.

Prefira mudanças locais, modulares, testáveis e reversíveis.
