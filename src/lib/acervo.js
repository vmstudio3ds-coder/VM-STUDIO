/** Ordem das abas e das categorias no grid do Acervo. */
export const CO = ['Filmes', 'Empreendimentos', 'Exteriores', 'Interiores'];

/** Prioridade dentro de uma categoria (quem não está na lista vem depois, na ordem original). */
export const PRI = ['Miradouro', 'Essenza da Mata', 'Espraiado', 'Porto Villa Residence', 'Santa Marta'];

/** Abas de filtro exibidas no Acervo. */
export const CATS = ['Todos', ...CO];

/**
 * Ordena a lista do Acervo no lugar: categoria (CO) e depois prioridade (PRI).
 * @template {{c:string,t:string}} T
 * @param {T[]} list
 * @returns {T[]}
 */
export function sortAcervo(list) {
  const pri = (/** @type {string} */ t) => {
    const i = PRI.indexOf(t);
    return i < 0 ? 99 : i;
  };
  return list.sort((x, y) => CO.indexOf(x.c) - CO.indexOf(y.c) || pri(x.t) - pri(y.t));
}
