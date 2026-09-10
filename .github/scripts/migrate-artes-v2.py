#!/usr/bin/env python3
import json
from pathlib import Path

path = Path('data/content/artes.json')
if not path.exists():
    raise SystemExit(f'Arquivo não encontrado: {path}')

data = json.loads(path.read_text(encoding='utf-8'))
if not isinstance(data, dict):
    raise SystemExit('artes.json deve conter um objeto JSON na raiz.')

items = data.get('itens')
if not isinstance(items, list):
    raise SystemExit('artes.json: "itens" deve ser uma lista.')

changed = False
for index, item in enumerate(items):
    if not isinstance(item, dict):
        raise SystemExit(f'artes.json: itens[{index}] deve ser um objeto.')
    imagem = item.get('imagem')
    if not item.get('preview'):
        if not isinstance(imagem, str) or not imagem.strip():
            raise SystemExit(f'artes.json: itens[{index}] não possui "imagem" válida para usar como preview inicial.')
        item['preview'] = imagem
        changed = True

if data.get('version') != 2:
    data['version'] = 2
    changed = True

if changed:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Migração concluída: artes.json agora usa version 2 e preserva todas as obras existentes.')
else:
    print('Nenhuma alteração necessária: artes.json já está no schema version 2.')
