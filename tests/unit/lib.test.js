import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, easeIO } from '../../src/lib/math.js';
import { fmtT, galCounter } from '../../src/lib/format.js';
import { filmTotal, partOffset, partAt } from '../../src/lib/film.js';
import { pathLayout, snapY, nearestIndex, orbitSquash, screenFit, titleFit } from '../../src/lib/layout.js';

test('clamp limita ao intervalo (padrão 0..1)', () => {
  assert.equal(clamp(-1), 0);
  assert.equal(clamp(2), 1);
  assert.equal(clamp(0.4), 0.4);
  assert.equal(clamp(5, 0, 3), 3);
});

test('easeIO começa em 0, termina em 1, é simétrico e crescente', () => {
  assert.equal(easeIO(0), 0);
  assert.equal(easeIO(1), 1);
  assert.equal(easeIO(0.5), 0.5);
  let prev = -1;
  for (let k = 0; k <= 100; k++) {
    const v = easeIO(k / 100);
    assert.ok(v >= prev);
    prev = v;
    assert.ok(Math.abs(easeIO(k / 100) + easeIO(1 - k / 100) - 1) < 1e-9);
  }
});

test('fmtT formata mm:ss', () => {
  assert.equal(fmtT(0), '00:00');
  assert.equal(fmtT(59.9), '00:59');
  assert.equal(fmtT(333.3), '05:33');
  assert.equal(fmtT(-4), '00:00');
});

test('galCounter: "01 / 14"', () => {
  assert.equal(galCounter(0, 14), '01 / 14');
  assert.equal(galCounter(8, 9), '09 / 09');
});

test('filme em partes: total, início de cada parte e conversão de tempo', () => {
  const D = [83.3, 83.3, 83.3, 83.4];
  assert.ok(Math.abs(filmTotal(D) - 333.3) < 1e-9);
  assert.equal(partOffset(D, 0), 0);
  assert.ok(Math.abs(partOffset(D, 2) - 166.6) < 1e-9);
  assert.deepEqual(partAt(D, 0), { i: 0, lt: 0 });
  assert.equal(partAt(D, 83.29).i, 0);
  assert.equal(partAt(D, 83.3).i, 1);
  assert.equal(partAt(D, 333).i, 3);
  assert.ok(Math.abs(partAt(D, 200).lt - (200 - 166.6)) < 1e-9);
  assert.equal(partAt(D, 9999).i, 3, 'nunca passa da última parte');
});

test('percurso 3D: celular tem mais espaço vertical que o computador', () => {
  const d = pathLayout(false, 7), m = pathLayout(true, 7);
  assert.equal(d.S1, 6.55);
  assert.ok(m.SPY > d.SPY);
  assert.ok(Math.abs(d.TY - (d.S1 - d.S0) * d.SPY) < 1e-9);
});

test('snap: posição de cada janela e índice mais próximo', () => {
  const { S0, S1 } = pathLayout(false, 7), H = 10000;
  assert.equal(snapY(S0, S0, S1, H), 0);
  assert.equal(snapY(S1, S0, S1, H), H);
  const Y = [0, 1, 2, 3, 4, 5, 6].map((i) => snapY(i, S0, S1, H));
  for (let i = 1; i < Y.length; i++) assert.ok(Y[i] > Y[i - 1], 'janelas em ordem');
  assert.equal(nearestIndex(Y, Y[3] + 5), 3);
  assert.equal(nearestIndex(Y, -500), 0);
  assert.equal(nearestIndex(Y, 1e9), 6);
});

// Telas reais: celulares (em pé), tablet e computadores.
const SCREENS = [
  ['iPhone SE', 375, 667], ['iPhone 15', 393, 852], ['Galaxy S', 360, 800], ['iPad', 820, 1180],
  ['notebook', 1366, 768], ['desktop', 1920, 1080], ['quase quadrada', 1100, 1000],
];

for (const [name, W, H] of SCREENS) {
  test(`janelas e títulos cabem na tela: ${name} (${W}×${H})`, () => {
    const aspect = W / H, vW = 4.72 * aspect, { SPY } = pathLayout(W < H, 7);
    for (const ar of [16 / 9, 0.8]) {
      const h = ar > 1 ? 3.9 : 5.4, w = h * ar;
      const mf = screenFit(aspect, w, ar, SPY);
      const gs = 0.44 * 1.1 * mf; // escala máxima (janela em foco)
      assert.ok(w * gs <= vW * 0.951, `largura da janela ${ar.toFixed(2)} cabe`);
      if (aspect < 1) assert.ok((w / ar) * gs <= SPY * 0.801, 'altura não invade a janela vizinha');
      const tf = titleFit(aspect, gs);
      assert.ok(6.8 * gs * tf <= vW * 0.91, 'título cabe na largura');
    }
    assert.ok(orbitSquash(aspect) > 0 && orbitSquash(aspect) <= 1);
  });
}
