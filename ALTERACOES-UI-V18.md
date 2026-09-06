# ALTERACOES-UI-V18.md

## 1. Doações normalizada no mobile

A Home usa no mobile:

```css
width: min(100% - 24px, 1120px);
```

Agora `/doacoes/` usa exatamente a mesma largura lateral até `760px`.

Resultado:

```text
HOME mobile
| 12px | conteúdo | 12px |

DOAÇÕES mobile
| 12px | conteúdo | 12px |
```

No desktop, a página de doações continua compacta (~380px), preservando a
identidade histórica.

## 2. Toggle claro / escuro

Foi criado:

```text
js/core/preferences.js
```

Ele é carregado no `<head>` antes dos estilos para reduzir o "flash" de tema.

Preferência persistida:

```text
kamyli:ui-theme
```

Estados:

```text
light
dark
```

Sem preferência gravada, o primeiro estado acompanha
`prefers-color-scheme`.

O botão fica na navbar e usa SVG de sol/lua.

## 3. Toggle de blur

Segundo controle na navbar:

```text
Blur ligado
Blur desligado
```

Preferência persistida:

```text
kamyli:ui-blur
```

Quando desligado:

- `backdrop-filter` é removido;
- os cards continuam translúcidos;
- a opacidade da superfície é ligeiramente reforçada para preservar leitura;
- funciona em Home, Doações, footer, navbar e modal externo.

O fundo continua visível através dos painéis.

## 4. Persistência entre páginas

As duas preferências são globais.

Exemplo:

```text
Home
→ ativa dark
→ desativa blur
→ abre /doacoes/
→ /doacoes/ mantém dark + sem blur
```

## Arquivos alterados/adicionados

```text
index.html
doacoes/index.html

css/core/variables.css
css/core/global.css
css/core/navbar.css
css/pages/doacoes.css

js/core/preferences.js   # novo
js/core/navbar.js
```

Todas as alterações da V17 foram preservadas.
