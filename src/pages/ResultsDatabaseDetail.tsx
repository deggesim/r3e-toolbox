import { Fragment, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Button, Container } from "react-bootstrap";
import { useChampionshipStore } from "../store/championshipStore";
import { useLeaderboardAssetsStore } from "../store/leaderboardAssetsStore";
import { makeTime } from "../utils/timeUtils";
import { generateStandingsHTML, downloadHTML } from "../utils/htmlGenerator";
import "./ResultsDatabaseDetail.css";

interface DriverStanding {
  position: number;
  driver: string;
  vehicle: string;
  vehicleId?: number;
  isHuman: boolean;
  team: string;
  points: number;
  raceResults: (number | null)[];
  racePoints: (number | null)[];
}

interface TeamStanding {
  position: number;
  team: string;
  entries: number;
  points: number;
  racePoints: (number | null)[];
}

interface VehicleStanding {
  position: number;
  vehicle: string;
  vehicleId?: number;
  entries: number;
  points: number;
  racePoints: (number | null)[];
}

interface BestTime {
  driver: string;
  vehicle: string;
  vehicleId?: number;
  isHuman: boolean;
  time: string;
  timeMs: number;
}

const DEFAULT_POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function parseTime(timeStr: string | undefined): number {
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
}

function formatTimeDiff(baseMs: number, currentMs: number): string {
  const diff = currentMs - baseMs;
  if (diff === 0) return "";
  const sign = diff > 0 ? "+ " : "- ";
  const absDiff = Math.abs(diff) / 1000;
  return `${sign}${absDiff.toFixed(3)}`;
}

function getRacePosition(slots: any[], driver: string): number | null {
  const sortedSlots = [...slots].sort((a, b) => {
    const aFinished = a.FinishStatus === "Finished" || !!a.TotalTime;
    const bFinished = b.FinishStatus === "Finished" || !!b.TotalTime;
    if (aFinished !== bFinished) return bFinished ? 1 : -1;

    const aTime = parseTime(a.TotalTime);
    const bTime = parseTime(b.TotalTime);
    return aTime - bTime;
  });

  const index = sortedSlots.findIndex((s) => s.Driver === driver);
  return index >= 0 && sortedSlots[index].TotalTime ? index + 1 : null;
}

