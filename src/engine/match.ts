import { DEFAULT_RULES, type RuleConfig } from "./config";
import { classifyDecisivePower, resolveRound } from "./resolution";
import {
  MAX_CARD,
  MAX_PLAYERS,
  MIN_CARD,
  MIN_PLAYERS,
  type Battle,
  type BattleEnd,
  type BoundaryChoice,
  type Card,
  type CurrentRound,
  type MatchState,
  type Modification,
  type Player,
  type PlayerId,
  type Power,
} from "./types";

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

export interface PlayerSetup {
  readonly id: PlayerId;
  readonly name: string;
}

export interface MatchOptions {
  readonly config?: RuleConfig;
  /** Override starting values per player (testing / variants). Defaults to 1–10. */
  readonly startingValues?: Readonly<Record<PlayerId, readonly number[]>>;
}

/** Internal mutable twin of MatchState used inside a single transition on a cloned copy. */
type Mutable<T> = T extends readonly (infer U)[]
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
type Draft = Mutable<MatchState> & { config: RuleConfig };

interface StoredMatch extends MatchState {
  /** Rule configuration travels with the state so transitions stay pure. */
  readonly config: RuleConfig;
}

export function createStartingHand(
  playerId: PlayerId,
  values: readonly number[] = defaultValues(),
): Card[] {
  return values.map((value, i) => {
    assertValue(value);
    return { id: `${playerId}#${i + 1}`, value };
  });
}

function defaultValues(): number[] {
  return Array.from({ length: MAX_CARD - MIN_CARD + 1 }, (_, i) => MIN_CARD + i);
}

function assertValue(v: number) {
  if (!Number.isInteger(v) || v < MIN_CARD || v > MAX_CARD)
    throw new EngineError(`Card value ${v} is outside ${MIN_CARD}–${MAX_CARD}.`);
}

export function createMatch(setup: readonly PlayerSetup[], options: MatchOptions = {}): MatchState {
  if (setup.length < MIN_PLAYERS || setup.length > MAX_PLAYERS) {
    throw new EngineError(`A match needs ${MIN_PLAYERS}–${MAX_PLAYERS} players.`);
  }
  if (new Set(setup.map((p) => p.id)).size !== setup.length)
    throw new EngineError("Player ids must be unique.");

  const draft: Draft = {
    config: options.config ?? DEFAULT_RULES,
    players: setup.map((p) => ({
      id: p.id,
      name: p.name,
      hand: createStartingHand(p.id, options.startingValues?.[p.id]),
    })),
    phase: "selecting",
    battle: null,
    pendingModification: null,
    resolvedBattle: null,
    history: [],
    winnerId: null,
  };
  startNextBattleOrEnd(draft);
  return draft as unknown as StoredMatch;
}

function clone(state: MatchState): Draft {
  const s = state as unknown as StoredMatch;
  if (!s.config) throw new EngineError("State was not created by createMatch.");
  return structuredClone(s) as unknown as Draft;
}

function player(d: Draft, id: PlayerId) {
  const p = d.players.find((x) => x.id === id);
  if (!p) throw new EngineError(`Unknown player ${id}.`);
  return p;
}

/** A player stays in the match only with at least one non-1 card (a lone 1 cannot be played). */
function playersWithCards(d: Draft): PlayerId[] {
  return d.players.filter((p) => p.hand.some((c) => c.value !== 1)).map((p) => p.id);
}

function newRound(active: PlayerId[]): Mutable<CurrentRound> {
  return {
    active,
    step: 0,
    awaiting: [...active],
    selections: {},
    reveals: [],
    plays: Object.fromEntries(active.map((id) => [id, []])),
  };
}

function startNextBattleOrEnd(d: Draft) {
  const alive = playersWithCards(d);
  if (alive.length <= 1) {
    d.phase = "matchOver";
    d.battle = null;
    d.winnerId = alive[0] ?? null;
    return;
  }
  d.phase = "selecting";
  d.battle = {
    number: d.history.length + 1,
    participants: alive,
    rounds: [],
    pool: [],
    round: newRound(alive),
  } satisfies Mutable<Battle>;
}

