# V42 — Configurações no rodapé e loader estético

## Navbar

Os dois controles visuais antigos saem da navbar. O CTA `Apoiar` passa a ser o
último elemento fixo dentro de `.site-nav-inner`, fora da lista horizontal
rolável.

## Configurações

O rodapé contém um popover acessível com dois grupos de radio buttons.

Tema:

```text
auto  → acompanha prefers-color-scheme
light → força claro
dark  → força escuro
```

Blur:

```text
auto → heurísticas adaptativas
on   → força ligado quando suportado
off  → força desligado
```

O modo automático de tema reage a mudanças do sistema durante a sessão.

O popover fecha por Escape, botão de fechar ou clique fora.

## Loader

Home, Doações e 404 usam o mesmo fluxo:

```text
site-loading-pending
→ loader transparente + logo pulsando
→ mínimo de 1000 ms
→ site-revealing
→ site-ready
```

Se o conteúdo demorar mais de 1 segundo, o loader continua até ficar pronto ou
até o timeout de segurança.

Reduced motion e performance reduzida mantêm o loader estático.

## Transição Home → Doações

A transição da V41 é preservada. Depois da saída curta da Home, a nova página
exibe o loader V42 por no mínimo 1 segundo e então executa a entrada direcional.

## Infraestrutura

Sem mudanças em Worker, API, OAuth, KV, CORS, DNS, robots, sitemap ou canonical.

## Hotfix V42.1 — superfície do loader

O loader passa a seguir os mesmos tokens visuais dos cards:

```text
background-color: var(--card-bg)
backdrop-filter: blur(var(--blur-card))
```

Quando o estado resolvido do site é:

```text
data-blur="off"
```

o `backdrop-filter` do loader é removido. A transparência continua sendo
determinada por `--card-bg`, inclusive pelas variantes de tema claro/escuro e
pelos tokens reforçados usados quando o blur está desligado.

Isso mantém o loader visualmente integrado aos cards sem alterar sua duração,
logo ou transições.

