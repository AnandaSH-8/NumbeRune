import { playableCards } from "./rules";
import type { CpuAction, Difficulty, GameState, Rng } from "./types";

/** Picks the computer's next move. Pure: depends only on state, difficulty and rng. */
export function chooseCpuAction(
  state: GameState,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): CpuAction {
  const options = playableCards(state, "cpu");
  if (options.length === 0) return state.drawnCardId ? { type: "pass" } : { type: "draw" };

  if (difficulty === "easy") {
    return { type: "play", cardId: options[Math.floor(rng() * options.length)]!.id };
  }

  // Normal: keep the hand flexible — play into the rune we hold most of,
  // and shed high values first.
  const hand = state.hands.cpu;
  const score = (id: string) => {
    const card = options.find((c) => c.id === id)!;
    const sameRune = hand.filter((c) => c.rune === card.rune && c.id !== id).length;
    return sameRune * 2 + card.value / 10;
  };
  const best = [...options].sort((a, b) => score(b.id) - score(a.id))[0];
  return { type: "play", cardId: best!.id };
}
