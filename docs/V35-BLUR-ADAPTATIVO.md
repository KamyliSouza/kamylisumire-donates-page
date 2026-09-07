# V35 — Blur adaptativo

## Objetivo

Reduzir custo de composição de `backdrop-filter` em situações potencialmente limitadas sem assumir que todo celular é lento.

## Regra principal

O site não faz sniffing de User-Agent.

Sem preferência salva em `kamyli:ui-blur`, o modo é automático. Uma preferência manual `on` ou `off` continua persistente e prevalece sobre as heurísticas, salvo quando o navegador não oferece suporte ao filtro.

## Heurística automática

Ordem de avaliação:

1. suporte a `backdrop-filter` / `-webkit-backdrop-filter`;
2. `prefers-reduced-transparency: reduce`;
3. `navigator.connection.saveData`;
4. `navigator.deviceMemory <= 2`;
5. `navigator.hardwareConcurrency <= 2`;
6. caso contrário, blur ligado.

APIs inexistentes são simplesmente ignoradas.

## Estados no HTML

Exemplo automático ligado:

```html
<html
  data-blur="on"
  data-blur-mode="auto"
  data-blur-preference="auto"
  data-blur-reason="supported">
```

Exemplo automático desligado por memória limitada:

```html
<html
  data-blur="off"
  data-blur-mode="auto"
  data-blur-preference="auto"
  data-blur-reason="low-memory">
```

Exemplo manual:

```html
<html
  data-blur="on"
  data-blur-mode="manual"
  data-blur-preference="on"
  data-blur-reason="manual">
```

Motivos possíveis:

```text
supported
manual
unsupported
reduced-transparency
save-data
low-memory
low-cpu
```

## API interna

```js
KAMYLI_UI_PREFS.getState()
KAMYLI_UI_PREFS.setBlur("on")
KAMYLI_UI_PREFS.setBlur("off")
KAMYLI_UI_PREFS.setBlur("auto")
KAMYLI_UI_PREFS.resetBlurToAuto()
KAMYLI_UI_PREFS.refreshAutomaticBlur()
```

`setBlur("auto")` e `resetBlurToAuto()` removem `kamyli:ui-blur` do `localStorage`.

## Compatibilidade com versões anteriores

Usuários que nunca tocaram no botão de blur entram automaticamente no novo modo adaptativo porque a versão antiga não persistia o valor padrão. Quem já salvou `on` ou `off` mantém sua escolha manual.

## Testes rápidos

Estado atual:

```js
KAMYLI_UI_PREFS.getState()
```

Voltar ao automático:

```js
KAMYLI_UI_PREFS.resetBlurToAuto()
```

Também é possível conferir diretamente:

```js
document.documentElement.dataset.blur
document.documentElement.dataset.blurMode
document.documentElement.dataset.blurReason
```

## Infraestrutura

Nenhuma alteração em Worker, API, OAuth, KV, CORS, DNS, redirect ou Search Console.
