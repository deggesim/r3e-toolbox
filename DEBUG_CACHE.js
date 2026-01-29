/**
 * Debug script per verificare il localStorage dei leaderboard assets
 * Copia questo codice nella console del browser (F12) e esegui
 */

// 1. Leggi il localStorage
const stored = localStorage.getItem("r3e-toolbox-leaderboard-assets");
console.log("=== localStorage Content ===");
console.log(stored ? JSON.stringify(JSON.parse(stored), null, 2) : "❌ Nothing stored");

// 2. Leggi lo stato dello store Zustand
console.log("\n=== Zustand Store State ===");
if (typeof useLeaderboardAssetsStore === "undefined") {
  console.log("❌ Store not found in window");
} else {
  const state = useLeaderboardAssetsStore.getState();
  console.log("Assets count:", {
    cars: state.assets?.cars.length || 0,
    tracks: state.assets?.tracks.length || 0,
  });
  console.log("Full state:", state);
}

// 3. Manualmente trigger persist (forza la sincronizzazione)
console.log("\n=== Manual Persist Trigger ===");
if (typeof useLeaderboardAssetsStore !== "undefined") {
  useLeaderboardAssetsStore.persist.rehydrate();
  console.log("✓ Rehydrate triggered");
}

// 4. Leggi il localStorage di nuovo dopo rehydrate
setTimeout(() => {
  const stored2 = localStorage.getItem("r3e-toolbox-leaderboard-assets");
  console.log("\n=== After Rehydrate ===");
  console.log(
    "localStorage:",
    stored2 ? `${JSON.stringify(stored2).length} bytes` : "empty",
  );
}, 100);

// 5. Utility per pulire e testare
console.log("\n=== Utilities ===");
console.log("clearAllLeaderboardCache() - pulisce il cache");
globalThis.clearAllLeaderboardCache = () => {
  localStorage.removeItem("r3e-toolbox-leaderboard-assets");
  if (typeof useLeaderboardAssetsStore !== "undefined") {
    useLeaderboardAssetsStore.getState().clearAssets();
  }
  console.log("✓ Cache cleared");
};

console.log("showStorageSize() - mostra dimensione del cache");
globalThis.showStorageSize = () => {
  const stored = localStorage.getItem("r3e-toolbox-leaderboard-assets");
  const bytes = new Blob([stored || ""]).size;
  console.log(`Storage size: ${(bytes / 1024).toFixed(2)} KB`);
};
