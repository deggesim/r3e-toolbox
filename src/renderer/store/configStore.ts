import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config } from "../config";
import { CFG } from "../config";
import { getStorage } from "./electronStorage";

interface ConfigState {
  config: Config;
  setConfig: (partial: Partial<Config>) => void;
  resetConfig: () => void;
  initializeConfig: () => Promise<void>;
  isInitialized: boolean;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: { ...CFG },
      isInitialized: false,
      setConfig: (partial) =>
        set((state) => ({ config: { ...state.config, ...partial } })),
      resetConfig: () => set({ config: { ...CFG } }),
      initializeConfig: async () => {
        const storage = getStorage<ConfigState>();
        const existing = await storage.getItem("r3e-toolbox-config");
        if (!existing) {
          set({ config: { ...CFG }, isInitialized: true });
        } else {
          set({ isInitialized: true });
        }
      },
    }),
    {
      name: "r3e-toolbox-config",
      storage: getStorage<ConfigState>(),
      version: 1,
    },
  ),
);
