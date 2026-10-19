import { create } from "zustand";
import { chooseCpuCard, chooseCpuModification } from "@/engine/ai";
import { isPlayable } from "@/engine/match";
import {
  applyModification,
  awaitingPlayers,
  createMatch,
  EngineError,
  getPlayerView,
  submitSelection,
} from "@/engine/index";
import type { BoundaryChoice, MatchState } from "@/engine/types";
import { playSound, type SoundName } from "@/lib/sound";
import { CPU_DELAY_MS, useSettings } from "./settings";

export const YOU = "you";
export const CPU = "cpu";

interface MatchStore {
  state: MatchState | null;
  /** The human's picked-but-not-yet-confirmed card. */
  selectedId: string | null;
  notice: string | null;
  newMatch: () => void;
  select: (cardId: string) => void;
  confirm: () => void;
  modify: (cardId: string, boundaryChoice?: BoundaryChoice) => void;
  stop: () => void;
}

let cpuTimer: ReturnType<typeof setTimeout> | null = null;

function sfx(name: SoundName) {
  const { soundEnabled, volume } = useSettings.getState();
  if (soundEnabled) playSound(name, volume);
}

export const useMatch = create<MatchStore>()((set, get) => {
  const clearTimer = () => {
    if (cpuTimer) clearTimeout(cpuTimer);
    cpuTimer = null;
  };

  const scheduleCpu = () => {
    clearTimer();
    cpuTimer = setTimeout(() => {
      const state = get().state;
      if (!state) return;
      try {
        if (state.phase === "selecting" && awaitingPlayers(state).includes(CPU)) {
          const view = getPlayerView(state, CPU);
          const pick =
            useSettings.getState().difficulty === "easy"
              ? (() => {
                  const ok = view.hand.filter((c) => isPlayable(view.hand, c.id));
                  return ok[Math.floor(Math.random() * ok.length)]!.id;
                })()
              : chooseCpuCard(view);
          commit(submitSelection(state, CPU, pick));
        } else if (state.phase === "modifying" && state.pendingModification?.winnerId === CPU) {
          const choice = chooseCpuModification(getPlayerView(state, CPU));
          commit(applyModification(state, CPU, choice.cardId, choice.boundaryChoice));
        }
      } catch (e) {
        if (!(e instanceof EngineError)) throw e;
      }
    }, CPU_DELAY_MS[useSettings.getState().cpuSpeed]);
  };

  const commit = (next: MatchState) => {
    const prev = get().state;
    set({ state: next, selectedId: null, notice: null });

    if (next.phase === "matchOver") {
      sfx(next.winnerId === YOU ? "win" : "lose");
      return;
    }
    // A fresh reveal happened when the round step or battle number moved on.
    const revealed =
      next.battle &&
      prev?.battle &&
      (next.battle.round.reveals.length > prev.battle.round.reveals.length ||
        next.battle.number !== prev.battle.number);
    if (revealed) sfx("play");
    if (next.phase === "modifying" && prev?.phase !== "modifying") sfx("turn");

    const waitingOnCpu =
      (next.phase === "selecting" && awaitingPlayers(next).includes(CPU)) ||
      (next.phase === "modifying" && next.pendingModification?.winnerId === CPU);
    if (waitingOnCpu) scheduleCpu();
  };

  const attempt = (fn: (s: MatchState) => MatchState) => {
    const state = get().state;
    if (!state) return;
    try {
      commit(fn(state));
    } catch (e) {
      if (!(e instanceof EngineError)) throw e;
      sfx("error");
      set({ notice: e.message });
    }
  };

  return {
    state: null,
    selectedId: null,
    notice: null,
    newMatch: () => {
      clearTimer();
      const name = useSettings.getState().username || "You";
      commit(
        createMatch([
          { id: YOU, name },
          { id: CPU, name: "Computer" },
        ]),
      );
    },
    select: (cardId) => {
      const { state, selectedId } = get();
      if (!state || state.phase !== "selecting") return;
      if (!awaitingPlayers(state).includes(YOU)) return;
      set({ selectedId: selectedId === cardId ? null : cardId, notice: null });
    },
    confirm: () => {
      const { selectedId } = get();
      if (!selectedId) return;
      attempt((s) => submitSelection(s, YOU, selectedId));
    },
    modify: (cardId, boundaryChoice) =>
      attempt((s) => applyModification(s, YOU, cardId, boundaryChoice)),
    stop: () => {
      clearTimer();
      set({ state: null, selectedId: null, notice: null });
    },
  };
});
