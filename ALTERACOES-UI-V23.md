# ALTERACOES-UI-V23.md

## Botões LivePix e Pixie corrigidos

Os símbolos de texto antigos:

```text
$
◎
```

foram removidos.

Agora os dois botões usam SVG inline.

### LivePix

Ícone vetorial inspirado no fluxo/Pix:

```text
quatro conexões geométricas
```

### Pixie

Ícone vetorial de pagamento internacional:

```text
globo
```

Os SVGs usam:

```css
stroke: currentColor;
```

portanto acompanham automaticamente a cor de cada botão e o tema.

## Tamanho dos botões

No desktop, o bloco de botões não cresce indefinidamente junto com o card:

```css
.donation-buttons {
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
}
```

Cada botão:

```text
altura mínima: 64px
ícone: 40x40px
SVG: ~24x24px
```

Estrutura interna:

```text
┌────────────────────────────────┐
│ [ SVG ]  Título                │
│          descrição             │
└────────────────────────────────┘
```

Isso mantém alinhamento consistente mesmo depois da normalização da página
de Doações para a largura da Home.

## Mobile

No mobile:

- bloco volta a ocupar 100% da largura disponível;
- botão mantém área de toque adequada;
- ícone reduz levemente para 38px;
- texto reduz de forma discreta para evitar quebra excessiva.

## Arquivos alterados

```text
doacoes/index.html
css/pages/doacoes.css
```

Todas as alterações anteriores da V22 foram preservadas.
