# Agenda e Jogos

Guia operacional das duas áreas alimentadas pelo Trello: a agenda semanal
(`data/agenda.json`) e o catálogo de jogos (`data/content/jogos.json`). As regras de
manutenção do código estão em [`AGENTS.md`](../AGENTS.md).

## Visão geral

```text
Trello ──► GitHub Actions ──► data/agenda.json              ──► Home e /agenda/
   │           │
   │           └──────────► data/content/jogos.json          ──► /jogos/
   │                         data/content/jogos-artwork*.json
   └── Steam Web API / CDN (somente dentro do Actions)
```

- O **navegador do visitante nunca consulta** Trello nem Steam.
- Credenciais ficam em *secrets*/variáveis do repositório (Settings → Secrets and variables → Actions):

  | Nome | Tipo | Usado por |
  | --- | --- | --- |
  | `TRELLO_API_KEY`, `TRELLO_TOKEN` | secret | Agenda e Jogos |
  | `STEAM_WEB_API_KEY` | secret | Jogos |
  | `TRELLO_AGENDA_BOARD_ID` | variable | Agenda (obrigatória) |
  | `TRELLO_BOARD_ID` | variável de ambiente do script | Jogos; o workflow não a define e o script usa o quadro padrão `IfgV0jXS` |

  Cada sync falha logo no início, com mensagem clara, se uma credencial obrigatória faltar.
- Se o Trello estiver fora do ar ou o quadro tiver estrutura inválida, o sync falha
  **antes do commit** e o último arquivo válido continua publicado.

| Workflow | Arquivo | Horários (São Paulo) | Cron (UTC) |
| --- | --- | --- | --- |
| Sync agenda from Trello | `.github/workflows/sync-agenda.yml` | 06:29, 18:29 e domingo 00:10 | `29 9,21 * * *` e `10 3 * * 0` |
| Sync games from Trello | `.github/workflows/sync-jogos.yml` | 06:17 e 18:17 | `17 9,21 * * *` |

Comportamento comum dos dois workflows:

- só executam no repositório do proprietário (`github.repository_owner == 'KamyliSouza'`); forks são ignorados;
- compartilham o grupo de concorrência `editorial-sync-*` (sem cancelar execução em andamento);
- depois do sync, rodam o validador e a checagem de sintaxe **antes** de qualquer commit;
- só criam commit se o arquivo gerado mudou (`chore: sync agenda from Trello` / jogos), sem force push, com `git pull --rebase` antes do push.

**Atualizar na hora:** GitHub → *Actions* → *Sync agenda from Trello* (ou *Sync games
from Trello*) → *Run workflow*. O resumo da execução mostra a semana publicada e os
avisos. Depois, traga o commit novo para a sua cópia local (`git pull`).

## Agenda

### Quadro do Trello

- Exatamente **sete listas**: `Domingo`, `Segunda-feira`, `Terça-feira`, `Quarta-feira`,
  `Quinta-feira`, `Sexta-feira`, `Sábado`.
- **Um card por live.** Cards arquivados não entram.
- Dias podem ter zero, uma ou várias lives. Dentro do dia, a ordem segue o horário;
  empates e horários indefinidos preservam a ordem do Trello.

Descrição do **quadro** (opcional; cada linha só pode aparecer **uma vez**, senão o sync falha):

```text
Semana: 2026-11-22
Observacao: Texto exibido junto da agenda
```

Descrição de cada **card**:

```text
Horario: 20:00
Plataformas: YouTube, Twitch
SteamAppID: 3357650
Descricao: Vamos jogar alguma coisa!
```

| Campo | Obrigatório | Regras |
| --- | --- | --- |
| `Horario` | não | `HH:MM` (24 h) ou `A definir`; vazio também aparece como "A definir"; outro formato interrompe o sync |
| `Plataformas` | **sim** | `YouTube` e/ou `Twitch`, separadas por vírgula; ausente ou inválida interrompe o sync |
| `Descricao` | não | texto livre |
| `Data` | não | `YYYY-MM-DD`; funciona como validação extra e precisa bater com a lista/semana publicada |
| `SteamAppID` | não | associa a live ao ícone oficial já presente em `jogos.json`; sem ícone no catálogo, a live sai sem imagem |

### Qual semana é publicada

Você não precisa reescrever nada toda semana. A semana é decidida por
`.github/scripts/agenda-week.mjs`, nesta ordem:

1. `Semana: YYYY-MM-DD` (um domingo) na descrição do quadro, **se for a semana atual ou futura**;
2. `Data:` dos cards, se alguma for da semana atual ou futura;
3. a semana atual (domingo a sábado) em `America/Sao_Paulo`.

`Semana: automática` ou nenhuma linha segue sempre a data de hoje. Semanas que já
passaram nunca são publicadas: a linha antiga é ignorada com aviso, e uma `Data:` antiga
é ignorada card a card. Já uma `Data:` no dia errado da semana publicada é **erro** e
interrompe o sync.

### Contrato de `data/agenda.json`

- Sete dias, de domingo a sábado.
- Campo `lives` (aditivo): todos os eventos do dia, em ordem de horário.
- Campos legados no nível do dia — `temLive`, `horario`, `titulo`, `descricao`,
  `plataformas` — continuam obrigatórios e, quando há live, espelham `lives[0]`. Isso
  mantém a compatibilidade com Helpers antigos e com arquivos sem `lives`.
- Em cada entrada de `lives`, `steamAppId` e `icon` são opcionais. `icon` só pode
  reutilizar o ícone oficial `steam-original` do catálogo de Jogos.

### Páginas que consomem a agenda

