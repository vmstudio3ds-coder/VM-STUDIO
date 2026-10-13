/**
 * Parâmetros do percurso 3D (janelas em hélice).
 * @param {boolean} portrait tela em pé (celular)
 * @param {number} n número de janelas
 */
export function pathLayout(portrait, n) {
  const SPY = portrait ? 3.2 : 1.9;
  const S0 = portrait ? -0.62 : -1.1;
  const S1 = n - 1 + 0.55;
  return { SPY, S0, S1, TY: (S1 - S0) * SPY };
}

/** Rolagem (px) em que a janela de índice sv fica centralizada. */
export const snapY = (sv, S0, S1, H) => ((sv - S0) / (S1 - S0)) * H;

/** Índice do valor de Y mais próximo de y. @param {number[]} Y @param {number} y */
export function nearestIndex(Y, y) {
  let b = 0, bd = 1e9;
  Y.forEach((v, i) => {
    const d = Math.abs(v - y);
    if (d < bd) { bd = d; b = i; }
  });
  return b;
}

/** Fator que estreita a órbita em telas em pé, para as janelas não saírem da tela. */
export const orbitSquash = (aspect) => (aspect >= 1 ? 1 : Math.max(0.3, Math.pow(aspect, 1.2)));

/**
 * Escala que faz a janela caber na tela.
 * @param {number} aspect largura/altura da tela
 * @param {number} w largura da janela (unidades 3D)
 * @param {number} ar proporção da imagem
 * @param {number} spy espaçamento vertical entre janelas
 */
export function screenFit(aspect, w, ar, spy) {
  const vW = 4.72 * aspect, wh = w / ar;
  return aspect < 1
    ? Math.min((0.95 * vW) / (w * 0.44 * 1.1), (0.8 * spy) / (wh * 0.44 * 1.1))
    : Math.min(1, (0.86 * vW) / (w * 0.44 * 1.1));
}

/** Escala do título flutuante para caber na largura da tela. */
export function titleFit(aspect, gs) {
  const vW = 4.72 * aspect;
  return aspect < 1 ? (0.74 * vW) / (6.8 * gs) : Math.min(1, (0.9 * vW) / (6.8 * gs));
}
