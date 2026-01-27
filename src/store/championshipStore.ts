import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChampionshipEntry } from "../types";

interface ChampionshipState {
  championships: ChampionshipEntry[];
  addOrUpdate: (entry: ChampionshipEntry) => void;
  remove: (alias: string) => void;
  clear: () => void;
}

export const useChampionshipStore = create<ChampionshipState>()(
  persist(
    (set, _get) => ({
      championships: [],

      addOrUpdate: (entry) =>
        set((state) => {
          const existingIndex = state.championships.findIndex(
            (c) => c.alias.toLowerCase() === entry.alias.toLowerCase(),
          );

          if (existingIndex >= 0) {
            const updated = [...state.championships];
            updated[existingIndex] = entry;
            return { championships: updated };
          }

          return { championships: [...state.championships, entry] };
        }),

      remove: (alias) =>
        set((state) => ({
          championships: state.championships.filter(
            (c) => c.alias.toLowerCase() !== alias.toLowerCase(),
          ),
        })),

      clear: () => set({ championships: [] }),
    }),
    {
      name: "r3e-toolbox-championships",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
