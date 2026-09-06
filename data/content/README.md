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

Push/PR com mudanças em `data/**/*.json` executa:

```text
.github/workflows/validate-json.yml
```

JSON inválido faz a checagem falhar.

## Não colocar aqui

- endpoint do Worker;
- secrets/OAuth;
- DNS;
- chaves de cache;
- lógica JavaScript;
- rotas técnicas.
