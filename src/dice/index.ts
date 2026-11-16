// ADR-009: sorteio com gerador criptográfico, sem semente, injetável nos testes.

/** Devolve um inteiro sem sinal de 32 bits uniforme. */
export type RandomSource = () => number

export const cryptoRandomSource: RandomSource = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0]

/** Expressão de dado (FEAT-009 §3.1). Tipo próprio: o `dice` não importa `content`. */
export interface Dice {
  count: number
  sides: number
  modifier?: number
}

const RANGE = 2 ** 32

/**
 * Uma face de 1 a `sides`, por rejeição (FEAT-009 §5): com `limit = floor(2³² / sides) × sides`, sorteia até
 * `x < limit` e devolve `x % sides + 1`. Cada face tem a mesma chance.
 */
export function rollDie(sides: number, random: RandomSource): number {
  const limit = Math.floor(RANGE / sides) * sides
  for (;;) {
    const x = random()
    if (x < limit) return (x % sides) + 1
  }
}

/** Uma face por dado da expressão (FR-DEC-005): 3d6 são três sorteios, nunca um número de 3 a 18. O modificador fica fora. */
export function rollDice(dice: Dice, random: RandomSource): number[] {
  return Array.from({ length: dice.count }, () => rollDie(dice.sides, random))
}
