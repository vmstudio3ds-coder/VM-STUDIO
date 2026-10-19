import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { P, A } from '../../src/data/projects.js';
import { CO, PRI, CATS, sortAcervo } from '../../src/lib/acervo.js';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const BLOB = /^\/_blob\/[0-9a-f]{32}$/;
const isAsset = (u) => BLOB.test(u) || (u.startsWith('@inline:') && existsSync(SRC + u.slice(8)));

test('o primeiro item do percurso 3D é um filme', () => {
  assert.ok(P[0].vfs, `primeiro é ${P[0].t}`);
});

test('todo projeto tem título, legenda, categoria válida e 3 cores', () => {
  for (const p of A) {
    assert.ok(p.t && p.m, `título/legenda em ${p.t}`);
    assert.ok(CO.includes(p.c), `categoria "${p.c}" de ${p.t}`);
    assert.equal(p.g.length, 3);
    p.g.forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/i));
  }
});

test('títulos não se repetem', () => {
  const t = A.map((p) => p.t);
  assert.equal(new Set(t).size, t.length);
});

test('o percurso 3D está todo dentro do Acervo', () => {
  for (const p of P) assert.ok(A.includes(p), p.t);
});

test('toda imagem e vídeo aponta para um arquivo que existe', () => {
  for (const p of A) {
    for (const u of p.gal || []) assert.ok(isAsset(u), `${p.t}: ${u.slice(0, 60)}`);
    for (const k of ['v', 'vm', 'poster']) if (p[k]) assert.ok(isAsset(p[k]), `${p.t}.${k}`);
    for (const u of p.vfs || []) assert.ok(isAsset(u), `${p.t}: parte ${u}`);
  }
});

test('filmes: cada parte tem duração, com pôster e loop leve para celular', () => {
  for (const p of A.filter((x) => x.c === 'Filmes')) {
    assert.ok(p.vfs && p.vfs.length > 0, p.t);
    assert.equal(p.durs.length, p.vfs.length, `${p.t}: durs × partes`);
    p.durs.forEach((d) => assert.ok(d > 0));
    assert.ok(p.poster && p.vm && p.v, `${p.t}: poster/vm/v`);
  }
});

test('galerias não ficam vazias e foco vertical (fy) bate com a galeria', () => {
  for (const p of A.filter((x) => x.gal)) {
    assert.ok(p.gal.length > 0, p.t);
    if (p.fy) assert.equal(p.fy.length, p.gal.length, `${p.t}: fy`);
  }
});

test('Acervo: abas e ordem (Filmes, Empreendimentos na prioridade, Exteriores, Interiores)', () => {
  assert.deepEqual(CATS, ['Todos', 'Filmes', 'Empreendimentos', 'Exteriores', 'Interiores']);
  const s = sortAcervo([...A]);
  const cats = s.map((p) => p.c);
  assert.deepEqual([...new Set(cats)], CO, 'categorias agrupadas na ordem');
  const emp = s.filter((p) => p.c === 'Empreendimentos').map((p) => p.t);
  assert.deepEqual(emp.slice(0, PRI.length), PRI);
  assert.deepEqual(s.filter((p) => p.c === 'Filmes').map((p) => p.t), ['Vale dos Barões', 'Miradouro by Chartuni', 'Costa Dourada']);
});