- **Home:** seção `#agenda`, com carrossel, aviso legal da Steam em `<details>` e destaque do dia
  atual (calculado no aparelho do visitante; o carrossel rola até o card de hoje só ao abrir).
- **`/agenda/`:** usa `agenda-model.js` (regras puras) e `agenda.js` (DOM). Lê só
  `data/agenda.json` e `data/content/jogos-artwork.json`. Tem dois modos: **Padrão** (cartões com a arte do jogo)
  e **Compacto** (uma linha por dia, com a arte como fundo e sem descrição). A escolha do visitante fica salva no navegador
  (`kamyli:ui-view-agenda`); a lista de `/jogos/` guarda a sua própria (`kamyli:ui-view-jogos`). Nada disso
  vai para o servidor.

## Jogos

### Quadro do Trello

O Trello é a fonte editorial de listas, nomes, ordem e cards. A Steam Web API identifica
os jogos automaticamente. Para forçar um jogo específico, coloque na descrição do card:

```text
SteamAppID: 123456
```

Esse marcador tem prioridade sobre a busca por nome. Linha ausente, vazia, inválida ou
com IDs conflitantes mantém o fallback automático. A descrição completa, comentários,
membros e anexos do Trello **nunca** vão para `jogos.json`.

### Como a Steam é consultada

- Identificação por nome via `IStoreService/GetAppList`; a correspondência deve ser
  exata e inequívoca.
- Capas limitadas ao asset vertical original da Steam (Library Capsule). Sem asset
  oficial, o placeholder local é mantido, mesmo com App ID confirmado.
- O catálogo também publica `icon` (derivado do `community_icon`), usado só pela Agenda.
- Todo acesso passa por `.github/scripts/steam-client.mjs`: User-Agent identificado,
  intervalo mínimo entre requisições, repetição com espera crescente e disjuntor
  (HTTP 429, 403 na Web API, 5 respostas 403 seguidas no CDN ou 3 falhas seguidas
  interrompem a Steam naquela execução).
- Ao interromper, o sync segue com o cache e o último estado publicado e emite um
  `::warning` no Actions.
- Cache em `data/content/jogos-artwork-cache.json` → `apps`: 14 dias; "sem asset" 3 dias;
  falhas nunca viram cache negativo. Com cache válido, nenhuma requisição à Steam é feita.

### Paginação

`data/content/jogos-config.json` → `jogosPorPagina` (inteiro de 1 a 60; atual: `15`).
É configuração editorial independente do sync: alterar não exige Trello, Steam nem novo
sync. Se o arquivo estiver indisponível, o frontend usa 15.

### Fichas editoriais da página `/jogos/`

O catálogo automático (`data/content/jogos.json`) não recebe reviews nem links pessoais. O conteúdo
editorial fica em `data/content/jogos-editorial.json`, associado pelo `gameId` (ID original de 24
caracteres do cartão Trello). Mover um cartão entre listas ou renomear o jogo não quebra a associação.

- `review`: texto simples, até 12.000 caracteres.
- `rating`: nota opcional de 0 a 10, em passos de 0,5.
- `recommendation`: `none`, `recommended`, `mixed` ou `not-recommended`.
- `containsSpoilers`: se verdadeiro, a review fica atrás de uma seção expansível.
- `playlistUrl`: link HTTPS de playlist do YouTube.
- `episodes`: lista de `videoId` (11 caracteres), título e data (`YYYY-MM-DD`). O histórico é exibido por links externos.
- `links`: até 20 links HTTPS com rótulo e endereço.

Na página, cada cartão abre um popup (`<dialog>` nativo). Ao lado da capa ficam as ações externas: **Ver na
Steam**, **Playlist completa** (`playlistUrl`) e **Última transmissão** (o vídeo mais recente de `episodes`).
No conteúdo: status, **Minha experiência** (nota, recomendação e review, recolhida quando `containsSpoilers` é
verdadeiro), **Transmissões** (primeira live, última live e total, calculados a partir de `episodes`, mais a
lista numerada com um link por vídeo; acima de seis itens a lista começa recolhida) e **Links adicionais**. Os cartões têm os modos **Pôsteres** (padrão) e
**Compacto**. Jogos sem ficha continuam abrindo o popup, apenas sem essas seções, e o selo "Ficha editorial"
só aparece nos que têm conteúdo.

O JSON é manual e não é tocado pelos workflows de Trello/Steam. Entradas cujo cartão foi arquivado
permanecem armazenadas para evitar perda editorial e voltam a aparecer caso o cartão retorne ao catálogo.
A página não incorpora players nem chat, não usa YouTube Data API e continua mostrando a lista se o
arquivo editorial estiver ausente ou indisponível.

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| Agenda mostra a semana errada | Havia `Semana:`/`Data:` antigas; elas são ignoradas com aviso. Rode o workflow e leia o resumo. |
| Workflow falha com erro de `Data:` | Algum card tem `Data:` que não bate com a lista (dia da semana) da semana publicada. |
| Live sem ícone da Steam | O `SteamAppID` não tem ícone resolvido em `jogos.json`. Rode o sync de Jogos primeiro. |
| Jogo sem capa | Não há asset oficial na Steam; o placeholder é intencional. |
| Ficha não aparece no popup | `gameId` diferente do ID original de 24 caracteres do cartão, ou arquivo editorial inválido (o validador aponta o campo). Cartões arquivados somem do catálogo, mas a ficha permanece no JSON. |
| Playlist não aparece | A URL precisa ser HTTPS em `youtube.com/playlist?list=...`; links de vídeo ou de outro domínio são recusados pelo validador. |
| Aviso de Steam interrompida | Disjuntor ativado (429/403). O cache foi preservado; tente novamente depois. |
