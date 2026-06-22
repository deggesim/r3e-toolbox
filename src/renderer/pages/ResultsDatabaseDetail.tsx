import { Fragment, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Button, Container, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons/faPenToSquare";
import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons/faFloppyDisk";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons/faRotateLeft";
import { useChampionshipStore } from "../store/championshipStore";
import { useLeaderboardAssetsStore } from "../store/leaderboardAssetsStore";
import { useElectronAPI } from "../hooks/useElectronAPI";
import { getDownloadLabel } from "../utils/platformLabels";
import { makeTime, parseTimestring } from "../utils/timeUtils";
import { getSortedRaceSlots } from "../utils/humanPlayerUtils";
import { generateStandingsHTML } from "../utils/htmlGenerator";
import { saveTextFile } from "../utils/fileSaver";
import "./ResultsDatabaseDetail.css";
import type { ParsedRace } from "../types/raceResults";
import {
  DEFAULT_POINTS_SYSTEM,
  resolvePointsSystem,
} from "../types/raceResults";
import {
  buildDriverStandings,
  buildTeamStandings,
  buildVehicleStandings,
} from "../utils/standingsCalculator";

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

const calculateGapFromWinner = (
  winner: { totalTime?: string; totalLaps?: number },
  driver: { totalTime?: string; totalLaps?: number },
): string => {
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

const getBestLapTimesPerRace = (races: ParsedRace[]): BestTime[][] => {
  return races.map((race) => {
    const raceLapTimes: BestTime[] = [];
    const humanDriver =
      race.slots && race.slots.length > 0 ? race.slots[0].driver : null;

    race.slots.forEach((slot) => {
      if (slot.bestLap) {
        const timeMs = parseTime(slot.bestLap) * 1000;
        if (Number.isFinite(timeMs) && timeMs > 0) {
          raceLapTimes.push({
            driver: slot.driver,
            vehicle: slot.vehicle,
            vehicleId: slot.vehicleId,
            isHuman: slot.driver === humanDriver,
            time: makeTime(parseTime(slot.bestLap)),
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
};

const getBestQualifyingTimesPerRace = (races: ParsedRace[]): BestTime[][] => {
  return races.map((race) => {
    const raceQualTimes: BestTime[] = [];
    const humanDriver =
      race.slots && race.slots.length > 0 ? race.slots[0].driver : null;

    race.slots.forEach((slot) => {
      if (slot.qualTime) {
        const timeMs = parseTime(slot.qualTime) * 1000;
        if (Number.isFinite(timeMs) && timeMs > 0) {
          raceQualTimes.push({
            driver: slot.driver,
            vehicle: slot.vehicle,
            vehicleId: slot.vehicleId,
            isHuman: slot.driver === humanDriver,
            time: makeTime(parseTime(slot.qualTime)),
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
};

const ResultsDatabaseDetail = () => {
  const electronAPI = useElectronAPI();
  const { isElectron } = electronAPI;
  const { alias } = useParams<{ alias: string }>();
  const navigate = useNavigate();
  const championships = useChampionshipStore((state) => state.championships);
  const addOrUpdate = useChampionshipStore((state) => state.addOrUpdate);
  const leaderboardAssets = useLeaderboardAssetsStore((state) => state.assets);

  const [isEditing, setIsEditing] = useState(false);
  // Draft of the chronologically-sorted races + points input string.
  const [draftRaces, setDraftRaces] = useState<ParsedRace[] | null>(null);
  const [pointsInput, setPointsInput] = useState("");

  const parsePointsInput = (input: string): number[] | null => {
    const parts = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return null;
    const nums = parts.map(Number);
    return nums.some((n) => !Number.isFinite(n) || n < 0) ? null : nums;
  };

  const championship = championships.find((c) => c.alias === alias);

  const {
    driverStandings,
    teamStandings,
    vehicleStandings,
    bestLapTimes,
    bestQualTimes,
    raceHeaders,
    races,
  } = (() => {
    if (!championship?.raceData || championship.raceData.length === 0) {
      return {
        driverStandings: [],
        teamStandings: [],
        vehicleStandings: [],
        bestLapTimes: [],
        bestQualTimes: [],
        raceHeaders: [],
        races: [] as ParsedRace[],
      };
    }

    // Sort races chronologically by timestring (oldest first)
    const sortedSource = [...championship.raceData].sort((a, b) => {
      const timeA = parseTimestring(a.timestring);
      const timeB = parseTimestring(b.timestring);

      if (!Number.isNaN(timeA) && !Number.isNaN(timeB)) {
        return timeA - timeB;
      }

      // Fallback: keep original order if parsing fails
      return 0;
    });

    // While editing, use the draft (live preview); otherwise use the sorted source.
    const races = isEditing && draftRaces ? draftRaces : sortedSource;

    // Resolve the points system from the draft input while editing.
    const pointsSystem =
      isEditing && parsePointsInput(pointsInput)
        ? parsePointsInput(pointsInput)!
        : resolvePointsSystem(championship);

    return {
      driverStandings: buildDriverStandings(races, pointsSystem),
      teamStandings: buildTeamStandings(races, pointsSystem),
      vehicleStandings: buildVehicleStandings(races, pointsSystem),
      bestLapTimes: getBestLapTimesPerRace(races),
      bestQualTimes: getBestQualifyingTimesPerRace(races),
      raceHeaders: races.map((r) => ({
        name: r.trackname || "Unknown Track",
        time: r.timestring || "",
      })),
      races,
    };
  })();

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

  const startEditing = () => {
    if (!championship?.raceData) return;
    const sorted = [...championship.raceData].sort((a, b) => {
      const ta = parseTimestring(a.timestring);
      const tb = parseTimestring(b.timestring);
      return !Number.isNaN(ta) && !Number.isNaN(tb) ? ta - tb : 0;
    });
    setDraftRaces(structuredClone(sorted));
    setPointsInput(resolvePointsSystem(championship).join(", "));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftRaces(null);
  };

  const saveEditing = () => {
    if (!draftRaces || !championship) return;
    const parsed = parsePointsInput(pointsInput);
    addOrUpdate({
      ...championship,
      raceData: draftRaces,
      races: draftRaces.length,
      pointsSystem: parsed ?? undefined,
    });
    setIsEditing(false);
    setDraftRaces(null);
  };

  const updateSlotPenalty = (
    raceIdx: number,
    driver: string,
    field: "timePenaltySeconds" | "pointsPenalty",
    value: number | undefined,
  ) => {
    setDraftRaces((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const slot = next[raceIdx].slots.find((s) => s.driver === driver);
      if (slot) slot[field] = value;
      return next;
    });
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

  const handleDownloadHTML = async () => {
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
      undefined,
      undefined,
      resolvePointsSystem(championship),
    );
    await saveTextFile({
      electronAPI,
      filename: `${championship.alias}.html`,
      content: html,
      mimeType: "text/html",
      filters: [
        { name: "HTML Files", extensions: ["html"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
  };

  return (
    <Container fluid className="py-4">
      <Button
        onClick={() => navigate("/results-database")}
        className="back-button"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
        Back to Database
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
        <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
          <Button variant="primary" size="sm" onClick={handleDownloadHTML}>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            {getDownloadLabel(isElectron)} as HTML
          </Button>
          {!isEditing ? (
            <Button variant="outline-light" size="sm" onClick={startEditing}>
              <FontAwesomeIcon icon={faPenToSquare} className="me-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="success" size="sm" onClick={saveEditing}>
                <FontAwesomeIcon icon={faFloppyDisk} className="me-2" />
                Save
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={cancelEditing}
              >
                <FontAwesomeIcon icon={faRotateLeft} className="me-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor panel — shown only when editing */}
      {isEditing && draftRaces && (
        <div className="results-table-wrapper p-3">
          <Form.Group className="mb-3" controlId="pointsSystemInput">
            <Form.Label className="text-white">
              Championship points system
            </Form.Label>
            <Form.Control
              type="text"
              value={pointsInput}
              isInvalid={parsePointsInput(pointsInput) === null}
              onChange={(e) => setPointsInput(e.target.value)}
              placeholder="25, 18, 15, 12, 10, 8, 6, 4, 2, 1"
            />
            <div className="mt-2 d-flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline-light"
                onClick={() =>
                  setPointsInput(DEFAULT_POINTS_SYSTEM.default.join(", "))
                }
              >
                F1
              </Button>
              <Button
                size="sm"
                variant="outline-light"
                onClick={() =>
                  setPointsInput(DEFAULT_POINTS_SYSTEM.dtm2023.join(", "))
                }
              >
                DTM
              </Button>
            </div>
          </Form.Group>

          {draftRaces.map((race, raceIdx) => (
            <div key={`edit-race-${raceIdx}`} className="mb-3">
              <h6 className="text-white">{race.trackname}</h6>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Time penalty (s)</th>
                    <th>Points penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedRaceSlots(race.slots).map((slot) => (
                    <tr key={`edit-${raceIdx}-${slot.driver}`}>
                      <td className="driver-name-cell">{slot.driver}</td>
                      <td>
                        <Form.Control
                          type="number"
                          min={0}
                          size="sm"
                          value={slot.timePenaltySeconds ?? ""}
                          onChange={(e) =>
                            updateSlotPenalty(
                              raceIdx,
                              slot.driver,
                              "timePenaltySeconds",
                              e.target.value === "" ||
                                !Number.isFinite(Number(e.target.value))
                                ? undefined
                                : Math.max(0, Number(e.target.value)),
                            )
                          }
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min={0}
                          size="sm"
                          value={slot.pointsPenalty ?? ""}
                          onChange={(e) =>
                            updateSlotPenalty(
                              raceIdx,
                              slot.driver,
                              "pointsPenalty",
                              e.target.value === "" ||
                                !Number.isFinite(Number(e.target.value))
                                ? undefined
                                : Math.max(0, Number(e.target.value)),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

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
                    const penalty =
                      races[idx]?.slots?.find(
                        (s) => s.driver === standing.driver,
                      )?.pointsPenalty ?? 0;
                    const posClass =
                      result !== null && result <= 3
                        ? getPositionClass(result)
                        : "";
                    return (
                      <Fragment key={`race-${standing.driver}-${idx}`}>
                        <td
                          className={`points-cell${penalty > 0 ? " penalized" : ""}`}
                          title={
                            penalty > 0
                              ? `Points penalty: -${penalty}`
                              : undefined
                          }
                        >
                          {pts ?? "-"}
                        </td>
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
                    const sortedSlots = getSortedRaceSlots(race.slots);
                    const slot = sortedSlots[posIdx];
                    if (!slot?.totalTime) {
                      return (
                        <td key={`race-result-${raceIdx}-${posIdx}`}>-</td>
                      );
                    }

                    const winner = sortedSlots[0];
                    const totalTimeSeconds = parseTime(slot.totalTime);
                    const formattedTime =
                      posIdx === 0
                        ? Number.isFinite(totalTimeSeconds)
                          ? makeTime(totalTimeSeconds)
                          : slot.totalTime
                        : calculateGapFromWinner(winner, slot);
                    const vehicleIcon = getVehicleIcon(slot.vehicleId);
                    const vehicleName = getVehicleName(
                      slot.vehicleId,
                      slot.vehicle,
                    );
                    const isHuman =
                      race.slots &&
                      race.slots.length > 0 &&
                      race.slots[0].driver === slot.driver;

                    return (
                      <td
                        key={`race-result-${raceIdx}-${posIdx}`}
                        className="race-result-cell"
                      >
                        <div
                          className={`race-result-entry${isHuman ? " human-driver" : ""}`}
                        >
                          <div className="result-driver">{slot.driver}</div>
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
    </Container>
  );
};

export default ResultsDatabaseDetail;
