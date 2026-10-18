import { describe, expect, it } from "vitest";
import { chooseCpuAction } from "./ai";
import { canPlay, createDeck, createGame, drawCard, passTurn, playCard, RuleError } from "./rules";
import type { Card, GameState } from "./types";

const c = (rune: Card["rune"], value: number, id = `${rune}-${value}`): Card => ({ id, rune, value });

function state(over: Partial<GameState>): GameState {
  return {
    drawPile: [],
    discard: [c("sun", 5, "top")],
    hands: { player: [], cpu: [] },
    current: "player",
    drawnCardId: null,
    winner: null,
    turn: 1,
    lastAction: null,
    ...over,
  };
}

describe("Numberune rules", () => {
  it("deck has 4 runes x 9 values x 2 copies = 72 cards", () => {
    expect(createDeck()).toHaveLength(72);
  });

  it("deals 7 cards each and flips one to the discard", () => {
    const g = createGame(() => 0.3);
    expect(g.hands.player).toHaveLength(7);
    expect(g.hands.cpu).toHaveLength(7);
    expect(g.discard).toHaveLength(1);
    expect(g.drawPile).toHaveLength(57);
  });

  it("a card is playable when rune or number matches", () => {
    expect(canPlay(c("sun", 2), c("sun", 9))).toBe(true);
    expect(canPlay(c("moon", 9), c("sun", 9))).toBe(true);
    expect(canPlay(c("moon", 2), c("sun", 9))).toBe(false);
  });

  it("rejects a non-matching card", () => {
    const g = state({ hands: { player: [c("moon", 2)], cpu: [c("leaf", 1)] } });
    expect(() => playCard(g, "player", "moon-2")).toThrow(RuleError);
  });

  it("emptying your hand wins", () => {
    const g = state({ hands: { player: [c("sun", 2)], cpu: [c("leaf", 1)] } });
    const next = playCard(g, "player", "sun-2");
    expect(next.winner).toBe("player");
  });

  it("drawing an unplayable card ends the turn", () => {
    const g = state({ drawPile: [c("moon", 1)], hands: { player: [c("leaf", 2)], cpu: [c("leaf", 1)] } });
    const next = drawCard(g, "player");
    expect(next.current).toBe("cpu");
    expect(next.hands.player).toHaveLength(2);
  });

  it("drawing a playable card lets you play only that card, or pass", () => {
    const g = state({
      drawPile: [c("sun", 1)],
      hands: { player: [c("leaf", 5, "l5")], cpu: [c("leaf", 1)] },
    });
    const next = drawCard(g, "player");
    expect(next.current).toBe("player");
    expect(next.drawnCardId).toBe("sun-1");
    expect(() => playCard(next, "player", "l5")).toThrow(RuleError);
    expect(passTurn(next, "player").current).toBe("cpu");
  });

  it("reshuffles the discard when the draw pile is empty", () => {
    const g = state({
      discard: [c("moon", 3), c("sun", 5, "top")],
      hands: { player: [c("leaf", 2)], cpu: [c("leaf", 1)] },
    });
    const next = drawCard(g, "player");
    expect(next.discard.map((x) => x.id)).toEqual(["top"]);
    expect(next.hands.player).toHaveLength(2);
  });

  it("cpu draws when it has nothing playable", () => {
    const g = state({ current: "cpu", hands: { player: [c("leaf", 2)], cpu: [c("leaf", 1)] } });
    expect(chooseCpuAction(g, "normal")).toEqual({ type: "draw" });
  });
});
