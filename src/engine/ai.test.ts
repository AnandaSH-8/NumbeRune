import { describe, expect, it } from "vitest";
import { chooseCpuCard, chooseCpuModification } from "./ai";
import { applyModification, awaitingPlayers, createMatch, getPlayerView, submitSelection } from "./index";
import type { MatchState } from "./types";

/** Deterministic rng (mulberry32) so matches are reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays one full match where both sides are driven by the AI through their player views. */
function autoMatch(seed: number): MatchState {
  const random = rng(seed);
  let s = createMatch([{ id: "a", name: "A" }, { id: "b", name: "B" }]);
  let steps = 0;
  while (s.phase !== "matchOver") {
    if (++steps > 5000) throw new Error("Match did not terminate.");
    if (s.phase === "selecting") {
      const waiting = awaitingPlayers(s);
      // Both players may be awaited (main step or shared bonus step); pick in id order.
      const pid = [...waiting].sort()[0]!;
      const view = getPlayerView(s, pid);
      s = submitSelection(s, pid, chooseCpuCard(view, random));
    } else {
      const pending = s.pendingModification!;
      const choice = chooseCpuModification(getPlayerView(s, pending.winnerId));
      s = applyModification(s, pending.winnerId, choice.cardId, choice.boundaryChoice);
    }
  }
  return s;
}

describe("computer opponent legality", () => {
  it("plays many full matches to completion without an illegal move", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = autoMatch(seed);
      expect(s.phase).toBe("matchOver");
      const total = s.players.reduce((n, p) => n + p.hand.length, 0);
      // Cards only leave the game through boundary discards or no-winner battles.
      const discarded = s.history.reduce(
        (n, b) => n + (b.modification?.outcome === "discarded" ? 1 : 0) + (b.end.kind === "noWinner" ? b.captured.length : 0),
        0,
      );
      expect(total + discarded).toBe(20);
    }
  });

  it("only ever picks cards that are in its own hand", () => {
    const random = rng(99);
    let s = createMatch([{ id: "a", name: "A" }, { id: "b", name: "B" }]);
    for (let i = 0; i < 200 && s.phase !== "matchOver"; i++) {
      if (s.phase === "selecting") {
        const pid = awaitingPlayers(s)[0]!;
        const view = getPlayerView(s, pid);
        const pick = chooseCpuCard(view, random);
        expect(view.hand.some((c) => c.id === pick)).toBe(true);
        s = submitSelection(s, pid, pick);
      } else {
        const pending = s.pendingModification!;
        const choice = chooseCpuModification(getPlayerView(s, pending.winnerId));
        expect(pending.candidateIds).toContain(choice.cardId);
        s = applyModification(s, pending.winnerId, choice.cardId, choice.boundaryChoice);
      }
    }
  });

  it("never sees the opponent's hidden selection while choosing", () => {
    let s = createMatch([{ id: "a", name: "A" }, { id: "b", name: "B" }]);
    s = submitSelection(s, "a", "a#5"); // A locks in a 5, hidden
    const view = getPlayerView(s, "b");
    expect(view.battle?.lockedIn).toEqual(["a"]);
    expect(JSON.stringify(view)).not.toContain("a#5");
    // B still chooses normally from its own hand.
    const pick = chooseCpuCard(view, rng(7));
    expect(pick.startsWith("b#")).toBe(true);
  });

  it("handles card-1 bonus chains and ties through the same engine functions", () => {
    // Force a bonus chain: a plays 1, then must pick again.
    let s = createMatch([{ id: "a", name: "A" }, { id: "b", name: "B" }], { startingValues: { a: [1, 1, 9], b: [4, 8] } });
    const random = rng(3);
    let steps = 0;
    while (s.phase === "selecting" && s.battle && s.history.length === 0 && ++steps < 50) {
      const waiting = awaitingPlayers(s);
      if (waiting.length === 0) break;
      const pid = waiting[0]!;
      s = submitSelection(s, pid, chooseCpuCard(getPlayerView(s, pid), random));
    }
    expect(s.history.length + (s.resolvedBattle ? 1 : 0)).toBe(1);
  });
});
