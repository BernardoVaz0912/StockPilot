# Ficha de Inventário

Aplicativo de controle de estoque por setor: cadastre setores, adicione/remova
itens, ajuste quantidades e acompanhe alertas de estoque baixo.

## Como rodar no VS Code

1. Abra esta pasta no VS Code (`File > Open Folder...`).
2. Abra o terminal integrado (`` Ctrl+` `` ou `Terminal > New Terminal`).
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Rode o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Abra o endereço mostrado no terminal (geralmente `http://localhost:5173`).

## Estrutura

- `src/App.jsx` — toda a lógica e interface do inventário.
- `src/main.jsx` — ponto de entrada do React.
- `src/index.css` — importa o Tailwind CSS.
- Dados são salvos no `localStorage` do navegador (chave `inventario-dados-v1`),
  então ficam só no seu computador/navegador atual.

## Se quiser múltiplos usuários vendo o mesmo inventário

Hoje os dados ficam salvos localmente no navegador (`localStorage`), então
cada pessoa que abrir o app terá seu próprio inventário. Para compartilhar
entre várias pessoas/dispositivos, troque as funções `loadData` e `saveData`
em `src/App.jsx` por chamadas a um backend (ex: uma API própria, Supabase,
Firebase). O restante do app (estado, formulários, UI) não precisa mudar —
só o "de onde vêm os dados".

## Build para produção

```bash
npm run build
```
Gera os arquivos finais em `dist/`, prontos para hospedar em qualquer servidor
estático (Vercel, Netlify, GitHub Pages etc.).
