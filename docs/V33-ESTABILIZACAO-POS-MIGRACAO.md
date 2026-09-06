# V33 — Estabilização pós-migração

## Objetivo

Fechar inconsistências encontradas depois da migração para:

```text
https://kamylisumire.com
```

sem alterar Worker, OAuth, KV, CORS ou API.

## Produção

`CNAME` deve permanecer:

```text
kamylisumire.com
```

O redirect legado já é considerado concluído:

```text
donate.kamylisumire.com
301 → https://kamylisumire.com/doacoes/
```

## Agenda

Correções:

- `2026-09-6` → `2026-09-06`;
- remoção da chave `descricao` duplicada de Domingo;
- adição explícita de `horario` em todos os dias;
- Quinta/Domingo sem live ficam com `horario`, `titulo` e `descricao` vazios;
- ordem dos sete dias é validada.

## Hero / SEO / preview

A frase oficial passa a ser:

```text
Faço lives de joguinhos enquanto troco uma ideia com você. Por aqui você encontra minha agenda, minhas redes e todas as formas de acompanhar o conteúdo.
```

Ela deve ser igual em:

```text
data/content/hero.json
fallback visível do index.html
meta description
og:description
twitter:description
```

O título do Hero também é comparado com `og:title` e `twitter:title`.

## Validação automática

Novo script:

```text
.github/scripts/validate-content.py
```

Sem dependências externas.

Checagens:

1. JSON válido;
2. chaves duplicadas proibidas;
3. agenda semanticamente válida;
4. datas reais em `AAAA-MM-DD`;
5. IDs dos sete dias na ordem esperada;
6. `temLive` booleano;
7. horário vazio ou `HH:MM`;
8. dias sem live não carregam título/descrição residuais;
9. Hero/SEO/preview sincronizados;
10. `CNAME` correto;
11. `_headers` presente com proteção noindex.

## Acessibilidade

### Navbar

O link ativo recebe:

```text
aria-current="location"
```

na Home e:

```text
aria-current="page"
```

em `/doacoes/`.

A 404 não marca uma seção como atual.

### Ranking

As abas agora possuem:

```text
aria-controls
role="tabpanel"
aria-labelledby
roving tabindex
```

Teclas suportadas:

```text
ArrowLeft
ArrowRight
ArrowUp
ArrowDown
Home
End
```

## Fora do escopo

A V33 não otimiza imagens nem altera o comportamento de espera do loader.
Esses itens ficam para uma atualização de performance separada.

Também não altera:

```text
workers.js
OAuth
KV RANKINGS
CORS
REDIRECT_URI
API endpoint
DNS
```
