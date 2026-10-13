/** Segundos → "mm:ss" (negativos viram 00:00). */
export const fmtT = (t) => {
  t = Math.max(0, Math.floor(t));
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
};

/** Contador da galeria: (0, 14) → "01 / 14". */
export const galCounter = (i, n) => String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
