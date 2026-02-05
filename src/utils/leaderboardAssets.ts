import type { LeaderboardAsset, LeaderboardAssets } from "../types";
import { useLeaderboardAssetsStore } from "../store/leaderboardAssetsStore";

const LEADERBOARD_URL = "https://game.raceroom.com/leaderboard";

type Bucket = "cars" | "tracks";

const addOption = (
  target: Map<string, LeaderboardAsset>,
  option: HTMLOptionElement,
): void => {
  const id = option.getAttribute("value")?.trim();
  if (!id || id.toLowerCase() === "all") return;

  const name = option.textContent?.trim() || id;
  const iconUrl = option.dataset.image || undefined;

  if (!target.has(id)) {
    target.set(id, { id, name, iconUrl });
  }
};

const collectOptions = (
  doc: Document,
  selector: string,
  bucket: Bucket,
  acc: {
    cars: Map<string, LeaderboardAsset>;
    tracks: Map<string, LeaderboardAsset>;
  },
): void => {
  const container = doc.querySelector(selector);
  if (!container) return;

  const target = bucket === "cars" ? acc.cars : acc.tracks;
  container.querySelectorAll("option").forEach((opt) => {
    addOption(target, opt);
  });
};

const detectBucket = (option: HTMLOptionElement): Bucket | undefined => {
  const parentWithType = option.closest("[data-type]");
  const dataType = (parentWithType as HTMLElement)?.dataset.type || "";

  if (dataType.includes("car_class")) return "cars";
  if (dataType.includes("track")) return "tracks";
  return undefined;
};

const ensureDomParser = (): DOMParser => {
  if (typeof DOMParser === "undefined") {
    throw new TypeError("DOMParser not available in this environment");
  }
  return new DOMParser();
};

const parseHtml = (html: string): LeaderboardAssets => {
  const parser = ensureDomParser();
  const doc = parser.parseFromString(html, "text/html");

  const acc = {
    cars: new Map<string, LeaderboardAsset>(),
    tracks: new Map<string, LeaderboardAsset>(),
  };

  const targetedSelectors: Array<{ selector: string; bucket: Bucket }> = [
    { selector: '[data-type="car_class"]', bucket: "cars" },
    { selector: 'select[name="car_class"]', bucket: "cars" },
    { selector: '[data-type="track"]', bucket: "tracks" },
    { selector: '[data-type="track_layout"]', bucket: "tracks" },
    { selector: 'select[name="track"]', bucket: "tracks" },
    { selector: 'select[name="track_layout"]', bucket: "tracks" },
  ];

  targetedSelectors.forEach(({ selector, bucket }) =>
    collectOptions(doc, selector, bucket, acc),
  );

  doc.querySelectorAll("option[data-image]").forEach((opt) => {
    const bucket = detectBucket(opt as HTMLOptionElement);
    if (!bucket) return;
    const target = bucket === "cars" ? acc.cars : acc.tracks;
    addOption(target, opt as HTMLOptionElement);
  });

  const toSortedArray = (
    map: Map<string, LeaderboardAsset>,
  ): LeaderboardAsset[] =>
    Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    sourceUrl: LEADERBOARD_URL,
    fetchedAt: new Date().toISOString(),
    cars: toSortedArray(acc.cars),
    tracks: toSortedArray(acc.tracks),
  };
};

export const fetchLeaderboardAssets = async (options?: {
  htmlOverride?: string;
  signal?: AbortSignal;
}): Promise<LeaderboardAssets> => {
  const { htmlOverride, signal } = options || {};

  if (htmlOverride) {
    return parseHtml(htmlOverride);
  }

  const response = await fetch(LEADERBOARD_URL, { mode: "cors", signal });
  if (!response.ok) {
    throw new Error(
      `Download fallito dal leaderboard (HTTP ${response.status})`,
    );
  }
  const html = await response.text();
  return parseHtml(html);
};

/**
 * Fetch leaderboard assets with automatic caching via Zustand store.
 * Returns cached assets if available, otherwise fetches from the leaderboard
 * and caches the result in localStorage.
 *
 * @param options - Optional configuration
 * @param options.forceRefresh - Force refresh from leaderboard, bypassing cache
 * @param options.signal - AbortSignal for request cancellation
 * @returns Cached or freshly fetched leaderboard assets
 */
export const fetchLeaderboardAssetsWithCache = async (options?: {
  forceRefresh?: boolean;
  signal?: AbortSignal;
}): Promise<LeaderboardAssets> => {
  const { forceRefresh = false, signal } = options || {};
  const store = useLeaderboardAssetsStore.getState();

  // Return cached assets if available and not forcing refresh
  if (!forceRefresh && store.assets) {
    return store.assets;
  }

  try {
    useLeaderboardAssetsStore.getState().setLoading(true);
    const assets = await fetchLeaderboardAssets({ signal });

    // Save to store
    useLeaderboardAssetsStore.getState().setAssets(assets);

    return assets;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore sconosciuto";
    useLeaderboardAssetsStore.getState().setError(message);
    throw error;
  }
};
