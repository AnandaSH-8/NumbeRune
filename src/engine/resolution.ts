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
 * Interpretation: an elimination "determines the winner" when it removed a card that
 * was at least as high as the winning card — i.e. without it the winner would have
 * lost or tied. Otherwise the highest-card comparison decided the battle (+1).
 * Example A (2,2,5,6,8): 8 was removed by prime 2 and is higher than 5 → −1.
 * Example D (2,3,5,7,9): nothing removed → +1.
 */
export function classifyDecisivePower(resolution: RoundResolution, config: RuleConfig): Power {
  if (!resolution.winnerId) throw new Error("Only a round with a single winner has a decisive power.");
  const decisive = resolution.eliminations.filter((e) => e.card.value >= resolution.highestValue);
  if (decisive.length === 0) return "plus";
  if (decisive.some((e) => e.by === "prime")) return "minus";
  return resolveFourEightWinPower(config);
}
