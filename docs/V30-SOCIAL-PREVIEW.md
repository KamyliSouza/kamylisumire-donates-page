# V30 — Social Preview

## Home

Open Graph:

```text
Título:
Oiê! Eu sou a Kamyli ✨

Descrição:
Faço lives de joguinhos enquanto troco uma ideia com você. Por aqui você
encontra minha agenda, minhas redes e todas as formas de acompanhar o conteúdo.

Imagem:
https://kamylisumire.com/assets/preview.png
```

Os mesmos título, descrição e imagem são declarados para Twitter/X.

## Doações

Os textos históricos da branch `main` foram preservados:

```text
Apoie a Kamyli Sumire ✨
Escolha entre LivePix ou Pixie para apoiar as lives!
```

A URL foi adaptada para a arquitetura nova:

```text
https://kamylisumire.com/doacoes/
```

e a imagem para:

```text
https://kamylisumire.com/assets/preview.png
```

## Imagem

A preview declara:

```text
1200 × 630
image/png
```

seguindo o mesmo formato da página antiga de Doações.

## Observação sobre JSON

O Hero é editável em:

```text
data/content/hero.json
```

Porém Discord, WhatsApp e outros crawlers de preview normalmente não
executam JavaScript. Portanto a preview precisa permanecer estática no
`<head>` do `index.html`.

Se o Hero mudar, os metadados da Home também devem ser atualizados.

## Infraestrutura

Nenhuma alteração em Worker, API, OAuth, KV ou CORS.
