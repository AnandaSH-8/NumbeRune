import { describe, expect, it } from "vitest";
import {
  applyModification,
  awaitingPlayers,
  classifyDecisivePower,
  createMatch,
  DEFAULT_RULES,
  EngineError,
  getPlayer,
  getPlayerView,
  resolveRound,
  submitSelection,
  UnresolvedRuleError,
  type MatchState,
  type RuleConfig,
} from "./index";

const round = (...values: number[]) =>
  resolveRound(values.map((v, i) => ({ playerId: `p${i}`, card: { id: `c${i}`, value: v } })));
const winnerValue = (r: ReturnType<typeof round>) => r.contenders.find((c) => c.playerId === r.winnerId)?.card.value;
const power = (r: ReturnType<typeof round>, config: RuleConfig = DEFAULT_RULES) => classifyDecisivePower(r, config);

describe("battle resolution — worked examples from the PDF", () => {
  it("A: 2,2,5,6,8 → 2 removes 6 and 8, 5 wins outright (no extra round for the 2s)", () => {
    const r = round(2, 2, 5, 6, 8);
    expect(r.eliminations.map((e) => e.card.value).sort()).toEqual([6, 8]);
    expect(winnerValue(r)).toBe(5);
    expect(power(r)).toBe("minus");
  });

  it("B: 6,6,8,8,4 → no prime, 4 removes both 8s, the two 6s tie", () => {
    const r = round(6, 6, 8, 8, 4);
    expect(r.fourEightApplied).toBe(true);
    expect(r.eliminations.map((e) => e.card.value)).toEqual([8, 8]);
    expect(r.winnerId).toBeNull();
    expect(r.leaders).toEqual(["p0", "p1"]);
  });

  it("C: 2,3,6,9,10 → 6, 9, 10 removed; 3 beats 2", () => {
    const r = round(2, 3, 6, 9, 10);
    expect(r.survivors.map((s) => s.card.value)).toEqual([2, 3]);
    expect(r.eliminations.find((e) => e.card.value === 6)?.eliminatorValues).toEqual([2, 3]);
    expect(winnerValue(r)).toBe(3);
    expect(power(r)).toBe("minus");
  });

  // SPEC CONFLICT: Example D says "none of these primes divides 9", but 3 divides 9 and the
  // prime table and Example C both say 3 eliminates 9. The engine follows the divisibility rule,
  // so 9 is eliminated and 7 wins. Revisit if the authors meant otherwise.
  it("D: 2,3,5,7,9 → primes never remove primes; 3 removes 9 (spec text conflicts), 7 wins", () => {
    const r = round(2, 3, 5, 7, 9);
    expect(r.eliminations.map((e) => e.card.value)).toEqual([9]);
    expect(r.survivors.map((c) => c.card.value)).toEqual([2, 3, 5, 7]);
    expect(winnerValue(r)).toBe(7);
    expect(power(r)).toBe("minus");
  });

  it("highest-card win with no eliminations  → +1", () => {
    const r = round(3, 5, 7, 1);
    expect(r.eliminations).toHaveLength(0);
    expect(winnerValue(r)).toBe(7);
    expect(power(r)).toBe("plus");
  });

  it("E: 2,3,4,6,8 → 2 removes 4, 6, 8; 3 wins", () => {
    const r = round(2, 3, 4, 6, 8);
    expect(r.eliminations.map((e) => e.card.value)).toEqual([4, 6, 8]);
    expect(winnerValue(r)).toBe(3);
    expect(power(r)).toBe("minus");
  });

  it("F: 2,2,2,2,7 → primes never remove primes, 7 wins", () => {
    const r = round(2, 2, 2, 2, 7);
    expect(r.eliminations).toHaveLength(0);
    expect(winnerValue(r)).toBe(7);
    expect(power(r)).toBe("plus");
  });

  it("prime table: 2→4,6,8,10  3→6,9  5→10  7→none", () => {
    const removed = (p: number) =>
      round(p, 1, 4, 6, 8, 9, 10).eliminations.filter((e) => e.eliminatorValues.includes(p)).map((e) => e.card.value);
    expect(removed(2)).toEqual([4, 6, 8, 10]);
    expect(removed(3)).toEqual([6, 9]);
    expect(removed(5)).toEqual([10]);
    expect(removed(7)).toEqual([]);
  });

  it("4-to-8 rule does not apply when any prime is played", () => {
    const r = round(3, 4, 8);
    expect(r.fourEightApplied).toBe(false);
    expect(winnerValue(r)).toBe(8);
  });

  it("4 removing an 8 that would not have won does not change the power", () => {
    expect(power(round(4, 8, 9))).toBe("plus");
  });
});