/** Players who still have to secretly pick a card right now. */
export function awaitingPlayers(state: MatchState): readonly PlayerId[] {
  if (state.phase !== "selecting" || !state.battle) return [];
  const r = state.battle.round;
  return r.awaiting.filter((id) => !(id in r.selections));
}

/**
 * A player secretly selects a card for the current step. When every awaited player has
 * selected, all selections are revealed together and the round advances.
 */
export function submitSelection(state: MatchState, playerId: PlayerId, cardId: string): MatchState {
  if (state.phase !== "selecting" || !state.battle)
    throw new EngineError("No card selection is open.");
  const d = clone(state);
  const round = d.battle!.round;
  if (!round.awaiting.includes(playerId))
    throw new EngineError(`${playerId} is not playing at this step.`);
  if (playerId in round.selections) throw new EngineError(`${playerId} already selected a card.`);
  if (!player(d, playerId).hand.some((c) => c.id === cardId))
    throw new EngineError("That card is not in the player's hand.");

  round.selections[playerId] = cardId;
  if (round.awaiting.every((id) => id in round.selections)) revealStep(d);
  return d as unknown as StoredMatch;
}

function revealStep(d: Draft) {
  const battle = d.battle!;
  const round = battle.round;
  const revealed: Record<PlayerId, Card> = {};
  for (const id of round.awaiting) {
    const p = player(d, id);
    const idx = p.hand.findIndex((c) => c.id === round.selections[id]);
    const [card] = p.hand.splice(idx, 1);
    revealed[id] = card!;
    round.plays[id]!.push(card!);
    battle.pool.push(card!);
  }
  round.reveals.push({ step: round.step, cards: revealed });

  // Card 1: each revealed 1 earns one more secret play, while the player still has cards.
  const bonus = round.awaiting.filter(
    (id) => revealed[id]!.value === 1 && player(d, id).hand.length > 0,
  );
  if (bonus.length > 0) {
    round.step += 1;
    round.awaiting = bonus;
    round.selections = {};
    return;
  }
  resolveCurrentRound(d);
}

function resolveCurrentRound(d: Draft) {
  const battle = d.battle!;
  const round = battle.round;
  // Each player's battle card is the last card they revealed this round.
  const contenders = round.active.map((id) => ({ playerId: id, card: round.plays[id]!.at(-1)! }));
  const resolution = resolveRound(contenders);
  battle.rounds.push({
    active: round.active,
    reveals: round.reveals,
    plays: round.plays,
    resolution,
  } as never);

  if (resolution.winnerId) {
    // The caller's state is untouched by anything below because we work on a clone.
    const power = classifyDecisivePower(resolution, d.config);
    endBattle(d, { kind: "won", winnerId: resolution.winnerId, power, reason: "decided" });
    return;
  }

  // Tie: only tied players continue. A tied player with no cards cannot play another round.
  const next = resolveExhaustedTie(
    resolution.leaders.filter((id) => player(d, id).hand.length > 0),
  );
  if (next.kind === "continue") battle.round = newRound(next.players);
  else endBattle(d, next.end);
}

/**
 * NOT COVERED BY SPEC: a tie where some or all tied players have no cards left.
 * Current handling (documented, change here if the rules say otherwise):
 * - 2+ tied players with cards → they continue.
 * - exactly 1 → they win the battle by default, capture the pool, no card modification.
 * - 0 → nobody can win; the battle's cards leave the game.
 */
export function resolveExhaustedTie(
  tiedWithCards: PlayerId[],
): { kind: "continue"; players: PlayerId[] } | { kind: "end"; end: BattleEnd } {
  if (tiedWithCards.length >= 2) return { kind: "continue", players: tiedWithCards };
  if (tiedWithCards.length === 1) {
    return {
      kind: "end",
      end: {
        kind: "won",
        winnerId: tiedWithCards[0]!,
        power: "none",
        reason: "opponentsExhausted",
      },
    };
  }
  return { kind: "end", end: { kind: "noWinner" } };
}

