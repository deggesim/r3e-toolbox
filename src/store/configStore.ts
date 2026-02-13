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
        const storage = getStorage();
        const existing = await storage.getItem("r3e-toolbox-config");
        if (!existing) {
          const initialState = { config: { ...CFG }, isInitialized: true };
          storage.setItem("r3e-toolbox-config", initialState);
          set(initialState);
        } else {
          set({ isInitialized: true });
        }
      },
    }),
    {
      name: "r3e-toolbox-config",
      storage: getStorage(),
      version: 1,
    },
  ),
);
