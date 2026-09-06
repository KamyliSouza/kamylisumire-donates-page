# ALTERACOES-UI-V26.md

## Preloader com favicon pulsando

Foi criado um loader global para Home e `/doacoes/`.

Novo arquivo:

```text
js/core/loader.js
```

O favicon é usado como máscara CSS, portanto a animação acompanha:

```css
var(--primary-color)
```

e muda automaticamente junto com o tema claro/escuro.

## Aparência

Durante o carregamento:

```text
        [ favicon ]
          pulsando

        Carregando...
```

O fundo preserva a arte do site e recebe uma camada baseada em
`--bg-color`, evitando que cards parcialmente montados apareçam atrás.

## Quando ele desaparece

### Home

Aguarda:

```text
window load
+ hero / CTA / regras / créditos
+ agenda.json
+ footer.json
```

### Doações

Aguarda:

```text
window load
+ doacoes.json
+ ranking.json (apenas textos)
+ footer.json
```

O ranking vindo da API NÃO bloqueia o loader.

Isso é intencional: uma API externa lenta não deve impedir o usuário de
acessar o site.

## Transição

Configuração:

```text
tempo mínimo visível: ~460ms
fade de saída: ~320ms
timeout máximo: 2600ms
```

O tempo mínimo evita um flash rápido do loader quando tudo já está em cache.

O timeout máximo impede que o loader prenda a página caso exista:

```text
JSON inválido
script bloqueado
problema inesperado de rede
```

## Acessibilidade

O loader possui:

```text
role="status"
aria-live="polite"
```

e respeita:

```css
prefers-reduced-motion: reduce
```

Nesse caso o favicon fica estático e a saída acontece praticamente sem
animação.

## Arquivos alterados/adicionados

```text
index.html
doacoes/index.html

css/core/global.css

js/core/loader.js              # novo
js/core/footer.js
js/pages/home/content.js
js/pages/home/home.js
js/pages/doacoes/content.js
```

Todo o sistema de JSON da V25 e as alterações visuais anteriores foram
preservados.
