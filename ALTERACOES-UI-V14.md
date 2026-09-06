# ALTERACOES-UI-V14.md

## Organização dos cards da agenda

Os cards agora usam esta hierarquia:

```text
Segunda-feira                TEM LIVE
07/09                           20:00

Jogo destacado
Tema / descrição da live

YouTube • Twitch
```

### Mudanças

- `TEM LIVE` foi movido para o canto superior direito;
- a hora fica alinhada à direita logo abaixo do status;
- o jogo/título ocupa a posição de maior destaque do card;
- a descrição/tema permanece logo abaixo do jogo;
- plataformas continuam na parte inferior;
- dias sem live usam a mesma estrutura visual, sem exibir horário.

## Dados

`data/agenda.json` não foi alterado.

Mapeamento:

```text
titulo       -> jogo em destaque
descricao    -> tema / descrição
horario      -> canto superior direito
temLive      -> status no canto superior direito
plataformas  -> rodapé do card
```

## Arquivos alterados

```text
js/pages/home/home.js
css/pages/home.css
```

Todas as alterações anteriores da V13 foram preservadas.
