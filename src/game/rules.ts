import {
  COPIES_PER_CARD,
  HAND_SIZE,
  MAX_VALUE,
  MIN_VALUE,
  RUNES,
  type Card,
  type GameState,
  type PlayerId,
  type Rng,
} from "./types";

export class RuleError extends Error {}

export function otherPlayer(id: PlayerId): PlayerId {
  return id === "player" ? "cpu" : "player";
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const rune of RUNES) {
    for (let value = MIN_VALUE; value <= MAX_VALUE; value++) {
      for (let copy = 0; copy < COPIES_PER_CARD; copy++) {
        deck.push({ id: `${rune}-${value}-${copy}`, rune, value });
      }
    }
  }
  return deck;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createGame(rng: Rng = Math.random, first: PlayerId = "player"): GameState {
  const deck = shuffle(createDeck(), rng);
  const player: Card[] = [];
  const cpu: Card[] = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    player.push(deck.pop()!);
    cpu.push(deck.pop()!);
  }
  const top = deck.pop()!;
  return {
    drawPile: deck,
    discard: [top],
    hands: { player, cpu },
    current: first,
    drawnCardId: null,
    winner: null,
    turn: 1,
    lastAction: null,
  };
}

export function topCard(state: GameState): Card {
  return state.discard[state.discard.length - 1];
}

export function canPlay(card: Card, top: Card): boolean {
  return card.rune === top.rune || card.value === top.value;
}

export function playableCards(state: GameState, id: PlayerId): Card[] {
  if (state.winner || state.current !== id) return [];
  const top = topCard(state);
  const hand = state.hands[id];
  const pool = state.drawnCardId ? hand.filter((c) => c.id === state.drawnCardId) : hand;
  return pool.filter((c) => canPlay(c, top));
}

function assertTurn(state: GameState, id: PlayerId) {
  if (state.winner) throw new RuleError("The game is over.");
  if (state.current !== id) throw new RuleError("It is not your turn.");
}

export function playCard(state: GameState, id: PlayerId, cardId: string): GameState {
  assertTurn(state, id);
  const hand = state.hands[id];
  const card = hand.find((c) => c.id === cardId);
  if (!card) throw new RuleError("That card is not in your hand.");
  if (state.drawnCardId && state.drawnCardId !== cardId) {
    throw new RuleError("After drawing you may only play the drawn card.");
  }
  if (!canPlay(card, topCard(state))) {
    throw new RuleError("Card must match the rune or number on top.");
  }
  const nextHand = hand.filter((c) => c.id !== cardId);
  const winner = nextHand.length === 0 ? id : null;
  return {
    ...state,
    discard: [...state.discard, card],
    hands: { ...state.hands, [id]: nextHand },
    current: winner ? id : otherPlayer(id),
    drawnCardId: null,
    winner,
    turn: state.turn + 1,
    lastAction: { type: "play", by: id, card },
  };
}

export function drawCard(state: GameState, id: PlayerId, rng: Rng = Math.random): GameState {
  assertTurn(state, id);
  if (state.drawnCardId) throw new RuleError("You already drew this turn.");

  let drawPile = [...state.drawPile];
  let discard = [...state.discard];
  if (drawPile.length === 0 && discard.length > 1) {
    const top = discard[discard.length - 1];
    drawPile = shuffle(discard.slice(0, -1), rng);
    discard = [top];
  }
  if (drawPile.length === 0) {
    // Nothing left to draw anywhere: the turn simply passes.
    return {
      ...state,
      current: otherPlayer(id),
      turn: state.turn + 1,
      lastAction: { type: "draw", by: id, playable: false },
    };
  }

  const card = drawPile.pop()!;
  const playable = canPlay(card, discard[discard.length - 1]);
  return {
    ...state,
    drawPile,
    discard,
    hands: { ...state.hands, [id]: [...state.hands[id], card] },
    current: playable ? id : otherPlayer(id),
    drawnCardId: playable ? card.id : null,
    turn: playable ? state.turn : state.turn + 1,
    lastAction: { type: "draw", by: id, playable },
  };
}

export function passTurn(state: GameState, id: PlayerId): GameState {
  assertTurn(state, id);
  if (!state.drawnCardId) throw new RuleError("You can only pass after drawing.");
  return {
    ...state,
    current: otherPlayer(id),
    drawnCardId: null,
    turn: state.turn + 1,
    lastAction: { type: "pass", by: id },
  };
}
