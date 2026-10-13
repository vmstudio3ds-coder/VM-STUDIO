/** Duração total do filme (soma das partes). @param {number[]} D */
export const filmTotal = (D) => D.reduce((a, b) => a + b, 0);

/** Início (em s) da parte i dentro do filme inteiro. @param {number[]} D @param {number} i */
export const partOffset = (D, i) => D.slice(0, i).reduce((a, b) => a + b, 0);

/**
 * Converte um tempo do filme inteiro na parte correspondente e no tempo local dela.
 * @param {number[]} D durações das partes
 * @param {number} t tempo global em segundos
 * @returns {{i:number, lt:number}}
 */
export function partAt(D, t) {
  let i = 0;
  while (i < D.length - 1 && t >= partOffset(D, i + 1)) i++;
  return { i, lt: t - partOffset(D, i) };
}