function endBattle(d: Draft, end: BattleEnd) {
  const battle = d.battle!;
  const winnerId = end.kind === "won" ? end.winnerId : null;
  // Card 1 rule: a played 1 is never captured. Non-winners get their 1 back;
  // the winner's played 1 is permanently removed from the match.
  const ones = new Set<string>();
  for (const r of battle.rounds) {
    for (const [pid, cards] of Object.entries(r.plays)) {
      for (const c of cards) {
        if (c.value !== 1) continue;
        ones.add(c.id);
        if (pid !== winnerId) player(d, pid).hand.push(c);
      }
    }
  }
  const captured = battle.pool.filter((c) => !ones.has(c.id));
  const record = {
    number: battle.number,
    participants: battle.participants,
    rounds: battle.rounds,
    captured,
    end,
  };

  if (end.kind === "won") player(d, end.winnerId).hand.push(...captured);

  if (end.kind === "won" && end.power !== "none" && captured.length > 0) {
    d.phase = "modifying";
    d.battle = null;
    d.resolvedBattle = record as never;
    d.pendingModification = {
      winnerId: end.winnerId,
      power: end.power,
      candidateIds: captured.map((c) => c.id),
    };
    return;
  }
  d.history.push({ ...record, modification: null } as never);
  d.battle = null;
  startNextBattleOrEnd(d);
}

/** Result of applying a power to a value: a new value, or a boundary that needs a keep/discard choice. */
export function applyPower(
  value: number,
  power: Exclude<Power, "none">,
): { kind: "value"; value: number } | { kind: "boundary" } {
  const next = value + (power === "plus" ? 1 : -1);
  return next < MIN_CARD || next > MAX_CARD ? { kind: "boundary" } : { kind: "value", value: next };
}

/**
 * The battle winner modifies one captured card. At a boundary (1 −1 or 10 +1)
 * they must choose to keep it unchanged or discard it permanently.
 */
export function applyModification(
  state: MatchState,
  playerId: PlayerId,
  cardId: string,
  boundaryChoice?: BoundaryChoice,
): MatchState {
  const pending = state.pendingModification;
  if (state.phase !== "modifying" || !pending)
    throw new EngineError("No card modification is pending.");
  if (pending.winnerId !== playerId)
    throw new EngineError("Only the battle winner can modify a card.");
  if (!pending.candidateIds.includes(cardId))
    throw new EngineError("Choose one of the cards captured in this battle.");

  const d = clone(state);
  const hand = player(d, playerId).hand;
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new EngineError("Captured card is missing from the winner's hand.");
  const card = hand[idx]!;
  const result = applyPower(card.value, pending.power);

  let modification: Modification;
  if (result.kind === "value") {
    hand[idx] = { ...card, value: result.value };
    modification = { cardId, from: card.value, to: result.value, outcome: "changed" };
  } else {
    if (!boundaryChoice)
      throw new EngineError("This card is at its limit: choose to keep or discard it.");
    if (boundaryChoice === "discard") hand.splice(idx, 1);
    modification = {
      cardId,
      from: card.value,
      to: boundaryChoice === "keep" ? card.value : null,
      outcome: boundaryChoice === "keep" ? "kept" : "discarded",
    };
  }

  d.history.push({ ...d.resolvedBattle!, modification } as never);
  d.resolvedBattle = null;
  d.pendingModification = null;
  startNextBattleOrEnd(d);
  return d as unknown as StoredMatch;
}

export function isMatchOver(state: MatchState): boolean {
  return state.phase === "matchOver";
}

export function getPlayer(state: MatchState, id: PlayerId): Player {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new EngineError(`Unknown player ${id}.`);
  return p;
}
