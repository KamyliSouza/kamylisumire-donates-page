# Conteúdo editável

## Arquivos

```text
hero.json          → Hero da Home
home-doacoes.json  → CTA de Doações
regras.json        → Regras
creditos.json      → Créditos
doacoes.json       → textos de /doacoes/
ranking.json       → textos do Ranking
footer.json        → Footer
```

Agenda:

```text
../agenda.json
```

## Edição

Edite valores mantendo JSON válido.

Para Regras/Créditos, adicione objetos em `itens`.

Mais de cinco itens ativa scroll interno automaticamente.

## Footer

Créditos de fundo/avatar possuem fallback em `js/core/footer.js`.

## Validação

Push/PR com mudanças editoriais executa:

```text
.github/workflows/validate-json.yml
```

A validação agora verifica:

- JSON sintaticamente válido;
- chaves JSON duplicadas;
- esquema e datas da agenda;
- os sete dias esperados;
- campos incompatíveis com `temLive=false`;
- sincronização entre `hero.json`, fallback da Home, SEO e social preview;
- `CNAME` de produção;
- presença da proteção `_headers` para previews.

## Não colocar aqui

- endpoint do Worker;
- secrets/OAuth;
- DNS;
- chaves de cache;
- lógica JavaScript;
- rotas técnicas.

## `lives.json`

Configura o carrossel de lives da Home.

```json
{
  "playlistId": "PL...",
  "maxItems": 10
}
```

`playlistId` é público e não é uma credencial.

`maxItems` pode variar entre 3 e 20 e limita quantas thumbnails são mostradas.

Não armazenar API keys neste arquivo.

## Lives manuais — V43.6.1

`data/content/lives.json` passa a aceitar um array `videos` manual.

Exemplo:

```json
"videos": [
  {
    "videoId": "abcdefghijk",
    "title": "Título exatamente como aparece no YouTube",
    "date": "2026-09-06"
  }
]
```

Regras editoriais importantes:

- `videoId`: exatamente 11 caracteres do ID do vídeo;
- `title`: copiar o título publicado no YouTube sem reescrever ou resumir;
- `date`: usar a data real de publicação em `AAAA-MM-DD`;
- não adicionar texto, filtro, moldura ou edição sobre a thumbnail;
- a ordem do array é a ordem do carrossel;
- `maxItems` continua limitando quantos cards são exibidos.

A thumbnail é carregada diretamente do YouTube usando o `videoId` e não é
armazenada no repositório.

A V43.6.1 não usa playlist discovery, YouTube Data API, IFrame Player API ou
player incorporado. O card abre a página oficial do vídeo no YouTube.

`playlistId` permanece aceito como chave legada para não quebrar configurações
existentes, mas não é usado pelo carrossel manual.

Use `data/content/lives.example.json` apenas como referência e não o publique
como conteúdo real sem trocar os valores de exemplo.

