# Produção e ambientes

## Estado atual

A migração para o domínio principal está concluída.

```text
https://kamylisumire.com/          produção
https://kamylisumire.com/doacoes/  produção
https://donate.kamylisumire.com/   redirect 301 para /doacoes/
```

Preview:

```text
https://site-v2.kamylisumire-site.pages.dev/
```

## Hospedagem

```text
main     → GitHub Pages
site-v2  → Cloudflare Pages
```

Não há framework, bundler ou build obrigatório.

A CI customizada apenas audita o conteúdo/código antes ou depois dos commits;
ela não gera os arquivos usados pelo GitHub Pages.

## HTTPS

Produção deve permanecer em HTTPS.

## SEO

Indexáveis:

```text
https://kamylisumire.com/
https://kamylisumire.com/doacoes/
```

A 404 permanece `noindex`.

`robots.txt` deve apontar para:

```text
https://kamylisumire.com/sitemap.xml
```

O sitemap deve conter somente as URLs públicas/canônicas.

## Preview

`_headers` protege os hosts `*.pages.dev` com:

```text
X-Robots-Tag: noindex
```

O GitHub Pages não usa `_headers` como header de produção; o arquivo existe
para o preview do Cloudflare Pages.

## Conteúdo

```text
data/agenda.json
data/content/
```

## API

O ranking de Doações usa:

```text
js/core/config.js
js/core/api.js
workers.js
```

Endpoint, OAuth, KV, CORS e domínio customizado da API devem ser tratados
separadamente.

## CI

```text
.github/workflows/validate-json.yml
→ .github/scripts/validate-content.py
→ node --check em js/**/*.js
```

## Checklist de publicação

1. CI verde;
2. Home abre sem erro;
3. Doações abre sem erro;
4. agenda carrega;
5. Regras/Créditos carregam;
6. navbar e scrollspy funcionam;
7. tema/blur funcionam;
8. links externos exibem aviso;
9. ranking mantém fallback se a API falhar;
10. 404 continua `noindex`;
11. canonical/robots/sitemap permanecem coerentes.

## V41 — caminho crítico

Nunito é servida pelo próprio domínio.

Não há mais dependência de:

```text
fonts.googleapis.com
fonts.gstatic.com
```

Home, Doações e 404 fazem preload do WOFF2.

A CI valida fonte/licença, ausência de Google Fonts, CSS modular e transições.

A transição Home → Doações não altera Worker, OAuth, KV, CORS, DNS ou ranking.

## V42 — preferências e loader

A preferência de tema agora aceita `auto`, `light` e `dark`; o blur aceita
`auto`, `on` e `off`.

A CI valida os três estados, o botão Apoiar fixo à direita, o menu no rodapé e
o loader transparente de no mínimo 1 segundo.

A mudança é somente de frontend e não altera Worker, API, OAuth, KV, CORS ou
DNS.

## V43.1 — carrossel de lives em popup

A integração continua estática no GitHub Pages.

O navegador carrega a IFrame Player API somente quando a seção Lives se
aproxima da viewport, usa `getPlaylist()` para montar as thumbnails e destrói o
player auxiliar.

O player de reprodução é criado somente dentro de um `dialog` depois do clique
do visitante e é removido ao fechar.

Não existem credenciais, Google Cloud ou workflow de sincronização.

Nenhuma configuração de Worker/API foi alterada.

## V43.2 — popup com troca de lives

O popup reaproveita os IDs já descobertos na Home para montar um mini-carrossel.
Nenhuma chamada adicional de backend/API é necessária.

Trocar de live substitui somente o iframe do player. O `dialog` permanece
aberto e o iframe anterior é descartado.

## V43.3 — ritmo visual dos cards

A correção é exclusivamente CSS/design-system. Não há alteração de dados,
integrações ou publicação.

O intervalo título → descrição dos cards de conteúdo passa a ser governado por
`--card-title-description-gap: 8px`.

## V43.4 — borda dos cards de Lives

Correção exclusivamente visual em `css/components/lives.css`.

O frame adicional é renderizado sobre a thumbnail e não modifica a integração
com o YouTube, dados, deploy ou APIs.

### Revisão do loader na V43.4

A duração mínima continua definida pelo JavaScript em 1000 ms. O CSS apenas
torna a pulsação da logo mais rápida e mais ampla para que o movimento seja
perceptível antes da revelação da página.

Reduced motion e performance reduzida continuam sem animação.

## V43.5 — alinhamento dos carrosséis

Correção exclusivamente CSS/design-system. Agenda, Lives e o mini-carrossel do
popup usam espaços laterais menores e consistentes.

Nenhuma integração ou lógica JavaScript foi alterada.

## V43.6 — conformidade do YouTube

A página deixa de criar qualquer player YouTube automaticamente.

A API IFrame e o player são carregados apenas depois do clique em `Carregar
lives`. O player fica visível no dialog, com viewport mínima de 200×200, e é
destruído quando o popup fecha.

Nenhuma chave, Google Cloud ou backend foi adicionado.

## V43.6.1 — Lives manuais

A Home não cria mais player do YouTube. O conteúdo é lido de `videos` em
`data/content/lives.json`; thumbnails carregam diretamente do YouTube e os cards
abrem a página oficial do vídeo.

O hotfix não sobrescreve `lives.json`. Adicione manualmente o array seguindo
`data/content/lives.example.json`.

