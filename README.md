# Kamyli Sumire — Site

Site estático e modular da Kamyli Sumire.

## Produção

```text
https://kamylisumire.com/
```

Páginas públicas:

```text
/          Home
/doacoes/  Doações + ranking
```

O endereço legado:

```text
https://donate.kamylisumire.com
```

redireciona permanentemente para `/doacoes/`.

## Ambientes

```text
main    → produção / GitHub Pages
site-v2 → preview / Cloudflare Pages
```

Preview técnico:

```text
https://site-v2.kamylisumire-site.pages.dev
```

Os ambientes `pages.dev` não devem ser indexados.

## Stack

- HTML;
- CSS;
- JavaScript vanilla;
- JSON para conteúdo editorial;
- GitHub Pages em produção;
- Cloudflare Pages para preview;
- Worker existente somente para API/ranking.

Não há framework ou build obrigatório.

## Conteúdo

```text
data/agenda.json
data/content/
```

## Estrutura

```text
css/core/        compartilhado
css/components/  componentes
css/pages/       páginas
js/core/         módulos compartilhados
js/pages/        lógica por página
data/            conteúdo editável
assets/          identidade visual
```

## Validação automática

O workflow:

```text
.github/workflows/validate-json.yml
```

executa:

```text
.github/scripts/validate-content.py
```

para validar JSONs, agenda, sincronização Hero/SEO/preview e arquivos de produção.

## Desenvolvimento local

Sirva a raiz por HTTP, pois os JSONs usam `fetch`.

```bash
python -m http.server 8000
```

Abra:

```text
http://localhost:8000/
http://localhost:8000/doacoes/
```

## Documentação

- `AGENTS.md` → arquitetura/invariantes;
- `DESIGN-SYSTEM.md` → identidade visual;
- `README-MIGRACAO.md` → estado de produção e registro da migração;
- `CHANGELOG.md` → histórico consolidado;
- `docs/` → notas técnicas por versão.

Mudanças em Worker, OAuth, KV, DNS e domínios devem ser tratadas separadamente das alterações de frontend.


## Assets otimizados

A interface usa `avatar-192.webp` / `avatar-384.webp` responsivos, além de
`favicon.webp` e `logo.webp`. O background desktop usa
`fundo.avif → fundo.webp → fundo.png`; até 760 px usa
`fundo-mobile.avif → fundo.webp → fundo.png`, sem preload da arte decorativa.

`assets/fundo.avif` já está presente na `main` como asset desktop de produção.

## Blur adaptativo

Sem preferência manual salva, o site decide automaticamente se deve usar `backdrop-filter`. A heurística considera suporte do navegador, redução de transparência, economia de dados e sinais opcionais de capacidade de hardware.

```text
kamyli:ui-blur ausente → auto
kamyli:ui-blur=on      → ligado manualmente
kamyli:ui-blur=off     → desligado manualmente
```

A implementação não usa User-Agent para classificar celulares ou navegadores.

## Performance adaptativa

Além do blur adaptativo, `preferences.js` expõe um perfil independente:

```text
data-performance="normal|reduced"
data-performance-reason="standard|save-data|low-memory|low-cpu"
```

Regras atuais:

```text
Save-Data                 → remove a imagem decorativa do fundo
deviceMemory <= 2 GB      → background-attachment: scroll
hardwareConcurrency <= 2  → background-attachment: scroll
demais casos              → comportamento visual normal
```

O override manual de blur não desativa essas otimizações de performance.


### Entrada pós-loader

Home e Doações fazem uma transição curta de opacidade e poucos pixels quando
o loader termina. O efeito é propositalmente discreto e é desativado quando o
sistema informa `prefers-reduced-motion: reduce`.


### V38 — mobile e caminho crítico

Em telas de até 760 px o site usa `assets/fundo-mobile.avif`, reduzindo bytes e
decodificação em celulares. Tema, blur e perfil de performance recebem um
bootstrap mínimo inline antes dos estilos; o módulo completo de preferências
carrega no fim do documento.


### V39 — LCP e agenda

A Home/Doações usam avatares WebP responsivos de 192/384 px. O loader só é
mostrado após um pequeno atraso quando o conteúdo ainda não ficou pronto, e o
carrossel da agenda mantém métricas de layout em cache para evitar reflows
repetidos durante a animação.


### CI V39

Além das validações editoriais, o workflow confere os avatares responsivos,
os AVIF desktop/mobile e executa `node --check` em `loader.js` e `home.js`.
