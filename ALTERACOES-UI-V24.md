# ALTERACOES-UI-V24.md

## Ícones dos botões de doação

### LivePix

O ícone foi simplificado para um cifrão em SVG.

```text
$
```

Ele usa `stroke: currentColor`, então acompanha a cor do botão e o tema.

### Pixie

O ícone continua sendo um globo simples em SVG.

```text
◯
├─ linha horizontal
└─ linhas curvas de longitude
```

## Aviso alinhado aos botões

O bloco de aviso agora usa exatamente a mesma largura máxima dos botões:

```css
.donation-buttons,
.donation-notice {
    max-width: 420px;
}
```

No desktop:

```text
[       LivePix       ]
[        Pixie        ]
[        Aviso        ]
```

Todos ficam centralizados e alinhados pela mesma largura.

No mobile:

```css
max-width: 100%;
```

portanto os três elementos ocupam a mesma largura disponível.

## Arquivos alterados

```text
doacoes/index.html
css/pages/doacoes.css
```

Todas as alterações anteriores da V23 foram preservadas.
