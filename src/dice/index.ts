// ADR-009: sorteio com gerador criptográfico, sem semente, injetável nos testes.
// O sorteio de faces por rejeição entra na FEAT-009.

/** Devolve um inteiro sem sinal de 32 bits uniforme. */
export type RandomSource = () => number

export const cryptoRandomSource: RandomSource = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
