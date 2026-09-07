# V29 — Aviso global de links externos

O modal que antes pertencia à navbar foi transformado em um comportamento global.

## Novo módulo

```text
js/core/external-links.js
```

Ele usa delegação:

```js
document.addEventListener("click", ...)
```

Por isso funciona também com links criados depois do carregamento inicial.

## Links que passam a exibir confirmação

Exemplos:

```text
Jogos / Trello
YouTube
Twitch
TikTok
Instagram
X
Discord
LivePix
Pixie
Créditos de artistas
GitHub
links externos do Footer
```

## Links que não exibem confirmação

```text
/
#agenda
#regras
#creditos
/doacoes/
```

A regra é baseada em `origin`.

## Exceção opcional

Se algum link externo precisar abrir diretamente no futuro:

```html
<a
    href="https://exemplo.com"
    data-external-warning="skip"
>
```

## Comportamento

- Cancelar → permanece no site;
- Continuar → segue para o link;
- `target="_blank"` continua abrindo nova aba;
- Ctrl/Cmd/Shift + clique preserva intenção de nova aba;
- Escape fecha o modal;
- clicar fora fecha o modal;
- fallback usa `window.confirm()` se `<dialog>` não for suportado.

## Infraestrutura

Não alterado:

```text
workers.js
API
OAuth
KV
CORS
DNS
```
