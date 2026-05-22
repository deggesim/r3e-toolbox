import type { LeaderboardAssets, RaceRoomData } from "../types/gameData";

interface CarSlot {
  vehicleId?: number;
  vehicle?: string;
  className?: string;
}

/**
 * Custom hook to resolve car names and icons from game data and leaderboard assets.
 * Centralizes the logic used in BuildResultsDatabase and ResultsDatabaseViewer.
 */
export const useResolveCarInfo = (
  gameData: RaceRoomData | null | undefined,
  leaderboardAssets: LeaderboardAssets | null | undefined,
) => {
  const resolveCarName = (slot: CarSlot): string | undefined => {
    const vehicleId = slot.vehicleId;

    // Try to get car name from gameData first
    if (vehicleId && gameData?.cars?.[vehicleId]?.Name) {
      return gameData.cars[vehicleId].Name;
    }

    // If not found in gameData, try leaderboard assets
    if (leaderboardAssets?.cars) {
      const assetCar = leaderboardAssets.cars.find(
        (c) =>
          (vehicleId !== undefined && c.id === String(vehicleId)) ||
          (slot.vehicle !== undefined && c.name === slot.vehicle),
      );
      if (assetCar?.name) {
        return assetCar.name;
      }
    }

    // Fallback to slot.vehicle
    if (slot.vehicle) {
      return slot.vehicle;
    }

    // Last resort fallback
    return slot.className || (vehicleId ? String(vehicleId) : undefined);
  };

  const resolveCarIcon = (slot: CarSlot): string | undefined => {
    if (!leaderboardAssets?.cars || leaderboardAssets.cars.length === 0) {
      return undefined;
    }

    // Try to find asset by vehicleId and vehicle name, also fallback to resolved name
    const resolvedName = resolveCarName(slot);
    const assetCar = leaderboardAssets.cars.find(
      (car) =>
        (slot.vehicleId !== undefined && car.id === String(slot.vehicleId)) ||
        (slot.vehicle !== undefined && car.name === slot.vehicle) ||
        (resolvedName !== undefined && car.name === resolvedName),
    );

    return assetCar?.iconUrl;
  };

  return {
    resolveCarName,
    resolveCarIcon,
  };
};
