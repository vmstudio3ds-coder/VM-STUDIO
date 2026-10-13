import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripModule, inlineAssets, bundle, build } from '../../scripts/build.mjs';

test('stripModule remove imports e a palavra export', () => {
  const out = stripModule("import {a} from './a.js';\nexport const b=1;\nexport function c(){}\nconst d='export const';\n");
  assert.equal(out, "const b=1;\nfunction c(){}\nconst d='export const';\n");
});

test('inlineAssets troca @inline por data URI', () => {
  const out = inlineAssets('src="@inline:x.png"', () => Buffer.from('hi'));
  assert.equal(out, 'src="data:image/png;base64,aGk="');
  assert.throws(() => inlineAssets('@inline:x.txt', () => Buffer.from('')), /não suportado/);
});

test('o bundle é um script clássico válido, sem nomes duplicados entre arquivos', () => {
  const js = bundle();
  assert.ok(!/^\s*(import|export)\s/m.test(js), 'sobrou import/export');
  // Compilar detecta declarações duplicadas (const/let/function repetidos entre módulos).
  assert.doesNotThrow(() => new vm.Script(js, { filename: 'bundle.js' }));
});

test('build gera um HTML único, com CSS, script e imagens embutidos', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'vm-')), 'site.html');
  build({ out });
  const html = readFileSync(out, 'utf8');
  assert.ok(!html.includes('{{css}}') && !html.includes('{{js}}'));
  assert.ok(!html.includes('@inline:'), 'imagem não embutida');
  assert.match(html, /<meta name="vm-version" content="\d+">/);
  assert.match(html, /three\.js\/r128\/three\.min\.js/);
  assert.equal((html.match(/<script>/g) || []).length, 1);
  assert.ok(html.length < 16 * 1024 * 1024, 'limite de 16 MB do artifact');
});
