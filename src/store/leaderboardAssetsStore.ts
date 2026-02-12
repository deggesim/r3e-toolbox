import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeaderboardAssets } from "../types";
import { getStorage } from "./electronStorage";

interface LeaderboardAssetsState {
  assets: LeaderboardAssets | null;
  isLoading: boolean;
  error: string | null;
  setAssets: (assets: LeaderboardAssets) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAssets: () => void;
}

export const useLeaderboardAssetsStore = create<LeaderboardAssetsState>()(
  persist(
    (set) => ({
      assets: null,
      isLoading: false,
      error: null,

      setAssets: (assets) =>
        set({
          assets,
          error: null,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      clearAssets: () =>
        set({
          assets: null,
          error: null,
          isLoading: false,
        }),
    }),
    {
      name: "r3e-toolbox-leaderboard-assets",
      storage: getStorage(),
      version: 1,
      partialize: (state) =>
        ({
          assets: state.assets,
        }) as LeaderboardAssetsState,
    },
  ),
);
