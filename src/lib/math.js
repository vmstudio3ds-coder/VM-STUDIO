/** Limita x ao intervalo [a, b]. */
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** Easing cúbico in-out usado nas transições de rolagem (0→0, 1→1). */
export const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
