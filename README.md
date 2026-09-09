# Kamyli Sumire — site oficial

Site público de `kamylisumire.com`, desenvolvido sem framework e sem etapa de build.

## Arquitetura

- **Frontend:** HTML, CSS e JavaScript vanilla.
- **Conteúdo editorial:** JSON versionado em `data/`.
- **Home:** majoritariamente local; a aba Twitch de Lives e o status ao vivo do Hero leem snapshots públicos do Worker, com fallback local/visual quando a API está indisponível.
- **Blog:** página estática em `/blog/`, exibida na navegação/Home somente quando há post publicado.
- **Doações:** página independente em `/doacoes/`.
- **Backend público:** ranking de doações, snapshot diário das VODs da Twitch e status ao vivo atualizado em janelas de 10 minutos.
- **Backend:** Cloudflare Worker em `workers.js`, exposto em `https://api.kamylisumire.com`.
- **Fallback da API:** `workers.dev` mantido temporariamente para contingência.
- **Produção:** GitHub Pages pela branch `main`.
- **Preview:** Cloudflare Pages, protegido contra indexação.
- **Assets gráficos públicos:** `assets.kamylisumire.com`.
- **Fonte Nunito:** mantida localmente em `assets/fonts/`.

Não há React, Vue, bundler, npm, geração estática ou compilação.

## Conteúdo editável

Os textos e listas ficam em `data/content/*.json`.
A agenda semanal fica em `data/agenda.json`.

As Lives usam duas abas no mesmo componente visual. **Twitch é a aba padrão** e
recebe as últimas transmissões gravadas por `https://api.kamylisumire.com/twitch/videos`.
O Worker atualiza esse snapshot no máximo uma vez a cada 24 horas e o guarda no KV.
A aba YouTube continua editorial/local em `data/content/lives.json`, com `videoId`,
`title` e `date`, sem YouTube Data API, iframe ou chave Google.

Desde a V47.4.3, o Hero também consulta `GET /twitch/live`. O endpoint lê apenas
o snapshot `twitch:live` do KV; a consulta real ao `helix/streams` ocorre no Worker
no máximo uma vez a cada 10 minutos. Se o canal estiver online, o Hero mostra
`Sobre | Ao vivo`, mantendo o avatar visível com anel de status. Offline ou sem
snapshot válido, o Hero continua no layout padrão.

Desde a V47.4.4, links diretos com hash (`/#agenda`, `/#regras`, `/#creditos` etc.)
aguardam o reveal da página e recebem uma estabilização temporária de posição.
Isso evita que conteúdo assíncrono anterior desloque a seção depois do scroll,
sem impedir que o visitante reassuma o controle ao rolar manualmente.

## Estrutura principal

```text
.github/                 CI e validação
assets/fonts/            Nunito local e licença
css/core/                base visual
css/components/          componentes reutilizáveis/isolados
css/pages/               estilos por página
data/                    conteúdo editorial
docs/                    documentação atual
blog/                    índice estático do Blog
doacoes/                 página de apoio/ranking
js/core/                 infraestrutura compartilhada
js/pages/home/           lógica da Home
js/pages/blog/           lógica da listagem do Blog
js/pages/doacoes/        lógica de Doações
workers.js               backend do ranking
```

## API de produção

O frontend de `/doacoes/` e as integrações Twitch da Home usam
`https://api.kamylisumire.com` como endpoint primário.

Durante a estabilização da V44.4, `workers.dev` permanece como fallback.
Falhas do Worker não impedem o restante da Home nem a aba local do YouTube.

OAuth, client secret, tokens e credenciais não pertencem ao repositório
público. A configuração sensível permanece no Cloudflare Worker.

## Desenvolvimento

Como o projeto não possui build, sirva a raiz por HTTP para testes locais.

```bash
python -m http.server 8000
```

Antes de publicar:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
```

## Documentação atual

- `AGENTS.md` — regras de manutenção e invariantes.
- `DESIGN-SYSTEM.md` — sistema visual.
- `docs/ARQUITETURA.md` — componentes e fluxos.
- `docs/PRODUCAO.md` — publicação, preview e backend.
- `docs/GUIA-TWITCH-V47.4.md` — implantação da integração Twitch e cache de 24 horas.
- `docs/VALIDACAO.md` — matriz de validação.
- `docs/SANEAMENTO-V44.md` — histórico consolidado do saneamento.
- `CHANGELOG.md` — histórico resumido.

### Privacidade e Uso de IA

Desde a V47.4.1, a Política de Privacidade está publicada em `/privacidade/` com foco nas informações relacionadas ao usuário, incluindo armazenamento local, Streamlabs/ranking, Twitch, Cloudflare, retenção e escolhas. A mesma versão faz os snapshots públicos de VODs da Twitch expirarem no KV em no máximo 24 horas e impede que conteúdo vencido seja servido pela API pública.

A V47.4.1 também publica `/uso-de-ia/`, com proibição expressa do uso de conteúdos e assets próprios do site para treinamento, fine-tuning, desenvolvimento, avaliação ou aprimoramento de sistemas de IA. O `robots.txt` adiciona sinalização complementar para crawlers de IA conhecidos.
