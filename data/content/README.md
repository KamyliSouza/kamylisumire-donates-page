# Conteúdo editorial

Arquivos desta pasta alimentam textos/listas do frontend sem necessidade de
alterar HTML.

- `hero.json` — Hero.
- `lives.json` — bloco de Lives e lista manual de vídeos.
- `regras.json` — regras.
- `creditos.json` — créditos.
- `home-doacoes.json` — CTA de apoio na Home.
- `doacoes.json` — textos da página de Doações.
- `ranking.json` — textos do ranking.
- `footer.json` — conteúdo do footer.

A agenda semanal fica em `../agenda.json`.

## Lives

Cada item em `videos` contém:

```json
{
  "videoId": "ID_DO_YOUTUBE",
  "title": "Título editorial",
  "date": "YYYY-MM-DD"
}
```

Não adicionar campos de playlist/player/API.
