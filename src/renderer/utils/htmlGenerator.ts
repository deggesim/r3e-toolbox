/**
 * HTML generator for championship standings export.
 *
 * Based on concepts from r3e-open-championship by pixeljetstream:
 * https://github.com/pixeljetstream/r3e-open-championship
 */

import type { RaceRoomData } from "../types/gameData";
import type {
  ChampionshipEntry,
  ParsedRace,
  RaceSlot,
} from "../types/raceResults";
import { DEFAULT_POINTS_SYSTEM } from "../types/raceResults";
import {
  buildDriverStandings,
  buildTeamStandings,
  buildVehicleStandings,
} from "./standingsCalculator";
import { getSortedRaceSlots } from "./humanPlayerUtils";

interface BestTime {
  driver: string;
  vehicle: string;
  vehicleId?: number;
  isHuman: boolean;
  time: string;
  timeMs: number;
}

const parseTime = (timeStr: string | undefined): number => {
  if (!timeStr) return Infinity;
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return m * 60 + s;
  }
  return Infinity;
};

const formatTimeDiff = (baseMs: number, currentMs: number): string => {
  const diff = currentMs - baseMs;
  if (diff === 0) return "";
  const sign = diff > 0 ? "+ " : "- ";
  const absDiff = Math.abs(diff) / 1000;
  return `${sign}${absDiff.toFixed(3)}`;
};


const calculateGapFromWinner = (winner: RaceSlot, driver: RaceSlot): string => {
  if (!winner?.totalTime || !driver?.totalTime) return "-";

  const winnerLaps = winner.totalLaps ?? 0;
  const driverLaps = driver.totalLaps ?? 0;
  const lapDiff = winnerLaps - driverLaps;

  const winnerTime = parseTime(winner.totalTime);
  const driverTime = parseTime(driver.totalTime);
  const timeDiff = driverTime - winnerTime;

  if (lapDiff > 0) {
    // Driver is lapped: show only lap count, no time gap
    return `+${lapDiff} lap${lapDiff > 1 ? "s" : ""}`;
  } else {
    // Same laps, show time difference
    const sign = timeDiff >= 0 ? "+" : "-";
    return `${sign}${Math.abs(timeDiff).toFixed(3)}`;
  }
};

const getBestLapTimes = (
  races: ParsedRace[],
  topN: number = 20,
): BestTime[][] => {
  return races.map((race) => {
    const times: BestTime[] = race.slots
      .filter((s) => s.bestLap)
      .map((s) => ({
        driver: s.driver,
        vehicle: s.vehicle,
        vehicleId: s.vehicleId,
        isHuman: !!(typeof s.userId === "number" && s.userId > 0),
        time: s.bestLap!,
        timeMs: parseTime(s.bestLap) * 1000,
      }))
      .sort((a, b) => a.timeMs - b.timeMs);

    return times.slice(0, topN);
  });
};

const getBestQualifyingTimes = (
  races: ParsedRace[],
  topN: number = 20,
): BestTime[][] => {
  return races.map((race) => {
    const times: BestTime[] = race.slots
      .filter((s) => s.qualTime)
      .map((s) => ({
        driver: s.driver,
        vehicle: s.vehicle,
        vehicleId: s.vehicleId,
        isHuman: !!(typeof s.userId === "number" && s.userId > 0),
        time: s.qualTime!,
        timeMs: parseTime(s.qualTime) * 1000,
      }))
      .sort((a, b) => a.timeMs - b.timeMs);

    return times.slice(0, topN);
  });
};

