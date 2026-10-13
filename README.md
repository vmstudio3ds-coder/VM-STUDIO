# VM Studio — site

Portfólio imersivo da VM Studio (Vitor Milagres). O site publicado é **um único arquivo HTML**
(`dist/vm-studio.html`), gerado a partir do código-fonte em `src/`.

## Estrutura

```
src/
  index.html        marcação da página (com {{css}} e {{js}} preenchidos no build)
  styles.css        estilos
  app.js            cena 3D, snap, lightbox, player de filme, Acervo
  lib/              lógica pura e testável (layout das janelas, snap, filme, ordem do Acervo…)
  data/projects.js  projetos: percurso 3D (P) e Acervo (A)
  data/galleries.js galerias embutidas (apontam para src/assets/gal/…)
  assets/           imagens embutidas no HTML final (logo, galerias)
scripts/build.mjs   junta tudo em dist/vm-studio.html
scripts/graph.mjs   gera o grafo do código em graphify-out/
tests/unit/         testes unitários (node:test)
tests/e2e/          testes ponta a ponta no Chromium (Playwright)
```

Os arquivos em `src/` são módulos ES (com `import`/`export`) para que lint, TypeScript e
testes enxerguem as dependências. No build, imports e exports são removidos e tudo vira um
`<script>` clássico, igual ao site original. Imagens referenciadas como `@inline:caminho`
viram data URI. Vídeos e fotos grandes ficam no armazenamento do artifact (`/_blob/…`).

## Comandos

| comando | o que faz |
|---|---|
| `npm install` | instala ESLint, TypeScript e Playwright |
| `npx playwright install chromium` | baixa o navegador dos testes E2E (uma vez) |
| `npm run build` | gera `dist/vm-studio.html` |
| `npm run lint` | ESLint |
| `npm run typecheck` | validação de tipos com TypeScript (`checkJs`) |
| `npm run test:unit` | testes unitários |
| `npm run test:e2e` | build + testes E2E no Chromium (desktop, iPhone e Pixel) |
| `npm run check` | tudo acima, na ordem |
| `npm run graph` | atualiza o grafo do código (`graphify-out/`) |

## Fluxo de trabalho (CI antes do merge)

1. Crie uma branch: `git switch -c minha-mudanca`
2. Altere o código em `src/` e rode `npm run check`
3. `git push -u origin minha-mudanca` e abra um Pull Request para a `main`
4. O GitHub Actions (`.github/workflows/ci.yml`) roda **4 checks**: Lint, TypeScript,
   Testes unitários e Testes E2E. O site gerado fica disponível como artefato do run.
5. Com a proteção de branch abaixo, o botão de merge só libera quando os 4 passam.

### Ligar a proteção da `main` (uma vez)

No GitHub: **Settings → Branches → Add branch ruleset** (ou *Add rule*) para `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass → adicione `Lint`, `TypeScript`, `Testes unitários`, `Testes E2E`
- ✅ Require branches to be up to date before merging
- ✅ Block force pushes

## Publicar

Depois do merge: `npm run build` e publicar `dist/vm-studio.html` no mesmo artifact
(aumente `vm-version` em `src/index.html` a cada versão).

## O que os testes cobrem

- **Unitários**: easing e limites; formato de tempo; conversão de tempo em parte do filme;
  posições do snap; janelas e títulos cabendo na tela em 7 tamanhos (celulares, tablet,
  notebook, desktop); integridade dos projetos (categorias, cores, arquivos existentes,
  durações dos filmes); ordem do Acervo; build (bundle válido, sem nomes duplicados, < 16 MB).
- **E2E**: abertura preta com contador `000` centralizado; percorrer o site sem erros de JS;
  uma janela por giro do mouse; abas e filtros do Acervo; galeria (setas, teclado, Esc);
  filme "uma tomada" com player próprio; links de contato; celular com scroll-snap e sem
  rolagem lateral.

Os testes E2E trocam o three.js do CDN por um substituto (`tests/e2e/three-stub.js`), então
validam a página e as interações, não a renderização 3D em si.
