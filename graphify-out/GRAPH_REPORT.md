# Grafo do código — VM Studio

Gerado em 2026-10-13 por `npm run graph` (graph.json · graph.html).

**248 nós · 729 ligações · 12 comunidades**

- variável: 61
- bloco: 44
- função: 32
- elemento: 28
- projeto: 18
- dados: 17
- objeto 3D: 13
- arquivo: 10
- evento: 9
- categoria: 5
- ferramenta: 4
- teste: 4
- módulo (IIFE): 1
- externo: 1
- saída: 1

## Nós centrais (mais conectados)

| nó | tipo | ligações | onde |
|---|---|---|---|
| frame() | bloco | 62 | src/app.js:97 |
| A | dados | 23 | src/data/projects.js:12 |
| $ | função | 21 | src/app.js:7 |
| openLB | função | 20 | src/app.js:216 |
| site.e2e.js | teste | 18 | tests/e2e/site.e2e.js |
| P | dados | 17 | src/data/projects.js:2 |
| SN | módulo (IIFE) | 16 | src/app.js:137 |
| showG | função | 15 | src/app.js:183 |
| lib.test.js | teste | 14 | tests/unit/lib.test.js |
| evento: pointermove | evento | 13 | src/app.js:177 |

## Comunidades

- **Lightbox, galeria e player** (48) — $, openLB, showG, closeLB, gp
- **Cena 3D** (43) — three.js r128 (CDN), scene, glow, sz, PM.forEach
- **Projetos e Acervo** (39) — A, P, Exteriores, CO, Empreendimentos
- **Snap e rolagem** (30) — SN, N, if (TOUCH), evento: click, acvS
- **Loop de animação e mouse** (28) — frame(), evento: pointermove, cv, ptr, mx
- **Página, estilos e E2E** (22) — styles.css, site.e2e.js, #lb, #lbm, #acervo
- **Lógica pura testada (lib)** (15) — lib.test.js, filmUI, partOffset, partAt, filmTotal
- **Arquivos e verificação (lint/TS)** (11) — app.js, lib/layout.js, eslint.config.js, tsconfig.json, data/galleries.js
- **Build e publicação** (5) — build.mjs, rio, document.querySelectorAll('.t').forEach, vm-studio.html (site publicado), build.test.js
- **Logo em partículas** (3) — lg, lg.src =, LOGO
- **Névoa do eixo de luz** (3) — hc, hc.width =, Eixo de Luz: feixes volumétricos + partículas em espiral + orbe solar

## Conexões entre áreas (menos óbvias)

- ['#acervo h2','.filters','.about h2','.a → rio
- cats.forEach → cats
- slideTo → easeIO
- hazeM → hc
- logoReady → lg
- logoReady.then → logoReady
- N → PM
- scene.add #3 → scene

## Pontos de atenção

- Funções de `src/lib` sem teste unitário: nenhuma ✔
- Nós quase isolados (≤ 1 ligação): nenhum ✔
- `app.js` concentra 153 símbolos; candidatos a virar módulo próprio: Lightbox, galeria e player · Cena 3D · Projetos e Acervo · Snap e rolagem
