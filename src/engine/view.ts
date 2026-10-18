import type { Card, MatchState, PlayerId, RevealStep, RoundRecord } from "./types";

export interface OpponentView {
  readonly id: PlayerId;
  readonly name: string;
  readonly cardCount: number;
}

export interface PlayerView {
  readonly viewerId: PlayerId;
  readonly phase: MatchState["phase"];
  readonly hand: readonly Card[];
  readonly players: readonly OpponentView[];
  readonly battle: {
    readonly number: number;
    readonly pool: readonly Card[];
    readonly rounds: readonly RoundRecord[];
    readonly step: number;
    readonly active: readonly PlayerId[];
    readonly awaiting: readonly PlayerId[];
    /** Who has locked in a hidden selection — never which card. */
    readonly lockedIn: readonly PlayerId[];
    readonly mySelectionId: string | null;
    readonly reveals: readonly RevealStep[];
  } | null;
  readonly pendingModification: MatchState["pendingModification"];
  readonly history: MatchState["history"];
  readonly winnerId: PlayerId | null;
}

/**
 * What one player is allowed to see. Opponents' hands and unrevealed selections are hidden,
 * so UI and computer players can be driven from this without leaking information.
 */
export function getPlayerView(state: MatchState, viewerId: PlayerId): PlayerView {
  const me = state.players.find((p) => p.id === viewerId);
  if (!me) throw new Error(`Unknown player ${viewerId}.`);
  const b = state.battle;
  return {
    viewerId,
    phase: state.phase,
    hand: me.hand,
    players: state.players.map((p) => ({ id: p.id, name: p.name, cardCount: p.hand.length })),
    battle: b && {
      number: b.number,
      pool: b.pool,
      rounds: b.rounds,
      step: b.round.step,
      active: b.round.active,
      awaiting: b.round.awaiting,
      lockedIn: Object.keys(b.round.selections),
      mySelectionId: b.round.selections[viewerId] ?? null,
      reveals: b.round.reveals,
    },
    pendingModification: state.pendingModification,
    history: state.history,
    winnerId: state.winnerId,
  };
}
