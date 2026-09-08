# Validação

## V44.4 — domínio próprio da API

A API pública de produção é:

`https://api.kamylisumire.com`

Durante a estabilização, `workers.dev` permanece como fallback.

Validação manual obrigatória:

1. abrir `https://api.kamylisumire.com/`;
2. confirmar resposta JSON do ranking;
3. confirmar CORS para `https://kamylisumire.com`;
4. confirmar que Streamlabs e Cloudflare usam
   `https://api.kamylisumire.com/oauth/callback`;
5. reautorizar o OAuth no domínio novo;
6. abrir `/doacoes/` e confirmar no console:
   `API atendida por: https://api.kamylisumire.com`;
7. confirmar ranking e fallback/cache.

## CI automática

Execute:

```bash
python .github/scripts/validate-content.py
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
git diff --check
```

O validador estrutural anterior pode emitir um aviso ao detectar
`useCustomDomain: true`. Esse aviso é esperado nesta migração e não é erro.

## Limites da validação estática

A CI não prova disponibilidade do Cloudflare Worker, Streamlabs ou KV.
A migração do domínio exige smoke test real em navegador.

A Home deve continuar funcionando mesmo que todos os endpoints do ranking
estejam indisponíveis.
