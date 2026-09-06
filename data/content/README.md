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