function calculateDriverStandings(races: any[]): DriverStanding[] {
  // Identify human players: the first driver in each race's slots array
  const humanDriverNames = new Set<string>();
  for (const race of races) {
    if (race.slots && race.slots.length > 0) {
      humanDriverNames.add(race.slots[0].Driver);
    }
  }

  const driverMap = new Map<
    string,
    {
      vehicle: string;
      vehicleId?: number;
      isHuman: boolean;
      team: string;
      raceResults: (number | null)[];
      racePoints: (number | null)[];
    }
  >();

  for (const race of races) {
    for (const slot of race.slots) {
      if (driverMap.has(slot.Driver)) {
        // Driver already exists, no need to update isHuman
      } else {
        driverMap.set(slot.Driver, {
          vehicle: slot.Vehicle,
          vehicleId: slot.VehicleId,
          isHuman: humanDriverNames.has(slot.Driver),
          team: slot.Team,
          raceResults: [],
          racePoints: [],
        });
      }
    }
  }

  races.forEach((race, raceIdx) => {
    driverMap.forEach((data, driver) => {
      const position = getRacePosition(race.slots, driver);
      data.raceResults[raceIdx] = position;

      if (position !== null && position <= DEFAULT_POINTS_SYSTEM.length) {
        data.racePoints[raceIdx] = DEFAULT_POINTS_SYSTEM[position - 1];
      } else {
        data.racePoints[raceIdx] = null;
      }
    });
  });

  const standings: DriverStanding[] = [];
  driverMap.forEach((data, driver) => {
    const points = data.racePoints.reduce<number>(
      (sum, p) => sum + (p || 0),
      0,
    );
    standings.push({
      position: 0,
      driver,
      vehicle: data.vehicle,
      vehicleId: data.vehicleId,
      team: data.team,
      points,
      raceResults: data.raceResults,
      racePoints: data.racePoints,
      isHuman: data.isHuman,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));

  return standings;
}

function calculateTeamStandings(races: any[]): TeamStanding[] {
  const teamMap = new Map<
    string,
    { entries: Set<string>; racePoints: (number | null)[] }
  >();

  races.forEach((race, raceIdx) => {
    const teamRacePoints = new Map<string, number>();

    race.slots.forEach((slot: any) => {
      const team = slot.Team || "No Team";
      const position = getRacePosition(race.slots, slot.Driver);

      if (!teamMap.has(team)) {
        teamMap.set(team, { entries: new Set(), racePoints: [] });
      }

      teamMap.get(team)!.entries.add(slot.Driver);

      if (position !== null && position <= DEFAULT_POINTS_SYSTEM.length) {
        const pts = DEFAULT_POINTS_SYSTEM[position - 1];
        teamRacePoints.set(team, (teamRacePoints.get(team) || 0) + pts);
      }
    });

    teamMap.forEach((data, team) => {
      data.racePoints[raceIdx] = teamRacePoints.get(team) || null;
    });
  });

  const standings: TeamStanding[] = [];
  teamMap.forEach((data, team) => {
    const points = data.racePoints.reduce<number>(
      (sum, p) => sum + (p || 0),
      0,
    );
    standings.push({
      position: 0,
      team,
      entries: data.entries.size,
      points,
      racePoints: data.racePoints,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));

  return standings;
}

function calculateVehicleStandings(races: any[]): VehicleStanding[] {
  const vehicleMap = new Map<
    string,
    {
      vehicleId?: number;
      entries: Set<string>;
      racePoints: (number | null)[];
    }
  >();

  races.forEach((race, raceIdx) => {
    const vehicleRacePoints = new Map<string, number>();

    race.slots.forEach((slot: any) => {
      const vehicle = slot.Vehicle;
      const position = getRacePosition(race.slots, slot.Driver);

      if (!vehicleMap.has(vehicle)) {
        vehicleMap.set(vehicle, {
          vehicleId: slot.VehicleId,
          entries: new Set(),
          racePoints: [],
        });
      }

      vehicleMap.get(vehicle)!.entries.add(slot.Driver);

      if (position !== null && position <= DEFAULT_POINTS_SYSTEM.length) {
        const pts = DEFAULT_POINTS_SYSTEM[position - 1];
        vehicleRacePoints.set(
          vehicle,
          (vehicleRacePoints.get(vehicle) || 0) + pts,
        );
      }
    });

    vehicleMap.forEach((data, vehicle) => {
      data.racePoints[raceIdx] = vehicleRacePoints.get(vehicle) || null;
    });
  });

  const standings: VehicleStanding[] = [];
  vehicleMap.forEach((data, vehicle) => {
    const points = data.racePoints.reduce<number>(
      (sum, p) => sum + (p || 0),
      0,
    );
    standings.push({
      position: 0,
      vehicle,
      vehicleId: data.vehicleId,
      entries: data.entries.size,
      points,
      racePoints: data.racePoints,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));

  return standings;
}

function getBestLapTimesPerRace(races: any[]): BestTime[][] {
  return races.map((race) => {
    const raceLapTimes: BestTime[] = [];
    const humanDriver =
      race.slots && race.slots.length > 0 ? race.slots[0].Driver : null;

    race.slots.forEach((slot: any) => {
      if (slot.BestLap) {
        const timeMs = parseTime(slot.BestLap) * 1000;
        if (Number.isFinite(timeMs) && timeMs > 0) {
          raceLapTimes.push({
            driver: slot.Driver,
            vehicle: slot.Vehicle,
            vehicleId: slot.VehicleId,
            isHuman: slot.Driver === humanDriver,
            time: makeTime(parseTime(slot.BestLap)),
            timeMs,
          });
        }
      }
    });

    const sorted = [...raceLapTimes].sort(
      (a: BestTime, b: BestTime) => a.timeMs - b.timeMs,
    );
    return sorted;
  });
}

function getBestQualifyingTimesPerRace(races: any[]): BestTime[][] {
  return races.map((race) => {
    const raceQualTimes: BestTime[] = [];
    const humanDriver =
      race.slots && race.slots.length > 0 ? race.slots[0].Driver : null;

    race.slots.forEach((slot: any) => {
      if (slot.QualTime) {
        const timeMs = parseTime(slot.QualTime) * 1000;
        if (Number.isFinite(timeMs) && timeMs > 0) {
          raceQualTimes.push({
            driver: slot.Driver,
            vehicle: slot.Vehicle,
            vehicleId: slot.VehicleId,
            isHuman: slot.Driver === humanDriver,
            time: makeTime(parseTime(slot.QualTime)),
            timeMs,
          });
        }
      }
    });

    const sorted = [...raceQualTimes].sort(
      (a: BestTime, b: BestTime) => a.timeMs - b.timeMs,
    );
    return sorted;
  });
}

export default function ResultsDatabaseDetail() {
  const { alias } = useParams<{ alias: string }>();
  const navigate = useNavigate();
  const championships = useChampionshipStore((state) => state.championships);
  const leaderboardAssets = useLeaderboardAssetsStore((state) => state.assets);

  const championship = useMemo(() => {
    return championships.find((c) => c.alias === alias);
  }, [championships, alias]);

  const {
    driverStandings,
    teamStandings,
    vehicleStandings,
    bestLapTimes,
    bestQualTimes,
    raceHeaders,
  } = useMemo(() => {
    if (!championship?.raceData || championship.raceData.length === 0) {
      return {
        driverStandings: [],
        teamStandings: [],
        vehicleStandings: [],
        bestLapTimes: [],
        bestQualTimes: [],
        raceHeaders: [],
      };
    }

    const races = championship.raceData;
    return {
      driverStandings: calculateDriverStandings(races),
      teamStandings: calculateTeamStandings(races),
      vehicleStandings: calculateVehicleStandings(races),
      bestLapTimes: getBestLapTimesPerRace(races),
      bestQualTimes: getBestQualifyingTimesPerRace(races),
      raceHeaders: races.map((r) => ({
        name: r.trackname || "Unknown Track",
        time: r.timestring || "",
      })),
    };
  }, [championship]);

  const getVehicleIcon = (vehicleId?: number) => {
    if (vehicleId === undefined || !leaderboardAssets) return null;
    const vehicleIdStr = String(vehicleId);
    const icon = leaderboardAssets.cars.find(
      (c) => c.id === vehicleIdStr,
    )?.iconUrl;
    return icon || null;
  };

  const getTrackIcon = (trackName: string) => {
    if (!trackName || !leaderboardAssets) return null;
    const icon = leaderboardAssets.tracks.find(
      (t) => t.name === trackName,
    )?.iconUrl;
    return icon || null;
  };

  const getVehicleName = (vehicleId?: number, vehicleName?: string): string => {
    const vehicleIdStr =
      vehicleId !== undefined ? String(vehicleId) : undefined;
    if (vehicleName && vehicleName !== vehicleIdStr) return vehicleName;
    if (vehicleId === undefined) return vehicleName || "";
    // Try to get the name from leaderboard assets
    if (leaderboardAssets) {
      const classData = leaderboardAssets.cars.find(
        (c) => c.id === vehicleIdStr,
      );
      if (classData?.name) {
        return classData.name;
      }
    }
    return vehicleName || vehicleIdStr || "";
  };

  if (!championship) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Championship Not Found</Alert.Heading>
          <p>The championship "{alias}" was not found in the database.</p>
          <Button
            variant="outline-danger"
            onClick={() => navigate("/results-database")}
          >
            Back to Database
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!championship.raceData || championship.raceData.length === 0) {
    return (
      <Container fluid className="py-4">
        <Alert variant="warning">
          <Alert.Heading>No Race Data Available</Alert.Heading>
          <p>
            This championship was created before race data storage was
            implemented.
          </p>
          <Button
            variant="outline-warning"
            onClick={() => navigate("/results-database")}
          >
            Back to Database
          </Button>
        </Alert>
      </Container>
    );
  }

  const generatedDate = new Date(championship.generatedAt);
  const day = String(generatedDate.getDate()).padStart(2, "0");
  const month = String(generatedDate.getMonth() + 1).padStart(2, "0");
  const year = generatedDate.getFullYear();
  const hours = String(generatedDate.getHours()).padStart(2, "0");
  const minutes = String(generatedDate.getMinutes()).padStart(2, "0");
  const seconds = String(generatedDate.getSeconds()).padStart(2, "0");
  const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

  const getPositionClass = (pos: number) => {
    if (pos === 1) return "pos1";
    if (pos === 2) return "pos2";
    if (pos === 3) return "pos3";
    return "";
  };

  const handleDownloadHTML = () => {
    const leaderboardAssetsForExport = leaderboardAssets
      ? {
          cars: Object.fromEntries(
            leaderboardAssets.cars.map((c) => [c.id, c.iconUrl || ""]),
          ),
          tracks: Object.fromEntries(
            leaderboardAssets.tracks.map((t) => [t.name, t.iconUrl || ""]),
          ),
          carNames: Object.fromEntries(
            leaderboardAssets.cars.map((c) => [c.id, c.name]),
          ),
        }
      : undefined;

    const html = generateStandingsHTML(
      championship.raceData!,
      championship.alias,
      leaderboardAssetsForExport,
    );
    downloadHTML(html, `${championship.alias}.html`);
  };

  return (
    <Container fluid className="py-4">
      <Button
        onClick={() => navigate("/results-database")}
        className="back-button"
      >
        ← Back to Database
      </Button>

      <div className="results-header">
        <div className="d-flex align-items-center gap-3 mb-2">
          {championship.carIcon && (
            <img
              src={championship.carIcon}
              alt={championship.carName || championship.alias}
              style={{ objectFit: "contain" }}
            />
          )}
          <h1 className="results-title mb-0">{championship.alias}</h1>
        </div>
        <p className="results-subtitle">
          {championship.carName && <span>{championship.carName} • </span>}
          <span>Championship Standings</span>
        </p>
        <p className="results-subtitle mb-0">
          Generated from R3E Toolbox • {formattedDate}
        </p>
        <div className="mt-3">
          <Button variant="primary" size="sm" onClick={handleDownloadHTML}>
            ⬇️ Download as HTML
          </Button>
        </div>
      </div>

      {/* Driver Standings */}
      <div className="results-table-wrapper">
        <table className="results-table">
          <caption>Driver Standings</caption>
          <thead>
            <tr>
              <th rowSpan={2}>Pos</th>
              <th rowSpan={2}>Driver</th>
              <th rowSpan={2}>Vehicle</th>
              <th rowSpan={2}>Team</th>
              <th rowSpan={2}>Points</th>
              {raceHeaders.map((header, idx) => {
                const trackIcon = getTrackIcon(header.name);
                return (
                  <th
                    key={`race-${idx}-${header.name}`}
                    colSpan={2}
                    className="track-header"
                  >
                    {trackIcon && <img src={trackIcon} alt={header.name} />}
                    <div>{header.name}</div>
                    {header.time && (
                      <span className="track-time">{header.time}</span>
                    )}
                  </th>
                );
              })}
            </tr>
            <tr>
              {raceHeaders.map((header, idx) => (
                <Fragment key={`header-${idx}-${header.name}`}>
                  <th>Pts</th>
                  <th>Pos</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {driverStandings.map((standing) => {
              const vehicleIcon = getVehicleIcon(standing.vehicleId);
              const vehicleName = getVehicleName(
                standing.vehicleId,
                standing.vehicle,
              );
              return (
                <tr
                  key={standing.driver}
                  className={standing.isHuman ? "human-driver" : ""}
                >
                  <td>{standing.position}</td>
                  <td className="driver-name-cell">{standing.driver}</td>
                  <td>
                    {vehicleIcon && (
                      <img
                        src={vehicleIcon}
                        className="vehicle-icon"
                        alt={vehicleName}
                      />
                    )}
                    {vehicleName}
                  </td>
                  <td>{standing.team}</td>
                  <td className="points-cell">{standing.points}</td>
                  {raceHeaders.map((_, idx) => {
                    const pts = standing.racePoints[idx];
                    const result = standing.raceResults[idx];
                    const posClass =
                      result !== null && result <= 3
                        ? getPositionClass(result)
                        : "";
                    return (
                      <Fragment key={`race-${standing.driver}-${idx}`}>
                        <td className="points-cell">{pts ?? "-"}</td>
                        <td className={posClass}>{result ?? "-"}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Team Standings */}
      {teamStandings.length > 1 && (
        <div className="results-table-wrapper">
          <table className="results-table">
            <caption>Team Standings</caption>
            <thead>
              <tr>
                <th rowSpan={2}>Pos</th>
                <th rowSpan={2}>Team</th>
                <th rowSpan={2}>Entries</th>
                <th rowSpan={2}>Points</th>
                {raceHeaders.map((header, idx) => (
                  <th key={`team-race-${header.name}-${idx}`}>
                    {header.name}
                    {header.time && (
                      <span className="track-time">{header.time}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamStandings.map((standing) => (
                <tr key={standing.team}>
                  <td>{standing.position}</td>
                  <td>{standing.team}</td>
                  <td>{standing.entries}</td>
                  <td className="points-cell">{standing.points}</td>
                  {standing.racePoints.map((pts, idx) => (
                    <td
                      key={`team-pts-${standing.team}-${idx}`}
                      className="points-cell"
                    >
                      {pts ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vehicle Standings */}
      <div className="results-table-wrapper">
        <table className="results-table">
          <caption>Vehicle Standings</caption>
          <thead>
            <tr>
              <th rowSpan={2}>Pos</th>
              <th rowSpan={2}>Vehicle</th>
              <th rowSpan={2}>Entries</th>
              <th rowSpan={2}>Points</th>
              {raceHeaders.map((header, idx) => (
                <th key={`vehicle-race-${header.name}-${idx}`}>
                  {header.name}
                  {header.time && (
                    <span className="track-time">{header.time}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicleStandings.map((standing) => {
              const vehicleIcon = getVehicleIcon(standing.vehicleId);
              const vehicleName = getVehicleName(
                standing.vehicleId,
                standing.vehicle,
              );
              return (
                <tr key={standing.vehicle}>
                  <td>{standing.position}</td>
                  <td>
                    {vehicleIcon && (
                      <img
                        src={vehicleIcon}
                        className="vehicle-icon"
                        alt={vehicleName}
                      />
                    )}
                    {vehicleName}
                  </td>
                  <td>{standing.entries}</td>
                  <td className="points-cell">{standing.points}</td>
                  {standing.racePoints.map((pts, idx) => (
                    <td
                      key={`vehicle-pts-${standing.vehicle}-${idx}`}
                      className="points-cell"
                    >
                      {pts ?? "-"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Best Lap Times Per Race */}
      {bestLapTimes.some((race) => race.length > 0) && (
        <div className="results-table-wrapper">
          <table className="results-table">
            <caption>Best Race Lap Times</caption>
            <thead>
              <tr>
                <th>Pos</th>
                {raceHeaders.map((header) => (
                  <th
                    key={`${header.name}-${header.time}`}
                    className="race-header"
                  >
                    {header.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {new Array(
                Math.max(
                  ...bestLapTimes.map((r) => r.length).filter((l) => l > 0),
                  0,
                ),
              )
                .fill(undefined)
                .map((_, posIdx) => (
                  <tr key={`best-lap-pos-${championship.alias}-${posIdx}`}>
                    <td>{posIdx + 1}</td>
                    {bestLapTimes.map((raceTimesArray, raceIdx) => {
                      const time = raceTimesArray[posIdx];
                      if (!time) {
                        return (
                          <td
                            key={`lap-${championship.alias}-${raceIdx}-${posIdx}`}
                          >
                            -
                          </td>
                        );
                      }
                      const vehicleIcon = getVehicleIcon(time.vehicleId);
                      const vehicleName = getVehicleName(
                        time.vehicleId,
                        time.vehicle,
                      );
                      const diff =
                        posIdx > 0
                          ? formatTimeDiff(
                              raceTimesArray[0].timeMs,
                              time.timeMs,
                            )
                          : "";
                      return (
                        <td
                          key={`lap-${championship.alias}-${raceIdx}-${posIdx}`}
                          className="time-cell"
                        >
                          <div
                            className={`time-entry${time.isHuman ? " human-driver" : ""}`}
                          >
                            <div className="time-driver">{time.driver}</div>
                            <div className="time-info">
                              {vehicleIcon && (
                                <img
                                  src={vehicleIcon}
                                  className="vehicle-icon"
                                  alt={vehicleName}
                                />
                              )}
                              <span className="time-value">{time.time}</span>
                              {diff && (
                                <span className="time-diff">{diff}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Best Qualifying Times Per Race */}
      {bestQualTimes.some((race) => race.length > 0) && (
        <div className="results-table-wrapper">
          <table className="results-table">
            <caption>Best Qualification Times</caption>
            <thead>
              <tr>
                <th>Pos</th>
                {raceHeaders.map((header) => (
                  <th
                    key={`${header.name}-${header.time}`}
                    className="race-header"
                  >
                    {header.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {new Array(
                Math.max(
                  ...bestQualTimes.map((r) => r.length).filter((l) => l > 0),
                  0,
                ),
              )
                .fill(undefined)
                .map((_, posIdx) => (
                  <tr key={`best-qual-pos-${championship.alias}-${posIdx}`}>
                    <td>{posIdx + 1}</td>
                    {bestQualTimes.map((raceTimesArray, raceIdx) => {
                      const time = raceTimesArray[posIdx];
                      if (!time) {
                        return (
                          <td
                            key={`qual-${championship.alias}-${raceIdx}-${posIdx}`}
                          >
                            -
                          </td>
                        );
                      }
                      const vehicleIcon = getVehicleIcon(time.vehicleId);
                      const vehicleName = getVehicleName(
                        time.vehicleId,
                        time.vehicle,
                      );
                      const diff =
                        posIdx > 0
                          ? formatTimeDiff(
                              raceTimesArray[0].timeMs,
                              time.timeMs,
                            )
                          : "";
                      return (
                        <td
                          key={`qual-${championship.alias}-${raceIdx}-${posIdx}`}
                          className="time-cell"
                        >
                          <div
                            className={`time-entry${time.isHuman ? " human-driver" : ""}`}
                          >
                            <div className="time-driver">{time.driver}</div>
                            <div className="time-info">
                              {vehicleIcon && (
                                <img
                                  src={vehicleIcon}
                                  className="vehicle-icon"
                                  alt={vehicleName}
                                />
                              )}
                              <span className="time-value">{time.time}</span>
                              {diff && (
                                <span className="time-diff">{diff}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Race Results */}
      <div className="results-table-wrapper">
        <table className="results-table">
          <caption>Race Results</caption>
          <thead>
            <tr>
              <th>Pos</th>
              {raceHeaders.map((header) => (
                <th
                  key={`race-result-${header.name}-${header.time}`}
                  className="race-header"
                >
                  {header.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(
              {
                length: Math.max(
                  ...(championship.raceData?.map(
                    (race) => race.slots.length,
                  ) || [0]),
                ),
              },
              (_, posIdx) => (
                <tr key={`race-result-pos-${posIdx}`}>
                  <td>{posIdx + 1}</td>
                  {championship.raceData?.map((race, raceIdx) => {
                    const sortedSlots = [...race.slots].sort((a, b) => {
                      const aFinished =
                        a.FinishStatus === "Finished" || !!a.TotalTime;
                      const bFinished =
                        b.FinishStatus === "Finished" || !!b.TotalTime;
                      if (aFinished !== bFinished) return bFinished ? 1 : -1;
                      const aTime = parseTime(a.TotalTime);
                      const bTime = parseTime(b.TotalTime);
                      return aTime - bTime;
                    });

                    const slot = sortedSlots[posIdx];
                    if (!slot?.TotalTime) {
                      return (
                        <td key={`race-result-${raceIdx}-${posIdx}`}>-</td>
                      );
                    }

                    const totalTimeSeconds = parseTime(slot.TotalTime);
                    const formattedTime = Number.isFinite(totalTimeSeconds)
                      ? makeTime(totalTimeSeconds)
                      : slot.TotalTime;
                    const vehicleIcon = getVehicleIcon(slot.VehicleId);
                    const vehicleName = getVehicleName(
                      slot.VehicleId,
                      slot.Vehicle,
                    );
                    const isHuman =
                      race.slots &&
                      race.slots.length > 0 &&
                      race.slots[0].Driver === slot.Driver;

                    return (
                      <td
                        key={`race-result-${raceIdx}-${posIdx}`}
                        className="race-result-cell"
                      >
                        <div
                          className={`race-result-entry${isHuman ? " human-driver" : ""}`}
                        >
                          <div className="result-driver">{slot.Driver}</div>
                          <div className="result-vehicle">
                            {vehicleIcon && (
                              <img
                                src={vehicleIcon}
                                className="vehicle-icon"
                                alt={vehicleName}
                              />
                            )}
                            <span>{vehicleName}</span>
                          </div>
                          <div className="result-time">{formattedTime}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </Container>
  );
}
