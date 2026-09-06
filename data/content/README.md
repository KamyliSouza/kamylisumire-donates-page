# Editando o conteúdo do site

Os textos editáveis dos cards ficam concentrados em `data/content/`.

## Arquivos

| Arquivo | Área |
| --- | --- |
| `hero.json` | Card principal da Home |
| `home-doacoes.json` | CTA de doações da Home |
| `regras.json` | Card de Regras |
| `creditos.json` | Card de Créditos |
| `doacoes.json` | Card principal de `/doacoes/` |
| `ranking.json` | Cabeçalho e abas do Ranking |
| `footer.json` | Créditos fixos e textos do Footer |

A agenda permanece em:

```text
data/agenda.json
```

## O que editar no JSON

Edite somente os valores à direita de cada chave.

Exemplo:

```json
{
  "titulo": "Meu novo título"
}
```

Não remova:

- aspas;
- vírgulas necessárias;
- chaves `{}`;
- colchetes `[]`.

## Regras e Créditos

Para adicionar elementos, inclua novos objetos dentro de `itens`.

Com mais de cinco itens, o scroll interno é ativado automaticamente.

## Footer

`footer.json` pode ser editado, mas o código possui fallback para os créditos
do avatar e da arte de fundo. Assim, esses créditos continuam aparecendo se o
JSON falhar.

## O que NÃO foi colocado em JSON

Continuam no código:

- domínio/API/Worker;
- rotas internas;
- chaves de cache;
- comportamento da navbar;
- animações;
- lógica do ranking;
- SVGs;
- layout e CSS.

Isso mantém conteúdo editorial separado da infraestrutura.
