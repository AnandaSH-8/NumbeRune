/**
 * Numberune engine models (PrimeGame Rules Specification v2).
 * Pure data — no React, PixiJS or UI state.
 */

export const MIN_CARD = 1;
export const MAX_CARD = 10;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;

export type PlayerId = string;

/** One physical card. `id` is stable for the card's whole life; `value` can be modified. */
export interface Card {
  readonly id: string;
  readonly value: number;
}

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly hand: readonly Card[];
}

/** +1 (highest-card win), −1 (prime-power win), or no modification. */
export type Power = "plus" | "minus" | "none";

export type EliminationCause = "prime" | "fourEight";

export interface Contender {
  readonly playerId: PlayerId;
  readonly card: Card;
}

export interface Elimination extends Contender {
  readonly by: EliminationCause;
  /** Values of the played cards that eliminated this one (e.g. [2, 3] for a 6). */
  readonly eliminatorValues: readonly number[];
}

export interface RoundResolution {
  readonly contenders: readonly Contender[];
  readonly primePlayed: boolean;
  readonly fourEightApplied: boolean;
  readonly eliminations: readonly Elimination[];
  readonly survivors: readonly Contender[];
  readonly highestValue: number;
  /** Players holding the highest surviving value (more than one = tie). */
  readonly leaders: readonly PlayerId[];
  readonly winnerId: PlayerId | null;
}

/** Cards revealed together at one step of a round (step 0 = main play, 1+ = card-1 bonus plays). */
export interface RevealStep {
  readonly step: number;
  readonly cards: Readonly<Record<PlayerId, Card>>;
}

export interface RoundRecord {
  readonly active: readonly PlayerId[];
  readonly reveals: readonly RevealStep[];
  /** Every card each player revealed this round, in order. The last one is their battle card. */
  readonly plays: Readonly<Record<PlayerId, readonly Card[]>>;
  readonly resolution: RoundResolution;
}

export interface CurrentRound {
  readonly active: readonly PlayerId[];
  readonly step: number;
  /** Players who must secretly select a card at this step. */
  readonly awaiting: readonly PlayerId[];
  /** HIDDEN: selected card ids not yet revealed. Never expose via player views. */
  readonly selections: Readonly<Record<PlayerId, string>>;
  readonly reveals: readonly RevealStep[];
  readonly plays: Readonly<Record<PlayerId, readonly Card[]>>;
}

export interface Battle {
  readonly number: number;
  readonly participants: readonly PlayerId[];
  readonly rounds: readonly RoundRecord[];
  /** Every card played in this battle so far — the capture pool. */
  readonly pool: readonly Card[];
  readonly round: CurrentRound;
}

export type BattleEnd =
  | {
      readonly kind: "won";
      readonly winnerId: PlayerId;
      readonly power: Power;
      readonly reason: "decided" | "opponentsExhausted";
    }
  | { readonly kind: "noWinner" };

export interface Modification {
  readonly cardId: string;
  readonly from: number;
  /** null when the card was discarded at a boundary. */
  readonly to: number | null;
  readonly outcome: "changed" | "kept" | "discarded";
}

export interface BattleRecord {
  readonly number: number;
  readonly participants: readonly PlayerId[];
  readonly rounds: readonly RoundRecord[];
  readonly captured: readonly Card[];
  readonly end: BattleEnd;
  readonly modification: Modification | null;
}

export interface PendingModification {
  readonly winnerId: PlayerId;
  readonly power: "plus" | "minus";
  readonly candidateIds: readonly string[];
}

export type MatchPhase = "selecting" | "modifying" | "matchOver";

export interface MatchState {
  readonly players: readonly Player[];
  readonly phase: MatchPhase;
  readonly battle: Battle | null;
  readonly pendingModification: PendingModification | null;
  /** Battle awaiting the winner's modification choice (not yet in history). */
  readonly resolvedBattle: Omit<BattleRecord, "modification"> | null;
  readonly history: readonly BattleRecord[];
  readonly winnerId: PlayerId | null;
}

export type BoundaryChoice = "keep" | "discard";
