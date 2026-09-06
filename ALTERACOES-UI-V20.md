# ALTERACOES-UI-V20.md

## Regras e Créditos separados em JSON

As duas áreas editáveis da Home saíram do HTML.

Novos arquivos:

```text
data/regras.json
data/creditos.json
```

O carregamento fica isolado em:

```text
js/pages/home/content.js
```

A agenda continua independente em:

```text
data/agenda.json
js/pages/home/home.js
```

## Estrutura de `regras.json`

```json
{
  "eyebrow": "Comunidade",
  "titulo": "Regras",
  "descricao": "",
  "itens": [
    {
      "id": "respeito",
      "titulo": "Respeito em primeiro lugar",
      "descricao": "..."
    }
  ]
}
```

Para adicionar uma regra, basta adicionar outro objeto em `itens`.

## Estrutura de `creditos.json`

```json
{
  "eyebrow": "Arte",
  "titulo": "Créditos",
  "descricao": "Artistas que contribuem...",
  "itens": [
    {
      "id": "maililac",
      "nome": "Maililac",
      "descricao": "PNGtuber, Pfps e ilustrações",
      "url": "https://..."
    }
  ]
}
```

`url` pode ser omitida. Nesse caso o item continua sendo exibido, mas
não vira link.

## Scroll automático após cinco itens

Os dois cards contam quantos itens existem no JSON.

```text
1 a 5 itens
→ card cresce normalmente
→ sem scroll interno

6 ou mais itens
→ mantém área equivalente a aproximadamente 5 itens
→ ativa scroll vertical dentro da lista
```

A classe é aplicada automaticamente pelo JavaScript:

```text
.is-scrollable
```

Não é necessário editar CSS ao adicionar novos itens.

## Estilo de Regras

As regras agora seguem a mesma linguagem visual dos créditos:

```text
┌────────────────────────────┐
│  1  Respeito em primeiro...│
│     descrição da regra     │
└────────────────────────────┘
```

Cada regra:

- usa um mini-card;
- tem número visual;
- tem título em destaque;
- descrição abaixo;
- usa os mesmos fundo, borda e raio dos créditos.

## Arquivos alterados/adicionados

```text
index.html
css/pages/home.css

data/regras.json          # novo
data/creditos.json        # novo
js/pages/home/content.js  # novo
```

Todas as alterações anteriores da V19 continuam preservadas.
