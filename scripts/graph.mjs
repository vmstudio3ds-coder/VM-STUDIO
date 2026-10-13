// Grafo de conhecimento do código (no estilo do graphify): lê o código-fonte,
// liga símbolos, elementos da página, projetos, estilos e testes, detecta
// comunidades e gera graphify-out/{graph.json, GRAPH_REPORT.md, graph.html}.
//   npm run graph
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'graphify-out');
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');

const nodes = new Map();
const links = new Map();
/** @param {string} id @param {Record<string, any>} attrs */
function node(id, attrs) {
  if (!nodes.has(id)) nodes.set(id, { id, ...attrs });
  else Object.assign(nodes.get(id), attrs);
  return id;
}
function link(a, b, rel) {
  if (!a || !b || a === b) return;
  const k = a + '\u0000' + b + '\u0000' + rel;
  const l = links.get(k);
  if (l) l.w++;
  else links.set(k, { source: a, target: b, rel, w: 1 });
}

// ---------- AST helpers ----------
const parse = (code) => espree.parse(code, { ecmaVersion: 2022, sourceType: 'module', loc: true, comment: true });
function walk(n, fn) {
  if (!n || typeof n.type !== 'string') return;
  fn(n);
  for (const k in n) {
    if (k === 'loc' || k === 'range' || k === 'parent') continue;
    const v = n[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, fn));
    else if (v && typeof v.type === 'string') walk(v, fn);
  }
}
/** Identificadores livres de um trecho: ignora nomes de propriedade e nomes declarados dentro dele. */
function idsIn(root) {
  const used = new Set(), local = new Set();
  const pat = (p) => walk(p, (x) => x.type === 'Identifier' && local.add(x.name));
  (function visit(n, parent, key) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Identifier') {
      const isProp = (parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed) ||
        (parent && parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand);
      if (!isProp) used.add(n.name);
      return;
    }
    if (n.type === 'VariableDeclarator') pat(n.id);
    if (/Function/.test(n.type)) { n.params.forEach(pat); if (n.id && n !== root) local.add(n.id.name); }
    if (n.type === 'CatchClause' && n.param) pat(n.param);
    for (const k in n) {
      if (k === 'loc' || k === 'range') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => visit(c, n, k));
      else if (v && typeof v.type === 'string') visit(v, n, k);
    }
  })(root, null, null);
  // Na raiz, um declarador "const x = ..." não deve esconder x de quem está fora.
  local.forEach((x) => used.delete(x));
  return used;
}
const strings = (n) => {
  const s = [];
  walk(n, (x) => {
    if (x.type === 'Literal' && typeof x.value === 'string') s.push(x.value);
    if (x.type === 'TemplateLiteral') x.quasis.forEach((q) => s.push(q.value.cooked || ''));
  });
  return s;
};
const domIds = (strs) => {
  const s = new Set();
  strs.forEach((t) => (t.match(/#[a-z][\w-]*/gi) || []).forEach((m) => s.add(m)));
  return s;
};
const threeUses = (n) => {
  const s = new Set();
  walk(n, (x) => x.type === 'MemberExpression' && x.object.type === 'Identifier' && x.object.name === 'THREE' && x.property.name && s.add(x.property.name));
  return s;
};

// ---------- 1. Módulos JS de src/ ----------
const SRC_FILES = ['src/data/galleries.js', 'src/data/projects.js', ...readdirSync(join(ROOT, 'src/lib')).sort().map((f) => 'src/lib/' + f), 'src/app.js'];
const DOM_IDS = new Set((rd('src/index.html').match(/id="([\w-]+)"/g) || []).map((m) => '#' + m.slice(4, -1)));
/** nome exportado → id do nó */
const exported = new Map();
/** @type {{file:string, name:string, id:string, body:any}[]} */
const units = [];

const KIND_OF = (decl) => {
  const init = decl.init;
  if (!init) return 'variável';
  if (/Function/.test(init.type)) return 'função';
  if (init.type === 'CallExpression' && /Function/.test(init.callee.type)) return 'módulo (IIFE)';
  if (init.type === 'NewExpression' && init.callee.type === 'MemberExpression' && init.callee.object.name === 'THREE') return 'objeto 3D';
  if (init.type === 'ArrayExpression' || init.type === 'ObjectExpression') return 'dados';
  return 'variável';
};

for (const file of SRC_FILES) {
  const code = rd(file);
  const ast = parse(code);
  const fid = node(file, { label: file.replace('src/', ''), kind: 'arquivo', file, lines: code.split('\n').length });
  const sections = ast.comments
    .filter((c) => c.type === 'Block' && /^\s*=+\s*.+?\s*=+\s*$/.test(c.value))
    .map((c) => ({ line: c.loc.start.line, name: c.value.replace(/=+/g, '').trim().split(/\s[—:]\s?|:\s/)[0].trim() }));
  const comments = ast.comments.filter((c) => c.type === 'Block');
  const sectionAt = (line) => (sections.filter((s) => s.line <= line).pop() || {}).name || null;
  const noteAt = (line) => {
    const c = comments.filter((x) => x.loc.end.line === line - 1 || x.loc.end.line === line).pop();
    return c ? c.value.replace(/^[\s*=]+|[\s*=]+$/g, '').trim() : null;
  };
  const seen = new Map();
  const uniq = (name) => {
    const k = seen.get(name) || 0;
    seen.set(name, k + 1);
    return k ? `${name} #${k + 1}` : name;
  };
  const add = (name, kind, body, line, isExport) => {
    const id = node(`${file}::${name}`, { label: name, kind, file, line, section: sectionAt(line), note: noteAt(line) });
    link(fid, id, 'define');
    units.push({ file, name, id, body });
    if (isExport) exported.set(name, id);
    return id;
  };
  for (const st of ast.body) {
    const line = st.loc.start.line;
    if (st.type === 'ImportDeclaration') continue;
    const isExport = st.type === 'ExportNamedDeclaration';
    const d = isExport ? st.declaration : st;
    if (d.type === 'VariableDeclaration') {
      for (const dc of d.declarations) {
        if (dc.id.type === 'Identifier') add(dc.id.name, KIND_OF(dc), dc.init, dc.loc.start.line, isExport);
        else for (const p of dc.id.properties) add(p.key.name, 'variável', dc.init, dc.loc.start.line, isExport);
      }
    } else if (d.type === 'FunctionDeclaration') {
      add(d.id.name, 'função', d, line, isExport);
    } else if (d.type === 'ExpressionStatement') {
      const e = d.expression;
      let name;
      if (e.type === 'CallExpression' && e.callee.type === 'Identifier' && e.callee.name === 'addEventListener') name = 'evento: ' + e.arguments[0].value;
      else if (e.type === 'CallExpression' && /Function/.test(e.callee.type)) name = e.callee.id ? `${e.callee.id.name}()` : (noteAt(line) || 'bloco').split(/[:.(]/)[0].slice(0, 40).trim();
      else if (e.type === 'CallExpression' && e.callee.type === 'MemberExpression') name = code.slice(e.callee.start, e.callee.end).replace(/\s+/g, ' ').slice(0, 40);
      else if (e.type === 'AssignmentExpression') name = code.slice(e.left.start, e.left.end).slice(0, 40) + ' =';
      else name = code.slice(st.start, Math.min(st.end, st.start + 34)).replace(/\s+/g, ' ').replace(/[;{(]+$/, '') + '…';
      add(uniq(name), name.startsWith('evento') ? 'evento' : 'bloco', e, line, false);
    } else if (d.type === 'BlockStatement' || d.type === 'IfStatement') {
      const head = d.type === 'IfStatement' ? `if (${code.slice(d.test.start, d.test.end)})` : `bloco L${line}`;
      add(uniq(noteAt(line) || head), 'bloco', d, line, false);
    }
  }
}

// Resolve referências: nomes locais do arquivo primeiro, depois os exportados.
const byFile = new Map();
units.forEach((u) => {
  if (!byFile.has(u.file)) byFile.set(u.file, new Map());
  byFile.get(u.file).set(u.name, u.id);
});
const three = node('three.js', { label: 'three.js r128 (CDN)', kind: 'externo' });
for (const u of units) {
  const local = byFile.get(u.file);
  for (const name of idsIn(u.body)) {
    const target = local.get(name) || exported.get(name);
    if (target && target !== u.id) link(u.id, target, 'usa');
  }
  for (const id of domIds(strings(u.body))) if (DOM_IDS.has(id)) link(u.id, node('dom:' + id, { label: id, kind: 'elemento' }), 'mexe em');
  const t = threeUses(u.body);
  if (t.size) {
    link(u.id, three, 'usa');
    nodes.get(u.id).three = [...t].sort();
  }
}

// ---------- 2. Página (index.html) e estilos ----------
const html = node('src/index.html', { label: 'index.html', kind: 'arquivo', file: 'src/index.html' });
const css = node('src/styles.css', { label: 'styles.css', kind: 'arquivo', file: 'src/styles.css' });
const SECTION_OF = { '#acervo': 'Acervo', '#sobre': 'Sobre', '#contato': 'Contato', '#lb': 'Lightbox', '#ld': 'Abertura', '#hud': 'HUD', '#endcap': 'Transição final' };
for (const id of DOM_IDS) {
  const n = node('dom:' + id, { label: id, kind: 'elemento', note: SECTION_OF[id] || null });
  link(html, n, 'contém');
}
const cssText = rd('src/styles.css');
for (const id of DOM_IDS) {
  const re = new RegExp(id.replace('#', '#') + '(?![\\w-])', 'g');
  const k = (cssText.match(re) || []).length;
  if (k) {
    link(css, 'dom:' + id, 'estiliza');
    links.get(css + '\u0000' + 'dom:' + id + '\u0000' + 'estiliza').w = k;
  }
}

// ---------- 3. Projetos (conteúdo) ----------
const { P, A } = await import(join(ROOT, 'src/data/projects.js'));
const pFile = 'src/data/projects.js';
for (const p of A) {
  const id = node('projeto:' + p.t, {
    label: p.t, kind: 'projeto', note: p.m, cat: p.c,
    media: p.vfs ? `filme em ${p.vfs.length} partes` : `${(p.gal || []).length} imagens`,
    path3d: P.includes(p),
  });
  link(node('cat:' + p.c, { label: p.c, kind: 'categoria' }), id, 'agrupa');
  link(`${pFile}::A`, id, 'lista');
  if (P.includes(p)) link(`${pFile}::P`, id, 'percurso 3D');
  const gal = { GAL: 'miradouro', GAL2: 'espraiado', GAL3: 'porto-villa', GAL4: 'galeria-cafe' };
  Object.entries(gal).forEach(([g, folder]) => {
    if (p.gal && p.gal[0] && p.gal[0].includes(`/gal/${folder}/`)) link(id, `src/data/galleries.js::${g}`, 'imagens');
  });
}
link('src/lib/acervo.js::CATS', 'cat:Todos', 'aba');
node('cat:Todos', { label: 'Todos', kind: 'categoria' });
for (const c of ['Filmes', 'Empreendimentos', 'Exteriores', 'Interiores']) link('src/lib/acervo.js::CO', 'cat:' + c, 'ordem');

// ---------- 4. Build e testes ----------
const build = node('scripts/build.mjs', { label: 'build.mjs', kind: 'ferramenta', file: 'scripts/build.mjs', note: 'gera dist/vm-studio.html' });
for (const f of [...SRC_FILES, 'src/index.html', 'src/styles.css']) link(build, f, 'empacota');
const dist = node('dist/vm-studio.html', { label: 'vm-studio.html (site publicado)', kind: 'saída' });
link(build, dist, 'gera');
const ci = node('.github/workflows/ci.yml', { label: 'CI (GitHub Actions)', kind: 'ferramenta', note: 'lint · typescript · unit · e2e' });
for (const t of ['eslint.config.js', 'tsconfig.json']) {
  link(ci, node(t, { label: t, kind: 'ferramenta' }), 'roda');
  SRC_FILES.forEach((f) => link(t, f, 'verifica'));
}

for (const dir of ['tests/unit', 'tests/e2e']) {
  for (const f of readdirSync(join(ROOT, dir)).filter((x) => /\.(test|e2e)\.js$/.test(x))) {
    const file = `${dir}/${f}`, code = rd(file);
    const tid = node(file, { label: f, kind: 'teste', file, tests: (code.match(/^\s*test\(/gm) || []).length + (code.match(/^\s{2}test\(/gm) ? 0 : 0) });
    link(ci, tid, 'roda');
    const ast = parse(code);
    for (const st of ast.body.filter((s) => s.type === 'ImportDeclaration')) {
      const from = st.source.value;
      if (from.includes('scripts/build.mjs')) { link(tid, build, 'testa'); continue; }
      const m = from.match(/src\/(.+\.js)$/);
      if (!m) continue;
      for (const s of st.specifiers) link(tid, exported.get(s.local.name) || `src/${m[1]}`, 'testa');
    }
    if (dir === 'tests/e2e') {
      link(tid, dist, 'testa');
      for (const id of domIds(strings(ast))) if (DOM_IDS.has(id)) link(tid, 'dom:' + id, 'verifica');
      for (const g of ['SN', 'PN']) if (new RegExp(`\\b${g}\\.`).test(code)) link(tid, `src/app.js::${g}`, 'inspeciona');
    }
  }
}

// Remove arestas para nós inexistentes.
for (const [k, l] of links) if (!nodes.has(l.source) || !nodes.has(l.target)) links.delete(k);

// ---------- 5. Comunidades (propagação de rótulos ponderada, determinística) ----------
const N = [...nodes.values()];
const adj = new Map(N.map((n) => [n.id, new Map()]));
for (const l of links.values()) {
  if (l.rel === 'define' || l.rel === 'empacota' || l.rel === 'contém') continue; // estruturais não definem tema
  const w = l.w;
  adj.get(l.source).set(l.target, (adj.get(l.source).get(l.target) || 0) + w);
  adj.get(l.target).set(l.source, (adj.get(l.target).get(l.source) || 0) + w);
}
const label = new Map(N.map((n, i) => [n.id, i]));
let rng = 7;
const rand = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let it = 0; it < 40; it++) {
  const order = N.map((n) => n.id).sort(() => rand() - 0.5);
  let changed = 0;
  for (const id of order) {
    const score = new Map();
    for (const [nb, w] of adj.get(id)) score.set(label.get(nb), (score.get(label.get(nb)) || 0) + w);
    if (!score.size) continue;
    let best = label.get(id), bw = score.get(best) || 0;
    for (const [lab, w] of score) if (w > bw || (w === bw && lab < best)) { best = lab; bw = w; }
    if (best !== label.get(id)) { label.set(id, best); changed++; }
  }
  if (!changed) break;
}
// Nós soltos herdam a comunidade do arquivo que os define.
for (const l of links.values()) if (l.rel === 'define' && !adj.get(l.target).size) label.set(l.target, label.get(l.source));
const groups = new Map();
N.forEach((n) => {
  const g = label.get(n.id);
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(n);
});
const degree = (id) => [...links.values()].filter((l) => l.source === id || l.target === id).length;
/** Nomes legíveis para as comunidades, a partir do nó central de cada uma. */
const FRIENDLY = {
  openLB: 'Lightbox, galeria e player', SN: 'Snap e rolagem', 'frame()': 'Loop de animação e mouse', A: 'Projetos e Acervo',
  'three.js r128 (CDN)': 'Cena 3D', 'styles.css': 'Página, estilos e E2E', 'lib.test.js': 'Lógica pura testada (lib)',
  'build.mjs': 'Build e publicação', 'app.js': 'Arquivos e verificação (lint/TS)', lg: 'Logo em partículas', hc: 'Névoa do eixo de luz',
};
const comms = [...groups.values()].sort((a, b) => b.length - a.length).map((members, i) => {
  const top = [...members].sort((a, b) => degree(b.id) - degree(a.id));
  const sec = members.map((m) => m.section).filter(Boolean);
  const secTop = sec.length ? Object.entries(sec.reduce((o, s) => ((o[s] = (o[s] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1])[0][0] : null;
  const share = secTop ? sec.filter((x) => x === secTop).length / members.length : 0;
  const nice = (x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();
  const hub = top.find((m) => m.label.length > 2) || top[0];
  const known = top.slice(0, 3).map((m) => FRIENDLY[m.label]).find(Boolean);
  const name = known || (secTop && share >= 0.5 ? `${nice(secTop)} · ${hub.label}` : hub.label);
  members.forEach((m) => (m.community = i));
  return { id: i, name, size: members.length, hubs: top.slice(0, 5).map((m) => m.label) };
});

// ---------- 6. Layout (força dirigida, pré-calculado) ----------
const pos = new Map();
N.forEach((n, i) => {
  const a = (n.community * 2.39996) + i * 0.01, r = 120 + n.community * 18;
  pos.set(n.id, { x: Math.cos(a) * r + (rand() - 0.5) * 60, y: Math.sin(a) * r + (rand() - 0.5) * 60, vx: 0, vy: 0 });
});
const L = [...links.values()];
const STRUCT = new Set(['define', 'contém', 'empacota', 'verifica']);
const LA = L.filter((l) => !STRUCT.has(l.rel));
for (let it = 0; it < 420; it++) {
  const cool = 1 - it / 420;
  for (let i = 0; i < N.length; i++) {
    const a = pos.get(N[i].id);
    for (let j = i + 1; j < N.length; j++) {
      const b = pos.get(N[j].id);
      let dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy + 0.01;
      const f = (N[i].community === N[j].community ? 700 : 1400) / d2;
      dx *= f; dy *= f;
      a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy;
    }
  }
  for (const l of LA) {
    const a = pos.get(l.source), b = pos.get(l.target);
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
    const same = nodes.get(l.source).community === nodes.get(l.target).community;
    const f = ((d - (same ? 38 : 90)) / d) * (same ? 0.05 : 0.012);
    a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
  }
  for (const n of N) {
    const p = pos.get(n.id);
    p.vx -= p.x * 0.012; p.vy -= p.y * 0.012;
    const v = Math.hypot(p.vx, p.vy), m = 14 * cool + 0.5;
    if (v > m) { p.vx *= m / v; p.vy *= m / v; }
    p.x += p.vx; p.y += p.vy; p.vx *= 0.5; p.vy *= 0.5;
  }
}
N.forEach((n) => {
  const p = pos.get(n.id);
  n.x = Math.round(p.x * 10) / 10;
  n.y = Math.round(p.y * 10) / 10;
  n.degree = degree(n.id);
  n.weight = LA.filter((l) => l.source === n.id || l.target === n.id).length;
});

// ---------- 7. Saídas ----------
mkdirSync(OUT, { recursive: true });
const graph = { generated: new Date().toISOString().slice(0, 10), nodes: N, links: L, communities: comms };
writeFileSync(join(OUT, 'graph.json'), JSON.stringify(graph, null, 1));

const kinds = N.reduce((o, n) => ((o[n.kind] = (o[n.kind] || 0) + 1), o), {});
const gods = [...N].filter((n) => !['arquivo', 'externo'].includes(n.kind)).sort((a, b) => b.degree - a.degree).slice(0, 10);
const cross = L.filter((l) => l.rel === 'usa' && nodes.get(l.source).community !== nodes.get(l.target).community && nodes.get(l.target).kind !== 'externo')
  .map((l) => ({ l, s: degree(l.source) * degree(l.target) })).sort((a, b) => a.s - b.s).slice(0, 8).map((x) => x.l);
const orphans = N.filter((n) => n.degree <= 1 && !['projeto', 'elemento', 'categoria'].includes(n.kind));
const untested = [...exported.entries()].filter(([, id]) => id.startsWith('src/lib/') && !L.some((l) => l.rel === 'testa' && l.target === id)).map(([n]) => n);
const md = `# Grafo do código — VM Studio

Gerado em ${graph.generated} por \`npm run graph\` (graph.json · graph.html).

**${N.length} nós · ${L.length} ligações · ${comms.length} comunidades**

${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Nós centrais (mais conectados)

| nó | tipo | ligações | onde |
|---|---|---|---|
${gods.map((n) => `| ${n.label} | ${n.kind} | ${n.degree} | ${n.file ? `${relative(ROOT, join(ROOT, n.file))}${n.line ? ':' + n.line : ''}` : '—'} |`).join('\n')}

## Comunidades

${comms.filter((c) => c.size > 1).map((c) => `- **${c.name}** (${c.size}) — ${c.hubs.join(', ')}`).join('\n')}

## Conexões entre áreas (menos óbvias)

${cross.map((l) => `- ${nodes.get(l.source).label} → ${nodes.get(l.target).label}`).join('\n') || '- nenhuma'}

## Pontos de atenção

- Funções de \`src/lib\` sem teste unitário: ${untested.length ? untested.join(', ') : 'nenhuma ✔'}
- Nós quase isolados (≤ 1 ligação): ${orphans.length ? orphans.map((n) => n.label).join(', ') : 'nenhum ✔'}
- \`app.js\` concentra ${N.filter((n) => n.file === 'src/app.js').length} símbolos; candidatos a virar módulo próprio: ${comms.filter((c) => c.size >= 6).slice(0, 4).map((c) => c.name).join(' · ')}
`;
writeFileSync(join(OUT, 'GRAPH_REPORT.md'), md);

const tpl = readFileSync(join(ROOT, 'scripts/graph-template.html'), 'utf8');
writeFileSync(join(OUT, 'graph.html'), tpl.replace('/*__GRAPH__*/null', () => JSON.stringify(graph).replace(/</g, '\\u003c')));
console.log(`✔ graphify-out: ${N.length} nós, ${L.length} ligações, ${comms.length} comunidades`);