describe("unresolved 4-to-8 win classification", () => {
  it("is refused by default instead of guessing", () => {
    expect(() => power(round(4, 8))).toThrow(UnresolvedRuleError);
  });
  it("follows the configured decision once finalized", () => {
    expect(power(round(4, 8), { fourEightWinPower: "minus" })).toBe("minus");
    expect(power(round(4, 8), { fourEightWinPower: "plus" })).toBe("plus");
    expect(power(round(4, 8), { fourEightWinPower: "none" })).toBe("none");
  });
  it("leaves match state untouched when it fires", () => {
    const m = createMatch([{ id: "a", name: "A" }, { id: "b", name: "B" }], { startingValues: { a: [4], b: [8] } });
    const s = submitSelection(m, "a", "a#1");
    expect(() => submitSelection(s, "b", "b#1")).toThrow(UnresolvedRuleError);
    expect(awaitingPlayers(s)).toEqual(["b"]);
  });
});

// --- Match flow helpers --------------------------------------------------
const two = [{ id: "you", name: "You" }, { id: "cpu", name: "CPU" }];
const pick = (s: MatchState, pid: string, value: number) => {
  const card = getPlayer(s, pid).hand.find((c) => c.value === value);
  if (!card) throw new Error(`${pid} has no ${value}`);
  return submitSelection(s, pid, card.id);
};
const values = (s: MatchState, pid: string) => getPlayer(s, pid).hand.map((c) => c.value).sort((a, b) => a - b);

