import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LeaderboardAssets } from "../types";

interface LeaderboardAssetsState {
  assets: LeaderboardAssets | null;
  isLoading: boolean;
  error: string | null;
  setAssets: (assets: LeaderboardAssets) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAssets: () => void;
  getClassIconUrl: (classId: string) => string | undefined;
  getTrackIconUrl: (trackId: string) => string | undefined;
}

export const useLeaderboardAssetsStore = create<LeaderboardAssetsState>()(
  persist(
    (set, get) => ({
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

      getClassIconUrl: (classId: string) => {
        const state = get();
        if (!state.assets) return undefined;
        const asset = state.assets.classes.find((c) => c.id === classId);
        return asset?.iconUrl;
      },

      getTrackIconUrl: (trackId: string) => {
        const state = get();
        if (!state.assets) return undefined;
        const asset = state.assets.tracks.find((t) => t.id === trackId);
        return asset?.iconUrl;
      },
    }),
    {
      name: "r3e-toolbox-leaderboard-assets",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        assets: state.assets,
      }),
    },
  ),
);

