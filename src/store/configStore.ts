import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config } from "../config";
import { CFG } from "../config";
import { getStorage } from "./electronStorage";

interface ConfigState {
  config: Config;
  setConfig: (partial: Partial<Config>) => void;
  resetConfig: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: { ...CFG },
      setConfig: (partial) =>
        set((state) => ({ config: { ...state.config, ...partial } })),
      resetConfig: () => set({ config: { ...CFG } }),
    }),
    {
      name: "r3e-toolbox-config",
      storage: getStorage(),
      version: 1,
    },
  ),
);