describe("match setup", () => {
  it("each player starts with individual cards 1–10", () => {
    const m = createMatch(two);
    expect(values(m, "you")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(m.players.flatMap((p) => p.hand.map((c) => c.id))).size).toBe(20);
  });
  it("supports 2 to 5 players", () => {
    const n = (k: number) => Array.from({ length: k }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    expect(() => createMatch(n(1))).toThrow(EngineError);
    expect(createMatch(n(5)).players).toHaveLength(5);
    expect(() => createMatch(n(6))).toThrow(EngineError);
  });
});

describe("hidden selections", () => {
  it("an opponent's locked-in card is not visible until everyone reveals", () => {
    let s = createMatch(two);
    s = pick(s, "cpu", 9);
    const view = getPlayerView(s, "you");
    expect(view.battle?.lockedIn).toEqual(["cpu"]);
    expect(JSON.stringify(view)).not.toContain("cpu#9");
    expect(view.players.find((p) => p.id === "cpu")).toEqual({ id: "cpu", name: "CPU", cardCount: 10 });
  });
  it("a card cannot be selected twice or out of turn", () => {
    let s = pick(createMatch(two), "you", 5);
    expect(() => pick(s, "you", 6)).toThrow(EngineError);
    s = pick(s, "cpu", 9);
    expect(() => pick(s, "nobody", 1)).toThrow();
  });
});

describe("card 1 bonus plays", () => {
  it("chains while the player keeps playing 1s; only bonus players choose at bonus steps", () => {
    let s = createMatch(two, { startingValues: { you: [1, 1, 1, 7], cpu: [6, 2] } });
    s = pick(pick(s, "you", 1), "cpu", 6);
    expect(s.battle?.round.step).toBe(1);
    expect(awaitingPlayers(s)).toEqual(["you"]);
    s = pick(s, "you", 1);
    expect(awaitingPlayers(s)).toEqual(["you"]);
    s = pick(s, "you", 7);
    // 7 vs 6: highest card → +1; winner captures all four played cards.
    expect(s.phase).toBe("modifying");
    expect(s.pendingModification?.power).toBe("plus");
    expect(s.pendingModification?.candidateIds).toHaveLength(4);
    expect(values(s, "you")).toEqual([1, 1, 1, 6, 7]);
  });

  it("several players who play 1 each get a bonus, revealed together", () => {
    let s = createMatch(two, { startingValues: { you: [1, 9], cpu: [1, 5] } });
    s = pick(pick(s, "you", 1), "cpu", 1);
    expect([...awaitingPlayers(s)].sort()).toEqual(["cpu", "you"]);
    s = pick(s, "you", 9);
    expect(getPlayerView(s, "cpu").battle?.reveals).toHaveLength(1);
    s = pick(s, "cpu", 5);
    expect(s.history.length + (s.resolvedBattle ? 1 : 0)).toBe(1);
  });

  it("a 1 with no cards left to follow is the player's battle card", () => {
    let s = createMatch(two, { startingValues: { you: [1], cpu: [6, 3] } });
    s = pick(pick(s, "you", 1), "cpu", 6);
    expect(s.pendingModification?.winnerId).toBe("cpu");
  });
});

describe("ties, capture and staying in the match", () => {
  it("only tied players continue; the eliminated player's card is still captured", () => {
    const three = [...two, { id: "x", name: "X" }];
    let s = createMatch(three, { startingValues: { you: [6, 9], cpu: [6, 5, 8], x: [4, 2] } });
    s = pick(pick(pick(s, "you", 6), "cpu", 6), "x", 4);
    expect(s.battle?.round.active).toEqual(["you", "cpu"]);
    expect(s.battle?.rounds).toHaveLength(1);
    s = pick(pick(s, "you", 9), "cpu", 5);
    expect(s.pendingModification?.winnerId).toBe("you");
    expect(s.pendingModification?.power).toBe("plus"); // decisive round won by highest card
    expect(values(s, "you")).toEqual([4, 5, 6, 6, 9]);
    // Losing does not knock x out of the match: it has a card left.
    s = applyModification(s, "you", "you#2");
    expect(s.battle?.participants).toEqual(["you", "cpu", "x"]);
  });

  it("a later round won by prime power uses −1", () => {
    let s = createMatch(two, { startingValues: { you: [6, 3], cpu: [6, 9] } });
    s = pick(pick(s, "you", 6), "cpu", 6);
    s = pick(pick(s, "you", 3), "cpu", 9);
    expect(s.pendingModification).toMatchObject({ winnerId: "you", power: "minus" });
  });
});

describe("card modification", () => {
  const winWith = (you: number[], cpu: number[]) => {
    let s = createMatch(two, { startingValues: { you, cpu } });
    return pick(pick(s, "you", you[0]!), "cpu", cpu[0]!);
  };

  it("+1 and −1 change the chosen captured card by exactly one", () => {
    let s = winWith([9, 1], [8, 1]); // 9 beats 8 → +1
    s = applyModification(s, "you", "cpu#1");
    expect(getPlayer(s, "you").hand.find((c) => c.id === "cpu#1")?.value).toBe(9);
    let t = winWith([2, 1], [8, 1]); // 2 removes 8 → −1
    t = applyModification(t, "you", "cpu#1");
    expect(getPlayer(t, "you").hand.find((c) => c.id === "cpu#1")?.value).toBe(7);
  });

  it("only the winner can modify, and only a captured card", () => {
    const s = winWith([9, 1], [8, 1]);
    expect(() => applyModification(s, "cpu", "cpu#1")).toThrow(EngineError);
    expect(() => applyModification(s, "you", "you#2")).toThrow(EngineError);
  });

  it("10 +1 needs a choice: keep as 10 or discard permanently", () => {
    const s = winWith([10, 1], [9, 1]);
    expect(() => applyModification(s, "you", "you#1")).toThrow(EngineError);
    const kept = applyModification(s, "you", "you#1", "keep");
    expect(values(kept, "you")).toEqual([1, 9, 10]);
    const gone = applyModification(s, "you", "you#1", "discard");
    expect(values(gone, "you")).toEqual([1, 9]);
    expect(gone.history[0]?.modification?.outcome).toBe("discarded");
  });

  it("1 −1 needs a choice too", () => {
    let t = createMatch(two, { startingValues: { you: [1, 2, 5], cpu: [1, 6, 5] } });
    t = pick(pick(t, "you", 1), "cpu", 1);
    t = pick(pick(t, "you", 2), "cpu", 6); // 2 removes 6 → −1
    expect(t.pendingModification?.power).toBe("minus");
    expect(() => applyModification(t, "you", "you#1")).toThrow(EngineError);
    expect(values(applyModification(t, "you", "you#1", "keep"), "you")).toEqual([1, 1, 2, 5, 6]);
  });
});

describe("match end", () => {
  it("ends when only one player has cards left", () => {
    let s = createMatch(two, { startingValues: { you: [9], cpu: [8] } });
    s = pick(pick(s, "you", 9), "cpu", 8);
    s = applyModification(s, "you", "cpu#1");
    expect(s.phase).toBe("matchOver");
    expect(s.winnerId).toBe("you");
  });

  it("continues while two or more players still have cards", () => {
    let s = createMatch(two, { startingValues: { you: [9, 3], cpu: [8, 4] } });
    s = pick(pick(s, "you", 9), "cpu", 8);
    s = applyModification(s, "you", "cpu#1");
    expect(s.phase).toBe("selecting");
    expect(s.battle?.number).toBe(2);
  });

  it("a tie where nobody has cards left ends with no battle winner", () => {
    let s = createMatch(two, { startingValues: { you: [6], cpu: [6] } });
    s = pick(pick(s, "you", 6), "cpu", 6);
    expect(s.history[0]?.end).toEqual({ kind: "noWinner" });
    expect(s.phase).toBe("matchOver");
    expect(s.winnerId).toBeNull();
  });
});