export const generateStandingsHTML = (
  races: ParsedRace[],
  championshipName: string,
  leaderboardAssets?: {
    cars: Record<string, string>;
    tracks: Record<string, string>;
    carNames?: Record<string, string>;
  },
  gameData?: RaceRoomData | null,
  assetMap?: Map<string, string>,
  pointsSystem: number[] = DEFAULT_POINTS_SYSTEM.default,
): string => {
  // Helper function to get embedded URL or fallback to original
  const getEmbeddedUrl = (url: string): string => {
    return assetMap?.get(url) || url;
  };
  const getVehicleName = (vehicleId?: number, vehicleName?: string): string => {
    const vehicleIdStr =
      vehicleId !== undefined ? String(vehicleId) : undefined;
    if (vehicleName && vehicleName !== vehicleIdStr) return vehicleName;

    // Try to get name from leaderboard assets first
    if (vehicleIdStr && leaderboardAssets?.carNames?.[vehicleIdStr]) {
      return leaderboardAssets.carNames[vehicleIdStr];
    }

    // Fallback to gameData
    if (!vehicleIdStr || !gameData?.cars)
      return vehicleName || vehicleIdStr || "";
    const car = gameData.cars[vehicleIdStr];
    return car?.Name || vehicleName || vehicleIdStr;
  };

  const driverStandings = buildDriverStandings(races, pointsSystem);
  const teamStandings = buildTeamStandings(races, pointsSystem);
  const vehicleStandings = buildVehicleStandings(races, pointsSystem);
  const bestLapTimes = getBestLapTimes(races);
  const bestQualTimes = getBestQualifyingTimes(races);

  const maxLapRows = bestLapTimes.length
    ? Math.max(...bestLapTimes.map((times) => times.length))
    : 0;
  const maxQualRows = bestQualTimes.length
    ? Math.max(...bestQualTimes.map((times) => times.length))
    : 0;
  const maxRaceRows = races.length
    ? Math.max(...races.map((race) => race.slots.length))
    : 0;

  const stylesheet = `:root {
  --bg-dark: #1a1a1a;
  --bg-card: #242424;
  --bg-header: #34495e;
  --bg-caption: #2c3e50;
  --border-color: #3a3a3a;
  --text-light: #e0e0e0;
  --text-muted: #95a5a6;
  --card-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  --border-radius: 8px;
}

body {
  margin: 0;
  padding: 0;
  background: var(--bg-dark);
}

.page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

.results-detail-page {
  font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-dark);
  color: var(--text-light);
  min-height: 100vh;
}

/* Headers and wrappers - shared card styling */
.results-header,
.results-table-wrapper {
  background: var(--bg-card);
  border-radius: var(--border-radius);
  box-shadow: var(--card-shadow);
}

.results-header {
  padding: 20px;
  margin-bottom: 30px;
}

.results-table-wrapper {
  overflow: hidden;
  margin-bottom: 30px;
}

.results-title {
  color: #ffffff;
  font-size: 2rem;
  margin-bottom: 10px;
  font-weight: 700;
}

.results-subtitle {
  color: #999;
  font-size: 0.9rem;
  margin-bottom: 0;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-card);
  margin: 0;
}

.results-table caption {
  font-size: 1.3em;
  font-weight: bold;
  padding: 15px;
  background: var(--bg-caption);
  color: white;
  text-align: left;
  caption-side: top;
}

.results-table thead {
  background-color: var(--bg-header);
  color: white;
}

/* Table cells - shared border and padding */
.results-table th,
.results-table td {
  border: 1px solid var(--border-color);
  padding: 10px 8px;
  text-align: center;
}

.results-table th {
  font-weight: 600;
  color: #fff;
  padding: 12px 8px;
}

.results-table td {
  color: var(--text-light);
}

.results-table tbody tr:hover {
  background-color: #2a2a2a;
}

.results-table tbody tr:nth-child(even) {
  background-color: #1f1f1f;
}

.results-table .points-cell {
  font-weight: bold;
  font-size: 1.1em;
}

.results-table .pos1 {
  background-color: #ffd700 !important;
  color: #000 !important;
}

.results-table .pos2 {
  background-color: #c0c0c0 !important;
  color: #000 !important;
}

.results-table .pos3 {
  background-color: #cd7f32 !important;
  color: #000 !important;
}

/* Podium cells for human drivers: keep podium text color (not ochre) */
.results-table tbody tr.human-driver td.pos1,
.results-table tbody tr.human-driver td.pos2,
.results-table tbody tr.human-driver td.pos3 {
  color: #000 !important;
}

.track-time {
  font-size: 0.8em;
  color: var(--text-muted);
  display: block;
}

/* Left-aligned cells */
.driver-name-cell {
  text-align: left !important;
  font-weight: 600;
}

.vehicle-icon {
  height: auto;
  vertical-align: middle;
  margin-right: 6px;
}

/* Human driver styling - colored text instead of badge */
.results-table tbody tr.human-driver {
  color: #c99700 !important;
}

.results-table tbody tr.human-driver td {
  color: #c99700 !important;
}

.time-entry.human-driver,
.race-result-entry.human-driver {
  color: #c99700;
}

.time-entry.human-driver .time-driver,
.race-result-entry.human-driver .result-driver {
  color: #c99700;
}

.human-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #c99700;
  color: white;
  font-size: 0.75em;
  font-weight: 700;
  text-transform: uppercase;
}

/* Display blocks with font styling */
.time-diff,
.race-position-value,
.race-points-value {
  display: block;
}

.time-diff {
  color: #e74c3c;
  font-size: 0.85em;
}

.race-position-value {
  font-weight: bold;
}

.race-points-value {
  font-size: 0.8em;
  opacity: 0.7;
}

.back-button {
  margin-bottom: 20px;
}

/* Shared container and layout styles */
.race-header {
  font-size: 0.85em;
  min-width: 150px;
}

/* Cell styling - shared for time and race result cells */
.time-cell,
.race-result-cell {
  padding: 8px 4px !important;
  text-align: center;
}

/* Entry container - shared for time and race result entries */
.time-entry,
.race-result-entry {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

/* Driver name styling - shared for time and result drivers */
.time-driver,
.result-driver {
  font-weight: 600;
  color: #fff;
}

/* Info sections - shared for time info and result vehicle */
.time-info,
.result-vehicle {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--text-muted);
}

.result-time {
  margin-top: 2px;
}

.result-position {
  font-weight: 700;
  font-size: 0.95em;
  color: #fff;
}
`;

  const driverTable = `
  <div class="results-table-wrapper">
    <table class="results-table">
      <caption>Driver Standings</caption>
      <thead>
        <tr>
          <th rowspan="2">Pos</th>
          <th rowspan="2">Driver</th>
          <th rowspan="2">Vehicle</th>
          <th rowspan="2">Team</th>
          <th rowspan="2">Points</th>
          ${races
            .map((race) => {
              const trackImg = leaderboardAssets?.tracks[race.trackname] || "";
              const embeddedImg = getEmbeddedUrl(trackImg);
              const imgHtml = embeddedImg
                ? `<img src="${embeddedImg}" alt="${race.trackname}" />`
                : "";
              const timeHtml = race.timestring
                ? `<span class="track-time">${race.timestring}</span>`
                : "";
              return `<th colspan="2" class="track-header">${imgHtml}<div>${race.trackname}</div>${timeHtml}</th>`;
            })
            .join("")}
        </tr>
        <tr>
          ${races.map(() => "<th>Pts</th><th>Pos</th>").join("")}
        </tr>
      </thead>
      <tbody>
        ${driverStandings
          .map((standing) => {
            const vehicleIcon =
              standing.vehicleId && leaderboardAssets?.cars[standing.vehicleId]
                ? leaderboardAssets.cars[standing.vehicleId]
                : "";
            const displayVehicleName = getVehicleName(
              standing.vehicleId,
              standing.vehicle,
            );
            const positionCells = standing.racePoints
              .map((pts, raceIdx) => {
                const result = standing.raceResults[raceIdx];
                let posClass = "";
                if (result === 1) posClass = "pos1";
                else if (result === 2) posClass = "pos2";
                else if (result === 3) posClass = "pos3";

                return `<td class="points-cell">${pts ?? "-"}</td><td class="${posClass}">${result ?? "-"}</td>`;
              })
              .join("");

            return `<tr class="${standing.isHuman ? "human-driver" : ""}">
              <td>${standing.position}</td>
              <td class="driver-name-cell">${standing.driver}</td>
              <td>${vehicleIcon ? `<img src="${getEmbeddedUrl(vehicleIcon)}" class="vehicle-icon" alt="${displayVehicleName}" />` : ""}${displayVehicleName}</td>
              <td>${standing.team}</td>
              <td class="points-cell">${standing.points}</td>
              ${positionCells}
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>`;

  const teamTable = `
  <div class="results-table-wrapper">
    <table class="results-table">
      <caption>Team Standings</caption>
      <thead>
        <tr>
          <th rowspan="2">Pos</th>
          <th rowspan="2">Team</th>
          <th rowspan="2">Entries</th>
          <th rowspan="2">Points</th>
          ${races
            .map((race) => {
              const timeSpan = race.timestring
                ? `<span class="track-time">${race.timestring}</span>`
                : "";
              return `<th>${race.trackname}${timeSpan}</th>`;
            })
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${teamStandings
          .map(
            (standing) => `<tr>
              <td>${standing.position}</td>
              <td>${standing.team}</td>
              <td>${standing.entries}</td>
              <td class="points-cell">${standing.points}</td>
              ${standing.racePoints
                .map((pts) => `<td class="points-cell">${pts ?? "-"}</td>`)
                .join("")}
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>`;

  const vehicleTable = `
  <div class="results-table-wrapper">
    <table class="results-table">
      <caption>Vehicle Standings</caption>
      <thead>
        <tr>
          <th rowspan="2">Pos</th>
          <th rowspan="2">Vehicle</th>
          <th rowspan="2">Entries</th>
          <th rowspan="2">Points</th>
          ${races
            .map((race) => {
              const timeSpan = race.timestring
                ? `<span class="track-time">${race.timestring}</span>`
                : "";
              return `<th>${race.trackname}${timeSpan}</th>`;
            })
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${vehicleStandings
          .map((standing) => {
            const vehicleIcon =
              standing.vehicleId &&
              leaderboardAssets?.cars[String(standing.vehicleId)]
                ? leaderboardAssets.cars[String(standing.vehicleId)]
                : "";
            const displayVehicleName = getVehicleName(
              standing.vehicleId,
              standing.vehicle,
            );

            return `<tr>
              <td>${standing.position}</td>
              <td>${vehicleIcon ? `<img src="${getEmbeddedUrl(vehicleIcon)}" class="vehicle-icon" alt="${displayVehicleName}" />` : ""}${displayVehicleName}</td>
              <td>${standing.entries}</td>
              <td class="points-cell">${standing.points}</td>
              ${standing.racePoints
                .map((pts) => `<td class="points-cell">${pts ?? "-"}</td>`)
                .join("")}
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>`;

  const bestLapTable = maxLapRows
    ? `
    <div class="results-table-wrapper">
      <table class="results-table">
        <caption>Best Race Lap Times</caption>
        <thead>
          <tr>
            <th>Pos</th>
            ${races
              .map((race) => `<th class="race-header">${race.trackname}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: maxLapRows })
            .map((_, posIdx) => {
              const cells = bestLapTimes
                .map((raceTimes) => {
                  const time = raceTimes[posIdx];
                  if (!time) return `<td>-</td>`;

                  const diff =
                    posIdx > 0
                      ? formatTimeDiff(raceTimes[0].timeMs, time.timeMs)
                      : "";
                  const vehicleIcon =
                    time.vehicleId &&
                    leaderboardAssets?.cars[String(time.vehicleId)]
                      ? leaderboardAssets.cars[String(time.vehicleId)]
                      : "";
                  const displayVehicleName = getVehicleName(
                    time.vehicleId,
                    time.vehicle,
                  );

                  return `<td class="time-cell">
                    <div class="time-entry${time.isHuman ? " human-driver" : ""}">
                      <div class="time-driver">${time.driver}</div>
                      <div class="time-info">
                        ${vehicleIcon ? `<img src="${getEmbeddedUrl(vehicleIcon)}" class="vehicle-icon" alt="${displayVehicleName}" />` : ""}
                        <span class="time-value">${time.time}</span>
                        ${diff ? `<span class="time-diff">${diff}</span>` : ""}
                      </div>
                    </div>
                  </td>`;
                })
                .join("");

              return `<tr>
                <td>${posIdx + 1}</td>
                ${cells}
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`
    : "";

  const bestQualTable = maxQualRows
    ? `
    <div class="results-table-wrapper">
      <table class="results-table">
        <caption>Best Qualification Times</caption>
        <thead>
          <tr>
            <th>Pos</th>
            ${races
              .map((race) => `<th class="race-header">${race.trackname}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: maxQualRows })
            .map((_, posIdx) => {
              const cells = bestQualTimes
                .map((raceTimes) => {
                  const time = raceTimes[posIdx];
                  if (!time) return `<td>-</td>`;

                  const diff =
                    posIdx > 0
                      ? formatTimeDiff(raceTimes[0].timeMs, time.timeMs)
                      : "";
                  const vehicleIcon =
                    time.vehicleId &&
                    leaderboardAssets?.cars[String(time.vehicleId)]
                      ? leaderboardAssets.cars[String(time.vehicleId)]
                      : "";
                  const displayVehicleName = getVehicleName(
                    time.vehicleId,
                    time.vehicle,
                  );

                  return `<td class="time-cell">
                    <div class="time-entry${time.isHuman ? " human-driver" : ""}">
                      <div class="time-driver">${time.driver}</div>
                      <div class="time-info">
                        ${vehicleIcon ? `<img src="${getEmbeddedUrl(vehicleIcon)}" class="vehicle-icon" alt="${displayVehicleName}" />` : ""}
                        <span class="time-value">${time.time}</span>
                        ${diff ? `<span class="time-diff">${diff}</span>` : ""}
                      </div>
                    </div>
                  </td>`;
                })
                .join("");

              return `<tr>
                <td>${posIdx + 1}</td>
                ${cells}
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`
    : "";

  // Pre-sort race slots once per race for the results table (penalty-aware).
  const sortedRaceSlots = races.map((race) => getSortedRaceSlots(race.slots));

  const raceResultsTable = maxRaceRows
    ? `
    <div class="results-table-wrapper">
      <table class="results-table">
        <caption>Race Results</caption>
        <thead>
          <tr>
            <th>Pos</th>
            ${races
              .map((race) => `<th class="race-header">${race.trackname}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: maxRaceRows })
            .map((_, posIdx) => {
              const cells = races
                .map((_race, raceIdx) => {
                  const sortedSlots = sortedRaceSlots[raceIdx];

                  const slot = sortedSlots[posIdx];
                  if (!slot?.totalTime) {
                    return `<td>-</td>`;
                  }

                  const winner = sortedSlots[0];
                  const formattedTime =
                    posIdx === 0
                      ? slot.totalTime
                      : calculateGapFromWinner(winner, slot);

                  const vehicleIcon =
                    slot.vehicleId &&
                    leaderboardAssets?.cars[String(slot.vehicleId)]
                      ? leaderboardAssets.cars[String(slot.vehicleId)]
                      : "";
                  const displayVehicleName = getVehicleName(
                    slot.vehicleId,
                    slot.vehicle,
                  );
                  const isHuman =
                    typeof slot.userId === "number" && slot.userId > 0;

                  return `<td class="race-result-cell">
                    <div class="race-result-entry${isHuman ? " human-driver" : ""}">
                      <div class="result-driver">${slot.driver}</div>
                      <div class="result-vehicle">${vehicleIcon ? `<img src="${getEmbeddedUrl(vehicleIcon)}" class="vehicle-icon" alt="${displayVehicleName}" />` : ""}<span>${displayVehicleName}</span></div>
                      <div class="result-time">${formattedTime}</div>
                    </div>
                  </td>`;
                })
                .join("");

              return `<tr>
                <td>${posIdx + 1}</td>
                ${cells}
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>${stylesheet}</style>
</head>
<body class="results-detail-page">
  <div class="page-container">
    <div class="results-header">
      <h1 class="results-title">${championshipName}</h1>
      <p class="results-subtitle">Championship Standings</p>
      <p class="results-subtitle">Generated from R3E Toolbox</p>
    </div>
    ${driverTable}
    ${teamStandings.length > 1 ? teamTable : ""}
    ${vehicleTable}
    ${bestLapTable}
    ${bestQualTable}
    ${raceResultsTable}
  </div>
</body>
</html>`;
};

export const generateChampionshipIndexHTML = (
  championships: ChampionshipEntry[],
  assetMap?: Map<string, string>,
): string => {
  // Helper function to get embedded URL or fallback to original
  const getEmbeddedUrl = (url: string): string => {
    return assetMap?.get(url) || url;
  };
  const sorted = [...championships].sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt),
  );

  const rows = sorted
    .map((c, idx) => {
      const date = new Date(c.generatedAt);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      const rowClass = idx % 2 === 0 ? "even" : "odd";

      const carIconHtml = c.carIcon
        ? `<img src="${getEmbeddedUrl(c.carIcon)}" alt="${c.carName || "Car icon"}" />`
        : "";
      const carCell = c.carName
        ? `<div class="car-cell">
            ${carIconHtml}
            <span>${c.carName}</span>
          </div>`
        : "-";

      return `<tr class="${rowClass}">
  <td class="alias"><a href="./${encodeURIComponent(
    c.fileName,
  )}" target="_blank" rel="noopener noreferrer">${c.alias}</a></td>
  <td class="car">${carCell}</td>
  <td class="races">${c.races}</td>
  <td class="date">${formattedDate}</td>
</tr>`;
    })
    .join("\n");

  const emptyState = `<tr><td colspan="4" class="empty">No championships exported yet.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Championship Index</title>
  <style>
    :root {
      --bg: #0b1021;
      --card: #141a33;
      --text: #f7f8ff;
      --muted: #a9b1d6;
      --accent: #7aa2f7;
      --border: #1f2747;
      --row-even: #11182d;
    }
    body {
      margin: 0;
      font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
      background: radial-gradient(circle at 20% 20%, #101732, #0b1021 40%),
                  radial-gradient(circle at 80% 0%, #122349, #0b1021 30%),
                  #0b1021;
      color: var(--text);
      min-height: 100vh;
      padding: 24px;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      overflow: hidden;
    }
    header {
      padding: 24px 28px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, rgba(122,162,247,0.12), rgba(122,162,247,0));
    }
    h1 {
      margin: 0;
      font-size: 1.4rem;
      letter-spacing: 0.5px;
    }
    p.subtitle {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 0.95rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      color: var(--muted);
      font-weight: 600;
      font-size: 0.9rem;
      background: #0f152b;
    }
    tr.even { background: var(--row-even); }
    tr:hover { background: rgba(122,162,247,0.08); }
    a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }
    a:hover { text-decoration: underline; }
    td.alias { width: 45%; }
    td.car { width: 20%; color: var(--muted); }
    td.car .car-cell { display: inline-flex; align-items: center; gap: 10px; }
    td.car img { width: 28px; height: 28px; object-fit: contain; border-radius: 6px; background: #0f152b; padding: 4px; border: 1px solid var(--border); }
    td.car span { color: var(--text); font-weight: 600; }
    td.races { width: 15%; color: var(--muted); }
    td.date { width: 20%; color: var(--muted); }
    td.empty {
      text-align: center;
      color: var(--muted);
      padding: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Championship Index</h1>
      <p class="subtitle">Links to exported standings (save all files in the same folder).</p>
    </header>
    <table>
      <thead>
        <tr>
          <th>Championship</th>
          <th>Car</th>
          <th>Races</th>
          <th>Generated</th>
        </tr>
      </thead>
      <tbody>
        ${rows || emptyState}
      </tbody>
    </table>
  </div>
</body>
</html>`;
};

export const downloadHTML = (html: string, filename: string): void => {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
