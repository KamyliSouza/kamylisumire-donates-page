# ALTERACOES-NAVBAR-V6.md

## Alterações

### Centralização

No desktop, o conjunto completo abaixo passa a ser tratado como um único bloco central:

```text
[ logo ] | Início  Agenda  Jogos  Regras  Créditos  Doações
```

A lista não ocupa mais toda a largura disponível, então a centralização acontece pelo conjunto inteiro, não apenas pelos links.

### Barra fixa

A navbar usa:

```css
position: fixed;
top: 0;
left: 0;
right: 0;
```

O elemento `#site-navbar` recebe a mesma altura da barra para preservar o espaço no fluxo da página e evitar que o conteúdo fique escondido atrás da navegação.

### Mobile

Em telas estreitas:

- a barra continua fixa;
- a logo e a divisória permanecem visíveis;
- a lista de páginas pode ser rolada horizontalmente;
- os links ficam alinhados a partir da esquerda para facilitar o uso por toque.

## Arquivo substituído

```text
css/core/navbar.css
```

## Aplicação

Extraia sobre a raiz da branch `site-v2`:

```bash
git add -A
git commit -m "style: centraliza e fixa navbar"
git push
```
