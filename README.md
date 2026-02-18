# Portal simples — SEOVE (clean + tipografia clássica)

## Páginas
- `index.html` — mensagem do dia + materiais (slides)
- `livro.html` — busca do Livro dos Espíritos (número ou palavra)
- `calendario.html` — calendário (destaque do dia)
- `indicacoes.html` — links de editoras/livrarias
- `biblioteca.html` — biblioteca digital (PDFs)

## Como editar conteúdo (sem programação)
### 1) Mensagem do dia (Evangelho)
Arquivo: `data/evangelho_mensagens.json` (e o espelho `data/evangelho_mensagens_data.js`).
> Dica: se você editar o JSON, gere o espelho JS copiando o conteúdo para manter o modo “abrir direto no arquivo” funcionando.

### 2) Slides / Materiais das aulas
Edite: `data/slides.json` e `data/slides_data.js`

### 3) Biblioteca digital (PDFs)
1. Coloque PDFs na pasta `/biblioteca`
2. Edite `data/biblioteca.json` e `data/biblioteca_data.js` apontando para `biblioteca/arquivo.pdf`

### 4) Calendário
Edite `data/calendario.json` e `data/calendario_data.js` (formato YYYY-MM-DD)

## Publicar no GitHub Pages
1. Crie o repo `livrodosespiritosseove`
2. Suba os arquivos na branch `main`
3. Settings → Pages → Deploy from a branch → main / (root)

## Atualizar via VS Code (Git)
```bash
git add .
git commit -m "Atualização do portal"
git push
```

## Observação importante
Este pacote foi feito para funcionar até abrindo direto (`file://`) graças aos arquivos `*_data.js`.
