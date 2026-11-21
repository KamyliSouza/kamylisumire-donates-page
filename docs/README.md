# Documentação técnica

Índice da documentação do projeto. Cada assunto tem **um** documento de referência; o histórico
de versões fica só no [`CHANGELOG.md`](../CHANGELOG.md).

## Por onde começar

| Eu quero… | Leia |
| --- | --- |
| Entender o projeto e rodá-lo | [`README.md`](../README.md) |
| Alterar código sem quebrar invariantes | [`AGENTS.md`](../AGENTS.md) |
| Entender como as peças se encaixam | [`ARQUITETURA.md`](ARQUITETURA.md) |
| Mexer no visual | [`DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md) |
| Editar conteúdo (JSON) | [`data/content/README.md`](../data/content/README.md), [`data/blog/README.md`](../data/blog/README.md) |
| Publicar, configurar o Worker ou o OAuth | [`PRODUCAO.md`](PRODUCAO.md) |
| Operar a integração Twitch | [`TWITCH.md`](TWITCH.md) |
| Operar Agenda e Jogos (Trello/Steam) | [`AGENDA-E-JOGOS.md`](AGENDA-E-JOGOS.md) |
| Validar uma alteração (CI, testes, smoke tests) | [`VALIDACAO.md`](VALIDACAO.md) |
| Tratar pedidos sobre o ranking de apoiadores | [`PRIVACIDADE-RANKING.md`](PRIVACIDADE-RANKING.md) |
| Saber por que a CI bloqueia certos arquivos | [`historico/SANEAMENTO-V44.md`](historico/SANEAMENTO-V44.md) |

## Onde cada tipo de informação mora

| Tipo | Local | Não colocar em |
| --- | --- | --- |
| O que mudou em cada versão | `CHANGELOG.md` | README, AGENTS, DESIGN-SYSTEM, docs |
| Regra vigente que não pode ser quebrada | `AGENTS.md` | CHANGELOG |
| Como o sistema é montado | `ARQUITETURA.md` | AGENTS |
| Passo a passo operacional (deploy, secrets, cron) | `PRODUCAO.md`, `TWITCH.md`, `AGENDA-E-JOGOS.md` | README |
| Como testar | `VALIDACAO.md` | AGENTS (só o resumo dos comandos) |
| Aparência e tokens | `DESIGN-SYSTEM.md` | AGENTS |

## Convenções

1. **Estado vigente, não histórico.** Títulos de seção não levam número de versão. Ao mudar um
   comportamento, reescreva a regra no lugar e registre a mudança no `CHANGELOG.md`.
2. **Uma fonte por fato.** Se o mesmo dado aparece em dois documentos, um deles deve apenas apontar
   para o outro (por exemplo, a lista canônica de comandos de validação é a de `VALIDACAO.md`).
3. **Arquivos em `docs/` são conferidos pela CI.** Ao criar, renomear ou remover um arquivo diretamente
   em `docs/`, atualize `REQUIRED_FILES` e `ALLOWED_DOCS` em `.github/scripts/validate-content.py`.
   Documentos puramente históricos ficam em `docs/historico/`.
4. **Nomes de arquivo sem versão.** Use `TWITCH.md`, não `GUIA-TWITCH-V47.4.md`.
5. **Sem segredos.** Nunca escreva valores reais de tokens, chaves ou dados de terceiros.
