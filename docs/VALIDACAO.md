# Validação

## Auditoria funcional — 7 de setembro de 2026

A auditoria que originou o V44 confirmou no estado público/repositório:

- `https://kamylisumire.com/` acessível;
- `https://kamylisumire.com/doacoes/` acessível;
- Home separada da camada `KamyliAPI`;
- `/doacoes/` usando `KamyliAPI` + `ranking.js`;
- ranking solicitando `GET /`;
- cache do ranking configurado para 30 minutos;
- fallback para cache expirado em falha remota;
- Lives atuais usando thumbnail + link direto do YouTube;
- ausência do modelo `YT.Player`/iframe/playlist no fluxo vigente;
- navbar usando o coração SVG que os CTAs da Home reutilizam;
- Agenda com sete dias no JSON auditado;
- canonical/SEO e separação de preview preservados na arquitetura atual.

### Limite do smoke test remoto

A navegação usada na auditoria não conseguiu exercer diretamente a URL
`workers.dev`. Portanto, **não foi registrada como comprovada a disponibilidade
runtime do Worker/Streamlabs/KV**.

O contrato do frontend foi revisado e o fallback foi confirmado no código,
mas a resposta real do backend deve ser verificada pelo smoke test de produção
e/ou logs do Worker.

Também é importante notar que a extração pública de HTML não executa todo o
JavaScript da página. Por isso, comportamento interativo é validado por
estrutura/código + smoke test manual, e não somente pelo texto extraído.

## V44.3 — conteúdo multilinha de Doações

O site preserva quebras `\n` em:

- `subtitulo`;
- `livepix.descricao`;
- `pixie.descricao`;
- `aviso.texto`.

A implementação continua usando `textContent`. O CSS usa
`white-space: pre-line`, portanto o conteúdo permanece texto puro.

Não usar `<br>` nem HTML editorial nesses campos. O helper privado V44.3
converte Enter em `\n` no JSON e mostra uma prévia visual das quebras.

Smoke test específico:

1. inserir duas linhas em `aviso.texto`;
2. publicar o JSON;
3. confirmar que as linhas aparecem separadas em `/doacoes/`.

## CI automática

`.github/scripts/validate-content.py` verifica:

- presença de arquivos obrigatórios;
- ausência de resíduos removidos no V44;
- JSON válido e sem chaves duplicadas;
- estrutura de Hero, Agenda, Lives e CTA;
- referências locais em HTML/CSS;
- separação Home/Doações;
- ausência de integração legada com player do YouTube;
- presença do módulo de interações da Home;
- equivalência textual do path do coração entre navbar e Home;
- SEO/canonical/sitemap/CNAME;
- proteção `noindex` do preview;
- ausência de `__pycache__` e bytecode Python.

A CI executa também `node --check` em todos os arquivos JavaScript.

## Avisos editoriais

Datas futuras, ordem incomum ou marcadores estranhos em títulos de Lives
geram **aviso**, não alteração automática.

Isso é intencional: Lives são conteúdo editorial manual.

No snapshot auditado, uma Live aparece com data `2026-09-29`, posterior a
7 de setembro de 2026 e fora da ordem decrescente. O V44 preserva esse dado
e pede revisão humana.

## Smoke test após aplicação

1. abrir Home em desktop e mobile;
2. confirmar coração + `Apoiar` nos dois CTAs;
3. testar clique comum e click + arrasta em Lives;
4. testar click + arrasta, setas e teclado na Agenda;
5. abrir ao menos um card de Live e confirmar vídeo correto;
6. verificar Regras/Créditos/Footer;
7. abrir `/doacoes/`;
8. verificar LivePix/Pixie;
9. confirmar quebras de linha editoriais em Doações;
10. confirmar ranking mensal e geral, ou fallback seguro quando o backend falha;
11. testar tema/blur;
12. testar confirmação de link externo;
13. abrir uma URL inexistente e conferir 404;
14. conferir console do navegador sem erros inesperados.

## Limite da validação estática

A CI confirma estrutura e invariantes do repositório, mas não substitui
navegador real nem prova disponibilidade de serviços externos.

Streamlabs, Worker e KV podem estar temporariamente indisponíveis mesmo com
o código correto. O frontend deve degradar de forma segura.
