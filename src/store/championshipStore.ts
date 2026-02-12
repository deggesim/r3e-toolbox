import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChampionshipEntry } from "../types";
import { getStorage } from "./electronStorage";

interface ChampionshipState {
  championships: ChampionshipEntry[];
  addOrUpdate: (entry: ChampionshipEntry) => void;
  remove: (alias: string) => void;
  rename: (oldAlias: string, newAlias: string) => boolean;
  clear: () => void;
  setAll: (entries: ChampionshipEntry[]) => void;
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

      rename: (oldAlias, newAlias) => {
        const trimmedNewAlias = newAlias.trim();
        if (!trimmedNewAlias) {
          return false;
        }

        const state = _get();
        const existingIndex = state.championships.findIndex(
          (c) => c.alias.toLowerCase() === oldAlias.toLowerCase(),
        );

        if (existingIndex < 0) {
          return false;
        }

        // Check if new alias already exists (and it's not the same championship)
        const aliasExists = state.championships.some(
          (c, idx) =>
            idx !== existingIndex &&
            c.alias.toLowerCase() === trimmedNewAlias.toLowerCase(),
        );

        if (aliasExists) {
          return false;
        }

        set((state) => {
          const updated = [...state.championships];
          const championship = { ...updated[existingIndex] };

          // Update alias
          championship.alias = trimmedNewAlias;

          // Update fileName with the new alias (no sanitization, same as original creation)
          championship.fileName = `${trimmedNewAlias}.html`;

          updated[existingIndex] = championship;
          return { championships: updated };
        });

        return true;
      },

      clear: () => set({ championships: [] }),

      setAll: (entries) => set({ championships: entries }),
    }),
    {
      name: "r3e-toolbox-championships",
      storage: getStorage(),
    },
  ),
);
