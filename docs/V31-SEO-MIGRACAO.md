# V31 — Migração para domínio principal + SEO

## Arquivos de indexação

### robots.txt

Publicado em:

```text
https://kamylisumire.com/robots.txt
```

Conteúdo:

```text
User-agent: *
Allow: /

Sitemap: https://kamylisumire.com/sitemap.xml
```

### sitemap.xml

Publicado em:

```text
https://kamylisumire.com/sitemap.xml
```

URLs indexáveis atuais:

```text
https://kamylisumire.com/
https://kamylisumire.com/doacoes/
```

A 404 não entra no sitemap e continua com `noindex`.

## SEO da Home

Título:

```text
Kamyli Sumire | Lives, agenda e comunidade
```

Descrição:

```text
Faço lives de joguinhos enquanto troco uma ideia com você. Por aqui você encontra minha agenda, minhas redes e todas as formas de acompanhar o conteúdo.
```

Canonical:

```text
https://kamylisumire.com/
```

Dados estruturados:

```text
WebSite
Person
```

As redes sociais públicas são declaradas em `sameAs`.

## SEO de Doações

Título:

```text
Doações | Kamyli Sumire — LivePix e Pixie
```

Descrição:

```text
Apoie as lives da Kamyli Sumire pelo LivePix ou Pixie e acompanhe o ranking de apoiadores.
```

Canonical:

```text
https://kamylisumire.com/doacoes/
```

Dados estruturados:

```text
WebPage
```

A social preview continua usando os textos históricos da antiga página de Doações.

## Migração do GitHub Pages

A branch `site-v2` já usa como CNAME:

```text
kamylisumire.com
```

A branch `main` antiga usa:

```text
donate.kamylisumire.com
```

Ao fazer o merge da nova versão para `main`, confirme que o arquivo final seja:

```text
CNAME
→ kamylisumire.com
```

Depois, em GitHub:

```text
Repository
→ Settings
→ Pages
→ Custom domain
→ kamylisumire.com
```

Aguarde o certificado e habilite:

```text
Enforce HTTPS
```

## DNS esperado no Cloudflare

Apex:

```text
A @ → 185.199.108.153
A @ → 185.199.109.153
A @ → 185.199.110.153
A @ → 185.199.111.153
```

Opcionalmente IPv6:

```text
AAAA @ → 2606:50c0:8000::153
AAAA @ → 2606:50c0:8001::153
AAAA @ → 2606:50c0:8002::153
AAAA @ → 2606:50c0:8003::153
```

www:

```text
CNAME www → kamylisouza.github.io
```

Durante a emissão inicial do certificado do GitHub Pages, prefira DNS-only.

## Redirect legado

Somente depois de `kamylisumire.com` estar funcionando corretamente:

```text
donate.kamylisumire.com
301 →
https://kamylisumire.com/doacoes/
```

Esse redirect deve ser feito no Cloudflare e não exige alterar o Worker do ranking.

## Google Search Console

Criar uma propriedade de domínio:

```text
kamylisumire.com
```

Verificar por DNS TXT no Cloudflare.

Depois enviar:

```text
https://kamylisumire.com/sitemap.xml
```

Também usar Inspeção de URL e solicitar indexação de:

```text
https://kamylisumire.com/
https://kamylisumire.com/doacoes/
```

## URLs antigas

Não é necessário pedir remoção da antiga página de Doações se
`donate.kamylisumire.com` responder permanentemente com 301 para a nova URL.

O redirecionamento permite que mecanismos de busca entendam a mudança.

## Infraestrutura preservada

A V31 não altera:

```text
workers.js
OAuth
KV RANKINGS
CORS
REDIRECT_URI
API endpoint
```
