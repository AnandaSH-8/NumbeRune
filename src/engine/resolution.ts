import { resolveFourEightWinPower, type RuleConfig } from "./config";
import type { Contender, Elimination, Power, RoundResolution } from "./types";

export const PRIME_VALUES = [2, 3, 5, 7] as const;

export function isPrime(value: number): boolean {
  return (PRIME_VALUES as readonly number[]).includes(value);
}

/**
 * Resolves one round: prime power → special 4-to-8 rule (only with no prime) → highest surviving card.
 * Deterministic and order-independent (except for the order of the returned arrays).
 */
export function resolveRound(contenders: readonly Contender[]): RoundResolution {
  if (contenders.length === 0) throw new Error("A round needs at least one contender.");

  const playedPrimes = [...new Set(contenders.map((c) => c.card.value).filter(isPrime))].sort((a, b) => a - b);
  const primePlayed = playedPrimes.length > 0;
  const eliminations: Elimination[] = [];

  if (primePlayed) {
    // Step 1 — prime power: eliminate non-prime cards divisible by any played prime.
    for (const c of contenders) {
      if (isPrime(c.card.value)) continue;
      const by = playedPrimes.filter((p) => c.card.value % p === 0);
      if (by.length) eliminations.push({ ...c, by: "prime", eliminatorValues: by });
    }
  } else if (contenders.some((c) => c.card.value === 4)) {
    // Step 2 — special rule: only when no prime is played, a 4 eliminates 8s.
    for (const c of contenders) {
      if (c.card.value === 8) eliminations.push({ ...c, by: "fourEight", eliminatorValues: [4] });
    }
  }

  const eliminatedIds = new Set(eliminations.map((e) => e.card.id));
  const survivors = contenders.filter((c) => !eliminatedIds.has(c.card.id));
  // Step 3 — highest surviving card.
  const highestValue = Math.max(...survivors.map((c) => c.card.value));
  const leaders = survivors.filter((c) => c.card.value === highestValue).map((c) => c.playerId);

  return {
    contenders,
    primePlayed,
    fourEightApplied: !primePlayed && eliminations.length > 0,
    eliminations,
    survivors,
    highestValue,
    leaders,
    // Step 4 — a tie means no winner this round.
    winnerId: leaders.length === 1 ? leaders[0]! : null,
  };
}

/**
 * Which power applies to the decisive round.
 *
 * Resolution order is: prime power first, then the 4-to-8 rule, then highest card.
 * The power is −1 only when the prime step leaves a single surviving card and that
 * card is a prime (e.g. 2 4 6 8 10 → 2 alone → −1; 3 6 6 9 9 → 3 alone → −1).
 * If several different values survive, the highest surviving card wins and the
 * result is +1 — so Examples A, C, D, E and F are all +1. (Example D: the PDF text
 * says "none of these primes divides 9", but 3 divides 9 and the prime table and
 * Example C both say 3 eliminates 9; we follow the divisibility rule, so 9 is
 * eliminated and 7 wins by highest surviving card → +1.)
 * When the 4-to-8 rule alone decides the win (it removed a card that would
 * otherwise have won or tied), the configured fourEightWinPower applies.
 */
export function classifyDecisivePower(resolution: RoundResolution, config: RuleConfig): Power {
  if (!resolution.winnerId) throw new Error("Only a round with a single winner has a decisive power.");
  if (resolution.fourEightApplied) {
    const decidedByFourEight = resolution.eliminations.some((e) => e.card.value >= resolution.highestValue);
    if (decidedByFourEight) return resolveFourEightWinPower(config);
  }
  const winner = resolution.survivors.find((c) => c.playerId === resolution.winnerId);
  if (winner && isPrime(winner.card.value) && resolution.survivors.length === 1) return "minus";
  return "plus";
}
