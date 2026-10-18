import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Difficulty = "easy" | "normal";

export type CpuSpeed = "relaxed" | "normal" | "quick";

interface SettingsState {
  username: string;
  soundEnabled: boolean;
  reducedMotion: boolean;
  difficulty: Difficulty;
  cpuSpeed: CpuSpeed;
  hydrated: boolean;
  setUsername: (name: string) => void;
  update: (patch: Partial<Omit<SettingsState, "hydrated" | "setUsername" | "update">>) => void;
}

export const CPU_DELAY_MS: Record<CpuSpeed, number> = { relaxed: 1300, normal: 850, quick: 450 };

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      username: "",
      soundEnabled: true,
      reducedMotion: false,
      difficulty: "normal",
      cpuSpeed: "normal",
      hydrated: false,
      setUsername: (name) => set({ username: name.trim().slice(0, 20) }),
      update: (patch) => set(patch),
    }),
    {
      name: "numberune-settings",
      storage: createJSONStorage(() => localStorage),
      // Rehydrated from the root component after mount to keep SSR markup stable.
      skipHydration: true,
      partialize: ({ hydrated: _h, setUsername: _s, update: _u, ...rest }) => rest,
      onRehydrateStorage: () => () => useSettings.setState({ hydrated: true }),
    },
  ),
);
