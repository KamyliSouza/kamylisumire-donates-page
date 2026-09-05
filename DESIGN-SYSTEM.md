# DESIGN-SYSTEM.md — Identidade visual da Kamyli Sumire

Este documento define a referência visual oficial da arquitetura modular.

## Fonte de verdade

A identidade histórica está na branch `main`, especialmente em:

- `style.css`
- `ranking.css`

A arquitetura modular da `site-v2` preserva esses parâmetros por meio de:

```text
css/core/variables.css
css/core/global.css
css/core/navbar.css
css/pages/home.css
css/pages/doacoes.css
css/components/ranking.css
```

## Tokens principais

### Claro

```css
--primary-color: #B35EAF;
--primary-hover: #9b4d97;
--bg-color: #f7eff7;
--card-bg: rgba(255, 255, 255, 0.92);
--card-border: rgba(179, 94, 175, 0.30);
--text-color: #2b2b2b;
--subtitle-color: #666;
--notice-bg: rgba(179, 94, 175, 0.08);
```

### Escuro

```css
--primary-color: #d178cd;
--primary-hover: #b35eaf;
--bg-color: #121212;
--card-bg: rgba(30, 24, 32, 0.85);
--card-border: rgba(209, 120, 205, 0.35);
--text-color: #f0e6f0;
--subtitle-color: #bfa9be;
--notice-bg: rgba(209, 120, 205, 0.12);
```

## Geometria e efeitos

```css
--radius-card: 24px;
--radius-button: 16px;
--radius-small: 14px;
--blur-card: 10px;
--shadow-card: 0 10px 30px rgba(0, 0, 0, 0.15);
```

## Regras

1. Novas páginas devem carregar `variables.css`, `global.css` e `navbar.css`.
2. Não redefinir a paleta principal em CSS específico de página.
3. Cards principais devem usar `.glass-panel`.
4. Botões genéricos devem usar `.button` + variante.
5. Componentes internos devem preferir `--notice-bg` e `--card-border`.
6. O dark mode deve ser definido nos tokens globais, não página a página.
7. Novas aplicações podem ter layout próprio, mas devem preservar tipografia, superfícies, bordas, botões e cores.
8. A branch `main` é a referência histórica; `variables.css` é a fonte de verdade operacional da arquitetura modular.

## Doações

`/doacoes/` deve continuar visualmente reconhecível para usuários do antigo:

```text
donate.kamylisumire.com
```

Por isso a página mantém:

- largura de aproximadamente 380px;
- cards empilhados;
- avatar de 100px;
- borda de 3px na cor principal;
- botões de 16px de raio;
- aviso em `--notice-bg`;
- ranking com abas e itens no estilo histórico.

A navbar é a principal adição visual nova nessa página.

## Home

A Home pode usar painéis maiores, porém esses painéis reutilizam os mesmos:

- `card-bg`;
- `card-border`;
- `blur`;
- `shadow`;
- `primary-color`;
- `notice-bg`;
- raios.

Assim a Home parece uma expansão natural da página original de doações.
