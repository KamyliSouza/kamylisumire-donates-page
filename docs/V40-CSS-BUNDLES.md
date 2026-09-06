# V40 — Bundles CSS por página

## Objetivo

Reduzir as requisições CSS locais que bloqueiam a primeira renderização sem
abandonar a arquitetura modular do projeto.

## Fonte x produção

Fonte de desenvolvimento:

```text
css/core/
css/components/
css/pages/
```

Saída de produção:

```text
css/build/home.css
css/build/doacoes.css
css/build/404.css
```

## Dependências

### Home

```text
variables.css
global.css
navbar.css
home.css
```

### Doações

```text
variables.css
global.css
navbar.css
doacoes.css
ranking.css
```

### 404

```text
variables.css
global.css
navbar.css
404.css
```

## Gerador

```bash
python .github/scripts/build-css.py
```

A saída é minificada de forma conservadora e inclui um SHA-256 do CSS
compilado no cabeçalho.

Para validar sem gravar:

```bash
python .github/scripts/build-css.py --check
```

## CI

A CI executa o modo `--check`. Se alguém modificar um arquivo fonte sem
reconstruir o bundle, o workflow falha e informa quais bundles estão
desatualizados.

## HTML

A Home, Doações e 404 deixam de carregar múltiplos CSS locais. Cada uma passa
a carregar apenas seu bundle correspondente.

Google Fonts continua externo na V40. Isso é intencional para medir
separadamente o ganho dos bundles antes de qualquer self-host da Nunito.

## URLs relativas

`css/core`, `css/pages`, `css/components` e `css/build` possuem a mesma
profundidade relativa em relação à raiz. Portanto referências como:

```text
../../assets/fundo.avif
../../assets/logo.webp
```

continuam resolvendo para os mesmos assets após a concatenação.

## Regra de manutenção

Nunca editar `css/build/*.css` manualmente.

Fluxo correto:

```text
editar módulo fonte
↓
python .github/scripts/build-css.py
↓
revisar bundle
↓
commit
```
