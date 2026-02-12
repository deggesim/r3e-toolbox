import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RaceRoomData } from "../types";
import { getStorage } from "./electronStorage";

interface GameDataState {
  gameData: RaceRoomData | null;
  isLoaded: boolean;
  forceOnboarding: boolean;
  setGameData: (data: RaceRoomData) => void;
  clearGameData: () => void;
  setForceOnboarding: (value: boolean) => void;
}

export const useGameDataStore = create<GameDataState>()(
  persist(
    (set) => ({
      gameData: null,
      isLoaded: false,
      forceOnboarding: false,
      setGameData: (data: RaceRoomData) => {
        set({ gameData: data, isLoaded: true });
      },
      clearGameData: () => {
        set({ gameData: null, isLoaded: false });
      },
      setForceOnboarding: (value: boolean) => {
        set({ forceOnboarding: value });
      },
    }),
    {
      name: "r3e-toolbox-game-data-store",
      storage: getStorage(),
    },
  ),
);
