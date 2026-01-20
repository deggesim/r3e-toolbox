import type { LeaderboardAsset, LeaderboardAssets } from "../types";

const LEADERBOARD_URL = "https://game.raceroom.com/leaderboard";

type Bucket = "classes" | "tracks";

function addOption(
  target: Map<string, LeaderboardAsset>,
  option: HTMLOptionElement,
): void {
  const id = option.getAttribute("value")?.trim();
  if (!id || id.toLowerCase() === "all") return;

  const name = option.textContent?.trim() || id;
  const iconUrl = option.getAttribute("data-image") || undefined;

  if (!target.has(id)) {
    target.set(id, { id, name, iconUrl });
  }
}

function collectOptions(
  doc: Document,
  selector: string,
  bucket: Bucket,
  acc: {
    classes: Map<string, LeaderboardAsset>;
    tracks: Map<string, LeaderboardAsset>;
  },
): void {
  const container = doc.querySelector(selector);
  if (!container) return;

  const target = bucket === "classes" ? acc.classes : acc.tracks;
  container.querySelectorAll("option").forEach((opt) => {
    addOption(target, opt);
  });
}

function detectBucket(option: HTMLOptionElement): Bucket | undefined {
  const parentWithType = option.closest("[data-type]");
  const dataType = parentWithType?.getAttribute("data-type") || "";

  if (dataType.includes("car_class")) return "classes";
  if (dataType.includes("track")) return "tracks";
  return undefined;
}

function ensureDomParser(): DOMParser {
  if (typeof DOMParser === "undefined") {
    throw new Error("DOMParser not available in this environment");
  }
  return new DOMParser();
}

function parseHtml(html: string): LeaderboardAssets {
  const parser = ensureDomParser();
  const doc = parser.parseFromString(html, "text/html");

  const acc = {
    classes: new Map<string, LeaderboardAsset>(),
    tracks: new Map<string, LeaderboardAsset>(),
  };

  const targetedSelectors: Array<{ selector: string; bucket: Bucket }> = [
    { selector: '[data-type="car_class"]', bucket: "classes" },
    { selector: 'select[name="car_class"]', bucket: "classes" },
    { selector: '[data-type="track"]', bucket: "tracks" },
    { selector: '[data-type="track_layout"]', bucket: "tracks" },
    { selector: 'select[name="track"]', bucket: "tracks" },
    { selector: 'select[name="track_layout"]', bucket: "tracks" },
  ];

  targetedSelectors.forEach(({ selector, bucket }) =>
    collectOptions(doc, selector, bucket, acc),
  );

  doc.querySelectorAll("option[data-image]").forEach((opt) => {
    const bucket = detectBucket(opt);
    if (!bucket) return;
    const target = bucket === "classes" ? acc.classes : acc.tracks;
    addOption(target, opt);
  });

  const toSortedArray = (
    map: Map<string, LeaderboardAsset>,
  ): LeaderboardAsset[] =>
    Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    sourceUrl: LEADERBOARD_URL,
    fetchedAt: new Date().toISOString(),
    classes: toSortedArray(acc.classes),
    tracks: toSortedArray(acc.tracks),
  };
}

export async function fetchLeaderboardAssets(options?: {
  htmlOverride?: string;
  signal?: AbortSignal;
}): Promise<LeaderboardAssets> {
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
}
