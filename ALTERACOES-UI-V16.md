# ALTERACOES-UI-V16.md

## Agenda: card adaptável ao conteúdo

Os cards do carrossel deixam de cortar conteúdos maiores.

Ajustes:

```css
.agenda-carousel-track {
    align-items: stretch;
}

.agenda-card {
    height: auto;
    align-self: stretch;
    overflow: visible;
}
```

Além disso:

- títulos longos podem quebrar linha;
- descrições longas podem quebrar linha;
- plataformas podem quebrar linha;
- o card cresce verticalmente conforme o conteúdo;
- os cards visíveis permanecem alinhados pela altura do maior conteúdo;
- o carrossel horizontal continua funcionando normalmente.

Nenhum limite de texto foi adicionado e `data/agenda.json` continua igual.

## Navbar: Créditos no mobile

Os links internos da navbar não dependem mais somente da navegação nativa por hash.

Agora o JavaScript:

1. identifica a seção exata (`agenda`, `regras`, `creditos`);
2. mede a altura real da navbar fixa;
3. calcula a posição da seção;
4. desconta a altura da navbar + pequeno espaçamento;
5. executa `window.scrollTo()` suave.

Isso corrige o caso em que `Créditos` terminava visualmente posicionado em `Regras` no celular.

Também foi adicionada correção para abertura direta por URL:

```text
/#agenda
/#regras
/#creditos
```

## Arquivos alterados

```text
css/pages/home.css
js/core/navbar.js
```

Todas as mudanças anteriores da V15 foram preservadas.
