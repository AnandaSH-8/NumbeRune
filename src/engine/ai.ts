import { applyPower } from "./match";
import { isPrime } from "./resolution";
import type { BoundaryChoice } from "./types";
import type { PlayerView } from "./view";

export type Rng = () => number;

/** Computer card pick. Uses only its own PlayerView, so it never sees hidden choices. */
export function chooseCpuCard(view: PlayerView, rng: Rng = Math.random): string {
  const hand = view.hand;
  if (hand.length === 0) throw new Error("CPU has no cards to play.");
  // Mix of strong plays (high cards, primes) and occasional 1s for bonus plays.
  const weight = (v: number) => (v === 1 ? 1.5 : isPrime(v) ? 2.5 : 1 + v / 5);
  const total = hand.reduce((s, c) => s + weight(c.value), 0);
  let roll = rng() * total;
  for (const c of hand) {
    roll -= weight(c.value);
    if (roll <= 0) return c.id;
  }
  return hand.at(-1)!.id;
}

/** Computer modification: improve its own captured cards as much as the power allows. */
export function chooseCpuModification(view: PlayerView): { cardId: string; boundaryChoice?: BoundaryChoice } {
  const pending = view.pendingModification;
  if (!pending) throw new Error("No modification pending.");
  const cards = view.hand.filter((c) => pending.candidateIds.includes(c.id));
  const score = (from: number, to: number) => to - from + (isPrime(to) ? 1.5 : 0) - (isPrime(from) ? 1.5 : 0);
  let best: { cardId: string; s: number; boundaryChoice?: BoundaryChoice } | null = null;
  for (const c of cards) {
    const r = applyPower(c.value, pending.power);
    const cand = r.kind === "value" ? { cardId: c.id, s: score(c.value, r.value) } : { cardId: c.id, s: 0, boundaryChoice: "keep" as const };
    if (!best || cand.s > best.s) best = cand;
  }
  return best!.boundaryChoice ? { cardId: best!.cardId, boundaryChoice: best!.boundaryChoice } : { cardId: best!.cardId };
}
