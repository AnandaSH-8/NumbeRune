import { create } from "zustand";
import { chooseCpuAction } from "@/game/ai";
import { createGame, drawCard, passTurn, playCard, RuleError } from "@/game/rules";
import type { GameState, PlayerId } from "@/game/types";
import { playSound, type SoundName } from "@/lib/sound";
import { CPU_DELAY_MS, useSettings } from "./settings";

interface GameStore {
  game: GameState | null;
  notice: string | null;
  score: Record<PlayerId, number>;
  newGame: () => void;
  play: (cardId: string) => void;
  draw: () => void;
  pass: () => void;
  stop: () => void;
}

let cpuTimer: ReturnType<typeof setTimeout> | null = null;

function sfx(name: SoundName) {
  if (useSettings.getState().soundEnabled) playSound(name);
}

export const useGame = create<GameStore>()((set, get) => {
  const clearTimer = () => {
    if (cpuTimer) clearTimeout(cpuTimer);
    cpuTimer = null;
  };

  const commit = (next: GameState) => {
    const prev = get().game;
    set({ game: next, notice: null });
    const last = next.lastAction;
    if (last?.type === "play") sfx("play");
    if (last?.type === "draw") sfx("draw");
    if (next.winner) {
      sfx(next.winner === "player" ? "win" : "lose");
      set((s) => ({ score: { ...s.score, [next.winner!]: s.score[next.winner!] + 1 } }));
      return;
    }
    if (next.current === "cpu") scheduleCpu();
    else if (prev?.current === "cpu") sfx("turn");
  };

  const scheduleCpu = () => {
    clearTimer();
    cpuTimer = setTimeout(() => {
      const game = get().game;
      if (!game || game.winner || game.current !== "cpu") return;
      const { difficulty } = useSettings.getState();
      const action = chooseCpuAction(game, difficulty);
      const next =
        action.type === "play"
          ? playCard(game, "cpu", action.cardId)
          : action.type === "draw"
            ? drawCard(game, "cpu")
            : passTurn(game, "cpu");
      commit(next);
    }, CPU_DELAY_MS[useSettings.getState().cpuSpeed]);
  };

  const attempt = (fn: (g: GameState) => GameState) => {
    const game = get().game;
    if (!game) return;
    try {
      commit(fn(game));
    } catch (e) {
      if (!(e instanceof RuleError)) throw e;
      sfx("error");
      set({ notice: e.message });
    }
  };

  return {
    game: null,
    notice: null,
    score: { player: 0, cpu: 0 },
    newGame: () => {
      clearTimer();
      const prev = get().game;
      // Alternate who starts between games.
      const first: PlayerId = prev && prev.winner === "player" ? "cpu" : "player";
      commit(createGame(Math.random, first));
    },
    play: (cardId) => attempt((g) => playCard(g, "player", cardId)),
    draw: () => attempt((g) => drawCard(g, "player")),
    pass: () => attempt((g) => passTurn(g, "player")),
    stop: () => {
      clearTimer();
      set({ game: null, notice: null });
    },
  };
});
