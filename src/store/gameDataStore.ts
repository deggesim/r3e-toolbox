import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RaceRoomData } from "../types/gameData";
import { getStorage } from "./electronStorage";

interface GameDataState {
  gameData: RaceRoomData | null;
  setGameData: (data: RaceRoomData) => void;
  clearGameData: () => void;
}

export const useGameDataStore = create<GameDataState>()(
  persist(
    (set) => ({
      gameData: null,
      setGameData: (data: RaceRoomData) => {
        set({ gameData: data });
      },
      clearGameData: () => {
        set({ gameData: null });
      },
    }),
    {
      name: "r3e-toolbox-game-data-store",
      storage: getStorage(),
    },
  ),
);
