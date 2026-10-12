/**
 * Pontuação determinística e independente da renderização:
 *   pontos = metros percorridos (inteiros) + 10 × livros coletados
 * A distância vem da simulação em passo fixo, então pausar, trocar de aba ou
 * mudar a taxa de quadros não altera o resultado.
 */
export const POINTS_PER_BOOK = 10

export function computeScore(distance: number, books: number) {
  return Math.floor(distance) + POINTS_PER_BOOK * books
}
