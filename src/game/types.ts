export const RUNES = ["sun", "moon", "leaf", "tide"] as const;
export type Rune = (typeof RUNES)[number];

export const MIN_VALUE = 1;
export const MAX_VALUE = 9;
export const COPIES_PER_CARD = 2;
export const HAND_SIZE = 7;

export type PlayerId = "player" | "cpu";
export type Difficulty = "easy" | "normal";

export interface Card {
  readonly id: string;
  readonly rune: Rune;
  readonly value: number;
}

export type LastAction =
  | { readonly type: "play"; readonly by: PlayerId; readonly card: Card }
  | { readonly type: "draw"; readonly by: PlayerId; readonly playable: boolean }
  | { readonly type: "pass"; readonly by: PlayerId };

export interface GameState {
  readonly drawPile: readonly Card[];
  readonly discard: readonly Card[];
  readonly hands: Readonly<Record<PlayerId, readonly Card[]>>;
  readonly current: PlayerId;
  /** Set when the current player drew a playable card: they may play it or pass. */
  readonly drawnCardId: string | null;
  readonly winner: PlayerId | null;
  readonly turn: number;
  readonly lastAction: LastAction | null;
}

export type CpuAction =
  | { readonly type: "play"; readonly cardId: string }
  | { readonly type: "draw" }
  | { readonly type: "pass" };

export type Rng = () => number;
